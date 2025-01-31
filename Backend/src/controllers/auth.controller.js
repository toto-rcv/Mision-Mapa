const { hashPassword, comparePassword } = require("../utils/password.util");
const { generateAccessToken, generateRefreshToken } = require("../utils/jwt.util");
const { saveRefreshToken } = require("../utils/refreshTokens");
const db = require("../models");
const User = db.User;
const UserStatus = db.UserStatus;

exports.register = async (req, res) => {
  try {
    const { dni, email, password, firstName, lastName, militaryRank } = req.body;

    // Validación de correo y DNI únicos
    const existingUser = await User.findOne({ where: { email } });
    const existingDNI = await User.findOne({ where: { dni } });

    if (existingUser) {
      return res.status(400).json({ message: "El correo electrónico ya está en uso" });
    }

    if (existingDNI) {
      return res.status(400).json({ message: "El DNI ya está registrado" });
    }

    // Hashear la contraseña
    const hashedPassword = await hashPassword(password);

    // Crear el usuario
    const newUser = await User.create({
      dni,
      email,
      password: hashedPassword,
      firstName,
      lastName,
      militaryRank,
    });

    res.status(201).json({ message: "Usuario registrado exitosamente", user: { dni, email } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  //controlar que el estado del usuario sea activo
  
  
  const user = await User.findOne({ where: { email },
  include: {
    model: UserStatus,
    where: {status: 'active'},
    required: true,
    as: 'userStatus'
    }
  });
  
  if (!user) return res.status(401).json({ message: "Credenciales Incorrectas" });

  const isValidPassword = await comparePassword(password, user.password);
  if (!isValidPassword) return res.status(401).json({ message: "Credenciales Incorrectas" });

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  saveRefreshToken(refreshToken)

  res.json({
    message: "Acceso exitoso",
    accessToken,
    refreshToken,
  });

};

// Verificar validez del access token token
exports.verifyToken = (req, res) => {
  try {
    const decoded = req.user;
    res.status(200).json({
      message: "Token válido",
      user: decoded,
    });
  } catch (error) {
    console.error("Error en el controlador:", error.message);

    res.status(500).json({ message: "Error interno del servidor" });
  }
};

// Generar nuevo access token usando refresh token
exports.refreshAccessToken = async (req, res) => {
  const user = req.user; // Datos decodificados del Refresh Token

  const dni = user.id
  const userR = await User.findOne({ where: { dni } });
  if (!userR) return res.status(401).json({ message: "Credenciales incorrenctas" });

  // Generar un nuevo Access Token
  const newAccessToken = generateAccessToken({ dni: userR.dni, email: userR.email, userRank: userR.userRank });

  return res.status(200).json({
    accessToken: newAccessToken,
  });
};


exports.getProfile = async (req, res) => {
  try {
    const user = req.user;
    const userR = await User.findOne({ where: { dni: user.id }, attributes: ["dni", "firstName", "lastName", "militaryRank", "userRank"] });

    if (!userR) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const permissions = {
      deleteSightings: userR.userRank === 'DETECCION' || userR.userRank === 'JEFE DE DETECCION',
      viewUsers: userR.userRank === 'DETECCION' || userR.userRank === 'JEFE DE DETECCION'
    };



    res.status(200).json({ user: userR, permissions: permissions });
  } catch (error) {
    console.error("Error en el controlador:", error.message);

    res.status(500).json({ message: "Error interno del servidor" });
  }
}