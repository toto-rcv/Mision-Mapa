const jwt = require("jsonwebtoken");

exports.generateAccessToken = (user) => {
  return jwt.sign(
    { id: user.dni, email: user.email, rank: user.userRank },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "1m" }
  );
};

exports.generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.dni },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" }
  );
};

exports.generateResetToken = (user) => {
  return jwt.sign(
    { id: user.dni, email: user.email, type: "reset" },
    process.env.RESET_TOKEN_SECRET,
    { expiresIn: "30m" }
  );
};