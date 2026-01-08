const app = require('./app');
require('dotenv').config();
const responseTime = require('response-time');
const { connectDB } = require('./src/database/connection');
const { setupWorker } = require('./src/services/excel-worker.service');
const { setupConciliacionWorker } = require('./src/services/conciliacion-worker.service');
const { setupConciliacionScheduler } = require('./src/services/conciliacion-scheduler.service');
const { initialize: initializeLogger } = require('./src/logger/redisLogger');

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await connectDB();
  
  // Inicializar Logger
  await initializeLogger();
  
  // Inicializar Workers
  setupWorker();
  setupConciliacionWorker();
  
  // Inicializar Scheduler de Conciliación (si está habilitado)
  setupConciliacionScheduler();

  app.use(responseTime());
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();

