const auditLogService = require('../services/auditLogService');
const { createError } = require('../utils/errorUtils');

class AuditController {
  /**
   * Get audit logs with filtering and pagination
   */
  static async getAuditLogs(req, res, next) {
    try {
      const {
        page = 1,
        limit = 20,
        action,
        entity,
        entityId,
        userId,
        startDate,
        endDate
      } = req.query;

      // Validate pagination parameters
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // Max 100 items per page

      // Build query
      const query = {};
      
      if (action) query.action = action.toUpperCase();
      if (entity) query.entity = entity;
      if (entityId) query.entityId = entityId.toString();
      if (userId) query.userId = userId;
      
      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
      }

      // Check permissions - users can only see their own logs unless admin
      if (req.user.role !== 'admin') {
        query.userId = req.user._id;
      }

      // Get audit logs
      const auditLogs = await auditLogService.getEntityLogs('', '', {
        page: pageNum,
        limit: limitNum,
        ...query
      });

      // Get total count for pagination
      const { AuditLog } = require('../models');
      const totalCount = await AuditLog.countDocuments(query);
      const totalPages = Math.ceil(totalCount / limitNum);

      res.status(200).json({
        success: true,
        data: {
          auditLogs,
          pagination: {
            currentPage: pageNum,
            totalPages,
            totalItems: totalCount,
            itemsPerPage: limitNum,
            hasNextPage: pageNum < totalPages,
            hasPrevPage: pageNum > 1
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get audit logs for a specific entity
   */
  static async getEntityAuditLogs(req, res, next) {
    try {
      const { entity, entityId } = req.params;
      const {
        page = 1,
        limit = 20,
        action,
        startDate,
        endDate
      } = req.query;

      // Validate parameters
      if (!entity || !entityId) {
        return next(createError(400, 'Entity and entityId are required'));
      }

      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

      const options = {
        page: pageNum,
        limit: limitNum
      };

      if (action) options.action = action.toUpperCase();
      if (startDate) options.startDate = startDate;
      if (endDate) options.endDate = endDate;

      // Check permissions - users can only see logs for their own data unless admin
      if (req.user.role !== 'admin') {
        // For User entity, check if user is requesting their own logs
        if (entity === 'User' && entityId !== req.user._id.toString()) {
          return next(createError(403, 'Access denied. You can only view your own audit logs.'));
        }
        
        // For other entities, add userId filter to ensure user can only see their own data
        options.userId = req.user._id;
      }

      const auditLogs = await auditLogService.getEntityLogs(entity, entityId, options);

      res.status(200).json({
        success: true,
        data: {
          entity,
          entityId,
          auditLogs
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user activity logs
   */
  static async getUserActivity(req, res, next) {
    try {
      const { userId } = req.params;
      const {
        page = 1,
        limit = 20,
        action,
        entity,
        startDate,
        endDate
      } = req.query;

      // Check permissions - users can only see their own activity unless admin
      if (req.user.role !== 'admin' && userId !== req.user._id.toString()) {
        return next(createError(403, 'Access denied. You can only view your own activity.'));
      }

      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

      const options = {
        page: pageNum,
        limit: limitNum
      };

      if (action) options.action = action.toUpperCase();
      if (entity) options.entity = entity;
      if (startDate) options.startDate = startDate;
      if (endDate) options.endDate = endDate;

      const activityLogs = await auditLogService.getUserActivity(userId, options);

      res.status(200).json({
        success: true,
        data: {
          userId,
          activityLogs
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get audit statistics (admin only)
   */
  static async getAuditStats(req, res, next) {
    try {
      const {
        startDate,
        endDate,
        userId,
        entity
      } = req.query;

      const options = {};
      
      if (startDate) options.startDate = startDate;
      if (endDate) options.endDate = endDate;
      if (userId) options.userId = userId;
      if (entity) options.entity = entity;

      const stats = await auditLogService.getStats(options);

      res.status(200).json({
        success: true,
        data: {
          statistics: stats,
          period: {
            startDate: startDate || 'All time',
            endDate: endDate || 'Present'
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get audit log by ID (admin only)
   */
  static async getAuditLogById(req, res, next) {
    try {
      const { logId } = req.params;

      const { AuditLog } = require('../models');
      const auditLog = await AuditLog.findById(logId).populate('userId', 'name email');

      if (!auditLog) {
        return next(createError(404, 'Audit log not found'));
      }

      res.status(200).json({
        success: true,
        data: {
          auditLog
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export audit logs (admin only)
   */
  static async exportAuditLogs(req, res, next) {
    try {
      const {
        format = 'json',
        startDate,
        endDate,
        action,
        entity,
        userId
      } = req.query;

      // Build query
      const query = {};
      
      if (action) query.action = action.toUpperCase();
      if (entity) query.entity = entity;
      if (userId) query.userId = userId;
      
      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
      }

      const { AuditLog } = require('../models');
      const auditLogs = await AuditLog.find(query)
        .populate('userId', 'name email')
        .sort({ timestamp: -1 })
        .limit(10000) // Limit export to 10k records
        .lean();

      if (format === 'csv') {
        // Convert to CSV format
        const csv = this.convertToCSV(auditLogs);
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.csv"`);
        res.send(csv);
      } else {
        // JSON format
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.json"`);
        res.json({
          success: true,
          data: {
            auditLogs,
            exportDate: new Date().toISOString(),
            totalRecords: auditLogs.length
          }
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Convert audit logs to CSV format
   */
  static convertToCSV(auditLogs) {
    if (!auditLogs || auditLogs.length === 0) {
      return 'No data available';
    }

    const headers = [
      'ID',
      'User ID',
      'User Name',
      'User Email',
      'Action',
      'Entity',
      'Entity ID',
      'Timestamp',
      'Description',
      'IP Address',
      'User Agent',
      'Route',
      'Method',
      'Status Code'
    ];

    const csvRows = [headers.join(',')];

    auditLogs.forEach(log => {
      const row = [
        log._id,
        log.userId?._id || log.userId,
        log.userId?.name || '',
        log.userId?.email || '',
        log.action,
        log.entity,
        log.entityId,
        log.timestamp,
        `"${log.description || ''}"`,
        log.metadata?.ip || '',
        `"${log.metadata?.userAgent || ''}"`,
        log.metadata?.route || '',
        log.metadata?.method || '',
        log.metadata?.statusCode || ''
      ];
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }
}

module.exports = AuditController;