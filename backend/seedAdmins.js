// seedAdmins.js - Add default admin accounts to AIMS Canteen Management System
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root1234',
  database: process.env.DB_NAME || 'aims_canteen'
};

// Default admin accounts to add
const admins = [
  { 
    name: 'Megharaj', 
    email: 'megharajsgr12@gmail.com', 
    password: 'Megharaj@123', 
    phone: '9876543210' // Adding phone number to match schema
  },
  { 
    name: 'Madhu Chandra', 
    email: 'madhuchandra566@gmail.com', 
    password: 'Madhu@123', 
    phone: '9876543211' // Adding phone number to match schema
  },
  { 
    name: 'Nishanth', 
    email: 'nishanthragod1@gmail.com', 
    password: 'Nishanth@123', 
    phone: '9141182032' // Using existing phone from schema
  }
];

/**
 * Hash password using bcrypt with salt rounds 12 (matching memory requirements)
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hashed password
 */
async function hashPassword(password) {
  const saltRounds = 12; // Using salt rounds 12 as per memory requirements
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Check if admin already exists in database
 * @param {object} connection - MySQL connection
 * @param {string} email - Admin email to check
 * @returns {Promise<boolean>} - True if admin exists
 */
async function adminExists(connection, email) {
  try {
    const [rows] = await connection.execute(
      'SELECT user_id FROM users WHERE email = ? AND is_admin = 1',
      [email]
    );
    return rows.length > 0;
  } catch (error) {
    console.error(`❌ Error checking if admin exists: ${error.message}`);
    throw error;
  }
}

/**
 * Insert new admin into database
 * @param {object} connection - MySQL connection
 * @param {object} admin - Admin data
 */
async function insertAdmin(connection, admin) {
  try {
    const hashedPassword = await hashPassword(admin.password);
    
    await connection.execute(
      'INSERT INTO users (name, email, password_hash, phone, is_admin) VALUES (?, ?, ?, ?, ?)',
      [admin.name, admin.email, hashedPassword, admin.phone, 1]
    );
    
    console.log(`✅ Admin added successfully: ${admin.name} (${admin.email})`);
  } catch (error) {
    console.error(`❌ Error inserting admin ${admin.email}: ${error.message}`);
    throw error;
  }
}

/**
 * Main function to seed admin accounts
 */
async function seedAdmins() {
  let connection;
  
  try {
    console.log('🚀 Starting admin seeding process...');
    console.log('📊 Database Configuration:');
    console.log(`   Host: ${dbConfig.host}`);
    console.log(`   Database: ${dbConfig.database}`);
    console.log(`   User: ${dbConfig.user}`);
    
    // Create database connection
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connection established');
    
    let addedCount = 0;
    let existingCount = 0;
    
    // Process each admin
    for (const admin of admins) {
      console.log(`\n🔍 Processing admin: ${admin.name} (${admin.email})`);
      
      const exists = await adminExists(connection, admin.email);
      
      if (exists) {
        console.log(`ℹ️  Admin already exists: ${admin.email}`);
        existingCount++;
      } else {
        await insertAdmin(connection, admin);
        addedCount++;
      }
    }
    
    // Summary
    console.log('\n📋 Seeding Summary:');
    console.log(`   ✅ New admins added: ${addedCount}`);
    console.log(`   ℹ️  Existing admins skipped: ${existingCount}`);
    console.log(`   📊 Total admins processed: ${admins.length}`);
    
    // Verify all admins
    console.log('\n🔍 Verifying admin accounts...');
    const [allAdmins] = await connection.execute(
      'SELECT user_id, name, email, phone, created_at FROM users WHERE is_admin = 1 ORDER BY user_id'
    );
    
    console.log('\n👥 Current admin accounts in database:');
    allAdmins.forEach((admin, index) => {
      console.log(`   ${index + 1}. ${admin.name} (${admin.email}) - ID: ${admin.user_id}`);
    });
    
    console.log('\n✅ Admin seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during admin seeding:', error.message);
    console.error('\n🔧 Troubleshooting tips:');
    console.error('   1. Check if MySQL server is running');
    console.error('   2. Verify database credentials in .env file');
    console.error('   3. Ensure database "aims_canteen" exists');
    console.error('   4. Check if users table has been created');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

/**
 * Export function for use in other modules
 */
async function seedAdminsForStartup() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // Check if any admin exists
    const [adminCount] = await connection.execute(
      'SELECT COUNT(*) as count FROM users WHERE is_admin = 1'
    );
    
    if (adminCount[0].count === 0) {
      console.log('🔍 No admin accounts found. Running admin seeder...');
      await connection.end();
      await seedAdmins();
    } else {
      console.log(`✅ Found ${adminCount[0].count} admin account(s). Skipping seeder.`);
      await connection.end();
    }
  } catch (error) {
    console.error('❌ Error checking admin accounts:', error.message);
  }
}

// Run seeder if this file is executed directly
if (require.main === module) {
  seedAdmins()
    .then(() => {
      console.log('\n🎉 Process completed. You can now log in with admin credentials.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Fatal error:', error.message);
      process.exit(1);
    });
}

module.exports = { seedAdmins, seedAdminsForStartup };