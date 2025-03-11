'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    up: async (queryInterface, Sequelize) => {
      await queryInterface.changeColumn('Sightings', 'altitud_estimada', {
        type: Sequelize.STRING,
        allowNull: true, // Ajusta según necesites
      });
    },
    down: async (queryInterface, Sequelize) => {
      await queryInterface.changeColumn('Sightings', 'altitud_estimada', {
        type: Sequelize.FLOAT,
      });
    },
  };