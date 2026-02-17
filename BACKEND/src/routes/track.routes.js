const express = require('express');
const controller = require('../controllers/track.controller');

const router = express.Router();

router.get('/', controller.getTracks);

module.exports = router;
