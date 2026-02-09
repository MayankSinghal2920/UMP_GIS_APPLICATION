const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/dashboard.controller');

// Keep routes aligned with existing frontend usage (if any)
router.get('/dashboard/landplan/count', ctrl.landPlanCount);
router.get('/dashboard/landoffest/count', ctrl.landOffsetCount);
router.get('/dashboard/kmpost/count', ctrl.kmPostCount);
router.get('/dashboard/station/count', ctrl.stationCount);

module.exports = router;
