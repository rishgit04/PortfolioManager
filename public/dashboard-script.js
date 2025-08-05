// API Base URL
const API_BASE = '/api';

// DOM Elements
const totalValueEl = document.getElementById('totalValue');
const totalAssetsEl = document.getElementById('totalAssets');
const totalTransactionsEl = document.getElementById('totalTransactions');
const settlementAccountBalanceEl = document.getElementById('settlementAccountBalance');
const refreshPricesBtn = document.getElementById('refreshPricesBtn');
const themeToggle = document.getElementById('themeToggle');
const addAssetForm = document.getElementById('addAssetForm');
const portfolioTableBody = document.getElementById('portfolioTableBody');
const transactionsTableBody = document.getElementById('transactionsTableBody');
const assetTypeFilter = document.getElementById('assetTypeFilter');
const transactionFilter = document.getElementById('transactionFilter');

// Global variables
let currentTheme = localStorage.getItem('theme') || 'dark';
let settlementAccountBalance = 1000; // Will be loaded from API
let portfolioData = [];
let transactionData = [];
let performanceChart = null;

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    loadDashboardData();
    setupEventListeners();
    initializeChart();
});

// Theme Management
function initializeTheme() {
    document.documentElement.setAttribute('data-theme', currentTheme);
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

// Event Listeners
function setupEventListeners() {
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    if (refreshPricesBtn) {
        refreshPricesBtn.addEventListener('click', refreshPrices);
    }
    
    if (addAssetForm) {
        addAssetForm.addEventListener('submit', handleAddAsset);
    }
    
    if (assetTypeFilter) {
        assetTypeFilter.addEventListener('change', filterPortfolioTable);
    }
    
    if (transactionFilter) {
        transactionFilter.addEventListener('change', filterTransactionTable);
    }
}

// Load Settlement Account Balance
async function loadSettlementAccountBalance() {
    try {
        const response = await fetch(`${API_BASE}/settlement-account`);
        if (response.ok) {
            const data = await response.json();
            settlementAccountBalance = data.balance;
            console.log('Settlement account balance loaded:', settlementAccountBalance);
            
            // Update the display
            if (settlementAccountBalanceEl) {
                settlementAccountBalanceEl.textContent = `$${settlementAccountBalance.toFixed(2)}`;
            }
        } else {
            throw new Error('Failed to load settlement account balance');
        }
    } catch (error) {
        console.error('Error loading settlement account balance:', error);
    }
}

// Load Dashboard Data
async function loadDashboardData() {
    try {
        await Promise.all([
            loadPortfolioData(),
            loadTransactionData(),
            loadSummaryData(),
            loadSettlementAccountBalance()
        ]);
        
        renderPortfolioTable();
        renderTransactionTable();
        updatePerformanceChart();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showNotification('Error loading dashboard data', 'error');
    }
}

// Load Portfolio Data
async function loadPortfolioData() {
    try {
        const response = await fetch(`${API_BASE}/portfolio`);
        if (response.ok) {
            portfolioData = await response.json();
            console.log('Portfolio data loaded:', portfolioData);
        } else {
            throw new Error('Failed to load portfolio data');
        }
    } catch (error) {
        console.error('Error loading portfolio:', error);
        portfolioData = [];
    }
}

// Load Transaction Data
async function loadTransactionData() {
    try {
        const response = await fetch(`${API_BASE}/transactions`);
        if (response.ok) {
            transactionData = await response.json();
            console.log('Transaction data loaded:', transactionData);
        } else {
            throw new Error('Failed to load transaction data');
        }
    } catch (error) {
        console.error('Error loading transactions:', error);
        transactionData = [];
    }
}

// Load Summary Data
async function loadSummaryData() {
    try {
        const response = await fetch(`${API_BASE}/portfolio/summary`);
        if (response.ok) {
            const summary = await response.json();
            updateSummaryCards(summary);
        } else {
            throw new Error('Failed to load summary data');
        }
    } catch (error) {
        console.error('Error loading summary:', error);
        // Calculate summary from portfolio data if API fails
        calculateSummaryFromPortfolio();
    }
}

// Update Summary Cards
function updateSummaryCards(summary) {
    if (totalValueEl) {
        totalValueEl.textContent = `$${(summary.totalValue || 0).toFixed(2)}`;
    }
    if (totalAssetsEl) {
        totalAssetsEl.textContent = summary.totalAssets || 0;
    }
    if (totalTransactionsEl) {
        totalTransactionsEl.textContent = summary.totalTransactions || 0;
    }
    if (settlementAccountBalanceEl) {
        settlementAccountBalanceEl.textContent = `$${settlementAccountBalance.toFixed(2)}`;
    }
}

// Calculate Summary from Portfolio Data
function calculateSummaryFromPortfolio() {
    const totalValue = portfolioData.reduce((sum, item) => {
        return sum + (item.quantity * (item.current_price || item.purchase_price));
    }, 0);
    
    updateSummaryCards({
        totalValue: totalValue,
        totalAssets: portfolioData.length,
        totalTransactions: transactionData.length
    });
}

// Render Portfolio Table
function renderPortfolioTable(filteredData = null) {
    const data = filteredData || portfolioData;
    
    if (!portfolioTableBody) return;
    
    if (data.length === 0) {
        portfolioTableBody.innerHTML = `
            <tr>
                <td colspan="9" class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>No portfolio assets found</p>
                </td>
            </tr>
        `;
        return;
    }
    
    portfolioTableBody.innerHTML = data.map(item => {
        // Handle null/undefined values with fallbacks
        const avgBuyPrice = parseFloat(item.avg_buy_price) || 0;
        const currentPrice = parseFloat(item.current_price) || avgBuyPrice || 0;
        const quantity = parseInt(item.quantity) || 0;
        
        const totalValue = quantity * currentPrice;
        const totalCost = quantity * avgBuyPrice;
        const gainLoss = totalValue - totalCost;
        const gainLossPercent = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;
        
        const gainLossClass = gainLoss >= 0 ? 'gain-positive' : 'gain-negative';
        const gainLossIcon = gainLoss >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
        
        return `
            <tr class="fade-in">
                <td class="asset-cell">${item.ticker || 'N/A'}</td>
                <td><span class="type-cell">${item.asset_type || 'N/A'}</span></td>
                <td class="font-bold">${quantity}</td>
                <td class="price-cell">$${avgBuyPrice.toFixed(2)}</td>
                <td class="price-cell">$${currentPrice.toFixed(2)}</td>
                <td class="value-cell">$${totalValue.toFixed(2)}</td>
                <td class="${gainLossClass}">
                    <i class="fas ${gainLossIcon}"></i>
                    $${Math.abs(gainLoss).toFixed(2)}
                </td>
                <td class="${gainLossClass}">
                    <i class="fas ${gainLossIcon}"></i>
                    ${Math.abs(gainLossPercent).toFixed(2)}%
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-sell" onclick="showSellModal(${item.item_id}, '${item.ticker}', ${quantity}, ${currentPrice})">
                            <i class="fas fa-hand-holding-usd"></i>
                            Sell
                        </button>
                        <button class="btn-remove" onclick="removeAsset(${item.item_id})">
                            <i class="fas fa-trash"></i>
                            Remove
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Render Transaction Table
function renderTransactionTable(filteredData = null) {
    const data = filteredData || transactionData;
    
    if (!transactionsTableBody) return;
    
    if (data.length === 0) {
        transactionsTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <i class="fas fa-history"></i>
                    <p>No transactions found</p>
                </td>
            </tr>
        `;
        return;
    }
    
    // Sort by date (newest first)
    const sortedData = data.sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));
    
    transactionsTableBody.innerHTML = sortedData.map(transaction => {
        // Handle null/undefined values with fallbacks
        const transactionDate = transaction.transaction_date ? new Date(transaction.transaction_date).toLocaleDateString() : 'N/A';
        const actionClass = transaction.transaction_type === 'buy' ? 'buy' : 'sell';
        const quantity = parseInt(transaction.quantity) || 0;
        const price = parseFloat(transaction.price) || 0;
        const totalAmount = quantity * price;
        
        return `
            <tr class="fade-in">
                <td class="transaction-date">${transactionDate}</td>
                <td class="asset-cell">${transaction.ticker || 'N/A'}</td>
                <td><span class="type-cell">${transaction.asset_type || 'N/A'}</span></td>
                <td class="transaction-action ${actionClass}">${transaction.transaction_type || 'N/A'}</td>
                <td class="font-bold">${quantity}</td>
                <td class="price-cell">$${price.toFixed(2)}</td>
                <td class="value-cell">$${totalAmount.toFixed(2)}</td>
            </tr>
        `;
    }).join('');
}

