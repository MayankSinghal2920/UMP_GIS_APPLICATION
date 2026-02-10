const { getDashboardCount } = require('../models/dashboard.model');

function makeCountHandler(tableName) {
  return async function (req, res, next) {
    try {
      const division = String(req.query.division || '').trim();
      const type = String(req.query.type || 'TOTAL').toUpperCase();

      if (!division) {
        return res.status(400).json({ error: 'division is required' });
      }

      const count = await getDashboardCount({ tableName, division, type });
      res.json({ count });
    } catch (e) {
      return next(e);
    }
  };
}

module.exports = { makeCountHandler };
