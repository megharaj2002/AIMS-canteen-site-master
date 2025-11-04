// server.js - AIMS Canteen Backend Server
const express = require('express');
const db = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const fs = require('fs');
const crypto = require('crypto');
// Import the new email configuration
const { sendEmail, EmailTemplates, verifyEmailConfig } = require('./config/emailConfig');
// Import admin seeder for startup
const { seedAdminsForStartup } = require('./seedAdmins');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_change_in_production';


// ==================== MIDDLEWARE SETUP ====================

// Async error wrapper - ensures all async route errors are caught
// This prevents unhandled promise rejections that can cause BODY_NOT_A_STRING_FROM_FUNCTION
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// CORS configuration - development friendly
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests, or direct file access)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5000',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5000',
      'http://localhost:8080',
      'http://127.0.0.1:8080',
      'file://',
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    // In development, be more permissive
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ==================== EMAIL ROUTES ====================

// Import and use email test routes (after body parser middleware)
const emailTestRoutes = require('./routes/emailTest');
app.use('/api', emailTestRoutes);

// ==================== FILE UPLOAD CONFIGURATION ====================

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'frontend', 'assets', 'images', 'products');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Create unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// ==================== STATIC FILES & ROUTES ====================

// Serve static assets (CSS, JS, images)
app.use(express.static(path.join(__dirname, '../frontend')));

// Clean URL routes for frontend pages
app.get(['/client-side', '/client-side.html'], (req, res) => {
  res.sendFile(path.resolve(__dirname, '../frontend/client-side.html'));
});

app.get(['/admin-side', '/admin-side.html'], (req, res) => {
  res.sendFile(path.resolve(__dirname, '../frontend/admin-side.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../frontend/index.html'));
});

// ==================== AUTHENTICATION MIDDLEWARE ====================

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Malformed authorization header' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user; // user: { user_id, is_admin, email }
    next();
  });
}

function requireAdmin(req, res, next) {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: 'Admin privileges required' });
  }
  next();
}

// ==================== INPUT VALIDATION HELPERS ====================

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePassword(password) {
  // At least 6 characters, contains at least one letter and one number
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,}$/;
  return passwordRegex.test(password);
}

function validatePhone(phone) {
  // 10 digit phone number
  const phoneRegex = /^\d{10}$/;
  return phoneRegex.test(phone);
}

// ==================== AUTHENTICATION ROUTES ====================

// User Registration
app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Input validation
    if (!name || !email || !password || !phone) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({ 
        error: 'Password must be at least 6 characters and contain at least one letter and one number' 
      });
    }

    if (!validatePhone(phone)) {
      return res.status(400).json({ error: 'Phone number must be exactly 10 digits' });
    }

    // Check if email already exists
    const [existingUsers] = await db.query('SELECT user_id FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Insert new user
    const [result] = await db.query(
      'INSERT INTO users (name, email, password_hash, phone, is_admin) VALUES (?, ?, ?, ?, ?)',
      [name.trim(), email.toLowerCase().trim(), password_hash, phone, 0]
    );

    const user_id = result.insertId;

    // Generate JWT token
    const token = jwt.sign(
      { user_id, is_admin: 0, email: email.toLowerCase() },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        user_id,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone,
        is_admin: 0
      }
    });

  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
});

// User Login
app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Find user by email
    const [users] = await db.query(
      'SELECT user_id, name, email, password_hash, is_admin, phone FROM users WHERE email = ?',
      [email.toLowerCase().trim()]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = users[0];

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { user_id: user.user_id, is_admin: user.is_admin, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        is_admin: user.is_admin
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// Verify token endpoint
app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: {
      user_id: req.user.user_id,
      is_admin: req.user.is_admin,
      email: req.user.email
    }
  });
});

// ==================== PASSWORD RESET ROUTES ====================

