const express = require('express');
const controller = require('../controllers/divisionBuffer.controller');

const router = express.Router();

router.get('/', controller.getDivisionBuffer);

module.exports = router;
