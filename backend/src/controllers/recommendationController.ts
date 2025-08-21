import { Request, Response } from 'express';
import { RecommendationService } from '@/services/recommendationService';
import { db } from '@/config/database';
import { redis } from '@/config/redis';
import { logger, mobileLogger } from '@/utils/logger';

export class RecommendationController {
  /**
   * Get personalized recommendations for user
   * GET /api/v1/recommendations
   */
  static async getRecommendations(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      const { limit = 20, refresh = false } = req.query;

      // Force refresh if requested
      if (refresh === 'true') {
        await redis.client.del(`user:${req.user.id}:recommendations`);
      }

      // Generate recommendations
      const recommendations = await RecommendationService.generateRecommendations(
        req.user.id,
        Number(limit)
      );

      if (recommendations.length === 0) {
        res.json({
          success: true,
          data: {
            recommendations: [],
            message: 'No recommendations available at this time',
          },
        });
        return;
      }

      // Get content details
      const contentIds = recommendations.map(r => r.contentId);
      const content = await db.prisma.culturalContent.findMany({
        where: {
          id: { in: contentIds },
          isActive: true,
        },
        include: {
          _count: {
            select: {
              interactions: {
                where: { type: 'LIKE' },
              },
            },
          },
          interactions: {
            where: {
              userId: req.user.id,
              type: { in: ['LIKE', 'SAVE'] },
            },
          },
          progress: {
            where: { userId: req.user.id },
          },
        },
      });

      // Create content map for efficient lookup
      const contentMap = new Map(content.map(c => [c.id, c]));

      // Transform recommendations with content details
      const enrichedRecommendations = recommendations
        .map(rec => {
          const contentItem = contentMap.get(rec.contentId);
          if (!contentItem) return null;

          return {
            id: contentItem.id,
            title: contentItem.title,
            description: contentItem.description,
            category: contentItem.category,
            subcategory: contentItem.subcategory,
            difficulty: contentItem.difficulty,
            estimatedTime: contentItem.estimatedTime,
            thumbnailUrl: contentItem.thumbnailUrl,
            tags: contentItem.tags,
            language: contentItem.language,
            isFeatured: contentItem.isFeatured,
            viewCount: contentItem.viewCount,
            likeCount: contentItem._count.interactions,
            shareCount: contentItem.shareCount,
            createdAt: contentItem.createdAt,
            // User-specific data
            isLiked: contentItem.interactions?.some(i => i.type === 'LIKE') || false,
            isSaved: contentItem.interactions?.some(i => i.type === 'SAVE') || false,
            progress: contentItem.progress?.[0] || null,
            // Recommendation metadata
            recommendationScore: Math.round(rec.score * 10) / 10,
            recommendationReasons: rec.reasons,
            recommendationAlgorithm: rec.algorithm,
          };
        })
        .filter(Boolean);

      // Mark recommendations as shown
      await db.prisma.userRecommendation.updateMany({
        where: {
          userId: req.user.id,
          contentId: { in: contentIds },
        },
        data: { isShown: true },
      }).catch(error => {
        logger.error('Failed to mark recommendations as shown:', error);
      });

      mobileLogger.logUserSession(req.user.id, 'recommendations_viewed', {
        count: enrichedRecommendations.length,
        algorithms: [...new Set(recommendations.map(r => r.algorithm))],
      });

      res.json({
        success: true,
        data: {
          recommendations: enrichedRecommendations,
          meta: {
            totalCount: enrichedRecommendations.length,
            algorithms: recommendations.map(r => r.algorithm),
            generatedAt: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      logger.error('Get recommendations error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch recommendations',
        code: 'RECOMMENDATIONS_FETCH_ERROR',
      });
    }
  }

  /**
   * Track recommendation interaction
   * POST /api/v1/recommendations/interact
   */
  static async trackRecommendationInteraction(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      const { contentId, action } = req.body;

      if (!['click', 'dismiss', 'share'] .includes(action)) {
        res.status(400).json({
          success: false,
          error: 'Invalid action',
          code: 'INVALID_ACTION',
        });
        return;
      }

      // Update recommendation interaction
      await db.prisma.userRecommendation.updateMany({
        where: {
          userId: req.user.id,
          contentId,
        },
        data: {
          isClicked: action === 'click' ? true : undefined,
        },
      });

      mobileLogger.logContentInteraction(req.user.id, contentId, `recommendation_${action}`);

      res.json({
        success: true,
        message: 'Interaction tracked successfully',
      });
    } catch (error) {
      logger.error('Track recommendation interaction error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to track interaction',
        code: 'INTERACTION_TRACK_ERROR',
      });
    }
  }

  /**
   * Get recommendation performance analytics
   * GET /api/v1/recommendations/analytics
   */
  static async getRecommendationAnalytics(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      const { days = 7 } = req.query;
      const daysAgo = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);

      // Get recommendation analytics
      const [totalRecommendations, clickedRecommendations, algorithmPerformance] = await Promise.all([
        db.prisma.userRecommendation.count({
          where: {
            userId: req.user.id,
            createdAt: { gte: daysAgo },
          },
        }),

        db.prisma.userRecommendation.count({
          where: {
            userId: req.user.id,
            createdAt: { gte: daysAgo },
            isClicked: true,
          },
        }),

        db.prisma.userRecommendation.groupBy({
          by: ['algorithm'],
          where: {
            userId: req.user.id,
            createdAt: { gte: daysAgo },
          },
          _count: true,
          _avg: {
            score: true,
          },
        }),
      ]);

      const clickThroughRate = totalRecommendations > 0 
        ? (clickedRecommendations / totalRecommendations) * 100 
        : 0;

      res.json({
        success: true,
        data: {
          period: `${days} days`,
          totalRecommendations,
          clickedRecommendations,
          clickThroughRate: Math.round(clickThroughRate * 100) / 100,
          algorithmPerformance: algorithmPerformance.map(alg => ({
            algorithm: alg.algorithm,
            count: alg._count,
            averageScore: Math.round((alg._avg.score || 0) * 100) / 100,
          })),
        },
      });
    } catch (error) {
      logger.error('Get recommendation analytics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch analytics',
        code: 'ANALYTICS_FETCH_ERROR',
      });
    }
  }
}

export default RecommendationController;