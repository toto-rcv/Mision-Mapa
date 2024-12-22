const express = require("express");
const { createSighting, getAllSightings } = require("../controllers/sighting.controller");
const {validateAccessToken} = require("../middleware/auth.middleware");
const validateCreateSighting = require("../middleware/sighting.middleware");
const router = express.Router();

// Crear un nuevo avistamiento
router.post("/", validateAccessToken, validateCreateSighting, createSighting);

// Recuperar todos los avistamientos
router.get("/", getAllSightings);




module.exports = router;
