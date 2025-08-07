const request = require('supertest');
const axios = require('axios');

// Mock dependencies
jest.mock('./db');
jest.mock('axios');

const db = require('./db');
const mockedAxios = axios;

// Import the functions we want to test
// Since server.js starts the server, we need to create a separate module for testable functions
describe('Portfolio Manager Server Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Database Connection Test', () => {
    test('testConnection should log success when database connects', async () => {
      // Mock successful database connection
      db.execute.mockResolvedValue([{ test: 1 }]);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Import and test the function
      const { testConnection } = require('./testable-functions');
      await testConnection();

      expect(db.execute).toHaveBeenCalledWith('SELECT 1 as test');
      expect(consoleSpy).toHaveBeenCalledWith('✅ Database connected successfully');
      
      consoleSpy.mockRestore();
    });

    test('testConnection should log error when database connection fails', async () => {
      // Mock database connection failure
      const error = new Error('Connection failed');
      db.execute.mockRejectedValue(error);
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const { testConnection } = require('./testable-functions');
      await testConnection();

      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Database connection failed:', 'Connection failed');
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Stock Price Fetching', () => {
    test('getStockPrice should return stock data for valid ticker', async () => {
      const mockResponse = {
        data: {
          chart: {
            result: [{
              meta: {
                regularMarketPrice: 150.25,
                longName: 'Apple Inc.',
                shortName: 'Apple'
              }
            }]
          }
        }
      };
      
      mockedAxios.get.mockResolvedValue(mockResponse);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const { getStockPrice } = require('./testable-functions');
      const result = await getStockPrice('AAPL');

      expect(result).toEqual({
        ticker: 'AAPL',
        name: 'Apple Inc.',
        price: '150.25'
      });
      expect(consoleSpy).toHaveBeenCalledWith('✅ Got price for AAPL: $150.25');
      
      consoleSpy.mockRestore();
    });

    test('getStockPrice should return null for invalid ticker', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const { getStockPrice } = require('./testable-functions');
      const result = await getStockPrice('INVALID');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('⚠️ Network error fetching price for INVALID: Network error');
      
      consoleSpy.mockRestore();
    });

    test('getStockPrice should handle API response without valid data', async () => {
      const mockResponse = { data: { chart: { result: [] } } };
      mockedAxios.get.mockResolvedValue(mockResponse);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const { getStockPrice } = require('./testable-functions');
      const result = await getStockPrice('TEST');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('⚠️ No valid data found for TEST');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Settlement Account Functions', () => {
    test('loadSettlementAccountBalance should load balance from database', async () => {
      db.execute.mockResolvedValue([[{ balance: 5000.50 }]]);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const { loadSettlementAccountBalance } = require('./testable-functions');
      const balance = await loadSettlementAccountBalance();

      expect(balance).toBe(5000.50);
      expect(db.execute).toHaveBeenCalledWith('SELECT balance FROM settlement_account WHERE id = 1');
      expect(consoleSpy).toHaveBeenCalledWith('✅ Loaded settlement account balance: $5000.5');
      
      consoleSpy.mockRestore();
    });

    test('loadSettlementAccountBalance should create initial record if none exists', async () => {
      db.execute
        .mockResolvedValueOnce([[]])  // First call returns empty array
        .mockResolvedValueOnce([{ insertId: 1 }]);  // Second call for INSERT
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const { loadSettlementAccountBalance } = require('./testable-functions');
      const balance = await loadSettlementAccountBalance();

      expect(balance).toBe(1000); // Default balance
      expect(db.execute).toHaveBeenCalledWith('INSERT INTO settlement_account (id, balance) VALUES (1, 1000)');
      
      consoleSpy.mockRestore();
    });

    test('saveSettlementAccountBalance should update balance in database', async () => {
      db.execute.mockResolvedValue([{ affectedRows: 1 }]);

      const { saveSettlementAccountBalance } = require('./testable-functions');
      await saveSettlementAccountBalance(2500.75);

      expect(db.execute).toHaveBeenCalledWith(
        'UPDATE settlement_account SET balance = ? WHERE id = 1',
        [2500.75]
      );
    });

    test('adjustSettlementAccount should decrease balance for buy transactions', () => {
      const { adjustSettlementAccount } = require('./testable-functions');
      
      // Mock initial balance
      let mockBalance = 1000;
      const result = adjustSettlementAccount('buy', 250, mockBalance);
      
      expect(result).toBe(750); // 1000 - 250
    });

    test('adjustSettlementAccount should increase balance for sell transactions', () => {
      const { adjustSettlementAccount } = require('./testable-functions');
      
      let mockBalance = 1000;
      const result = adjustSettlementAccount('sell', 150, mockBalance);
      
      expect(result).toBe(1150); // 1000 + 150
    });
  });

  describe('Stock Price Updates', () => {
    test('updateStockPrices should update all stock prices', async () => {
      const mockStocks = [
        { ticker: 'AAPL' },
        { ticker: 'GOOGL' }
      ];
      
      db.execute
        .mockResolvedValueOnce([mockStocks])  // Get stocks
        .mockResolvedValue([{ affectedRows: 1 }]);  // Update queries

      const mockStockData = {
        ticker: 'AAPL',
        name: 'Apple Inc.',
        price: '150.25'
      };

      mockedAxios.get.mockResolvedValue({
        data: {
          chart: {
            result: [{
              meta: {
                regularMarketPrice: 150.25,
                longName: 'Apple Inc.'
              }
            }]
          }
        }
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const { updateStockPrices } = require('./testable-functions');
      await updateStockPrices();

      expect(db.execute).toHaveBeenCalledWith('SELECT ticker FROM assets WHERE asset_type = "stock"');
      expect(consoleSpy).toHaveBeenCalledWith('✅ Stock prices updated successfully');
      
      consoleSpy.mockRestore();
    });

    test('updateStockPrices should handle errors gracefully', async () => {
      const error = new Error('Database error');
      db.execute.mockRejectedValue(error);
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const { updateStockPrices } = require('./testable-functions');
      await updateStockPrices();

      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error updating stock prices:', 'Database error');
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Validation Functions', () => {
    test('should validate required fields for adding assets', () => {
      const { validateAssetData } = require('./testable-functions');
      
      // Valid data
      expect(validateAssetData('AAPL', 10, 150.25, 'stock')).toBe(true);
      
      // Invalid data
      expect(validateAssetData('AAPL', 0, 150.25, 'stock')).toBe(false);
      expect(validateAssetData('AAPL', 10, 0, 'stock')).toBe(false);
    });

    test('should validate sell transaction data', () => {
      const { validateSellData } = require('./testable-functions');
      
      // Valid data
      expect(validateSellData(5, 150.25)).toBe(true);
      
      // Invalid data
      expect(validateSellData(0, 150.25)).toBe(false);
      expect(validateSellData(-1, 150.25)).toBe(false);
      expect(validateSellData(5, 0)).toBe(false);
      expect(validateSellData(5, -10)).toBe(false);
    });
  });

  describe('Portfolio Calculations', () => {
    test('should calculate average buy price correctly', () => {
      const { calculateAveragePrice } = require('./testable-functions');
      
      const result = calculateAveragePrice(100, 10, 150, 5); // existing value, existing qty, new price, new qty
      expect(result).toBe(116.67); // (100*10 + 150*5) / (10+5) = 1750/15 = 116.67
    });

    test('should handle edge cases in average price calculation', () => {
      const { calculateAveragePrice } = require('./testable-functions');
      
      // First purchase (no existing quantity)
      const result = calculateAveragePrice(0, 0, 100, 10);
      expect(result).toBe(100);
    });
  });

  describe('Database Operations', () => {
    test('findAssetByTicker should return asset if found', async () => {
      const mockAsset = { asset_id: 1, ticker: 'AAPL', name: 'Apple Inc.' };
      db.execute.mockResolvedValue([[mockAsset]]);

      const { findAssetByTicker } = require('./testable-functions');
      const result = await findAssetByTicker('AAPL');

      expect(result).toEqual(mockAsset);
      expect(db.execute).toHaveBeenCalledWith('SELECT * FROM assets WHERE ticker = ?', ['AAPL']);
    });

    test('findAssetByTicker should return null if not found', async () => {
      db.execute.mockResolvedValue([[]]);

      const { findAssetByTicker } = require('./testable-functions');
      const result = await findAssetByTicker('NOTFOUND');

      expect(result).toBeNull();
    });

    test('createNewAsset should return asset ID on success', async () => {
      db.execute.mockResolvedValue([{ insertId: 123 }]);

      const { createNewAsset } = require('./testable-functions');
      const result = await createNewAsset('AAPL', 'stock', 150.25, 'Apple Inc.');

      expect(result).toBe(123);
      expect(db.execute).toHaveBeenCalledWith(
        'INSERT INTO assets (ticker, name, asset_type, current_price) VALUES (?, ?, ?, ?)',
        ['AAPL', 'Apple Inc.', 'stock', 150.25]
      );
    });

    test('recordTransaction should record transaction successfully', async () => {
      db.execute.mockResolvedValue([{ affectedRows: 1 }]);

      const { recordTransaction } = require('./testable-functions');
      const result = await recordTransaction(1, 'buy', 10, 150.25);

      expect(result).toBe(true);
      expect(db.execute).toHaveBeenCalledWith(
        'INSERT INTO transactions (asset_id, transaction_type, quantity, price) VALUES (?, ?, ?, ?)',
        [1, 'buy', 10, 150.25]
      );
    });
  });
});
