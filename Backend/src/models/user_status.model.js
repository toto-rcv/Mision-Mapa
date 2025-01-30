module.exports = (sequelize, DataTypes) => {
    const UserStatus = sequelize.define(
        "UserStatus",
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            status: {
                type: DataTypes.STRING(50),
                allowNull: false,
                unique: true,
            },
            createdAt: {
                type: DataTypes.DATE,
                allowNull: false,
                field: "created_at", // Mapea la columna de la base de datos
            },
            updatedAt: {
                type: DataTypes.DATE,
                allowNull: false,
                field: "updated_at", // Mapea la columna de la base de datos
            },
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