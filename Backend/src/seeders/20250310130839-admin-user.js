require('dotenv').config();
const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const adminDNI = 1000000;
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'adminpassword123';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const superAdminDNI = 11111111;
    const superAdminEmail = 'superAdmin@example.com';
    const superAdminPassword = 'superAdminpassword123';
    const superAdminHashedPassword = await bcrypt.hash(superAdminPassword, 10);

    // Verificar si ya existen los usuarios administradores
    const [admin] = await queryInterface.sequelize.query(
      `SELECT dni FROM Users WHERE email IN ('${adminEmail}', '${superAdminEmail}') LIMIT 2;`
    );

    const existingEmails = admin.map(user => user.email);
    const usersToInsert = [];

    if (!existingEmails.includes(adminEmail)) {
      usersToInsert.push({
        dni: adminDNI,
        email: adminEmail,
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        militaryRank: 'Administrator',
        userRank: 'SUPERVISOR',
        status: 2
      });
    }

    if (!existingEmails.includes(superAdminEmail)) {
      usersToInsert.push({
        dni: superAdminDNI,
        email: superAdminEmail,
        password: superAdminHashedPassword,
        firstName: 'Super',
        lastName: 'Admin',
        militaryRank: 'Programador',
        userRank: 'ADMINDEVELOPER',
        status: 2
      });
    }

    if (usersToInsert.length > 0) {
      return queryInterface.bulkInsert('Users', usersToInsert);
    }
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Users', { 
      dni: [1000000, 11111111] 
    });
  }
};
