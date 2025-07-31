// Portfolio Management Application
class PortfolioManager {
    constructor() {
        this.portfolio = this.loadPortfolio();
        this.currentChart = null;
        this.analyticsChart = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateDateTime();
        this.renderDashboard();
        this.renderPortfolio();
        this.setupCharts();
        
        // Update time every minute
        setInterval(() => this.updateDateTime(), 60000);
        
        // Add some sample data if portfolio is empty
        if (this.portfolio.length === 0) {
            this.addSampleData();
        }
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Add asset form
        document.getElementById('add-asset-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addAsset();
        });

        // Search and sort
        document.getElementById('search-assets').addEventListener('input', (e) => {
            this.filterPortfolio(e.target.value);
        });

        document.getElementById('sort-by').addEventListener('change', (e) => {
            this.sortPortfolio(e.target.value);
        });

        // Chart controls
        document.querySelectorAll('.chart-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchChart(e.target.dataset.chart);
            });
        });

        // Modal controls
        document.getElementById('modal-cancel').addEventListener('click', () => {
            this.hideModal();
        });

        document.getElementById('modal-confirm').addEventListener('click', () => {
            this.confirmAction();
        });

        document.getElementById('modal-overlay').addEventListener('click', (e) => {
            if (e.target.id === 'modal-overlay') {
                this.hideModal();
            }
        });
    }

    switchTab(tabName) {
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');

        // Refresh charts when switching to analytics
        if (tabName === 'analytics') {
            setTimeout(() => this.setupAnalyticsChart(), 100);
        }
    }

    updateDateTime() {
        const now = new Date();
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        document.getElementById('current-time').textContent = now.toLocaleDateString('en-US', options);
    }

    addSampleData() {
        const sampleAssets = [
            {
                id: 1,
                name: 'Reliance Industries',
                symbol: 'RIL',
                quantity: 10,
                price: 2500,
                category: 'stocks',
                change: 5.2,
                dateAdded: new Date('2024-01-15')
            },
            {
                id: 2,
                name: 'Tata Consultancy Services',
                symbol: 'TCS',
                quantity: 5,
                price: 3200,
                category: 'stocks',
                change: -2.1,
                dateAdded: new Date('2024-02-10')
            },
            {
                id: 3,
                name: 'HDFC Bank',
                symbol: 'HDFCBANK',
                quantity: 15,
                price: 1650,
                category: 'stocks',
                change: 3.8,
                dateAdded: new Date('2024-03-05')
            },
            {
                id: 4,
                name: 'Bitcoin',
                symbol: 'BTC',
                quantity: 0.5,
                price: 4500000,
                category: 'crypto',
                change: 12.5,
                dateAdded: new Date('2024-01-20')
            }
        ];

        this.portfolio = sampleAssets;
        this.savePortfolio();
    }

    addAsset() {
        const form = document.getElementById('add-asset-form');
        const formData = new FormData(form);
        
        const asset = {
            id: Date.now(),
            name: document.getElementById('asset-name').value,
            symbol: document.getElementById('asset-symbol').value.toUpperCase(),
            quantity: parseFloat(document.getElementById('asset-quantity').value),
            price: parseFloat(document.getElementById('asset-price').value),
            category: document.getElementById('asset-category').value,
            change: (Math.random() - 0.5) * 20, // Random change for demo
            dateAdded: new Date()
        };

        this.portfolio.push(asset);
        this.savePortfolio();
        this.renderDashboard();
        this.renderPortfolio();
        this.setupCharts();
        
        form.reset();
        this.showToast('Asset added successfully!', 'success');
        this.switchTab('portfolio');
    }

    removeAsset(id) {
        const asset = this.portfolio.find(a => a.id === id);
        this.showModal(
            `Are you sure you want to remove ${asset.name} from your portfolio?`,
            () => {
                this.portfolio = this.portfolio.filter(a => a.id !== id);
                this.savePortfolio();
                this.renderDashboard();
                this.renderPortfolio();
                this.setupCharts();
                this.showToast('Asset removed successfully!', 'success');
            }
        );
    }

    renderDashboard() {
        const totalValue = this.portfolio.reduce((sum, asset) => sum + (asset.quantity * asset.price), 0);
        const totalAssets = this.portfolio.length;
        const avgReturn = totalAssets > 0 ? 
            this.portfolio.reduce((sum, asset) => sum + asset.change, 0) / totalAssets : 0;
        
        const bestPerformer = this.portfolio.reduce((best, asset) => 
            asset.change > (best?.change || -Infinity) ? asset : best, null);

        document.getElementById('total-value').textContent = this.formatCurrency(totalValue);
        document.getElementById('total-assets').textContent = totalAssets;
        document.getElementById('avg-return').textContent = `${avgReturn.toFixed(1)}%`;
        
        if (bestPerformer) {
            document.getElementById('best-performer').textContent = bestPerformer.symbol;
            document.getElementById('best-change').textContent = `+${bestPerformer.change.toFixed(1)}%`;
        }

        // Update total change indicator
        const totalChangeElement = document.getElementById('total-change');
        if (avgReturn > 0) {
            totalChangeElement.textContent = `+${avgReturn.toFixed(1)}%`;
            totalChangeElement.className = 'stat-change positive';
        } else if (avgReturn < 0) {
            totalChangeElement.textContent = `${avgReturn.toFixed(1)}%`;
            totalChangeElement.className = 'stat-change negative';
        } else {
            totalChangeElement.textContent = '0%';
            totalChangeElement.className = 'stat-change';
        }
    }

    renderPortfolio() {
        const grid = document.getElementById('portfolio-grid');
        
        if (this.portfolio.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-briefcase"></i>
                    <h3>No Assets Yet</h3>
                    <p>Add your first asset to get started</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = this.portfolio.map(asset => `
            <div class="portfolio-item" data-id="${asset.id}">
                <div class="portfolio-item-header">
                    <div>
                        <div class="asset-name">${asset.name}</div>
                        <div class="asset-symbol">${asset.symbol}</div>
                    </div>
                    <div class="change-indicator ${asset.change >= 0 ? 'positive' : 'negative'}">
                        <i class="fas fa-${asset.change >= 0 ? 'arrow-up' : 'arrow-down'}"></i>
                        ${asset.change >= 0 ? '+' : ''}${asset.change.toFixed(1)}%
                    </div>
                </div>
                
                <div class="portfolio-item-body">
                    <div class="portfolio-metric">
                        <div class="label">Quantity</div>
                        <div class="value">${asset.quantity}</div>
                    </div>
                    <div class="portfolio-metric">
                        <div class="label">Price</div>
                        <div class="value">${this.formatCurrency(asset.price)}</div>
                    </div>
                    <div class="portfolio-metric">
                        <div class="label">Total Value</div>
                        <div class="value">${this.formatCurrency(asset.quantity * asset.price)}</div>
                    </div>
                    <div class="portfolio-metric">
                        <div class="label">Category</div>
                        <div class="value">${this.capitalizeFirst(asset.category)}</div>
                    </div>
                </div>
                
                <div class="portfolio-item-footer">
                    <small>Added ${asset.dateAdded.toLocaleDateString()}</small>
                    <button class="remove-btn" onclick="portfolioManager.removeAsset(${asset.id})">
                        <i class="fas fa-trash"></i> Remove
                    </button>
                </div>
            </div>
        `).join('');
    }

    filterPortfolio(searchTerm) {
        const items = document.querySelectorAll('.portfolio-item');
        items.forEach(item => {
            const name = item.querySelector('.asset-name').textContent.toLowerCase();
            const symbol = item.querySelector('.asset-symbol').textContent.toLowerCase();
            const isVisible = name.includes(searchTerm.toLowerCase()) || 
                            symbol.includes(searchTerm.toLowerCase());
            item.style.display = isVisible ? 'block' : 'none';
        });
    }

    sortPortfolio(sortBy) {
        let sortedPortfolio = [...this.portfolio];
        
        switch (sortBy) {
            case 'name':
                sortedPortfolio.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'value':
                sortedPortfolio.sort((a, b) => (b.quantity * b.price) - (a.quantity * a.price));
                break;
            case 'change':
                sortedPortfolio.sort((a, b) => b.change - a.change);
                break;
        }
        
        this.portfolio = sortedPortfolio;
        this.renderPortfolio();
    }

    setupCharts() {
        this.setupDashboardChart();
        if (document.getElementById('analytics').classList.contains('active')) {
            this.setupAnalyticsChart();
        }
    }

    setupDashboardChart() {
        const ctx = document.getElementById('portfolioChart').getContext('2d');
        
        if (this.currentChart) {
            this.currentChart.destroy();
        }

        const labels = this.portfolio.map(asset => asset.symbol);
        const data = this.portfolio.map(asset => asset.quantity * asset.price);
        const colors = this.generateColors(this.portfolio.length);

        this.currentChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const value = this.formatCurrency(context.raw);
                                const percentage = ((context.raw / data.reduce((a, b) => a + b, 0)) * 100).toFixed(1);
                                return `${context.label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    setupAnalyticsChart() {
        const ctx = document.getElementById('analyticsChart').getContext('2d');
        
        if (this.analyticsChart) {
            this.analyticsChart.destroy();
        }

        const activeChartType = document.querySelector('.chart-btn.active').dataset.chart;
        this.createAnalyticsChart(ctx, activeChartType);
    }

    createAnalyticsChart(ctx, type) {
        const labels = this.portfolio.map(asset => asset.symbol);
        const data = this.portfolio.map(asset => asset.change);
        const colors = data.map(value => value >= 0 ? '#48bb78' : '#f56565');

        let chartConfig = {
            data: {
                labels: labels,
                datasets: [{
                    label: 'Performance (%)',
                    data: data,
                    backgroundColor: colors,
                    borderColor: colors,
                    borderWidth: 2,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: type === 'pie'
                    }
                },
                scales: type !== 'pie' ? {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => value + '%'
                        }
                    }
                } : {}
            }
        };

        if (type === 'line') {
            chartConfig.type = 'line';
            chartConfig.data.datasets[0].backgroundColor = 'rgba(102, 126, 234, 0.1)';
            chartConfig.data.datasets[0].borderColor = '#667eea';
            chartConfig.data.datasets[0].fill = true;
        } else if (type === 'bar') {
            chartConfig.type = 'bar';
        } else if (type === 'pie') {
            chartConfig.type = 'pie';
            chartConfig.data.datasets[0].backgroundColor = this.generateColors(labels.length);
        }

        this.analyticsChart = new Chart(ctx, chartConfig);
    }

    switchChart(chartType) {
        document.querySelectorAll('.chart-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-chart="${chartType}"]`).classList.add('active');
        
        this.setupAnalyticsChart();
    }

    generateColors(count) {
        const colors = [
            '#667eea', '#764ba2', '#48bb78', '#f56565', '#ed8936',
            '#4299e1', '#9f7aea', '#38b2ac', '#f093fb', '#f5576c'
        ];
        
        const result = [];
        for (let i = 0; i < count; i++) {
            result.push(colors[i % colors.length]);
        }
        return result;
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-${this.getToastIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.getElementById('toast-container').appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-in forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    getToastIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || icons.info;
    }

    showModal(message, confirmCallback) {
        document.getElementById('modal-message').textContent = message;
        document.getElementById('modal-overlay').classList.add('active');
        this.pendingAction = confirmCallback;
    }

    hideModal() {
        document.getElementById('modal-overlay').classList.remove('active');
        this.pendingAction = null;
    }

    confirmAction() {
        if (this.pendingAction) {
            this.pendingAction();
            this.pendingAction = null;
        }
        this.hideModal();
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1).replace('-', ' ');
    }

    loadPortfolio() {
        const saved = localStorage.getItem('portfolio');
        if (saved) {
            return JSON.parse(saved).map(asset => ({
                ...asset,
                dateAdded: new Date(asset.dateAdded)
            }));
        }
        return [];
    }

    savePortfolio() {
        localStorage.setItem('portfolio', JSON.stringify(this.portfolio));
    }
}

