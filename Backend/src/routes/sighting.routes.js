const express = require("express");

const { validateAccessToken } = require("../middleware/auth.middleware");
const validateCreateSighting = require("../middleware/sighting.middleware");
const validateRole = require("../middleware/role.middleware");

const { createSighting, getAllSightings, deleteSighting, getAllMarkers, markSightingAsSeen} = require("../controllers/sighting.controller");

const router = express.Router();

// Crear un nuevo avistamiento
router.post("/", validateAccessToken, validateRole(["POA", "DETECCION", "JEFE DE DETECCION", "SUPERVISOR"]), validateCreateSighting, createSighting);

// Recuperar todos los avistamientos
router.get("/", validateAccessToken, validateRole(["POA", "DETECCION", "JEFE DE DETECCION", "SUPERVISOR"]), getAllSightings);
router.get("/all", validateAccessToken, validateRole(["POA", "DETECCION", "JEFE DE DETECCION", "SUPERVISOR"]), getAllMarkers);

// Eliminar un avistamiento
router.delete("/:id", validateAccessToken, validateRole(["DETECCION", "JEFE DE DETECCION", "SUPERVISOR"]), deleteSighting);


router.put("/:id/validate", validateAccessToken, validateRole(["DETECCION", "JEFE DE DETECCION"]), markSightingAsSeen);
module.exports = router;