'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {

    await queryInterface.createTable("Sightings", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      usuario_id: {
        type: Sequelize.STRING,
        allowNull: false,
        references: {
          model: "Users", // Nombre de la tabla en la base de datos
          key: "dni",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      fecha_avistamiento: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      ubicacion: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      latitud: {
        type: Sequelize.FLOAT,
        allowNull: false,
      },
      longitud: {
        type: Sequelize.FLOAT,
        allowNull: false,
      },
      altitud_estimada: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      rumbo: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      tipo_aeronave: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      tipo_motor: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      cantidad_motores: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      color: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      observaciones: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      validado_por: {
        type: Sequelize.STRING,
        allowNull: true,
        references: {
          model: "Users",
          key: "dni",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      validado_en: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      creado_en: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false,
      },
    });


  },

  async down(queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  }
};
