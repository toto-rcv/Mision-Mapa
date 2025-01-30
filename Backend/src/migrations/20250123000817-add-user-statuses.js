'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Crear tabla `user_statuses`
    await queryInterface.createTable("user_statuses", {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        status: {
            type: Sequelize.STRING(50),
            allowNull: false,
            unique: true,
        },
        created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn("NOW"),
        },
        updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn("NOW"),
        },
    });

    // Insertar registros iniciales en `user_statuses`
    await queryInterface.bulkInsert("user_statuses", [
        { id: 1, status: "pending", created_at: new Date(), updated_at: new Date() },
        { id: 2, status: "active", created_at: new Date(), updated_at: new Date() },
        { id: 3, status: "blocked", created_at: new Date(), updated_at: new Date() },
    ]);

    // Agregar columnas a la tabla `Users`
    await queryInterface.addColumn("Users", "status", {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
            model: "user_statuses",
            key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
        defaultValue: 1,
    });

    await queryInterface.addColumn("Users", "status_updated_at", {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW")
    });

    await queryInterface.addColumn("Users", "status_updated_by", {
        type: Sequelize.STRING,
        allowNull: true,
        references: {
            model: "Users", // Referencia a la tabla `Users`
            key: "dni",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
    });
},

async down(queryInterface, Sequelize) {
    // Eliminar las columnas de la tabla `Users`
    await queryInterface.removeColumn("Users", "status");
    await queryInterface.removeColumn("Users", "status_updated_at");
    await queryInterface.removeColumn("Users", "status_updated_by");

    // Eliminar la tabla `user_statuses`
    await queryInterface.dropTable("user_statuses");
}
};
