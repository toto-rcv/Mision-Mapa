module.exports = (sequelize, DataTypes) => {
  const Sighting = sequelize.define("Sighting", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Users",
        key: "id", // Referencia a la columna `id` de Users
      },
    },
    fecha_avistamiento: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    current_location: {
      type: DataTypes.STRING,
      allowNull: true,
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
      type: DataTypes.STRING,
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
      type: DataTypes.INTEGER, // Actualizado de STRING a INTEGER
      allowNull: true,
      references: {
        model: "Users",
        key: "dni",
      },
    },
    validado_en: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    fue_eliminado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    eliminado_por: {
      type: DataTypes.INTEGER, // Actualizado de STRING a INTEGER
      allowNull: true,
      references: {
        model: "Users",
        key: "dni",
      }
    },
    ip_address: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    estado_verificacion: {
      type: DataTypes.ENUM('VERIFICADO', 'NO_VERIFICADO'),
      allowNull: false,
      defaultValue: 'NO_VERIFICADO'
    }
  }, {
    timestamps: false, // Desactiva los timestamps automáticos
  });

  // Asociaciones
  Sighting.associate = (models) => {
    Sighting.belongsTo(models.User, {
      foreignKey: "usuario_id",
      as: "usuario",
      targetKey: "dni", // Se asocia con la columna `dni` de Users
    });
    Sighting.belongsTo(models.User, {
      foreignKey: "validado_por",
      as: "validador",
      targetKey: "dni",
    });
    Sighting.belongsTo(models.User, {
      foreignKey: "eliminado_por",
      as: "eliminador",
      targetKey: "dni",
    });
  };

  return Sighting;
};