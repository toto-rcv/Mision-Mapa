
const db = require("../models");
const Sighting = db.Sighting;
const User = db.User;

const createSighting = async (req, res) => {
    try {
        const newSighting = await Sighting.create(req.body);
        res.status(201).json(newSighting);
    } catch (error) {
        console.error("Error al crear avistamiento:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};

const getAllSightings = async (req, res) => {

    try {
        const userRole = req.role; // Obtenemos el rol del middleware
        let sightings;

        switch (userRole) {
            case "JEFE DE DETECCION":
            case "DETECCION":
                // Los usuarios con rol "Mayor" ven todos los registros
                sightings = await Sighting.findAll({
                    include: [
                        { model: User, as: "usuario" },
                        { model: User, as: "validador" },
                    ],
                });
                break;

            case "POA":
                // Los usuarios con rol "POA" solo ven sus propios registros
                sightings = await Sighting.findAll({
                    where: { usuario_id: req.user.id }
                });
                break;

            default:
                return res.status(403).json({ message: "Rol de usuario no autorizado para esta acción" });
        }

        res.status(200).json(sightings);
    } catch (error) {
        console.error("Error al obtener avistamientos:", error.message);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};


module.exports = { createSighting, getAllSightings };
