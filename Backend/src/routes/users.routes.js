const express = require("express");
const { getAllUsers, updateUserStatus, getMinimalUsers } = require("../controllers/user.controller");
const { validateAccessToken } = require("../middleware/auth.middleware");
const router = express.Router();
const validateRole = require("../middleware/role.middleware");
router.get("/",validateAccessToken, validateRole(["DETECCION", "JEFE DE DETECCION"]), getAllUsers);
router.get("/minimal", validateAccessToken, validateRole(["DETECCION", "JEFE DE DETECCION"]), getMinimalUsers);
router.post("/:id/status", validateAccessToken, validateRole(["DETECCION", "JEFE DE DETECCION"]), updateUserStatus);
module.exports = router;