// setup.js - Database setup and initialization script
const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setupDatabase() {
  console.log('🚀 Starting AIMS Canteen Database Setup...\n');

  // Create connection without specifying database
  const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root1234',
    multipleStatements: true
  });

  try {
    // Read and execute schema file
    const schemaPath = path.join(__dirname, 'db', 'db_schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('📊 Creating database and tables...');
    await connection.promise().query(schema);
    console.log('✅ Database and tables created successfully!');

    // Test connection to the new database
    const dbConnection = mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root1234',
      database: process.env.DB_NAME || 'aims_canteen'
    });

    console.log('🔍 Testing database connection...');
    const [rows] = await dbConnection.promise().query('SELECT COUNT(*) as userCount FROM users');
    console.log(`✅ Database connection successful! Found ${rows[0].userCount} users.`);

    // Check for admin user
    const [adminUsers] = await dbConnection.promise().query('SELECT * FROM users WHERE is_admin = 1');
    if (adminUsers.length > 0) {
      console.log(`👑 Admin user found: ${adminUsers[0].email}`);
    }

    // Check products
    const [products] = await dbConnection.promise().query('SELECT COUNT(*) as productCount FROM products');
    console.log(`🍔 Found ${products[0].productCount} products in menu.`);

    dbConnection.end();
    connection.end();

    console.log('\n🎉 Database setup completed successfully!');
    console.log('📋 Next steps:');
    console.log('   1. Run: npm start');
    console.log('   2. Open: http://localhost:5000');
    console.log('   3. Use admin credentials: nishanthragod1@gmail.com / Nishanth@123');

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    connection.end();
    process.exit(1);
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  setupDatabase();
}

module.exports = setupDatabase;
