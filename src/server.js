require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

// Import configurations and utilities
const database = require('./config/database');
const swagger = require('./config/swagger');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { auditLogger } = require('./middleware/auditLogger');

// Import routes
const authRoutes = require('./routes/authRoutes');
const auditRoutes = require('./routes/auditRoutes');

class Server {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 5000;
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" }
    }));

    // Compression middleware
    this.app.use(compression());

    // CORS configuration
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
      message: {
        error: 'Too many requests from this IP, please try again later.',
        code: 'RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
      legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    });
    this.app.use('/api/', limiter);

    // Logging middleware
    if (process.env.NODE_ENV === 'development') {
      this.app.use(morgan('dev'));
    } else {
      this.app.use(morgan('combined'));
    }

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Custom request ID middleware
    this.app.use((req, res, next) => {
      req.requestId = require('crypto').randomBytes(16).toString('hex');
      res.setHeader('X-Request-ID', req.requestId);
      next();
    });

    // Audit logging middleware (should be after auth middleware when that's added)
    this.app.use(auditLogger);
  }

  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        success: true,
        message: 'Server is healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV
      });
    });

    // API routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/audit', auditRoutes);

    // Swagger documentation
    this.app.use('/api/docs', swagger.serve, swagger.setup);
    this.app.use('/docs', swagger.serve, swagger.setup); // Alternative endpoint

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.status(200).json({
        success: true,
        message: `Welcome to ${process.env.APP_NAME || 'BE Image Builder'} API`,
        version: '1.0.0',
        documentation: '/api/docs',
        endpoints: {
          auth: '/api/auth',
          audit: '/api/audit',
          health: '/health',
          docs: '/api/docs'
        }
      });
    });
  }

  setupErrorHandling() {
    // 404 handler
    this.app.use(notFound);

    // Global error handler
    this.app.use(errorHandler);
  }

  async start() {
    try {
      // Connect to database
      await database.connect();

      // Start server
      this.server = this.app.listen(this.port, () => {
        console.log(`🚀 Server running on port ${this.port} in ${process.env.NODE_ENV} mode`);
        console.log(`📍 API URL: http://localhost:${this.port}`);
        console.log(`🏥 Health check: http://localhost:${this.port}/health`);
      });

      // Handle server shutdown gracefully
      process.on('SIGTERM', this.gracefulShutdown.bind(this));
      process.on('SIGINT', this.gracefulShutdown.bind(this));

    } catch (error) {
      console.error('❌ Failed to start server:', error.message);
      process.exit(1);
    }
  }

  async gracefulShutdown(signal) {
    console.log(`\n📴 Received ${signal}. Starting graceful shutdown...`);

    if (this.server) {
      this.server.close(async () => {
        console.log('🔒 HTTP server closed.');
        
        // Close database connection
        await database.disconnect();
        
        console.log('✅ Graceful shutdown completed.');
        process.exit(0);
      });

      // Force close after 30 seconds
      setTimeout(() => {
        console.error('⚠️ Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 30000);
    }
  }

  getApp() {
    return this.app;
  }
}

module.exports = Server;