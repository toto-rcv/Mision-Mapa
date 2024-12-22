const validateRole = (allowedRoles = []) => {
    return (req, res, next) => {
        // Verificar que el rol exista en el token
        console.log(req.user);
        if (!req.user || !req.user.rank) {
            return res.status(403).json({ message: "Rol de usuario no autorizado o no presente en el token" });
        }

        const userRole = req.user.rank;

        // Si se especificaron roles permitidos, verificarlos
        if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
            return res.status(403).json({ message: `Acceso denegado para el rol: ${userRole}` });
        }

        // Guardar el rol en el request
        req.role = userRole;

        next();
    };
};

module.exports = validateRole;
