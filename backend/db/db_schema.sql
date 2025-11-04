CREATE DATABASE IF NOT EXISTS aims_canteen;
USE aims_canteen;

-- Users
CREATE TABLE users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  is_admin TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products (menu)
CREATE TABLE products (
  item_id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  price DECIMAL(10,2) NOT NULL,
  calories VARCHAR(100),
  image_url VARCHAR(512),
  available TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categories table for dynamic category management
CREATE TABLE categories (
  category_id INT AUTO_INCREMENT PRIMARY KEY,
  category_name VARCHAR(100) UNIQUE NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Password reset tokens table
CREATE TABLE password_resets (
  reset_id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_token (token),
  INDEX idx_expires (expires_at)
);

-- Cart (one active cart per user)
CREATE TABLE carts (
  cart_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE cart_items (
  cart_item_id INT AUTO_INCREMENT PRIMARY KEY,
  cart_id INT NOT NULL,
  item_id INT NOT NULL,
  quantity INT DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (cart_id) REFERENCES carts(cart_id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES products(item_id)
);

-- Orders
CREATE TABLE orders (
  order_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL, -- allow NULL if user deleted
  total_amount DECIMAL(10,2) NOT NULL,
  order_status VARCHAR(50) DEFAULT 'Placed',
  payment_status TINYINT(1) DEFAULT 0,
  delivery_status TINYINT(1) DEFAULT 0,
  order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE TABLE order_items (
  order_item_id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  item_id INT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES products(item_id)
);

-- Insert admin user (bcrypt hashed password for: Nishanth@123)
INSERT INTO users (name, email, password_hash, phone, is_admin) 
VALUES (
  'Nishanth',
  'nishanthragod1@gmail.com',
  '$2b$12$CwhMP2/1afk/hg.jG4jcte/pIJZI4szNi13h/BfHFt5rub4BxOprG',
  '9141182032',
  1
);

-- Insert sample customer user
INSERT INTO users (name, email, password_hash, phone, is_admin) 
VALUES (
  'John Doe',
  'john@example.com',
  '$2b$12$CwhMP2/1afk/hg.jG4jcte/pIJZI4szNi13h/BfHFt5rub4BxOprG',
  '9876543210',
  0
);

-- Insert sample orders for dashboard demo
INSERT INTO orders (user_id, total_amount, order_status, order_date) VALUES
(2, 125.50, 'Delivered', '2024-01-15 10:30:00'),
(2, 89.75, 'Delivered', '2024-01-16 12:15:00'),
(1, 67.25, 'Preparing', '2024-01-17 14:20:00'),
(2, 156.00, 'Ready', '2024-01-17 15:45:00'),
(1, 234.80, 'Delivered', '2024-01-18 11:30:00'),
(2, 78.50, 'Preparing', '2024-01-18 13:10:00'),
(1, 145.25, 'Ready', '2024-01-18 16:25:00'),
(2, 99.75, 'Delivered', '2024-01-19 12:40:00'),
(1, 187.60, 'Preparing', '2024-01-19 14:55:00'),
(2, 112.30, 'Ready', '2024-01-19 17:20:00');

-- Insert default categories
INSERT INTO categories (category_name) VALUES
('Snacks'),
('Beverages'),
('Meals'),
('Desserts'),
('Burger'),
('Sandwich'),
('Maggi'),
('Fries'),
('Pasta'),
('Bakery');

-- Seed products (corrected typos)
INSERT INTO products (title, category, price, calories, image_url) VALUES
('Double Cheese Potato Burger','Burger',45,'220 - 280 Kcal','assets/images/burger.jpg'),
('Cheese Sandwich','Sandwich',45,'250 - 300 Kcal','assets/images/sandwich1.jpg'),
('Veg Club Sandwich','Sandwich',60,'320 - 400 Kcal','assets/images/s2.jpg'),
('Cheese Masala Sandwich','Sandwich',45,'250 - 300 Kcal','assets/images/sandwich2.jpg'),
('Veg Schezwan Sandwich','Sandwich',45,'230 - 285 Kcal','assets/images/schez-sandwitch.jpg'),
('Masala Maggi','Maggi',25,'150 - 280 Kcal','assets/images/maggie.jpg'),
('Schezwan Maggi','Maggi',30,'165 - 225 Kcal','assets/images/maggie-s.jpg'),
('Veg Maggi','Maggi',30,'170 - 220 Kcal','assets/images/veg-maggie.jpg'),
('Cheese Garlic Maggi','Maggi',40,'190 - 230 Kcal','assets/images/garlic-maggie.jpg'),
('Cheese Veg Maggi','Maggi',45,'175 - 235 Kcal','assets/images/cheese-maggie.jpg'),
('Masala Fries','Fries',35,'120 - 185 Kcal','assets/images/frenchfries.jpg'),
('Schezwan Fries','Fries',45,'135 - 210 Kcal','assets/images/shezuan.jpg'),
('Cheese Fries','Fries',40,'140 - 156 Kcal','assets/images/cheese-fries.jpg'),
('Red Sauce Pasta','Pasta',80,'241 - 321 Kcal','assets/images/pasta.jpg'),
('White Sauce Pasta','Pasta',80,'265 - 321 Kcal','assets/images/white-pasta.jpg'),
('Milk Shakes','Beverages',35,'155 - 210 Kcal','assets/images/milk-shake.jpg'),
('Hot Chocolate','Beverages',35,'230 - 280 Kcal','assets/images/hot-coffee.jpg'),
('Aerated Drinks','Beverages',10,'260 - 365 Kcal','assets/images/Aerated-Drinks.jpg'),
('Cold Coffee','Beverages',35,'255 - 360 Kcal','assets/images/cold-coffee.jpg'),
('Coffee','Beverages',15,'220 - 265 Kcal','assets/images/coffee.jpg'),
('Tea','Beverages',10,'155 - 225 Kcal','assets/images/tea.jpg'),
('Chocolate Frappe','Beverages',35,'265 - 355 Kcal','assets/images/beverage.jpg'),
('Veg Puff','Bakery',35,'260 - 320 Kcal','assets/images/puff.jpg'),
('Paneer Puff','Bakery',15,'255 - 390 Kcal','assets/images/samosa.jpg'),
('Khari','Bakery',20,'265 - 375 Kcal','assets/images/panner-puff.jpg'),
('Noodle Puff','Bakery',15,'300 - 425 Kcal','assets/images/noodle-puff.jpg');
