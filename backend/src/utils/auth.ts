import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '@/config';
import { logger, mobileLogger } from '@/utils/logger';
import { redis } from '@/config/redis';

export interface JWTPayload {
  userId: string;
  email: string;
  username: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  userId: string;
  sessionId: string;
  iat?: number;
  exp?: number;
}

export class AuthService {
  private static readonly SALT_ROUNDS = 12;
  private static readonly TOKEN_TYPE = 'Bearer';
  
  // Password utilities
  static async hashPassword(password: string): Promise<string> {
    try {
      const salt = await bcrypt.genSalt(this.SALT_ROUNDS);
      return await bcrypt.hash(password, salt);
    } catch (error) {
      logger.error('Password hashing failed:', error);
      throw new Error('Password processing failed');
    }
  }

  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
      logger.error('Password verification failed:', error);
      return false;
    }
  }

  // JWT Token utilities
  static generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    try {
      return jwt.sign(payload, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn,
        issuer: 'culturaflow-api',
        audience: 'culturaflow-mobile',
      });
    } catch (error) {
      logger.error('Access token generation failed:', error);
      throw new Error('Token generation failed');
    }
  }

  static generateRefreshToken(payload: Omit<RefreshTokenPayload, 'iat' | 'exp'>): string {
    try {
      return jwt.sign(payload, config.jwt.refreshSecret, {
        expiresIn: config.jwt.refreshExpiresIn,
        issuer: 'culturaflow-api',
        audience: 'culturaflow-mobile',
      });
    } catch (error) {
      logger.error('Refresh token generation failed:', error);
      throw new Error('Token generation failed');
    }
  }

  static verifyAccessToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, config.jwt.secret, {
        issuer: 'culturaflow-api',
        audience: 'culturaflow-mobile',
      }) as JWTPayload;
      
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.debug('Access token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        logger.warn('Invalid access token:', { error: error.message });
      } else {
        logger.error('Access token verification failed:', error);
      }
      return null;
    }
  }

  static verifyRefreshToken(token: string): RefreshTokenPayload | null {
    try {
      const decoded = jwt.verify(token, config.jwt.refreshSecret, {
        issuer: 'culturaflow-api',
        audience: 'culturaflow-mobile',
      }) as RefreshTokenPayload;
      
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.debug('Refresh token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        logger.warn('Invalid refresh token:', { error: error.message });
      } else {
        logger.error('Refresh token verification failed:', error);
      }
      return null;
    }
  }

  // Mobile-optimized session management
  static async createUserSession(
    userId: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<{ accessToken: string; refreshToken: string; sessionId: string }> {
    try {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      
      // Create tokens
      const accessToken = this.generateAccessToken({
        userId,
        email: '', // Will be filled by the calling code
        username: '', // Will be filled by the calling code
      });
      
      const refreshToken = this.generateRefreshToken({
        userId,
        sessionId,
      });

      // Cache session data in Redis for quick mobile access
      const sessionData = {
        sessionId,
        userId,
        userAgent,
        ipAddress,
        createdAt: new Date(),
        lastUsed: new Date(),
        isActive: true,
      };

      await redis.setUserSession(userId, sessionData, 7 * 24 * 60 * 60); // 7 days

      mobileLogger.logUserSession(userId, 'session_created', { sessionId, userAgent });

      return { accessToken, refreshToken, sessionId };
    } catch (error) {
      logger.error('Session creation failed:', error);
      throw new Error('Session creation failed');
    }
  }

  static async refreshUserSession(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  } | null> {
    try {
      const decoded = this.verifyRefreshToken(refreshToken);
      if (!decoded) {
        return null;
      }

      // Check if session exists in Redis
      const sessionData = await redis.getUserSession(decoded.userId);
      if (!sessionData || !sessionData.isActive) {
        logger.warn('Invalid session for token refresh:', { userId: decoded.userId });
        return null;
      }

      // Generate new tokens
      const newAccessToken = this.generateAccessToken({
        userId: decoded.userId,
        email: '', // Will be filled by the calling code
        username: '', // Will be filled by the calling code
      });

      const newRefreshToken = this.generateRefreshToken({
        userId: decoded.userId,
        sessionId: decoded.sessionId,
      });

      // Update session last used time
      sessionData.lastUsed = new Date();
      await redis.setUserSession(decoded.userId, sessionData, 7 * 24 * 60 * 60);

      mobileLogger.logUserSession(decoded.userId, 'token_refreshed', { sessionId: decoded.sessionId });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      logger.error('Token refresh failed:', error);
      return null;
    }
  }

  static async invalidateUserSession(userId: string, sessionId?: string): Promise<void> {
    try {
      if (sessionId) {
        // Invalidate specific session
        const sessionData = await redis.getUserSession(userId);
        if (sessionData && sessionData.sessionId === sessionId) {
          sessionData.isActive = false;
          await redis.setUserSession(userId, sessionData, 60); // Keep for 1 minute for logging
        }
      } else {
        // Invalidate all sessions for user
        await redis.deleteUserSession(userId);
      }

      mobileLogger.logUserSession(userId, 'session_invalidated', { sessionId });
    } catch (error) {
      logger.error('Session invalidation failed:', error);
      throw new Error('Session invalidation failed');
    }
  }

  // Security utilities for mobile apps
  static extractBearerToken(authHeader?: string): string | null {
    if (!authHeader || !authHeader.startsWith(`${this.TOKEN_TYPE} `)) {
      return null;
    }
    return authHeader.substring(this.TOKEN_TYPE.length + 1);
  }

  static async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const blacklisted = await redis.client.get(`blacklist:${token}`);
      return blacklisted === 'true';
    } catch (error) {
      logger.error('Token blacklist check failed:', error);
      return false;
    }
  }

  static async blacklistToken(token: string, ttl: number = 86400): Promise<void> {
    try {
      await redis.client.setex(`blacklist:${token}`, ttl, 'true');
    } catch (error) {
      logger.error('Token blacklisting failed:', error);
    }
  }

  // Password strength validation for mobile security
  static validatePasswordStrength(password: string): {
    isValid: boolean;
    score: number;
    feedback: string[];
  } {
    const feedback: string[] = [];
    let score = 0;

    // Length check
    if (password.length < 8) {
      feedback.push('Password must be at least 8 characters long');
    } else if (password.length >= 12) {
      score += 2;
    } else {
      score += 1;
    }

    // Character variety
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1;

    // Common patterns (weak passwords)
    const commonPatterns = [
      /123456/,
      /password/i,
      /qwerty/i,
      /(.)\1{2,}/, // Repeated characters
    ];

    for (const pattern of commonPatterns) {
      if (pattern.test(password)) {
        score -= 1;
        feedback.push('Avoid common patterns and repeated characters');
        break;
      }
    }

    // Final validation
    const isValid = score >= 4 && password.length >= 8;
    
    if (!isValid) {
      if (!feedback.length) {
        feedback.push('Password needs uppercase, lowercase, number, and special character');
      }
    }

    return { isValid, score: Math.max(0, Math.min(5, score)), feedback };
  }
}

export default AuthService;