const express = require("express");
const { getAllUsers, updateUserStatus, getDeleteUser, updateUserRank } = require("../controllers/user.controller");
const { validateAccessToken } = require("../middleware/auth.middleware");
const router = express.Router();
const validateRole = require("../middleware/role.middleware");

router.get("/", validateAccessToken, validateRole(["DETECCION", "JEFE DE DETECCION"]), getAllUsers);

router.put("/:id/status", validateAccessToken, validateRole(["DETECCION", "JEFE DE DETECCION"]), updateUserStatus,);
router.put("/:id/rank", validateAccessToken, validateRole(["JEFE DE DETECCION"]), updateUserRank)

router.delete("/:id/deleteUser", validateAccessToken, validateRole(["DETECCION", "JEFE DE DETECCION"]), getDeleteUser);
module.exports = router;