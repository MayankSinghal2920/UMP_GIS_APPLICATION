const pool = require('../config/db');

async function getLandPlanGeoJSON(where, params, divSql) {
  const sql = `
    SELECT jsonb_build_object(
      'type','FeatureCollection',
      'features', COALESCE(jsonb_agg(
        jsonb_build_object(
          'type','Feature',
          'id', objectid,
          'properties', to_jsonb(t) - 'shape',
          'geometry', ST_AsGeoJSON(shape)::jsonb
        )
      ), '[]'::jsonb)
    ) AS geojson
    FROM (
      SELECT *
      FROM sde.land_plan_on_track_test
      WHERE ${where}${divSql}
      ORDER BY objectid
      LIMIT 20000
    ) t;
  `;
  const { rows } = await pool.query(sql, params);
  return rows[0]?.geojson || { type: "FeatureCollection", features: [] };
}

async function listEditable(where, params, ps, offset) {
  const totalSql = `
    SELECT COUNT(*)::int AS n
    FROM sde.land_plan_on_track_test
    WHERE ${where};
  `;
  const { rows: trows } = await pool.query(totalSql, params);
  const total = trows[0]?.n || 0;

  const listSql = `
    SELECT
      objectid,
      railway,
      division,
      tmssection,
      distfromkm,
      distfromm,
      disttokm,
      disttom
    FROM sde.land_plan_on_track_test
    WHERE ${where}
    ORDER BY objectid
    LIMIT ${ps} OFFSET ${offset};
  `;
  const { rows } = await pool.query(listSql, params);
  return { rows, total };
}

async function getOne(id) {
  const sql = `
    SELECT
      objectid,
      railway,
      division,
      tmssection,
      distfromkm,
      distfromm,
      disttokm,
      disttom,
      ST_AsGeoJSON(shape)::json AS geom
    FROM sde.land_plan_on_track_test
    WHERE objectid = $1
    LIMIT 1;
  `;
  const { rows } = await pool.query(sql, [id]);
  return rows[0] || null;
}

async function createLandPlan(payload) {
  const sql = `
    INSERT INTO sde.land_plan_on_track_test (
      railway, division, tmssection,
      distfromkm, distfromm, disttokm, disttom,
      xcoord, ycoord, shape
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9, ST_SetSRID(ST_GeomFromGeoJSON($10),4326)
    )
    RETURNING objectid;
  `;
  const params = [
    payload.railway, payload.division, payload.tmssection,
    payload.distfromkm, payload.distfromm, payload.disttokm, payload.disttom,
    payload.xcoord, payload.ycoord, payload.geom
  ];
  const { rows } = await pool.query(sql, params);
  return rows[0]?.objectid;
}

async function updateLandPlan(id, payload) {
  // This is simplified, preserves the core update behavior
  const sql = `
    UPDATE sde.land_plan_on_track_test
    SET
      railway = COALESCE($2, railway),
      division = COALESCE($3, division),
      tmssection = COALESCE($4, tmssection),
      distfromkm = COALESCE($5, distfromkm),
      distfromm = COALESCE($6, distfromm),
      disttokm = COALESCE($7, disttokm),
      disttom = COALESCE($8, disttom),
      xcoord = COALESCE($9, xcoord),
      ycoord = COALESCE($10, ycoord),
      shape = CASE WHEN $11 IS NULL THEN shape ELSE ST_SetSRID(ST_GeomFromGeoJSON($11),4326) END
    WHERE objectid = $1
    RETURNING objectid;
  `;
  const params = [
    id,
    payload.railway, payload.division, payload.tmssection,
    payload.distfromkm, payload.distfromm, payload.disttokm, payload.disttom,
    payload.xcoord, payload.ycoord, payload.geom
  ];
  const { rows } = await pool.query(sql, params);
  return rows[0]?.objectid;
}

async function deleteLandPlan(id) {
  const sql = `DELETE FROM sde.land_plan_on_track_test WHERE objectid = $1;`;
  await pool.query(sql, [id]);
  return true;
}

module.exports = {
  getLandPlanGeoJSON,
  listEditable,
  getOne,
  createLandPlan,
  updateLandPlan,
  deleteLandPlan
};
