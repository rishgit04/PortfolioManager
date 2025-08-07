const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3030;

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

// Initialize Settlement Account balance from database
let settlementAccountBalance = 1000; // Default fallback

// Load settlement account balance from database
async function loadSettlementAccountBalance() {
    try {
        const [rows] = await db.execute('SELECT balance FROM settlement_account WHERE id = 1');
        if (rows.length > 0) {
            settlementAccountBalance = parseFloat(rows[0].balance);
            console.log(`✅ Loaded settlement account balance: $${settlementAccountBalance}`);
        } else {
            // Create initial settlement account record
            await db.execute('INSERT INTO settlement_account (id, balance) VALUES (1, 1000) ON DUPLICATE KEY UPDATE balance = balance');
            settlementAccountBalance = 1000;
            console.log('✅ Created initial settlement account with $1000');
        }
    } catch (error) {
        console.log('⚠️ Settlement account table may not exist, using default balance');
        // Try to create the table if it doesn't exist
        try {
            await db.execute(`
                CREATE TABLE IF NOT EXISTS settlement_account (
                    id INT PRIMARY KEY,
                    balance DECIMAL(10,2) DEFAULT 1000.00
                )
            `);
            await db.execute('INSERT INTO settlement_account (id, balance) VALUES (1, 1000) ON DUPLICATE KEY UPDATE balance = balance');
            console.log('✅ Created settlement_account table and initialized with $1000');
        } catch (createError) {
            console.error('❌ Could not create settlement_account table:', createError.message);
        }
    }
}

// Save settlement account balance to database
async function saveSettlementAccountBalance() {
    try {
        await db.execute('UPDATE settlement_account SET balance = ? WHERE id = 1', [settlementAccountBalance]);
    } catch (error) {
        console.error('❌ Error saving settlement account balance:', error.message);
    }
}

// API to get Settlement Account balance
app.get('/api/settlement-account', (req, res) => {
    res.json({ balance: settlementAccountBalance });
});

// Adjust Settlement Account balance on transactions
async function adjustSettlementAccount(transactionType, amount) {
    if (transactionType === 'buy') {
        settlementAccountBalance -= amount;
    } else if (transactionType === 'sell') {
        settlementAccountBalance += amount;
    }
    await saveSettlementAccountBalance();
}

