const express = require('express');
const router = express.Router();
const kmPostController = require('../controllers/kmPost.controller');

router.get('/km_posts', kmPostController.getKmPosts);

module.exports = router;
