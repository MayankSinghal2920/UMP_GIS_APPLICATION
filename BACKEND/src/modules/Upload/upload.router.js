const express = require('express');
const { randomUUID } = require('crypto');
const { shapefileUpload, kmlUpload } = require('../../middleware/multer');
const { importShapefileToPostGIS } = require('../../services/UploadFile/shapefile.service');
const { importKmlToPostGIS }       = require('../../services/UploadFile/kmlfile.service');
const {
  cleanupFiles,
  persistUploadBundle,
  removeBundleDirectory,
  saveUploadBundleRecord,
} = require('../../services/UploadFile/file.service');
const { pool } = require('../../db/pool');
const fs = require('fs'); 
const path = require('path');
const router = express.Router();

function requireLayerName(req, res) {
  const layerName = String(req.body?.layerName || '').trim();
  if (!layerName) {
    res.status(400).json({ error: 'layerName is required' });
    return null;
  }

  return layerName;
}

function withUpload(middleware, handler) {
  return (req, res) => {
    middleware(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      try {
        await handler(req, res);
      } catch (error) {
        console.error('Upload route error:', error);
        cleanupFiles(req.files);
        const status = Number.isInteger(error?.status) ? error.status : 500;
        const message = error?.message || 'Upload failed';
        return res.status(status).json({ error: message, message });
      }
    });
  };
}

function normalizeText(value) {
  return String(value || '').trim();
}

async function resolveUploadAuditFields(req) {
  const userId = normalizeText(req?.user?.user_id || req?.user?.sub);
  const fallbackDivision = normalizeText(req.body?.division || req.query?.division || req?.user?.division);
  if (!userId) {
    return {
      createdBy: 'UPLOAD',
      finalModifiedBy: 'UPLOAD',
    };
  }

  const { rows: userRows } = await pool.query(
    `
      SELECT
        u.user_id,
        NULLIF(TRIM(u.user_name), '') AS user_name,
        u.department_id,
        COALESCE(NULLIF(TRIM(d.divcode), ''), $2) AS division_code,
        NULLIF(TRIM(d.div_name), '') AS division_name
      FROM sde.user_master u
      LEFT JOIN div_master d ON u.div_id = d.div_id
      WHERE LOWER(TRIM(u.user_id)) = LOWER(TRIM($1))
      LIMIT 1
    `,
    [userId, fallbackDivision],
  );

  const user = userRows[0] || {};
  const createdBy = normalizeText(user.user_name) || userId;
  const divisionValues = [
    user.division_code,
    user.division_name,
    fallbackDivision,
  ]
    .map((value) => normalizeText(value).toUpperCase())
    .filter((value, index, list) => value && list.indexOf(value) === index);

  let finalModifiedBy = '';
  if (divisionValues.length) {
    const { rows: approverRows } = await pool.query(
      `
        SELECT NULLIF(TRIM(a.user_name), '') AS user_name
        FROM sde.user_master a
        LEFT JOIN div_master d ON a.div_id = d.div_id
        WHERE LOWER(TRIM(COALESCE(a.user_type, ''))) = 'approver'
          AND ($1::text IS NULL OR CAST(a.department_id AS text) = CAST($1 AS text))
          AND (
            UPPER(TRIM(COALESCE(d.divcode::text, ''))) = ANY($2)
            OR UPPER(TRIM(COALESCE(d.div_name::text, ''))) = ANY($2)
            OR UPPER(TRIM(COALESCE(a.division::text, ''))) = ANY($2)
          )
        ORDER BY a.user_name
        LIMIT 1
      `,
      [user.department_id ?? null, divisionValues],
    );
    finalModifiedBy = normalizeText(approverRows[0]?.user_name);
  }

  return {
    createdBy,
    finalModifiedBy: finalModifiedBy || createdBy,
  };
}