// Helper function to generate secure reset token
function generateResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Forgot Password - Send reset email
app.post('/api/auth/forgot-password', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    // Input validation
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if user exists
    const [users] = await db.query(
      'SELECT user_id, name, email FROM users WHERE email = ?',
      [email.toLowerCase().trim()]
    );

    // Always return success to prevent email enumeration
    // But only send email if user exists
    if (users.length > 0) {
      const user = users[0];
      
      // Generate reset token
      const resetToken = generateResetToken();
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now

      // Save reset token to database
      await db.query(
        'INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)',
        [user.email, resetToken, expiresAt]
      );

      // Create reset link
      const resetLink = `http://localhost:3000/reset-password.html?token=${resetToken}`;

      // Send email using new email configuration
      try {
        console.log('Attempting to send password reset email to:', user.email);
        
        // Use the new email template and sender
        const emailOptions = EmailTemplates.passwordReset(resetLink, user.email, user.name);
        const result = await sendEmail(emailOptions);
        
        if (result.success) {
          console.log('✅ Password reset email sent successfully to:', user.email);
          console.log('Email result:', result.messageId);
        } else {
          throw new Error(result.error);
        }
      } catch (emailError) {
        console.error('❌ Email sending error:', emailError);
        
        // Return error to user if email fails
        return res.status(500).json({ 
          error: 'Failed to send reset email. Please check your email configuration.',
          details: emailError.message
        });
      }
    }

    // Always return success message
    res.json({
      success: true,
      message: 'If the email address is registered, a password reset link has been sent.'
    });

  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify Reset Token
app.post('/api/auth/verify-reset-token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required', valid: false });
    }

    // Check if token exists and is not expired
    const [resets] = await db.query(
      'SELECT * FROM password_resets WHERE token = ? AND expires_at > NOW() AND used = 0',
      [token]
    );

    if (resets.length === 0) {
      // Check if token exists but is expired
      const [expiredResets] = await db.query(
        'SELECT * FROM password_resets WHERE token = ?',
        [token]
      );

      if (expiredResets.length > 0) {
        return res.json({
          valid: false,
          expired: true,
          message: 'Reset link has expired. Please request a new password reset.'
        });
      }

      return res.json({
        valid: false,
        expired: false,
        message: 'Invalid reset token.'
      });
    }

    res.json({ valid: true });

  } catch (err) {
    console.error('Verify reset token error:', err);
    res.status(500).json({ error: 'Internal server error', valid: false });
  }
});

