const express = require('express');
const router = express.Router();

const dashboardController = require('../controllers/dashboard.controller');

router.get('/stations/count', dashboardController.getStationCount);
router.get('/bridge-start/count', dashboardController.getBridgeStartCount);
router.get('/bridge-end/count', dashboardController.getBridgeEndCount);
router.get('/bridge-minor/count', dashboardController.getBridgeMinorCount);
router.get('/level-xing/count', dashboardController.getLevelXingCount);
router.get('/road-over-bridge/count', dashboardController.getRoadOverBridgeCount);
router.get('/rub-lhs/count', dashboardController.getRubLhsCount);
router.get('/ror/count', dashboardController.getRorCount);
router.get('/km-post/count', dashboardController.getKmPostCount);
router.get('/land-plan/count', dashboardController.getLandPlanCount);

module.exports = router;
