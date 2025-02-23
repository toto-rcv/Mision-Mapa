const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");

const { existsRefreshToken } = require("../utils/refreshTokens");

require("dotenv").config();

exports.validateLogin = [
  body('email')
    .exists().withMessage('El campo email es obligatorio')
    .isString()
    .bail()
    .isEmail().withMessage('El email no es válido'),

  body('password')
    .exists().withMessage('El campo password es obligatorio')
    .isString(),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

exports.validateRegister = [
  body('dni')
    .exists().withMessage('El campo dni es obligatorio'),

  body('email')
    .exists().withMessage('El campo email es obligatorio')
    .isString().withMessage('El campo email debe ser un string')
    .bail() // Detiene la cadena de validaciones si falla lo anterior
    .isEmail().withMessage('El email no es válido'),

  body('password')
    .exists().withMessage('El campo password es obligatorio')
    .isString().withMessage('El campo password debe ser un string')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/)
    .withMessage('La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un símbolo'),

  body('firstName')
    .exists().withMessage('El campo firstName es obligatorio')
    .isString().withMessage('El campo firstName debe ser un string'),

  body('lastName')
    .exists().withMessage('El campo lastName es obligatorio')
    .isString().withMessage('El campo lastName debe ser un string'),

  body('militaryRank')
    .exists().withMessage('El campo militaryRank es obligatorio')
    .isString().withMessage('El campo militaryRank debe ser un string'),

  body('powerMilitary')
    .exists().withMessage('El campo Fuerza Perteneciente es obligatorio')
    .isString().withMessage('El campo Fuerza Perteneciente debe ser un string'),



  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

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

exports.verifyResetToken = (req, res, next) => {
  const { token } = req.body;
  if (!token) {
    return res.status(401).json({ message: "Token requerido." });
  }
  try {
    const decoded = jwt.verify(token, process.env.RESET_TOKEN_SECRET);
    // Validar que el token sea del tipo reset
    if (decoded.type !== "reset") {
      return res.status(400).json({ message: "Token no válido para reseteo de contraseña." });
    }
    // Adjuntar la información decodificada a la request
    req.decoded = decoded;
    next();
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: "Token inválido o expirado." });
  }
};

exports.validateResetPassword = [
  // Validar que el campo 'token' exista y sea string
  body('token')
    .exists().withMessage('El campo token es obligatorio')
    .isString().withMessage('El campo token debe ser un string'),
  
  // Validar que el campo 'password' exista, sea string y cumpla con la complejidad mínima
  body('password')
    .exists().withMessage('El campo password es obligatorio')
    .isString().withMessage('El campo password debe ser un string')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/)
    .withMessage('La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un símbolo'),

  // Middleware para revisar si hay errores en la validación
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    next();
  }
];