const express = require('express');
const router = express.Router();
const controller = require('../controllers/kmPost.controller');

router.get('/', controller.getKmPosts);

module.exports = router;