// Filter Portfolio Table
function filterPortfolioTable() {
    const filterValue = assetTypeFilter.value;
    
    if (filterValue === 'all') {
        renderPortfolioTable();
    } else {
        const filteredData = portfolioData.filter(item => 
            item.asset_type.toLowerCase() === filterValue.toLowerCase()
        );
        renderPortfolioTable(filteredData);
    }
}

// Filter Transaction Table
function filterTransactionTable() {
    const filterValue = transactionFilter.value;
    
    if (filterValue === 'all') {
        renderTransactionTable();
    } else {
        const filteredData = transactionData.filter(transaction => 
            transaction.transaction_type === filterValue
        );
        renderTransactionTable(filteredData);
    }
}

// Initialize Performance Chart
function initializeChart() {
    const ctx = document.getElementById('performanceChart');
    if (!ctx) return;
    
    performanceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Gain/Loss ($)',
                data: [],
                backgroundColor: [],
                borderColor: [],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Asset Performance (Gain/Loss)',
                    color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim()
                },
                legend: {
                    labels: {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim()
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim(),
                        callback: function(value) {
                            return '$' + value.toFixed(0);
                        }
                    },
                    grid: {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim()
                    }
                },
                x: {
                    ticks: {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim()
                    },
                    grid: {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim()
                    }
                }
            }
        }
    });
}

