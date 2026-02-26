const pool = require('../config/db');


function getStatusTextByType(type) {
  if (type === 'MAKER') return null;                 // ✅ Maker = NULL status
  if (type === 'CHECKER') return 'Sent to Checker';
  if (type === 'APPROVER') return 'Sent to Approver';
  if (type === 'FINALIZED') return 'Sent to Database'; // ✅ changed
  return null;
}

async function getDashboardCards(division, type) {
  const statusText = getStatusTextByType(type);

  // layerKey is what your frontend/map understands (StationLayer id etc.)
  const cards = [
    { title: 'Station', layerKey: 'stations', table: 'sde.station' },
    { title: 'Km Post', layerKey: 'km_post', table: 'sde.km_post' },
    { title: 'Land Plan', layerKey: 'landplan_ontrack', table: 'sde.land_plan_on_track' },
    // add others...
  ];

  // reuse existing getAssetCount()
  const results = [];
  for (const c of cards) {
    const value = await getAssetCount(c.table, division, type);
    results.push({
      title: c.title,
      value,
      layerKey: c.layerKey,
      statusKey: type,        // ✅ stable enum key for frontend
      statusText: statusText  // ✅ actual DB status text (optional)
    });
  }

  return results;
}

module.exports = {
  // ...keep existing exports
  getDashboardCards,
};
/* ================= GENERIC COUNT HELPER ================= */
async function getAssetCount(tableName, division, type) {
  const params = [division];
  let statusCondition = '';

  const t = String(type || '').toUpperCase();

  if (t === 'MAKER') {
    // ✅ Maker = status NULL (optionally include blanks)
    statusCondition = `AND status IS NULL`;
    // If your DB has empty strings too, use:
    // statusCondition = `AND (status IS NULL OR TRIM(status) = '')`;
  } 
  else if (t === 'CHECKER') {
    params.push('Sent to Checker');
    statusCondition = `AND UPPER(status) = UPPER($${params.length})`;
  } 
  else if (t === 'APPROVER') {
    params.push('Sent to Approver');
    statusCondition = `AND UPPER(status) = UPPER($${params.length})`;
  } 
  else if (t === 'FINALIZED') {
    params.push('Sent to Database');                 // ✅ changed
    statusCondition = `AND UPPER(status) = UPPER($${params.length})`;
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
  getDashboardCards,

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
