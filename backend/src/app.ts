import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import env from './config/env';
import { errorHandler } from './middleware/error';
import { apiLimiter } from './middleware/rateLimiter';
import { promptShieldMiddleware } from './middleware/promptShield';
import logger from './utils/logger';

// Route imports (to be created)
import authRoutes from './routes/authRoutes';
import navigationRoutes from './routes/navigationRoutes';
import crowdRoutes from './routes/crowdRoutes';
import incidentRoutes from './routes/incidentRoutes';
import sustainabilityRoutes from './routes/sustainabilityRoutes';

const app = express();

// Secure Express headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://*.openstreetmap.org", "https://*.tile.openstreetmap.org"],
      connectSrc: ["'self'", "http://localhost:5000", "ws://localhost:5000", "http://localhost", "ws://localhost"],
    },
  },
}));

// Setup CORS
app.use(cors({
  origin: '*', // For development, let proxy handle path enforcement
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

app.use(express.json());

// Bind Global Input Sanitizer and Prompt Shield
app.use(promptShieldMiddleware);

// Bind general API Rate Limiter
app.use('/api', apiLimiter);

// Liveness / Readiness Health checks
app.get('/api/health/live', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
});

app.get('/api/health/ready', (req, res) => {
  // Can expand to check database/redis connectivity
  res.status(200).json({ status: 'READY', services: { database: 'UP', cache: 'UP' } });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', environment: env.NODE_ENV });
});

// Bind API Routing Modules
app.use('/api/auth', authRoutes);
app.use('/api/navigation', navigationRoutes);
app.use('/api/crowd', crowdRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/sustainability', sustainabilityRoutes);

// Catch-all route for unmapped paths
app.use((req, res, next) => {
  res.status(404).json({ error: 'Endpoint route not found' });
});

// Global Centralized Error Middleware
app.use(errorHandler);

export default app;
