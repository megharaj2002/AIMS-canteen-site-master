// update_database.js - Update database schema for enhanced product management
const db = require('./db');

async function updateDatabase() {
  try {
    console.log('🔄 Updating database schema for enhanced product management...\n');

    // Add description column to products table if it doesn't exist
    try {
      await db.query('ALTER TABLE products ADD COLUMN description TEXT AFTER title');
      console.log('✅ Added description column to products table');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  Description column already exists');
      } else {
        console.log('⚠️  Error adding description column:', error.message);
      }
    }

    // Create categories table if it doesn't exist
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS categories (
          category_id INT AUTO_INCREMENT PRIMARY KEY,
          category_name VARCHAR(100) UNIQUE NOT NULL,
          is_active TINYINT(1) DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Created/verified categories table');
    } catch (error) {
      console.log('⚠️  Error creating categories table:', error.message);
    }

    // Insert default categories
    const defaultCategories = [
      'Snacks', 'Beverages', 'Meals', 'Desserts', 
      'Burger', 'Sandwich', 'Maggi', 'Fries', 'Pasta', 'Bakery'
    ];

    for (const categoryName of defaultCategories) {
      try {
        await db.query(
          'INSERT IGNORE INTO categories (category_name) VALUES (?)',
          [categoryName]
        );
      } catch (error) {
        console.log(`⚠️  Error inserting category ${categoryName}:`, error.message);
      }
    }
    console.log('✅ Inserted default categories');

    // Verify the updates
    const [products] = await db.query('DESCRIBE products');
    console.log('\n📋 Products table structure:');
    products.forEach(col => {
      console.log(`   - ${col.Field}: ${col.Type}`);
    });

    const [categories] = await db.query('SELECT * FROM categories WHERE is_active = 1');
    console.log('\n📂 Available categories:');
    categories.forEach(cat => {
      console.log(`   - ${cat.category_name}`);
    });

    console.log('\n🎉 Database update completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Restart the server: npm start');
    console.log('   2. Open http://localhost:5000/admin-side.html');
    console.log('   3. Try the enhanced product management features!');

  } catch (error) {
    console.error('❌ Database update failed:', error);
  } finally {
    process.exit();
  }
}

updateDatabase();