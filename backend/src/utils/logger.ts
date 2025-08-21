import winston from 'winston';
import { config } from '@/config';

// Custom format for better mobile-optimized logging
const customFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
  })
);

// Create logger instance
export const logger = winston.createLogger({
  level: config.logging.level,
  format: customFormat,
  defaultMeta: {
    service: 'culturaflow-backend',
    version: process.env.npm_package_version || '1.0.0',
  },
  transports: [
    // Console output
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        customFormat
      ),
    }),
    
    // Error logs file
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
    
    // Combined logs file
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
    }),
  ],
  
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' }),
  ],
  
  // Handle promise rejections
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' }),
  ],
});

// Performance logging utilities for mobile optimization
export const performanceLogger = {
  logAPICall: (method: string, path: string, duration: number, statusCode: number) => {
    const level = statusCode >= 400 ? 'error' : statusCode >= 300 ? 'warn' : 'info';
    logger[level]('API Call', {
      method,
      path,
      duration: `${duration}ms`,
      statusCode,
      performance: duration > 1000 ? 'slow' : duration > 500 ? 'moderate' : 'fast',
    });
  },
  
  logDBQuery: (query: string, duration: number, rowCount?: number) => {
    const level = duration > 100 ? 'warn' : 'debug';
    logger[level]('Database Query', {
      query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
      duration: `${duration}ms`,
      rowCount,
      performance: duration > 500 ? 'slow' : duration > 100 ? 'moderate' : 'fast',
    });
  },
  
  logCacheOperation: (operation: string, key: string, hit: boolean, duration?: number) => {
    logger.debug('Cache Operation', {
      operation,
      key,
      hit,
      duration: duration ? `${duration}ms` : undefined,
    });
  },
};

// Mobile-specific logging utilities
export const mobileLogger = {
  logUserSession: (userId: string, action: string, metadata?: any) => {
    logger.info('User Session', {
      userId,
      action,
      ...metadata,
    });
  },
  
  logContentInteraction: (userId: string, contentId: string, interaction: string) => {
    logger.info('Content Interaction', {
      userId,
      contentId,
      interaction,
    });
  },
  
  logAchievement: (userId: string, achievementId: string, points: number) => {
    logger.info('Achievement Unlocked', {
      userId,
      achievementId,
      points,
    });
  },
  
  logError: (error: Error, context?: any) => {
    logger.error('Application Error', {
      error: error.message,
      stack: error.stack,
      context,
    });
  },
};

export default logger;