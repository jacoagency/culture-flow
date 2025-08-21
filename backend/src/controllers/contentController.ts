import { Request, Response } from 'express';
import { db } from '@/config/database';
import { redis } from '@/config/redis';
import { logger, mobileLogger } from '@/utils/logger';
import { ContentCategory } from '@prisma/client';

export class ContentController {
  /**
   * Get cultural content feed (mobile-optimized)
   * GET /api/v1/content/feed
   */
  static async getFeed(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const {
        page = 1,
        limit = 20,
        category,
        difficulty,
        language = 'en',
        featured
      } = req.query;

      const skip = (Number(page) - 1) * Number(limit);

      // Try to get cached feed for authenticated users
      let cachedFeed = null;
      if (userId) {
        const cacheKey = `user:${userId}:feed:${page}:${limit}:${category || 'all'}:${difficulty || 'all'}`;
        cachedFeed = await redis.client.get(cacheKey);
        
        if (cachedFeed) {
          const parsed = JSON.parse(cachedFeed);
          res.json({
            success: true,
            data: parsed,
            cached: true,
          });
          return;
        }
      }

      // Build query filters
      const whereClause: any = {
        isActive: true,
        language,
      };

      if (category) {
        whereClause.category = category as ContentCategory;
      }

      if (difficulty) {
        whereClause.difficulty = Number(difficulty);
      }

      if (featured === 'true') {
        whereClause.isFeatured = true;
      }

      // Get user's preferred categories for personalization
      let userPreferences = null;
      if (userId) {
        userPreferences = await db.prisma.userProfile.findUnique({
          where: { userId },
          select: {
            preferredCategories: true,
            difficultyLevel: true,
            interests: true,
          },
        });
      }

      // Personalize query if user is authenticated
      if (userPreferences && !category) {
        if (userPreferences.preferredCategories.length > 0) {
          whereClause.OR = [
            { category: { in: userPreferences.preferredCategories } },
            { isFeatured: true }, // Always include featured content
          ];
        }
      }

      // Get content with pagination
      const [content, totalCount] = await Promise.all([
        db.prisma.culturalContent.findMany({
          where: whereClause,
          include: {
            _count: {
              select: {
                interactions: {
                  where: { type: 'LIKE' },
                },
              },
            },
            interactions: userId ? {
              where: {
                userId,
                type: { in: ['LIKE', 'SAVE'] },
              },
            } : false,
            progress: userId ? {
              where: { userId },
            } : false,
          },
          orderBy: [
            { isFeatured: 'desc' },
            { createdAt: 'desc' },
            { viewCount: 'desc' },
          ],
          skip,
          take: Number(limit),
        }),
        
        db.prisma.culturalContent.count({ where: whereClause }),
      ]);

      // Transform content for mobile consumption
      const transformedContent = content.map(item => ({
        id: item.id,
        title: item.title,
        description: item.description,
        content: item.content,
        category: item.category,
        subcategory: item.subcategory,
        difficulty: item.difficulty,
        estimatedTime: item.estimatedTime,
        mediaUrl: item.mediaUrl,
        thumbnailUrl: item.thumbnailUrl,
        audioUrl: item.audioUrl,
        tags: item.tags,
        language: item.language,
        isFeatured: item.isFeatured,
        viewCount: item.viewCount,
        likeCount: item._count.interactions,
        shareCount: item.shareCount,
        createdAt: item.createdAt,
        // User-specific data
        isLiked: item.interactions?.some(i => i.type === 'LIKE') || false,
        isSaved: item.interactions?.some(i => i.type === 'SAVE') || false,
        progress: item.progress?.[0] || null,
      }));

      const totalPages = Math.ceil(totalCount / Number(limit));

      const result = {
        content: transformedContent,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: totalCount,
          totalPages,
          hasNext: Number(page) < totalPages,
          hasPrev: Number(page) > 1,
        },
        filters: {
          category: category || null,
          difficulty: difficulty ? Number(difficulty) : null,
          language,
          featured: featured === 'true',
        },
      };

      // Cache the result for authenticated users
      if (userId && !category && !difficulty) {
        const cacheKey = `user:${userId}:feed:${page}:${limit}:all:all`;
        await redis.client.setex(cacheKey, 1800, JSON.stringify(result)); // 30 minutes
      }

      res.json({
        success: true,
        data: result,
      });

