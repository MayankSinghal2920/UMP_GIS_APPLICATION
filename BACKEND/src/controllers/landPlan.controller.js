const parseBbox = require('../utils/parseBbox');
const landPlanModel = require('../models/landPlan.model');

async function getLandPlanLayer(req, res, next) {
  try {
    const { where, params } = parseBbox(req.query.bbox);
    const division = String(req.query.division || '').trim();
    let divSql = '';
    if (division) {
      params.push(division);
      divSql = ` AND UPPER(division) = UPPER($${params.length})`;
    }
    const geojson = await landPlanModel.getLandPlanGeoJSON(where, params, divSql);
    res.json(geojson);
  } catch (e) { next(e); }
}

async function listLandPlan(req, res, next) {
  try {
    const { bbox, page = 1, pageSize = 10, q = '', division = '' } = req.query;

    let where = 'shape IS NOT NULL';
    const params = [];

    if (bbox) {
      const parts = String(bbox).split(',').map(Number);
      if (parts.length !== 4 || parts.some(Number.isNaN)) {
        return res.status(400).json({ error: 'Invalid bbox. Use minX,minY,maxX,maxY (EPSG:4326).' });
      }
      params.push(...parts);
      where += ` AND ST_Intersects(shape, ST_MakeEnvelope($1,$2,$3,$4,4326))`;
    }

    const div = String(division || '').trim();
    if (div) {
      params.push(div);
      where += ` AND UPPER(division) = UPPER($${params.length})`;
    }

    if (q && String(q).trim()) {
      params.push(`%${q}%`);
      const i = params.length;
      where += ` AND (
        LOWER(tmssection) LIKE LOWER($${i})
        OR LOWER(division) LIKE LOWER($${i})
        OR LOWER(railway)  LIKE LOWER($${i})
      )`;
    }

    const p = Math.max(1, parseInt(page, 10));
    const ps = Math.max(1, Math.min(200, parseInt(pageSize, 10)));
    const offset = (p - 1) * ps;

    const out = await landPlanModel.listEditable(where, params, ps, offset);
    res.json(out);
  } catch (e) { next(e); }
}

async function getLandPlan(req, res, next) {
  try {
    const id = Number(req.params.id);
    const row = await landPlanModel.getOne(id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (e) { next(e); }
}

async function createLandPlan(req, res, next) {
  try {
    const divisionQS = String(req.query.division || '').trim();
    if (!divisionQS) return res.status(400).json({ error: 'division query param required' });

    let payload = req.body || {};
    payload.division = divisionQS;

    if (payload.geom && typeof payload.geom === 'object') payload.geom = JSON.stringify(payload.geom);
    if (!payload.geom) return res.status(400).json({ error: 'Geometry (geom) is required for new land plan polygon.' });

    const objectid = await landPlanModel.createLandPlan(payload);
    res.json({ status: 'success', objectid });
  } catch (e) { next(e); }
}

async function updateLandPlan(req, res, next) {
  try {
    const id = Number(req.params.id);
    let payload = req.body || {};
    if (payload.geom && typeof payload.geom === 'object') payload.geom = JSON.stringify(payload.geom);

    const objectid = await landPlanModel.updateLandPlan(id, payload);
    if (!objectid) return res.status(404).json({ error: 'Not found' });
    res.json({ status: 'success', objectid });
  } catch (e) { next(e); }
}

async function deleteLandPlan(req, res, next) {
  try {
    const id = Number(req.params.id);
    await landPlanModel.deleteLandPlan(id);
    res.json({ status: 'success' });
  } catch (e) { next(e); }
}

module.exports = {
  getLandPlanLayer,
  listLandPlan,
  getLandPlan,
  createLandPlan,
  updateLandPlan,
  deleteLandPlan
};
