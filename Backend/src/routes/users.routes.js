const express = require("express");
const { getAllUsers } = require("../controllers/user.controller");
const { validateAccessToken } = require("../middleware/auth.middleware");
const router = express.Router();
const validateRole = require("../middleware/role.middleware");
router.get("/",validateAccessToken, validateRole(["DETECCION", "JEFE DE DETECCION"]), getAllUsers);

module.exports = router;