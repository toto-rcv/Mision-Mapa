const express = require("express");

const { validateAccessToken } = require("../middleware/auth.middleware");
const validateCreateSighting = require("../middleware/sighting.middleware");
const validateRole = require("../middleware/role.middleware");

const { createSighting, getAllSightings, deleteSighting, getAllMarkers, markSightingAsSeen, verificarAvistamientosIA } = require("../controllers/sighting.controller");

const router = express.Router();

// Crear un nuevo avistamiento
router.post("/", validateAccessToken, validateRole(["POA", "DETECCION", "JEFE DE DETECCION", "SUPERVISOR", "ADMINDEVELOPER"]), validateCreateSighting, createSighting);

// Recuperar todos los avistamientos
router.get("/", validateAccessToken, validateRole(["POA", "DETECCION", "JEFE DE DETECCION", "SUPERVISOR", "ADMINDEVELOPER"]), getAllSightings);
router.get("/all", validateAccessToken, validateRole(["POA", "DETECCION", "JEFE DE DETECCION", "SUPERVISOR", "ADMINDEVELOPER"]), getAllMarkers);

// Eliminar un avistamiento
router.delete("/:id", validateAccessToken, validateRole(["DETECCION", "JEFE DE DETECCION", "SUPERVISOR", "ADMINDEVELOPER"]), deleteSighting);

// Validar un avistamiento
router.put("/:id/validate", validateAccessToken, validateRole(["DETECCION", "JEFE DE DETECCION"]), markSightingAsSeen);

// Verificación IA
router.post("/verificar-ia", validateAccessToken, validateRole(["SUPERVISOR", "JEFE DE DETECCION", "ADMINDEVELOPER"]), verificarAvistamientosIA);

module.exports = router;