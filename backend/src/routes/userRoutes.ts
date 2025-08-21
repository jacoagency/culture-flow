import { Router } from 'express';
import multer from 'multer';
import { UserController } from '@/controllers/userController';
import { authenticate } from '@/middleware/auth';
import { rateLimiters } from '@/middleware/security';
import { validateRequest, userSchemas, commonSchemas } from '@/utils/validation';
import { config } from '@/config';

const router = Router();

// Configure multer for file uploads (avatar)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.mobile.maxImageSize, // 5MB
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
    }
  },
});

/**
 * User Management Routes
 * Base path: /api/v1/users
 * All routes require authentication
 */

// Update user profile
router.put(
  '/profile',
  authenticate,
  rateLimiters.general,
  validateRequest(userSchemas.updateProfile),
  UserController.updateProfile
);

// Upload user avatar
router.post(
  '/avatar',
  authenticate,
  rateLimiters.upload, // Special rate limiting for uploads
  upload.single('avatar'),
  UserController.uploadAvatar
);

// Get user statistics and progress
router.get(
  '/stats',
  authenticate,
  rateLimiters.general,
  UserController.getUserStats
);

// Get user achievements
router.get(
  '/achievements',
  authenticate,
  rateLimiters.general,
  validateRequest(commonSchemas.pagination, 'query'),
  UserController.getAchievements
);

// Update user settings
router.patch(
  '/settings',
  authenticate,
  rateLimiters.general,
  validateRequest(
    userSchemas.updateProfile.pick({
      language: true,
      notificationsEnabled: true,
      publicProfile: true,
      dailyGoalMinutes: true,
      difficultyLevel: true,
    }).extend({
      timeZone: userSchemas.register.shape.country.optional(), // Reuse country validation for timezone
    })
  ),
  UserController.updateSettings
);

// Delete user account (requires password confirmation)
router.delete(
  '/account',
  authenticate,
  rateLimiters.auth, // Use auth rate limiting for sensitive operations
  validateRequest(
    userSchemas.register.pick({ password: true })
  ),
  UserController.deleteAccount
);

export default router;