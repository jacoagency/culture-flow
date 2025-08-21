import { Router } from 'express';
import { InteractionController } from '@/controllers/interactionController';
import { authenticate } from '@/middleware/auth';
import { rateLimiters } from '@/middleware/security';
import { validateRequest, interactionSchemas, commonSchemas } from '@/utils/validation';
import { z } from 'zod';

const router = Router();

/**
 * Content Interaction Routes
 * Base path: /api/v1/interactions
 * All routes require authentication
 */

// Create or update content interaction
router.post(
  '/',
  authenticate,
  rateLimiters.general,
  validateRequest(interactionSchemas.create),
  InteractionController.createInteraction
);

// Update user progress for specific content
router.post(
  '/progress',
  authenticate,
  rateLimiters.general,
  validateRequest(interactionSchemas.progress),
  InteractionController.updateProgress
);

// Get user's interactions with specific content
router.get(
  '/:contentId',
  authenticate,
  rateLimiters.general,
  validateRequest(
    z.object({
      contentId: commonSchemas.contentId,
    }),
    'params'
  ),
  InteractionController.getUserInteractions
);

// Get user's saved content
router.get(
  '/saved/content',
  authenticate,
  rateLimiters.general,
  validateRequest(commonSchemas.pagination, 'query'),
  InteractionController.getSavedContent
);

export default router;