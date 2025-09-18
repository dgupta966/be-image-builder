const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USERNAME,
          pass: process.env.EMAIL_PASSWORD
        }
      });

      console.log('✅ Email service initialized');
    } catch (error) {
      console.error('❌ Email service initialization failed:', error.message);
    }
  }

  /**
   * Send email
   * @param {Object} options - Email options
   * @returns {Promise<Object>} Email result
   */
  async sendEmail({ to, subject, html, text }) {
    try {
      if (!this.transporter) {
        throw new Error('Email service not configured');
      }

      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USERNAME,
        to,
        subject,
        html,
        text
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email sent to ${to}: ${subject}`);
      return result;
    } catch (error) {
      console.error(`❌ Failed to send email to ${to}:`, error.message);
      throw error;
    }
  }

  /**
   * Send password reset email
   * @param {string} email - User email
   * @param {string} resetToken - Password reset token
   * @param {string} userName - User name
   * @returns {Promise<Object>} Email result
   */
  async sendPasswordResetEmail(email, resetToken, userName) {
    const resetUrl = `${process.env.APP_URL}/reset-password?token=${resetToken}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <title>Password Reset</title>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #f4f4f4; padding: 20px; text-align: center; }
              .content { padding: 20px; }
              .button { 
                  display: inline-block; 
                  background-color: #007bff; 
                  color: white; 
                  padding: 12px 24px; 
                  text-decoration: none; 
                  border-radius: 4px; 
                  margin: 20px 0; 
              }
              .footer { background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 14px; }
              .warning { color: #dc3545; font-weight: bold; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>${process.env.APP_NAME || 'BE Image Builder'}</h1>
              </div>
              <div class="content">
                  <h2>Password Reset Request</h2>
                  <p>Hi ${userName},</p>
                  <p>You requested a password reset for your account. Click the button below to reset your password:</p>
                  <p>
                      <a href="${resetUrl}" class="button">Reset Password</a>
                  </p>
                  <p>Or copy and paste this link into your browser:</p>
                  <p><a href="${resetUrl}">${resetUrl}</a></p>
                  <p class="warning">This link will expire in 10 minutes.</p>
                  <p>If you didn't request a password reset, please ignore this email or contact support if you have questions.</p>
                  <p>Thanks,<br>The ${process.env.APP_NAME || 'BE Image Builder'} Team</p>
              </div>
              <div class="footer">
                  <p>This is an automated message, please do not reply to this email.</p>
              </div>
          </div>
      </body>
      </html>
    `;

    const text = `
      Password Reset Request
      
      Hi ${userName},
      
      You requested a password reset for your account. Please visit the following link to reset your password:
      
      ${resetUrl}
      
      This link will expire in 10 minutes.
      
      If you didn't request a password reset, please ignore this email.
      
      Thanks,
      The ${process.env.APP_NAME || 'BE Image Builder'} Team
    `;

    return this.sendEmail({
      to: email,
      subject: 'Password Reset Request',
      html,
      text
    });
  }

  /**
   * Send email verification email
   * @param {string} email - User email
   * @param {string} verificationToken - Email verification token
   * @param {string} userName - User name
   * @returns {Promise<Object>} Email result
   */
  async sendEmailVerification(email, verificationToken, userName) {
    const verificationUrl = `${process.env.APP_URL}/verify-email?token=${verificationToken}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <title>Email Verification</title>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #f4f4f4; padding: 20px; text-align: center; }
              .content { padding: 20px; }
              .button { 
                  display: inline-block; 
                  background-color: #28a745; 
                  color: white; 
                  padding: 12px 24px; 
                  text-decoration: none; 
                  border-radius: 4px; 
                  margin: 20px 0; 
              }
              .footer { background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 14px; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>${process.env.APP_NAME || 'BE Image Builder'}</h1>
              </div>
              <div class="content">
                  <h2>Welcome! Please Verify Your Email</h2>
                  <p>Hi ${userName},</p>
                  <p>Thanks for signing up! Please verify your email address by clicking the button below:</p>
                  <p>
                      <a href="${verificationUrl}" class="button">Verify Email</a>
                  </p>
                  <p>Or copy and paste this link into your browser:</p>
                  <p><a href="${verificationUrl}">${verificationUrl}</a></p>
                  <p>This link will expire in 24 hours.</p>
                  <p>If you didn't create an account, please ignore this email.</p>
                  <p>Thanks,<br>The ${process.env.APP_NAME || 'BE Image Builder'} Team</p>
              </div>
              <div class="footer">
                  <p>This is an automated message, please do not reply to this email.</p>
              </div>
          </div>
      </body>
      </html>
    `;

    const text = `
      Welcome! Please Verify Your Email
      
      Hi ${userName},
      
      Thanks for signing up! Please verify your email address by visiting:
      
      ${verificationUrl}
      
      This link will expire in 24 hours.
      
      If you didn't create an account, please ignore this email.
      
      Thanks,
      The ${process.env.APP_NAME || 'BE Image Builder'} Team
    `;

    return this.sendEmail({
      to: email,
      subject: 'Please Verify Your Email',
      html,
      text
    });
  }

  /**
   * Check if email service is configured
   * @returns {boolean} Is email service configured
   */
  isConfigured() {
    return !!(
      process.env.EMAIL_HOST &&
      process.env.EMAIL_USERNAME &&
      process.env.EMAIL_PASSWORD
    );
  }
}

module.exports = new EmailService();