// Start server without automatic price updates to prevent crashes
app.listen(PORT, async () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log('🌐 Portfolio Manager Pro is ready!');
    console.log('📊 Stock prices will be updated manually or on demand');
    
    // Load settlement account balance from database
    await loadSettlementAccountBalance();
    
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

// ===================================================================
// START OF FINAL CORRECTED CODE FOR server.js
// ===================================================================

app.get('/api/portfolio', async (req, res) => {
    // --- STEP 1: LOG EVERYTHING WE RECEIVE ---
    console.log('--- Firing GET /api/portfolio route ---');
    console.log(`Received request for URL: ${req.originalUrl}`);
    
    const { type } = req.query;
    console.log(`Query parameter 'type' is: ${type}`);

    try {
        // Simple query since each asset is now unique in portfolio_items
        const baseQuery = `
            SELECT
                pi.item_id,
                a.ticker, 
                a.name, 
                a.asset_type,
                a.current_price, 
                pi.quantity,
                pi.avg_buy_price,
                pi.purchase_date
            FROM portfolio_items pi
            JOIN assets a ON pi.asset_id = a.asset_id
        `;

        let finalQuery;
        let queryParams = [];

        // --- STEP 2: LOG WHICH LOGIC PATH WE ARE TAKING ---
        if (type && type.toLowerCase() !== 'all') {
            // This is the path for "Stocks", "Bonds", etc.
            console.log('>>> EXECUTING FILTERED LOGIC <<<');
            finalQuery = `${baseQuery} WHERE a.asset_type = ?`;
            queryParams.push(type);
        } else {
            // This is the path for "All Assets"
            console.log('>>> EXECUTING "ALL ASSETS" LOGIC <<<');
            finalQuery = baseQuery;
        }

        // --- STEP 3: LOG THE EXACT SQL WE ARE ABOUT TO RUN ---
        console.log('Final SQL Query:', finalQuery);
        console.log('Query Parameters:', queryParams);

        const [portfolioItems] = await db.execute(finalQuery, queryParams);

        // --- STEP 4: LOG WHAT WE ARE SENDING BACK ---
        console.log(`Found ${portfolioItems.length} items. Sending to client.`);
        console.log('-----------------------------------------');
        
        res.json(portfolioItems);

    } catch (error) {
        console.error('❌ CRITICAL ERROR in GET /api/portfolio:', error.message);
        console.error('Stack trace:', error.stack);
        console.log('-----------------------------------------');
        res.status(500).json({ error: 'An error occurred while fetching the portfolio.' });
    }
});

// ===================================================================
// END OF FINAL CORRECTED CODE
// ===================================================================
        


// Add to portfolio
// FIX #2: Complete rewrite to correctly handle assetType.
app.post('/api/portfolio', async (req, res) => {
    try {
        console.log('📝 Add asset request received:', req.body);
        // Destructure assetType from the request body
        const { ticker, quantity, price, assetType } = req.body;
        
        // Add assetType to the validation
        if (!ticker || !quantity || !price || !assetType || quantity <= 0 || price <= 0) {
            console.log('❌ Invalid input data:', { ticker, quantity, price, assetType });
            return res.status(400).json({ error: 'Invalid input: ticker, quantity (>0), price (>0), and assetType are required' });
        }
        
        console.log(`🔍 Looking for asset: ${ticker}`);
        let [asset] = await db.execute('SELECT * FROM assets WHERE ticker = ?', [ticker]);
        
        if (asset.length === 0) {
            console.log(`➕ Creating new asset: ${ticker} of type ${assetType}`);
            let assetName = ticker; // Default name is the ticker
            let currentPrice = price; // Default price is the one provided

            // Only fetch from Yahoo Finance if it's a stock
            if (assetType.toLowerCase() === 'stock') {
                const stockData = await getStockPrice(ticker);
                if (stockData) {
                    console.log(`📈 Using live data for stock: ${stockData.name} - $${stockData.price}`);
                    assetName = stockData.name;
                    currentPrice = stockData.price;
                } else {
                    console.log(`⚠️ Live data for stock unavailable, using provided price: $${price}`);
                }
            }

            // Use the assetType from the form, not a hardcoded value
            const [newAsset] = await db.execute(
                'INSERT INTO assets (ticker, name, asset_type, current_price) VALUES (?, ?, ?, ?)',
                [ticker, assetName, assetType, currentPrice]
            );
            // const [portfolio_holding] = await db.execute(
            //     'INSERT INTO portfolio_items (asset_id, quantity, avg_buy_price, purchase_date) VALUES (?, ?, ?, ?)',
            //     [newAsset.insertId,quantity, avgBuyPrice, purchaseDate]
            // );
            // Get the ID of the newly inserted asset
            asset = [{ asset_id: newAsset.insertId }];
            console.log(`✅ Asset created with ID: ${asset[0].asset_id}`);
        } else {
            // Asset already exists
            console.log(`✅ Found existing asset with ID: ${asset[0].asset_id}`);
            // Optionally update the price, but only for stocks
            if (asset[0].asset_type.toLowerCase() === 'stock') {
                const stockData = await getStockPrice(ticker);
                if (stockData) {
                    await db.execute(
                        'UPDATE assets SET current_price = ?, name = ? WHERE ticker = ?',
                        [stockData.price, stockData.name, ticker]
                    );
                }
            }
        }
        
        const assetId = asset[0].asset_id;
        
        console.log(`📊 Adding to portfolio: ${quantity} units at $${price}`);
        const totalCost = quantity * price;
        await adjustSettlementAccount('buy', totalCost); // Deduct from balance
        
        // Check if this asset already exists in portfolio_items
        const [existingPortfolioItem] = await db.execute(
            'SELECT * FROM portfolio_items WHERE asset_id = ?',
            [assetId]
        );
        
        if (existingPortfolioItem.length > 0) {
            // Asset exists - update quantity and recalculate average price
            const existing = existingPortfolioItem[0];
            const existingQuantity = existing.quantity;
            const existingAvgPrice = existing.avg_buy_price;
            
            const newTotalQuantity = existingQuantity + quantity;
            const newAvgPrice = ((existingQuantity * existingAvgPrice) + (quantity * price)) / newTotalQuantity;
            
            console.log(`🔄 Updating existing portfolio item: ${existingQuantity} + ${quantity} = ${newTotalQuantity} units`);
            console.log(`💰 New average price: $${newAvgPrice.toFixed(2)}`);
            
            await db.execute(
                'UPDATE portfolio_items SET quantity = ?, avg_buy_price = ? WHERE asset_id = ?',
                [newTotalQuantity, newAvgPrice, assetId]
            );
        } else {
            // Asset doesn't exist - insert new portfolio item
            console.log(`➕ Creating new portfolio item`);
            await db.execute(
                'INSERT INTO portfolio_items (asset_id, quantity, avg_buy_price, purchase_date) VALUES (?, ?, ?, CURDATE())',
                [assetId, quantity, price]
            );
        }
        
        console.log(`💰 Recording transaction`);
        await db.execute(
            'INSERT INTO transactions (asset_id, transaction_type, quantity, price) VALUES (?, ?, ?, ?)',
            [assetId, 'buy', quantity, price]
        );
        
        console.log('🎉 Asset added successfully!');
        // Send a 201 "Created" status for successful POST requests
        res.status(201).json({ message: 'Asset added to portfolio successfully' });

    } catch (error) {
        console.error('❌ Error adding asset:', error.message);
        console.error('Stack trace:', error.stack);
        // Ensure you always send a JSON error response
        res.status(500).json({ error: 'A critical error occurred on the server while adding the asset.' });
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
        const totalGain = quantity * price;
        await adjustSettlementAccount('sell', totalGain); // Add to balance
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
            SELECT t.*, a.ticker, a.name, a.asset_type 
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
