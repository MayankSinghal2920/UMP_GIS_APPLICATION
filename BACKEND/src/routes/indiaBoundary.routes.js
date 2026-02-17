const express = require('express');
const controller = require('../controllers/indiaBoundary.controller');

const router = express.Router();

router.get('/', controller.getIndiaBoundary);

module.exports = router;
