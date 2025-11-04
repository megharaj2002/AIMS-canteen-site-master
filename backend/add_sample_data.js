// add_sample_data.js - Add sample data for dashboard demonstration
const db = require('./db');

async function addSampleData() {
  try {
    console.log('Adding sample data for dashboard...');

    // Check if sample user exists
    const [existingUser] = await db.query('SELECT user_id FROM users WHERE email = ?', ['john@example.com']);
    
    let userId;
    if (existingUser.length === 0) {
      // Insert sample customer user
      const [userResult] = await db.query(
        'INSERT INTO users (name, email, password_hash, phone, is_admin) VALUES (?, ?, ?, ?, ?)',
        ['John Doe', 'john@example.com', '$2b$12$CwhMP2/1afk/hg.jG4jcte/pIJZI4szNi13h/BfHFt5rub4BxOprG', '9876543210', 0]
      );
      userId = userResult.insertId;
      console.log('Sample user created with ID:', userId);
    } else {
      userId = existingUser[0].user_id;
      console.log('Using existing sample user with ID:', userId);
    }

    // Check if sample orders already exist
    const [existingOrders] = await db.query('SELECT COUNT(*) as count FROM orders WHERE user_id = ?', [userId]);
    
    if (existingOrders[0].count > 0) {
      console.log('Sample orders already exist. Skipping...');
      return;
    }

    // Insert sample orders
    const sampleOrders = [
      [userId, 125.50, 'Delivered', '2024-01-15 10:30:00'],
      [userId, 89.75, 'Delivered', '2024-01-16 12:15:00'],
      [1, 67.25, 'Preparing', '2024-01-17 14:20:00'],
      [userId, 156.00, 'Ready', '2024-01-17 15:45:00'],
      [1, 234.80, 'Delivered', '2024-01-18 11:30:00'],
      [userId, 78.50, 'Preparing', '2024-01-18 13:10:00'],
      [1, 145.25, 'Ready', '2024-01-18 16:25:00'],
      [userId, 99.75, 'Delivered', '2024-01-19 12:40:00'],
      [1, 187.60, 'Preparing', '2024-01-19 14:55:00'],
      [userId, 112.30, 'Ready', '2024-01-19 17:20:00'],
      [userId, 89.90, 'Delivered', '2024-01-20 11:15:00'],
      [1, 176.40, 'Preparing', '2024-01-20 13:30:00'],
      [userId, 134.25, 'Ready', '2024-01-20 15:45:00'],
      [1, 98.80, 'Delivered', '2024-01-20 18:20:00'],
      [userId, 167.50, 'Preparing', '2024-01-21 12:10:00']
    ];

    for (const order of sampleOrders) {
      await db.query(
        'INSERT INTO orders (user_id, total_amount, order_status, order_date) VALUES (?, ?, ?, ?)',
        order
      );
    }

    console.log(`✅ Successfully added ${sampleOrders.length} sample orders!`);
    
    // Show current statistics
    const [stats] = await db.query(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(CASE WHEN order_status = 'Delivered' THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN order_status = 'Preparing' THEN 1 ELSE 0 END) as preparing,
        SUM(CASE WHEN order_status = 'Ready' THEN 1 ELSE 0 END) as ready,
        ROUND(SUM(total_amount), 2) as total_income
      FROM orders
    `);
    
    console.log('📊 Current Dashboard Statistics:');
    console.log(`   Total Orders: ${stats[0].total_orders}`);
    console.log(`   Delivered: ${stats[0].delivered}`);
    console.log(`   Preparing: ${stats[0].preparing}`);
    console.log(`   Ready: ${stats[0].ready}`);
    console.log(`   Total Income: ₹${stats[0].total_income}`);

  } catch (error) {
    console.error('❌ Error adding sample data:', error);
  } finally {
    process.exit();
  }
}

addSampleData();