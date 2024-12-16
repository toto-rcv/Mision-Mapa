const jwt = require("jsonwebtoken");

const { existsRefreshToken } = require("../utils/refreshTokens");

require("dotenv").config();

exports.validateAccessToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(401).json({ message: "Token no proporcionado" });
  }

  // Extraer el token del formato Bearer <token>
  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Formato de token incorrecto" });
  }

  try {
    // Verificar el token con la clave secreta
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    req.user = decoded; // Adjuntar el token decodificado a la solicitud
    next();
  } catch (error) {
    console.error("Error al validar el token:", error.message);
    return res.status(403).json({ message: "Token inválido o expirado" });
  }
};

exports.validateRefreshToken = (req, res, next) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
      return res.status(401).json({ message: "Refresh Token no proporcionado" });
  }

  // Verificar si el token existe en "la base de datos"
  if (!existsRefreshToken(refreshToken)) {
      return res.status(403).json({ message: "Refresh Token inválido o revocado" });
  }

  try {
      // Verificar el Refresh Token con la clave secreta
      const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
      req.user = decoded; // Pasamos los datos decodificados al controlador
      next();
  } catch (error) {
      return res.status(403).json({ message: "Refresh Token inválido o expirado" });
  }
};
