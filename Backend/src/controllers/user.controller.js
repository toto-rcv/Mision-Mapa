const db = require("../models");
const { Op } = require("sequelize");
const User = db.User;
const UserStatus = db.UserStatus;
const getAllUsers = async (req, res) => {
    try {
        // Lee el filtro de estado del query param
        const statusFilter = req.query.status || 'all';

        // Construye el include dinámicamente según el rol y el filtro recibido
        let includeStatus = {
            model: db.UserStatus,
            attributes: ['status'],
            as: 'statusDetail',
            required: true
        };

        // Determina los estados permitidos según el rol
        let allowedStatuses = ["active", "pending", "blocked"];
        if (req.role === 'SUPERVISOR') {
            allowedStatuses = ["active", "pending", "blocked", "deleted"];
        }

        // Si el filtro es distinto de "all", filtra solo por ese estado (si está permitido)
        if (statusFilter !== 'all' && allowedStatuses.includes(statusFilter)) {
            includeStatus.where = { status: statusFilter };
        } else {
            // Si es "all", filtra por los estados permitidos según el rol
            includeStatus.where = { status: { [Op.in]: allowedStatuses } };
        }

        const users = await User.findAll({
            where: {
                userRank: { [Op.ne]: "SUPERVISOR" }
            },
            include: [includeStatus],
        });

        console.log(users.map(u => ({ dni: u.dni, status: u.statusDetail.status })));

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
            case 'SUPERVISOR':
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

        // Solo SUPERVISOR puede poner estado "deleted"
        if (status === "deleted" && req.user.userRank !== "SUPERVISOR") {
            return res.status(403).json({ message: "No autorizado para eliminar usuarios" });
        }

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const statusId = await UserStatus.findOne({ where: { status } });
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
        const statusDelete = await UserStatus.findOne({ where: { status: "deleted" } });
        if (!statusDelete) {
            return res.status(404).json({ message: "Estado 'deleted' no encontrado" });
        }

        // Actualizar el estado del usuario a "deleted"
        user.status = statusDelete.id;
        await user.save();

        res.status(200).json({ message: "Usuario bloqueado exitosamente" });
    } catch (error) {
        console.error("Error al bloquear el usuario:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};





module.exports = { getAllUsers, updateUserStatus, getDeleteUser, getMinimalUsers, updateUserRank };
