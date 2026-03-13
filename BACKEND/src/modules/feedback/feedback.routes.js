const express = require('express');
const router = express.Router();
const feedbackController = require('./feedback.controller');

console.log("Feedback routes loaded");

router.post('/create', feedbackController.createFeedback);
router.get('/all', feedbackController.getAllFeedback);


module.exports = router;