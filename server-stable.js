const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Test database connection on startup
async function testConnection() {
    try {
        const [rows] = await db.execute('SELECT 1 as test');
        console.log('✅ Database connected successfully');
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.error('Please check your .env file and ensure MySQL is running');
    }
}

testConnection();

// Add global error handlers to prevent crashes
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Simple stock price function (no external API to prevent crashes)
async function getStockPrice(ticker) {
    console.log(`🔍 Mock price fetch for ${ticker}`);
    // Return mock data to prevent API crashes
    const mockPrices = {
        'AAPL': { name: 'Apple Inc.', price: '150.00' },
        'GOOGL': { name: 'Alphabet Inc.', price: '2500.00' },
        'MSFT': { name: 'Microsoft Corporation', price: '300.00' },
        'TSLA': { name: 'Tesla Inc.', price: '200.00' },
        'AMZN': { name: 'Amazon.com Inc.', price: '3000.00' }
    };
    
    const mockData = mockPrices[ticker.toUpperCase()];
    if (mockData) {
        console.log(`✅ Mock price for ${ticker}: $${mockData.price}`);
        return {
            ticker: ticker.toUpperCase(),
            name: mockData.name,
            price: mockData.price
        };
    }
    
    // Default mock data for unknown tickers
    console.log(`⚠️ Using default mock data for ${ticker}`);
    return {
        ticker: ticker.toUpperCase(),
        name: `${ticker.toUpperCase()} Company`,
        price: '100.00'
    };
}

// Get portfolio
app.get('/api/portfolio', async (req, res) => {
    try {
        console.log('📊 Fetching portfolio data...');
        const assetType = req.query.type;
        
        let query = `
            SELECT 
                pi.item_id,
                pi.asset_id,
                pi.quantity,
                pi.avg_buy_price,
                a.ticker,
                a.name,
                a.asset_type,
                a.current_price
            FROM portfolio_items pi
            JOIN assets a ON pi.asset_id = a.asset_id
        `;
        
        let params = [];
        if (assetType) {
            query += ' WHERE a.asset_type = ?';
            params.push(assetType);
            console.log(`🔍 Filtering by asset type: ${assetType}`);
        }
        
        query += ' ORDER BY a.ticker';
        
        const [results] = await db.execute(query, params);
        console.log(`✅ Found ${results.length} portfolio items${assetType ? ` of type ${assetType}` : ''}`);
        res.json(results);
    } catch (error) {
        console.error('❌ Error fetching portfolio:', error);
        res.status(500).json({ error: 'Failed to fetch portfolio' });
    }
});

// Add to portfolio
app.post('/api/portfolio', async (req, res) => {
    try {
        const { ticker, quantity, price, assetType } = req.body;
        console.log(`📝 Add asset request received: { ticker: '${ticker}', quantity: ${quantity}, price: ${price}, assetType: '${assetType}' }`);
        
        // Validate input
        if (!ticker || !quantity || !price || !assetType) {
            return res.status(400).json({ error: 'Missing required fields (ticker, quantity, price, assetType)' });
        }
        
        if (quantity <= 0 || price <= 0) {
            console.log('❌ Invalid input data:', { ticker, quantity, price });
            return res.status(400).json({ error: 'Invalid input: ticker, quantity (>0), and price (>0) are required' });
        }
        
        console.log(`🔍 Looking for asset: ${ticker}`);
        // Get or create asset
        let [assetRows] = await db.execute('SELECT asset_id FROM assets WHERE ticker = ?', [ticker.toUpperCase()]);
        
        let assetId;
        if (assetRows.length === 0) {
            // Create new asset
            console.log(`➕ Creating new asset: ${ticker} (${assetType})`);
            const mockPrice = getMockPrice(ticker);
            console.log(`💰 Mock price for ${ticker}: $${mockPrice.toFixed(2)}`);
            
            const [assetResult] = await db.execute(
                'INSERT INTO assets (ticker, name, asset_type, current_price) VALUES (?, ?, ?, ?)',
                [ticker, ticker, assetType, mockPrice]
            );
            assetId = assetResult.insertId;
            console.log(`✅ Asset created with ID: ${assetId}`);
        } else {
            assetId = assetRows[0].asset_id;
            console.log(`✅ Found existing asset with ID: ${assetId}`);
        }
        
        console.log(`📊 Adding to portfolio: ${quantity} shares at $${price}`);
        // Add to portfolio
        await db.execute(
            'INSERT INTO portfolio_items (asset_id, quantity, avg_buy_price, purchase_date) VALUES (?, ?, ?, CURDATE())',
            [assetId, quantity, price]
        );
        
        console.log(`💰 Recording transaction`);
        // Add transaction
        await db.execute(
            'INSERT INTO transactions (asset_id, transaction_type, quantity, price) VALUES (?, ?, ?, ?)',
            [assetId, 'buy', quantity, price]
        );
        
        console.log('🎉 Asset added successfully!');
        res.json({ message: 'Asset added to portfolio successfully' });
    } catch (error) {
        console.error('❌ Error adding asset:', error.message);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ error: error.message });
    }
});

