import express from 'express';
import cors from 'cors';
import 'express-async-errors';
import { config } from '@/config';
import { db } from '@/config/database';
import { redis } from '@/config/redis';
import { logger } from '@/utils/logger';
import { 
  securityHeaders, 
  compressionMiddleware, 
  requestSizeLimiter,
  securityValidation,
  mobileSecurityHeaders,
  corsOptions 
} from '@/middleware/security';

// Import routes
import authRoutes from '@/routes/authRoutes';
import userRoutes from '@/routes/userRoutes';
import contentRoutes from '@/routes/contentRoutes';
import interactionRoutes from '@/routes/interactionRoutes';
import recommendationRoutes from '@/routes/recommendationRoutes';

const app = express();

// Trust proxy for accurate client IPs (required for rate limiting)
app.set('trust proxy', 1);

// Global middleware
app.use(securityHeaders);
app.use(compressionMiddleware);
app.use(cors(corsOptions));
app.use(mobileSecurityHeaders);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestSizeLimiter());
app.use(securityValidation);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const [dbHealthy, redisHealthy] = await Promise.all([
      db.healthCheck(),
      redis.healthCheck(),
    ]);

    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.env,
      services: {
        database: dbHealthy ? 'healthy' : 'unhealthy',
        redis: redisHealthy ? 'healthy' : 'unhealthy',
      },
      version: process.env.npm_package_version || '1.0.0',
    };

    const overallHealthy = dbHealthy && redisHealthy;
    res.status(overallHealthy ? 200 : 503).json(health);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'error',
      message: 'Health check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

// API routes
const apiRouter = express.Router();

// Mount API routes
apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/content', contentRoutes);
apiRouter.use('/interactions', interactionRoutes);
apiRouter.use('/recommendations', recommendationRoutes);

// Mount API router with version prefix
app.use(`/api/${config.apiVersion}`, apiRouter);

// Global error handler
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    ip: req.ip,
  });

  // Don't leak error details in production
  const isDevelopment = config.isDevelopment;
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    ...(isDevelopment && {
      details: error.message,
      stack: error.stack,
    }),
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
    path: req.originalUrl,
  });
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}, starting graceful shutdown...`);
  
  try {
    // Close server
    server.close(() => {
      logger.info('HTTP server closed');
    });

    // Close database connections
    await db.disconnect();
    await redis.disconnect();

    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', { reason, promise });
  process.exit(1);
});

// Start server
const startServer = async () => {
  try {
    // Connect to databases
    await db.connect();
    await redis.connect();

    // Start HTTP server
    const server = app.listen(config.port, () => {
      logger.info(`CulturaFlow Backend started successfully`, {
        port: config.port,
        environment: config.env,
        nodeVersion: process.version,
        pid: process.pid,
        apiVersion: config.apiVersion,
      });

      // Log available endpoints
      logger.info('Available API endpoints:', {
        health: '/health',
        auth: `/api/${config.apiVersion}/auth/*`,
        users: `/api/${config.apiVersion}/users/*`,
        content: `/api/${config.apiVersion}/content/*`,
        interactions: `/api/${config.apiVersion}/interactions/*`,
        recommendations: `/api/${config.apiVersion}/recommendations/*`,
      });
    });

    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Store server instance for graceful shutdown
let server: any;

// Start the server if this file is run directly
if (require.main === module) {
  startServer().then((serverInstance) => {
    server = serverInstance;
  });
}

export default app;