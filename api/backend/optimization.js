const express = require('express');
const cors = require('cors');
const optimizationRoutes = require('../../Backend/routes/optimization');

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

// Use optimization routes
app.use('/api/optimization', optimizationRoutes);

// Handle root path
app.use('/', optimizationRoutes);

module.exports = app;