// Add CSS animation for slide out
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Initialize the application
const portfolioManager = new PortfolioManager();

// Add some interactive effects
document.addEventListener('DOMContentLoaded', () => {
    // Add hover effects to cards
    document.addEventListener('mouseover', (e) => {
        if (e.target.closest('.stat-card') || e.target.closest('.portfolio-item')) {
            e.target.closest('.stat-card, .portfolio-item').style.transform = 'translateY(-5px)';
        }
    });

    document.addEventListener('mouseout', (e) => {
        if (e.target.closest('.stat-card') || e.target.closest('.portfolio-item')) {
            e.target.closest('.stat-card, .portfolio-item').style.transform = 'translateY(0)';
        }
    });

    // Add loading animation
    const loadingOverlay = document.createElement('div');
    loadingOverlay.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; z-index: 10000; color: white; font-size: 1.5rem;">
            <div style="text-align: center;">
                <i class="fas fa-chart-line" style="font-size: 3rem; margin-bottom: 1rem; animation: pulse 2s infinite;"></i>
                <div>Loading Portified...</div>
            </div>
        </div>
    `;
    document.body.appendChild(loadingOverlay);

    setTimeout(() => {
        loadingOverlay.style.opacity = '0';
        loadingOverlay.style.transition = 'opacity 0.5s ease-out';
        setTimeout(() => loadingOverlay.remove(), 500);
    }, 1500);
});
