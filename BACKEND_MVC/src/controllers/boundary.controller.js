const parseBbox = require('../utils/parseBbox');
const model = require('../models/boundary.model');

async function getLandBoundary(req, res, next) {
  try {
    const { where, params } = parseBbox(req.query.bbox);
    const division = String(req.query.division || '').trim();
    let divSql = '';
    if (division) {
      params.push(division);
      divSql = ` AND UPPER(division) = UPPER($${params.length})`;
    }
    const geojson = await model.getGeoJSON('sde.land_boundary_test', where, params, divSql);
    res.json(geojson);
  } catch (e) { next(e); }
}

async function getDivisionBuffer(req, res, next) {
  try {
    const division = String(req.query.division || '').trim();
    if (!division) return res.status(400).json({ error: 'division is required' });

    const where = 'shape IS NOT NULL';
    const params = [division];
    const extra = ` AND UPPER(division) = UPPER($1)`;

    const geojson = await model.getGeoJSON('sde.division_buffer_test', where, params, extra);
    res.json(geojson);
  } catch (e) { next(e); }
}

async function getIndiaBoundary(req, res, next) {
  try {
    const where = 'shape IS NOT NULL';
    const params = [];
    const geojson = await model.getGeoJSON('sde.india_boundary', where, params);
    res.json(geojson);
  } catch (e) { next(e); }
}

module.exports = { getLandBoundary, getDivisionBuffer, getIndiaBoundary };
