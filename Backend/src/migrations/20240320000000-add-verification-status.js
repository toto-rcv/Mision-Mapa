'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Sightings', 'estado_verificacion', {
      type: Sequelize.ENUM('VERIFICADO', 'NO_VERIFICADO'),
      allowNull: false,
      defaultValue: 'NO_VERIFICADO'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Sightings', 'estado_verificacion');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_Sightings_estado_verificacion;');
  }
}; 