const AuditLogService = require('../services/auditLogService');

/**
 * Middleware to automatically log API requests
 */
const auditLogger = (req, res, next) => {
  // Skip audit logging for certain routes
  const skipRoutes = [
    '/health',
    '/api/audit',
    '/favicon.ico'
  ];

  const shouldSkip = skipRoutes.some(route => req.path.startsWith(route));
  
  if (shouldSkip) {
    return next();
  }

  // Store original end method
  const originalEnd = res.end;
  const originalJson = res.json;

  // Track response data
  let responseData = null;
  let statusCode = null;

  // Override res.json to capture response data
  res.json = function(data) {
    responseData = data;
    statusCode = res.statusCode;
    return originalJson.call(this, data);
  };

  // Override res.end to capture final response
  res.end = function(chunk, encoding) {
    statusCode = res.statusCode;
    
    // Log the request after response is sent
    process.nextTick(() => {
      logRequest(req, res, responseData, statusCode);
    });

    return originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Log the request details
 */
const logRequest = async (req, res, responseData, statusCode) => {
  try {
    // Skip logging for non-authenticated requests or GET requests to public endpoints
    if (!req.user) {
      return;
    }

    // Skip logging for GET requests unless they access sensitive data
    if (req.method === 'GET' && !shouldLogGetRequest(req.path)) {
      return;
    }

    const action = getActionFromMethod(req.method);
    const entity = extractEntityFromPath(req.path);
    const entityId = extractEntityIdFromPath(req.path, req.body, responseData);

    if (!entity || !entityId) {
      return;
    }

    // Prepare changes object based on method
    let changes = {};
    if (req.method === 'POST' && responseData && responseData.data) {
      changes = {
        before: null,
        after: sanitizeData(responseData.data)
      };
    } else if (req.method === 'PUT' || req.method === 'PATCH') {
      changes = {
        before: req.originalData || null, // Set by controller if available
        after: sanitizeData(req.body)
      };
    } else if (req.method === 'DELETE') {
      changes = {
        before: req.originalData || null, // Set by controller if available
        after: null
      };
    }

    // Create metadata
    const metadata = {
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      route: req.route ? req.route.path : req.path,
      method: req.method,
      statusCode,
      requestId: req.requestId
    };

    // Create audit log
    await AuditLogService.createLog({
      userId: req.user._id,
      action,
      entity,
      entityId,
      changes,
      metadata,
      description: generateDescription(action, entity, entityId, req.method)
    });

  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
};

/**
 * Determine if GET request should be logged
 */
const shouldLogGetRequest = (path) => {
  const sensitiveEndpoints = [
    '/api/auth/profile',
    '/api/auth/me',
    '/api/user',
    '/api/admin'
  ];

  return sensitiveEndpoints.some(endpoint => path.startsWith(endpoint));
};

/**
 * Get action from HTTP method
 */
const getActionFromMethod = (method) => {
  const methodActionMap = {
    'POST': 'CREATE',
    'GET': 'READ',
    'PUT': 'UPDATE',
    'PATCH': 'UPDATE',
    'DELETE': 'DELETE'
  };

  return methodActionMap[method] || 'READ';
};

/**
 * Extract entity name from request path
 */
const extractEntityFromPath = (path) => {
  // Remove /api prefix and get the main entity
  const pathParts = path.replace(/^\/api\//, '').split('/');
  
  if (pathParts.length === 0) return null;

  // Map common endpoints to entities
  const entityMap = {
    'auth/signup': 'User',
    'auth/signin': 'User',
    'auth/google': 'User',
    'auth/profile': 'User',
    'auth/me': 'User',
    'auth/reset-password': 'User',
    'auth/forgot-password': 'User',
    'users': 'User',
    'audit': 'AuditLog'
  };

  // Check for exact matches first
  const fullPath = pathParts.join('/');
  if (entityMap[fullPath]) {
    return entityMap[fullPath];
  }

  // Check for partial matches
  for (const [key, entity] of Object.entries(entityMap)) {
    if (fullPath.startsWith(key)) {
      return entity;
    }
  }

  // Default to the first path segment capitalized
  return pathParts[0].charAt(0).toUpperCase() + pathParts[0].slice(1);
};

/**
 * Extract entity ID from request
 */
const extractEntityIdFromPath = (path, body, responseData) => {
  // Try to extract ID from URL parameters
  const pathParts = path.split('/');
  
  // Look for MongoDB ObjectId pattern (24 hex characters)
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  
  for (const part of pathParts) {
    if (objectIdRegex.test(part)) {
      return part;
    }
  }

  // Try to get ID from response data
  if (responseData && responseData.data) {
    if (responseData.data.id) return responseData.data.id;
    if (responseData.data._id) return responseData.data._id;
    if (responseData.data.user && responseData.data.user.id) return responseData.data.user.id;
  }

  // Try to get ID from request body
  if (body) {
    if (body.id) return body.id;
    if (body._id) return body._id;
    if (body.userId) return body.userId;
  }

  // Default fallback
  return 'unknown';
};

/**
 * Sanitize data by removing sensitive information
 */
const sanitizeData = (data) => {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sanitized = { ...data };
  
  // Remove sensitive fields
  const sensitiveFields = [
    'password',
    'passwordResetToken',
    'emailVerificationToken',
    'refreshToken',
    'accessToken'
  ];

  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      delete sanitized[field];
    }
  });

  return sanitized;
};

/**
 * Generate description for audit log
 */
const generateDescription = (action, entity, entityId, method) => {
  const actionDescriptions = {
    'CREATE': `Created ${entity}`,
    'READ': `Accessed ${entity}`,
    'UPDATE': `Updated ${entity}`,
    'DELETE': `Deleted ${entity}`
  };

  const baseDescription = actionDescriptions[action] || `${action} ${entity}`;
  
  if (entityId && entityId !== 'unknown') {
    return `${baseDescription} with ID ${entityId}`;
  }
  
  return baseDescription;
};

/**
 * Middleware to manually log specific operations
 * Use this in controllers for more precise logging
 */
const manualAuditLog = (params) => {
  return async (req, res, next) => {
    try {
      if (req.user) {
        req.auditParams = {
          ...params,
          userId: req.user._id,
          metadata: AuditLogService.extractMetadata(req)
        };
      }
      next();
    } catch (error) {
      console.error('Manual audit log middleware error:', error);
      next();
    }
  };
};

module.exports = {
  auditLogger,
  manualAuditLog
};