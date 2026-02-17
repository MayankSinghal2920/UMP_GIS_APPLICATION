const kmPostModel = require('../models/kmPost.model');
const parseBbox = require('../utils/parseBbox');

async function getKmPosts(req, res, next) {
  try {
    const { bbox, division } = req.query;

    const { where, params } = parseBbox(bbox);

    const geojson = await kmPostModel.getKmPostsGeoJSON(
      where,
      params,
      division?.trim()
    );

    res.json(geojson || { type: 'FeatureCollection', features: [] });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getKmPosts,
};
