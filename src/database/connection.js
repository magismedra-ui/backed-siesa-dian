const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'conciliacion_db',
  process.env.DB_USER || 'root',
  process.env.DB_PASS || 'rootpassword',
  {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3307,
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('MySQL connected successfully via Sequelize');
    // En producción, usar migraciones en lugar de sync
    await sequelize.sync({ alter: false }); 
  } catch (error) {
    console.error('DB Error:', error);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };

