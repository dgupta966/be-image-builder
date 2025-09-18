const jwtService = require('../utils/jwtService');
const { User } = require('../models');
const { createError } = require('../utils/errorUtils');

/**
 * Authentication middleware to verify JWT tokens
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    const token = jwtService.extractToken(authHeader);

    if (!token) {
      return next(createError(401, 'Access token is required'));
    }

    // Verify token
    const decoded = await jwtService.verifyAccessToken(token);

    // Get user from database
    const user = await User.findById(decoded.id).select('+isActive');
    
    if (!user) {
      return next(createError(401, 'User not found or token is invalid'));
    }

    if (!user.isActive) {
      return next(createError(401, 'Account is deactivated'));
    }

    // Check if user account is locked
    if (user.isLocked) {
      return next(createError(423, 'Account is temporarily locked due to multiple failed login attempts'));
    }

    // Attach user to request
    req.user = user;
    req.token = token;
    
    next();
  } catch (error) {
    if (error.message.includes('expired')) {
      return next(createError(401, 'Access token has expired'));
    } else if (error.message.includes('invalid')) {
      return next(createError(401, 'Invalid access token'));
    }
    
    return next(createError(401, 'Authentication failed'));
  }
};

/**
 * Optional authentication middleware (user can be authenticated or not)
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = jwtService.extractToken(authHeader);

    if (!token) {
      // No token provided, continue without authentication
      return next();
    }

    // If token is provided, verify it
    const decoded = await jwtService.verifyAccessToken(token);
    const user = await User.findById(decoded.id).select('+isActive');

    if (user && user.isActive && !user.isLocked) {
      req.user = user;
      req.token = token;
    }

    next();
  } catch (error) {
    // If token is invalid, continue without authentication
    // Don't throw error for optional auth
    next();
  }
};

/**
 * Authorization middleware to check user roles
 * @param {...string} roles - Required roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(createError(401, 'Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(createError(403, 'Insufficient permissions'));
    }

    next();
  };
};

/**
 * Middleware to check if user owns the resource
 * @param {string} userIdField - Field name in req.params that contains user ID
 */
const checkOwnership = (userIdField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return next(createError(401, 'Authentication required'));
    }

    const resourceUserId = req.params[userIdField];
    const currentUserId = req.user._id.toString();

    // Admin can access any resource
    if (req.user.role === 'admin') {
      return next();
    }

    // User can only access their own resources
    if (resourceUserId !== currentUserId) {
      return next(createError(403, 'Access denied. You can only access your own resources.'));
    }

    next();
  };
};

/**
 * Middleware to refresh access token using refresh token
 */
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return next(createError(400, 'Refresh token is required'));
    }

    // Verify refresh token
    const decoded = await jwtService.verifyRefreshToken(refreshToken);

    // Get user from database
    const user = await User.findById(decoded.id);
    
    if (!user || !user.isActive) {
      return next(createError(401, 'Invalid refresh token or user not found'));
    }

    // Generate new tokens
    const tokens = jwtService.generateTokens(user);

    res.status(200).json({
      success: true,
      message: 'Tokens refreshed successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          isEmailVerified: user.isEmailVerified
        },
        ...tokens
      }
    });
  } catch (error) {
    if (error.message.includes('expired')) {
      return next(createError(401, 'Refresh token has expired'));
    } else if (error.message.includes('invalid')) {
      return next(createError(401, 'Invalid refresh token'));
    }
    
    return next(createError(401, 'Token refresh failed'));
  }
};

/**
 * Middleware to check if user is verified
 */
const requireEmailVerification = (req, res, next) => {
  if (!req.user) {
    return next(createError(401, 'Authentication required'));
  }

  if (!req.user.isEmailVerified) {
    return next(createError(403, 'Email verification required'));
  }

  next();
};

module.exports = {
  authenticate,
  optionalAuth,
  authorize,
  checkOwnership,
  refreshToken,
  requireEmailVerification
};