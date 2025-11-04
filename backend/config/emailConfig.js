// config/emailConfig.js - AIMS Canteen Email Configuration
const nodemailer = require("nodemailer");
require("dotenv").config();

/**
 * Email Configuration for AIMS Canteen Management System
 * Uses Gmail SMTP with app password for secure authentication
 */

// Create and configure the email transporter
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  },
  // Additional security and configuration options
  secure: false, // Use TLS
  port: 587,
  connectionTimeout: 60000, // 60 seconds
  greetingTimeout: 30000, // 30 seconds
  socketTimeout: 60000 // 60 seconds
});

/**
 * Verify email configuration on startup
 * This helps identify configuration issues early
 */
const verifyEmailConfig = async () => {
  try {
    // Check if environment variables are set
    if (!process.env.EMAIL_USER) {
      console.error('❌ EMAIL_USER environment variable is not set');
      return false;
    }
    
    if (!process.env.EMAIL_PASS) {
      console.error('❌ EMAIL_PASS environment variable is not set');
      return false;
    }

    // Verify transporter configuration
    const verified = await transporter.verify();
    if (verified) {
      console.log('✅ Email configuration verified successfully');
      console.log(`📧 Email service ready: ${process.env.EMAIL_USER}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Email configuration verification failed:', error.message);
    console.error('📋 Common issues:');
    console.error('   1. Check if EMAIL_USER and EMAIL_PASS are set in .env file');
    console.error('   2. Ensure you are using Google App Password (not regular password)');
    console.error('   3. Verify 2-Factor Authentication is enabled on your Google account');
    console.error('   4. Check if your Gmail account allows less secure apps (if not using App Password)');
    
    return false;
  }
};

/**
 * Enhanced email sending function with better error handling and logging
 * @param {Object} mailOptions - Email options (from, to, subject, html, etc.)
 * @returns {Promise<Object>} - Result object with success status and details
 */
const sendEmail = async (mailOptions) => {
  try {
    // Add default sender if not specified
    if (!mailOptions.from) {
      mailOptions.from = `"AIMS Canteen System" <${process.env.EMAIL_USER}>`;
    }

    console.log(`📧 Attempting to send email to: ${mailOptions.to}`);
    console.log(`📋 Subject: ${mailOptions.subject}`);
    
    const result = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email sent successfully!');
    console.log(`📨 Message ID: ${result.messageId}`);
    
    return {
      success: true,
      messageId: result.messageId,
      response: result.response
    };
    
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    console.error('📋 Error details:', {
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode
    });
    
    // Return detailed error information
    return {
      success: false,
      error: error.message,
      code: error.code,
      details: {
        command: error.command,
        response: error.response,
        responseCode: error.responseCode
      }
    };
  }
};

/**
 * Pre-configured email templates for common use cases
 */
const EmailTemplates = {
  /**
   * Password reset email template
   * @param {string} resetLink - The password reset link
   * @param {string} userEmail - User's email address
   * @param {string} userName - User's name (optional)
   * @returns {Object} - Email options object
   */
  passwordReset: (resetLink, userEmail, userName = null) => {
    const displayName = userName ? userName : userEmail.split('@')[0];
    
    return {
      to: userEmail,
      subject: "AIMS Canteen – Password Reset Request",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #dc3545, #28a745); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .logo { font-size: 32px; margin-bottom: 10px; }
            .content { background: #ffffff; padding: 40px 30px; border: 1px solid #e1e5e9; border-radius: 0 0 8px 8px; }
            .reset-button { 
              display: inline-block; 
              padding: 15px 30px; 
              background: #28a745; 
              color: white !important; 
              text-decoration: none; 
              border-radius: 8px; 
              font-weight: bold;
              font-size: 16px;
              margin: 20px 0;
            }
            .reset-button:hover { background: #218838; }
            .warning-box { 
              background: #fff3cd; 
              color: #856404; 
              padding: 20px; 
              border-radius: 8px; 
              margin: 25px 0; 
              border-left: 4px solid #ffc107;
            }
            .footer { 
              margin-top: 30px; 
              padding-top: 20px; 
              border-top: 1px solid #dee2e6; 
              font-size: 12px; 
              color: #6c757d; 
              text-align: center;
            }
            .link-box {
              background: #f8f9fa;
              padding: 15px;
              border-radius: 6px;
              word-break: break-all;
              font-family: monospace;
              font-size: 12px;
              margin: 15px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🍽️ AIMS Canteen</div>
              <h2>Password Reset Request</h2>
            </div>
            <div class="content">
              <h2>Reset Your Password</h2>
              <p>Hello ${displayName},</p>
              <p>We received a request to reset the password for your AIMS Canteen account: <strong>${userEmail}</strong></p>
              <p>Click the button below to reset your password:</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetLink}" class="reset-button">Reset My Password</a>
              </div>
              
              <div class="warning-box">
                <strong>⚠️ Important Security Information:</strong>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>This link expires in <strong>30 minutes</strong></li>
                  <li>This link can only be used <strong>once</strong></li>
                  <li>If you didn't request this, please ignore this email</li>
                  <li>Never share this link with anyone</li>
                </ul>
              </div>
              
              <p>If the button above doesn't work, copy and paste this link into your browser:</p>
              <div class="link-box">${resetLink}</div>
              
              <div class="footer">
                <p><strong>AIMS Canteen Management System</strong></p>
                <p>AIMS Institutes Bangalore<br>
                1st Cross, 1st Stage, Peenya, Bengaluru 560058, Karnataka, INDIA</p>
                <p style="margin-top: 15px;">This is an automated email. Please do not reply to this message.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };
  },

  /**
   * Test email template
   * @param {string} recipient - Recipient email address
   * @returns {Object} - Email options object
   */
  testEmail: (recipient) => ({
    to: recipient,
    subject: "Test Email from AIMS Canteen System",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #dc3545, #28a745); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0;">🍽️ AIMS Canteen System</h1>
        </div>
        <div style="background: white; padding: 30px; border: 1px solid #e1e5e9; border-radius: 0 0 8px 8px;">
          <h2 style="color: #333;">Email Configuration Test</h2>
          <p>Congratulations! This test email was sent successfully from the AIMS Canteen Management System backend.</p>
          
          <div style="background: #d4edda; color: #155724; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <strong>✅ Test Results:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Email service: Gmail SMTP</li>
              <li>Authentication: Successful</li>
              <li>Delivery: Confirmed</li>
              <li>Time sent: ${new Date().toLocaleString()}</li>
            </ul>
          </div>
          
          <p>If you received this email, your email configuration is working correctly and ready for production use.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 12px; color: #6c757d; text-align: center;">
            <p><strong>AIMS Canteen Management System</strong><br>
            Automated Email Service</p>
          </div>
        </div>
      </div>
    `
  }),

  /**
   * Order notification email template (for future use)
   * @param {Object} orderDetails - Order information
   * @returns {Object} - Email options object
   */
  orderNotification: (orderDetails) => ({
    to: orderDetails.customerEmail,
    subject: `AIMS Canteen - Order Confirmation #${orderDetails.orderId}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #dc3545, #28a745); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0;">🍽️ AIMS Canteen</h1>
          <h2 style="margin: 10px 0 0 0;">Order Confirmation</h2>
        </div>
        <div style="background: white; padding: 30px; border: 1px solid #e1e5e9; border-radius: 0 0 8px 8px;">
          <h3>Thank you for your order, ${orderDetails.customerName}!</h3>
          <p>Your order <strong>#${orderDetails.orderId}</strong> has been confirmed and is being prepared.</p>
          
          <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <strong>Order Details:</strong>
            <p style="margin: 5px 0;">Total Amount: ₹${orderDetails.total}</p>
            <p style="margin: 5px 0;">Order Time: ${new Date().toLocaleString()}</p>
            <p style="margin: 5px 0;">Estimated Ready Time: ${orderDetails.estimatedTime || '15-20 minutes'}</p>
          </div>
          
          <p>We'll notify you when your order is ready for pickup.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 12px; color: #6c757d; text-align: center;">
            <p><strong>AIMS Canteen Management System</strong></p>
          </div>
        </div>
      </div>
    `
  })
};

// Initialize email configuration verification
verifyEmailConfig();

module.exports = {
  transporter,
  sendEmail,
  EmailTemplates,
  verifyEmailConfig
};