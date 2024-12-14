const { hashPassword, comparePassword } = require("../utils/password.util");
const { generateAccessToken,generateRefreshToken } = require("../utils/jwt.util");
const db = require("../models");
const User = db.User;
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
            militaryRank
        });

        res.status(201).json({ message: "Usuario registrado exitosamente", user: newUser });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.login = async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ message: "Credenciales Incorrectas" });

    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) return res.status(401).json({ message: "Credenciales Incorrectas" });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.json({
        message: "Acceso exitoso",
        accessToken,
        refreshToken,
    });

};