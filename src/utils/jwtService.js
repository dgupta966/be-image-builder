const jwt = require('jsonwebtoken');
const { promisify } = require('util');

class JWTService {
  constructor() {
    this.secret = process.env.JWT_SECRET;
    this.expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    this.refreshSecret = process.env.JWT_REFRESH_SECRET;
    this.refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

    if (!this.secret || !this.refreshSecret) {
      throw new Error('JWT secrets are not configured in environment variables');
    }
  }

  /**
   * Generate access token
   * @param {Object} payload - Token payload
   * @returns {String} JWT token
   */
  generateAccessToken(payload) {
    return jwt.sign(payload, this.secret, {
      expiresIn: this.expiresIn,
      issuer: process.env.APP_NAME || 'BE Image Builder',
      audience: 'user'
    });
  }

  /**
   * Generate refresh token
   * @param {Object} payload - Token payload
   * @returns {String} JWT refresh token
   */
  generateRefreshToken(payload) {
    return jwt.sign(payload, this.refreshSecret, {
      expiresIn: this.refreshExpiresIn,
      issuer: process.env.APP_NAME || 'BE Image Builder',
      audience: 'refresh'
    });
  }

  /**
   * Generate both access and refresh tokens
   * @param {Object} user - User object
   * @returns {Object} Tokens object
   */
  generateTokens(user) {
    const payload = {
      id: user._id || user.id,
      email: user.email,
      role: user.role || 'user'
    };

    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken({ id: payload.id });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.expiresIn
    };
  }

  /**
   * Verify access token
   * @param {String} token - JWT token
   * @returns {Object} Decoded token payload
   */
  async verifyAccessToken(token) {
    try {
      const decoded = await promisify(jwt.verify)(token, this.secret);
      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Access token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid access token');
      }
      throw error;
    }
  }

  /**
   * Verify refresh token
   * @param {String} token - JWT refresh token
   * @returns {Object} Decoded token payload
   */
  async verifyRefreshToken(token) {
    try {
      const decoded = await promisify(jwt.verify)(token, this.refreshSecret);
      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Refresh token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid refresh token');
      }
      throw error;
    }
  }

  /**
   * Extract token from Authorization header
   * @param {String} authHeader - Authorization header value
   * @returns {String|null} JWT token
   */
  extractToken(authHeader) {
    if (!authHeader) return null;
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }
    
    return parts[1];
  }

  /**
   * Decode token without verification (for debugging)
   * @param {String} token - JWT token
   * @returns {Object} Decoded token
   */
  decodeToken(token) {
    return jwt.decode(token);
  }

  /**
   * Check if token is expired
   * @param {String} token - JWT token
   * @returns {Boolean} Is token expired
   */
  isTokenExpired(token) {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded || !decoded.exp) return true;
      
      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp < currentTime;
    } catch {
      return true;
    }
  }

  /**
   * Get token expiration time
   * @param {String} token - JWT token
   * @returns {Date|null} Expiration date
   */
  getTokenExpiration(token) {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded || !decoded.exp) return null;
      
      return new Date(decoded.exp * 1000);
    } catch {
      return null;
    }
  }
}

module.exports = new JWTService();