import { Request, Response, NextFunction } from 'express';
import { AuthService } from '@/utils/auth';
import { logger, mobileLogger } from '@/utils/logger';
import { db } from '@/config/database';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        username: string;
        isVerified: boolean;
        isActive: boolean;
      };
    }
  }
}

/**
 * JWT Authentication Middleware
 * Validates JWT tokens and attaches user data to request
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = AuthService.extractBearerToken(authHeader);

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Access token required',
        code: 'TOKEN_MISSING',
      });
      return;
    }

    // Check if token is blacklisted
    const isBlacklisted = await AuthService.isTokenBlacklisted(token);
    if (isBlacklisted) {
      res.status(401).json({
        success: false,
        error: 'Token has been revoked',
        code: 'TOKEN_REVOKED',
      });
      return;
    }

    // Verify JWT token
    const decoded = AuthService.verifyAccessToken(token);
    if (!decoded) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
        code: 'TOKEN_INVALID',
      });
      return;
    }

    // Fetch user from database
    const user = await db.prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        username: true,
        isVerified: true,
        isActive: true,
        lastActive: true,
      },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({
        success: false,
        error: 'Account has been deactivated',
        code: 'ACCOUNT_DEACTIVATED',
      });
      return;
    }

    // Update last active time (async, don't wait)
    db.prisma.user.update({
      where: { id: user.id },
      data: { lastActive: new Date() },
    }).catch(error => {
      logger.error('Failed to update user last active time:', error);
    });

    // Attach user to request
    req.user = user;
    
    // Log authentication for mobile analytics
    mobileLogger.logUserSession(user.id, 'authenticated', {
      endpoint: req.path,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
    });

    next();
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication service error',
      code: 'AUTH_SERVICE_ERROR',
    });
  }
};

/**
 * Optional Authentication Middleware
 * Authenticates if token is provided, but doesn't require it
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = AuthService.extractBearerToken(authHeader);

    if (!token) {
      // No token provided, continue without authentication
      next();
      return;
    }

    // If token is provided, validate it
    const decoded = AuthService.verifyAccessToken(token);
    if (decoded) {
      const user = await db.prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          username: true,
          isVerified: true,
          isActive: true,
        },
      });

      if (user && user.isActive) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    logger.error('Optional auth middleware error:', error);
    // Continue without authentication on error
    next();
  }
};

/**
 * Admin Only Middleware
 * Requires user to be authenticated and have admin privileges
 */
export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED',
    });
    return;
  }

  try {
    // Check if user has admin role (you might want to add a role field to User model)
    const userWithRole = await db.prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        // role: true, // Add this field if you implement roles
      },
    });

    // For now, check if user email ends with your domain (adjust as needed)
    const isAdmin = userWithRole?.email.endsWith('@culturaflow.com') || 
                   userWithRole?.email.endsWith('@admin.com');

    if (!isAdmin) {
      res.status(403).json({
        success: false,
        error: 'Admin privileges required',
        code: 'ADMIN_REQUIRED',
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Admin check error:', error);
    res.status(500).json({
      success: false,
      error: 'Authorization service error',
      code: 'AUTH_SERVICE_ERROR',
    });
  }
};

/**
 * Verified User Only Middleware
 * Requires user to be authenticated and email verified
 */
export const requireVerified = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED',
    });
    return;
  }

  if (!req.user.isVerified) {
    res.status(403).json({
      success: false,
      error: 'Email verification required',
      code: 'VERIFICATION_REQUIRED',
    });
    return;
  }

  next();
};

/**
 * Rate Limiting by User ID
 * Provides user-specific rate limiting for mobile apps
 */
export const userRateLimit = (maxRequests: number, windowMs: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      next();
      return;
    }

    try {
      const key = `rate_limit:user:${req.user.id}`;
      const current = await db.prisma.$queryRaw<[{count: bigint}]>`
        SELECT COUNT(*) as count FROM user_analytics 
        WHERE "userId" = ${req.user.id} 
        AND "date" > ${new Date(Date.now() - windowMs)}
      `;

      const requestCount = Number(current[0].count);

      if (requestCount >= maxRequests) {
        res.status(429).json({
          success: false,
          error: 'Too many requests',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil(windowMs / 1000),
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('User rate limiting error:', error);
      // Continue on error to avoid blocking users
      next();
    }
  };
};

export default {
  authenticate,
  optionalAuth,
  requireAdmin,
  requireVerified,
  userRateLimit,
};