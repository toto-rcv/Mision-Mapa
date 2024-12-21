const express = require("express");
const { createSighting, getAllSightings } = require("../controllers/sighting.controller");

const router = express.Router();

// Crear un nuevo avistamiento
router.post("/", createSighting);

// Recuperar todos los avistamientos
router.get("/", getAllSightings);

module.exports = router;
