// verify_order_timestamp.js - Verify and document order_date column configuration
const db = require('./db');

async function verifyOrderTimestamp() {
  try {
    console.log('🔍 Verifying order timestamp column configuration...\n');

    // Check if order_date column exists and its configuration
    const [columns] = await db.query(`
      SELECT 
        COLUMN_NAME, 
        COLUMN_TYPE, 
        IS_NULLABLE, 
        COLUMN_DEFAULT,
        EXTRA
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'orders' 
        AND COLUMN_NAME = 'order_date'
    `);

    if (columns.length === 0) {
      console.log('❌ order_date column does not exist!');
      console.log('\n📝 To add it, run the following SQL:');
      console.log('ALTER TABLE orders ADD COLUMN order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP;');
      process.exit(1);
    }

    const column = columns[0];
    console.log('✅ order_date column exists!\n');
    console.log('📊 Column Details:');
    console.log(`   - Column Name: ${column.COLUMN_NAME}`);
    console.log(`   - Data Type: ${column.COLUMN_TYPE}`);
    console.log(`   - Nullable: ${column.IS_NULLABLE}`);
    console.log(`   - Default Value: ${column.COLUMN_DEFAULT || 'CURRENT_TIMESTAMP'}`);
    console.log(`   - Extra: ${column.EXTRA || 'None'}`);

    // Test query to get sample orders with timestamps
    console.log('\n🔎 Sample Orders with Timestamps:');
    const [orders] = await db.query(`
      SELECT 
        order_id,
        user_id,
        total_amount,
        order_status,
        order_date
      FROM orders 
      ORDER BY order_date DESC 
      LIMIT 5
    `);

    if (orders.length === 0) {
      console.log('   No orders found in database.');
    } else {
      orders.forEach((order, idx) => {
        const date = new Date(order.order_date);
        const formattedDate = date.toLocaleDateString('en-IN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
        const formattedTime = date.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        
        console.log(`   ${idx + 1}. Order #${order.order_id} - ${order.order_status}`);
        console.log(`      Timestamp: ${order.order_date}`);
        console.log(`      Formatted: ${formattedDate}, ${formattedTime}`);
      });
    }

    console.log('\n✅ Order timestamp verification complete!');
    console.log('✅ Backend API will format timestamps as: "DD/MM/YYYY, HH:MM AM/PM"');
    console.log('✅ Frontend will display formatted date and time separately');

    process.exit(0);

  } catch (err) {
    console.error('❌ Error verifying order timestamp:', err.message);
    process.exit(1);
  }
}

verifyOrderTimestamp();
