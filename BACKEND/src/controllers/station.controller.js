const parseBbox = require('../utils/parseBbox');
const stationModel = require('../models/station.model');

async function getStations(req, res, next) {
  try {
    const { where, params } = parseBbox(req.query.bbox);

    const division = String(req.query.division || '').trim();
    let divSql = '';
    if (division) {
      params.push(division);
      divSql = ` AND UPPER(division) = UPPER($${params.length})`;
    }

    const geojson = await stationModel.getStationsGeoJSON(where, params, divSql);
    res.json(geojson);
  } catch (e) {
    next(e);
  }
}

module.exports = { getStations };
