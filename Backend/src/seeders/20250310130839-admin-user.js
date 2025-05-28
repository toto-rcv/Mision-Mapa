require('dotenv').config();
const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const adminDNI = 1000000;
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'adminpassword123';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Verificar si ya existe el usuario administrador
    const [admin] = await queryInterface.sequelize.query(
      `SELECT dni FROM Users WHERE email = '${adminEmail}' LIMIT 1;`
    );

    if (admin.length === 0) {
      return queryInterface.bulkInsert('Users', [
        {
          dni: adminDNI,
          email: adminEmail,
          password: hashedPassword,
          firstName: 'Admin',
          lastName: 'User',
          militaryRank: 'Administrator',
          userRank: 'JEFE DE DETECCION',
          status: 2
        }
      ]);
    }
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Users', { dni: 1000000 });
  }
};
