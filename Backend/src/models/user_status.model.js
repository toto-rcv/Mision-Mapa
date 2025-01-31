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
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        }
    },
        {
            tableName: "user_statuses", // Asegura que Sequelize use la tabla correcta
            timestamps: false
        }
    );

    

    return UserStatus;
};

