# BE Image Builder - Node.js Backend API

A comprehensive Node.js backend application with MongoDB, featuring authentication (email/password and Google OAuth), audit logging, and robust security measures.

## 🚀 Features

- **Authentication System**
  - User signup/signin with email and password
  - Google OAuth authentication (token validation)
  - JWT-based authentication with refresh tokens
  - Password reset functionality
  - Account lockout after failed attempts

- **Audit Logging**
  - Automatic logging of all CRUD operations
  - Detailed audit trails with metadata (IP, user agent, etc.)
  - Audit log querying and filtering
  - Export functionality (JSON/CSV)

- **Security**
  - Password hashing with bcrypt
  - Rate limiting
  - Input validation with Joi
  - CORS protection
  - Helmet security headers
  - Request ID tracking

- **Scalability & Maintainability**
  - Modular architecture
  - Clean code structure
  - Comprehensive error handling
  - Environment-based configuration
  - Database indexing for performance

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd be-image-builder
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   # Database
   MONGODB_URI=mongodb://localhost:27017/be-image-builder
   
   # JWT Secrets
   JWT_SECRET=your-super-secret-jwt-key
   JWT_REFRESH_SECRET=your-refresh-token-secret
   
   # Google OAuth
   GOOGLE_CLIENT_ID=your-google-client-id
   
   # Email Configuration
   EMAIL_HOST=smtp.gmail.com
   EMAIL_USERNAME=your-email@gmail.com
   EMAIL_PASSWORD=your-app-password
   ```

4. **Start MongoDB**
   ```bash
   # If using MongoDB locally
   mongod
   ```

5. **Start the application**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

6. **Access the API**
   - API: http://localhost:5000/api
   - Documentation: http://localhost:5000/api/docs
   - Health Check: http://localhost:5000/health

## 📚 API Documentation

Interactive API documentation is available via Swagger UI at:
- **Primary**: http://localhost:5000/api/docs
- **Alternative**: http://localhost:5000/docs

The Swagger documentation includes:
- Complete endpoint descriptions
- Request/response schemas
- Authentication requirements
- Example requests and responses
- Interactive testing interface

## 📡 API Endpoints

### Base URL
```
http://localhost:5000/api
```

### Authentication Endpoints

#### 1. User Signup
```http
POST /api/auth/signup
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "Password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully. Please check your email for verification.",
  "data": {
    "user": {
      "id": "64f7...",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "isEmailVerified": false
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": "7d"
  }
}
```

#### 2. User Signin
```http
POST /api/auth/signin
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "Password123"
}
```

#### 3. Google Authentication
```http
POST /api/auth/google
Content-Type: application/json

{
  "token": "google-id-token-from-frontend"
}
```

#### 4. Forgot Password
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "john@example.com"
}
```

#### 5. Reset Password
```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "reset-token-from-email",
  "password": "NewPassword123"
}
```

#### 6. Get Profile
```http
GET /api/auth/me
Authorization: Bearer <access-token>
```

#### 7. Update Profile
```http
PUT /api/auth/profile
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "name": "Updated Name",
  "avatar": "https://example.com/avatar.jpg"
}
```

#### 8. Change Password
```http
POST /api/auth/change-password
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "currentPassword": "OldPassword123",
  "newPassword": "NewPassword123"
}
```

#### 9. Refresh Token
```http
POST /api/auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### 10. Logout
```http
POST /api/auth/logout
Authorization: Bearer <access-token>
```

### Audit Log Endpoints

#### 1. Get Audit Logs
```http
GET /api/audit/logs?page=1&limit=20&action=CREATE&entity=User
Authorization: Bearer <access-token>
```

#### 2. Get Entity Audit Logs
```http
GET /api/audit/entity/User/64f7...?page=1&limit=10
Authorization: Bearer <access-token>
```

#### 3. Get User Activity
```http
GET /api/audit/user/64f7.../activity?startDate=2023-01-01
Authorization: Bearer <access-token>
```

#### 4. Get Audit Statistics (Admin Only)
```http
GET /api/audit/stats?startDate=2023-01-01&endDate=2023-12-31
Authorization: Bearer <admin-access-token>
```

#### 5. Export Audit Logs (Admin Only)
```http
GET /api/audit/export?format=csv&startDate=2023-01-01
Authorization: Bearer <admin-access-token>
```

### Health Check
```http
GET /health
```

## 🗄️ Database Models

### User Model
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  googleId: String,
  avatar: String,
  role: String (user/admin),
  isEmailVerified: Boolean,
  isActive: Boolean,
  lastLogin: Date,
  loginAttempts: Number,
  lockUntil: Date,
  passwordResetToken: String,
  passwordResetTokenExpires: Date
}
```

