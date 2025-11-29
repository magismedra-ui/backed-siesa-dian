const { DataTypes } = require('sequelize');
const { sequelize } = require('../connection');

const DatosTransitorios = sequelize.define('T_DATOS_TRANSITORIOS', {
  id_registro: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  id_documento: {
    type: DataTypes.STRING,
    allowNull: false
  },
  fuente: {
    type: DataTypes.ENUM('DIAN', 'SIESA'),
    allowNull: false
  },
  datos_json: {
    type: DataTypes.JSON,
    allowNull: false
  }
}, {
  tableName: 'T_DATOS_TRANSITORIOS',
  timestamps: true
});

module.exports = DatosTransitorios;

