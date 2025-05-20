module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define("User", {
    dni: {
      type: DataTypes.INTEGER, // Cambiado de STRING a INTEGER
      allowNull: false,
      primaryKey: true, 
      unique: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    militaryRank: {
      type: DataTypes.STRING,
      allowNull: false
    },
    userRank: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'POA'
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "user_statuses", // Tabla referenciada
        key: "id",
      },
    },
    status_updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status_updated_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "Users", // Referencia a la misma tabla de usuarios
        key: "dni",   // Ahora la clave primaria es `dni`
      },
    },
    confirmUpdate: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    powerMilitary: {
      type: DataTypes.STRING,
      allowNull: false
    },
    loginAttempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    loginBlockedUntil: {
      type: DataTypes.DATE,
      allowNull: true
    }
  });

  // Hook para validar que se proporcionen DNI y email
  User.addHook("beforeValidate", (user) => {
    if (!user.dni || !user.email) throw new Error("DNI y Email son obligatorios");
  });

  User.associate = (models) => {
    User.belongsTo(models.User, {
      as: "updatedBy",
      foreignKey: "status_updated_by",
    });

    User.belongsTo(models.UserStatus, {
      as: "statusDetail",
      foreignKey: "status",
    });
  };

  return User;
};