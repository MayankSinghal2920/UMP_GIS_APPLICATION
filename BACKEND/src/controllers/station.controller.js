const stationModel = require('../models/station.model');
const parseBbox = require('../utils/parseBbox');

/**
 * GET /api/stations
 */
async function getStations(req, res, next) {
  try {
    const { bbox, division } = req.query;

    // parse bbox → SQL where + params
    const { where, params } = parseBbox(bbox);

    const geojson = await stationModel.getStationsGeoJSON(
      where,
      params,
      division?.trim()
    );

    res.json(
      geojson || { type: 'FeatureCollection', features: [] }
    );
  } catch (err) {
    next(err); // VERY IMPORTANT (middleware handles error)
  }
}

/**
 * GET /api/stations/count
 */
async function getStationCount(req, res, next) {
  try {
    const division = String(req.query.division || '').trim();
    const type = String(req.query.type || 'TOTAL').toUpperCase();

    if (!division) {
      const err = new Error('division is required');
      err.status = 400;
      throw err;
    }

    const count = await stationModel.getStationCount(division, type);

    res.json({ count });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/stations/:id
 */
async function getStationById(req, res, next) {
  try {
    const id = Number(req.params.id);
    const division = String(req.query.division || '').trim();

    if (!Number.isFinite(id)) {
      const err = new Error('Invalid station id');
      err.status = 400;
      throw err;
    }

    if (!division) {
      const err = new Error('division query param required');
      err.status = 400;
      throw err;
    }

    const station = await stationModel.getStationById(id, division);

    if (!station) {
      const err = new Error('Station not found');
      err.status = 404;
      throw err;
    }

    res.json(station);
  } catch (err) {
    next(err);
  }
}

const generateGUID = require('../utils/guid');

/**
 * POST /api/stations
 */
async function createStation(req, res, next) {
  try {
    const division = String(req.query.division || '').trim();
    if (!division) {
      const err = new Error('division query param required');
      err.status = 400;
      throw err;
    }

    const payload = {
      ...req.body,
      globalid: generateGUID(),
    };

    const station = await stationModel.createStation(payload, division);
    res.status(201).json(station);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/stations/:id
 */
async function updateStation(req, res, next) {
  try {
    const id = Number(req.params.id);
    const division = String(req.query.division || '').trim();

    if (!id || !division) {
      const err = new Error('id and division are required');
      err.status = 400;
      throw err;
    }

    const station = await stationModel.updateStation(id, division, req.body);

    if (!station) {
      const err = new Error('Station not found');
      err.status = 404;
      throw err;
    }

    res.json(station);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/stations/:id
 */
async function deleteStation(req, res, next) {
  try {
    const id = Number(req.params.id);
    const division = String(req.query.division || '').trim();

    if (!id || !division) {
      const err = new Error('id and division are required');
      err.status = 400;
      throw err;
    }

    const deleted = await stationModel.deleteStation(id, division);

    if (!deleted) {
      const err = new Error('Station not found');
      err.status = 404;
      throw err;
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}






module.exports = {
  getStations,
    getStationCount,
      getStationById,
        // write
  createStation,
  updateStation,
  deleteStation,
};