// Update Performance Chart
function updatePerformanceChart() {
    if (!performanceChart || portfolioData.length === 0) return;
    
    const chartData = portfolioData.map(item => {
        const currentPrice = item.current_price || item.purchase_price;
        const totalValue = item.quantity * currentPrice;
        const totalCost = item.quantity * item.purchase_price;
        const gainLoss = totalValue - totalCost;
        
        return {
            label: item.ticker,
            value: gainLoss,
            isPositive: gainLoss >= 0
        };
    });
    
    const successColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-success').trim();
    const dangerColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-danger').trim();
    
    performanceChart.data.labels = chartData.map(item => item.label);
    performanceChart.data.datasets[0].data = chartData.map(item => item.value);
    performanceChart.data.datasets[0].backgroundColor = chartData.map(item => 
        item.isPositive ? successColor + '80' : dangerColor + '80'
    );
    performanceChart.data.datasets[0].borderColor = chartData.map(item => 
        item.isPositive ? successColor : dangerColor
    );
    
    performanceChart.update();
}

// Handle Add Asset Form
async function handleAddAsset(event) {
    event.preventDefault();
    
    console.log('Add asset form submitted');
    
    // Get form values directly from form elements
    const assetType = document.getElementById('assetType').value;
    const ticker = document.getElementById('ticker').value.toUpperCase();
    const quantity = parseInt(document.getElementById('quantity').value);
    const price = parseFloat(document.getElementById('price').value);
    
    // Validate form data
    if (!assetType || !ticker || !quantity || !price) {
        showNotification('Please fill in all fields', 'error');
        return;
    }
    
    if (quantity <= 0 || price <= 0) {
        showNotification('Quantity and price must be greater than 0', 'error');
        return;
    }
    
    const assetData = {
        assetType: assetType,
        ticker: ticker,
        quantity: quantity,
        price: price
    };
    
    console.log('Asset data to send:', assetData);
    
    try {
        const response = await fetch(`${API_BASE}/portfolio`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(assetData)
        });
        
        console.log('Response status:', response.status);
        
        if (response.ok) {
            const totalCost = quantity * price;
            adjustSettlementAccount('buy', totalCost);
            
            addAssetForm.reset();
            await loadDashboardData();
            showNotification(`Successfully added ${quantity} shares of ${ticker}!`, 'success');
        } else {
            const error = await response.json();
            console.error('Server error:', error);
            showNotification(`Error adding asset: ${error.error}`, 'error');
        }
    } catch (error) {
        console.error('Error adding asset:', error);
        showNotification('Error adding asset. Please try again.', 'error');
    }
}

