const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/landOffset.controller');

router.get('/land_offset', ctrl.getLandOffset);

module.exports = router;
