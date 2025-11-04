// routes/emailTest.js - Email Testing Route for AIMS Canteen System
const express = require('express');
const router = express.Router();
const { sendEmail, EmailTemplates, verifyEmailConfig } = require('../config/emailConfig');

/**
 * POST /api/test-email
 * Test email functionality by sending a sample email
 * 
 * Body Parameters:
 * - to (required): Recipient email address
 * - type (optional): Email type - 'test' (default) or 'password-reset-sample'
 * 
 * Response:
 * - success: Boolean indicating if email was sent successfully
 * - message: Success/error message
 * - details: Additional information about the email sending process
 */
router.post('/test-email', async (req, res) => {
  try {
    const { to, type = 'test' } = req.body;

    // Input validation
    if (!to) {
      return res.status(400).json({ 
        success: false, 
        message: "Recipient email address is required",
        error: "Missing 'to' field in request body"
      });
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid email address format",
        error: "Please provide a valid email address"
      });
    }

    console.log(`📧 Test email request received for: ${to}`);
    console.log(`📋 Email type: ${type}`);

    // Verify email configuration before attempting to send
    const configValid = await verifyEmailConfig();
    if (!configValid) {
      return res.status(500).json({ 
        success: false, 
        message: "Email configuration is invalid",
        error: "Please check EMAIL_USER and EMAIL_PASS environment variables"
      });
    }

    let emailOptions;

    // Generate email based on type
    switch (type) {
      case 'password-reset-sample':
        // Sample password reset email for testing
        const sampleResetLink = `http://localhost:3000/reset-password.html?token=sample-token-for-testing-only`;
        emailOptions = EmailTemplates.passwordReset(sampleResetLink, to, 'Test User');
        break;
      
      case 'test':
      default:
        // Standard test email
        emailOptions = EmailTemplates.testEmail(to);
        break;
    }

    // Send the email
    const result = await sendEmail(emailOptions);

    if (result.success) {
      console.log('✅ Test email sent successfully!');
      res.status(200).json({ 
        success: true, 
        message: "Email sent successfully!",
        details: {
          messageId: result.messageId,
          recipient: to,
          emailType: type,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      console.log('❌ Test email failed:', result.error);
      res.status(500).json({ 
        success: false, 
        message: "Email sending failed", 
        error: result.error,
        details: result.details
      });
    }

  } catch (error) {
    console.error('❌ Test email route error:', error);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error during email test",
      error: error.message
    });
  }
});

/**
 * GET /api/email-config/status
 * Check email configuration status
 * 
 * Response:
 * - configured: Boolean indicating if email is properly configured
 * - details: Configuration status details
 */
router.get('/email-config/status', async (req, res) => {
  try {
    const isConfigured = await verifyEmailConfig();
    
    const status = {
      configured: isConfigured,
      emailUser: process.env.EMAIL_USER || 'Not set',
      emailService: process.env.EMAIL_SERVICE || 'gmail',
      passwordSet: !!process.env.EMAIL_PASS,
      timestamp: new Date().toISOString()
    };

    if (isConfigured) {
      res.json({
        success: true,
        message: "Email configuration is valid and ready",
        status
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Email configuration needs attention",
        status,
        instructions: [
          "1. Set EMAIL_USER in .env file",
          "2. Set EMAIL_PASS with Google App Password in .env file",
          "3. Ensure 2-Factor Authentication is enabled on Gmail",
          "4. Generate App Password from Google Account Security settings"
        ]
      });
    }

  } catch (error) {
    console.error('Email config status check error:', error);
    res.status(500).json({
      success: false,
      message: "Failed to check email configuration",
      error: error.message
    });
  }
});

/**
 * GET /api/email-config/instructions
 * Get detailed instructions for setting up Gmail App Password
 */
router.get('/email-config/instructions', (req, res) => {
  res.json({
    success: true,
    title: "Gmail App Password Setup Instructions",
    steps: [
      {
        step: 1,
        title: "Enable 2-Factor Authentication",
        description: "Go to Google Account settings and enable 2-Factor Authentication (required for App Passwords)",
        url: "https://myaccount.google.com/security"
      },
      {
        step: 2,
        title: "Access App Passwords",
        description: "Navigate to Security > 2-Step Verification > App passwords",
        note: "This option only appears after 2FA is enabled"
      },
      {
        step: 3,
        title: "Generate App Password",
        description: "Select 'Mail' as the app and generate a new app password",
        note: "Google will generate a 16-character password"
      },
      {
        step: 4,
        title: "Update .env File",
        description: "Copy the generated password and update EMAIL_PASS in your .env file",
        example: "EMAIL_PASS=abcdefghijklmnop (remove spaces)"
      },
      {
        step: 5,
        title: "Test Configuration",
        description: "Use the /api/test-email endpoint to verify the setup works",
        example: "POST /api/test-email with { \"to\": \"your-test-email@example.com\" }"
      }
    ],
    important_notes: [
      "Never use your regular Gmail password - only use App Password",
      "App passwords are 16 characters long without spaces",
      "Each app password can only be viewed once during generation",
      "If you forget the password, generate a new one",
      "App passwords work only when 2FA is enabled"
    ],
    troubleshooting: [
      {
        issue: "Authentication failed",
        solution: "Verify EMAIL_USER and EMAIL_PASS are correct in .env file"
      },
      {
        issue: "App Password option not visible",
        solution: "Ensure 2-Factor Authentication is enabled first"
      },
      {
        issue: "Email not received",
        solution: "Check spam folder, verify recipient email address"
      }
    ]
  });
});

module.exports = router;