const { DataTypes } = require('sequelize');
const { sequelize } = require('../connection');

const Configuracion = sequelize.define('T_CONFIGURACION', {
  nombreParametro: {
    type: DataTypes.STRING,
    allowNull: false,
    primaryKey: true
  },
  valor: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  }
}, {
  tableName: 'T_CONFIGURACION',
  timestamps: false
});

module.exports = Configuracion;

