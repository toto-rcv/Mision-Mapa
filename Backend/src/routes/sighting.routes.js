const express = require("express");
const { createSighting, getAllSightings, deleteSighting, getAllMarkers, markSightingAsBlue } = require("../controllers/sighting.controller");
const { validateAccessToken } = require("../middleware/auth.middleware");
const validateCreateSighting = require("../middleware/sighting.middleware");
const router = express.Router();
const validateRole = require("../middleware/role.middleware");

// Crear un nuevo avistamiento
router.post("/", validateAccessToken, validateRole(["POA", "DETECCION", "JEFE DE DETECCION"]), validateCreateSighting, createSighting);
router.post("/:id/mark-blue", validateAccessToken, validateRole(["POA", "DETECCION", "JEFE DE DETECCION"]), markSightingAsBlue);
// Recuperar todos los avistamientos
router.get("/", validateAccessToken, validateRole(["POA", "DETECCION", "JEFE DE DETECCION"]), getAllSightings);
router.get("/all", validateAccessToken, validateRole(["POA", "DETECCION", "JEFE DE DETECCION"]),getAllMarkers);

// Eliminar un avistamiento
router.delete("/:id", validateAccessToken, validateRole(["DETECCION", "JEFE DE DETECCION"]), deleteSighting);

module.exports = router;