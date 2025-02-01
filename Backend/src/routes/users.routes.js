const express = require("express");
const { getAllUsers, updateUserStatus, getDeleteUser } = require("../controllers/user.controller");
const { validateAccessToken } = require("../middleware/auth.middleware");
const router = express.Router();
const validateRole = require("../middleware/role.middleware");

router.get("/",validateAccessToken, validateRole(["DETECCION", "JEFE DE DETECCION"]), getAllUsers);

router.post("/:id/status", validateAccessToken, validateRole(["DETECCION", "JEFE DE DETECCION"]), updateUserStatus);

router.delete("/:id", validateAccessToken, validateRole(["DETECCION", "JEFE DE DETECCION"]), getDeleteUser);
module.exports = router;