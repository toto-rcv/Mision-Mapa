const express = require("express");
const { createSighting, getAllSightings } = require("../controllers/sighting.controller");
const { validateAccessToken } = require("../middleware/auth.middleware");
const validateCreateSighting = require("../middleware/sighting.middleware");
const router = express.Router();
const validateRole = require("../middleware/role.middleware");
// Crear un nuevo avistamiento
router.post("/", validateAccessToken, validateRole(["POA", "DETECCION", "JEFE DE DETECCION"]), validateCreateSighting, createSighting);

// Recuperar todos los avistamientos
router.get("/",validateAccessToken, validateRole(["POA", "DETECCION", "JEFE DE DETECCION"]), getAllSightings);




module.exports = router;
