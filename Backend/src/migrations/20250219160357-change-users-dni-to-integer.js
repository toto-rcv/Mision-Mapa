'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // 1. Remover constraints que referencian a Users.dni
    // Ajusta los nombres de las constraints según tu proyecto
    await queryInterface.removeConstraint('Sightings', 'Sightings_ibfk_1');
    await queryInterface.removeConstraint('Sightings', 'Sightings_ibfk_2');
    await queryInterface.removeConstraint('Sightings', 'Sightings_eliminado_por_foreign_idx');
    await queryInterface.removeConstraint('Users', 'Users_status_updated_by_foreign_idx');

    await queryInterface.sequelize.query("ALTER TABLE `Users` DROP PRIMARY KEY");

    // 2. Modificar Users.dni a INTEGER
    await queryInterface.changeColumn('Users', 'dni', {
      type: Sequelize.INTEGER,
      allowNull: false,
      unique: true
    });

    await queryInterface.sequelize.query("ALTER TABLE `Users` ADD PRIMARY KEY (`dni`)");

    // 3. Modificar las columnas que referencian a Users.dni a INTEGER
    await queryInterface.changeColumn('Sightings', 'usuario_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
    await queryInterface.changeColumn('Sightings', 'validado_por', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.changeColumn('Sightings', 'eliminado_por', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.changeColumn('Users', 'status_updated_by', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    // 4. Recrear las constraints de llave foránea
    await queryInterface.addConstraint('Sightings', {
      fields: ['usuario_id'],
      type: 'foreign key',
      name: 'Sightings_usuario_id_fkey',
      references: {
        table: 'Users',
        field: 'dni'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT' // o el que corresponda en tu caso
    });

    await queryInterface.addConstraint('Sightings', {
      fields: ['validado_por'],
      type: 'foreign key',
      name: 'Sightings_validado_por_fkey',
      references: {
        table: 'Users',
        field: 'dni'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addConstraint('Sightings', {
      fields: ['eliminado_por'],
      type: 'foreign key',
      name: 'Sightings_eliminado_por_fkey',
      references: {
        table: 'Users',
        field: 'dni'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addConstraint('Users', {
      fields: ['status_updated_by'],
      type: 'foreign key',
      name: 'Users_status_updated_by_fkey',
      references: {
        table: 'Users',
        field: 'dni'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.sequelize.query("ALTER TABLE `Users` DROP PRIMARY KEY");
    
    await queryInterface.changeColumn('Users', 'dni', {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
    });
    
    await queryInterface.sequelize.query("ALTER TABLE `Users` ADD PRIMARY KEY (`dni`)");
    
    // Cambiar nuevamente las columnas relacionadas a STRING
    await queryInterface.changeColumn('Sightings', 'usuario_id', {
      type: Sequelize.STRING,
      allowNull: false,
    });
    await queryInterface.changeColumn('Sightings', 'validado_por', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.changeColumn('Sightings', 'eliminado_por', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.changeColumn('Users', 'status_updated_by', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  }
};
