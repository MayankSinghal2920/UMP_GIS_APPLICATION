const pool = require('../config/db');


//  Fetch stations as GeoJSON
//  @param {string} whereSql
//  @param {Array} params
//   @param {string} division

async function getStationsGeoJSON(whereSql, params, division) {
  let divisionSql = '';

  if (division) {
    params.push(division);
    divisionSql = ` AND UPPER(division) = UPPER($${params.length})`;
  }

  const sql = `
    SELECT jsonb_build_object(
      'type', 'FeatureCollection',
      'features', COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'type', 'Feature',
            'id', objectid,
            'properties', to_jsonb(t) - 'shape',
            'geometry', ST_AsGeoJSON(shape)::jsonb
          )
        ),
        '[]'::jsonb
      )
    ) AS geojson
    FROM (
      SELECT
        objectid,
        sttncode,
        sttnname,
        sttntype,
        division,
        railway,
        category,
        state,
        district,
        shape
      FROM sde.station
      WHERE ${whereSql} ${divisionSql}
      ORDER BY objectid
      LIMIT 20000
    ) t;
  `;

  const { rows } = await pool.query(sql, params);
  return rows[0]?.geojson;
}


/**
 * Get station count by division and status type
 */
async function getStationCount(division, type) {
  let statusCondition = '';
  const params = [division];

  if (type === 'MAKER') {
    params.push('Sent to Maker');
    statusCondition = 'AND status = $2';
  } else if (type === 'CHECKER') {
    params.push('Sent to Checker');
    statusCondition = 'AND status = $2';
  } else if (type === 'APPROVER') {
    params.push('Sent to Approver');
    statusCondition = 'AND status = $2';
  } else if (type === 'FINALIZED') {
    params.push('Approved');
    statusCondition = 'AND status = $2';
  }

  const sql = `
    SELECT COUNT(*)::int AS count
    FROM sde.station
    WHERE UPPER(division) = UPPER($1)
    ${statusCondition};
  `;

  const { rows } = await pool.query(sql, params);
  return rows[0].count;
}



/**
 * Get single station by objectid + division
 */
async function getStationById(id, division) {
  const sql = `
    SELECT
      objectid,
      sttncode,
      sttnname,
      sttntype,
      category,
      distkm,
      distm,
      state,
      district,
      constituncy,
      railway,
      division,
      xcoord,
      ycoord,
      latitude,
      longitude,
      CASE
        WHEN shape IS NOT NULL THEN ST_Y(shape::geometry)
        ELSE NULL
      END AS lat,
      CASE
        WHEN shape IS NOT NULL THEN ST_X(shape::geometry)
        ELSE NULL
      END AS lon
    FROM sde.station
    WHERE objectid = $1
      AND UPPER(division) = UPPER($2);
  `;

  const { rows } = await pool.query(sql, [id, division]);
  return rows[0]; // undefined if not found
}


/**
 * Create new station
 */
async function createStation(data, division) {
  const {
    sttncode,
    sttnname,
    sttntype,
    distkm,
    distm,
    state,
    district,
    constituncy,
    latitude,
    longitude,
    xcoord,
    ycoord,
    railway,
    category,
    globalid,
  } = data;

  const hasGeometry = xcoord != null && ycoord != null;

  const sql = hasGeometry
    ? `
      INSERT INTO sde.station (
        objectid, globalid, sttncode, sttnname, sttntype,
        distkm, distm, state, district, constituncy,
        latitude, longitude, xcoord, ycoord,
        railway, division, category, shape
      )
      VALUES (
        (SELECT COALESCE(MAX(objectid),0)+1 FROM sde.station),
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17,
        ST_SetSRID(ST_MakePoint($18,$19),4326)
      )
      RETURNING *;
    `
    : `
      INSERT INTO sde.station (
        objectid, globalid, sttncode, sttnname, sttntype,
        distkm, distm, state, district, constituncy,
        latitude, longitude, xcoord, ycoord,
        railway, division, category, shape
      )
      VALUES (
        (SELECT COALESCE(MAX(objectid),0)+1 FROM sde.station),
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17,
        NULL
      )
      RETURNING *;
    `;

  const params = [
    globalid,
    sttncode,
    sttnname,
    sttntype,
    distkm,
    distm,
    state,
    district,
    constituncy,
    latitude,
    longitude,
    xcoord,
    ycoord,
    railway,
    division,
    category,
    xcoord,
    ycoord,
  ];

  const { rows } = await pool.query(sql, params);
  return rows[0];
}


/**
 * Update existing station
 */
async function updateStation(id, division, data) {
  const {
    distkm,
    distm,
    state,
    district,
    constituncy,
    sttnname,
    category,
    sttntype,
  } = data;

  const sql = `
    UPDATE sde.station SET
      distkm=$1,
      distm=$2,
      state=$3,
      district=$4,
      constituncy=$5,
      sttnname=$6,
      category=$7,
      sttntype=$8,
      modified_date=NOW()
    WHERE objectid=$9
      AND UPPER(division)=UPPER($10)
    RETURNING *;
  `;

  const params = [
    distkm,
    distm,
    state,
    district,
    constituncy,
    sttnname,
    category,
    sttntype,
    id,
    division,
  ];

  const { rows } = await pool.query(sql, params);
  return rows[0];
}

/**
 * Delete station
 */
async function deleteStation(id, division) {
  const sql = `
    DELETE FROM sde.station
    WHERE objectid=$1
      AND UPPER(division)=UPPER($2);
  `;

  const { rowCount } = await pool.query(sql, [id, division]);
  return rowCount;
}



module.exports = {
  getStationsGeoJSON,
   getStationCount,
   getStationById,
     createStation,
  updateStation,
  deleteStation,
};
