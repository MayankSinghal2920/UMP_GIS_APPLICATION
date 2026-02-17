const express = require('express');
const controller = require('../controllers/landBoundary.controller');

const router = express.Router();

router.get('/', controller.getLandBoundary);

module.exports = router;
