const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/boundary.controller');

router.get('/land_boundary', ctrl.getLandBoundary);
router.get('/division_buffer', ctrl.getDivisionBuffer);
router.get('/india_boundary', ctrl.getIndiaBoundary);

module.exports = router;
