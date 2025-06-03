module.exports = (sequelize, DataTypes) => {
  const IncomeExit = sequelize.define("IncomeExit", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    dni: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'dni'
      }
    },
    income: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      get() {
        // Convertir a horario argentino al obtener el valor
        const date = this.getDataValue('income');
        return date ? new Date(date.getTime() - (3 * 60 * 60 * 1000)) : null;
      }
    },
    exit: {
      type: DataTypes.DATE,
      allowNull: true,
      get() {
        // Convertir a horario argentino al obtener el valor
        const date = this.getDataValue('exit');
        return date ? new Date(date.getTime() - (3 * 60 * 60 * 1000)) : null;
      }
    }
  });

  IncomeExit.associate = (models) => {
    IncomeExit.belongsTo(models.User, {
      foreignKey: 'dni',
      targetKey: 'dni'
    });
  };

  return IncomeExit;
}; 