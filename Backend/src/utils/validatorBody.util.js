const validateBody = (requiredFields) => {
    return (req, res, next) => {
        const errors = [];
        // Verificar que todos los campos requeridos estén presentes
        requiredFields.forEach((field) => {
            if (!req.body[field]) {
                errors.push(`El campo '${field}' es requerido`);
            }
        });
        if (errors.length > 0) {
            return res.status(400).json({ message: "Errores de validación", errors });
        }
        next();
    };
};
module.exports = validateBody;