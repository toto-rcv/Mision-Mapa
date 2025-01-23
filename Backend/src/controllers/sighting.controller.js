const { Op } = require('sequelize');
const { SightingNotFoundError, InsufficientPermissionsError, SightingAlreadyDeletedError } = require('../errors/customErrors');

const db = require("../models");
const Sighting = db.Sighting;
const User = db.User;

const createSighting = async (req, res) => {
    try {
        const newSighting = await Sighting.create(req.body);
        const { id, fecha_avistamiento, usuario_id } = newSighting;
        res.status(201).json({ id, fecha_avistamiento, usuario_id });
    } catch (error) {
        console.error("Error al crear avistamiento:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};

const getAllSightings = async (req, res) => {
    try {
        const role = req.role;
        const userId = req.user.id;
        const search = req.query.search || "";
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
        const offset = (page - 1) * limit;

        const whereClause = search ? { ubicacion: { [Op.like]: `%${search}%` } } : {};

        const { sightings, totalRecords } = await fetchSightingsByRole(role, userId, whereClause, { limit, offset, paginated: true });

        const totalPages = Math.ceil(totalRecords / limit);

        res.status(200).json({
            sightings,
            currentPage: page,
            totalPages,
            totalRecords,
            limit,
        });
    } catch (error) {
        console.error("Error al obtener los avistamientos:", error);
        if (error instanceof InsufficientPermissionsError) {
            res.status(403).json({ message: error.message });
        } else {
            res.status(500).json({ message: "Error interno del servidor" });
        }
    }
};

const deleteSighting = async (req, res) => {
    try {
        const { id } = req.params;
        const sighting = await validateSighting(id);

        sighting.fue_eliminado = true;
        sighting.eliminado_por = req.user.id;
        await sighting.save();

        res.status(200).json({ message: "Avistamiento marcado como eliminado exitosamente" });
    } catch (error) {
        console.error("Error al marcar avistamiento como eliminado:", error);
        if (error instanceof SightingNotFoundError) {
            res.status(404).json({ message: error.message });
            return;
        }
        if (error instanceof InsufficientPermissionsError) {
            res.status(403).json({ message: error.message });
            return;
        }
        if (error instanceof SightingAlreadyDeletedError) {
            res.status(400).json({ message: error.message });
            return;
        }
        res.status(500).json({ message: "Error interno del servidor" });
    }
};

const getAllMarkers = async (req, res) => {
    try {
        const role = req.role;
        const userId = req.user.id;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const whereClause = { fecha_avistamiento: { [Op.gte]: thirtyDaysAgo } };

        const { sightings } = await fetchSightingsByRole(role, userId, whereClause);

        res.status(200).json({ sightings });
    } catch (error) {
        console.error("Error al obtener los marcadores:", error);
        if (error instanceof InsufficientPermissionsError) {
            res.status(403).json({ message: error.message });
            return;
        }
        res.status(500).json({ message: "Error interno del servidor" });
    }
};

const fetchSightingsByRole = async (role, userId, whereClause = {}, options = {}) => {
    const commonInclude = [
        { model: User, as: "usuario", attributes: ["firstName", "lastName", "dni"] },
        { model: User, as: "validador", attributes: ["firstName", "lastName", "dni"] },
    ];

    const commonAttributes = { exclude: ["validado_por", "eliminado_por", "validado_en", "fue_eliminado"] };

    let additionalWhere = { fue_eliminado: false };

    if (role === "POA") {
        additionalWhere.usuario_id = userId;
    } else if (!["JEFE DE DETECCION", "DETECCION"].includes(role)) {
        throw new Error("Insufficient permissions");
    }

    const where = { ...additionalWhere, ...whereClause };

    const totalRecords = options.paginated
        ? await Sighting.count({ where })
        : null;

    const sightings = await Sighting.findAll({
        where,
        include: commonInclude,
        attributes: commonAttributes,
        ...options,
    });

    return { sightings, totalRecords };
};

const validateSighting = async (id) => {
    const sighting = await Sighting.findByPk(id);
    if (!sighting) {
        throw new SightingNotFoundError();
    }
    if (sighting.fue_eliminado) {
        throw new SightingAlreadyDeletedError();
    }
    return sighting;
};
const markSightingAsBlue = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id; // Obtener el ID del usuario que realiza la validación
        console.log(`Marking sighting with ID ${id} as validated by user ${userId}`);

        const sighting = await validateSighting(id);
        console.log(`Sighting found: ${JSON.stringify(sighting)}`);

        sighting.validado_por = userId; // Establecer el campo validado_por con el ID del usuario
        await sighting.save();
        console.log(`Sighting with ID ${id} validated by user ${userId}`);

        res.status(200).json({ message: "Avistamiento marcado como validado exitosamente" });
    } catch (error) {
        console.error("Error al marcar avistamiento como validado:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};

module.exports = { createSighting, getAllSightings, getAllMarkers, deleteSighting, markSightingAsBlue};