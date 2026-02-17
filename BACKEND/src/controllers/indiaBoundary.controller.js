const model = require('../models/indiaBoundary.model');
const parseBbox = require('../utils/parseBbox');

async function getIndiaBoundary(req, res, next) {
  try {
    const { bbox } = req.query;

    const { where, params } = parseBbox(bbox);

    const geojson = await model.getIndiaBoundaryGeoJSON(where, params);

    res.json(
      geojson || { type: 'FeatureCollection', features: [] }
    );
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getIndiaBoundary,
};
