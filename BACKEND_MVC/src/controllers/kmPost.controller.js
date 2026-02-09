const parseBbox = require('../utils/parseBbox');
const kmPostModel = require('../models/kmPost.model');

async function getKmPosts(req, res, next) {
  try {
    const { where, params } = parseBbox(req.query.bbox);

    const division = String(req.query.division || '').trim();
    let divSql = '';
    if (division) {
      params.push(division);
      divSql = ` AND UPPER(division) = UPPER($${params.length})`;
    }

    const geojson = await kmPostModel.getKmPostsGeoJSON(where, params, divSql);
    res.json(geojson);
  } catch (e) {
    next(e);
  }
}

module.exports = { getKmPosts };
