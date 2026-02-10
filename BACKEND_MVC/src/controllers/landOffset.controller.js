const parseBbox = require('../utils/parseBbox');
const model = require('../models/landOffset.model');

async function getLandOffset(req, res, next) {
  try {
    const { where, params } = parseBbox(req.query.bbox);
    const division = String(req.query.division || '').trim();
    let divSql = '';
    if (division) {
      params.push(division);
      divSql = ` AND UPPER(division) = UPPER($${params.length})`;
    }
    const geojson = await model.getLandOffsetGeoJSON(where, params, divSql);
    res.json(geojson);
  } catch (e) { next(e); }
}

module.exports = { getLandOffset };
