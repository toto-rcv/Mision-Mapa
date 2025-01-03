const jwt = require("jsonwebtoken");
//funcion para generar los tokens
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
