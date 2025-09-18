const express = require('express');
const AuditController = require('../controllers/auditController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { validators } = require('../middleware/validation');

const router = express.Router();

/**
 * @route   GET /api/audit/logs
 * @desc    Get audit logs with filtering and pagination
 * @access  Private (users see their own logs, admins see all)
 */
router.get('/logs', 
  authenticate,
  validators.validateAuditQuery,
  AuditController.getAuditLogs
);

/**
 * @route   GET /api/audit/entity/:entity/:entityId
 * @desc    Get audit logs for a specific entity
 * @access  Private (users see their own data, admins see all)
 */
router.get('/entity/:entity/:entityId', 
  authenticate,
  validators.validateAuditParams,
  validators.validateAuditQuery,
  AuditController.getEntityAuditLogs
);

/**
 * @route   GET /api/audit/user/:userId/activity
 * @desc    Get user activity logs
 * @access  Private (users see their own activity, admins see all)
 */
router.get('/user/:userId/activity', 
  authenticate,
  validators.validateUserIdParam,
  validators.validateAuditQuery,
  AuditController.getUserActivity
);

/**
 * @route   GET /api/audit/stats
 * @desc    Get audit statistics
 * @access  Private (Admin only)
 */
router.get('/stats', 
  authenticate,
  authorize('admin'),
  validators.validateAuditQuery,
  AuditController.getAuditStats
);

/**
 * @route   GET /api/audit/log/:logId
 * @desc    Get specific audit log by ID
 * @access  Private (Admin only)
 */
router.get('/log/:logId', 
  authenticate,
  authorize('admin'),
  validators.validateLogIdParam,
  AuditController.getAuditLogById
);

/**
 * @route   GET /api/audit/export
 * @desc    Export audit logs in JSON or CSV format
 * @access  Private (Admin only)
 */
router.get('/export', 
  authenticate,
  authorize('admin'),
  validators.validateExportQuery,
  AuditController.exportAuditLogs
);

module.exports = router;