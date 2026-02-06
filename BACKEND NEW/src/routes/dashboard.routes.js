const express = require('express');
const router = express.Router();
const { makeCountHandler } = require('../controllers/dashboard.controller');

router.get('/dashboard/stations/count', makeCountHandler('sde.station_test'));
router.get('/dashboard/bridge-start/count', makeCountHandler('sde.bridge_start_test'));
router.get('/dashboard/bridge-end/count', makeCountHandler('sde.bridge_end_test'));
router.get('/dashboard/bridge-minor/count', makeCountHandler('sde.bridge_minor_test'));
router.get('/dashboard/level-xing/count', makeCountHandler('sde.levelxing_test'));
router.get('/dashboard/road-over-bridge/count', makeCountHandler('sde.road_over_bridge_test'));
router.get('/dashboard/rub-lhs/count', makeCountHandler('sde.rub_lhs_test'));
router.get('/dashboard/ror/count', makeCountHandler('sde.ror_test'));

module.exports = router;