// Remove Asset
async function removeAsset(itemId) {
    if (!confirm('Are you sure you want to remove this asset from your portfolio?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/portfolio/${itemId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            await loadDashboardData();
            showNotification('Asset removed successfully!', 'success');
        } else {
            const error = await response.json();
            showNotification(`Error removing asset: ${error.error}`, 'error');
        }
    } catch (error) {
        console.error('Error removing asset:', error);
        showNotification('Error removing asset. Please try again.', 'error');
    }
}

// Show Sell Modal
function showSellModal(itemId, ticker, maxQuantity, currentPrice) {
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Sell ${ticker}</h3>
            <div class="form-group">
                <label for="sellQuantity">
                    <i class="fas fa-sort-numeric-up"></i>
                    Quantity to Sell (Max: ${maxQuantity})
                </label>
                <input type="number" id="sellQuantity" max="${maxQuantity}" min="1" value="1">
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

// Close Sell Modal
function closeSellModal() {
    const modal = document.querySelector('.modal');
    if (modal) {
        modal.remove();
    }
}

// Process Sell
async function processSell(itemId, ticker, maxQuantity) {
    const sellQuantityEl = document.getElementById('sellQuantity');
    const sellPriceEl = document.getElementById('sellPrice');
    
    if (!sellQuantityEl || !sellPriceEl) {
        showNotification('Error: Modal form elements not found.', 'error');
        return;
    }
    
    const sellQuantity = parseInt(sellQuantityEl.value);
    const sellPrice = parseFloat(sellPriceEl.value);
    
    if (isNaN(sellQuantity) || sellQuantity <= 0 || sellQuantity > maxQuantity) {
        showNotification(`Please enter a valid quantity to sell (1-${maxQuantity}).`, 'error');
        return;
    }
    
    if (isNaN(sellPrice) || sellPrice <= 0) {
        showNotification('Please enter a valid sell price.', 'error');
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
            await loadDashboardData();
            showNotification(`Successfully sold ${sellQuantity} shares of ${ticker}!`, 'success');
        } else {
            const error = await response.json();
            showNotification(`Error selling asset: ${error.error}`, 'error');
        }
    } catch (error) {
        console.error('Error selling asset:', error);
        showNotification('Error selling asset. Please try again.', 'error');
    }
}

// Adjust Settlement Account
function adjustSettlementAccount(transactionType, amount) {
    if (transactionType === 'buy') {
        settlementAccountBalance -= amount;
    } else if (transactionType === 'sell') {
        settlementAccountBalance += amount;
    }
    
    if (settlementAccountBalanceEl) {
        settlementAccountBalanceEl.textContent = `$${settlementAccountBalance.toFixed(2)}`;
    }
}

// Refresh Prices
async function refreshPrices() {
    const originalText = refreshPricesBtn.innerHTML;
    refreshPricesBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Refreshing...</span>';
    refreshPricesBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_BASE}/refresh-prices`, {
            method: 'POST'
        });
        
        if (response.ok) {
            await loadDashboardData();
            showNotification('Prices refreshed successfully!', 'success');
        } else {
            throw new Error('Failed to refresh prices');
        }
    } catch (error) {
        console.error('Error refreshing prices:', error);
        showNotification('Error refreshing prices. Please try again.', 'error');
    } finally {
        refreshPricesBtn.innerHTML = originalText;
        refreshPricesBtn.disabled = false;
    }
}

// Show Notification
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
