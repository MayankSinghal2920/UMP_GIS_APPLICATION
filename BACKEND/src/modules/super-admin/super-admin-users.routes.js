const express = require("express");
const router = express.Router();
const controller = require("./super-admin-users.controller");

router.get("/", controller.getAllUsers);
router.get("/:objectid", controller.getUserDetails);
router.post("/", controller.createUser);
router.put("/:objectid", controller.updateUser);
router.delete("/:objectid", controller.deleteUser);

module.exports = router;
