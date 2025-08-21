import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import { performance } from 'perf_hooks';
import { config } from '../config';

// Initialize Sentry for Node.js
export const initializeMonitoring = () => {
  if (config.SENTRY_DSN) {
    Sentry.init({
      dsn: config.SENTRY_DSN,
      environment: config.NODE_ENV,
      tracesSampleRate: config.NODE_ENV === 'production' ? 0.1 : 1.0,
      profilesSampleRate: config.NODE_ENV === 'production' ? 0.1 : 1.0,
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
        new Sentry.Integrations.Express({ app: undefined }),
        new Sentry.Integrations.Prisma({ client: undefined }),
        new ProfilingIntegration(),
      ],
      beforeSend: (event, hint) => {
        // Filter out health check requests
        if (event.request?.url?.includes('/health')) {
          return null;
        }

        // Filter sensitive data
        if (event.request?.data) {
          delete event.request.data.password;
          delete event.request.data.token;
          delete event.request.data.refreshToken;
        }

        return event;
      },
    });
  }
};

// Request ID middleware
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  req.requestId = requestId as string;
  res.setHeader('X-Request-ID', requestId);
  
  // Set Sentry context
  Sentry.configureScope((scope) => {
    scope.setTag('request_id', requestId as string);
  });
  
  next();
};

// Request logging middleware
export const requestLoggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = performance.now();
  const { method, url, ip } = req;
  const userAgent = req.get('User-Agent') || 'unknown';
  
  console.log(`➡️  ${method} ${url} - ${ip} - ${userAgent}`);
  
  // Track request start
  Sentry.addBreadcrumb({
    message: `${method} ${url}`,
    category: 'http.request',
    level: 'info',
    data: {
      method,
      url,
      ip,
      user_agent: userAgent,
    },
  });

  // Override res.end to capture response metrics
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = performance.now() - startTime;
    const { statusCode } = res;
    
    console.log(`⬅️  ${method} ${url} - ${statusCode} - ${duration.toFixed(2)}ms`);
    
    // Track response metrics
    Sentry.addBreadcrumb({
      message: `${method} ${url} - ${statusCode}`,
      category: 'http.response',
      level: statusCode >= 400 ? 'error' : 'info',
      data: {
        status_code: statusCode,
        duration_ms: duration,
      },
    });

    // Track performance metrics
    if (config.SENTRY_DSN) {
      Sentry.setMeasurement('response_time', duration, 'millisecond');
      Sentry.setTag('http.status_code', statusCode.toString());
    }

    return originalEnd.call(this, chunk, encoding);
  };

  next();
};

