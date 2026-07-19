import http from 'http';
import { Server } from 'socket.io';
import app from './app';
import env from './config/env';
import logger from './utils/logger';
import TelemetrySimulator from './utils/simulator';

const server = http.createServer(app);

// Initialize Socket.io Server
export const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  logger.info(`Client connected: Socket ID ${socket.id}`);

  // Push immediate telemetry update to newly connected user
  socket.emit('info', { message: 'Connected to StadiumMind AI Realtime Feed.' });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: Socket ID ${socket.id}`);
  });
});

// Telemetry Simulation intervals
const TELEMETRY_INTERVAL_MS = 10000; // 10 seconds

const startSimulation = () => {
  logger.info('Starting telemetry simulator engine loops...');
  
  const simulationTimer = setInterval(async () => {
    try {
      logger.debug('Simulating telemetry loop tick...');
      
      const crowdZones = await TelemetrySimulator.simulateCrowdTick();
      if (crowdZones.length > 0) {
        io.emit('telemetry:crowd', crowdZones);
      }

      const transitOptions = await TelemetrySimulator.simulateTransitTick();
      if (transitOptions.length > 0) {
        io.emit('telemetry:transit', transitOptions);
      }

      const sustainability = await TelemetrySimulator.simulateSustainabilityTick();
      if (sustainability) {
        io.emit('telemetry:sustainability', sustainability);
      }

    } catch (err: any) {
      logger.error(`Error in simulated telemetry execution tick: ${err.message}`);
    }
  }, TELEMETRY_INTERVAL_MS);

  return () => clearInterval(simulationTimer);
};

let stopSimulation: () => void;

if (env.NODE_ENV !== 'test') {
  server.listen(env.PORT, () => {
    logger.info(`StadiumMind AI Backend listening on Port: ${env.PORT} in ${env.NODE_ENV} mode.`);
    stopSimulation = startSimulation();
  });
}

// Graceful shutdown handling
const gracefulShutdown = () => {
  logger.info('Graceful shutdown signal received. Terminating processes...');
  if (stopSimulation) stopSimulation();
  
  server.close(() => {
    logger.info('HTTP server closed successfully.');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
export default server;
