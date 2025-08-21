import { Request, Response } from 'express';
import { AuthService } from '@/utils/auth';
import { db } from '@/config/database';
import { logger, mobileLogger } from '@/utils/logger';
import { redis } from '@/config/redis';

export class AuthController {
  /**
   * User Registration
   * POST /api/v1/auth/register
   */
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const {
        email,
        username,
        password,
        firstName,
        lastName,
        dateOfBirth,
        country,
        language = 'en'
      } = req.body;

      // Check if user already exists
      const existingUser = await db.prisma.user.findFirst({
        where: {
          OR: [
            { email },
            { username }
          ]
        }
      });

      if (existingUser) {
        const field = existingUser.email === email ? 'email' : 'username';
        res.status(409).json({
          success: false,
          error: `User with this ${field} already exists`,
          code: 'USER_EXISTS',
          field,
        });
        return;
      }

      // Validate password strength
      const passwordValidation = AuthService.validatePasswordStrength(password);
      if (!passwordValidation.isValid) {
        res.status(400).json({
          success: false,
          error: 'Password does not meet security requirements',
          code: 'WEAK_PASSWORD',
          details: passwordValidation.feedback,
          passwordScore: passwordValidation.score,
        });
        return;
      }

      // Hash password
      const hashedPassword = await AuthService.hashPassword(password);