// Performance monitoring middleware
export const performanceMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = process.hrtime.bigint();
  const startMemory = process.memoryUsage();
  
  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const endMemory = process.memoryUsage();
    
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    const memoryDelta = {
      rss: endMemory.rss - startMemory.rss,
      heapUsed: endMemory.heapUsed - startMemory.heapUsed,
      heapTotal: endMemory.heapTotal - startMemory.heapTotal,
      external: endMemory.external - startMemory.external,
    };
    
    // Log slow requests
    if (duration > 1000) { // > 1 second
      console.warn(`🐌 Slow request: ${req.method} ${req.url} - ${duration.toFixed(2)}ms`);
      
      if (config.SENTRY_DSN) {
        Sentry.withScope((scope) => {
          scope.setContext('performance', {
            duration_ms: duration,
            memory_delta: memoryDelta,
            slow_request: true,
          });
          scope.setLevel('warning');
          Sentry.captureMessage(`Slow request: ${req.method} ${req.url}`, 'warning');
        });
      }
    }
    
    // Track memory usage spikes
    if (memoryDelta.heapUsed > 50 * 1024 * 1024) { // > 50MB
      console.warn(`🧠 High memory usage: ${req.method} ${req.url} - ${(memoryDelta.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    }
  });
  
  next();
};

// Database query monitoring
export const createDatabaseMonitor = () => {
  let queryCount = 0;
  let totalQueryTime = 0;
  
  return {
    onQuery: (query: string, duration: number) => {
      queryCount++;
      totalQueryTime += duration;
      
      // Log slow queries
      if (duration > 100) { // > 100ms
        console.warn(`🗄️  Slow query (${duration.toFixed(2)}ms): ${query}`);
        
        if (config.SENTRY_DSN) {
          Sentry.withScope((scope) => {
            scope.setContext('database', {
              query: query.substring(0, 500), // Truncate long queries
              duration_ms: duration,
              slow_query: true,
            });
            scope.setLevel('warning');
            Sentry.captureMessage('Slow database query', 'warning');
          });
        }
      }
    },
    
    getStats: () => ({
      queryCount,
      averageQueryTime: queryCount > 0 ? totalQueryTime / queryCount : 0,
      totalQueryTime,
    }),
    
    reset: () => {
      queryCount = 0;
      totalQueryTime = 0;
    },
  };
};

// Error handling middleware
export const errorHandlingMiddleware = (err: any, req: Request, res: Response, next: NextFunction) => {
  const { method, url, ip } = req;
  const userAgent = req.get('User-Agent') || 'unknown';
  
  console.error(`❌ Error in ${method} ${url}:`, err);
  
  // Capture error in Sentry
  if (config.SENTRY_DSN) {
    Sentry.withScope((scope) => {
      scope.setContext('request', {
        method,
        url,
        ip,
        user_agent: userAgent,
        headers: req.headers,
        body: req.body,
      });
      scope.setLevel('error');
      Sentry.captureException(err);
    });
  }
  
  // Don't expose internal error details in production
  const isDevelopment = config.NODE_ENV === 'development';
  const errorResponse = {
    error: 'Internal Server Error',
    message: isDevelopment ? err.message : 'An unexpected error occurred',
    requestId: req.requestId,
    timestamp: new Date().toISOString(),
    ...(isDevelopment && { stack: err.stack }),
  };
  
  res.status(err.status || 500).json(errorResponse);
};

// Health check endpoint with monitoring
export const healthCheck = (req: Request, res: Response) => {
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();
  const cpuUsage = process.cpuUsage();
  
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: uptime,
    memory: {
      rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      external: `${(memoryUsage.external / 1024 / 1024).toFixed(2)} MB`,
    },
    cpu: {
      user: cpuUsage.user,
      system: cpuUsage.system,
    },
    version: process.env.npm_package_version || '1.0.0',
    environment: config.NODE_ENV,
  };
  
  res.status(200).json(health);
};

// Rate limiting monitoring
export const rateLimitingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const originalSend = res.send;
  
  res.send = function(body) {
    if (res.statusCode === 429) {
      console.warn(`🚫 Rate limit exceeded: ${req.method} ${req.url} - ${req.ip}`);
      
      if (config.SENTRY_DSN) {
        Sentry.withScope((scope) => {
          scope.setContext('rate_limit', {
            method: req.method,
            url: req.url,
            ip: req.ip,
            user_agent: req.get('User-Agent'),
          });
          scope.setLevel('warning');
          Sentry.captureMessage('Rate limit exceeded', 'warning');
        });
      }
    }
    
    return originalSend.call(this, body);
  };
  
  next();
};

// Custom metric tracking
export const trackMetric = (name: string, value: number, tags?: Record<string, string>) => {
  console.log(`📊 Metric: ${name} = ${value}`, tags);
  
  if (config.SENTRY_DSN) {
    Sentry.setMeasurement(name, value);
    if (tags) {
      Object.entries(tags).forEach(([key, val]) => {
        Sentry.setTag(key, val);
      });
    }
  }
};

// User activity tracking
export const trackUserActivity = (userId: string, action: string, metadata?: Record<string, any>) => {
  console.log(`👤 User Activity: ${userId} - ${action}`, metadata);
  
  if (config.SENTRY_DSN) {
    Sentry.addBreadcrumb({
      message: `User ${userId} performed ${action}`,
      category: 'user.activity',
      level: 'info',
      data: metadata,
    });
  }
};

export default {
  initializeMonitoring,
  requestIdMiddleware,
  requestLoggingMiddleware,
  performanceMiddleware,
  createDatabaseMonitor,
  errorHandlingMiddleware,
  healthCheck,
  rateLimitingMiddleware,
  trackMetric,
  trackUserActivity,
};