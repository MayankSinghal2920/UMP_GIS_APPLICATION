const userModel = require('./users.model');

async function getUsers(req, res, next) {

  try {

    const { division } = req.query;

    const users = await userModel.getUsersByDivision(division);

    res.json(users);

  } catch (err) {

    next(err);

  }

}

module.exports = {
  getUsers
};