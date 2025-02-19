const express = require("express");
const router = express.Router();

const { register, login, refreshAccessToken, getProfile } = require("../controllers/auth.controller");
const { validateLogin, validateRegister, validateRefreshToken, validateAccessToken } = require("../middleware/auth.middleware");

router.post("/register", validateRegister, register);
router.post("/login", validateLogin, login);
router.post("/refresh-token", validateRefreshToken, refreshAccessToken);

router.get("/profile", validateAccessToken, getProfile);

module.exports = router;