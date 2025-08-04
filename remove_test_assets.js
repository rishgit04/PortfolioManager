// Remove Test Assets (Added Without Permission)
// This script will remove the test assets I added without asking

const mysql = require('mysql2/promise');
require('dotenv').config();

async function removeTestAssets() {
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

        // Show what will be removed
        console.log('📋 Test assets to be removed:');
        const [testAssets] = await connection.execute(
            'SELECT asset_id, ticker, name, asset_type FROM assets WHERE ticker IN (?, ?, ?)',
            ['GOVT', 'VTSAX', 'SPY']
        );
        console.table(testAssets);

        if (testAssets.length === 0) {
            console.log('✅ No test assets found to remove');
            return;
        }

        // Remove portfolio items for these assets first (foreign key constraint)
        console.log('🗑️ Removing portfolio items for test assets...');
        const assetIds = testAssets.map(asset => asset.asset_id);
        const placeholders = assetIds.map(() => '?').join(',');
        
        const [portfolioResult] = await connection.execute(
            `DELETE FROM portfolio_items WHERE asset_id IN (${placeholders})`,
            assetIds
        );
        console.log(`✅ Removed ${portfolioResult.affectedRows} portfolio items`);

        // Remove the test assets
        console.log('🗑️ Removing test assets...');
        const [assetResult] = await connection.execute(
            'DELETE FROM assets WHERE ticker IN (?, ?, ?)',
            ['GOVT', 'VTSAX', 'SPY']
        );
        console.log(`✅ Removed ${assetResult.affectedRows} test assets`);

        console.log('🎉 Test assets removed successfully!');
        console.log('📊 Your portfolio is back to its original state with only your actual assets.');

    } catch (error) {
        console.error('❌ Error removing test assets:', error.message);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Database connection closed');
        }
    }
}

// Run the cleanup
removeTestAssets();
