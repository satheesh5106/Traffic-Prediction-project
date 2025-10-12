const express = require('express');
const cors = require('cors');
const trafficRoutes = require('../../Backend/routes/traffic');

const app = express();

// Enable CORS
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Use traffic routes
app.use('/api/traffic', trafficRoutes);

// Handle root path
app.use('/', trafficRoutes);

module.exports = app;