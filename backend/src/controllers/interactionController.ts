import { Request, Response } from 'express';
import { db } from '@/config/database';
import { redis } from '@/config/redis';
import { logger, mobileLogger } from '@/utils/logger';
import { InteractionType, ProgressStatus } from '@prisma/client';
import { config } from '@/config';

export class InteractionController {
  /**
   * Create or update content interaction
   * POST /api/v1/interactions
   */
  static async createInteraction(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      const { contentId, type, value } = req.body;

      // Verify content exists
      const content = await db.prisma.culturalContent.findFirst({
        where: { id: contentId, isActive: true },
      });

      if (!content) {
        res.status(404).json({
          success: false,
          error: 'Content not found',
          code: 'CONTENT_NOT_FOUND',
        });
        return;
      }

      // Handle different interaction types
      let interaction;
      let points = 0;

      switch (type as InteractionType) {
        case 'LIKE':
          interaction = await this.handleLikeInteraction(req.user.id, contentId, value);
          points = 2;
          break;
        case 'SAVE':
          interaction = await this.handleSaveInteraction(req.user.id, contentId, value);
          points = 1;
          break;
        case 'SHARE':
          interaction = await this.handleShareInteraction(req.user.id, contentId, value);
          points = 5;
          break;
        case 'COMPLETE':
          interaction = await this.handleCompleteInteraction(req.user.id, contentId, value);
          points = config.gamification.completionBonus;
          break;
        case 'VIEW':
          interaction = await this.handleViewInteraction(req.user.id, contentId, value);
          points = 1;
          break;
        default:
          interaction = await db.prisma.contentInteraction.create({
            data: {
              userId: req.user.id,
              contentId,
              type: type as InteractionType,
              value,
            },
          });
      }

      // Award points for interaction
      if (points > 0) {
        await this.awardPoints(req.user.id, points, `${type.toLowerCase()}_interaction`);
      }

      // Update content counters
      await this.updateContentCounters(contentId, type as InteractionType);

      // Clear user's cached feed
      await redis.client.del(`user:${req.user.id}:feed:*`);

      mobileLogger.logContentInteraction(req.user.id, contentId, type.toLowerCase());

      res.json({
        success: true,
        message: 'Interaction recorded successfully',
        data: {
          interaction,
          pointsEarned: points,
        },
      });
    } catch (error) {
      logger.error('Create interaction error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to record interaction',
        code: 'INTERACTION_ERROR',
      });
    }
  }

  /**
   * Get user's interactions with content
   * GET /api/v1/interactions/:contentId
   */
  static async getUserInteractions(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      const { contentId } = req.params;

      const interactions = await db.prisma.contentInteraction.findMany({
        where: {
          userId: req.user.id,
          contentId,
        },
        orderBy: { createdAt: 'desc' },
      });

      const progress = await db.prisma.userProgress.findUnique({
        where: {
          userId_contentId: {
            userId: req.user.id,
            contentId,
          },
        },
      });

      res.json({
        success: true,
        data: {
          interactions: interactions.map(i => ({
            type: i.type,
            value: i.value,
            createdAt: i.createdAt,
          })),
          progress,
        },
      });
    } catch (error) {
      logger.error('Get user interactions error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch interactions',
        code: 'INTERACTIONS_FETCH_ERROR',
      });
    }
  }

  /**
   * Update user progress for content
   * POST /api/v1/interactions/progress
   */
  static async updateProgress(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      const { contentId, status, timeSpent, score, completionRate } = req.body;

      // Verify content exists
      const content = await db.prisma.culturalContent.findFirst({
        where: { id: contentId, isActive: true },
      });

      if (!content) {
        res.status(404).json({
          success: false,
          error: 'Content not found',
          code: 'CONTENT_NOT_FOUND',
        });
        return;
      }

      // Update or create progress
      const progress = await db.prisma.userProgress.upsert({
        where: {
          userId_contentId: {
            userId: req.user.id,
            contentId,
          },
        },
        create: {
          userId: req.user.id,
          contentId,
          status: status as ProgressStatus,
          timeSpent: timeSpent || 0,
          score,
          completionRate: completionRate || 0,
          attempts: 1,
          lastAttemptAt: new Date(),
          completedAt: status === 'COMPLETED' ? new Date() : null,
        },
        update: {
          status: status as ProgressStatus,
          timeSpent: { increment: timeSpent || 0 },
          score,
          completionRate: completionRate || undefined,
          attempts: { increment: 1 },
          lastAttemptAt: new Date(),
          completedAt: status === 'COMPLETED' ? new Date() : null,
        },
      });

      // Award points based on progress
      let points = 0;
      if (status === 'COMPLETED') {
        points = config.gamification.completionBonus;
        if (score === 100) {
          points += config.gamification.perfectScoreBonus;
        }
        
        // Check if this is the first completion
        const isFirstCompletion = progress.attempts === 1;
        if (isFirstCompletion) {
          points += config.gamification.firstTimeBonus;
        }
      }

      if (points > 0) {
        await this.awardPoints(req.user.id, points, 'content_progress');
      }

      // Update daily analytics
      await this.updateDailyAnalytics(req.user.id, {
        contentCompleted: status === 'COMPLETED' ? 1 : 0,
        sessionDuration: timeSpent || 0,
        pointsEarned: points,
        categoriesExplored: [content.category],
      });

      // Check for achievements
      await this.checkAchievements(req.user.id, progress);

      // Update streaks if content completed
      if (status === 'COMPLETED') {
        await this.updateStreaks(req.user.id);
      }

      mobileLogger.logContentInteraction(req.user.id, contentId, `progress_${status.toLowerCase()}`);

      res.json({
        success: true,
        message: 'Progress updated successfully',
        data: {
          progress,
          pointsEarned: points,
        },
      });
    } catch (error) {
      logger.error('Update progress error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update progress',
        code: 'PROGRESS_UPDATE_ERROR',
      });
    }
  }

  /**
   * Get user's saved content
   * GET /api/v1/interactions/saved
   */
  static async getSavedContent(req: Request, res: Response): Promise<void> {
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

      // Get saved content interactions
      const [savedInteractions, totalCount] = await Promise.all([
        db.prisma.contentInteraction.findMany({
          where: {
            userId: req.user.id,
            type: 'SAVE',
          },
          include: {
            content: {
              select: {
                id: true,
                title: true,
                description: true,
                category: true,
                difficulty: true,
                estimatedTime: true,
                thumbnailUrl: true,
                tags: true,
                viewCount: true,
                likeCount: true,
                createdAt: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: Number(limit),
        }),
        
        db.prisma.contentInteraction.count({
          where: {
            userId: req.user.id,
            type: 'SAVE',
          },
        }),
      ]);

      const totalPages = Math.ceil(totalCount / Number(limit));

      res.json({
        success: true,
        data: {
          savedContent: savedInteractions.map(interaction => ({
            ...interaction.content,
            savedAt: interaction.createdAt,
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
      logger.error('Get saved content error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch saved content',
        code: 'SAVED_CONTENT_FETCH_ERROR',
      });
    }
  }

  // Private helper methods
  private static async handleLikeInteraction(userId: string, contentId: string, value: any) {
    return await db.prisma.contentInteraction.upsert({
      where: {
        userId_contentId_type: { userId, contentId, type: 'LIKE' },
      },
      create: {
        userId,
        contentId,
        type: 'LIKE',
        value: { liked: true, timestamp: new Date() },
      },
      update: {
        value: { liked: !value?.liked, timestamp: new Date() },
      },
    });
  }

  private static async handleSaveInteraction(userId: string, contentId: string, value: any) {
    return await db.prisma.contentInteraction.upsert({
      where: {
        userId_contentId_type: { userId, contentId, type: 'SAVE' },
      },
      create: {
        userId,
        contentId,
        type: 'SAVE',
        value: { saved: true, timestamp: new Date() },
      },
      update: {
        value: { saved: !value?.saved, timestamp: new Date() },
      },
    });
  }

  private static async handleShareInteraction(userId: string, contentId: string, value: any) {
    return await db.prisma.contentInteraction.create({
      data: {
        userId,
        contentId,
        type: 'SHARE',
        value: { platform: value?.platform, timestamp: new Date() },
      },
    });
  }

  private static async handleCompleteInteraction(userId: string, contentId: string, value: any) {
    return await db.prisma.contentInteraction.create({
      data: {
        userId,
        contentId,
        type: 'COMPLETE',
        value: { 
          score: value?.score,
          timeSpent: value?.timeSpent,
          timestamp: new Date(),
        },
      },
    });
  }

  private static async handleViewInteraction(userId: string, contentId: string, value: any) {
    return await db.prisma.contentInteraction.upsert({
      where: {
        userId_contentId_type: { userId, contentId, type: 'VIEW' },
      },
      create: {
        userId,
        contentId,
        type: 'VIEW',
        value: { viewCount: 1, lastViewed: new Date() },
      },
      update: {
        value: { 
          viewCount: (value?.viewCount || 0) + 1, 
          lastViewed: new Date(),
        },
      },
    });
  }

  private static async updateContentCounters(contentId: string, type: InteractionType) {
    switch (type) {
      case 'LIKE':
        await db.prisma.culturalContent.update({
          where: { id: contentId },
          data: { likeCount: { increment: 1 } },
        });
        break;
      case 'SHARE':
        await db.prisma.culturalContent.update({
          where: { id: contentId },
          data: { shareCount: { increment: 1 } },
        });
        break;
      case 'VIEW':
        await db.prisma.culturalContent.update({
          where: { id: contentId },
          data: { viewCount: { increment: 1 } },
        });
        break;
    }
  }

  private static async awardPoints(userId: string, points: number, reason: string) {
    // Update today's analytics with points
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await db.prisma.userAnalytics.upsert({
      where: {
        userId_date: { userId, date: today },
      },
      create: {
        userId,
        date: today,
        pointsEarned: points,
      },
      update: {
        pointsEarned: { increment: points },
      },
    });
  }

  private static async updateDailyAnalytics(userId: string, data: {
    contentCompleted?: number;
    sessionDuration?: number;
    pointsEarned?: number;
    categoriesExplored?: string[];
  }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await db.prisma.userAnalytics.upsert({
      where: {
        userId_date: { userId, date: today },
      },
      create: {
        userId,
        date: today,
        sessionDuration: data.sessionDuration || 0,
        contentCompleted: data.contentCompleted || 0,
        pointsEarned: data.pointsEarned || 0,
        categoriesExplored: data.categoriesExplored || [],
      },
      update: {
        sessionDuration: { increment: data.sessionDuration || 0 },
        contentCompleted: { increment: data.contentCompleted || 0 },
        pointsEarned: { increment: data.pointsEarned || 0 },
        categoriesExplored: {
          push: data.categoriesExplored || [],
        },
      },
    });
  }

  private static async checkAchievements(userId: string, progress: any) {
    // This would contain achievement checking logic
    // For now, we'll implement a simple example
    const completedCount = await db.prisma.userProgress.count({
      where: { userId, status: 'COMPLETED' },
    });

    // Check for "First Steps" achievement (complete first content)
    if (completedCount === 1) {
      const firstStepsAchievement = await db.prisma.achievement.findFirst({
        where: { name: 'First Steps' },
      });

      if (firstStepsAchievement) {
        await db.prisma.userAchievement.create({
          data: {
            userId,
            achievementId: firstStepsAchievement.id,
          },
        }).catch(() => {}); // Ignore if already exists
      }
    }
  }

  private static async updateStreaks(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Check if user completed content today
    const todayCompleted = await db.prisma.userProgress.count({
      where: {
        userId,
        status: 'COMPLETED',
        completedAt: { gte: today },
      },
    });

    if (todayCompleted > 0) {
      // Update daily streak
      const streak = await db.prisma.userStreak.findUnique({
        where: {
          userId_category: {
            userId,
            category: 'daily',
          },
        },
      });

      if (streak) {
        const lastActiveDate = new Date(streak.lastActiveAt);
        lastActiveDate.setHours(0, 0, 0, 0);

        let newStreakCount = 1;
        if (lastActiveDate.getTime() === yesterday.getTime()) {
          // Consecutive day
          newStreakCount = streak.currentStreak + 1;
        }

        await db.prisma.userStreak.update({
          where: { id: streak.id },
          data: {
            currentStreak: newStreakCount,
            longestStreak: Math.max(streak.longestStreak, newStreakCount),
            lastActiveAt: new Date(),
          },
        });
      }
    }
  }
}

export default InteractionController;