const express = require('express');
const controller = require('../controllers/landOffset.controller');

const router = express.Router();

router.get('/', controller.getLandOffset);

module.exports = router;
