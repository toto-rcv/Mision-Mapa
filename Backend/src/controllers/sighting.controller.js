const { Op } = require('sequelize');
const eventEmitter = require('../utils/eventEmitter');
const { SightingNotFoundError, InsufficientPermissionsError, SightingAlreadyDeletedError } = require('../errors/customErrors');
const { checkSuspiciousSightings } = require('../utils/sightingVerification');

const db = require("../models");
const Sighting = db.Sighting;
const User = db.User;

const createSighting = async (req, res) => {
    try {
        // Agregar la dirección IP a los datos del avistamiento
        const sightingData = {
            ...req.body,
            ip_address: req.ip || req.connection.remoteAddress,
            usuario_id: req.user.id // Using id from token which contains the dni
        };

        let newSighting = await Sighting.create(sightingData);

        // Verificar actividad sospechosa
        const isSuspicious = await checkSuspiciousSightings(newSighting);

        const { id, fecha_avistamiento, ubicacion, latitud, longitud, current_location, altitud_estimada, rumbo, tipo_aeronave, tipo_motor, cantidad_motores, color, observaciones } = newSighting;
        const response = {
            id,
            fecha_avistamiento, ubicacion, latitud, longitud, current_location, altitud_estimada, rumbo, tipo_aeronave,
            tipo_motor, cantidad_motores, color, observaciones,
            status: 'pending',
            usuario_id: req.user.id, // Using id from token which contains the dni
            isSuspicious,
            forceLogout: isSuspicious // Agregar flag para forzar cierre de sesión
        };

        eventEmitter.emit('NEW_SIGHTING', response);

        res.status(201).json(response);
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

        const whereClause = {};

        if (search.startsWith('date:')) {
            const [startDate, endDate] = search.replace('date:', '').split(',');
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            whereClause.fecha_avistamiento = {
                [Op.between]: [start, end]
            };
        } else if (search) {
            whereClause.ubicacion = { [Op.like]: `%${search}%` };
        }

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
const validateSighting = async (id) => {
    const sighting = await Sighting.findByPk(id);
    eventEmitter.emit('VALIDATE_SIGHTING', sighting)
    if (!sighting) {
        throw new SightingNotFoundError();
    }
    if (sighting.fue_eliminado) {
        throw new SightingAlreadyDeletedError();
    }
    return sighting;
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

        // Extraer filtros desde la query string
        const { startDate, endDate, statuses, userIds } = req.query;
        const whereClause = {};

        // Filtrado por fecha: si se pasan startDate o endDate, se utilizan;
        // de lo contrario se usa el filtro por defecto de 30 días.
        if (startDate || endDate) {
            whereClause.fecha_avistamiento = {};
            if (startDate) {
                whereClause.fecha_avistamiento[Op.gte] = new Date(startDate);
            }
            if (endDate) {
                whereClause.fecha_avistamiento[Op.lte] = new Date(endDate);
            }
        } else {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            whereClause.fecha_avistamiento = { [Op.gte]: thirtyDaysAgo };
        }

        // Filtrado por estados, si se especifica (se espera una lista separada por comas)
        if (statuses) {
            const statusesArr = statuses.split(',');
            const stateConditions = [];

            statusesArr.forEach(status => {
                switch (status.toLowerCase()) {
                    case 'pending':
                        // Pendiente: validado_por y eliminado_por son null
                        stateConditions.push({
                            validado_por: { [Op.is]: null },
                            eliminado_por: { [Op.is]: null }
                        });
                        break;
                    case 'validated':
                        // Validado: validado_por NO es null y eliminado_por es null
                        stateConditions.push({
                            validado_por: { [Op.not]: null },
                            eliminado_por: { [Op.is]: null }
                        });
                        break;
                    case 'rejected':
                    case 'descartado':
                        // Descartado: eliminado_por NO es null
                        stateConditions.push({
                            eliminado_por: { [Op.not]: null }
                        });
                        break;
                    default:
                        break;
                }
            });


            if (stateConditions.length > 0) {
                // Combina las condiciones de estado con un OR
                whereClause[Op.or] = stateConditions;
            }
        }

        // Filtrado por usuario, si se especifica (se espera una lista separada por comas)
        if (userIds) {
            const userIdsArr = userIds.split(',');
            whereClause.usuario_id = { [Op.in]: userIdsArr };
        }

        // Se asume que fetchSightingsByRole utiliza whereClause para filtrar
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
        { model: User, as: "usuario", attributes: ["firstName", "lastName", "dni", "powerMilitary", "militaryRank"] },
        { model: User, as: "validador", attributes: ["firstName", "lastName", "dni",] },
    ];

    const commonAttributes = { exclude: ["validado_por", "eliminado_por", "validado_en", "fue_eliminado"] };

    let additionalWhere = { fue_eliminado: false };

    if (role === "POA") {
        additionalWhere.usuario_id = userId;
    } else if (!["JEFE DE DETECCION", "DETECCION", "SUPERVISOR"].includes(role)) {
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

    // Agregamos el campo "status" a cada avistamiento
    const computedSightings = sightings.map(sighting => {
        let status;
        if (sighting.validado_por === null && sighting.eliminado_por === null) {
            status = "pending";
        } else if (sighting.validado_por !== null && sighting.eliminado_por === null) {
            status = "validated";
        } else if (sighting.eliminado_por !== null) {
            status = "rejected";
        }

        return {
            ...sighting.toJSON(),
            status,
        };
    });

    return { sightings: computedSightings, totalRecords };

};

const markSightingAsSeen = async (req, res) => {
    try {
        const { id } = req.params;
        const sighting = await Sighting.findByPk(id);
        if (!sighting) {
            throw new SightingNotFoundError();
        }

        const user = await User.findByPk(req.user.id);
        if (!user) {
            throw new Error("User not found");
        }

        sighting.validado_por = user.dni;
        sighting.validado_en = new Date();
        await sighting.save();

        eventEmitter.emit('VALIDATE_SIGHTING', id);

        res.status(200).json({ message: "Avistamiento validado exitosamente" });
    } catch (error) {
        console.error("Error al validar avistamiento:", error);
        if (error instanceof SightingNotFoundError) {
            res.status(404).json({ message: error.message });
        } else {
            res.status(500).json({ message: "Error interno del servidor" });
        }
    }
};


module.exports = { createSighting, getAllSightings, getAllMarkers, deleteSighting, markSightingAsSeen };
