const express = require("express");

const { getAllUsers, updateUserStatus, getDeleteUser, updateUserRank,getMinimalUsers } = require("../controllers/user.controller");
const { validateAccessToken } = require("../middleware/auth.middleware");
const router = express.Router();
const validateRole = require("../middleware/role.middleware");

router.get("/", validateAccessToken, validateRole(["DETECCION", "JEFE DE DETECCION"]), getAllUsers);
router.get("/minimal", validateAccessToken, validateRole(["DETECCION", "JEFE DE DETECCION", "POA"]), getMinimalUsers);

router.put("/:id/status", validateAccessToken, validateRole(["JEFE DE DETECCION"]), updateUserStatus,);
router.put("/:id/rank", validateAccessToken, validateRole(["JEFE DE DETECCION"]), updateUserRank)

router.delete("/:id/deleteUser", validateAccessToken, validateRole(["DETECCION", "JEFE DE DETECCION"]), getDeleteUser);

module.exports = router;