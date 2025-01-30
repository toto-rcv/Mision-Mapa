const db = require("../models");
const User = db.User;

const getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            include: [{
            model: db.UserStatus,
            attributes: ['status'],
            as: 'userStatus'
            }]

            
        });
        res.status(200).json(users);
    } catch (error) {
        console.error("Error al obtener los usuarios:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};


module.exports = { getAllUsers};