// API Base URL
const API_BASE = '/api';

// DOM Elements
const portfolioGrid = document.getElementById('portfolioGrid');
const transactionsList = document.getElementById('transactionsList');
const addAssetForm = document.getElementById('addAssetForm');
const totalValueEl = document.getElementById('totalValue');
const totalAssetsEl = document.getElementById('totalAssets');
const totalTransactionsEl = document.getElementById('totalTransactions');
const refreshPricesBtn = document.getElementById('refreshPricesBtn');
const themeToggle = document.getElementById('themeToggle');
const transactionFilter = document.getElementById('transactionFilter');

// Theme management
let currentTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', currentTheme);

// Initialize Settlement Account balance
let settlementAccountBalance = 1000;

// Update Settlement Account balance display
function updateSettlementAccountDisplay() {
    const settlementAccountEl = document.getElementById('settlementAccountBalance');
    if (settlementAccountEl) {
        settlementAccountEl.textContent = `$${settlementAccountBalance.toFixed(2)}`;
    }
}

// Adjust Settlement Account balance after transactions
function adjustSettlementAccount(transactionType, amount) {
    if (transactionType === 'buy') {
        settlementAccountBalance -= amount;
    } else if (transactionType === 'sell') {
        settlementAccountBalance += amount;
    }
    updateSettlementAccountDisplay();
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    loadPortfolio();
    loadTransactions();
    loadSummary();
    updateSettlementAccountDisplay();
    
    // Event listeners
    if (refreshPricesBtn) {
        refreshPricesBtn.addEventListener('click', refreshPrices);
    }
    
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    if (transactionFilter) {
        transactionFilter.addEventListener('change', filterTransactions);
    }
});

// Theme functions
function initializeTheme() {
    const themeIcon = themeToggle.querySelector('i');
    if (currentTheme === 'light') {
        themeIcon.className = 'fas fa-sun';
    } else {
        themeIcon.className = 'fas fa-moon';
    }
}

function toggleTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('theme', currentTheme);
    
    const themeIcon = themeToggle.querySelector('i');
    if (currentTheme === 'light') {
        themeIcon.className = 'fas fa-sun';
    } else {
        themeIcon.className = 'fas fa-moon';
    }
}

// Tab switching
function showTab(tabName, event = null) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName).classList.add('active');
    
    // Add active class to clicked button (if event exists)
    if (event && event.target) {
        event.target.classList.add('active');
    } else {
        // If no event, find and activate the correct tab button
        const tabButtons = {
            'portfolio': 0,
            'stocks': 1,
            'bonds': 2,
            'mutual-funds': 3,
            'etfs': 4,
            'settlement-account': 5, // Renamed from 'cash'
            'add': 6,
            'transactions': 7
        };
        const buttonIndex = tabButtons[tabName];
        if (buttonIndex !== undefined) {
            document.querySelectorAll('.tab-btn')[buttonIndex].classList.add('active');
        }
    }
    
    // Load data for specific tabs
    console.log(`📌 Tab switched to: ${tabName}`);
    if (tabName === 'portfolio') {
        console.log('📊 Loading ALL assets for portfolio tab');
        loadPortfolio();
        updateSettlementAccountDisplay(); // Ensure settlement account balance is updated
    } else if (tabName === 'stocks') {
        console.log('📊 Loading STOCK assets only');
        loadPortfolioByType('stock');
    } else if (tabName === 'bonds') {
        console.log('📊 Loading BOND assets only');
        loadPortfolioByType('bond');
    } else if (tabName === 'mutual-funds') {
        console.log('📊 Loading MUTUAL FUND assets only');
        loadPortfolioByType('mutual fund');
    } else if (tabName === 'etfs') {
        console.log('📊 Loading ETF assets only');
        loadPortfolioByType('ETF');
    } else if (tabName === 'settlement-account') {
        console.log('📊 Displaying Settlement Account balance');
        updateSettlementAccountDisplay();
    } else if (tabName === 'transactions') {
        console.log('📊 Loading transactions');
        loadTransactions();
    }
}

