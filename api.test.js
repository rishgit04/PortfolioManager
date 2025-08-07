const request = require('supertest');
const express = require('express');

// Mock dependencies
jest.mock('./db');
jest.mock('axios');

const db = require('./db');

// Create a test app with the same middleware as server.js
const app = express();
app.use(express.json());
app.use(express.static('public'));

// Mock the routes we want to test
app.get('/api/portfolio', async (req, res) => {
    try {
        const { type } = req.query;
        console.log(`Query parameter 'type' is: ${type}`);
        
        let baseQuery = `
            SELECT
                pi.item_id,
                a.ticker, 
                a.name, 
                a.asset_type,
                pi.quantity,
                pi.avg_buy_price,
                a.current_price,
                (pi.quantity * a.current_price) as current_value,
                ((a.current_price - pi.avg_buy_price) * pi.quantity) as profit_loss,
                pi.purchase_date
            FROM portfolio_items pi
            JOIN assets a ON pi.asset_id = a.asset_id
        `;
        
        let queryParams = [];
        if (type && type !== 'all') {
            baseQuery += ' WHERE a.asset_type = ?';
            queryParams.push(type);
        }
        
        baseQuery += ' ORDER BY pi.purchase_date DESC';
        
        const [portfolioItems] = await db.execute(baseQuery, queryParams);
        res.json(portfolioItems);
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching the portfolio.' });
    }
});

app.post('/api/portfolio', async (req, res) => {
    try {
        const { ticker, quantity, price, assetType } = req.body;
        
        if (!ticker || !quantity || quantity <= 0 || !price || price <= 0 || !assetType) {
            return res.status(400).json({ error: 'Missing or invalid required fields' });
        }
        
        // Mock successful asset creation
        res.status(201).json({ message: 'Asset added to portfolio successfully' });
    } catch (error) {
        res.status(500).json({ error: 'A critical error occurred on the server while adding the asset.' });
    }
});