router.post(
  '/shapefile',
  withUpload(shapefileUpload, async (req, res) => {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const layerName = requireLayerName(req, res);
    if (!layerName) {
      cleanupFiles(files);
      return;
    }

    const uploadId = randomUUID();
    const primaryFile =
      files.find((file) => file.originalname.toLowerCase().endsWith('.shp')) || files[0];

    const bundle = await persistUploadBundle(files, {
      uploadId,
      layerName,
      req,
    });

    try {
      const auditFields = await resolveUploadAuditFields(req);
      const shapeImport = await importShapefileToPostGIS(bundle.files, uploadId, layerName, {
        division: req.body?.division || req.query?.division,
        createdBy: auditFields.createdBy,
        finalModifiedBy: auditFields.finalModifiedBy,
      });

      await saveUploadBundleRecord({
        uploadId,
        originalName: primaryFile.originalname,
        uploadType: 'shapefile',
        layerName: bundle.safeLayerName,
        fileCount: bundle.files.length,
        bundleUrl: bundle.bundleUrl,
        relativeBundlePath: bundle.relativeBundlePath,
        targetSchema: shapeImport.targetSchema,
        targetTable: shapeImport.targetTable,
        featureCount: shapeImport.featureCount,
        files: bundle.files,
      });

      return res.status(201).json({
        message: 'Shapefile uploaded and appended successfully',
        uploadId,
        layerName: bundle.safeLayerName,
        targetTable: `${shapeImport.targetSchema}.${shapeImport.targetTable}`,
        featureCount: shapeImport.featureCount,
        insertedObjectIds: shapeImport.insertedObjectIds || [],
        firstObjectId: Array.isArray(shapeImport.insertedObjectIds) ? shapeImport.insertedObjectIds[0] : null,
        bundleUrl: bundle.bundleUrl,
        files: bundle.files.map((file) => ({
          originalName: file.original_name,
          relativePath: file.relative_path,
        })),
      });
    } catch (error) {
      removeBundleDirectory(bundle.bundleDir);
      await pool.query('DELETE FROM upload_files WHERE upload_id = $1', [uploadId]).catch(() => {});
      await pool.query('DELETE FROM uploads WHERE id = $1', [uploadId]).catch(() => {});
      throw error;
    }
  }),
);

router.post('/kml', withUpload(kmlUpload, async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No KML file uploaded' });
    }

    const layerName = requireLayerName(req, res);
    if (!layerName) {
        cleanupFiles([req.file]);
        return;
    }

    const uploadId = randomUUID();

    // FIRST: Process the KML file while it's still in the upload temp directory
    const kmlFile = {
        original_name: req.file.originalname,
        disk_path: req.file.path,  // Use original path
    };

    console.log('Processing KML from:', kmlFile.disk_path);
    
    try {
        // Process the file FIRST
        const kmlImport = await importKmlToPostGIS(kmlFile, uploadId, layerName);
        
        // AFTER successful processing, THEN move to bundle for long-term storage
        const fileAsArray = [{
            ...req.file,
            originalname: req.file.originalname,
        }];
        
        const bundle = await persistUploadBundle(fileAsArray, { uploadId, layerName, req });
        
        await saveUploadBundleRecord({
            uploadId,
            originalName: req.file.originalname,
            uploadType: 'kml',
            layerName: bundle.safeLayerName,
            fileCount: 1,
            bundleUrl: bundle.bundleUrl,
            relativeBundlePath: bundle.relativeBundlePath,
            targetSchema: kmlImport.targetSchema,
            targetTable: kmlImport.targetTable,
            featureCount: kmlImport.featureCount,
            files: bundle.files,
        });

        return res.status(201).json({
            message: 'KML uploaded and appended successfully',
            uploadId,
            layerName: bundle.safeLayerName,
            targetTable: `${kmlImport.targetSchema}.${kmlImport.targetTable}`,
            featureCount: kmlImport.featureCount,
            bundleUrl: bundle.bundleUrl,
            mapping: kmlImport.mapping,
        });
    } catch (error) {
        // Clean up temp table only, NOT the file
        console.error('Processing error:', error);
        throw error;
    }
}));


router.post(
  '/general',
  (_req, res) =>
    res.status(410).json({
      error:
        'Standalone general upload has been removed. Upload shapefiles by layer and use per-record attachments from the edit workflow.',
    }),
);

router.get('/layers', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
        id,
        original_name,
        layer_name,
        upload_type,
        file_count,
        feature_count,
        bundle_url,
        target_table_schema,
        target_table_name,
        created_at
      FROM uploads
      WHERE upload_type = 'shapefile'
      ORDER BY created_at DESC`,
    );

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/layers/kml', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         id,
         original_name,
         layer_name,
         upload_type,
         file_count,
         feature_count,
         bundle_url,
         target_table_schema,
         target_table_name,
         created_at
       FROM uploads
       WHERE upload_type = 'kml'
       ORDER BY created_at DESC`,
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/layer/:layerName', async (req, res) => {
  try {
    const layerName = String(req.params.layerName || '').trim().toLowerCase();
    const { rows } = await pool.query(
      `SELECT
        id,
        original_name,
        layer_name,
        upload_type,
        file_count,
        feature_count,
        bundle_url,
        target_table_schema,
        target_table_name,
        created_at
      FROM uploads
      WHERE lower(layer_name) = $1
      ORDER BY created_at DESC`,
      [layerName],
    );

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:uploadId/files', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
        id,
        upload_id,
        original_name,
        stored_name,
        mimetype,
        size_bytes,
        relative_path,
        created_at
      FROM upload_files
      WHERE upload_id = $1
      ORDER BY created_at ASC, id ASC`,
      [req.params.uploadId],
    );

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
