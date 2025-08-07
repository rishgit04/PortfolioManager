const db = require('./db');
const axios = require('axios');

// Test database connection
async function testConnection() {
    try {
        const [rows] = await db.execute('SELECT 1 as test');
        console.log('✅ Database connected successfully');
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.error('Please check your .env file and ensure MySQL is running');
        return false;
    }
}

// Yahoo Finance API function
async function getStockPrice(ticker) {
    try {
        console.log(`🔍 Fetching live price for ${ticker}`);
        const response = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`, {
            timeout: 5000,
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
        return true;
    } catch (error) {
        console.error('❌ Error updating stock prices:', error.message);
        return false;
    }
}

// Load settlement account balance from database
async function loadSettlementAccountBalance() {
    try {
        const [rows] = await db.execute('SELECT balance FROM settlement_account WHERE id = 1');
        if (rows.length > 0) {
            const balance = parseFloat(rows[0].balance);
            console.log(`✅ Loaded settlement account balance: $${balance}`);
            return balance;
        } else {
            // Create initial settlement account record
            await db.execute('INSERT INTO settlement_account (id, balance) VALUES (1, 1000)');
            console.log('✅ Created initial settlement account with $1000');
            return 1000;
        }
    } catch (error) {
        console.error('❌ Error loading settlement account balance:', error.message);
        return 1000; // Default fallback
    }
}

// Save settlement account balance to database
async function saveSettlementAccountBalance(balance) {
    try {
        await db.execute('UPDATE settlement_account SET balance = ? WHERE id = 1', [balance]);
        return true;
    } catch (error) {
        console.error('❌ Error saving settlement account balance:', error.message);
        return false;
    }
}

// Adjust Settlement Account balance on transactions
function adjustSettlementAccount(transactionType, amount, currentBalance = 1000) {
    if (transactionType === 'buy') {
        return currentBalance - amount;
    } else if (transactionType === 'sell') {
        return currentBalance + amount;
    }
    return currentBalance;
}

// Validation functions
function validateAssetData(ticker, quantity, price, assetType) {
    return ticker && ticker.trim() !== '' && 
           quantity > 0 && 
           price > 0 && 
           assetType && assetType.trim() !== '';
}

function validateSellData(quantity, price) {
    return quantity > 0 && price > 0;
}

// Portfolio calculation functions
function calculateAveragePrice(existingValue, existingQuantity, newPrice, newQuantity) {
    if (existingQuantity === 0) {
        return newPrice;
    }
    
    const totalValue = (existingValue * existingQuantity) + (newPrice * newQuantity);
    const totalQuantity = existingQuantity + newQuantity;
    return Math.round((totalValue / totalQuantity) * 100) / 100; // Round to 2 decimal places
}

// Portfolio item operations
async function findAssetByTicker(ticker) {
    try {
        const [asset] = await db.execute('SELECT * FROM assets WHERE ticker = ?', [ticker]);
        return asset.length > 0 ? asset[0] : null;
    } catch (error) {
        console.error('❌ Error finding asset:', error.message);
        return null;
    }
}

async function createNewAsset(ticker, assetType, price, name = null) {
    try {
        const assetName = name || ticker;
        const [result] = await db.execute(
            'INSERT INTO assets (ticker, name, asset_type, current_price) VALUES (?, ?, ?, ?)',
            [ticker, assetName, assetType, price]
        );
        return result.insertId;
    } catch (error) {
        console.error('❌ Error creating asset:', error.message);
        return null;
    }
}

async function getPortfolioItem(assetId) {
    try {
        const [existingItem] = await db.execute(
            'SELECT * FROM portfolio_items WHERE asset_id = ?',
            [assetId]
        );
        return existingItem.length > 0 ? existingItem[0] : null;
    } catch (error) {
        console.error('❌ Error getting portfolio item:', error.message);
        return null;
    }
}

async function updatePortfolioItem(itemId, quantity, avgPrice) {
    try {
        await db.execute(
            'UPDATE portfolio_items SET quantity = ?, avg_buy_price = ? WHERE item_id = ?',
            [quantity, avgPrice, itemId]
        );
        return true;
    } catch (error) {
        console.error('❌ Error updating portfolio item:', error.message);
        return false;
    }
}

async function createPortfolioItem(assetId, quantity, price) {
    try {
        const [result] = await db.execute(
            'INSERT INTO portfolio_items (asset_id, quantity, avg_buy_price, purchase_date) VALUES (?, ?, ?, CURDATE())',
            [assetId, quantity, price]
        );
        return result.insertId;
    } catch (error) {
        console.error('❌ Error creating portfolio item:', error.message);
        return null;
    }
}

async function recordTransaction(assetId, transactionType, quantity, price) {
    try {
        await db.execute(
            'INSERT INTO transactions (asset_id, transaction_type, quantity, price) VALUES (?, ?, ?, ?)',
            [assetId, transactionType, quantity, price]
        );
        return true;
    } catch (error) {
        console.error('❌ Error recording transaction:', error.message);
        return false;
    }
}

module.exports = {
    testConnection,
    getStockPrice,
    updateStockPrices,
    loadSettlementAccountBalance,
    saveSettlementAccountBalance,
    adjustSettlementAccount,
    validateAssetData,
    validateSellData,
    calculateAveragePrice,
    findAssetByTicker,
    createNewAsset,
    getPortfolioItem,
    updatePortfolioItem,
    createPortfolioItem,
    recordTransaction
};
