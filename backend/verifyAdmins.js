// verifyAdmins.js - Verify admin accounts can log in successfully
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

// Admin credentials to test
const adminCredentials = [
  { email: 'megharajsgr12@gmail.com', password: 'Megharaj@123' },
  { email: 'madhuchandra566@gmail.com', password: 'Madhu@123' },
  { email: 'nishanthragod1@gmail.com', password: 'Nishanth@123' }
];

/**
 * Test admin login credentials
 * @param {object} connection - MySQL connection
 * @param {string} email - Admin email
 * @param {string} password - Admin password
 * @returns {Promise<boolean>} - True if login successful
 */
async function testAdminLogin(connection, email, password) {
  try {
    // Get admin from database
    const [users] = await connection.execute(
      'SELECT user_id, name, email, password_hash, is_admin FROM users WHERE email = ? AND is_admin = 1',
      [email]
    );

    if (users.length === 0) {
      console.log(`❌ Admin not found: ${email}`);
      return false;
    }

    const admin = users[0];
    
    // Verify password
    const passwordMatch = await bcrypt.compare(password, admin.password_hash);
    
    if (passwordMatch) {
      console.log(`✅ Login successful: ${admin.name} (${email})`);
      return true;
    } else {
      console.log(`❌ Invalid password for: ${email}`);
      return false;
    }
    
  } catch (error) {
    console.error(`❌ Error testing login for ${email}:`, error.message);
    return false;
  }
}

/**
 * Main verification function
 */
async function verifyAdmins() {
  let connection;
  
  try {
    console.log('🔍 Verifying admin accounts...\n');
    
    // Create database connection
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connection established\n');
    
    let successCount = 0;
    let totalCount = adminCredentials.length;
    
    // Test each admin credential
    for (const cred of adminCredentials) {
      console.log(`🧪 Testing login: ${cred.email}`);
      const success = await testAdminLogin(connection, cred.email, cred.password);
      if (success) successCount++;
      console.log(''); // Empty line for readability
    }
    
    // Summary
    console.log('📋 Verification Summary:');
    console.log(`   ✅ Successful logins: ${successCount}/${totalCount}`);
    console.log(`   ❌ Failed logins: ${totalCount - successCount}/${totalCount}`);
    
    if (successCount === totalCount) {
      console.log('\n🎉 All admin accounts verified successfully!');
      console.log('👥 You can now log in to the admin panel with any of these credentials:');
      adminCredentials.forEach((cred, index) => {
        console.log(`   ${index + 1}. Email: ${cred.email}`);
        console.log(`      Password: ${cred.password}`);
      });
    } else {
      console.log('\n⚠️  Some admin accounts failed verification. Please check the credentials.');
    }
    
  } catch (error) {
    console.error('❌ Error during verification:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run verification
if (require.main === module) {
  verifyAdmins()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Fatal error:', error.message);
      process.exit(1);
    });
}

module.exports = { verifyAdmins };