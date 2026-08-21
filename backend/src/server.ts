import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import pinoHttp from 'pino-http';
import promClient from 'prom-client';
import { RateLimiterMode, RateLimiterRedis } from 'rate-limiter-flexible';
import redis from 'redis';
import { server as socketServer } from './socket.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authRoutes } from './routes/auth.routes.js';
import { contactRoutes } from './routes/contacts.routes.js';
import { companyRoutes } from './routes/companies.routes.js';
import { dealRoutes } from './routes/deals.routes.js';
import { workflowRoutes } from './routes/workflows.routes.js';
import { emailRoutes } from './routes/email.routes.js';
import { socialRoutes } from './routes/social.routes.js';
import { ticketRoutes } from './routes/tickets.routes.js';
import { agencyRoutes } from './routes/agency.routes.js';
import { webhookRoutes } from './routes/webhooks.routes.js';
import { healthCheck } from './middleware/healthCheck.js';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Redis connection for rate limiting and queues
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});
redisClient.on('error', (err) => console.error('Redis Client Error', err));
await redisClient.connect();

// Rate Limiter Configuration
const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'middleware',
  points: NODE_ENV === 'production' ? 100 : 1000, // Number of requests
  duration: 60, // Per second
});

// ==========================================
// MIDDLEWARE STACK
// ==========================================

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "cdn.cadence.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
      fontSrc: ["'self'", "fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Logging
app.use(pinoHttp({
  level: NODE_ENV === 'production' ? 'info' : 'debug',
  redact: ['req.headers.authorization', 'res.cookies'],
}));

// Rate limiting middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  if (NODE_ENV === 'test') return next();
  
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  rateLimiter.consume(key)
    .then(() => next())
    .catch(() => {
      res.status(429).json({ error: 'Too many requests, please try again later.' });
    });
});

// Prometheus metrics
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });
app.get('/metrics', async (req: Request, res: Response) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Health check endpoint
app.use('/health', healthCheck);

// ==========================================
// API ROUTES
// ==========================================

const apiPrefix = '/api/v2';

// Authentication & Users
app.use(`${apiPrefix}/auth`, authRoutes);

// CRM Core
app.use(`${apiPrefix}/contacts`, contactRoutes);
app.use(`${apiPrefix}/companies`, companyRoutes);
app.use(`${apiPrefix}/deals`, dealRoutes);

// Marketing Automation
app.use(`${apiPrefix}/workflows`, workflowRoutes);
app.use(`${apiPrefix}/email`, emailRoutes);

// Social Media
app.use(`${apiPrefix}/social`, socialRoutes);

// Service Hub
app.use(`${apiPrefix}/tickets`, ticketRoutes);

// Agency Management
app.use(`${apiPrefix}/agency`, agencyRoutes);

// Integrations & Webhooks
app.use(`${apiPrefix}/webhooks`, webhookRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString(),
  });
});

// Global error handler
app.use(errorHandler);

// ==========================================
// SERVER INITIALIZATION
// ==========================================

const server = app.listen(PORT, () => {
  console.log(`🚀 Cadence Enterprise API running on port ${PORT}`);
  console.log(`📊 Environment: ${NODE_ENV}`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/health`);
  console.log(`📈 Metrics: http://localhost:${PORT}/metrics`);
  console.log(`📚 API Docs: http://localhost:${PORT}/api/docs`);
});

// Socket.IO integration
socketServer.attach(server);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    redisClient.quit().then(() => process.exit(0));
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    redisClient.quit().then(() => process.exit(0));
  });
});

export { app, server, redisClient };
