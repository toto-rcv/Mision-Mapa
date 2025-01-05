'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Sightings', 'fue_eliminado', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.addColumn('Sightings', 'eliminado_por', {
      type: Sequelize.STRING,
      allowNull: true,
      references: {
        model: 'Users', // Nombre de la tabla Users en la base de datos
        key: 'dni',
      },
    });

    await queryInterface.removeColumn('Sightings', 'creado_en');

  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Sightings', 'fue_eliminado');
    await queryInterface.removeColumn('Sightings', 'eliminado_por');

    await queryInterface.addColumn('Sightings', 'creado_en', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  }
};
