import { Router } from 'express';
import { AuthController } from '@/controllers/authController';
import { authenticate, optionalAuth } from '@/middleware/auth';
import { rateLimiters } from '@/middleware/security';
import { validateRequest, userSchemas } from '@/utils/validation';

const router = Router();

/**
 * Authentication Routes
 * Base path: /api/v1/auth
 */

// User registration
router.post(
  '/register',
  rateLimiters.auth, // Rate limiting for auth endpoints
  validateRequest(userSchemas.register),
  AuthController.register
);

// User login
router.post(
  '/login',
  rateLimiters.auth,
  validateRequest(userSchemas.login),
  AuthController.login
);

// Refresh access token
router.post(
  '/refresh',
  rateLimiters.auth,
  validateRequest(
    userSchemas.register.pick({ refreshToken: true }).extend({
      refreshToken: userSchemas.register.shape.password, // Reuse password validation for token
    })
  ),
  AuthController.refreshToken
);

// Logout (requires authentication)
router.post(
  '/logout',
  authenticate,
  AuthController.logout
);

// Logout from all devices
router.post(
  '/logout-all',
  authenticate,
  AuthController.logoutAll
);

// Get current user profile
router.get(
  '/me',
  authenticate,
  AuthController.getProfile
);

export default router;