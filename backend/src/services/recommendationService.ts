import OpenAI from 'openai';
import { db } from '@/config/database';
import { redis } from '@/config/redis';
import { logger } from '@/utils/logger';
import { config } from '@/config';
import { ContentCategory } from '@prisma/client';

interface UserPreferences {
  interests: string[];
  preferredCategories: ContentCategory[];
  difficultyLevel: number;
  completedCategories: string[];
  interactionHistory: {
    likedCategories: string[];
    savedCategories: string[];
    completedContent: string[];
  };
}

interface ContentScore {
  contentId: string;
  score: number;
  reasons: string[];
  algorithm: string;
}

export class RecommendationService {
  private static openai = new OpenAI({
    apiKey: config.openai.apiKey,
  });

  /**
   * Generate personalized content recommendations for a user
   */
  static async generateRecommendations(
    userId: string,
    limit: number = 20
  ): Promise<ContentScore[]> {
    try {
      // Check cache first
      const cachedRecommendations = await redis.getRecommendations(userId);
      if (cachedRecommendations) {
        logger.debug('Using cached recommendations', { userId });
        return cachedRecommendations.slice(0, limit);
      }

      // Get user preferences and history
      const userPreferences = await this.getUserPreferences(userId);
      if (!userPreferences) {
        logger.warn('No user preferences found, using fallback', { userId });
        return await this.getFallbackRecommendations(userId, limit);
      }

      // Combine multiple recommendation algorithms
      const [
        collaborativeRecommendations,
        contentBasedRecommendations,
        aiGeneratedRecommendations,
        trendingRecommendations,
      ] = await Promise.all([
        this.getCollaborativeFilteringRecommendations(userId, userPreferences),
        this.getContentBasedRecommendations(userId, userPreferences),
        this.getAIGeneratedRecommendations(userId, userPreferences),
        this.getTrendingRecommendations(userId, userPreferences),
      ]);

      // Merge and weight recommendations
      const mergedRecommendations = this.mergeRecommendations([
        { algorithm: 'collaborative', weight: 0.3, recommendations: collaborativeRecommendations },
        { algorithm: 'content-based', weight: 0.25, recommendations: contentBasedRecommendations },
        { algorithm: 'ai-generated', weight: 0.25, recommendations: aiGeneratedRecommendations },
        { algorithm: 'trending', weight: 0.2, recommendations: trendingRecommendations },
      ]);

      // Apply final ranking and filtering
      const finalRecommendations = await this.finalRanking(
        userId,
        mergedRecommendations,
        limit
      );

      // Cache recommendations
      await redis.cacheRecommendations(userId, finalRecommendations);

      // Store recommendations in database for analytics
      await this.storeRecommendations(userId, finalRecommendations);

      return finalRecommendations;
    } catch (error) {
      logger.error('Failed to generate recommendations:', error);
      return await this.getFallbackRecommendations(userId, limit);
    }
  }

  /**
   * Get user preferences and interaction history
   */
  private static async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      const [profile, interactions, completedContent] = await Promise.all([
        db.prisma.userProfile.findUnique({
          where: { userId },
        }),
        
        db.prisma.contentInteraction.findMany({
          where: {
            userId,
            type: { in: ['LIKE', 'SAVE', 'COMPLETE'] },
          },
          include: {
            content: {
              select: { category: true },
            },
          },
        }),
        
        db.prisma.userProgress.findMany({
          where: {
            userId,
            status: 'COMPLETED',
          },
          include: {
            content: {
              select: { id: true, category: true },
            },
          },
        }),
      ]);

      if (!profile) {
        return null;
      }

      // Analyze interaction history
      const likedCategories = interactions
        .filter(i => i.type === 'LIKE')
        .map(i => i.content.category);

      const savedCategories = interactions
        .filter(i => i.type === 'SAVE')
        .map(i => i.content.category);

      const completedCategories = [...new Set(
        completedContent.map(c => c.content.category)
      )];

