const superAdminUserModel = require("./super-admin-users.model");

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function isSuperAdmin(req) {
  return normalizeText(req?.user?.user_type) === "super admin";
}

async function getAllUsers(req, res, next) {
  try {
    const users = await superAdminUserModel.getAllUsers();
    res.json(users);
  } catch (err) {
    next(err);
  }
}

async function getUserDetails(req, res, next) {
  try {
    const objectid = Number(req.params.objectid);
    if (!Number.isFinite(objectid)) {
      return res.status(400).json({
        success: false,
        message: "Valid objectid is required",
      });
    }

    const user = await superAdminUserModel.getEditableUserByObjectId(objectid);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json(user);
  } catch (err) {
    next(err);
  }
}

async function createUser(req, res, next) {
  try {
    if (!isSuperAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: "Only Super Admin can create users",
      });
    }

    const createdUser = await superAdminUserModel.createUser(req.body || {});

    res.status(201).json({
      success: true,
      message: "User created successfully",
      user: createdUser,
    });
  } catch (err) {
    next(err);
  }
}

async function updateUser(req, res, next) {
  try {
    if (!isSuperAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: "Only Super Admin can update users",
      });
    }

    const objectid = Number(req.params.objectid);
    if (!Number.isFinite(objectid)) {
      return res.status(400).json({
        success: false,
        message: "Valid objectid is required",
      });
    }

    const updatedUser = await superAdminUserModel.updateUser(objectid, req.body || {});

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    next(err);
  }
}

async function deleteUser(req, res, next) {
  try {
    if (!isSuperAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: "Only Super Admin can delete users",
      });
    }

    const objectid = Number(req.params.objectid);
    if (!Number.isFinite(objectid)) {
      return res.status(400).json({
        success: false,
        message: "Valid objectid is required",
      });
    }

    const actingUserId = String(req?.user?.sub || req?.user?.user_id || "").trim();
    const deletedUser = await superAdminUserModel.deleteUserByObjectId(objectid, actingUserId);

    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "User deleted successfully",
      user: deletedUser,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllUsers,
  getUserDetails,
  createUser,
  updateUser,
  deleteUser,
};