      // Log interaction for analytics
      if (userId) {
        mobileLogger.logContentInteraction(userId, 'feed_viewed', 'feed');
      }
    } catch (error) {
      logger.error('Get feed error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch content feed',
        code: 'FEED_FETCH_ERROR',
      });
    }
  }

  /**
   * Get specific content by ID
   * GET /api/v1/content/:id
   */
  static async getContentById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const content = await db.prisma.culturalContent.findUnique({
        where: { 
          id,
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
          interactions: userId ? {
            where: { userId },
          } : false,
          progress: userId ? {
            where: { userId },
          } : false,
        },
      });

      if (!content) {
        res.status(404).json({
          success: false,
          error: 'Content not found',
          code: 'CONTENT_NOT_FOUND',
        });
        return;
      }

      // Increment view count asynchronously
      redis.incrementViewCount(id).then(async (views) => {
        await db.prisma.culturalContent.update({
          where: { id },
          data: { viewCount: { increment: 1 } },
        });
      }).catch(error => {
        logger.error('Failed to increment view count:', error);
      });

      // Transform content for response
      const transformedContent = {
        id: content.id,
        title: content.title,
        description: content.description,
        content: content.content,
        category: content.category,
        subcategory: content.subcategory,
        difficulty: content.difficulty,
        estimatedTime: content.estimatedTime,
        mediaUrl: content.mediaUrl,
        thumbnailUrl: content.thumbnailUrl,
        audioUrl: content.audioUrl,
        tags: content.tags,
        language: content.language,
        isFeatured: content.isFeatured,
        viewCount: content.viewCount + 1,
        likeCount: content._count.interactions,
        shareCount: content.shareCount,
        createdAt: content.createdAt,
        // User-specific data
        isLiked: content.interactions?.some(i => i.type === 'LIKE') || false,
        isSaved: content.interactions?.some(i => i.type === 'SAVE') || false,
        progress: content.progress?.[0] || null,
      };

      res.json({
        success: true,
        data: {
          content: transformedContent,
        },
      });

      // Log view interaction
      if (userId) {
        mobileLogger.logContentInteraction(userId, id, 'view');
        
        // Track view interaction in database
        await db.prisma.contentInteraction.upsert({
          where: {
            userId_contentId_type: {
              userId,
              contentId: id,
              type: 'VIEW',
            },
          },
          create: {
            userId,
            contentId: id,
            type: 'VIEW',
            value: { timestamp: new Date() },
          },
          update: {
            value: { timestamp: new Date() },
          },
        }).catch(error => {
          logger.error('Failed to track view interaction:', error);
        });
      }
    } catch (error) {
      logger.error('Get content by ID error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch content',
        code: 'CONTENT_FETCH_ERROR',
      });
    }
  }

  /**
   * Search cultural content
   * GET /api/v1/content/search
   */
  static async searchContent(req: Request, res: Response): Promise<void> {
    try {
      const {
        q: query,
        category,
        difficulty,
        language = 'en',
        tags,
        page = 1,
        limit = 20,
      } = req.query;

      if (!query || (query as string).length < 2) {
        res.status(400).json({
          success: false,
          error: 'Search query must be at least 2 characters',
          code: 'INVALID_SEARCH_QUERY',
        });
        return;
      }

      const skip = (Number(page) - 1) * Number(limit);

      // Build search filters
      const whereClause: any = {
        isActive: true,
        language,
        OR: [
          { title: { contains: query as string, mode: 'insensitive' } },
          { description: { contains: query as string, mode: 'insensitive' } },
          { tags: { hasSome: [(query as string).toLowerCase()] } },
        ],
      };

      if (category) {
        whereClause.category = category as ContentCategory;
      }

      if (difficulty) {
        whereClause.difficulty = Number(difficulty);
      }

      if (tags) {
        const tagArray = (tags as string).split(',').map(tag => tag.trim());
        whereClause.tags = { hasSome: tagArray };
      }

      // Execute search
      const [content, totalCount] = await Promise.all([
        db.prisma.culturalContent.findMany({
          where: whereClause,
          include: {
            _count: {
              select: {
                interactions: {
                  where: { type: 'LIKE' },
                },
              },
            },
          },
          orderBy: [
            { isFeatured: 'desc' },
            { viewCount: 'desc' },
            { createdAt: 'desc' },
          ],
          skip,
          take: Number(limit),
        }),
        
        db.prisma.culturalContent.count({ where: whereClause }),
      ]);

      const totalPages = Math.ceil(totalCount / Number(limit));

      res.json({
        success: true,
        data: {
          query: query as string,
          results: content.map(item => ({
            id: item.id,
            title: item.title,
            description: item.description.substring(0, 200) + '...',
            category: item.category,
            subcategory: item.subcategory,
            difficulty: item.difficulty,
            estimatedTime: item.estimatedTime,
            thumbnailUrl: item.thumbnailUrl,
            tags: item.tags,
            isFeatured: item.isFeatured,
            viewCount: item.viewCount,
            likeCount: item._count.interactions,
            createdAt: item.createdAt,
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
      logger.error('Search content error:', error);
      res.status(500).json({
        success: false,
        error: 'Search failed',
        code: 'SEARCH_ERROR',
      });
    }
  }

  /**
   * Get content by category
   * GET /api/v1/content/category/:category
   */
  static async getContentByCategory(req: Request, res: Response): Promise<void> {
    try {
      const { category } = req.params;
      const {
        page = 1,
        limit = 20,
        difficulty,
        language = 'en',
        featured,
      } = req.query;

      // Validate category
      if (!Object.values(ContentCategory).includes(category as ContentCategory)) {
        res.status(400).json({
          success: false,
          error: 'Invalid content category',
          code: 'INVALID_CATEGORY',
        });
        return;
      }

      const skip = (Number(page) - 1) * Number(limit);

      const whereClause: any = {
        category: category as ContentCategory,
        isActive: true,
        language,
      };

      if (difficulty) {
        whereClause.difficulty = Number(difficulty);
      }

      if (featured === 'true') {
        whereClause.isFeatured = true;
      }

      const [content, totalCount] = await Promise.all([
        db.prisma.culturalContent.findMany({
          where: whereClause,
          include: {
            _count: {
              select: {
                interactions: {
                  where: { type: 'LIKE' },
                },
              },
            },
          },
          orderBy: [
            { isFeatured: 'desc' },
            { viewCount: 'desc' },
            { createdAt: 'desc' },
          ],
          skip,
          take: Number(limit),
        }),
        
        db.prisma.culturalContent.count({ where: whereClause }),
      ]);

      const totalPages = Math.ceil(totalCount / Number(limit));

      res.json({
        success: true,
        data: {
          category,
          content: content.map(item => ({
            id: item.id,
            title: item.title,
            description: item.description,
            subcategory: item.subcategory,
            difficulty: item.difficulty,
            estimatedTime: item.estimatedTime,
            thumbnailUrl: item.thumbnailUrl,
            tags: item.tags,
            isFeatured: item.isFeatured,
            viewCount: item.viewCount,
            likeCount: item._count.interactions,
            createdAt: item.createdAt,
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
      logger.error('Get content by category error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch content by category',
        code: 'CATEGORY_FETCH_ERROR',
      });
    }
  }

  /**
   * Get trending content
   * GET /api/v1/content/trending
   */
  static async getTrendingContent(req: Request, res: Response): Promise<void> {
    try {
      const {
        period = '24h',
        category,
        language = 'en',
        limit = 20,
      } = req.query;

      // Calculate time period
      let timeThreshold: Date;
      switch (period) {
        case '1h':
          timeThreshold = new Date(Date.now() - 60 * 60 * 1000);
          break;
        case '24h':
          timeThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          timeThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          break;
        default:
          timeThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);
      }

      const whereClause: any = {
        isActive: true,
        language,
        createdAt: { gte: timeThreshold },
      };

      if (category) {
        whereClause.category = category as ContentCategory;
      }

      // Get trending content based on engagement
      const trendingContent = await db.prisma.culturalContent.findMany({
        where: whereClause,
        include: {
          _count: {
            select: {
              interactions: {
                where: {
                  type: { in: ['LIKE', 'SHARE', 'SAVE'] },
                  createdAt: { gte: timeThreshold },
                },
              },
            },
          },
        },
        orderBy: [
          { viewCount: 'desc' },
          { shareCount: 'desc' },
        ],
        take: Number(limit),
      });

      // Calculate trending score
      const scoredContent = trendingContent.map(item => ({
        ...item,
        trendingScore: item.viewCount * 0.4 + 
                      item._count.interactions * 0.6 + 
                      item.shareCount * 0.8,
      })).sort((a, b) => b.trendingScore - a.trendingScore);

      res.json({
        success: true,
        data: {
          period,
          trending: scoredContent.map(item => ({
            id: item.id,
            title: item.title,
            description: item.description.substring(0, 200) + '...',
            category: item.category,
            subcategory: item.subcategory,
            difficulty: item.difficulty,
            thumbnailUrl: item.thumbnailUrl,
            tags: item.tags,
            viewCount: item.viewCount,
            likeCount: item._count.interactions,
            shareCount: item.shareCount,
            trendingScore: Math.round(item.trendingScore),
            createdAt: item.createdAt,
          })),
        },
      });
    } catch (error) {
      logger.error('Get trending content error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch trending content',
        code: 'TRENDING_FETCH_ERROR',
      });
    }
  }
}

export default ContentController;