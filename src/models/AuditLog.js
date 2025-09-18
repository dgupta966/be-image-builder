const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
    uppercase: true
  },
  entity: {
    type: String,
    required: true,
    trim: true
  },
  entityId: {
    type: String,
    required: true
  },
  changes: {
    before: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    after: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    }
  },
  metadata: {
    ip: {
      type: String,
      trim: true
    },
    userAgent: {
      type: String,
      trim: true
    },
    route: {
      type: String,
      trim: true
    },
    method: {
      type: String,
      enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      uppercase: true
    },
    statusCode: {
      type: Number
    },
    requestId: {
      type: String,
      trim: true
    }
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  description: {
    type: String,
    trim: true
  }
}, {
  timestamps: false, // We're using our own timestamp field
  toJSON: {
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for better query performance
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ entity: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ 'metadata.requestId': 1 });

// TTL index to automatically delete old audit logs after 2 years
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 63072000 }); // 2 years in seconds

// Static method to create audit log entry
auditLogSchema.statics.createLog = async function({
  userId,
  action,
  entity,
  entityId,
  changes = {},
  metadata = {},
  description = ''
}) {
  try {
    const auditLog = new this({
      userId,
      action: action.toUpperCase(),
      entity,
      entityId: entityId.toString(),
      changes,
      metadata,
      description
    });
    
    return await auditLog.save();
  } catch (error) {
    // Log error but don't throw to avoid breaking main operations
    console.error('Failed to create audit log:', error);
    return null;
  }
};

// Static method to get audit logs for a specific entity
auditLogSchema.statics.getEntityLogs = function(entity, entityId, options = {}) {
  const {
    page = 1,
    limit = 20,
    action,
    userId,
    startDate,
    endDate
  } = options;
  
  const query = { entity, entityId: entityId.toString() };
  
  if (action) query.action = action.toUpperCase();
  if (userId) query.userId = userId;
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }
  
  return this.find(query)
    .populate('userId', 'name email')
    .sort({ timestamp: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .lean();
};

// Static method to get user activity logs
auditLogSchema.statics.getUserActivity = function(userId, options = {}) {
  const {
    page = 1,
    limit = 20,
    action,
    entity,
    startDate,
    endDate
  } = options;
  
  const query = { userId };
  
  if (action) query.action = action.toUpperCase();
  if (entity) query.entity = entity;
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }
  
  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .lean();
};

// Static method to get audit statistics
auditLogSchema.statics.getStats = async function(options = {}) {
  const {
    startDate,
    endDate,
    userId,
    entity
  } = options;
  
  const matchStage = {};
  
  if (startDate || endDate) {
    matchStage.timestamp = {};
    if (startDate) matchStage.timestamp.$gte = new Date(startDate);
    if (endDate) matchStage.timestamp.$lte = new Date(endDate);
  }
  
  if (userId) matchStage.userId = new mongoose.Types.ObjectId(userId);
  if (entity) matchStage.entity = entity;
  
  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: {
          action: '$action',
          entity: '$entity'
        },
        count: { $sum: 1 },
        lastActivity: { $max: '$timestamp' }
      }
    },
    {
      $group: {
        _id: '$_id.entity',
        actions: {
          $push: {
            action: '$_id.action',
            count: '$count',
            lastActivity: '$lastActivity'
          }
        },
        totalCount: { $sum: '$count' }
      }
    },
    { $sort: { totalCount: -1 } }
  ];
  
  return this.aggregate(pipeline);
};

module.exports = mongoose.model('AuditLog', auditLogSchema);