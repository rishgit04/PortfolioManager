const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

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
app.post('/api/portfolio', async (req, res) => {
    try {
        const { ticker, quantity, price } = req.body;
        
        // Get or create asset
        let [asset] = await db.execute('SELECT * FROM assets WHERE ticker = ?', [ticker]);
        
        if (asset.length === 0) {
            // Create new asset (simplified - in real app you'd fetch from API)
            await db.execute(
                'INSERT INTO assets (ticker, name, asset_type, current_price) VALUES (?, ?, ?, ?)',
                [ticker, ticker, 'stock', price]
            );
            [asset] = await db.execute('SELECT * FROM assets WHERE ticker = ?', [ticker]);
        }
        
        const assetId = asset[0].asset_id;
        
        // Add to portfolio
        await db.execute(
            'INSERT INTO portfolio_items (asset_id, quantity, avg_buy_price, purchase_date) VALUES (?, ?, ?, CURDATE())',
            [assetId, quantity, price]
        );
        
        // Add transaction
        await db.execute(
            'INSERT INTO transactions (asset_id, transaction_type, quantity, price) VALUES (?, ?, ?, ?)',
            [assetId, 'buy', quantity, price]
        );
        
        res.json({ message: 'Asset added to portfolio successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Remove from portfolio
app.delete('/api/portfolio/:itemId', async (req, res) => {
    try {
        const { itemId } = req.params;
        await db.execute('DELETE FROM portfolio_items WHERE item_id = ?', [itemId]);
        res.json({ message: 'Item removed from portfolio' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get transactions
app.get('/api/transactions', async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT t.*, a.ticker, a.name 
            FROM transactions t 
            JOIN assets a ON t.asset_id = a.asset_id 
            ORDER BY t.transaction_date DESC
        `);
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

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
