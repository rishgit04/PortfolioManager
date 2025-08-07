// Screen Management
function showScreen(screenId) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Show the selected screen
    const screen = document.getElementById(screenId);
    if (screen) {
        screen.classList.add('active');
    }
    
    // Update active tab
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.screen === screenId);
    });
    
    // Update charts when switching to performance screen
    if (screenId === 'performance-screen') {
        updatePerformanceCharts();
    }
}

// Initialize screen switching
document.addEventListener('DOMContentLoaded', () => {
    // Tab navigation
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const screenId = `${tab.dataset.screen}-screen`;
            showScreen(screenId);
        });
    });
    
    // Initialize with dashboard screen
    showScreen('dashboard-screen');
});

// Function to update performance charts
function updatePerformanceCharts() {
    // Destroy existing charts if they exist
    const chartElements = [
        'performanceChartFull',
        'allocationChartFull',
        'assetPerformanceChart'
    ];
    
    chartElements.forEach(chartId => {
        const chart = window[chartId];
        if (chart && typeof chart.destroy === 'function') {
            chart.destroy();
        }
    });
    
    // Initialize new charts
    // Note: Replace with your actual chart data and configuration
    const performanceCtx = document.getElementById('performanceChartFull').getContext('2d');
    window.performanceChartFull = new Chart(performanceCtx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Portfolio Value',
                data: [10000, 10500, 11000, 10800, 11500, 12000],
                borderColor: 'rgba(99, 102, 241, 1)',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: false
                }
            }
        }
    });
    
    const allocationCtx = document.getElementById('allocationChartFull').getContext('2d');
    window.allocationChartFull = new Chart(allocationCtx, {
        type: 'doughnut',
        data: {
            labels: ['Stocks', 'Bonds', 'Cash'],
            datasets: [{
                data: [60, 30, 10],
                backgroundColor: [
                    'rgba(99, 102, 241, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(209, 213, 219, 0.8)'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                }
            },
            cutout: '70%'
        }
    });
    
    const assetPerformanceCtx = document.getElementById('assetPerformanceChart').getContext('2d');
    window.assetPerformanceChart = new Chart(assetPerformanceCtx, {
        type: 'bar',
        data: {
            labels: ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA'],
            datasets: [{
                label: 'Return %',
                data: [12, 19, 3, 5, 2],
                backgroundColor: 'rgba(99, 102, 241, 0.8)',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Export functions for use in other files
window.ScreenManager = {
    showScreen,
    updatePerformanceCharts
};
