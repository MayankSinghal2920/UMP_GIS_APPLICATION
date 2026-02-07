const dashboardModel = require('../models/dashboard.model');

function mapStatus(type) {
  const map = {
    MAKER: 'Sent to Maker',
    CHECKER: 'Sent to Checker',
    APPROVER: 'Sent to Approver',
    FINALIZED: 'Approved'
  };
  return map[type] || null;
}

function makeHandler(tableName) {
  return async (req, res, next) => {
    try {
      const division = String(req.query.division || '').trim();
      const type = String(req.query.type || 'TOTAL').toUpperCase();

      if (!division) return res.status(400).json({ error: 'division is required' });

      const status = type === 'TOTAL' ? null : mapStatus(type);
      const count = await dashboardModel.countByDivision(tableName, division, status);
      res.json({ count });
    } catch (e) { next(e); }
  };
}

module.exports = {
  landPlanCount: makeHandler('sde.land_plan_on_track_test'),
  landOffsetCount: makeHandler('sde.land_offset_test'),
  kmPostCount: makeHandler('sde.km_post_test'),
  stationCount: makeHandler('sde.station_test')
};
