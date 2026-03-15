import http from 'http';
import app from './app';
import { createWsServer } from './ws/wsServer';
import { config } from './config';
import { checkDatabaseConnection } from './db/client';

async function main() {
  // Check database connection on startup
  const dbOk = await checkDatabaseConnection();
  if (!dbOk) {
    console.warn('Warning: Database connection failed. Some features may not work.');
  } else {
    console.log('Database connection established.');
  }

  // Create HTTP server
  const server = http.createServer(app);

  // Attach WebSocket server
  createWsServer(server);

  // Start listening
  server.listen(config.port, () => {
    console.log(`Server running on port ${config.port} (${config.nodeEnv})`);
    console.log(`API: http://localhost:${config.port}/api`);
    console.log(`WebSocket: ws://localhost:${config.port}/ws`);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully...');
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  });
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
