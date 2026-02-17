const tracksModel = require('../models/tracks.model');
const parseBbox = require('../utils/parseBbox');

async function getTracks(req, res, next) {
  try {
    const { bbox, division } = req.query;
    const { where, params } = parseBbox(bbox);

    const geojson = await tracksModel.getTracksGeoJSON(
      where,
      params,
      division?.trim()
    );

    res.json(geojson || { type: 'FeatureCollection', features: [] });
  } catch (err) {
    next(err);
  }
}
//mmmmmmmmmm
module.exports = {
  getTracks,
};
