import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import compression from 'compression';
import { config } from '@/config';
import { logger } from '@/utils/logger';

/**
 * Security Headers Middleware
 * Configures security headers optimized for mobile apps
 */
export const securityHeaders = helmet({
  crossOriginEmbedderPolicy: false, // Disable for mobile compatibility
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:"],
      fontSrc: ["'self'", "https:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "https:"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

/**
 * Rate Limiting Middleware
 * Mobile-optimized rate limiting with different tiers
 */
export const createRateLimiter = (
  windowMs: number = config.rateLimit.windowMs,
  max: number = config.rateLimit.maxRequests,
  message: string = 'Too many requests'
) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: message,
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(windowMs / 1000),
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Mobile-friendly rate limiting
    keyGenerator: (req: Request) => {
      // Use user ID if authenticated, otherwise IP
      return req.user?.id || req.ip;
    },
    skip: (req: Request) => {
      // Skip rate limiting for health checks
      return req.path === '/health' || req.path === '/api/health';
    },
    handler: (req: Request, res: Response) => {
      logger.warn('Rate limit exceeded:', {
        ip: req.ip,
        userId: req.user?.id,
        path: req.path,
        userAgent: req.get('User-Agent'),
      });
      
      res.status(429).json({
        success: false,
        error: message,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(windowMs / 1000),
      });
    },
  });
};

// Pre-configured rate limiters for different endpoints
export const rateLimiters = {
  // General API rate limiting
  general: createRateLimiter(15 * 60 * 1000, 100, 'Too many requests'), // 100 requests per 15 minutes
  
  // Strict rate limiting for auth endpoints
  auth: createRateLimiter(15 * 60 * 1000, 10, 'Too many authentication attempts'), // 10 attempts per 15 minutes
  
  // Content creation rate limiting
  contentCreation: createRateLimiter(60 * 60 * 1000, 20, 'Too many content creation requests'), // 20 per hour
  
  // Media upload rate limiting
  upload: createRateLimiter(60 * 60 * 1000, 10, 'Too many upload requests'), // 10 uploads per hour
  
  // More lenient for feed/content consumption
  feed: createRateLimiter(60 * 1000, 60, 'Too many feed requests'), // 60 requests per minute
};

/**
 * Compression Middleware
 * Optimized for mobile data usage
 */
export const compressionMiddleware = compression({
  // Only compress responses that are larger than this
  threshold: 1024,
  // Compression level (1-9, higher = better compression but slower)
  level: 6,
  // Filter which responses to compress
  filter: (req: Request, res: Response) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
});

/**
 * Request Size Limiting
 * Prevents large payloads that could impact mobile performance
 */
export const requestSizeLimiter = (limit: string = '10mb') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = req.get('content-length');
    
    if (contentLength) {
      const sizeInMB = parseInt(contentLength) / (1024 * 1024);
      const limitInMB = parseFloat(limit.replace('mb', ''));
      
      if (sizeInMB > limitInMB) {
        logger.warn('Request too large:', {
          size: `${sizeInMB.toFixed(2)}MB`,
          limit: limit,
          path: req.path,
          userId: req.user?.id,
        });
        
        return res.status(413).json({
          success: false,
          error: `Request too large. Maximum size is ${limit}`,
          code: 'REQUEST_TOO_LARGE',
        });
      }
    }
    
    next();
  };
};

/**
 * Security Validation Middleware
 * Additional security checks for mobile apps
 */
export const securityValidation = (req: Request, res: Response, next: NextFunction) => {
  // Block requests with suspicious patterns
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /vbscript:/i,
    /onload/i,
    /onerror/i,
  ];
  
  const checkString = JSON.stringify(req.body) + req.url + JSON.stringify(req.query);
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(checkString)) {
      logger.warn('Suspicious request blocked:', {
        ip: req.ip,
        path: req.path,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id,
      });
      
      return res.status(400).json({
        success: false,
        error: 'Invalid request content',
        code: 'INVALID_CONTENT',
      });
    }
  }
  
  next();
};

/**
 * Mobile-Specific Security Headers
 * Additional headers for mobile app security
 */
export const mobileSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Prevent caching of sensitive data on mobile
  if (req.path.includes('auth') || req.path.includes('user')) {
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0',
    });
  }
  
  // Add mobile-specific security headers
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  });
  
  next();
};

/**
 * CORS Configuration for Mobile Apps
 */
export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    // Allow all origins in development
    if (config.isDevelopment) {
      return callback(null, true);
    }
    
    // In production, check against allowed origins
    const allowedOrigins = Array.isArray(config.cors.origins) 
      ? config.cors.origins 
      : [config.cors.origins];
    
    if (allowedOrigins.includes(origin) || config.cors.origins === true) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked:', { origin });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-Device-Type',
    'X-App-Version',
    'X-Platform',
  ],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400, // 24 hours
};

export default {
  securityHeaders,
  rateLimiters,
  compressionMiddleware,
  requestSizeLimiter,
  securityValidation,
  mobileSecurityHeaders,
  corsOptions,
};