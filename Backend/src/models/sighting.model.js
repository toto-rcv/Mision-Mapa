
module.exports = (sequelize, DataTypes) => {
    const Sighting = sequelize.define("Sighting", {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        usuario_id: {
            type: DataTypes.STRING,
            allowNull: false,
            references: {
                model: "Users", // Nombre de la tabla Users en la base de datos
                key: "dni",
            },
        },
        fecha_avistamiento: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        ubicacion: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        latitud: {
            type: DataTypes.FLOAT,
            allowNull: false,
        },
        longitud: {
            type: DataTypes.FLOAT,
            allowNull: false,
        },
        altitud_estimada: {
            type: DataTypes.FLOAT,
            allowNull: true,
        },
        rumbo: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        tipo_aeronave: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        tipo_motor: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        cantidad_motores: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        color: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        observaciones: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        validado_por: {
            type: DataTypes.STRING,
            allowNull: true,
            references: {
                model: "Users", // Nombre de la tabla Users en la base de datos
                key: "dni",
            },
        },
        validado_en: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        creado_en: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
            allowNull: false,
        },
    }, {
        timestamps: false, // Desactiva los timestamps automáticos
    }
    );



    // Definir las asociaciones
    Sighting.associate = (models) => {
        Sighting.belongsTo(models.User, {
            foreignKey: "usuario_id",
            as: "usuario",
            allowNull: false,
            targetKey:"dni",
        });
        Sighting.belongsTo(models.User, {
            foreignKey: "validado_por",
            as: "validador",
            allowNull: true,
            targetKey:"dni",
        });
    };

    return Sighting;
};
