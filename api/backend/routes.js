const express = require('express');
const cors = require('cors');
const routeRoutes = require('../../Backend/routes/routes');

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

// Use route routes
app.use('/api/routes', routeRoutes);

// Handle root path
app.use('/', routeRoutes);

module.exports = app;