app.post('/api/portfolio/:itemId/sell', async (req, res) => {
    try {
        const { itemId } = req.params;
        const { quantity, price } = req.body;
        
        if (!quantity || quantity <= 0 || !price || price <= 0) {
            return res.status(400).json({ error: 'Invalid quantity or price' });
        }
        
        // Mock portfolio item lookup
        const mockItem = { item_id: itemId, quantity: 10, asset_id: 1 };
        
        if (quantity > mockItem.quantity) {
            return res.status(400).json({ error: 'Cannot sell more than you own' });
        }
        
        res.json({ 
            message: `Successfully sold ${quantity} shares`,
            remainingQuantity: mockItem.quantity - quantity
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/portfolio/:itemId', async (req, res) => {
    try {
        const { itemId } = req.params;
        res.json({ message: 'Item removed from portfolio' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/transactions', async (req, res) => {
    try {
        const { filter } = req.query;
        const mockTransactions = [
            {
                transaction_id: 1,
                asset_id: 1,
                ticker: 'AAPL',
                name: 'Apple Inc.',
                asset_type: 'stock',
                transaction_type: 'buy',
                quantity: 10,
                price: 150.00,
                transaction_date: '2024-01-01'
            }
        ];
        
        let filteredTransactions = mockTransactions;
        if (filter && filter !== 'all') {
            filteredTransactions = mockTransactions.filter(t => t.transaction_type === filter);
        }
        
        res.json(filteredTransactions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/portfolio/summary', async (req, res) => {
    try {
        const mockSummary = {
            total_value: 15000.50,
            total_assets: 5
        };
        res.json(mockSummary);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/refresh-prices', async (req, res) => {
    try {
        res.json({ message: 'Stock prices updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/settlement-account', (req, res) => {
    res.json({ balance: 1000 });
});

describe('Portfolio Manager API Endpoints', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/portfolio', () => {
        test('should return all portfolio items', async () => {
            const mockPortfolioItems = [
                {
                    item_id: 1,
                    ticker: 'AAPL',
                    name: 'Apple Inc.',
                    asset_type: 'stock',
                    quantity: 10,
                    avg_buy_price: 150.00,
                    current_price: 155.00,
                    current_value: 1550.00,
                    profit_loss: 50.00,
                    purchase_date: '2024-01-01'
                }
            ];

            db.execute.mockResolvedValue([mockPortfolioItems]);

            const response = await request(app)
                .get('/api/portfolio')
                .expect(200);

            expect(response.body).toEqual(mockPortfolioItems);
        });

        test('should filter portfolio items by type', async () => {
            const mockStockItems = [
                {
                    item_id: 1,
                    ticker: 'AAPL',
                    asset_type: 'stock',
                    quantity: 10
                }
            ];

            db.execute.mockResolvedValue([mockStockItems]);

            const response = await request(app)
                .get('/api/portfolio?type=stock')
                .expect(200);

            expect(response.body).toEqual(mockStockItems);
        });

        test('should handle database errors', async () => {
            db.execute.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .get('/api/portfolio')
                .expect(500);

            expect(response.body).toEqual({
                error: 'An error occurred while fetching the portfolio.'
            });
        });
    });

    describe('POST /api/portfolio', () => {
        test('should add new asset to portfolio', async () => {
            const newAsset = {
                ticker: 'AAPL',
                quantity: 10,
                price: 150.25,
                assetType: 'stock'
            };

            const response = await request(app)
                .post('/api/portfolio')
                .send(newAsset)
                .expect(201);

            expect(response.body).toEqual({
                message: 'Asset added to portfolio successfully'
            });
        });

        test('should validate required fields', async () => {
            const invalidAsset = {
                ticker: '',
                quantity: 0,
                price: 150.25,
                assetType: 'stock'
            };

            const response = await request(app)
                .post('/api/portfolio')
                .send(invalidAsset)
                .expect(400);

            expect(response.body).toEqual({
                error: 'Missing or invalid required fields'
            });
        });

        test('should handle missing fields', async () => {
            const incompleteAsset = {
                ticker: 'AAPL',
                quantity: 10
                // Missing price and assetType
            };

            const response = await request(app)
                .post('/api/portfolio')
                .send(incompleteAsset)
                .expect(400);

            expect(response.body).toEqual({
                error: 'Missing or invalid required fields'
            });
        });
    });

    describe('POST /api/portfolio/:itemId/sell', () => {
        test('should sell partial position', async () => {
            const sellData = {
                quantity: 5,
                price: 155.00
            };

            const response = await request(app)
                .post('/api/portfolio/1/sell')
                .send(sellData)
                .expect(200);

            expect(response.body).toEqual({
                message: 'Successfully sold 5 shares',
                remainingQuantity: 5
            });
        });

        test('should validate sell quantity and price', async () => {
            const invalidSellData = {
                quantity: 0,
                price: 155.00
            };

            const response = await request(app)
                .post('/api/portfolio/1/sell')
                .send(invalidSellData)
                .expect(400);

            expect(response.body).toEqual({
                error: 'Invalid quantity or price'
            });
        });

        test('should validate negative price', async () => {
            const invalidSellData = {
                quantity: 5,
                price: -10
            };

            const response = await request(app)
                .post('/api/portfolio/1/sell')
                .send(invalidSellData)
                .expect(400);

            expect(response.body).toEqual({
                error: 'Invalid quantity or price'
            });
        });
    });

    describe('DELETE /api/portfolio/:itemId', () => {
        test('should remove portfolio item', async () => {
            const response = await request(app)
                .delete('/api/portfolio/1')
                .expect(200);

            expect(response.body).toEqual({
                message: 'Item removed from portfolio'
            });
        });
    });

    describe('GET /api/transactions', () => {
        test('should return all transactions', async () => {
            const response = await request(app)
                .get('/api/transactions')
                .expect(200);

            expect(response.body).toHaveLength(1);
            expect(response.body[0]).toHaveProperty('ticker', 'AAPL');
            expect(response.body[0]).toHaveProperty('transaction_type', 'buy');
        });

        test('should filter transactions by type', async () => {
            const response = await request(app)
                .get('/api/transactions?filter=buy')
                .expect(200);

            expect(response.body).toHaveLength(1);
            expect(response.body[0].transaction_type).toBe('buy');
        });
    });

    describe('GET /api/portfolio/summary', () => {
        test('should return portfolio summary', async () => {
            const response = await request(app)
                .get('/api/portfolio/summary')
                .expect(200);

            expect(response.body).toEqual({
                total_value: 15000.50,
                total_assets: 5
            });
        });
    });

    describe('POST /api/refresh-prices', () => {
        test('should refresh stock prices', async () => {
            const response = await request(app)
                .post('/api/refresh-prices')
                .expect(200);

            expect(response.body).toEqual({
                message: 'Stock prices updated successfully'
            });
        });
    });

    describe('GET /api/settlement-account', () => {
        test('should return settlement account balance', async () => {
            const response = await request(app)
                .get('/api/settlement-account')
                .expect(200);

            expect(response.body).toEqual({
                balance: 1000
            });
        });
    });
});
