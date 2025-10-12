const express = require('express');
const cors = require('cors');
const incidentRoutes = require('../../Backend/routes/incident');

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

// Use incident routes
app.use('/api/incident', incidentRoutes);

// Handle root path
app.use('/', incidentRoutes);

module.exports = app;