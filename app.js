const express = require('express');
const apiRoutes = require('./src/routes/api.routes');

const app = express();

app.use(express.json());

app.use('/api/v1', apiRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

module.exports = app;

