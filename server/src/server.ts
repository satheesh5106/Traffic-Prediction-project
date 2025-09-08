import { app, logger } from './app';
import { weatherConfig } from './config/weather';

const PORT = weatherConfig.PORT;

// Start server
const server = app.listen(PORT, () => {
  logger.info({
    port: PORT,
    environment: weatherConfig.NODE_ENV,
    nodeVersion: process.version,
    pid: process.pid
  }, `🌤️  Weather API Server started on port ${PORT}`);
  
  logger.info('Available endpoints:');
  logger.info('  GET  /health - Server health check');
  logger.info('  GET  /api/weather/health - Weather service health');
  logger.info('  GET  /api/weather/stations - Get all weather stations');
  logger.info('  GET  /api/weather/station/:id - Get weather data for station');
  logger.info('  GET  /api/weather/alerts - Get weather alerts');
  logger.info('  GET  /api/weather/traffic-impact/:stationId - Get traffic impact analysis');
  logger.info('  POST /api/weather/refresh - Refresh weather data (admin only)');
});

// Handle server errors
server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Port ' + PORT;

  switch (error.code) {
    case 'EACCES':
      logger.error(`${bind} requires elevated privileges`);
      process.exit(1);
    case 'EADDRINUSE':
      logger.error(`${bind} is already in use`);
      process.exit(1);
    default:
      throw error;
  }
});

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully`);
  
  server.close((err) => {
    if (err) {
      logger.error({ error: err }, 'Error during server shutdown');
      process.exit(1);
    }
    
    logger.info('Server closed successfully');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export { server };