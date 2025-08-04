const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const axios = require('axios');
require('dotenv').config();

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

// Yahoo Finance API function
async function getStockPrice(ticker) {
    try {
        console.log(`🔍 Fetching live price for ${ticker}`);
        const response = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`, {
            timeout: 5000, // 5 second timeout
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        if (response.data && response.data.chart && response.data.chart.result && response.data.chart.result[0]) {
            const result = response.data.chart.result[0];
            const price = result.meta.regularMarketPrice;
            const name = result.meta.longName || result.meta.shortName || ticker;
            
            if (price && !isNaN(price)) {
                console.log(`✅ Got price for ${ticker}: $${price}`);
                return {
                    ticker,
                    name,
                    price: parseFloat(price).toFixed(2)
                };
            }
        }
        
        console.log(`⚠️ No valid data found for ${ticker}`);
        return null;
    } catch (error) {
        if (error.response) {
            console.log(`⚠️ API request failed for ${ticker} with status ${error.response.status}`);
        } else {
            console.log(`⚠️ Network error fetching price for ${ticker}: ${error.message}`);
        }
        return null;
    }
}

// Update stock prices in database
async function updateStockPrices() {
    try {
        console.log('🔄 Updating stock prices...');
        const [assets] = await db.execute('SELECT ticker FROM assets WHERE asset_type = "stock"');
        
        for (const asset of assets) {
            const stockData = await getStockPrice(asset.ticker);
            if (stockData) {
                await db.execute(
                    'UPDATE assets SET current_price = ?, name = ? WHERE ticker = ?',
                    [stockData.price, stockData.name, stockData.ticker]
                );
            }
            // Add small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        console.log('✅ Stock prices updated successfully');
    } catch (error) {
        console.error('❌ Error updating stock prices:', error.message);
    }
}

// Add global error handlers to prevent crashes
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start server without automatic price updates to prevent crashes
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log('🌐 Portfolio Manager Pro is ready!');
    console.log('📊 Stock prices will be updated manually or on demand');
    
    // Optional: Set up periodic updates after server is stable
    // Uncomment the lines below once the server is working properly
    /*
    setTimeout(() => {
        updateStockPrices().catch(error => {
            console.error('❌ Error in stock price update:', error);
        });
    }, 10000); // Wait 10 seconds before first update
    
    setInterval(() => {
        updateStockPrices().catch(error => {
            console.error('❌ Error in scheduled stock price update:', error);
        });
    }, 5 * 60 * 1000);
    */
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Routes

// Get all assets
app.get('/api/assets', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM assets');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get portfolio items
app.get('/api/portfolio', async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT p.*, a.ticker, a.name, a.current_price, 
                   (p.quantity * a.current_price) as current_value
            FROM portfolio_items p 
            JOIN assets a ON p.asset_id = a.asset_id
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add to portfolio
// app.post('/api/portfolio', async (req, res) => {
//     try {
//         console.log('📝 Add asset request received:', req.body);
//         const { ticker, quantity, price } = req.body;
        
//         if (!ticker || !quantity || !price || quantity <= 0 || price <= 0) {
//             console.log('❌ Invalid input data:', { ticker, quantity, price });
//             return res.status(400).json({ error: 'Invalid input: ticker, quantity (>0), and price (>0) are required' });
//         }
        
//         console.log(`🔍 Looking for asset: ${ticker}`);
//         // Get or create asset
//         let [asset] = await db.execute('SELECT * FROM assets WHERE ticker = ?', [ticker]);
        
//         if (asset.length === 0) {
//             console.log(`➕ Creating new asset: ${ticker}`);
            
//             // Fetch live stock data
//             const stockData = await getStockPrice(ticker);
            
//             if (stockData) {
//                 console.log(`📈 Using live data: ${stockData.name} - $${stockData.price}`);
//                 await db.execute(
//                     'INSERT INTO assets (ticker, name, asset_type, current_price) VALUES (?, ?, ?, ?)',
//                     [ticker, stockData.name, 'stock', stockData.price]
//                 );
//             } else {
//                 console.log(`⚠️ Live data unavailable, using provided price: $${price}`);
//                 await db.execute(
//                     'INSERT INTO assets (ticker, name, asset_type, current_price) VALUES (?, ?, ?, ?)',
//                     [ticker, ticker, 'stock', price]
//                 );
//             }
            
//             [asset] = await db.execute('SELECT * FROM assets WHERE ticker = ?', [ticker]);
//             console.log(`✅ Asset created with ID: ${asset[0].asset_id}`);
//         } else {
//             console.log(`✅ Found existing asset with ID: ${asset[0].asset_id}`);
            
//             // Update existing asset with latest price
//             const stockData = await getStockPrice(ticker);
//             if (stockData) {
//                 console.log(`🔄 Updating ${ticker} price to $${stockData.price}`);
//                 await db.execute(
//                     'UPDATE assets SET current_price = ?, name = ? WHERE ticker = ?',
//                     [stockData.price, stockData.name, ticker]
//                 );
//                 // Refresh asset data
//                 [asset] = await db.execute('SELECT * FROM assets WHERE ticker = ?', [ticker]);
//             }
//         }
        
//         const assetId = asset[0].asset_id;
        
//         console.log(`📊 Adding to portfolio: ${quantity} shares at $${price}`);
//         // Add to portfolio
//         await db.execute(
//             'INSERT INTO portfolio_items (asset_id, quantity, avg_buy_price, purchase_date) VALUES (?, ?, ?, CURDATE())',
//             [assetId, quantity, price]
//         );
        
//         console.log(`💰 Recording transaction`);
//         // Add transaction
//         await db.execute(
//             'INSERT INTO transactions (asset_id, transaction_type, quantity, price) VALUES (?, ?, ?, ?)',
//             [assetId, 'buy', quantity, price]
//         );
        
//         console.log('🎉 Asset added successfully!');
//         res.json({ message: 'Asset added to portfolio successfully' });
//     } catch (error) {
//         console.error('❌ Error adding asset:', error.message);
//         console.error('Stack trace:', error.stack);
//         res.status(500).json({ error: error.message });
//     }
// });
app.post('/api/portfolio', async (req, res) => {
    try {
        console.log('📝 Add asset request received:', req.body);
        // MODIFICATION: Added 'assetType' to the destructured request body.
        const { ticker, quantity, price, assetType } = req.body;
        
        // MODIFICATION: Updated validation to require 'assetType'.
        if (!ticker || !quantity || !price || !assetType || quantity <= 0 || price <= 0) {
            console.log('❌ Invalid input data:', { ticker, quantity, price, assetType });
            return res.status(400).json({ error: 'Invalid input: ticker, quantity (>0), price (>0), and assetType are required' });
        }

        // Optional: Add validation for the value of assetType
        if (assetType !== 'stock' && assetType !== 'bond') {
             return res.status(400).json({ error: "Invalid assetType: must be 'stock' or 'bond'" });
        }
        
        console.log(`🔍 Looking for asset: ${ticker}`);
        let [asset] = await db.execute('SELECT * FROM assets WHERE ticker = ?', [ticker]);
        
        if (asset.length === 0) {
            console.log(`➕ Creating new asset: ${ticker} of type ${assetType}`);
            
            // MODIFICATION: Added logic to handle asset creation based on assetType.
            if (assetType === 'stock') {
                const stockData = await getStockPrice(ticker);
                if (stockData) {
                    console.log(`📈 Using live data for stock: ${stockData.name} - $${stockData.price}`);
                    await db.execute(
                        'INSERT INTO assets (ticker, name, asset_type, current_price) VALUES (?, ?, ?, ?)',
                        [ticker, stockData.name, 'stock', stockData.price]
                    );
                } else {
                    console.log(`⚠️ Live data for stock unavailable, using provided price: $${price}`);
                    await db.execute(
                        'INSERT INTO assets (ticker, name, asset_type, current_price) VALUES (?, ?, ?, ?)',
                        [ticker, ticker, 'stock', price]
                    );
                }
            } else if (assetType === 'bond') {
                // For bonds, we use the provided price and don't fetch live data.
                console.log(`📝 Creating bond asset, using provided price: $${price}`);
                await db.execute(
                    'INSERT INTO assets (ticker, name, asset_type, current_price) VALUES (?, ?, ?, ?)',
                    [ticker, ticker, 'bond', price] // Using ticker as name for bond by default
                );
            }
            
            [asset] = await db.execute('SELECT * FROM assets WHERE ticker = ?', [ticker]);
            console.log(`✅ Asset created with ID: ${asset[0].asset_id}`);
        } else {
            console.log(`✅ Found existing asset with ID: ${asset[0].asset_id}`);
            
            // MODIFICATION: Only update the price automatically for stocks.
            const existingAssetType = asset[0].asset_type;
            if (existingAssetType === 'stock') {
                const stockData = await getStockPrice(ticker);
                if (stockData) {
                    console.log(`🔄 Updating ${ticker} price to $${stockData.price}`);
                    await db.execute(
                        'UPDATE assets SET current_price = ?, name = ? WHERE ticker = ?',
                        [stockData.price, stockData.name, ticker]
                    );
                    [asset] = await db.execute('SELECT * FROM assets WHERE ticker = ?', [ticker]);
                }
            } else {
                console.log(`ℹ️ Skipping automatic price update for non-stock asset: ${ticker}`);
            }
        }
        
        const assetId = asset[0].asset_id;
        
        console.log(`📊 Adding to portfolio: ${quantity} units at $${price}`);
        await db.execute(
            'INSERT INTO portfolio_items (asset_id, quantity, avg_buy_price, purchase_date) VALUES (?, ?, ?, CURDATE())',
            [assetId, quantity, price]
        );
        
        console.log(`💰 Recording transaction`);
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

// Refresh stock prices manually
app.post('/api/refresh-prices', async (req, res) => {
    try {
        console.log('🔄 Manual price refresh requested');
        await updateStockPrices();
        res.json({ message: 'Stock prices updated successfully' });
    } catch (error) {
        console.error('❌ Error in manual price refresh:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
