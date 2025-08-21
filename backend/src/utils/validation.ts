import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger';

// Common validation schemas for mobile optimization
export const commonSchemas = {
  // Pagination for mobile feeds
  pagination: z.object({
    page: z.string().transform(Number).default('1'),
    limit: z.string().transform(Number).pipe(z.number().min(1).max(50)).default('20'),
    offset: z.string().transform(Number).optional(),
  }),

  // User identification
  userId: z.string().cuid(),
  contentId: z.string().cuid(),
  
  // Mobile device info
  deviceInfo: z.object({
    deviceType: z.enum(['ios', 'android']).optional(),
    appVersion: z.string().optional(),
    osVersion: z.string().optional(),
    deviceModel: z.string().optional(),
  }),

  // Language and localization
  language: z.enum(['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh']).default('en'),
  
  // Content categories
  contentCategory: z.enum([
    'HISTORY', 'ART', 'MUSIC', 'LITERATURE', 'ARCHITECTURE', 
    'POPULAR_CULTURE', 'MYTHOLOGY', 'TRADITIONS', 'FOOD_CULTURE', 'PHILOSOPHY'
  ]),
};

// User validation schemas
export const userSchemas = {
  register: z.object({
    email: z.string().email().toLowerCase(),
    username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
    password: z.string().min(8).max(100),
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().min(1).max(50).optional(),
    dateOfBirth: z.string().datetime().optional(),
    country: z.string().min(2).max(2).optional(), // ISO country code
    language: commonSchemas.language,
  }),

  login: z.object({
    email: z.string().email().toLowerCase(),
    password: z.string().min(1),
    deviceInfo: commonSchemas.deviceInfo.optional(),
  }),

  updateProfile: z.object({
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().min(1).max(50).optional(),
    bio: z.string().max(500).optional(),
    interests: z.array(z.string()).max(10).optional(),
    preferredCategories: z.array(commonSchemas.contentCategory).max(5).optional(),
    difficultyLevel: z.number().int().min(1).max(5).optional(),
    dailyGoalMinutes: z.number().int().min(5).max(180).optional(),
    notificationsEnabled: z.boolean().optional(),
    publicProfile: z.boolean().optional(),
    language: commonSchemas.language.optional(),
  }),
};

// Content validation schemas
export const contentSchemas = {
  create: z.object({
    title: z.string().min(1).max(200),
    description: z.string().min(1).max(1000),
    content: z.record(z.any()), // Flexible JSON content
    category: commonSchemas.contentCategory,
    subcategory: z.string().max(100).optional(),
    difficulty: z.number().int().min(1).max(5).default(1),
    estimatedTime: z.number().int().min(10).max(600).default(60), // seconds
    tags: z.array(z.string().max(50)).max(10).default([]),
    language: commonSchemas.language,
  }),

  update: z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().min(1).max(1000).optional(),
    content: z.record(z.any()).optional(),
    category: commonSchemas.contentCategory.optional(),
    subcategory: z.string().max(100).optional(),
    difficulty: z.number().int().min(1).max(5).optional(),
    estimatedTime: z.number().int().min(10).max(600).optional(),
    tags: z.array(z.string().max(50)).max(10).optional(),
    isActive: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
  }),

  query: z.object({
    category: commonSchemas.contentCategory.optional(),
    difficulty: z.string().transform(Number).pipe(z.number().int().min(1).max(5)).optional(),
    language: commonSchemas.language.optional(),
    tags: z.string().transform(tags => tags.split(',').filter(Boolean)).optional(),
    search: z.string().max(100).optional(),
    featured: z.string().transform(val => val === 'true').optional(),
  }).merge(commonSchemas.pagination),
};

// Interaction validation schemas
export const interactionSchemas = {
  create: z.object({
    contentId: commonSchemas.contentId,
    type: z.enum(['VIEW', 'LIKE', 'DISLIKE', 'SAVE', 'SHARE', 'COMPLETE', 'SKIP']),
    value: z.record(z.any()).optional(), // Additional data
  }),

  progress: z.object({
    contentId: commonSchemas.contentId,
    status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED']),
    timeSpent: z.number().int().min(0).optional(),
    score: z.number().int().min(0).max(100).optional(),
    completionRate: z.number().min(0).max(1).optional(),
  }),
};

// Analytics validation schemas
export const analyticsSchemas = {
  session: z.object({
    sessionDuration: z.number().int().min(0),
    contentViewed: z.number().int().min(0),
    contentCompleted: z.number().int().min(0),
    categoriesExplored: z.array(z.string()).max(10),
    deviceType: z.enum(['ios', 'android', 'web']).optional(),
    appVersion: z.string().optional(),
  }),
};

// Validation middleware factory
export function validateRequest(schema: z.ZodSchema, source: 'body' | 'params' | 'query' = 'body') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req[source];
      const validated = await schema.parseAsync(data);
      req[source] = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn('Validation error:', {
          source,
          errors: error.errors,
          data: req[source],
        });
        
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code,
          })),
        });
      }
      
      logger.error('Unexpected validation error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal validation error',
      });
    }
  };
}

// Common validation helpers for mobile optimization
export const validationHelpers = {
  // Validate mobile image upload
  validateImageFile: (file: Express.Multer.File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.');
    }
    
    if (file.size > maxSize) {
      throw new Error('File too large. Maximum size is 5MB.');
    }
    
    return true;
  },

  // Validate array of content IDs for batch operations
  validateContentIds: (ids: string[]) => {
    const schema = z.array(commonSchemas.contentId).min(1).max(50);
    return schema.parse(ids);
  },

  // Validate mobile-friendly pagination
  validateMobilePagination: (page: number, limit: number) => {
    if (page < 1) throw new Error('Page must be greater than 0');
    if (limit < 1 || limit > 50) throw new Error('Limit must be between 1 and 50');
    return { page, limit };
  },
};

export default {
  commonSchemas,
  userSchemas,
  contentSchemas,
  interactionSchemas,
  analyticsSchemas,
  validateRequest,
  validationHelpers,
};