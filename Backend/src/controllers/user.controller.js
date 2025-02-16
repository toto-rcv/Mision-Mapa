const db = require("../models");
const User = db.User;
const UserStatus = db.UserStatus;

const getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            include: [{
            model: db.UserStatus,
            attributes: ['status'],
            as: 'statusDetail'
            }]

            
        });
        res.status(200).json(users);
    } catch (error) {
        console.error("Error al obtener los usuarios:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};

const getMinimalUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ['dni', 'firstName', 'lastName', 'militaryRank', 'email'],
            order: [
                ['firstName', 'ASC'],
                ['lastName', 'ASC']  
              ]
          });
      
          const minimalUsers = users.map(user => {
            return {
              dni: user.dni,
              fullName: `${user.firstName} ${user.lastName}`,
              militaryRank: user.militaryRank,
              email: user.email
            };
          });
      
          return res.status(200).json({ users: minimalUsers });

    } catch (error) {
        console.error("Error al obtener los usuarios:", error);
        res.status(500).json({ message: "Error interno del servidor" });
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
        await user.save();

        res.status(200).json({ message: 'Estado del usuario actualizado exitosamente' });
    } catch (error) {
        console.error('Error al actualizar el estado del usuario:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};





module.exports = { getAllUsers, updateUserStatus, getMinimalUsers};