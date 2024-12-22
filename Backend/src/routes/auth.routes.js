const express = require("express");
const router = express.Router();

const { register, login, refreshAccessToken, getProfile } = require("../controllers/auth.controller");
const {validateRefreshToken, validateAccessToken} = require("../middleware/auth.middleware");

router.post("/register", register);
router.post("/login", login);
router.post("/refresh-token", validateRefreshToken, refreshAccessToken);

router.get("/profile", validateAccessToken, getProfile);


module.exports = router;
