const dashboardModel = require('../models/dashboard.model');

/* ================= COMMON HANDLER ================= */
async function handleCount(req, res, next, modelFunction) {
  try {
    const division = String(req.query.division || '').trim();
    const type = String(req.query.type || 'TOTAL').toUpperCase();

    if (!division) {
      const err = new Error('division is required');
      err.status = 400;
      throw err;
    }

    const count = await modelFunction(division, type);
    res.json({ count });
  } catch (err) {
    next(err);
  }
}

/* ================= EXPORTS ================= */

module.exports = {
  getStationCount: (req, res, next) =>
    handleCount(req, res, next, dashboardModel.getStationCount),

  getBridgeStartCount: (req, res, next) =>
    handleCount(req, res, next, dashboardModel.getBridgeStartCount),

  getBridgeEndCount: (req, res, next) =>
    handleCount(req, res, next, dashboardModel.getBridgeEndCount),

  getBridgeMinorCount: (req, res, next) =>
    handleCount(req, res, next, dashboardModel.getBridgeMinorCount),

  getLevelXingCount: (req, res, next) =>
    handleCount(req, res, next, dashboardModel.getLevelXingCount),

  getRoadOverBridgeCount: (req, res, next) =>
    handleCount(req, res, next, dashboardModel.getRoadOverBridgeCount),

  getRubLhsCount: (req, res, next) =>
    handleCount(req, res, next, dashboardModel.getRubLhsCount),

  getRorCount: (req, res, next) =>
    handleCount(req, res, next, dashboardModel.getRorCount),

    getKmPostCount: (req, res, next) =>
    handleCount(req, res, next, dashboardModel.getKmPostCount),

  getLandPlanCount: (req, res, next) =>
    handleCount(req, res, next, dashboardModel.getLandPlanCount),
};
