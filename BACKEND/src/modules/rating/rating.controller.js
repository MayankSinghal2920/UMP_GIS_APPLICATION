const ratingModel = require('./rating.model');

async function createRating(req, res, next) {
  try {
    const { user_id, user_name, railway, division, rating, comment } = req.body || {};

    if (!user_id) {
      const err = new Error('user_id is required');
      err.status = 400;
      throw err;
    }

    if (!user_name || !railway || !division) {
      const err = new Error('user_name, railway and division are required');
      err.status = 400;
      throw err;
    }

    if (rating == null || rating === '') {
      const err = new Error('rating is required');
      err.status = 400;
      throw err;
    }

    const normalizedUserId = String(user_id).trim();
    if (!normalizedUserId) {
      const err = new Error('user_id is required');
      err.status = 400;
      throw err;
    }

    const result = await ratingModel.createRating(
      { user_name, railway, division, rating, comment: comment ?? '' },
      normalizedUserId
    );

    res.status(201).json({
      message: 'Rating added successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function getLastRating(req, res, next) {
  try {
    const userId = req.body?.user_id ?? req.query?.user_id;

    if (!userId) {
      const err = new Error('user_id is required');
      err.status = 400;
      throw err;
    }

    const normalizedUserId = String(userId).trim();
    if (!normalizedUserId) {
      const err = new Error('user_id is required');
      err.status = 400;
      throw err;
    }

    const result = await ratingModel.getLastRating(normalizedUserId);

    res.json({
      message: 'Last rating fetched',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createRating,
  getLastRating,
};
