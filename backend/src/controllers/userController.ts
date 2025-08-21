import { Request, Response } from 'express';
import { db } from '@/config/database';
import { redis } from '@/config/redis';
import { logger, mobileLogger } from '@/utils/logger';
import { AuthService } from '@/utils/auth';
import sharp from 'sharp';
import { config } from '@/config';

export class UserController {
  /**
   * Update user profile
   * PUT /api/v1/users/profile
   */
  static async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      const {
        firstName,
        lastName,
        bio,
        interests,
        preferredCategories,
        difficultyLevel,
        dailyGoalMinutes,
        notificationsEnabled,
        publicProfile,
        language,
      } = req.body;

      // Update user and profile in transaction
      const updatedUser = await db.prisma.$transaction(async (tx) => {
        // Update user basic info
        const user = await tx.user.update({
          where: { id: req.user!.id },
          data: {
            firstName,
            lastName,
            language,
          },
        });

        // Update profile
        const profile = await tx.userProfile.upsert({
          where: { userId: req.user!.id },
          create: {
            userId: req.user!.id,
            bio,
            interests: interests || [],
            preferredCategories: preferredCategories || [],
            difficultyLevel: difficultyLevel || 1,
            dailyGoalMinutes: dailyGoalMinutes || 15,
            notificationsEnabled: notificationsEnabled !== undefined ? notificationsEnabled : true,
            publicProfile: publicProfile !== undefined ? publicProfile : false,
          },
          update: {
            bio,
            interests: interests || undefined,
            preferredCategories: preferredCategories || undefined,
            difficultyLevel,
            dailyGoalMinutes,
            notificationsEnabled,
            publicProfile,
          },
        });

        return { user, profile };
      });

      // Clear cached user feed to reflect new preferences
      await redis.getUserFeed(req.user.id).then(async (cached) => {
        if (cached) {
          await redis.client.del(`user:${req.user!.id}:feed`);
        }
      });

