const model = require('../models/divisionBuffer.model');

async function getDivisionBuffer(req, res, next) {
  try {
    const division = String(req.query.division || '').trim();
    const z = Number(req.query.z || 0);

    if (!division) {
      const err = new Error('division is required');
      err.status = 400;
      throw err;
    }

    // If you want zoom-based logic later, you can use z here
    // For now we don't filter by zoom

    const where = 'shape IS NOT NULL';
    const params = [];

    const geojson = await model.getDivisionBufferGeoJSON(
      where,
      params,
      division
    );

    res.json(
      geojson || { type: 'FeatureCollection', features: [] }
    );

  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDivisionBuffer,
};
