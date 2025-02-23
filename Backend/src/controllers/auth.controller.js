const { hashPassword, comparePassword } = require("../utils/password.util");
const { generateAccessToken, generateRefreshToken, generateResetToken } = require("../utils/jwt.util");
const { saveRefreshToken } = require("../utils/refreshTokens");
const db = require("../models");
const User = db.User;
const UserStatus = db.UserStatus;

exports.register = async (req, res) => {
  try {
    const { dni, email, password, firstName, lastName, militaryRank, powerMilitary } = req.body;

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
    await User.create({
      dni,
      email,
      password: hashedPassword,
      firstName,
      lastName,
      militaryRank,
      powerMilitary,
    });

    res.status(201).json({ message: "Usuario registrado exitosamente", user: { dni, email } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ where: { email },
  include: {
    model: UserStatus,
    where: {status: 'active'},
    required: true,
    as: 'statusDetail'
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
  const userR = await User.findOne({ where: { dni },
    include: {
      model: UserStatus,
      where: {status: 'active'},
      required: true,
      as: 'statusDetail'
      }
    });
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
    const userR = await User.findOne({ where: { dni: user.id }, attributes: ["dni", "firstName", "lastName", "militaryRank", "userRank","powerMilitary"] });

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

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: "El campo email es obligatorio." });
    }

    // Buscar el usuario por email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    
    // Generar el token de reseteo usando la función encapsulada (con duración de 30 minutos)
    const resetToken = generateResetToken(user);
    
    // Aquí deberías integrar el envío de email; por ejemplo:
    console.log(
      `Enviar email a ${user.email} con el enlace: ${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`
    );
    
    //res.json({ message: "Si el usuario existe, se ha enviado un email para resetear la contraseña." });
    res.json({message: resetToken});
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error en el servidor." });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { password } = req.body;
    const { id } = req.decoded; // Se extrae el id del usuario del token

    if (!password) {
      return res.status(400).json({ message: "El campo password es obligatorio." });
    }
    
    const user = await User.findOne({ where: { dni: id } });
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    // Hashear la nueva contraseña y actualizarla
    const hashedPassword = await hashPassword(password);
    user.password = hashedPassword;
    await user.save();

    res.json({ message: "Contraseña actualizada exitosamente." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error en el servidor." });
  }
};