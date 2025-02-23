const express = require("express");
const router = express.Router();

const { register, login, refreshAccessToken, getProfile, forgotPassword, resetPassword } = require("../controllers/auth.controller");
const { validateLogin, validateRegister, validateRefreshToken, validateAccessToken, verifyResetToken, validateResetPassword } = require("../middleware/auth.middleware");

router.post("/register", validateRegister, register);
router.post("/login", validateLogin, login);
router.post("/refresh-token", validateRefreshToken, refreshAccessToken);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', validateResetPassword, verifyResetToken, resetPassword);

router.get("/profile", validateAccessToken, getProfile);

module.exports = router;