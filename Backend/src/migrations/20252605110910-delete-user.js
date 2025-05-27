'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Inserta un nuevo estado "deleted" en la tabla user-statuses
    await queryInterface.bulkInsert('user_statuses', [{
      status: 'deleted',
      created_at: new Date(),
      updated_at: new Date()
    }], {});
  },

  async down (queryInterface, Sequelize) {
    // Elimina el estado "deleted" si se revierte la migración
    await queryInterface.bulkDelete('user_statuses', { status: 'deleted' }, {});
  }
};