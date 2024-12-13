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
      }
    });
  
    // Restricción para evitar múltiples DNIs con un mismo correo
    User.addHook("beforeValidate", (user) => {
      if (!user.dni || !user.email) throw new Error("DNI y Email son obligatorios");
    });
  
    return User;
  };