const express = require('express');
const router = express.Router();

const stationController = require('../controllers/station.controller');

// GET /api/stations
router.get('/', stationController.getStations);

// Count
router.get('/count', stationController.getStationCount);

// Get by ID
router.get('/:id', stationController.getStationById);


router.post('/', stationController.createStation);
router.put('/:id', stationController.updateStation);
router.delete('/:id', stationController.deleteStation);

module.exports = router;
