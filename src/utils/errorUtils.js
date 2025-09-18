/**
 * Create a custom error object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {string} code - Error code
 * @param {Object} details - Additional error details
 * @returns {Error} Custom error object
 */
const createError = (statusCode, message, code = null, details = null) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  error.details = details;
  error.isOperational = true;
  return error;
};

/**
 * Handle Mongoose validation errors
 * @param {Error} err - Mongoose validation error
 * @returns {Error} Formatted error
 */
const handleValidationError = (err) => {
  const errors = Object.values(err.errors).map(val => ({
    field: val.path,
    message: val.message,
    value: val.value
  }));
  
  return createError(400, 'Validation failed', 'VALIDATION_ERROR', { errors });
};

/**
 * Handle Mongoose duplicate key errors
 * @param {Error} err - Mongoose duplicate key error
 * @returns {Error} Formatted error
 */
const handleDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  
  return createError(409, `${field} '${value}' already exists`, 'DUPLICATE_KEY_ERROR', {
    field,
    value
  });
};

/**
 * Handle Mongoose cast errors
 * @param {Error} err - Mongoose cast error
 * @returns {Error} Formatted error
 */
const handleCastError = (err) => {
  return createError(400, `Invalid ${err.path}: ${err.value}`, 'CAST_ERROR', {
    field: err.path,
    value: err.value
  });
};

/**
 * Handle JWT errors
 * @param {Error} err - JWT error
 * @returns {Error} Formatted error
 */
const handleJWTError = (err) => {
  if (err.name === 'JsonWebTokenError') {
    return createError(401, 'Invalid token', 'INVALID_TOKEN');
  } else if (err.name === 'TokenExpiredError') {
    return createError(401, 'Token expired', 'TOKEN_EXPIRED');
  }
  return createError(401, 'Authentication failed', 'AUTH_ERROR');
};

/**
 * Format error response
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @returns {Object} Formatted error response
 */
const formatErrorResponse = (err, req) => {
  const response = {
    success: false,
    error: {
      message: err.message,
      code: err.code || 'INTERNAL_ERROR',
      statusCode: err.statusCode || 500
    }
  };

  // Add details in development or for validation errors
  if (process.env.NODE_ENV === 'development' || err.code === 'VALIDATION_ERROR') {
    if (err.details) {
      response.error.details = err.details;
    }
    
    if (err.stack && process.env.NODE_ENV === 'development') {
      response.error.stack = err.stack;
    }
  }

  // Add request ID if available
  if (req.requestId) {
    response.error.requestId = req.requestId;
  }

  return response;
};

/**
 * Check if error is operational (known error)
 * @param {Error} error - Error object
 * @returns {boolean} Is operational error
 */
const isOperationalError = (error) => {
  return error.isOperational === true;
};

module.exports = {
  createError,
  handleValidationError,
  handleDuplicateKeyError,
  handleCastError,
  handleJWTError,
  formatErrorResponse,
  isOperationalError
};