// Load portfolio data
async function loadPortfolio() {
    try {
        const cacheBust = new Date().getTime();
        const response = await fetch(`${API_BASE}/portfolio?_cacheBust=${cacheBust}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch portfolio');
        }
        const portfolio = await response.json();
        displayPortfolio(portfolio);
        loadSummary();
    } catch (error) {
        console.error('❌ Error loading portfolio:', error);
        portfolioGrid.innerHTML = '<p>Error loading portfolio data</p>';
    }
}

// Load portfolio data filtered by asset type
async function loadPortfolioByType(assetType) {
    try {
        console.log(`🔍 Loading portfolio for asset type: ${assetType}`);
        
        const cacheBust = new Date().getTime();
        const response = await fetch(`${API_BASE}/portfolio?type=${encodeURIComponent(assetType)}&_cacheBust=${cacheBust}`);

        if (!response.ok) {
            throw new Error('Failed to fetch portfolio');
        }
        const portfolio = await response.json();
        console.log(`📊 Received ${portfolio.length} items for ${assetType}:`, portfolio);
        
        const gridId = getGridIdByAssetType(assetType);
        
        console.log(`🎯 Displaying ${portfolio.length} items in grid: ${gridId}`);
        displayPortfolioInGrid(portfolio, gridId);
    } catch (error) {
        console.error('❌ Error loading portfolio by type:', error);
        const gridId = getGridIdByAssetType(assetType);
        document.getElementById(gridId).innerHTML = '<p>Error loading portfolio data</p>';
    }
}

// Helper function to get grid ID by asset type
function getGridIdByAssetType(assetType) {
    switch(assetType) {
        case 'stock': return 'stocksGrid';
        case 'bond': return 'bondsGrid';
        case 'mutual fund': return 'mutualFundsGrid';
        case 'ETF': return 'etfsGrid';
        case 'cash': return 'cashGrid';
        default: return 'portfolioGrid';
    }
}

// Helper function to refresh specific asset type tab data
async function refreshAssetTypeTab(assetType) {
    try {
        const response = await fetch(`${API_BASE}/portfolio?type=${encodeURIComponent(assetType)}`);
        if (!response.ok) {
            throw new Error('Failed to fetch portfolio');
        }
        const portfolio = await response.json();
        
        const gridId = getGridIdByAssetType(assetType);
        const grid = document.getElementById(gridId);
        
        if (grid) {
            displayPortfolioInGrid(portfolio, gridId);
        }
    } catch (error) {
        console.error(`❌ Error refreshing ${assetType} tab:`, error);
    }
}

// Display portfolio items
function displayPortfolio(portfolio) {
    displayPortfolioInGrid(portfolio, 'portfolioGrid');
}

// Display portfolio items in specific grid
function displayPortfolioInGrid(portfolio, gridId) {
    const grid = document.getElementById(gridId);
    if (!grid) {
        console.error(`Grid element ${gridId} not found`);
        return;
    }
    
    if (!portfolio || portfolio.length === 0) {
        grid.innerHTML = '<div class="empty-state"><i class="fas fa-chart-pie"></i><p>No assets in this category</p></div>';
        return;
    }
    
    grid.innerHTML = portfolio.map(item => {
        const currentValue = (item.quantity * item.current_price).toFixed(2);
        const totalCost = (item.quantity * item.avg_buy_price).toFixed(2);
        const gainLoss = (currentValue - totalCost).toFixed(2);
        const gainLossPercent = ((gainLoss / totalCost) * 100).toFixed(2);
        const isProfit = gainLoss >= 0;
        
        return `
            <div class="portfolio-item">
                <h3>${item.name}</h3>
                <div class="ticker">${item.ticker}</div>
                <div class="portfolio-details">
                    <div class="detail-item">
                        <span class="label"><i class="fas fa-layer-group"></i> Quantity</span>
                        <span class="value">${item.quantity}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label"><i class="fas fa-chart-bar"></i> Avg Price</span>
                        <span class="value">$${parseFloat(item.avg_buy_price).toFixed(2)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label"><i class="fas fa-dollar-sign"></i> Current Price</span>
                        <span class="value">$${parseFloat(item.current_price).toFixed(2)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label"><i class="fas fa-wallet"></i> Current Value</span>
                        <span class="value">$${currentValue}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label"><i class="fas fa-receipt"></i> Total Cost</span>
                        <span class="value">$${totalCost}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label"><i class="fas fa-${isProfit ? 'arrow-up' : 'arrow-down'}"></i> Gain/Loss</span>
                        <span class="value" style="color: ${isProfit ? 'var(--accent-success)' : 'var(--accent-danger)'}">
                            ${isProfit ? '+' : ''}$${gainLoss} (${gainLossPercent}%)
                        </span>
                    </div>
                </div>
                <div class="portfolio-actions-bottom">
                    <button class="sell-btn" onclick="showSellModal(${item.item_id}, '${item.ticker}', ${item.quantity}, ${item.current_price})">
                        <i class="fas fa-minus-circle"></i>
                        Sell
                    </button>
                    <button class="remove-btn" onclick="removeFromPortfolio(${item.item_id})">
                        <i class="fas fa-trash"></i>
                        Remove All
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Load portfolio summary
async function loadSummary() {
    try {
        const [portfolioResponse, transactionsResponse] = await Promise.all([
            fetch(`${API_BASE}/portfolio/summary`),
            fetch(`${API_BASE}/transactions`)
        ]);
        
        const summary = await portfolioResponse.json();
        const transactions = await transactionsResponse.json();
        
        totalValueEl.textContent = `$${parseFloat(summary.total_value || 0).toFixed(2)}`;
        totalAssetsEl.textContent = summary.total_assets || 0;
        if (totalTransactionsEl) {
            totalTransactionsEl.textContent = transactions.length || 0;
        }
    } catch (error) {
        console.error('Error loading summary:', error);
    }
}

// Load transactions
async function loadTransactions(filter = 'all') {
    try {
        const url = filter === 'all' ? `${API_BASE}/transactions` : `${API_BASE}/transactions?filter=${filter}`;
        const response = await fetch(url);
        const transactions = await response.json();
        displayTransactions(transactions);
    } catch (error) {
        console.error('=== DETAILED ERROR DEBUG ===');
        console.error('Error caught in transactions loading:', error);
        console.error('Error type:', error.constructor.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('========================');
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            showNotification('Network error: Could not connect to server', 'error');
        } else if (error.name === 'SyntaxError') {
            showNotification('Error: Server returned invalid response format', 'error');
        } else if (error.message.includes('JSON')) {
            showNotification('Error: Could not parse server response', 'error');
        } else {
            showNotification(`Error: ${error.message}`, 'error');
        }
        
        transactionsList.innerHTML = '<div class="error">Error loading transactions</div>';
    }
}

// Display transactions
function displayTransactions(transactions) {
    if (!transactions || transactions.length === 0) {
        transactionsList.innerHTML = '<div class="loading"><i class="fas fa-history"></i><br>No transactions yet</div>';
        return;
    }
    
    transactionsList.innerHTML = transactions.map(transaction => {
        const date = new Date(transaction.transaction_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        const amount = (transaction.quantity * transaction.price).toFixed(2);
        const isBuy = transaction.transaction_type === 'buy';
        
        return `
            <div class="transaction-item">
                <div class="transaction-info">
                    <div class="transaction-icon ${transaction.transaction_type}">
                        <i class="fas fa-${isBuy ? 'plus' : 'minus'}"></i>
                    </div>
                    <div class="transaction-details">
                        <h4>${transaction.ticker} - ${transaction.name}</h4>
                        <p>${isBuy ? 'Bought' : 'Sold'} ${transaction.quantity} shares at $${parseFloat(transaction.price).toFixed(2)}</p>
                    </div>
                </div>
                <div class="transaction-amount">
                    <div class="amount ${transaction.transaction_type}">
                        ${isBuy ? '-' : '+'}$${amount}
                    </div>
                    <div class="date">${date}</div>
                </div>
            </div>
        `;
    }).join('');
}

addAssetForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const assetType = document.getElementById('assetType').value;
    const ticker = document.getElementById('ticker').value.trim().toUpperCase();
    const quantity = parseInt(document.getElementById('quantity').value);
    const price = parseFloat(document.getElementById('price').value);

    if (!assetType) {
        showNotification('Please select an asset type.', 'error');
        return;
    }
    if (!ticker) {
        showNotification('Please enter a valid ticker symbol.', 'error');
        return;
    }
    if (isNaN(quantity) || quantity <= 0) {
        showNotification('Please enter a valid quantity (greater than 0).', 'error');
        return;
    }
    if (isNaN(price) || price <= 0) {
        showNotification('Please enter a valid price (greater than 0).', 'error');
        return;
    }

    console.log('Adding asset:', { ticker, quantity, price, assetType });

    try {
        const response = await fetch(`${API_BASE}/portfolio`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ticker, quantity, price, assetType })
        });

        if (response.ok) {
            const result = await response.json();
            const totalCost = quantity * price;
            adjustSettlementAccount('buy', totalCost);
            addAssetForm.reset();
            showNotification('Asset added to portfolio successfully!', 'success');

            await Promise.all([
                loadSummary(),
                loadTransactions()
            ]);
            
            let targetTabName;
            switch (assetType.toLowerCase()) {
                case 'stock': targetTabName = 'stocks'; break;
                case 'bond': targetTabName = 'bonds'; break;
                case 'mutual fund': targetTabName = 'mutual-funds'; break;
                case 'etf': targetTabName = 'etfs'; break;
                case 'cash': targetTabName = 'settlement-account'; break;
                default: targetTabName = 'portfolio';
            }
            
            showTab(targetTabName);

        }
    }catch (error) {
            console.error('❌ Error adding asset:', error);
            showNotification(error.message, 'error');
        }

});

async function removeFromPortfolio(itemId) {
    if (!confirm('Are you sure you want to remove this asset from your portfolio?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/portfolio/${itemId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            loadPortfolio();
            loadSummary();
        } else {
            alert('Error removing asset from portfolio');
        }
    } catch (error) {
        console.error('Error removing asset:', error);
        alert('Error removing asset from portfolio');
    }
}

async function refreshPrices() {
    try {
        console.log('🔄 Refreshing stock prices...');
        
        refreshPricesBtn.disabled = true;
        refreshPricesBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Refreshing...</span>';
        
        const response = await fetch(`${API_BASE}/refresh-prices`, {
            method: 'POST'
        });
        
        if (response.ok) {
            await Promise.all([
                loadPortfolio(),
                loadSummary()
            ]);
            
            refreshPricesBtn.innerHTML = '<i class="fas fa-check"></i> <span>Updated!</span>';
            setTimeout(() => {
                refreshPricesBtn.innerHTML = '<i class="fas fa-sync-alt"></i> <span>Refresh Prices</span>';
                refreshPricesBtn.disabled = false;
            }, 2000);
        } else {
            throw new Error('Failed to refresh prices');
        }
    } catch (error) {
        console.error('=== DETAILED ERROR DEBUG ===');
        console.error('Error caught in price refresh:', error);
        console.error('Error type:', error.constructor.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('========================');
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            showNotification('Network error: Could not connect to server', 'error');
        } else if (error.name === 'SyntaxError') {
            showNotification('Error: Server returned invalid response format', 'error');
        } else if (error.message.includes('JSON')) {
            showNotification('Error: Could not parse server response', 'error');
        } else {
            showNotification(`Error: ${error.message}`, 'error');
        }
        
        refreshPricesBtn.innerHTML = '<i class="fas fa-times"></i> <span>Error</span>';
        setTimeout(() => {
            refreshPricesBtn.innerHTML = '<i class="fas fa-sync-alt"></i> <span>Refresh Prices</span>';
            refreshPricesBtn.disabled = false;
        }, 2000);
    }
}

function filterTransactions() {
    const filterValue = transactionFilter.value;
    loadTransactions(filterValue);
}

function showSellModal(itemId, ticker, maxQuantity, currentPrice) {
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content">
            <h3><i class="fas fa-minus-circle"></i> Sell ${ticker}</h3>
            <div class="form-group">
                <label for="sellQuantity">
                    <i class="fas fa-sort-numeric-up"></i>
                    Quantity to Sell (Max: ${maxQuantity})
                </label>
                <input type="number" id="sellQuantity" min="1" max="${maxQuantity}" value="1">
            </div>
            <div class="form-group">
                <label for="sellPrice">
                    <i class="fas fa-dollar-sign"></i>
                    Sell Price per Share
                </label>
                <input type="number" id="sellPrice" value="${currentPrice}" step="0.01" min="0">
            </div>
            <div class="modal-actions">
                <button class="modal-btn secondary" onclick="closeSellModal()">
                    Cancel
                </button>
                <button class="modal-btn primary" onclick="processSell(${itemId}, '${ticker}', ${maxQuantity})">
                    <i class="fas fa-check"></i>
                    Confirm Sale
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeSellModal();
        }
    });
}