      // Create user and profile in transaction
      const user = await db.prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email,
            username,
            password: hashedPassword,
            firstName,
            lastName,
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
            country,
            language,
          },
        });

        // Create default profile
        await tx.userProfile.create({
          data: {
            userId: newUser.id,
            interests: [],
            learningGoals: [],
            preferredCategories: [],
            difficultyLevel: 1,
            dailyGoalMinutes: 15,
          },
        });

        // Initialize streak
        await tx.userStreak.create({
          data: {
            userId: newUser.id,
            category: 'daily',
            currentStreak: 0,
            longestStreak: 0,
          },
        });

        return newUser;
      });

      // Create session
      const { accessToken, refreshToken, sessionId } = await AuthService.createUserSession(
        user.id,
        req.get('User-Agent'),
        req.ip
      );

      // Update tokens with user data
      const accessTokenWithData = AuthService.generateAccessToken({
        userId: user.id,
        email: user.email,
        username: user.username,
      });

      // Store refresh token in database
      await db.prisma.userSession.create({
        data: {
          userId: user.id,
          refreshToken,
          userAgent: req.get('User-Agent') || null,
          ipAddress: req.ip,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });

      mobileLogger.logUserSession(user.id, 'user_registered', {
        email: user.email,
        username: user.username,
      });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            language: user.language,
            isVerified: user.isVerified,
            createdAt: user.createdAt,
          },
          tokens: {
            accessToken: accessTokenWithData,
            refreshToken,
            tokenType: 'Bearer',
            expiresIn: '15m',
          },
        },
      });
    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({
        success: false,
        error: 'Registration failed',
        code: 'REGISTRATION_ERROR',
      });
    }
  }

  /**
   * User Login
   * POST /api/v1/auth/login
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, deviceInfo } = req.body;

      // Find user by email
      const user = await db.prisma.user.findUnique({
        where: { email },
        include: {
          profile: true,
        },
      });

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS',
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

      // Verify password
      const isPasswordValid = await AuthService.verifyPassword(password, user.password);
      if (!isPasswordValid) {
        mobileLogger.logUserSession(user.id, 'login_failed', {
          reason: 'invalid_password',
          ip: req.ip,
        });
        
        res.status(401).json({
          success: false,
          error: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS',
        });
        return;
      }

      // Create session
      const { accessToken, refreshToken, sessionId } = await AuthService.createUserSession(
        user.id,
        req.get('User-Agent'),
        req.ip
      );

      // Generate proper access token
      const accessTokenWithData = AuthService.generateAccessToken({
        userId: user.id,
        email: user.email,
        username: user.username,
      });

      // Store refresh token
      await db.prisma.userSession.create({
        data: {
          userId: user.id,
          refreshToken,
          userAgent: req.get('User-Agent') || null,
          ipAddress: req.ip,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      // Update last active
      await db.prisma.user.update({
        where: { id: user.id },
        data: { lastActive: new Date() },
      });

      mobileLogger.logUserSession(user.id, 'login_success', {
        sessionId,
        deviceInfo,
      });

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
            language: user.language,
            isVerified: user.isVerified,
            profile: user.profile,
            lastActive: user.lastActive,
          },
          tokens: {
            accessToken: accessTokenWithData,
            refreshToken,
            tokenType: 'Bearer',
            expiresIn: '15m',
          },
        },
      });
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Login failed',
        code: 'LOGIN_ERROR',
      });
    }
  }

  /**
   * Refresh Token
   * POST /api/v1/auth/refresh
   */
  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          error: 'Refresh token required',
          code: 'REFRESH_TOKEN_MISSING',
        });
        return;
      }

      // Verify refresh token
      const decoded = AuthService.verifyRefreshToken(refreshToken);
      if (!decoded) {
        res.status(401).json({
          success: false,
          error: 'Invalid or expired refresh token',
          code: 'INVALID_REFRESH_TOKEN',
        });
        return;
      }

      // Check if refresh token exists in database
      const session = await db.prisma.userSession.findFirst({
        where: {
          refreshToken,
          userId: decoded.userId,
          isActive: true,
          expiresAt: {
            gt: new Date(),
          },
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
              isActive: true,
            },
          },
        },
      });

      if (!session || !session.user.isActive) {
        res.status(401).json({
          success: false,
          error: 'Invalid refresh token session',
          code: 'INVALID_SESSION',
        });
        return;
      }

      // Generate new tokens
      const newAccessToken = AuthService.generateAccessToken({
        userId: session.user.id,
        email: session.user.email,
        username: session.user.username,
      });

      const newRefreshToken = AuthService.generateRefreshToken({
        userId: session.user.id,
        sessionId: decoded.sessionId,
      });

      // Update session with new refresh token
      await db.prisma.userSession.update({
        where: { id: session.id },
        data: { refreshToken: newRefreshToken },
      });

      mobileLogger.logUserSession(session.user.id, 'token_refreshed', {
        sessionId: decoded.sessionId,
      });

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          tokens: {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            tokenType: 'Bearer',
            expiresIn: '15m',
          },
        },
      });
    } catch (error) {
      logger.error('Token refresh error:', error);
      res.status(500).json({
        success: false,
        error: 'Token refresh failed',
        code: 'REFRESH_ERROR',
      });
    }
  }

  /**
   * Logout
   * POST /api/v1/auth/logout
   */
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const authHeader = req.headers.authorization;
      const accessToken = AuthService.extractBearerToken(authHeader);

      if (refreshToken) {
        // Invalidate refresh token session
        await db.prisma.userSession.updateMany({
          where: { refreshToken },
          data: { isActive: false },
        });
      }

      if (accessToken && req.user) {
        // Blacklist access token
        await AuthService.blacklistToken(accessToken, 15 * 60); // 15 minutes
        await AuthService.invalidateUserSession(req.user.id);
      }

      const userId = req.user?.id || 'unknown';
      mobileLogger.logUserSession(userId, 'logout', {
        hasRefreshToken: !!refreshToken,
        hasAccessToken: !!accessToken,
      });

      res.json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({
        success: false,
        error: 'Logout failed',
        code: 'LOGOUT_ERROR',
      });
    }
  }

  /**
   * Logout from all devices
   * POST /api/v1/auth/logout-all
   */
  static async logoutAll(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      // Invalidate all user sessions
      await db.prisma.userSession.updateMany({
        where: { userId: req.user.id },
        data: { isActive: false },
      });

      // Clear Redis sessions
      await AuthService.invalidateUserSession(req.user.id);

      mobileLogger.logUserSession(req.user.id, 'logout_all_devices', {});

      res.json({
        success: true,
        message: 'Logged out from all devices',
      });
    } catch (error) {
      logger.error('Logout all error:', error);
      res.status(500).json({
        success: false,
        error: 'Logout all failed',
        code: 'LOGOUT_ALL_ERROR',
      });
    }
  }

  /**
   * Get current user profile
   * GET /api/v1/auth/me
   */
  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      const user = await db.prisma.user.findUnique({
        where: { id: req.user.id },
        include: {
          profile: true,
          streaks: true,
          _count: {
            select: {
              achievements: true,
              progress: {
                where: { status: 'COMPLETED' }
              },
            },
          },
        },
      });

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        });
        return;
      }

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
            dateOfBirth: user.dateOfBirth,
            country: user.country,
            language: user.language,
            timeZone: user.timeZone,
            isVerified: user.isVerified,
            lastActive: user.lastActive,
            createdAt: user.createdAt,
            profile: user.profile,
            streaks: user.streaks,
            stats: {
              achievementsCount: user._count.achievements,
              completedContent: user._count.progress,
            },
          },
        },
      });
    } catch (error) {
      logger.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch profile',
        code: 'PROFILE_FETCH_ERROR',
      });
    }
  }
}

export default AuthController;