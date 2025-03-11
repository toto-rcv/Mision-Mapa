const { body, validationResult } = require("express-validator");

const validateCreateSighting = [
    body("fecha_avistamiento")
        .isISO8601().withMessage("El campo 'fecha_avistamiento' debe ser una fecha válida en formato ISO8601")
        .notEmpty().withMessage("El campo 'fecha_avistamiento' es requerido"),
    body("latitud")
        .isFloat().withMessage("El campo 'latitud' debe ser un número decimal")
        .notEmpty().withMessage("El campo 'latitud' es requerido"),
    body("longitud")
        .isFloat().withMessage("El campo 'longitud' debe ser un número decimal")
        .notEmpty().withMessage("El campo 'longitud' es requerido"),
    body("tipo_aeronave")
        .isString().withMessage("El campo 'tipo_aeronave' debe ser un texto")
        .notEmpty().withMessage("El campo 'tipo_aeronave' es requerido"),
    body("altitud_estimada")
        .isString().withMessage("El campo 'altitud_estimada' debe ser un texto")
        .isIn(["Muy alto", "Alto", "Bajo", "Muy bajo"]).withMessage("El campo 'altitud_estimada' debe ser uno de los siguientes valores: Muy alto, Alto, Bajo, Muy bajo")
        .notEmpty().withMessage("El campo 'altitud_estimada' es requerido"),
    body("rumbo")
        .isString().withMessage("El campo 'rumbo' debe ser un texto")
        .isIn(["N", "NE", "E", "SE", "S", "SW", "W", "NW"]).withMessage("El campo 'rumbo' debe ser uno de los siguientes valores: N, NE, E, SE, S, SW, W, NW")
        .notEmpty().withMessage("El campo 'rumbo' es requerido"),
    body("tipo_motor")
        .optional()
        .isString().withMessage("El campo 'tipo_motor' debe ser un texto")
        .isIn(["Turbofan", "Pistón", "Turbohélice", "Reactor"]).withMessage("El campo 'tipo_motor' debe ser uno de los siguientes valores: Turbofan, Pistón, Turbohélice, Reactor"),
    body("cantidad_motores")
        .optional()
        .isInt({ min: 0, max: 4 }).withMessage("El campo 'cantidad_motores' debe ser un número entero"),
    body("color")
        .optional()
        .isString().withMessage("El campo 'color' debe ser un texto"),
    body("observaciones")
        .isString().withMessage("El campo 'observaciones' debe ser un texto")
        .isLength({ min: 0, max: 250 }).withMessage("El campo 'observaciones' debe tener un max de 250 letras"),

    // Validar existencia del usuario y agregar `usuario_id` desde el token
    (req, res, next) => {
        if (!req.user || !req.user.id) {
            return res.status(400).json({ message: "Usuario no autenticado o token inválido" });
        }
        req.body.usuario_id = req.user.id; // Agregar `usuario_id` a la solicitud

        // Validar los errores del body
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                message: "Errores de validación",
                errors: errors.array().map(err => err.msg),
            });
        }

        next();
    },
];

module.exports = validateCreateSighting;
