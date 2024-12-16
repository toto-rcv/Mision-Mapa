const express = require("express");
const router = express.Router();

const { register, login, refreshAccessToken } = require("../controllers/auth.controller");
const {validateRefreshToken} = require("../middleware/auth.middleware");

router.post("/register", register);
router.post("/login", login);
router.post("/refresh-token", validateRefreshToken, refreshAccessToken);

module.exports = router;