// Sell partial or full position
app.post('/api/portfolio/:itemId/sell', async (req, res) => {
    try {
        const { itemId } = req.params;
        const { quantity, price } = req.body;
        
        if (!quantity || quantity <= 0 || !price || price <= 0) {
            return res.status(400).json({ error: 'Invalid quantity or price' });
        }
        
        // Get current portfolio item
        const [portfolioItem] = await db.execute(
            'SELECT * FROM portfolio_items WHERE item_id = ?', 
            [itemId]
        );
        
        if (!portfolioItem || portfolioItem.length === 0) {
            return res.status(404).json({ error: 'Portfolio item not found' });
        }
        
        const item = portfolioItem[0];
        
        if (quantity > item.quantity) {
            return res.status(400).json({ error: 'Cannot sell more than owned quantity' });
        }
        
        // Record the sell transaction
        await db.execute(
            'INSERT INTO transactions (asset_id, transaction_type, quantity, price) VALUES (?, ?, ?, ?)',
            [item.asset_id, 'sell', quantity, price]
        );
        
        // Update or remove portfolio item
        if (quantity === item.quantity) {
            // Selling entire position - remove from portfolio
            await db.execute('DELETE FROM portfolio_items WHERE item_id = ?', [itemId]);
        } else {
            // Partial sell - update quantity
            const newQuantity = item.quantity - quantity;
            await db.execute(
                'UPDATE portfolio_items SET quantity = ? WHERE item_id = ?',
                [newQuantity, itemId]
            );
        }
        
        res.json({ 
            message: `Successfully sold ${quantity} shares`,
            remainingQuantity: quantity === item.quantity ? 0 : item.quantity - quantity
        });
    } catch (error) {
        console.error('Error selling asset:', error);
        res.status(500).json({ error: error.message });
    }
});

// Remove from portfolio (complete removal)
app.delete('/api/portfolio/:itemId', async (req, res) => {
    try {
        const { itemId } = req.params;
        
        // Get portfolio item details for transaction record
        const [portfolioItem] = await db.execute(
            'SELECT pi.*, a.ticker FROM portfolio_items pi JOIN assets a ON pi.asset_id = a.asset_id WHERE pi.item_id = ?', 
            [itemId]
        );
        
        if (portfolioItem && portfolioItem.length > 0) {
            const item = portfolioItem[0];
            // Record removal as a sell transaction at current price
            await db.execute(
                'INSERT INTO transactions (asset_id, transaction_type, quantity, price) VALUES (?, ?, ?, ?)',
                [item.asset_id, 'sell', item.quantity, 0] // Price 0 indicates removal
            );
        }
        
        await db.execute('DELETE FROM portfolio_items WHERE item_id = ?', [itemId]);
        res.json({ message: 'Item removed from portfolio' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get transactions with optional filtering
app.get('/api/transactions', async (req, res) => {
    try {
        const { filter } = req.query;
        let query = `
            SELECT t.*, a.ticker, a.name 
            FROM transactions t 
            JOIN assets a ON t.asset_id = a.asset_id 
        `;
        let params = [];
        
        if (filter && filter !== 'all') {
            query += ' WHERE t.transaction_type = ?';
            params.push(filter);
        }
        
        query += ' ORDER BY t.transaction_date DESC';
        
        const [rows] = await db.execute(query, params);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get portfolio summary
app.get('/api/portfolio/summary', async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT 
                SUM(p.quantity * a.current_price) as total_value,
                COUNT(*) as total_assets
            FROM portfolio_items p 
            JOIN assets a ON p.asset_id = a.asset_id
        `);
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Manual refresh prices (simplified)
app.post('/api/refresh-prices', async (req, res) => {
    try {
        console.log('🔄 Manual price refresh requested (using mock data)');
        res.json({ message: 'Stock prices updated successfully (mock data)' });
    } catch (error) {
        console.error('❌ Error in manual price refresh:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`✅ Stable Server running on port ${PORT}`);
    console.log('🌐 Portfolio Manager Pro is ready!');
    console.log('📊 Using mock stock prices to ensure stability');
    console.log('🔗 Open http://localhost:3000 to test the application');
});
