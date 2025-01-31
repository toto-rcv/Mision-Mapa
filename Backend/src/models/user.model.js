

module.exports = (sequelize, DataTypes) => {

  const User = sequelize.define("User", {
    dni: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true, // DNI como clave primaria
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
      defaultValue: 'POA', // Valor por defecto
    },
    status: {
      type: DataTypes.INTEGER,

      allowNull: true,
      references: {
        model: "user_statuses", // La tabla referenciada para `status`
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
        key: "id",
      },
    },

  });

  User.associate = (models) => {
    User.belongsTo(models.UserStatus, {
      foreignKey: 'status',
      as: 'userStatus'
    });
  };
  // Restricción para evitar múltiples DNIs con un mismo correo
  User.addHook("beforeValidate", (user) => {
    if (!user.dni || !user.email) throw new Error("DNI y Email son obligatorios");
  });

  User.associate = (models) => {
    User.belongsTo(models.User, {
        as: "updatedBy", // Usuario que actualizó el estado
        foreignKey: "status_updated_by",
    });

    User.belongsTo(models.UserStatus, {
        as: "statusDetail", // Detalle del estado
        foreignKey: "status",
    });
};

  return User;
};