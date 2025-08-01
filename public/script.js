// API Base URL
const API_BASE = '/api';

// DOM Elements
const portfolioGrid = document.getElementById('portfolioGrid');
const transactionsList = document.getElementById('transactionsList');
const addAssetForm = document.getElementById('addAssetForm');
const totalValueEl = document.getElementById('totalValue');
const totalAssetsEl = document.getElementById('totalAssets');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadPortfolio();
    loadTransactions();
    loadSummary();
});

// Tab switching
function showTab(tabName) {
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
    
    // Add active class to clicked button
    event.target.classList.add('active');
    
    // Load data for specific tabs
    if (tabName === 'portfolio') {
        loadPortfolio();
    } else if (tabName === 'transactions') {
        loadTransactions();
    }
}

// Load portfolio data
async function loadPortfolio() {
    try {
        const response = await fetch(`${API_BASE}/portfolio`);
        const portfolio = await response.json();
        
        displayPortfolio(portfolio);
        loadSummary();
    } catch (error) {
        console.error('Error loading portfolio:', error);
        portfolioGrid.innerHTML = '<p>Error loading portfolio data</p>';
    }
}

// Display portfolio items
function displayPortfolio(portfolio) {
    if (portfolio.length === 0) {
        portfolioGrid.innerHTML = '<p style="text-align: center; color: #666;">No assets in portfolio yet. Add some assets to get started!</p>';
        return;
    }
    
    portfolioGrid.innerHTML = portfolio.map(item => `
        <div class="portfolio-item">
            <h3>${item.name}</h3>
            <div class="ticker">${item.ticker}</div>
            
            <div class="portfolio-stats">
                <div class="stat">
                    <div class="stat-label">Quantity</div>
                    <div class="stat-value">${item.quantity}</div>
                </div>
                <div class="stat">
                    <div class="stat-label">Current Price</div>
                    <div class="stat-value">$${parseFloat(item.current_price).toFixed(2)}</div>
                </div>
                <div class="stat">
                    <div class="stat-label">Avg Buy Price</div>
                    <div class="stat-value">$${parseFloat(item.avg_buy_price).toFixed(2)}</div>
                </div>
                <div class="stat">
                    <div class="stat-label">Current Value</div>
                    <div class="stat-value">$${parseFloat(item.current_value).toFixed(2)}</div>
                </div>
            </div>
            
            <button class="remove-btn" onclick="removeFromPortfolio(${item.item_id})">
                Remove from Portfolio
            </button>
        </div>
    `).join('');
}

// Load portfolio summary
async function loadSummary() {
    try {
        const response = await fetch(`${API_BASE}/portfolio/summary`);
        const summary = await response.json();
        
        totalValueEl.textContent = `$${parseFloat(summary.total_value || 0).toFixed(2)}`;
        totalAssetsEl.textContent = summary.total_assets || 0;
    } catch (error) {
        console.error('Error loading summary:', error);
        totalValueEl.textContent = '$0.00';
        totalAssetsEl.textContent = '0';
    }
}

// Load transactions
async function loadTransactions() {
    try {
        const response = await fetch(`${API_BASE}/transactions`);
        const transactions = await response.json();
        
        displayTransactions(transactions);
    } catch (error) {
        console.error('Error loading transactions:', error);
        transactionsList.innerHTML = '<p>Error loading transaction data</p>';
    }
}

// Display transactions
function displayTransactions(transactions) {
    if (transactions.length === 0) {
        transactionsList.innerHTML = '<p style="text-align: center; color: #666;">No transactions yet.</p>';
        return;
    }
    
    transactionsList.innerHTML = transactions.map(transaction => `
        <div class="transaction-item">
            <div class="transaction-info">
                <h4>${transaction.ticker} - ${transaction.name}</h4>
                <p>${new Date(transaction.transaction_date).toLocaleDateString()} • ${transaction.quantity} shares</p>
            </div>
            <div class="transaction-amount ${transaction.transaction_type}">
                ${transaction.transaction_type === 'buy' ? '+' : '-'}$${parseFloat(transaction.price * transaction.quantity).toFixed(2)}
            </div>
        </div>
    `).join('');
}

// Add asset form handler
addAssetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const ticker = document.getElementById('ticker').value.toUpperCase();
    const quantity = parseInt(document.getElementById('quantity').value);
    const price = parseFloat(document.getElementById('price').value);
    
    try {
        const response = await fetch(`${API_BASE}/portfolio`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ticker, quantity, price })
        });
        
        if (response.ok) {
            // Clear form
            addAssetForm.reset();
            
            // Show success message
            alert('Asset added to portfolio successfully!');
            
            // Refresh data
            loadPortfolio();
            loadSummary();
            
            // Switch to portfolio tab
            showTab('portfolio');
            document.querySelector('.tab-btn').click();
        } else {
            const error = await response.json();
            alert('Error adding asset: ' + error.error);
        }
    } catch (error) {
        console.error('Error adding asset:', error);
        alert('Error adding asset to portfolio');
    }
});

// Remove asset from portfolio
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