      return {
        interests: profile.interests,
        preferredCategories: profile.preferredCategories as ContentCategory[],
        difficultyLevel: profile.difficultyLevel,
        completedCategories,
        interactionHistory: {
          likedCategories,
          savedCategories,
          completedContent: completedContent.map(c => c.content.id),
        },
      };
    } catch (error) {
      logger.error('Failed to get user preferences:', error);
      return null;
    }
  }

  /**
   * Collaborative filtering recommendations
   * Based on users with similar preferences and behaviors
   */
  private static async getCollaborativeFilteringRecommendations(
    userId: string,
    preferences: UserPreferences
  ): Promise<ContentScore[]> {
    try {
      // Find users with similar preferences
      const similarUsers = await db.prisma.user.findMany({
        where: {
          id: { not: userId },
          profile: {
            preferredCategories: {
              hasSome: preferences.preferredCategories,
            },
            difficultyLevel: {
              gte: Math.max(1, preferences.difficultyLevel - 1),
              lte: Math.min(5, preferences.difficultyLevel + 1),
            },
          },
        },
        include: {
          interactions: {
            where: {
              type: { in: ['LIKE', 'COMPLETE'] },
              contentId: { notIn: preferences.interactionHistory.completedContent },
            },
            include: {
              content: true,
            },
          },
        },
        take: 50,
      });

      // Calculate content scores based on similar users' interactions
      const contentScores = new Map<string, { score: number; reasons: string[] }>();

      similarUsers.forEach(user => {
        user.interactions.forEach(interaction => {
          const contentId = interaction.contentId;
          const current = contentScores.get(contentId) || { score: 0, reasons: [] };
          
          let scoreIncrement = 0;
          let reason = '';

          if (interaction.type === 'LIKE') {
            scoreIncrement = 1;
            reason = 'Liked by similar users';
          } else if (interaction.type === 'COMPLETE') {
            scoreIncrement = 2;
            reason = 'Completed by similar users';
          }

          current.score += scoreIncrement;
          if (!current.reasons.includes(reason)) {
            current.reasons.push(reason);
          }
          
          contentScores.set(contentId, current);
        });
      });

      // Convert to ContentScore array
      return Array.from(contentScores.entries())
        .map(([contentId, { score, reasons }]) => ({
          contentId,
          score,
          reasons,
          algorithm: 'collaborative',
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 20);
    } catch (error) {
      logger.error('Collaborative filtering failed:', error);
      return [];
    }
  }

  /**
   * Content-based recommendations
   * Based on user's content preferences and history
   */
  private static async getContentBasedRecommendations(
    userId: string,
    preferences: UserPreferences
  ): Promise<ContentScore[]> {
    try {
      const recommendations = await db.prisma.culturalContent.findMany({
        where: {
          isActive: true,
          id: { notIn: preferences.interactionHistory.completedContent },
          OR: [
            { category: { in: preferences.preferredCategories } },
            { tags: { hasSome: preferences.interests } },
            { 
              difficulty: {
                gte: Math.max(1, preferences.difficultyLevel - 1),
                lte: Math.min(5, preferences.difficultyLevel + 1),
              },
            },
          ],
        },
        select: {
          id: true,
          category: true,
          difficulty: true,
          tags: true,
          viewCount: true,
          likeCount: true,
        },
        take: 50,
      });

      // Calculate content scores based on user preferences
      return recommendations.map(content => {
        let score = 0;
        const reasons: string[] = [];

        // Category preference
        if (preferences.preferredCategories.includes(content.category)) {
          score += 10;
          reasons.push('Matches preferred category');
        }

        // Interest matching
        const matchingInterests = content.tags.filter(tag =>
          preferences.interests.some(interest =>
            interest.toLowerCase().includes(tag.toLowerCase()) ||
            tag.toLowerCase().includes(interest.toLowerCase())
          )
        );
        score += matchingInterests.length * 3;
        if (matchingInterests.length > 0) {
          reasons.push(`Matches interests: ${matchingInterests.join(', ')}`);
        }

        // Difficulty match
        const difficultyMatch = Math.abs(content.difficulty - preferences.difficultyLevel);
        score += Math.max(0, 5 - difficultyMatch);
        if (difficultyMatch === 0) {
          reasons.push('Perfect difficulty match');
        }

        // Popularity boost
        const popularityScore = Math.log(content.viewCount + content.likeCount + 1);
        score += popularityScore * 0.5;

        return {
          contentId: content.id,
          score,
          reasons,
          algorithm: 'content-based',
        };
      }).sort((a, b) => b.score - a.score);
    } catch (error) {
      logger.error('Content-based recommendations failed:', error);
      return [];
    }
  }

  /**
   * AI-generated recommendations using OpenAI
   */
  private static async getAIGeneratedRecommendations(
    userId: string,
    preferences: UserPreferences
  ): Promise<ContentScore[]> {
    try {
      // Get a sample of available content
      const availableContent = await db.prisma.culturalContent.findMany({
        where: {
          isActive: true,
          id: { notIn: preferences.interactionHistory.completedContent },
        },
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          tags: true,
          difficulty: true,
        },
        take: 100,
      });

      if (availableContent.length === 0) {
        return [];
      }

      // Prepare context for AI
      const userContext = {
        interests: preferences.interests,
        preferredCategories: preferences.preferredCategories,
        difficultyLevel: preferences.difficultyLevel,
        likedCategories: preferences.interactionHistory.likedCategories,
      };

      const contentSummary = availableContent.slice(0, 20).map(c => ({
        id: c.id,
        title: c.title,
        category: c.category,
        difficulty: c.difficulty,
        tags: c.tags.slice(0, 3), // Limit tags to save tokens
      }));

      const prompt = `Based on a user's cultural learning preferences, recommend content from the following list. 

User Profile:
- Interests: ${userContext.interests.join(', ')}
- Preferred Categories: ${userContext.preferredCategories.join(', ')}
- Difficulty Level: ${userContext.difficultyLevel}/5
- Previously Liked Categories: ${userContext.likedCategories.join(', ')}

Available Content:
${JSON.stringify(contentSummary, null, 2)}

Please recommend the top 10 pieces of content for this user. For each recommendation, provide:
1. Content ID
2. A score from 1-100
3. Brief reason for recommendation

Format as JSON array with objects containing: contentId, score, reason`;

      const completion = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          {
            role: 'system',
            content: 'You are a cultural education content recommendation AI. Provide personalized recommendations based on user preferences and learning patterns.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 2000,
        temperature: 0.7,
      });

      const aiResponse = completion.choices[0]?.message?.content;
      if (!aiResponse) {
        throw new Error('No AI response received');
      }

      // Parse AI recommendations
      const aiRecommendations = JSON.parse(aiResponse);
      
      return aiRecommendations.map((rec: any) => ({
        contentId: rec.contentId,
        score: rec.score / 10, // Normalize to 0-10 scale
        reasons: [rec.reason],
        algorithm: 'ai-generated',
      }));
    } catch (error) {
      logger.error('AI recommendations failed:', error);
      return [];
    }
  }

  /**
   * Trending recommendations
   * Based on popular content
   */
  private static async getTrendingRecommendations(
    userId: string,
    preferences: UserPreferences
  ): Promise<ContentScore[]> {
    try {
      const trending = await db.prisma.culturalContent.findMany({
        where: {
          isActive: true,
          id: { notIn: preferences.interactionHistory.completedContent },
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
        select: {
          id: true,
          viewCount: true,
          likeCount: true,
          shareCount: true,
          category: true,
          difficulty: true,
        },
        orderBy: [
          { viewCount: 'desc' },
          { likeCount: 'desc' },
        ],
        take: 30,
      });

      return trending.map(content => {
        let score = 0;
        const reasons: string[] = ['Currently trending'];

        // Base trending score
        score += Math.log(content.viewCount + 1) * 2;
        score += content.likeCount * 3;
        score += content.shareCount * 5;

        // Boost if matches user preferences
        if (preferences.preferredCategories.includes(content.category)) {
          score *= 1.5;
          reasons.push('Trending in preferred category');
        }

        // Difficulty preference
        const difficultyMatch = Math.abs(content.difficulty - preferences.difficultyLevel);
        if (difficultyMatch <= 1) {
          score *= 1.2;
        }

        return {
          contentId: content.id,
          score,
          reasons,
          algorithm: 'trending',
        };
      }).sort((a, b) => b.score - a.score);
    } catch (error) {
      logger.error('Trending recommendations failed:', error);
      return [];
    }
  }

  /**
   * Merge recommendations from different algorithms
   */
  private static mergeRecommendations(
    algorithmResults: Array<{
      algorithm: string;
      weight: number;
      recommendations: ContentScore[];
    }>
  ): ContentScore[] {
    const mergedScores = new Map<string, {
      totalScore: number;
      algorithms: string[];
      reasons: string[];
    }>();

    // Combine scores from all algorithms
    algorithmResults.forEach(({ algorithm, weight, recommendations }) => {
      recommendations.forEach(rec => {
        const current = mergedScores.get(rec.contentId) || {
          totalScore: 0,
          algorithms: [],
          reasons: [],
        };

        current.totalScore += rec.score * weight;
        current.algorithms.push(algorithm);
        current.reasons.push(...rec.reasons);

        mergedScores.set(rec.contentId, current);
      });
    });

    // Convert to ContentScore array
    return Array.from(mergedScores.entries())
      .map(([contentId, { totalScore, algorithms, reasons }]) => ({
        contentId,
        score: totalScore,
        reasons: [...new Set(reasons)], // Remove duplicates
        algorithm: algorithms.join(', '),
      }))
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Apply final ranking and filtering
   */
  private static async finalRanking(
    userId: string,
    recommendations: ContentScore[],
    limit: number
  ): Promise<ContentScore[]> {
    // Get additional content details for final filtering
    const contentIds = recommendations.map(r => r.contentId);
    const contentDetails = await db.prisma.culturalContent.findMany({
      where: {
        id: { in: contentIds },
        isActive: true,
      },
      select: {
        id: true,
        estimatedTime: true,
        difficulty: true,
        language: true,
        category: true,
      },
    });

    const contentMap = new Map(contentDetails.map(c => [c.id, c]));

    // Apply final filters and adjustments
    const finalRecommendations = recommendations
      .filter(rec => contentMap.has(rec.contentId))
      .map(rec => {
        const content = contentMap.get(rec.contentId)!;
        let adjustedScore = rec.score;

        // Boost shorter content for mobile consumption
        if (content.estimatedTime <= 60) {
          adjustedScore *= 1.1;
        }

        return { ...rec, score: adjustedScore };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return finalRecommendations;
  }

  /**
   * Store recommendations in database for analytics
   */
  private static async storeRecommendations(
    userId: string,
    recommendations: ContentScore[]
  ): Promise<void> {
    try {
      await db.prisma.userRecommendation.deleteMany({
        where: { userId },
      });

      await db.prisma.userRecommendation.createMany({
        data: recommendations.map(rec => ({
          userId,
          contentId: rec.contentId,
          score: rec.score,
          reason: rec.reasons.join('; '),
          algorithm: rec.algorithm,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        })),
      });
    } catch (error) {
      logger.error('Failed to store recommendations:', error);
    }
  }

  /**
   * Fallback recommendations when personalization fails
   */
  private static async getFallbackRecommendations(
    userId: string,
    limit: number
  ): Promise<ContentScore[]> {
    try {
      const fallback = await db.prisma.culturalContent.findMany({
        where: {
          isActive: true,
          isFeatured: true,
        },
        orderBy: [
          { viewCount: 'desc' },
          { likeCount: 'desc' },
        ],
        take: limit,
      });

      return fallback.map((content, index) => ({
        contentId: content.id,
        score: 10 - (index * 0.1), // Decreasing scores
        reasons: ['Featured content', 'Popular choice'],
        algorithm: 'fallback',
      }));
    } catch (error) {
      logger.error('Fallback recommendations failed:', error);
      return [];
    }
  }
}

export default RecommendationService;