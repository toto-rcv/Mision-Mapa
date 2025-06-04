const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const { validateAccessToken } = require("../middleware/auth.middleware");
const validateRole = require("../middleware/role.middleware");

// Ruta para reverse geocoding
router.get('/reverse', 
    validateAccessToken, 
    validateRole(["POA", "DETECCION", "JEFE DE DETECCION", "SUPERVISOR", "ADMINDEVELOPER"]), 
    async (req, res) => {
        try {
            const { lat, lon } = req.query;
            
            if (!lat || !lon) {
                return res.status(400).json({ error: 'Se requieren latitud y longitud' });
            }

            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`,
                {
                    headers: {
                        'User-Agent': 'Mision-Mapa/1.0'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Error en la respuesta de Nominatim: ${response.status}`);
            }

            const data = await response.json();
            res.json(data);
        } catch (error) {
            console.error('Error en reverse geocoding:', error);
            res.status(500).json({ error: 'Error al obtener la dirección' });
        }
    }
);

module.exports = router; 