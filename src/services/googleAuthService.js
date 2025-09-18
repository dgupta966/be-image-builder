const { OAuth2Client } = require('google-auth-library');

class GoogleAuthService {
  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID;
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    
    if (!this.clientId) {
      console.warn('⚠️ Google Client ID not configured. Google authentication will not work.');
    }
    
    this.client = new OAuth2Client(this.clientId);
  }

  /**
   * Verify Google ID token received from frontend
   * @param {String} token - Google ID token from frontend
   * @returns {Object} User information from Google
   */
  async verifyGoogleToken(token) {
    try {
      if (!this.clientId) {
        throw new Error('Google authentication is not configured');
      }

      const ticket = await this.client.verifyIdToken({
        idToken: token,
        audience: this.clientId
      });

      const payload = ticket.getPayload();
      
      if (!payload) {
        throw new Error('Invalid Google token payload');
      }

      // Extract user information
      const userInfo = {
        googleId: payload.sub,
        email: payload.email,
        name: payload.name,
        firstName: payload.given_name,
        lastName: payload.family_name,
        avatar: payload.picture,
        isEmailVerified: payload.email_verified || false,
        locale: payload.locale
      };

      return userInfo;
    } catch (error) {
      if (error.message.includes('Token used too late')) {
        throw new Error('Google token has expired');
      } else if (error.message.includes('Invalid token signature')) {
        throw new Error('Invalid Google token signature');
      } else if (error.message.includes('Wrong recipient')) {
        throw new Error('Google token audience mismatch');
      }
      
      throw new Error(`Google token verification failed: ${error.message}`);
    }
  }

  /**
   * Validate Google token format
   * @param {String} token - Google ID token
   * @returns {Boolean} Is token format valid
   */
  isValidTokenFormat(token) {
    if (!token || typeof token !== 'string') {
      return false;
    }

    // Google ID tokens are JWT tokens with 3 parts separated by dots
    const parts = token.split('.');
    return parts.length === 3;
  }

  /**
   * Get Google user info from token without verification (for debugging)
   * @param {String} token - Google ID token
   * @returns {Object|null} Decoded token payload
   */
  decodeGoogleToken(token) {
    try {
      if (!this.isValidTokenFormat(token)) {
        return null;
      }

      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString()
      );

      return {
        googleId: payload.sub,
        email: payload.email,
        name: payload.name,
        avatar: payload.picture,
        isEmailVerified: payload.email_verified,
        issuer: payload.iss,
        audience: payload.aud,
        expiresAt: new Date(payload.exp * 1000),
        issuedAt: new Date(payload.iat * 1000)
      };
    } catch (error) {
      console.error('Error decoding Google token:', error);
      return null;
    }
  }

  /**
   * Check if Google authentication is configured
   * @returns {Boolean} Is Google auth configured
   */
  isConfigured() {
    return !!(this.clientId && this.clientSecret);
  }

  /**
   * Get Google OAuth configuration status
   * @returns {Object} Configuration status
   */
  getConfigStatus() {
    return {
      isConfigured: this.isConfigured(),
      hasClientId: !!this.clientId,
      hasClientSecret: !!this.clientSecret
    };
  }
}

module.exports = new GoogleAuthService();