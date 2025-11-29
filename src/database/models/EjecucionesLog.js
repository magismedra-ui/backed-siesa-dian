const { DataTypes } = require('sequelize');
const { sequelize } = require('../connection');

const EjecucionesLog = sequelize.define('T_EJECUCIONES_LOG', {
  id_ejecucion: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  fecha_inicio: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  fecha_fin: {
    type: DataTypes.DATE
  },
  estado: {
    type: DataTypes.ENUM('EXITO', 'FALLA', 'EN_PROCESO'),
    defaultValue: 'EN_PROCESO'
  },
  documentos_procesados: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'T_EJECUCIONES_LOG',
  timestamps: false
});

module.exports = EjecucionesLog;

