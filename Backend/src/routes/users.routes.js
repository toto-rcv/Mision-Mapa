const express = require("express");

const { getAllUsers, updateUserStatus, getDeleteUser, updateUserRank, getMinimalUsers, updateUserDetails } = require("../controllers/user.controller");
const { validateAccessToken } = require("../middleware/auth.middleware");
const router = express.Router();
const validateRole = require("../middleware/role.middleware");

router.get("/", validateAccessToken, validateRole(["DETECCION", "JEFE DE DETECCION","SUPERVISOR", "ADMINDEVELOPER"]), getAllUsers);
router.get("/minimal", validateAccessToken, validateRole(["DETECCION", "JEFE DE DETECCION", "POA","SUPERVISOR", "ADMINDEVELOPER"]), getMinimalUsers);

router.put("/:id/status", validateAccessToken, validateRole(["JEFE DE DETECCION","SUPERVISOR", "ADMINDEVELOPER"]), updateUserStatus);
router.put("/:id/rank", validateAccessToken, validateRole(["JEFE DE DETECCION","SUPERVISOR", "ADMINDEVELOPER"]), updateUserRank);
router.put("/:id/details", validateAccessToken, validateRole(["SUPERVISOR", "ADMINDEVELOPER"]), updateUserDetails);

router.delete("/:id/deleteUser", validateAccessToken, validateRole(["JEFE DE DETECCION","SUPERVISOR", "ADMINDEVELOPER"]), getDeleteUser);

module.exports = router;