function closeSellModal() {
    const modal = document.querySelector('.modal');
    if (modal) {
        modal.remove();
    }
}

async function processSell(itemId, ticker, maxQuantity) {
    const sellQuantityEl = document.getElementById('sellQuantity');
    const sellPriceEl = document.getElementById('sellPrice');
    
    if (!sellQuantityEl || !sellPriceEl) {
        alert('Error: Modal form elements not found.');
        return;
    }
    
    const sellQuantity = parseInt(sellQuantityEl.value);
    const sellPrice = parseFloat(sellPriceEl.value);
    
    console.log('Sell validation:', { sellQuantity, sellPrice, maxQuantity });
    
    if (isNaN(sellQuantity) || sellQuantity <= 0 || sellQuantity > maxQuantity) {
        alert(`Please enter a valid quantity to sell (1-${maxQuantity}).`);
        return;
    }
    
    if (isNaN(sellPrice) || sellPrice <= 0) {
        alert('Please enter a valid sell price.');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/portfolio/${itemId}/sell`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                quantity: sellQuantity,
                price: sellPrice
            })
        });
        
        if (response.ok) {
            const totalGain = sellQuantity * sellPrice;
            adjustSettlementAccount('sell', totalGain);
            closeSellModal();
            await Promise.all([
                loadPortfolio(),
                loadSummary(),
                loadTransactions()
            ]);
            
            showNotification(`Successfully sold ${sellQuantity} shares of ${ticker}!`, 'success');
        } else {
            const error = await response.json();
            alert(`Error selling asset: ${error.error}`);
        }
    } catch (error) {
        console.error('Error selling asset:', error);
        alert('Error selling asset. Please try again.');
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        ${message}
    `;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--bg-card);
        color: var(--text-primary);
        padding: 15px 20px;
        border-radius: 10px;
        border-left: 4px solid var(--accent-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'primary'});
        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        z-index: 1001;
        animation: slideIn 0.3s ease;
        max-width: 300px;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}



