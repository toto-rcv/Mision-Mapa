module.exports = (sequelize, DataTypes) => {

const UserStatus = sequelize.define('UserStatus', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, 
        {
            tableName: "user_statuses", // Asegura que Sequelize use la tabla correcta
            timestamps: true, // Sequelize manejará automáticamente `createdAt` y `updatedAt`
        }
    );

    UserStatus.associate = (models) => {
        // Define la relación con el modelo `User`
        UserStatus.hasMany(models.User, {
            as: "users",
            foreignKey: "status",
        });
    };

    return UserStatus;
};

