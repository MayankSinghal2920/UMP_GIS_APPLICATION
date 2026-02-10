const express = require('express');
const router = express.Router();

const pool = require('../db/pool');


function buildStatusCondition(type, params) {
  const map = {
    MAKER: 'Sent to Maker',
    CHECKER: 'Sent to Checker',
    APPROVER: 'Sent to Approver',
    FINALIZED: 'Approved'
  };

  if (map[type]) {
    params.push(map[type]);
    return `AND status = $${params.length}`;
  }

  return '';
}


async function dashboardCount(req, res, tableName) {
  try {
    const division = String(req.query.division || '').trim();
    const type = String(req.query.type || 'TOTAL').toUpperCase();

    if (!division) {
      return res.status(400).json({ error: 'division is required' });
    }

    const params = [division];
    const statusCondition = buildStatusCondition(type, params);

    const sql = `
      SELECT COUNT(*)::int AS count
      FROM ${tableName}
      WHERE UPPER(division) = UPPER($1)
      ${statusCondition};
    `;

    const { rows } = await pool.query(sql, params);
    res.json({ count: rows[0]?.count || 0 });

  } catch (e) {
    console.error(`❌ dashboard count error (${tableName}):`, e);
    res.status(500).json({ error: 'Server error' });
  }
}

router.get('/dashboard/stations/count', (req, res) =>
  dashboardCount(req, res, 'sde.station')
);

router.get('/dashboard/bridge-start/count', (req, res) =>
  dashboardCount(req, res, 'sde.bridge_start')
);

router.get('/dashboard/bridge-end/count', (req, res) =>
  dashboardCount(req, res, 'sde.bridge_end')
);

router.get('/dashboard/bridge-minor/count', (req, res) =>
  dashboardCount(req, res, 'sde.bridge_minor')
);

router.get('/dashboard/level-xing/count', (req, res) =>
  dashboardCount(req, res, 'sde.levelxing')
);

router.get('/dashboard/road-over-bridge/count', (req, res) =>
  dashboardCount(req, res, 'sde.road_over_bridge')
);

router.get('/dashboard/rub-lhs/count', (req, res) =>
  dashboardCount(req, res, 'sde.rub_lhs')
);

router.get('/dashboard/ror/count', (req, res) =>
  dashboardCount(req, res, 'sde.ror')
);

module.exports = router;


