const landPlanModel = require('../models/landPlan.model');
const parseBbox = require('../utils/parseBbox');

async function getLandPlan(req, res, next) {
  try {
    const { bbox, division } = req.query;

    const { where, params } = parseBbox(bbox);

    const geojson = await landPlanModel.getLandPlanGeoJSON(
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
  getLandPlan,
};
