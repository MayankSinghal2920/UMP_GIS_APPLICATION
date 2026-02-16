const express = require('express');
const router = express.Router();
const controller = require('../controllers/tracks.controller');

router.get('/', controller.getTracks);

module.exports = router;
