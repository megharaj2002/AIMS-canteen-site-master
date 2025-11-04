// Example Integration Code for AIMS Canteen Email System
// This file demonstrates how to use the email configuration in your application

const { sendEmail, EmailTemplates } = require('./config/emailConfig');

// ==================== EXAMPLE 1: Forgot Password Integration ====================

/**
 * Example of how the forgot password feature now uses the email system
 * This is already integrated in server.js
 */
async function forgotPasswordExample(user, resetToken) {
  try {
    // Create reset link
    const resetLink = `http://localhost:3000/reset-password.html?token=${resetToken}`;
    
    // Use the email template system
    const emailOptions = EmailTemplates.passwordReset(resetLink, user.email, user.name);
    
    // Send email using the new configuration
    const result = await sendEmail(emailOptions);
    
    if (result.success) {
      console.log('✅ Password reset email sent successfully');
      return { success: true, messageId: result.messageId };
    } else {
      console.error('❌ Email sending failed:', result.error);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('❌ Forgot password email error:', error);
    return { success: false, error: error.message };
  }
}

// ==================== EXAMPLE 2: Order Confirmation Email ====================

/**
 * Example of sending order confirmation emails (for future implementation)
 */
async function sendOrderConfirmationEmail(orderDetails) {
  try {
    const emailOptions = EmailTemplates.orderNotification(orderDetails);
    const result = await sendEmail(emailOptions);
    
    if (result.success) {
      console.log(`✅ Order confirmation sent to: ${orderDetails.customerEmail}`);
      return result;
    } else {
      console.error('❌ Order confirmation failed:', result.error);
      return result;
    }
  } catch (error) {
    console.error('❌ Order confirmation error:', error);
    return { success: false, error: error.message };
  }
}

// ==================== EXAMPLE 3: Custom Email Sending ====================

/**
 * Example of sending custom emails using the email system
 */
async function sendCustomEmail(recipient, subject, htmlContent) {
  try {
    const emailOptions = {
      to: recipient,
      subject: subject,
      html: htmlContent,
      // The 'from' field will be automatically set by the sendEmail function
      // as "AIMS Canteen System <manumanumanu9480@gmail.com>"
    };
    
    const result = await sendEmail(emailOptions);
    
    if (result.success) {
      console.log(`✅ Custom email sent to: ${recipient}`);
      console.log(`📨 Message ID: ${result.messageId}`);
      return result;
    } else {
      console.error('❌ Custom email failed:', result.error);
      return result;
    }
  } catch (error) {
    console.error('❌ Custom email error:', error);
    return { success: false, error: error.message };
  }
}

// ==================== EXAMPLE 4: Admin Notification Email ====================

/**
 * Example of sending admin notification emails
 */
async function sendAdminNotification(adminEmail, notificationType, details) {
  try {
    let subject, htmlContent;
    
    switch (notificationType) {
      case 'new_order':
        subject = `New Order #${details.orderId} - AIMS Canteen`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>🍽️ New Order Received</h2>
            <p><strong>Order ID:</strong> ${details.orderId}</p>
            <p><strong>Customer:</strong> ${details.customerName}</p>
            <p><strong>Total Amount:</strong> ₹${details.total}</p>
            <p><strong>Order Time:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Items:</strong></p>
            <ul>
              ${details.items.map(item => `<li>${item.name} x ${item.quantity} - ₹${item.price}</li>`).join('')}
            </ul>
            <p>Please prepare this order.</p>
          </div>
        `;
        break;
        
      case 'low_stock':
        subject = 'Low Stock Alert - AIMS Canteen';
        htmlContent = `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>⚠️ Low Stock Alert</h2>
            <p>The following items are running low on stock:</p>
            <ul>
              ${details.items.map(item => `<li>${item.name} - Only ${item.stock} left</li>`).join('')}
            </ul>
            <p>Please restock these items soon.</p>
          </div>
        `;
        break;
        
      default:
        subject = 'AIMS Canteen Notification';
        htmlContent = `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>📢 System Notification</h2>
            <p>${details.message}</p>
          </div>
        `;
    }
    
    const emailOptions = {
      to: adminEmail,
      subject: subject,
      html: htmlContent
    };
    
    const result = await sendEmail(emailOptions);
    
    if (result.success) {
      console.log(`✅ Admin notification sent: ${notificationType}`);
      return result;
    } else {
      console.error('❌ Admin notification failed:', result.error);
      return result;
    }
  } catch (error) {
    console.error('❌ Admin notification error:', error);
    return { success: false, error: error.message };
  }
}

// ==================== EXAMPLE 5: Email Validation and Error Handling ====================

/**
 * Example of robust email sending with validation and error handling
 */
async function sendEmailWithValidation(recipientEmail, emailType, data) {
  try {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      return { 
        success: false, 
        error: 'Invalid email format' 
      };
    }
    
    // Check if email configuration is valid
    const { verifyEmailConfig } = require('./config/emailConfig');
    const configValid = await verifyEmailConfig();
    
    if (!configValid) {
      return { 
        success: false, 
        error: 'Email configuration is invalid' 
      };
    }
    
    // Send email based on type
    let result;
    switch (emailType) {
      case 'password_reset':
        const emailOptions = EmailTemplates.passwordReset(data.resetLink, recipientEmail, data.userName);
        result = await sendEmail(emailOptions);
        break;
        
      case 'test':
        const testOptions = EmailTemplates.testEmail(recipientEmail);
        result = await sendEmail(testOptions);
        break;
        
      case 'order_confirmation':
        const orderOptions = EmailTemplates.orderNotification(data);
        result = await sendEmail(orderOptions);
        break;
        
      default:
        return { 
          success: false, 
          error: 'Unknown email type' 
        };
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Email sending error:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

// ==================== EXAMPLE USAGE ====================

/**
 * Example of how to use these functions in your routes
 */

// In a route handler:
/*
app.post('/api/orders', async (req, res) => {
  try {
    // ... order creation logic ...
    
    // Send order confirmation to customer
    const orderConfirmation = await sendOrderConfirmationEmail({
      orderId: newOrder.id,
      customerEmail: req.body.customerEmail,
      customerName: req.body.customerName,
      total: newOrder.total,
      estimatedTime: '15-20 minutes'
    });
    
    // Send notification to admin
    const adminNotification = await sendAdminNotification(
      'admin@aims.edu.in',
      'new_order',
      {
        orderId: newOrder.id,
        customerName: req.body.customerName,
        total: newOrder.total,
        items: newOrder.items
      }
    );
    
    res.json({
      success: true,
      order: newOrder,
      emailSent: orderConfirmation.success,
      adminNotified: adminNotification.success
    });
    
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});
*/

module.exports = {
  forgotPasswordExample,
  sendOrderConfirmationEmail,
  sendCustomEmail,
  sendAdminNotification,
  sendEmailWithValidation
};