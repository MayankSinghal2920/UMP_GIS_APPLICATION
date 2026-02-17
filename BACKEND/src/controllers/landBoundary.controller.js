const model = require('../models/landBoundary.model');
const parseBbox = require('../utils/parseBbox');

async function getLandBoundary(req, res, next) {
  try {
    const { bbox, division } = req.query;

    const { where, params } = parseBbox(bbox);

    const geojson = await model.getLandBoundaryGeoJSON(
      where,
      params,
      division?.trim()
    );

    res.json(
      geojson || { type: 'FeatureCollection', features: [] }
    );

  } catch (err) {
    next(err);
  }
}

module.exports = {
  getLandBoundary,
};
