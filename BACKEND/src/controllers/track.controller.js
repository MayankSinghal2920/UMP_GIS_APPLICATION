const model = require('../models/track.model');
const parseBbox = require('../utils/parseBbox');

async function getTracks(req, res, next) {
  try {
    const { bbox, division } = req.query;

    const { where, params } = parseBbox(bbox);

    const geojson = await model.getTrackGeoJSON(
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
  getTracks,
};
