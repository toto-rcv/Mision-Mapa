const express = require("express");
const { validateAccessToken } = require("../middleware/auth.middleware");
const { verifyToken } = require("../controllers/auth.controller");

const router = express.Router();

// Endpoint para verificar el token
router.post("/verify-token", validateAccessToken, verifyToken);

module.exports = router;