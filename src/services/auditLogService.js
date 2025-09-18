const { AuditLog } = require('../models');

/**
 * Audit logging service
 */
class AuditLogService {
  /**
   * Create an audit log entry
   * @param {Object} params - Audit log parameters
   * @returns {Promise<Object|null>} Created audit log or null if failed
   */
  static async createLog({
    userId,
    action,
    entity,
    entityId,
    changes = {},
    metadata = {},
    description = ''
  }) {
    try {
      return await AuditLog.createLog({
        userId,
        action,
        entity,
        entityId,
        changes,
        metadata,
        description
      });
    } catch (error) {
      console.error('Audit log creation failed:', error);
      return null;
    }
  }

  /**
   * Log CREATE operation
   * @param {Object} params - Log parameters
   * @returns {Promise<Object|null>} Created audit log
   */
  static async logCreate({
    userId,
    entity,
    entityId,
    data,
    req = null,
    description = ''
  }) {
    const metadata = req ? this.extractMetadata(req) : {};
    
    return this.createLog({
      userId,
      action: 'CREATE',
      entity,
      entityId,
      changes: {
        before: null,
        after: data
      },
      metadata,
      description: description || `Created ${entity} with ID ${entityId}`
    });
  }

  /**
   * Log READ operation
   * @param {Object} params - Log parameters
   * @returns {Promise<Object|null>} Created audit log
   */
  static async logRead({
    userId,
    entity,
    entityId,
    req = null,
    description = ''
  }) {
    const metadata = req ? this.extractMetadata(req) : {};
    
    return this.createLog({
      userId,
      action: 'READ',
      entity,
      entityId,
      changes: {},
      metadata,
      description: description || `Accessed ${entity} with ID ${entityId}`
    });
  }

  /**
   * Log UPDATE operation
   * @param {Object} params - Log parameters
   * @returns {Promise<Object|null>} Created audit log
   */
  static async logUpdate({
    userId,
    entity,
    entityId,
    before,
    after,
    req = null,
    description = ''
  }) {
    const metadata = req ? this.extractMetadata(req) : {};
    
    return this.createLog({
      userId,
      action: 'UPDATE',
      entity,
      entityId,
      changes: {
        before,
        after
      },
      metadata,
      description: description || `Updated ${entity} with ID ${entityId}`
    });
  }

  /**
   * Log DELETE operation
   * @param {Object} params - Log parameters
   * @returns {Promise<Object|null>} Created audit log
   */
  static async logDelete({
    userId,
    entity,
    entityId,
    data,
    req = null,
    description = ''
  }) {
    const metadata = req ? this.extractMetadata(req) : {};
    
    return this.createLog({
      userId,
      action: 'DELETE',
      entity,
      entityId,
      changes: {
        before: data,
        after: null
      },
      metadata,
      description: description || `Deleted ${entity} with ID ${entityId}`
    });
  }

  /**
   * Extract metadata from request object
   * @param {Object} req - Express request object
   * @returns {Object} Extracted metadata
   */
  static extractMetadata(req) {
    return {
      ip: req.ip || req.connection.remoteAddress || req.socket.remoteAddress,
      userAgent: req.get('User-Agent'),
      route: req.route ? req.route.path : req.path,
      method: req.method,
      requestId: req.requestId
    };
  }

  /**
   * Get audit logs for a specific entity
   * @param {string} entity - Entity name
   * @param {string} entityId - Entity ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Audit logs
   */
  static async getEntityLogs(entity, entityId, options = {}) {
    try {
      return await AuditLog.getEntityLogs(entity, entityId, options);
    } catch (error) {
      console.error('Failed to fetch entity audit logs:', error);
      return [];
    }
  }

  /**
   * Get user activity logs
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} User activity logs
   */
  static async getUserActivity(userId, options = {}) {
    try {
      return await AuditLog.getUserActivity(userId, options);
    } catch (error) {
      console.error('Failed to fetch user activity logs:', error);
      return [];
    }
  }

  /**
   * Get audit statistics
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Audit statistics
   */
  static async getStats(options = {}) {
    try {
      return await AuditLog.getStats(options);
    } catch (error) {
      console.error('Failed to fetch audit statistics:', error);
      return [];
    }
  }

  /**
   * Clean up old audit logs (for maintenance)
   * @param {number} daysOld - Number of days old
   * @returns {Promise<number>} Number of deleted logs
   */
  static async cleanup(daysOld = 730) { // Default 2 years
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      const result = await AuditLog.deleteMany({
        timestamp: { $lt: cutoffDate }
      });
      
      console.log(`Cleaned up ${result.deletedCount} old audit logs`);
      return result.deletedCount;
    } catch (error) {
      console.error('Failed to cleanup old audit logs:', error);
      return 0;
    }
  }
}

module.exports = AuditLogService;