const express = require('express');
const router = express.Router();

const ratingController = require('./rating.controller');

// Preferred endpoints
router.post('/', ratingController.createRating);
router.post('/last', ratingController.getLastRating);

// Backward-compatible aliases
router.post('/rating', ratingController.createRating);
router.post('/rating/list', ratingController.getLastRating);

module.exports = router;
