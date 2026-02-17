const model = require('../models/landOffset.model');
const parseBbox = require('../utils/parseBbox');

async function getLandOffset(req, res, next) {
  try {
    const { bbox, division } = req.query;

    const { where, params } = parseBbox(bbox);

    const geojson = await model.getLandOffsetGeoJSON(
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
  getLandOffset,
};
