const mongoose = require('mongoose');
const {
  handleValidationError,
  handleDuplicateKeyError,
  handleCastError,
  handleJWTError,
  formatErrorResponse,
  isOperationalError
} = require('../utils/errorUtils');

/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error details
  console.error(`Error: ${error.message}`);
  
  if (process.env.NODE_ENV === 'development') {
    console.error(error.stack);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    error = handleValidationError(err);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    error = handleDuplicateKeyError(err);
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    error = handleCastError(err);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    error = handleJWTError(err);
  }

  // Default to 500 server error
  if (!error.statusCode) {
    error.statusCode = 500;
    error.message = 'Internal Server Error';
    error.code = 'INTERNAL_ERROR';
  }

  // Format error response
  const errorResponse = formatErrorResponse(error, req);

  // Send error response
  res.status(error.statusCode).json(errorResponse);
};

/**
 * 404 Not Found handler
 */
const notFound = (req, res, next) => {
  const message = `Route ${req.originalUrl} not found`;
  res.status(404).json({
    success: false,
    error: {
      message,
      code: 'NOT_FOUND',
      statusCode: 404,
      requestId: req.requestId
    }
  });
};

/**
 * Async error wrapper for route handlers
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Development error handler (with stack trace)
 */
const developmentErrorHandler = (err, req, res, next) => {
  const error = { ...err };
  error.message = err.message;

  console.error('Error Details:', {
    message: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
    user: req.user ? { id: req.user._id, email: req.user.email } : null
  });

  // Use the same error handling logic but include stack trace
  errorHandler(err, req, res, next);
};

/**
 * Production error handler (no stack trace)
 */
const productionErrorHandler = (err, req, res, next) => {
  // Only log operational errors in production
  if (isOperationalError(err)) {
    console.error('Operational Error:', {
      message: err.message,
      code: err.code,
      statusCode: err.statusCode,
      url: req.originalUrl,
      method: req.method,
      user: req.user ? { id: req.user._id, email: req.user.email } : null
    });
  } else {
    // Log full details for programming errors
    console.error('Programming Error:', {
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method
    });
  }

  errorHandler(err, req, res, next);
};

/**
 * Handle uncaught exceptions
 */
const handleUncaughtException = () => {
  process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.error(err.name, err.message);
    console.error(err.stack);
    process.exit(1);
  });
};

/**
 * Handle unhandled promise rejections
 */
const handleUnhandledRejection = (server) => {
  process.on('unhandledRejection', (err, promise) => {
    console.error('UNHANDLED REJECTION! 💥 Shutting down...');
    console.error(err.name, err.message);
    console.error(err.stack);
    
    server.close(() => {
      process.exit(1);
    });
  });
};

/**
 * Mongoose connection error handler
 */
const handleMongooseErrors = () => {
  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected');
  });
};

/**
 * Get appropriate error handler based on environment
 */
const getErrorHandler = () => {
  return process.env.NODE_ENV === 'development' 
    ? developmentErrorHandler 
    : productionErrorHandler;
};

module.exports = {
  errorHandler: getErrorHandler(),
  notFound,
  asyncHandler,
  developmentErrorHandler,
  productionErrorHandler,
  handleUncaughtException,
  handleUnhandledRejection,
  handleMongooseErrors
};