### AuditLog Model
```javascript
{
  userId: ObjectId,
  action: String (CREATE/READ/UPDATE/DELETE),
  entity: String,
  entityId: String,
  changes: {
    before: Object,
    after: Object
  },
  metadata: {
    ip: String,
    userAgent: String,
    route: String,
    method: String,
    statusCode: Number,
    requestId: String
  },
  timestamp: Date,
  description: String
}
```

## 🔒 Security Features

1. **Password Security**
   - Bcrypt hashing with salt rounds
   - Password complexity requirements
   - Account lockout after failed attempts

2. **JWT Security**
   - Access tokens (short-lived)
   - Refresh tokens (long-lived)
   - Token validation and expiration

3. **Request Security**
   - Rate limiting (100 requests per 15 minutes)
   - CORS protection
   - Helmet security headers
   - Input validation and sanitization

4. **Google OAuth Security**
   - Server-side token verification
   - Audience validation
   - Token expiration checks

## 📊 Audit Logging

The system automatically logs all CRUD operations with the following information:

- **User Information**: Who performed the action
- **Action Details**: What was done (CREATE/READ/UPDATE/DELETE)
- **Entity Information**: What resource was affected
- **Change Tracking**: Before/after values for updates
- **Request Metadata**: IP address, user agent, route, method
- **Timestamps**: When the action occurred

### Audit Log Features

- **Automatic Logging**: All API operations are logged automatically
- **Manual Logging**: Controllers can add custom audit entries
- **Filtering**: Query logs by user, action, entity, date range
- **Export**: Download audit logs in JSON or CSV format
- **Performance**: Indexed for fast queries, TTL for automatic cleanup

## 🛡️ Error Handling

The application includes comprehensive error handling:

- **Validation Errors**: Detailed field-level validation messages
- **Authentication Errors**: Clear auth failure messages
- **Database Errors**: Mongoose error handling
- **Rate Limiting**: Too many requests protection
- **General Errors**: Graceful error responses

## 🔧 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production) | development |
| `PORT` | Server port | 5000 |
| `MONGODB_URI` | MongoDB connection string | - |
| `JWT_SECRET` | JWT signing secret | - |
| `JWT_EXPIRES_IN` | JWT expiration time | 7d |
| `JWT_REFRESH_SECRET` | Refresh token secret | - |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiration | 30d |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | - |
| `EMAIL_HOST` | SMTP host | smtp.gmail.com |
| `EMAIL_PORT` | SMTP port | 587 |
| `EMAIL_USERNAME` | SMTP username | - |
| `EMAIL_PASSWORD` | SMTP password | - |
| `CORS_ORIGIN` | Allowed CORS origin | http://localhost:3000 |

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## 📁 Project Structure

```
src/
├── config/
│   └── database.js          # Database configuration
├── controllers/
│   ├── authController.js    # Authentication logic
│   └── auditController.js   # Audit log logic
├── middleware/
│   ├── authMiddleware.js    # JWT authentication
│   ├── auditLogger.js       # Automatic audit logging
│   ├── errorHandler.js      # Error handling
│   └── validation.js        # Input validation
├── models/
│   ├── User.js             # User model
│   ├── AuditLog.js         # Audit log model
│   └── index.js            # Model exports
├── routes/
│   ├── authRoutes.js       # Authentication routes
│   └── auditRoutes.js      # Audit log routes
├── services/
│   ├── auditLogService.js  # Audit logging service
│   ├── emailService.js     # Email service
│   └── googleAuthService.js # Google OAuth service
├── utils/
│   ├── errorUtils.js       # Error utilities
│   └── jwtService.js       # JWT utilities
├── server.js               # Server configuration
└── index.js               # Application entry point
```

## 🚀 Deployment

### Using PM2 (Recommended)
```bash
npm install -g pm2
pm2 start src/index.js --name "be-image-builder"
pm2 startup
pm2 save
```

### Using Docker
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support, email support@yourapp.com or create an issue in the repository.

---

**Built with ❤️ using Node.js, Express, and MongoDB**