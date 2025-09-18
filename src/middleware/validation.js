const Joi = require('joi');
const { createError } = require('../utils/errorUtils');

/**
 * Validation middleware factory
 * @param {Object} schema - Joi validation schema
 * @param {string} property - Request property to validate ('body', 'params', 'query')
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false, // Return all errors
      allowUnknown: false, // Don't allow unknown fields
      stripUnknown: true // Remove unknown fields
    });

    if (error) {
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context.value
      }));

      return next(createError(400, 'Validation failed', 'VALIDATION_ERROR', {
        errors: validationErrors
      }));
    }

    // Replace request property with validated value
    req[property] = value;
    next();
  };
};

// Common validation schemas
const schemas = {
  // Authentication schemas
  signup: Joi.object({
    name: Joi.string()
      .trim()
      .min(2)
      .max(50)
      .required()
      .messages({
        'string.min': 'Name must be at least 2 characters long',
        'string.max': 'Name cannot exceed 50 characters',
        'any.required': 'Name is required'
      }),
    email: Joi.string()
      .email()
      .lowercase()
      .trim()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      }),
    password: Joi.string()
      .min(6)
      .max(128)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .required()
      .messages({
        'string.min': 'Password must be at least 6 characters long',
        'string.max': 'Password cannot exceed 128 characters',
        'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, and one number',
        'any.required': 'Password is required'
      })
  }),

  signin: Joi.object({
    email: Joi.string()
      .email()
      .lowercase()
      .trim()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      }),
    password: Joi.string()
      .required()
      .messages({
        'any.required': 'Password is required'
      })
  }),

  googleAuth: Joi.object({
    token: Joi.string()
      .required()
      .messages({
        'any.required': 'Google token is required'
      })
  }),

  forgotPassword: Joi.object({
    email: Joi.string()
      .email()
      .lowercase()
      .trim()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      })
  }),

  resetPassword: Joi.object({
    token: Joi.string()
      .required()
      .messages({
        'any.required': 'Reset token is required'
      }),
    password: Joi.string()
      .min(6)
      .max(128)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .required()
      .messages({
        'string.min': 'Password must be at least 6 characters long',
        'string.max': 'Password cannot exceed 128 characters',
        'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, and one number',
        'any.required': 'Password is required'
      })
  }),

  updateProfile: Joi.object({
    name: Joi.string()
      .trim()
      .min(2)
      .max(50)
      .optional()
      .messages({
        'string.min': 'Name must be at least 2 characters long',
        'string.max': 'Name cannot exceed 50 characters'
      }),
    avatar: Joi.string()
      .uri()
      .optional()
      .allow('')
      .messages({
        'string.uri': 'Avatar must be a valid URL'
      })
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string()
      .optional()
      .allow('')
      .messages({
        'string.base': 'Current password must be a string'
      }),
    newPassword: Joi.string()
      .min(6)
      .max(128)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .required()
      .messages({
        'string.min': 'New password must be at least 6 characters long',
        'string.max': 'New password cannot exceed 128 characters',
        'string.pattern.base': 'New password must contain at least one lowercase letter, one uppercase letter, and one number',
        'any.required': 'New password is required'
      })
  }),

  refreshToken: Joi.object({
    refreshToken: Joi.string()
      .required()
      .messages({
        'any.required': 'Refresh token is required'
      })
  }),

  // Audit log schemas
  auditQuery: Joi.object({
    page: Joi.number()
      .integer()
      .min(1)
      .default(1)
      .optional(),
    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(20)
      .optional(),
    action: Joi.string()
      .valid('CREATE', 'READ', 'UPDATE', 'DELETE')
      .uppercase()
      .optional(),
    entity: Joi.string()
      .trim()
      .optional(),
    entityId: Joi.string()
      .trim()
      .optional(),
    userId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .optional()
      .messages({
        'string.pattern.base': 'User ID must be a valid MongoDB ObjectId'
      }),
    startDate: Joi.date()
      .iso()
      .optional(),
    endDate: Joi.date()
      .iso()
      .min(Joi.ref('startDate'))
      .optional()
      .messages({
        'date.min': 'End date must be after start date'
      })
  }),

  auditParams: Joi.object({
    entity: Joi.string()
      .trim()
      .required()
      .messages({
        'any.required': 'Entity is required'
      }),
    entityId: Joi.string()
      .trim()
      .required()
      .messages({
        'any.required': 'Entity ID is required'
      })
  }),

  userIdParam: Joi.object({
    userId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        'string.pattern.base': 'User ID must be a valid MongoDB ObjectId',
        'any.required': 'User ID is required'
      })
  }),

  logIdParam: Joi.object({
    logId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        'string.pattern.base': 'Log ID must be a valid MongoDB ObjectId',
        'any.required': 'Log ID is required'
      })
  }),

  exportQuery: Joi.object({
    format: Joi.string()
      .valid('json', 'csv')
      .default('json')
      .optional(),
    startDate: Joi.date()
      .iso()
      .optional(),
    endDate: Joi.date()
      .iso()
      .min(Joi.ref('startDate'))
      .optional(),
    action: Joi.string()
      .valid('CREATE', 'READ', 'UPDATE', 'DELETE')
      .uppercase()
      .optional(),
    entity: Joi.string()
      .trim()
      .optional(),
    userId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .optional()
  })
};

// Export validation functions for specific routes
const validators = {
  // Auth validators
  validateSignup: validate(schemas.signup),
  validateSignin: validate(schemas.signin),
  validateGoogleAuth: validate(schemas.googleAuth),
  validateForgotPassword: validate(schemas.forgotPassword),
  validateResetPassword: validate(schemas.resetPassword),
  validateUpdateProfile: validate(schemas.updateProfile),
  validateChangePassword: validate(schemas.changePassword),
  validateRefreshToken: validate(schemas.refreshToken),

  // Audit validators
  validateAuditQuery: validate(schemas.auditQuery, 'query'),
  validateAuditParams: validate(schemas.auditParams, 'params'),
  validateUserIdParam: validate(schemas.userIdParam, 'params'),
  validateLogIdParam: validate(schemas.logIdParam, 'params'),
  validateExportQuery: validate(schemas.exportQuery, 'query')
};

module.exports = {
  validate,
  schemas,
  validators
};