CREATE DATABASE IF NOT EXISTS unigo_deliveries CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE unigo_deliveries;

CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS menu_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  emoji VARCHAR(16) DEFAULT '🍽️',
  image_url VARCHAR(500) NULL,
  available BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Add starter menu entries. You can edit these from the Admin Dashboard.
INSERT INTO menu_items(name,price,emoji,available,sort_order)
SELECT 'Pilau Plain',100,'🍛',TRUE,1 WHERE NOT EXISTS(SELECT 1 FROM menu_items);
INSERT INTO menu_items(name,price,emoji,available,sort_order)
SELECT 'Chapati',15,'🫓',TRUE,2 WHERE (SELECT COUNT(*) FROM menu_items)=1;
INSERT INTO menu_items(name,price,emoji,available,sort_order)
SELECT 'Ndengu',40,'🥘',TRUE,3 WHERE (SELECT COUNT(*) FROM menu_items)=2;


CREATE TABLE IF NOT EXISTS orders (
 id INT AUTO_INCREMENT PRIMARY KEY,
 tracking_code VARCHAR(24) NOT NULL UNIQUE,
 customer_name VARCHAR(120) NOT NULL,
 phone VARCHAR(30) NOT NULL,
 area VARCHAR(80) NOT NULL,
 location VARCHAR(255) NOT NULL,
 instructions TEXT NULL,
 items_json JSON NOT NULL,
 subtotal DECIMAL(10,2) NOT NULL,
 delivery_fee DECIMAL(10,2) NOT NULL,
 total DECIMAL(10,2) NOT NULL,
 payment_method VARCHAR(40) NOT NULL DEFAULT 'Pay on Delivery',
 status VARCHAR(40) NOT NULL DEFAULT 'Received',
 feedback_rating VARCHAR(40) NULL,
 feedback_comment TEXT NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
