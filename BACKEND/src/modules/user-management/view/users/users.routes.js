const express = require('express');
const router = express.Router();
const controller = require('./users.controller');

router.get('/', controller.getUsers);

module.exports = router;