      mobileLogger.logUserSession(req.user.id, 'profile_updated', {
        fields: Object.keys(req.body),
      });

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: updatedUser.user,
          profile: updatedUser.profile,
        },
      });
    } catch (error) {
      logger.error('Profile update error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update profile',
        code: 'PROFILE_UPDATE_ERROR',
      });
    }
  }

  /**
   * Upload user avatar
   * POST /api/v1/users/avatar
   */
  static async uploadAvatar(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No image file provided',
          code: 'NO_FILE',
        });
        return;
      }

      // Optimize image for mobile
      const optimizedImageBuffer = await sharp(req.file.buffer)
        .resize(200, 200, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({
          quality: config.mobile.imageCompressionQuality,
          progressive: true,
        })
        .toBuffer();

      // In a real implementation, you would upload to S3/Cloudinary here
      // For now, we'll simulate with a placeholder URL
      const avatarUrl = `https://api.culturaflow.com/uploads/avatars/${req.user.id}_${Date.now()}.jpg`;

      // Update user avatar URL
      const updatedUser = await db.prisma.user.update({
        where: { id: req.user.id },
        data: { avatar: avatarUrl },
        select: {
          id: true,
          username: true,
          avatar: true,
        },
      });

      mobileLogger.logUserSession(req.user.id, 'avatar_uploaded', {
        originalSize: req.file.size,
        optimizedSize: optimizedImageBuffer.length,
        compression: Math.round((1 - optimizedImageBuffer.length / req.file.size) * 100),
      });

      res.json({
        success: true,
        message: 'Avatar uploaded successfully',
        data: {
          user: updatedUser,
          avatar: avatarUrl,
        },
      });
    } catch (error) {
      logger.error('Avatar upload error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload avatar',
        code: 'AVATAR_UPLOAD_ERROR',
      });
    }
  }

  /**
   * Get user progress and stats
   * GET /api/v1/users/stats
   */
  static async getUserStats(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      // Get user statistics
      const [progress, streaks, achievements, analytics] = await Promise.all([
        // Content progress
        db.prisma.userProgress.groupBy({
          by: ['status'],
          where: { userId: req.user.id },
          _count: true,
        }),
        
        // Current streaks
        db.prisma.userStreak.findMany({
          where: { userId: req.user.id },
        }),
        
        // Recent achievements
        db.prisma.userAchievement.findMany({
          where: { userId: req.user.id },
          include: { achievement: true },
          orderBy: { unlockedAt: 'desc' },
          take: 10,
        }),
        
        // Weekly analytics
        db.prisma.userAnalytics.findMany({
          where: {
            userId: req.user.id,
            date: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
          orderBy: { date: 'desc' },
        }),
      ]);

      // Process progress stats
      const progressStats = progress.reduce((acc, curr) => {
        acc[curr.status.toLowerCase()] = curr._count;
        return acc;
      }, {} as Record<string, number>);

      // Calculate total points from analytics
      const totalPoints = analytics.reduce((sum, day) => sum + day.pointsEarned, 0);
      const totalSessionTime = analytics.reduce((sum, day) => sum + day.sessionDuration, 0);

      // Current streaks
      const dailyStreak = streaks.find(s => s.category === 'daily')?.currentStreak || 0;
      const weeklyStreak = streaks.find(s => s.category === 'weekly')?.currentStreak || 0;

      res.json({
        success: true,
        data: {
          progress: {
            completed: progressStats.completed || 0,
            inProgress: progressStats.in_progress || 0,
            notStarted: progressStats.not_started || 0,
            skipped: progressStats.skipped || 0,
          },
          streaks: {
            daily: dailyStreak,
            weekly: weeklyStreak,
            longestDaily: streaks.find(s => s.category === 'daily')?.longestStreak || 0,
          },
          achievements: {
            total: achievements.length,
            recent: achievements.map(ua => ({
              id: ua.achievement.id,
              name: ua.achievement.name,
              description: ua.achievement.description,
              icon: ua.achievement.icon,
              points: ua.achievement.points,
              rarity: ua.achievement.rarity,
              unlockedAt: ua.unlockedAt,
            })),
          },
          analytics: {
            totalPoints,
            totalSessionTime,
            weeklyData: analytics.map(day => ({
              date: day.date,
              sessionDuration: day.sessionDuration,
              contentViewed: day.contentViewed,
              contentCompleted: day.contentCompleted,
              pointsEarned: day.pointsEarned,
              categoriesExplored: day.categoriesExplored,
            })),
          },
        },
      });
    } catch (error) {
      logger.error('Get user stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user statistics',
        code: 'STATS_FETCH_ERROR',
      });
    }
  }

  /**
   * Get user achievements
   * GET /api/v1/users/achievements
   */
  static async getAchievements(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      const { page = 1, limit = 20 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      // Get user achievements with pagination
      const [achievements, totalCount] = await Promise.all([
        db.prisma.userAchievement.findMany({
          where: { userId: req.user.id },
          include: {
            achievement: true,
          },
          orderBy: { unlockedAt: 'desc' },
          skip,
          take: Number(limit),
        }),
        
        db.prisma.userAchievement.count({
          where: { userId: req.user.id },
        }),
      ]);

      // Get available achievements (not yet unlocked)
      const unlockedIds = achievements.map(ua => ua.achievementId);
      const availableAchievements = await db.prisma.achievement.findMany({
        where: {
          isActive: true,
          NOT: {
            id: { in: unlockedIds },
          },
        },
        take: 10,
        orderBy: { points: 'asc' },
      });

      const totalPages = Math.ceil(totalCount / Number(limit));

      res.json({
        success: true,
        data: {
          unlocked: achievements.map(ua => ({
            id: ua.achievement.id,
            name: ua.achievement.name,
            description: ua.achievement.description,
            category: ua.achievement.category,
            icon: ua.achievement.icon,
            points: ua.achievement.points,
            rarity: ua.achievement.rarity,
            unlockedAt: ua.unlockedAt,
          })),
          available: availableAchievements.map(a => ({
            id: a.id,
            name: a.name,
            description: a.description,
            category: a.category,
            icon: a.icon,
            points: a.points,
            rarity: a.rarity,
            condition: a.condition,
          })),
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: totalCount,
            totalPages,
            hasNext: Number(page) < totalPages,
            hasPrev: Number(page) > 1,
          },
        },
      });
    } catch (error) {
      logger.error('Get achievements error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch achievements',
        code: 'ACHIEVEMENTS_FETCH_ERROR',
      });
    }
  }

  /**
   * Update user settings
   * PATCH /api/v1/users/settings
   */
  static async updateSettings(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      const {
        notificationsEnabled,
        language,
        timeZone,
        publicProfile,
        dailyGoalMinutes,
        difficultyLevel,
      } = req.body;

      // Update user settings
      const [updatedUser, updatedProfile] = await Promise.all([
        db.prisma.user.update({
          where: { id: req.user.id },
          data: {
            language,
            timeZone,
          },
        }),
        
        db.prisma.userProfile.update({
          where: { userId: req.user.id },
          data: {
            notificationsEnabled,
            publicProfile,
            dailyGoalMinutes,
            difficultyLevel,
          },
        }),
      ]);

      mobileLogger.logUserSession(req.user.id, 'settings_updated', {
        settings: Object.keys(req.body),
      });

      res.json({
        success: true,
        message: 'Settings updated successfully',
        data: {
          user: updatedUser,
          profile: updatedProfile,
        },
      });
    } catch (error) {
      logger.error('Update settings error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update settings',
        code: 'SETTINGS_UPDATE_ERROR',
      });
    }
  }

  /**
   * Delete user account
   * DELETE /api/v1/users/account
   */
  static async deleteAccount(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      const { password } = req.body;

      if (!password) {
        res.status(400).json({
          success: false,
          error: 'Password confirmation required',
          code: 'PASSWORD_REQUIRED',
        });
        return;
      }

      // Get user with password
      const user = await db.prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          password: true,
          email: true,
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

      // Verify password
      const isPasswordValid = await AuthService.verifyPassword(password, user.password);
      if (!isPasswordValid) {
        res.status(401).json({
          success: false,
          error: 'Invalid password',
          code: 'INVALID_PASSWORD',
        });
        return;
      }

      // Soft delete - deactivate account instead of hard delete
      await db.prisma.user.update({
        where: { id: req.user.id },
        data: {
          isActive: false,
          email: `deleted_${Date.now()}_${user.email}`, // Prevent email conflicts
          updatedAt: new Date(),
        },
      });

      // Invalidate all sessions
      await db.prisma.userSession.updateMany({
        where: { userId: req.user.id },
        data: { isActive: false },
      });

      // Clear Redis cache
      await redis.deleteUserSession(req.user.id);

      mobileLogger.logUserSession(req.user.id, 'account_deleted', {});

      res.json({
        success: true,
        message: 'Account deactivated successfully',
      });
    } catch (error) {
      logger.error('Delete account error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete account',
        code: 'ACCOUNT_DELETE_ERROR',
      });
    }
  }
}

export default UserController;