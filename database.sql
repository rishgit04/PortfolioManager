-- Portfolio Manager Database Setup
CREATE DATABASE IF NOT EXISTS Portfolio_Manager;
USE Portfolio_Manager;

-- Assets table
CREATE TABLE assets (
    asset_id INT PRIMARY KEY AUTO_INCREMENT,
    ticker VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    asset_type ENUM('stock', 'bond', 'mutual fund', 'ETF', 'cash') NOT NULL,
    current_price DECIMAL(10,2) DEFAULT 0.00
);

-- Transactions table
CREATE TABLE transactions (
    transaction_id INT PRIMARY KEY AUTO_INCREMENT,
    asset_id INT NOT NULL,
    transaction_type ENUM('buy','sell') NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (asset_id) REFERENCES assets(asset_id)
);

-- Portfolio items table
CREATE TABLE portfolio_items (
    item_id INT PRIMARY KEY AUTO_INCREMENT,
    asset_id INT NOT NULL,
    quantity INT NOT NULL,
    avg_buy_price DECIMAL(10,2),
    purchase_date DATE,
    FOREIGN KEY (asset_id) REFERENCES assets(asset_id)
);


-- Clear existing data (uncomment these lines if you want to reset all data)
DELETE FROM portfolio_items;
DELETE FROM transactions;
DELETE FROM assets;

-- Insert some sample data
INSERT INTO assets (ticker, name, asset_type, current_price) VALUES
('AAPL', 'Apple Inc.', 'stock', 150.00),
('GOOGL', 'Alphabet Inc.', 'stock', 2500.00),
('MSFT', 'Microsoft Corporation', 'stock', 300.00),
('CASH', 'Cash', 'cash', 1.00);
