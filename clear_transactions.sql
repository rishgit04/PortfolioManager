-- Clear All Transactions Script
-- This script will remove all transaction history while keeping portfolio assets intact

USE Portfolio_Manager;

-- Show current transaction count before deletion
SELECT COUNT(*) as 'Current Transaction Count' FROM transactions;

-- Clear all transactions
DELETE FROM transactions;

-- Verify transactions have been cleared
SELECT COUNT(*) as 'Remaining Transaction Count' FROM transactions;

-- Show remaining portfolio items (these will stay intact)
SELECT COUNT(*) as 'Portfolio Items Count' FROM portfolio_items;

-- Show remaining assets (these will stay intact)
SELECT COUNT(*) as 'Assets Count' FROM assets;

-- Optional: Reset auto-increment counter for transactions table
ALTER TABLE transactions AUTO_INCREMENT = 1;

COMMIT;

-- Success message
SELECT 'All transactions have been successfully cleared!' as 'Status';
