const { DataTypes } = require('sequelize');
const { sequelize } = require('../connection');

const Discrepancias = sequelize.define('T_DISCREPANCIAS', {
  id_discrepancia: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  id_ejecucion: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  tipo_discrepancia: {
    type: DataTypes.ENUM('OMISION_DIAN', 'OMISION_SIESA', 'INCONSISTENCIA'),
    allowNull: false
  },
  documento_referencia: {
    type: DataTypes.STRING,
    allowNull: false
  },
  detalles_diferencia: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'T_DISCREPANCIAS',
  timestamps: true
});

module.exports = Discrepancias;

