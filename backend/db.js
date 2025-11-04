// db.js - Database connection configuration
const mysql = require('mysql2');
const dotenv = require('dotenv');
dotenv.config();

// Database configuration with improved settings
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root1234',
  database: process.env.DB_NAME || 'aims_canteen',
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: '+05:30', // Indian Standard Time (IST)
  // Enable SSL in production
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Get promise-based interface
const promisePool = pool.promise();

// Test connection on startup
async function testConnection() {
  try {
    const connection = await promisePool.getConnection();
    console.log('✅ Database connection established');
    connection.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    throw error;
  }
}

// Handle pool errors
pool.on('connection', (connection) => {
  console.log('New database connection established');
});

pool.on('error', (err) => {
  console.error('Database pool error:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.log('Database connection lost, attempting to reconnect...');
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Closing database connections...');
  pool.end((err) => {
    if (err) {
      console.error('Error closing database connections:', err);
    } else {
      console.log('Database connections closed');
    }
    process.exit(0);
  });
});

module.exports = promisePool;
