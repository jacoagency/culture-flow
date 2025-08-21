import { Router } from 'express';
import { ContentController } from '@/controllers/contentController';
import { authenticate, optionalAuth } from '@/middleware/auth';
import { rateLimiters } from '@/middleware/security';
import { validateRequest, contentSchemas, commonSchemas } from '@/utils/validation';
import { z } from 'zod';

const router = Router();

/**
 * Cultural Content Routes
 * Base path: /api/v1/content
 */

// Get content feed (personalized if authenticated)
router.get(
  '/feed',
  optionalAuth, // Optional authentication for personalization
  rateLimiters.feed, // More lenient rate limiting for feed
  validateRequest(contentSchemas.query, 'query'),
  ContentController.getFeed
);

// Search content
router.get(
  '/search',
  optionalAuth,
  rateLimiters.general,
  validateRequest(
    contentSchemas.query.extend({
      q: commonSchemas.contentCategory.or(z.string().min(2)), // Search query
    }),
    'query'
  ),
  ContentController.searchContent
);

// Get trending content
router.get(
  '/trending',
  optionalAuth,
  rateLimiters.feed,
  validateRequest(
    z.object({
      period: z.enum(['1h', '24h', '7d']).default('24h'),
      category: commonSchemas.contentCategory.optional(),
      language: commonSchemas.language.optional(),
      limit: z.string().transform(Number).pipe(z.number().min(1).max(50)).default('20'),
    }),
    'query'
  ),
  ContentController.getTrendingContent
);

// Get content by category
router.get(
  '/category/:category',
  optionalAuth,
  rateLimiters.feed,
  validateRequest(
    z.object({
      category: commonSchemas.contentCategory,
    }),
    'params'
  ),
  validateRequest(
    contentSchemas.query.omit({ category: true }),
    'query'
  ),
  ContentController.getContentByCategory
);

// Get specific content by ID
router.get(
  '/:id',
  optionalAuth,
  rateLimiters.general,
  validateRequest(
    z.object({
      id: commonSchemas.contentId,
    }),
    'params'
  ),
  ContentController.getContentById
);

export default router;