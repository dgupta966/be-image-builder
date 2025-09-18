const crypto = require('crypto');
const { User } = require('../models');
const jwtService = require('../utils/jwtService');
const googleAuthService = require('../services/googleAuthService');
const emailService = require('../services/emailService');
const auditLogService = require('../services/auditLogService');
const { createError } = require('../utils/errorUtils');

class AuthController {
  /**
   * User signup with email and password
   */
  static async signup(req, res, next) {
    try {
      const { name, email, password } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return next(createError(409, 'User with this email already exists'));
      }

      // Create new user
      const user = new User({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password,
        isEmailVerified: false
      });

      // Generate email verification token
      const verificationToken = user.createEmailVerificationToken();
      await user.save();

      // Send verification email (don't wait for it)
      if (emailService.isConfigured()) {
        emailService.sendEmailVerification(user.email, verificationToken, user.name)
          .catch(error => console.error('Failed to send verification email:', error));
      }

      // Generate JWT tokens
      const tokens = jwtService.generateTokens(user);

      // Log the signup
      await auditLogService.logCreate({
        userId: user._id,
        entity: 'User',
        entityId: user._id,
        data: {
          name: user.name,
          email: user.email,
          role: user.role
        },
        req,
        description: 'User signed up with email and password'
      });

      res.status(201).json({
        success: true,
        message: 'User registered successfully. Please check your email for verification.',
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
      next(error);
    }
  }

  /**
   * User signin with email and password
   */
  static async signin(req, res, next) {
    try {
      const { email, password } = req.body;

      // Find user and include password field
      const user = await User.findOne({ email: email.toLowerCase() }).select('+password +loginAttempts +lockUntil');
      
      if (!user) {
        return next(createError(401, 'Invalid email or password'));
      }

      // Check if account is locked
      if (user.isLocked) {
        return next(createError(423, 'Account is temporarily locked due to multiple failed login attempts'));
      }

      // Check if account is active
      if (!user.isActive) {
        return next(createError(401, 'Account is deactivated'));
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      
      if (!isPasswordValid) {
        // Increment failed login attempts
        await user.incLoginAttempts();
        return next(createError(401, 'Invalid email or password'));
      }

      // Reset login attempts on successful login
      if (user.loginAttempts > 0) {
        await user.resetLoginAttempts();
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate JWT tokens
      const tokens = jwtService.generateTokens(user);

      // Log the signin
      await auditLogService.logRead({
        userId: user._id,
        entity: 'User',
        entityId: user._id,
        req,
        description: 'User signed in with email and password'
      });

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
            isEmailVerified: user.isEmailVerified,
            lastLogin: user.lastLogin
          },
          ...tokens
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Google authentication - verify token from frontend
   */
  static async googleAuth(req, res, next) {
    try {
      const { token } = req.body;

      if (!token) {
        return next(createError(400, 'Google token is required'));
      }

      // Verify Google token
      const googleUser = await googleAuthService.verifyGoogleToken(token);

      // Check if user exists by email or Google ID
      let user = await User.findOne({
        $or: [
          { email: googleUser.email },
          { googleId: googleUser.googleId }
        ]
      });

      let isNewUser = false;

      if (!user) {
        // Create new user from Google data
        user = new User({
          name: googleUser.name,
          email: googleUser.email,
          googleId: googleUser.googleId,
          avatar: googleUser.avatar,
          isEmailVerified: googleUser.isEmailVerified,
          role: 'user'
        });
        
        await user.save();
        isNewUser = true;

        // Log user creation
        await auditLogService.logCreate({
          userId: user._id,
          entity: 'User',
          entityId: user._id,
          data: {
            name: user.name,
            email: user.email,
            googleId: user.googleId,
            role: user.role
          },
          req,
          description: 'User signed up with Google OAuth'
        });
      } else {
        // Update existing user with Google data if needed
        let shouldUpdate = false;
        
        if (!user.googleId) {
          user.googleId = googleUser.googleId;
          shouldUpdate = true;
        }
        
        if (!user.avatar && googleUser.avatar) {
          user.avatar = googleUser.avatar;
          shouldUpdate = true;
        }
        
        if (!user.isEmailVerified && googleUser.isEmailVerified) {
          user.isEmailVerified = googleUser.isEmailVerified;
          shouldUpdate = true;
        }

        if (shouldUpdate) {
          await user.save();
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Log the signin
        await auditLogService.logRead({
          userId: user._id,
          entity: 'User',
          entityId: user._id,
          req,
          description: 'User signed in with Google OAuth'
        });
      }

      // Check if account is active
      if (!user.isActive) {
        return next(createError(401, 'Account is deactivated'));
      }

      // Generate JWT tokens
      const tokens = jwtService.generateTokens(user);

      res.status(200).json({
        success: true,
        message: isNewUser ? 'Account created and login successful' : 'Login successful',
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
            isEmailVerified: user.isEmailVerified,
            lastLogin: user.lastLogin
          },
          ...tokens,
          isNewUser
        }
      });
    } catch (error) {
      if (error.message.includes('Google')) {
        return next(createError(400, error.message));
      }
      next(error);
    }
  }

  /**
   * Forgot password - send reset email
   */
  static async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;

      const user = await User.findOne({ email: email.toLowerCase() });
      
      if (!user) {
        // Don't reveal if user exists or not for security
        return res.status(200).json({
          success: true,
          message: 'If a user with that email exists, a password reset link has been sent.'
        });
      }

      // Check if account is active
      if (!user.isActive) {
        return res.status(200).json({
          success: true,
          message: 'If a user with that email exists, a password reset link has been sent.'
        });
      }

      // Generate reset token
      const resetToken = user.createPasswordResetToken();
      await user.save({ validateBeforeSave: false });

      // Send reset email
      if (emailService.isConfigured()) {
        try {
          await emailService.sendPasswordResetEmail(user.email, resetToken, user.name);
          
          // Log the password reset request
          await auditLogService.logUpdate({
            userId: user._id,
            entity: 'User',
            entityId: user._id,
            before: { passwordResetRequested: false },
            after: { passwordResetRequested: true },
            req,
            description: 'Password reset requested'
          });

        } catch (emailError) {
          console.error('Failed to send password reset email:', emailError);
          // Reset the token if email failed
          user.passwordResetToken = undefined;
          user.passwordResetTokenExpires = undefined;
          await user.save({ validateBeforeSave: false });
          
          return next(createError(500, 'Failed to send password reset email. Please try again.'));
        }
      } else {
        return next(createError(500, 'Email service is not configured'));
      }

      res.status(200).json({
        success: true,
        message: 'Password reset link has been sent to your email.'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reset password with token
   */
  static async resetPassword(req, res, next) {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return next(createError(400, 'Token and new password are required'));
      }

      // Hash the token
      const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

      // Find user with valid reset token
      const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetTokenExpires: { $gt: Date.now() }
      });

      if (!user) {
        return next(createError(400, 'Invalid or expired password reset token'));
      }

      // Check if account is active
      if (!user.isActive) {
        return next(createError(401, 'Account is deactivated'));
      }

      // Update password and clear reset token
      user.password = password;
      user.passwordResetToken = undefined;
      user.passwordResetTokenExpires = undefined;
      
      // Reset login attempts if any
      if (user.loginAttempts > 0) {
        await user.resetLoginAttempts();
      }

      await user.save();

      // Log the password reset
      await auditLogService.logUpdate({
        userId: user._id,
        entity: 'User',
        entityId: user._id,
        before: { passwordReset: false },
        after: { passwordReset: true },
        req,
        description: 'Password reset completed'
      });

      res.status(200).json({
        success: true,
        message: 'Password has been reset successfully. Please login with your new password.'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user profile
   */
  static async getProfile(req, res, next) {
    try {
      const user = req.user;

      // Log profile access
      await auditLogService.logRead({
        userId: user._id,
        entity: 'User',
        entityId: user._id,
        req,
        description: 'User accessed their profile'
      });

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
            isEmailVerified: user.isEmailVerified,
            lastLogin: user.lastLogin,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(req, res, next) {
    try {
      const { name, avatar } = req.body;
      const user = req.user;

      // Store original data for audit log
      const originalData = {
        name: user.name,
        avatar: user.avatar
      };

      // Update allowed fields
      if (name !== undefined) user.name = name.trim();
      if (avatar !== undefined) user.avatar = avatar;

      await user.save();

      // Log the profile update
      await auditLogService.logUpdate({
        userId: user._id,
        entity: 'User',
        entityId: user._id,
        before: originalData,
        after: {
          name: user.name,
          avatar: user.avatar
        },
        req,
        description: 'User updated their profile'
      });

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
            isEmailVerified: user.isEmailVerified,
            lastLogin: user.lastLogin,
            updatedAt: user.updatedAt
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Change password (for authenticated users)
   */
  static async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = await User.findById(req.user._id).select('+password');

      // Verify current password
      if (user.password) {
        const isCurrentPasswordValid = await user.comparePassword(currentPassword);
        if (!isCurrentPasswordValid) {
          return next(createError(400, 'Current password is incorrect'));
        }
      } else {
        // User signed up with Google, no current password
        if (currentPassword) {
          return next(createError(400, 'You signed up with Google. Current password is not required.'));
        }
      }

      // Update password
      user.password = newPassword;
      await user.save();

      // Log the password change
      await auditLogService.logUpdate({
        userId: user._id,
        entity: 'User',
        entityId: user._id,
        before: { passwordChanged: false },
        after: { passwordChanged: true },
        req,
        description: 'User changed their password'
      });

      res.status(200).json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Logout (invalidate token - client-side implementation recommended)
   */
  static async logout(req, res, next) {
    try {
      // Log the logout
      await auditLogService.logRead({
        userId: req.user._id,
        entity: 'User',
        entityId: req.user._id,
        req,
        description: 'User logged out'
      });

      res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;