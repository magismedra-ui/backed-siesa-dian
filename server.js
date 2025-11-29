const app = require('./app');
require('dotenv').config();
const responseTime = require('response-time');
const { connectDB } = require('./src/database/connection');

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await connectDB();
  app.use(responseTime());
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();

