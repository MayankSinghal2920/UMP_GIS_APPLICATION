const express = require('express');
const router = express.Router();
const controller = require('./preview.controller');

router.get('/land-plan', controller.previewLandPlan);

module.exports = router;
