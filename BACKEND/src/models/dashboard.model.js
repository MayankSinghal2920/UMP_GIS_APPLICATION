const pool = require('../config/db');

/* ================= GENERIC COUNT HELPER ================= */
async function getAssetCount(tableName, division, type) {
  let statusCondition = '';
  const params = [division];

  if (type === 'MAKER') {
    params.push('Sent to Maker');
    statusCondition = 'AND UPPER(status) = UPPER($2)';
  } else if (type === 'CHECKER') {
    params.push('Sent to Checker');
    statusCondition = 'AND UPPER(status) = UPPER($2)';
  } else if (type === 'APPROVER') {
    params.push('Sent to Approver');
    statusCondition = 'AND UPPER(status) = UPPER($2)';
  } else if (type === 'FINALIZED') {
    params.push('Approved');
    statusCondition = 'AND UPPER(status) = UPPER($2)';
  }

  const sql = `
    SELECT COUNT(*)::int AS count
    FROM ${tableName}
    WHERE UPPER(division) = UPPER($1)
    ${statusCondition};
  `;

  const { rows } = await pool.query(sql, params);
  return rows[0]?.count || 0;
}

/* ================= EXPORT WRAPPERS ================= */

module.exports = {
  getStationCount: (division, type) =>
    getAssetCount('sde.station', division, type),

  getBridgeStartCount: (division, type) =>
    getAssetCount('sde.bridge_start', division, type),

  getBridgeEndCount: (division, type) =>
    getAssetCount('sde.bridge_end', division, type),

  getBridgeMinorCount: (division, type) =>
    getAssetCount('sde.bridge_minor', division, type),

  getLevelXingCount: (division, type) =>
    getAssetCount('sde.levelxing', division, type),

  getRoadOverBridgeCount: (division, type) =>
    getAssetCount('sde.road_over_bridge', division, type),

  getRubLhsCount: (division, type) =>
    getAssetCount('sde.rub_lhs', division, type),

  getRorCount: (division, type) =>
    getAssetCount('sde.ror', division, type),


  getKmPostCount: (division, type) =>
  getAssetCount('sde.km_post', division, type),

getLandPlanCount: (division, type) =>
  getAssetCount('sde.land_plan_on_track', division, type),
};
