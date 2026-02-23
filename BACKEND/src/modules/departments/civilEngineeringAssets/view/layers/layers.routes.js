const express = require('express');
const router = express.Router();
const controller = require('./layers.controller');

router.get('/:layer', controller.getLayer);

module.exports = router;
