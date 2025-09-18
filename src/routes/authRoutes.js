const express = require('express');
const AuthController = require('../controllers/authController');
const { authenticate, refreshToken } = require('../middleware/authMiddleware');
const { validators } = require('../middleware/validation');

const router = express.Router();

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user with email and password
 * @access  Public
 */
router.post('/signup', 
  validators.validateSignup,
  AuthController.signup
);

/**
 * @route   POST /api/auth/signin
 * @desc    Login user with email and password
 * @access  Public
 */
router.post('/signin', 
  validators.validateSignin,
  AuthController.signin
);

/**
 * @route   POST /api/auth/google
 * @desc    Authenticate user with Google token
 * @access  Public
 */
router.post('/google', 
  validators.validateGoogleAuth,
  AuthController.googleAuth
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Send password reset email
 * @access  Public
 */
router.post('/forgot-password', 
  validators.validateForgotPassword,
  AuthController.forgotPassword
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password using token
 * @access  Public
 */
router.post('/reset-password', 
  validators.validateResetPassword,
  AuthController.resetPassword
);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post('/refresh-token', 
  validators.validateRefreshToken,
  refreshToken
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', 
  authenticate,
  AuthController.getProfile
);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile (alternative endpoint)
 * @access  Private
 */
router.get('/profile', 
  authenticate,
  AuthController.getProfile
);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', 
  authenticate,
  validators.validateUpdateProfile,
  AuthController.updateProfile
);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post('/change-password', 
  authenticate,
  validators.validateChangePassword,
  AuthController.changePassword
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client should delete tokens)
 * @access  Private
 */
router.post('/logout', 
  authenticate,
  AuthController.logout
);

module.exports = router;