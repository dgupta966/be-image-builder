const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'BE Image Builder API',
    version: '1.0.0',
    description: 'A comprehensive Node.js backend API with MongoDB, featuring authentication (email/password and Google OAuth), audit logging, and robust security measures.',
    contact: {
      name: 'API Support',
      email: 'support@yourapp.com'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Development server'
    },
    {
      url: 'https://your-production-url.com',
      description: 'Production server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'User unique identifier'
          },
          name: {
            type: 'string',
            description: 'User full name'
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'User email address'
          },
          role: {
            type: 'string',
            enum: ['user', 'admin'],
            description: 'User role'
          },
          avatar: {
            type: 'string',
            format: 'uri',
            description: 'User profile picture URL'
          },
          isEmailVerified: {
            type: 'boolean',
            description: 'Whether user email is verified'
          },
          lastLogin: {
            type: 'string',
            format: 'date-time',
            description: 'Last login timestamp'
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Account creation timestamp'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Last update timestamp'
          }
        }
      },
      AuditLog: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Audit log unique identifier'
          },
          userId: {
            type: 'string',
            description: 'User who performed the action'
          },
          action: {
            type: 'string',
            enum: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
            description: 'Type of action performed'
          },
          entity: {
            type: 'string',
            description: 'Entity that was affected'
          },
          entityId: {
            type: 'string',
            description: 'ID of the affected entity'
          },
          changes: {
            type: 'object',
            properties: {
              before: {
                type: 'object',
                description: 'State before the change'
              },
              after: {
                type: 'object',
                description: 'State after the change'
              }
            }
          },
          metadata: {
            type: 'object',
            properties: {
              ip: {
                type: 'string',
                description: 'Client IP address'
              },
              userAgent: {
                type: 'string',
                description: 'Client user agent'
              },
              route: {
                type: 'string',
                description: 'API route accessed'
              },
              method: {
                type: 'string',
                description: 'HTTP method used'
              },
              statusCode: {
                type: 'number',
                description: 'Response status code'
              },
              requestId: {
                type: 'string',
                description: 'Unique request identifier'
              }
            }
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'When the action occurred'
          },
          description: {
            type: 'string',
            description: 'Human-readable description of the action'
          }
        }
      },
      AuthTokens: {
        type: 'object',
        properties: {
          accessToken: {
            type: 'string',
            description: 'JWT access token'
          },
          refreshToken: {
            type: 'string',
            description: 'JWT refresh token'
          },
          expiresIn: {
            type: 'string',
            description: 'Access token expiration time'
          }
        }
      },
      Error: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false
          },
          error: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                description: 'Error message'
              },
              code: {
                type: 'string',
                description: 'Error code'
              },
              statusCode: {
                type: 'number',
                description: 'HTTP status code'
              },
              details: {
                type: 'object',
                description: 'Additional error details'
              },
              requestId: {
                type: 'string',
                description: 'Request identifier for tracking'
              }
            }
          }
        }
      },
      SuccessResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true
          },
          message: {
            type: 'string',
            description: 'Success message'
          },
          data: {
            type: 'object',
            description: 'Response data'
          }
        }
      }
    }
  },
  paths: {
    '/health': {
      get: {
        summary: 'Health check',
        description: 'Check if the server is running and healthy',
        tags: ['System'],
        responses: {
          200: {
            description: 'Server is healthy',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'object',
                          properties: {
                            uptime: {
                              type: 'number',
                              description: 'Server uptime in seconds'
                            },
                            environment: {
                              type: 'string',
                              description: 'Current environment'
                            },
                            timestamp: {
                              type: 'string',
                              format: 'date-time'
                            }
                          }
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    '/api/auth/signup': {
      post: {
        summary: 'User signup',
        description: 'Register a new user with email and password',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: {
                    type: 'string',
                    minLength: 2,
                    maxLength: 50,
                    example: 'John Doe'
                  },
                  email: {
                    type: 'string',
                    format: 'email',
                    example: 'john@example.com'
                  },
                  password: {
                    type: 'string',
                    minLength: 6,
                    pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)',
                    example: 'Password123',
                    description: 'Must contain at least one lowercase letter, one uppercase letter, and one number'
                  }
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: 'User registered successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'object',
                          properties: {
                            user: { $ref: '#/components/schemas/User' },
                            accessToken: { type: 'string' },
                            refreshToken: { type: 'string' },
                            expiresIn: { type: 'string' }
                          }
                        }
                      }
                    }
                  ]
                }
              }
            }
          },
          400: {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          },
          409: {
            description: 'User already exists',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/api/auth/signin': {
      post: {
        summary: 'User signin',
        description: 'Login user with email and password',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: {
                    type: 'string',
                    format: 'email',
                    example: 'john@example.com'
                  },
                  password: {
                    type: 'string',
                    example: 'Password123'
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'object',
                          properties: {
                            user: { $ref: '#/components/schemas/User' },
                            accessToken: { type: 'string' },
                            refreshToken: { type: 'string' },
                            expiresIn: { type: 'string' }
                          }
                        }
                      }
                    }
                  ]
                }
              }
            }
          },
          401: {
            description: 'Invalid credentials',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          },
          423: {
            description: 'Account locked',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/api/auth/google': {
      post: {
        summary: 'Google authentication',
        description: 'Authenticate user with Google ID token from frontend',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token'],
                properties: {
                  token: {
                    type: 'string',
                    description: 'Google ID token received from frontend',
                    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...'
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Google authentication successful',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'object',
                          properties: {
                            user: { $ref: '#/components/schemas/User' },
                            accessToken: { type: 'string' },
                            refreshToken: { type: 'string' },
                            expiresIn: { type: 'string' },
                            isNewUser: {
                              type: 'boolean',
                              description: 'Whether this is a new user account'
                            }
                          }
                        }
                      }
                    }
                  ]
                }
              }
            }
          },
          400: {
            description: 'Invalid Google token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/api/auth/forgot-password': {
      post: {
        summary: 'Forgot password',
        description: 'Send password reset email to user',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: {
                  email: {
                    type: 'string',
                    format: 'email',
                    example: 'john@example.com'
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Password reset email sent (if user exists)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SuccessResponse' }
              }
            }
          },
          500: {
            description: 'Email service error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/api/auth/reset-password': {
      post: {
        summary: 'Reset password',
        description: 'Reset user password using token from email',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token', 'password'],
                properties: {
                  token: {
                    type: 'string',
                    description: 'Password reset token from email',
                    example: 'abc123def456...'
                  },
                  password: {
                    type: 'string',
                    minLength: 6,
                    pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)',
                    example: 'NewPassword123'
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Password reset successful',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SuccessResponse' }
              }
            }
          },
          400: {
            description: 'Invalid or expired token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/api/auth/refresh-token': {
      post: {
        summary: 'Refresh access token',
        description: 'Get new access token using refresh token',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: {
                  refreshToken: {
                    type: 'string',
                    description: 'Valid refresh token',
                    example: 'eyJhbGciOiJIUzI1NiIs...'
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Tokens refreshed successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'object',
                          properties: {
                            user: { $ref: '#/components/schemas/User' },
                            accessToken: { type: 'string' },
                            refreshToken: { type: 'string' },
                            expiresIn: { type: 'string' }
                          }
                        }
                      }
                    }
                  ]
                }
              }
            }
          },
          401: {
            description: 'Invalid or expired refresh token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/api/auth/me': {
      get: {
        summary: 'Get user profile',
        description: 'Get current authenticated user profile',
        tags: ['Authentication'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'User profile retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'object',
                          properties: {
                            user: { $ref: '#/components/schemas/User' }
                          }
                        }
                      }
                    }
                  ]
                }
              }
            }
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/api/auth/profile': {
      get: {
        summary: 'Get user profile (alternative)',
        description: 'Alternative endpoint to get current user profile',
        tags: ['Authentication'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'User profile retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'object',
                          properties: {
                            user: { $ref: '#/components/schemas/User' }
                          }
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      },
      put: {
        summary: 'Update user profile',
        description: 'Update current user profile information',
        tags: ['Authentication'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    minLength: 2,
                    maxLength: 50,
                    example: 'Updated Name'
                  },
                  avatar: {
                    type: 'string',
                    format: 'uri',
                    example: 'https://example.com/avatar.jpg'
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Profile updated successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'object',
                          properties: {
                            user: { $ref: '#/components/schemas/User' }
                          }
                        }
                      }
                    }
                  ]
                }
              }
            }
          },
          400: {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/api/auth/change-password': {
      post: {
        summary: 'Change password',
        description: 'Change user password (requires current password for non-Google users)',
        tags: ['Authentication'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['newPassword'],
                properties: {
                  currentPassword: {
                    type: 'string',
                    description: 'Current password (not required for Google users)',
                    example: 'OldPassword123'
                  },
                  newPassword: {
                    type: 'string',
                    minLength: 6,
                    pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)',
                    example: 'NewPassword123'
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Password changed successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SuccessResponse' }
              }
            }
          },
          400: {
            description: 'Invalid current password or validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/api/auth/logout': {
      post: {
        summary: 'Logout',
        description: 'Logout user (client should delete tokens)',
        tags: ['Authentication'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Logged out successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SuccessResponse' }
              }
            }
          }
        }
      }
    },
    '/api/audit/logs': {
      get: {
        summary: 'Get audit logs',
        description: 'Get audit logs with filtering and pagination. Users see their own logs, admins see all.',
        tags: ['Audit Logs'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', minimum: 1, default: 1 },
            description: 'Page number'
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            description: 'Items per page'
          },
          {
            name: 'action',
            in: 'query',
            schema: { type: 'string', enum: ['CREATE', 'READ', 'UPDATE', 'DELETE'] },
            description: 'Filter by action type'
          },
          {
            name: 'entity',
            in: 'query',
            schema: { type: 'string' },
            description: 'Filter by entity type'
          },
          {
            name: 'entityId',
            in: 'query',
            schema: { type: 'string' },
            description: 'Filter by entity ID'
          },
          {
            name: 'userId',
            in: 'query',
            schema: { type: 'string' },
            description: 'Filter by user ID (admin only)'
          },
          {
            name: 'startDate',
            in: 'query',
            schema: { type: 'string', format: 'date-time' },
            description: 'Filter from date'
          },
          {
            name: 'endDate',
            in: 'query',
            schema: { type: 'string', format: 'date-time' },
            description: 'Filter to date'
          }
        ],
        responses: {
          200: {
            description: 'Audit logs retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'object',
                          properties: {
                            auditLogs: {
                              type: 'array',
                              items: { $ref: '#/components/schemas/AuditLog' }
                            },
                            pagination: {
                              type: 'object',
                              properties: {
                                currentPage: { type: 'integer' },
                                totalPages: { type: 'integer' },
                                totalItems: { type: 'integer' },
                                itemsPerPage: { type: 'integer' },
                                hasNextPage: { type: 'boolean' },
                                hasPrevPage: { type: 'boolean' }
                              }
                            }
                          }
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    '/api/audit/entity/{entity}/{entityId}': {
      get: {
        summary: 'Get entity audit logs',
        description: 'Get audit logs for a specific entity',
        tags: ['Audit Logs'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'entity',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Entity type'
          },
          {
            name: 'entityId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Entity ID'
          },
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', minimum: 1, default: 1 }
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
          },
          {
            name: 'action',
            in: 'query',
            schema: { type: 'string', enum: ['CREATE', 'READ', 'UPDATE', 'DELETE'] }
          },
          {
            name: 'startDate',
            in: 'query',
            schema: { type: 'string', format: 'date-time' }
          },
          {
            name: 'endDate',
            in: 'query',
            schema: { type: 'string', format: 'date-time' }
          }
        ],
        responses: {
          200: {
            description: 'Entity audit logs retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'object',
                          properties: {
                            entity: { type: 'string' },
                            entityId: { type: 'string' },
                            auditLogs: {
                              type: 'array',
                              items: { $ref: '#/components/schemas/AuditLog' }
                            }
                          }
                        }
                      }
                    }
                  ]
                }
              }
            }
          },
          403: {
            description: 'Access denied',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/api/audit/user/{userId}/activity': {
      get: {
        summary: 'Get user activity',
        description: 'Get activity logs for a specific user',
        tags: ['Audit Logs'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'userId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'User ID'
          },
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', minimum: 1, default: 1 }
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
          },
          {
            name: 'action',
            in: 'query',
            schema: { type: 'string', enum: ['CREATE', 'READ', 'UPDATE', 'DELETE'] }
          },
          {
            name: 'entity',
            in: 'query',
            schema: { type: 'string' }
          },
          {
            name: 'startDate',
            in: 'query',
            schema: { type: 'string', format: 'date-time' }
          },
          {
            name: 'endDate',
            in: 'query',
            schema: { type: 'string', format: 'date-time' }
          }
        ],
        responses: {
          200: {
            description: 'User activity retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'object',
                          properties: {
                            userId: { type: 'string' },
                            activityLogs: {
                              type: 'array',
                              items: { $ref: '#/components/schemas/AuditLog' }
                            }
                          }
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    '/api/audit/stats': {
      get: {
        summary: 'Get audit statistics',
        description: 'Get audit log statistics (admin only)',
        tags: ['Audit Logs'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'startDate',
            in: 'query',
            schema: { type: 'string', format: 'date-time' },
            description: 'Statistics from date'
          },
          {
            name: 'endDate',
            in: 'query',
            schema: { type: 'string', format: 'date-time' },
            description: 'Statistics to date'
          },
          {
            name: 'userId',
            in: 'query',
            schema: { type: 'string' },
            description: 'Filter by user ID'
          },
          {
            name: 'entity',
            in: 'query',
            schema: { type: 'string' },
            description: 'Filter by entity'
          }
        ],
        responses: {
          200: {
            description: 'Audit statistics retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'object',
                          properties: {
                            statistics: {
                              type: 'array',
                              items: {
                                type: 'object',
                                properties: {
                                  _id: { type: 'string' },
                                  actions: {
                                    type: 'array',
                                    items: {
                                      type: 'object',
                                      properties: {
                                        action: { type: 'string' },
                                        count: { type: 'integer' },
                                        lastActivity: { type: 'string', format: 'date-time' }
                                      }
                                    }
                                  },
                                  totalCount: { type: 'integer' }
                                }
                              }
                            },
                            period: {
                              type: 'object',
                              properties: {
                                startDate: { type: 'string' },
                                endDate: { type: 'string' }
                              }
                            }
                          }
                        }
                      }
                    }
                  ]
                }
              }
            }
          },
          403: {
            description: 'Admin access required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/api/audit/log/{logId}': {
      get: {
        summary: 'Get audit log by ID',
        description: 'Get specific audit log by ID (admin only)',
        tags: ['Audit Logs'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'logId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Audit log ID'
          }
        ],
        responses: {
          200: {
            description: 'Audit log retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'object',
                          properties: {
                            auditLog: { $ref: '#/components/schemas/AuditLog' }
                          }
                        }
                      }
                    }
                  ]
                }
              }
            }
          },
          404: {
            description: 'Audit log not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/api/audit/export': {
      get: {
        summary: 'Export audit logs',
        description: 'Export audit logs in JSON or CSV format (admin only)',
        tags: ['Audit Logs'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'format',
            in: 'query',
            schema: { type: 'string', enum: ['json', 'csv'], default: 'json' },
            description: 'Export format'
          },
          {
            name: 'startDate',
            in: 'query',
            schema: { type: 'string', format: 'date-time' }
          },
          {
            name: 'endDate',
            in: 'query',
            schema: { type: 'string', format: 'date-time' }
          },
          {
            name: 'action',
            in: 'query',
            schema: { type: 'string', enum: ['CREATE', 'READ', 'UPDATE', 'DELETE'] }
          },
          {
            name: 'entity',
            in: 'query',
            schema: { type: 'string' }
          },
          {
            name: 'userId',
            in: 'query',
            schema: { type: 'string' }
          }
        ],
        responses: {
          200: {
            description: 'Audit logs exported successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'object',
                          properties: {
                            auditLogs: {
                              type: 'array',
                              items: { $ref: '#/components/schemas/AuditLog' }
                            },
                            exportDate: { type: 'string', format: 'date-time' },
                            totalRecords: { type: 'integer' }
                          }
                        }
                      }
                    }
                  ]
                }
              },
              'text/csv': {
                schema: {
                  type: 'string',
                  description: 'CSV formatted audit logs'
                }
              }
            }
          }
        }
      }
    }
  },
  tags: [
    {
      name: 'System',
      description: 'System health and status endpoints'
    },
    {
      name: 'Authentication',
      description: 'User authentication and profile management'
    },
    {
      name: 'Audit Logs',
      description: 'Audit trail and activity logging'
    }
  ]
};

const options = {
  definition: swaggerDefinition,
  apis: [] // Since you don't want route annotations, we'll keep this empty
};

const specs = swaggerJSDoc(options);

module.exports = {
  specs,
  swaggerUi,
  serve: swaggerUi.serve,
  setup: swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'BE Image Builder API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'list',
      filter: true,
      showExtensions: true,
      showCommonExtensions: true
    }
  })
};