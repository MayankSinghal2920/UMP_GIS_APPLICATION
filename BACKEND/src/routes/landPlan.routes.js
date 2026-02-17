const express = require('express');
const router = express.Router();
const controller = require('../controllers/landPlan.controller');

router.get('/', controller.getLandPlan);

module.exports = router;
