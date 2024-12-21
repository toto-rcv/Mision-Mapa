
const db = require("../models");
const Sighting = db.Sighting;

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
        const sightings = await Sighting.findAll();
        res.status(200).json(sightings);
    } catch (error) {
        console.error("Error al obtener avistamientos:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};

module.exports = { createSighting, getAllSightings };
