// Clear Transactions Script
// This script will safely remove all transaction history from the database

const mysql = require('mysql2/promise');
require('dotenv').config();

async function clearTransactions() {
    let connection;
    
    try {
        // Create database connection
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'Portfolio_Manager'
        });

        console.log('🔗 Connected to database successfully');

        // Show current transaction count
        const [countBefore] = await connection.execute('SELECT COUNT(*) as count FROM transactions');
        console.log(`📊 Current transaction count: ${countBefore[0].count}`);

        if (countBefore[0].count === 0) {
            console.log('✅ No transactions to clear!');
            return;
        }

        // Clear all transactions
        console.log('🗑️ Clearing all transactions...');
        const [result] = await connection.execute('DELETE FROM transactions');
        console.log(`✅ Deleted ${result.affectedRows} transactions`);

        // Reset auto-increment counter
        await connection.execute('ALTER TABLE transactions AUTO_INCREMENT = 1');
        console.log('🔄 Reset transaction ID counter');

        // Verify transactions have been cleared
        const [countAfter] = await connection.execute('SELECT COUNT(*) as count FROM transactions');
        console.log(`📊 Remaining transaction count: ${countAfter[0].count}`);

        // Show that portfolio items are still intact
        const [portfolioCount] = await connection.execute('SELECT COUNT(*) as count FROM portfolio_items');
        const [assetCount] = await connection.execute('SELECT COUNT(*) as count FROM assets');
        
        console.log(`📈 Portfolio items preserved: ${portfolioCount[0].count}`);
        console.log(`🏢 Assets preserved: ${assetCount[0].count}`);
        
        console.log('🎉 All transactions have been successfully cleared!');
        console.log('💡 Your portfolio assets remain intact - only transaction history was removed.');

    } catch (error) {
        console.error('❌ Error clearing transactions:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Database connection closed');
        }
    }
}

// Run the cleanup
clearTransactions();
