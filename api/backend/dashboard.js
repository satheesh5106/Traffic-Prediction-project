const express = require('express');
const cors = require('cors');
const dashboardRoutes = require('../../Backend/routes/dashboard');

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

// Use dashboard routes
app.use('/api/dashboard', dashboardRoutes);

// Handle root path
app.use('/', dashboardRoutes);

module.exports = app;