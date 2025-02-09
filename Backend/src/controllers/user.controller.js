const db = require("../models");
const { Op } = require("sequelize");
const User = db.User;
const UserStatus = db.UserStatus;

const getAllUsers = async (req, res) => {
    try {
      

        const users = await User.findAll({
            include: [{
                model: db.UserStatus,
                attributes: ['status'],
                as: 'statusDetail',
                required: true,
                where:{
                    status : {[Op.in]: ["active","pending"]} },

            }],
           
        });

        res.status(200).json(users);
    } catch (error) {
        console.error("Error al obtener los usuarios:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};
const updateUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        //obtener id de status segun el estatus
        const statusId = await UserStatus.findOne({ where: { status: status } });
        if (!statusId) {
            return res.status(404).json({ message: 'Estado no encontrado' });
        }
        user.status = statusId.id;
        user.confirmUpdate = req.user.id;
       
        
        await user.save();

        res.status(200).json({ message: 'Estado del usuario actualizado exitosamente' });
    } catch (error) {
        console.error('Error al actualizar el estado del usuario:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};


const getDeleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        
        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        // Obtener el ID del estado "blocked"
        const statusBlocked = await UserStatus.findOne({ where: { status: "blocked" } });
        if (!statusBlocked) {
            return res.status(404).json({ message: "Estado 'blocked' no encontrado" });
        }

        // Actualizar el estado del usuario a "blocked"
        user.status = statusBlocked.id;
        await user.save();

        res.status(200).json({ message: "Usuario bloqueado exitosamente" });
    } catch (error) {
        console.error("Error al bloquear el usuario:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};




module.exports = { getAllUsers, updateUserStatus, getDeleteUser };