// Reset Password
app.post('/api/auth/reset-password', authLimiter, async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Input validation
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (!validatePassword(newPassword)) {
      return res.status(400).json({ 
        error: 'Password must be at least 6 characters and contain at least one letter and one number' 
      });
    }

    // Verify token is valid and not expired
    const [resets] = await db.query(
      'SELECT * FROM password_resets WHERE token = ? AND expires_at > NOW() AND used = 0',
      [token]
    );

    if (resets.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const resetRecord = resets[0];

    // Hash new password
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(newPassword, saltRounds);

    // Update user password
    const [updateResult] = await db.query(
      'UPDATE users SET password_hash = ? WHERE email = ?',
      [password_hash, resetRecord.email]
    );

    if (updateResult.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Mark reset token as used
    await db.query(
      'UPDATE password_resets SET used = 1 WHERE token = ?',
      [token]
    );

    // Clean up expired tokens (optional housekeeping)
    await db.query(
      'DELETE FROM password_resets WHERE expires_at < NOW() OR (email = ? AND used = 1)',
      [resetRecord.email]
    );

    console.log(`Password reset successful for: ${resetRecord.email}`);

    res.json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== TEST ENDPOINTS (Development Only) ====================

// Test endpoint to create password_resets table
app.post('/api/test/create-password-reset-table', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Test endpoints not available in production' });
  }
  
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        token VARCHAR(255) NOT NULL,
        expires_at DATETIME NOT NULL,
        INDEX idx_email (email),
        INDEX idx_token (token)
      )
    `);
    
    res.json({ success: true, message: 'password_resets table created successfully' });
  } catch (error) {
    console.error('Create table error:', error);
    res.status(500).json({ error: 'Failed to create table' });
  }
});



// ==================== FILE UPLOAD ROUTES ====================

// Upload image endpoint
app.post('/api/upload', authenticateToken, requireAdmin, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Return relative path for frontend use
    const imageUrl = `assets/images/products/${req.file.filename}`;
    
    res.json({
      success: true,
      imageUrl: imageUrl,
      message: 'Image uploaded successfully'
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// ==================== CATEGORY MANAGEMENT ====================

// Get all categories
app.get('/api/categories', async (req, res) => {
  try {
    const [categories] = await db.query(
      'SELECT * FROM categories WHERE is_active = 1 ORDER BY category_name'
    );
    res.json(categories);
  } catch (err) {
    console.error('Categories fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Add new category (Admin only)
app.post('/api/categories', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { category_name } = req.body;

    if (!category_name || !category_name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    // Check if category already exists
    const [existing] = await db.query(
      'SELECT category_id FROM categories WHERE category_name = ?',
      [category_name.trim()]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Category already exists' });
    }

    const [result] = await db.query(
      'INSERT INTO categories (category_name) VALUES (?)',
      [category_name.trim()]
    );

    res.status(201).json({
      success: true,
      category_id: result.insertId,
      category_name: category_name.trim(),
      message: 'Category added successfully'
    });

  } catch (err) {
    console.error('Add category error:', err);
    res.status(500).json({ error: 'Failed to add category' });
  }
});

// Delete category (Admin only)
app.delete('/api/categories/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const categoryId = req.params.id;

    // Check if category is being used by products
    const [products] = await db.query(
      'SELECT COUNT(*) as count FROM products WHERE category = (SELECT category_name FROM categories WHERE category_id = ?)',
      [categoryId]
    );

    if (products[0].count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete category. It is being used by products.' 
      });
    }

    const [result] = await db.query(
      'UPDATE categories SET is_active = 0 WHERE category_id = ?',
      [categoryId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ success: true, message: 'Category deleted successfully' });

  } catch (err) {
    console.error('Delete category error:', err);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// ==================== PRODUCTS/MENU ROUTES ====================

// Get all available products
app.get('/api/menu', async (req, res) => {
  try {
    const [products] = await db.query(
      'SELECT item_id, title, category, price, calories, image_url FROM products WHERE available = 1 ORDER BY category, title'
    );
    res.json(products);
  } catch (err) {
    console.error('Menu fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch menu items' });
  }
});

// ==================== ADMIN PRODUCT MANAGEMENT ====================

// Add new product (Admin only)
app.post('/api/admin/products', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { title, description, category, price, calories, image_url, available } = req.body;

    // Input validation
    if (!title || !category || !price) {
      return res.status(400).json({ error: 'Title, category, and price are required' });
    }

    if (isNaN(price) || price <= 0) {
      return res.status(400).json({ error: 'Price must be a positive number' });
    }

    const [result] = await db.query(
      'INSERT INTO products (title, description, category, price, calories, image_url, available) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        title.trim(), 
        description ? description.trim() : null, 
        category.trim(), 
        parseFloat(price), 
        calories || null, 
        image_url || 'assets/images/menu_img1.jpg', 
        available !== undefined ? (available ? 1 : 0) : 1
      ]
    );

    res.status(201).json({
      success: true,
      item_id: result.insertId,
      message: 'Product added successfully'
    });

  } catch (err) {
    console.error('Add product error:', err);
    res.status(500).json({ error: 'Failed to add product' });
  }
});

// Update product (Admin only)
app.put('/api/admin/products/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const { title, description, category, price, calories, image_url, available } = req.body;

    if (!title || !category || !price) {
      return res.status(400).json({ error: 'Title, category, and price are required' });
    }

    if (isNaN(price) || price <= 0) {
      return res.status(400).json({ error: 'Price must be a positive number' });
    }

    const [result] = await db.query(
      'UPDATE products SET title=?, description=?, category=?, price=?, calories=?, image_url=?, available=? WHERE item_id=?',
      [
        title.trim(), 
        description ? description.trim() : null, 
        category.trim(), 
        parseFloat(price), 
        calories || null, 
        image_url || null, 
        available !== undefined ? (available ? 1 : 0) : 1, 
        id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ success: true, message: 'Product updated successfully' });

  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete product (Admin only)
app.delete('/api/admin/products/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;

    const [result] = await db.query('DELETE FROM products WHERE item_id=?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ success: true, message: 'Product deleted successfully' });

  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Get all products for admin (including unavailable)
app.get('/api/admin/products', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [products] = await db.query('SELECT * FROM products ORDER BY created_at DESC');
    res.json(products);
  } catch (err) {
    console.error('Admin products fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// ==================== USER MANAGEMENT (ADMIN) ====================

// Get all users (Admin only)
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT user_id, name, email, phone, is_admin, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(users);
  } catch (err) {
    console.error('Users fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update user admin status (Admin only)
app.put('/api/admin/users/:id/admin', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const { is_admin } = req.body;

    if (typeof is_admin !== 'boolean') {
      return res.status(400).json({ error: 'is_admin must be a boolean value' });
    }

    // Prevent admin from removing their own admin status
    if (req.user.user_id == userId && !is_admin) {
      return res.status(400).json({ error: 'Cannot remove your own admin privileges' });
    }

    const [result] = await db.query(
      'UPDATE users SET is_admin = ? WHERE user_id = ?',
      [is_admin ? 1 : 0, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, message: 'User admin status updated successfully' });

  } catch (err) {
    console.error('Update user admin error:', err);
    res.status(500).json({ error: 'Failed to update user admin status' });
  }
});

// ==================== CART MANAGEMENT ====================

async function getOrCreateCart(user_id) {
  const [rows] = await db.query('SELECT cart_id FROM carts WHERE user_id = ?', [user_id]);
  if (rows.length > 0) return rows[0].cart_id;
  
  const [result] = await db.query('INSERT INTO carts (user_id) VALUES (?)', [user_id]);
  return result.insertId;
}

// Get user's cart
app.get('/api/cart', authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const cart_id = await getOrCreateCart(user_id);
    
    const [items] = await db.query(
      `SELECT ci.cart_item_id, ci.item_id, ci.quantity, ci.unit_price, p.title, p.image_url
       FROM cart_items ci 
       JOIN products p ON ci.item_id = p.item_id 
       WHERE ci.cart_id = ? AND p.available = 1`,
      [cart_id]
    );
    
    let total = 0;
    items.forEach((item) => {
      total += parseFloat(item.unit_price) * item.quantity;
    });
    
    res.json({ cart_id, items, total: total.toFixed(2) });
  } catch (err) {
    console.error('Cart fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

// Add item to cart
app.post('/api/cart', authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const { item_id, quantity } = req.body;

    if (!item_id) {
      return res.status(400).json({ error: 'Item ID is required' });
    }

    const qty = Math.max(1, parseInt(quantity) || 1);
    const cart_id = await getOrCreateCart(user_id);

    // Verify product exists and is available
    const [products] = await db.query(
      'SELECT price FROM products WHERE item_id = ? AND available = 1',
      [item_id]
    );

    if (products.length === 0) {
      return res.status(404).json({ error: 'Product not found or unavailable' });
    }

    const unit_price = products[0].price;

    // Check if item already exists in cart
    const [existing] = await db.query(
      'SELECT cart_item_id, quantity FROM cart_items WHERE cart_id = ? AND item_id = ?',
      [cart_id, item_id]
    );

    if (existing.length > 0) {
      const newQty = existing[0].quantity + qty;
      await db.query(
        'UPDATE cart_items SET quantity = ? WHERE cart_item_id = ?',
        [newQty, existing[0].cart_item_id]
      );
      return res.json({ 
        success: true, 
        cart_item_id: existing[0].cart_item_id, 
        quantity: newQty 
      });
    }

    // Add new item to cart
    const [result] = await db.query(
      'INSERT INTO cart_items (cart_id, item_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
      [cart_id, item_id, qty, unit_price]
    );

    res.status(201).json({
      success: true,
      cart_item_id: result.insertId,
      quantity: qty
    });

  } catch (err) {
    console.error('Add to cart error:', err);
    res.status(500).json({ error: 'Failed to add item to cart' });
  }
});

// Update cart item quantity
app.put('/api/cart/:cart_item_id', authenticateToken, async (req, res) => {
  try {
    const cart_item_id = req.params.cart_item_id;
    const { quantity } = req.body;

    if (quantity === null || quantity === undefined) {
      return res.status(400).json({ error: 'Quantity is required' });
    }

    const qty = parseInt(quantity);
    if (isNaN(qty)) {
      return res.status(400).json({ error: 'Quantity must be a number' });
    }

    const user_id = req.user.user_id;
    const cart_id = await getOrCreateCart(user_id);

    // Verify cart item belongs to user
    const [rows] = await db.query(
      'SELECT cart_item_id FROM cart_items WHERE cart_item_id = ? AND cart_id = ?',
      [cart_item_id, cart_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    if (qty <= 0) {
      await db.query('DELETE FROM cart_items WHERE cart_item_id = ?', [cart_item_id]);
      return res.json({ success: true, deleted: true });
    }

    await db.query(
      'UPDATE cart_items SET quantity = ? WHERE cart_item_id = ?',
      [qty, cart_item_id]
    );

    res.json({ success: true, quantity: qty });

  } catch (err) {
    console.error('Update cart error:', err);
    res.status(500).json({ error: 'Failed to update cart item' });
  }
});

// Remove cart item
app.delete('/api/cart/:cart_item_id', authenticateToken, async (req, res) => {
  try {
    const cart_item_id = req.params.cart_item_id;
    const user_id = req.user.user_id;
    const cart_id = await getOrCreateCart(user_id);

    const [result] = await db.query(
      'DELETE FROM cart_items WHERE cart_item_id = ? AND cart_id = ?',
      [cart_item_id, cart_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    res.json({ success: true, message: 'Item removed from cart' });

  } catch (err) {
    console.error('Remove cart item error:', err);
    res.status(500).json({ error: 'Failed to remove cart item' });
  }
});

// Clear entire cart
app.delete('/api/cart', authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const cart_id = await getOrCreateCart(user_id);

    await db.query('DELETE FROM cart_items WHERE cart_id = ?', [cart_id]);

    res.json({ success: true, message: 'Cart cleared successfully' });

  } catch (err) {
    console.error('Clear cart error:', err);
    res.status(500).json({ error: 'Failed to clear cart' });
  }
});

// ==================== ORDER MANAGEMENT ====================

// Create order from cart
app.post('/api/order', authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.user_id;

    // Get user's cart
    const [cartRows] = await db.query('SELECT cart_id FROM carts WHERE user_id = ?', [user_id]);
    if (cartRows.length === 0) {
      return res.status(400).json({ error: 'No cart found' });
    }

    const cart_id = cartRows[0].cart_id;
    const [items] = await db.query(
      'SELECT ci.item_id, ci.quantity, ci.unit_price FROM cart_items ci WHERE ci.cart_id = ?',
      [cart_id]
    );

    if (items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Calculate total
    let total = 0;
    items.forEach((item) => {
      total += parseFloat(item.unit_price) * item.quantity;
    });

    // Create order
    const [orderResult] = await db.query(
      'INSERT INTO orders (user_id, total_amount, order_status) VALUES (?, ?, ?)',
      [user_id, total, 'Placed']
    );

    const order_id = orderResult.insertId;

    // Add order items
    await Promise.all(
      items.map((item) =>
        db.query(
          'INSERT INTO order_items (order_id, item_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
          [order_id, item.item_id, item.quantity, item.unit_price]
        )
      )
    );

    // Clear cart
    await db.query('DELETE FROM cart_items WHERE cart_id = ?', [cart_id]);

    res.status(201).json({
      success: true,
      order_id,
      total: total.toFixed(2),
      message: 'Order placed successfully'
    });

  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Get user's orders
app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const [orders] = await db.query(
      'SELECT * FROM orders WHERE user_id = ? ORDER BY order_date DESC',
      [user_id]
    );

    // Add items to each order and format date
    for (let order of orders) {
      const [items] = await db.query(
        'SELECT oi.*, p.title, p.image_url FROM order_items oi JOIN products p ON oi.item_id = p.item_id WHERE oi.order_id = ?',
        [order.order_id]
      );
      order.items = items;
      
      // Format order_date for frontend display (Indian Standard Time)
      if (order.order_date) {
        const date = new Date(order.order_date);
        order.formatted_date = date.toLocaleDateString('en-IN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          timeZone: 'Asia/Kolkata'
        });
        order.formatted_time = date.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          timeZone: 'Asia/Kolkata'
        });
        order.formatted_datetime = `${order.formatted_date}, ${order.formatted_time}`;
        order.timezone = 'IST (UTC+5:30)';
      }
    }

    res.json(orders);

  } catch (err) {
    console.error('Get orders error:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// ==================== ADMIN ORDER MANAGEMENT ====================

// Get order statistics (Admin only)
app.get('/api/orders/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { from, to } = req.query;
    
    // Build base query parts
    let whereClause = '';
    let queryParams = [];
    
    // Add date filtering if provided
    if (from && to) {
      whereClause = 'WHERE DATE(order_date) BETWEEN ? AND ?';
      queryParams = [from, to];
    } else if (from) {
      whereClause = 'WHERE DATE(order_date) >= ?';
      queryParams = [from];
    } else if (to) {
      whereClause = 'WHERE DATE(order_date) <= ?';
      queryParams = [to];
    }

    // Get total orders count
    const [totalOrdersResult] = await db.query(
      `SELECT COUNT(*) as total FROM orders ${whereClause}`,
      queryParams
    );
    const totalOrders = totalOrdersResult[0].total;

    // Get orders by status
    const [statusCounts] = await db.query(
      `SELECT 
        order_status,
        COUNT(*) as count 
       FROM orders 
       ${whereClause}
       GROUP BY order_status`,
      queryParams
    );

    // Initialize status counts
    let delivered = 0, preparing = 0, ready = 0;
    
    statusCounts.forEach(row => {
      switch(row.order_status) {
        case 'Delivered':
          delivered = row.count;
          break;
        case 'Preparing':
          preparing = row.count;
          break;
        case 'Ready':
          ready = row.count;
          break;
      }
    });

    // Get total income
    const [incomeResult] = await db.query(
      `SELECT SUM(total_amount) as total_income FROM orders ${whereClause}`,
      queryParams
    );
    const totalIncome = incomeResult[0].total_income || 0;

    // Get date range info for response
    let dateRange = null;
    if (from || to) {
      dateRange = {
        from: from || 'No start date',
        to: to || 'No end date'
      };
    }

    res.json({
      totalOrders,
      delivered,
      preparing,
      ready,
      totalIncome: parseFloat(totalIncome),
      dateRange,
      message: dateRange ? `Statistics for ${from || 'start'} to ${to || 'end'}` : 'All-time statistics'
    });

  } catch (err) {
    console.error('Order stats fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch order statistics' });
  }
});

// Get all orders (Admin only)
app.get('/api/admin/orders', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [orders] = await db.query(
      `SELECT o.*, u.name as user_name, u.email as user_email 
       FROM orders o 
       LEFT JOIN users u ON o.user_id = u.user_id 
       ORDER BY o.order_date DESC`
    );

    // Add items to each order and format date
    for (let order of orders) {
      const [items] = await db.query(
        'SELECT oi.*, p.title FROM order_items oi JOIN products p ON oi.item_id = p.item_id WHERE oi.order_id = ?',
        [order.order_id]
      );
      order.items = items;
      
      // Format order_date for frontend display (Indian Standard Time)
      if (order.order_date) {
        const date = new Date(order.order_date);
        order.formatted_date = date.toLocaleDateString('en-IN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          timeZone: 'Asia/Kolkata'
        });
        order.formatted_time = date.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          timeZone: 'Asia/Kolkata'
        });
        order.formatted_datetime = `${order.formatted_date}, ${order.formatted_time}`;
        order.timezone = 'IST (UTC+5:30)';
      }
    }

    res.json(orders);

  } catch (err) {
    console.error('Admin orders fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Update order status (Admin only)
app.put('/api/admin/orders/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orderId = req.params.id;
    const { order_status } = req.body;

    const validStatuses = ['Placed', 'Preparing', 'Ready', 'Delivered', 'Cancelled'];
    if (!validStatuses.includes(order_status)) {
      return res.status(400).json({ error: 'Invalid order status' });
    }

    const [result] = await db.query(
      'UPDATE orders SET order_status = ? WHERE order_id = ?',
      [order_status, orderId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ success: true, message: 'Order status updated successfully' });

  } catch (err) {
    console.error('Update order status error:', err);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// ==================== ERROR HANDLING ====================

// 404 handler - ensure it always sends a response
app.use('*', (req, res) => {
  // Ensure response is sent (never undefined)
  if (!res.headersSent) {
    res.status(404).json({ error: 'Route not found' });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  
  // Ensure response hasn't been sent
  if (res.headersSent) {
    return next(err);
  }
  
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS policy violation' });
  }
  
  // Always send a JSON response (never undefined or non-string)
  res.status(500).json({ error: 'Internal server error' });
});

// ==================== SERVER STARTUP ====================

// Test database connection on startup
async function testDatabaseConnection() {
  try {
    await db.query('SELECT 1');
    console.log('✅ Database connection successful');
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  }
}

// Start server (only in non-serverless environments)
// Vercel serverless functions don't need app.listen()
if (process.env.VERCEL !== '1' && !process.env.VERCEL_ENV) {
  app.listen(PORT, async () => {
    console.log(`🚀 AIMS Canteen Server started on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    await testDatabaseConnection();
    
    // Auto-seed admin accounts if none exist
    try {
      await seedAdminsForStartup();
    } catch (error) {
      console.log('⚠️  Admin seeder skipped:', error.message);
    }
    
    console.log(`🌐 Server URL: http://localhost:${PORT}`);
    console.log(`📋 API Base URL: http://localhost:${PORT}/api`);
  });
} else {
  // In Vercel environment, just test DB connection
  testDatabaseConnection().catch(err => {
    console.error('Database connection warning:', err.message);
  });
}

module.exports = app;