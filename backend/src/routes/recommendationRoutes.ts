import { Router } from 'express';
import { RecommendationController } from '@/controllers/recommendationController';
import { authenticate } from '@/middleware/auth';
import { rateLimiters } from '@/middleware/security';
import { validateRequest, commonSchemas } from '@/utils/validation';
import { z } from 'zod';

const router = Router();

/**
 * Recommendation Routes
 * Base path: /api/v1/recommendations
 * All routes require authentication
 */

// Get personalized recommendations
router.get(
  '/',
  authenticate,
  rateLimiters.general,
  validateRequest(
    z.object({
      limit: z.string().transform(Number).pipe(z.number().min(1).max(50)).default('20'),
      refresh: z.enum(['true', 'false']).default('false'),
    }),
    'query'
  ),
  RecommendationController.getRecommendations
);

// Track recommendation interaction
router.post(
  '/interact',
  authenticate,
  rateLimiters.general,
  validateRequest(
    z.object({
      contentId: commonSchemas.contentId,
      action: z.enum(['click', 'dismiss', 'share']),
    })
  ),
  RecommendationController.trackRecommendationInteraction
);

// Get recommendation analytics
router.get(
  '/analytics',
  authenticate,
  rateLimiters.general,
  validateRequest(
    z.object({
      days: z.string().transform(Number).pipe(z.number().min(1).max(30)).default('7'),
    }),
    'query'
  ),
  RecommendationController.getRecommendationAnalytics
);

export default router;