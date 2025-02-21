const db = require("../models");
const { Op } = require("sequelize");
const User = db.User;
const UserStatus = db.UserStatus;
const getAllUsers = async (req, res) => {
    try {

        const { status } = req.query; // Obtener el parámetro status de la URL

        // Construir el filtro de estado dinámicamente
        const statusFilter = status ? { status } : { status: { [Op.in]: ["active", "pending", "blocked"] } };

        const users = await User.findAll({
            include: [{
                model: db.UserStatus,
                attributes: ['status'],
                as: 'statusDetail',
                required: true,
                where: statusFilter

            }],


        });

        res.status(200).json(users);
    } catch (error) {
        console.error("Error al obtener los usuarios:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};

const getMinimalUsers = async (req, res) => {
    try {
        let users;

        switch (req.role) {
            case 'POA':
                users = await User.findAll({
                    where: { dni: req.user.id },
                    attributes: ['dni', 'firstName', 'lastName', 'militaryRank', 'email']
                });
                break;
            case 'DETECCION':
            case 'JEFE DE DETECCION':
                users = await User.findAll({
                    attributes: ['dni', 'firstName', 'lastName', 'militaryRank', 'email'],
                    order: [
                        ['firstName', 'ASC'],
                        ['lastName', 'ASC']
                    ]
                });
                break;
            default:
                return res.status(403).json({ message: "Acceso no autorizado" });
        }

        const minimalUsers = users.map(user => ({
            dni: user.dni,
            fullName: `${user.firstName} ${user.lastName}`,
            militaryRank: user.militaryRank,
            email: user.email
        }));

        return res.status(200).json({ users: minimalUsers });
    } catch (error) {
        console.error("Error al obtener los usuarios:", error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
}

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

const updateUserRank = async (req, res) => {
    try {
        const { id } = req.params;
        const { userRank } = req.body;

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        // Asignar directamente el nuevo userRank que envía el frontend
        user.userRank = userRank;

        await user.save();

        res.status(200).json({ message: 'Rango del usuario actualizado exitosamente' });
    } catch (error) {
        console.error('Error al actualizar el rango del usuario:', error);
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





module.exports = { getAllUsers, updateUserStatus, getDeleteUser, getMinimalUsers, updateUserRank };
