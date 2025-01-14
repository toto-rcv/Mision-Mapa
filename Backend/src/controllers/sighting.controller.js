const { Op } = require('sequelize');
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
        const search = req.query.search || ""; // Obtenemos la búsqueda del query
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit; // Calculamos el offset
        // Obtenemos la búsqueda, página y límite del cuerpo de la solicitud
        let sightings;
        let whereClause = search ? { ubicacion: { [Op.like]: `%${search}%` } } : {}; // Si hay búsqueda
        let totalRecords;

        switch (userRole) {
            case "JEFE DE DETECCION":
            case "DETECCION":
                // Los usuarios con rol "Mayor" ven todos los registros
                totalRecords = await Sighting.count({ where: { ...whereClause, fue_eliminado: false } });
                sightings = await Sighting.findAll({
                    where: { ...whereClause, fue_eliminado: false },
                    include: [
                        { model: User, as: "usuario", attributes: ["firstName", "lastName", "dni"] },
                        { model: User, as: "validador", attributes: ["firstName", "lastName", "dni"] },
                    ],
                    attributes: { exclude: ["validado_por", "eliminado_por", "validado_en", "fue_eliminado"] },
                    limit,
                    offset,
                });
                break;

            case "POA":
                // Los usuarios con rol "POA" solo ven sus propios registros
                totalRecords = await Sighting.count({ where: { ...whereClause, usuario_id: req.user.id, fue_eliminado: false } });
                sightings = await Sighting.findAll({
                    where: { ...whereClause, usuario_id: req.user.id, fue_eliminado: false },
                    include: [
                        { model: User, as: "usuario", attributes: ["firstName", "lastName", "dni"] },
                        { model: User, as: "validador", attributes: ["firstName", "lastName", "dni"] },
                    ],
                    attributes: { exclude: ["validado_por", "eliminado_por", "validado_en", "fue_eliminado"] },
                    limit,
                    offset,
                });
                break;

            default:
                return res.status(403).json({ message: "No tienes permiso para ver estos registros" });
        }
        const totalPages = Math.ceil(totalRecords / limit); // Calculamos el total de páginas
        res.status(200).json({
            sightings,
            currentPage: page,
            totalPages,
        });
    } catch (error) {
        console.error("Error al obtener los avistamientos:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};

const deleteSighting = async (req, res) => {
    try {
        const { id } = req.params;
        const sighting = await Sighting.findByPk(id);
        if (!sighting) {
            return res.status(404).json({ message: "Avistamiento no encontrado" });
        }

        // Actualizar las propiedades fue_eliminado y eliminado_por
        sighting.fue_eliminado = true;
        sighting.eliminado_por = req.user.id;
        await sighting.save();

        res.status(200).json({ message: "Avistamiento marcado como eliminado exitosamente" });
    } catch (error) {
        console.error("Error al marcar avistamiento como eliminado:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};



const getAllMarkers = async (req, res) => {
    try {
        let markers;
        const  role  = req.role;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        switch (role) {
            case "JEFE DE DETECCION":
            case "DETECCION":
                markers = await Sighting.findAll({
                    where: { fue_eliminado: false },
                    createdAt: { [Op.gte]: thirtyDaysAgo },
                    include: [
                        { model: User, as: "usuario", attributes: ["firstName", "lastName", "dni"] },
                        { model: User, as: "validador", attributes: ["firstName", "lastName", "dni"] },
                    ],
                    attributes: { exclude: ["validado_por", "eliminado_por", "validado_en", "fue_eliminado"] },
                });
                break;

            case "POA":
                markers = await Sighting.findAll({
                    where: { usuario_id: req.user.id, fue_eliminado: false },
                    createdAt: { [Op.gte]: thirtyDaysAgo },
                    include: [
                        { model: User, as: "usuario", attributes: ["firstName", "lastName", "dni"] },
                        { model: User, as: "validador", attributes: ["firstName", "lastName", "dni"] },
                    ],
                    attributes: { exclude: ["validado_por", "eliminado_por", "validado_en", "fue_eliminado"] },
                });
                break;

            default:
                return res.status(403).json({ message: "No tienes permiso para ver estos registros" });
        }

        res.status(200).json({ sightings: markers });
    } catch (error) {
        console.error("Error al obtener los marcadores:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};

module.exports = { createSighting, getAllSightings, getAllMarkers, deleteSighting };
