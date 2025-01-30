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
}, {
    tableName: 'user_statuses',
    timestamps: false
});
return UserStatus;
} 
