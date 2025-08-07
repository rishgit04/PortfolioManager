// Helper function to show notifications
function showNotification(message, type = 'info') {
    // Remove any existing notifications
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Add to DOM
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Remove notification after delay
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 5000);
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded and parsed');
    
    // Set max date to today for transaction date
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('transactionDate');
    if (dateInput) {
        dateInput.value = today;
        dateInput.max = today;
        console.log('Date input initialized');
    } else {
        console.error('Could not find transactionDate element');
    }

    // Auto-format ticker to uppercase
    const tickerInput = document.getElementById('ticker');
    if (tickerInput) {
        tickerInput.addEventListener('input', function(e) {
            e.target.value = e.target.value.toUpperCase();
        });
        console.log('Ticker input initialized');
    } else {
        console.error('Could not find ticker input element');
    }

    // Form submission handler
    const form = document.getElementById('addAssetForm');
    if (form) {
        console.log('Form element found, adding submit event listener');
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('Form submission started');
            
            try {
                // Get form data
                const formData = {
                    type: document.getElementById('assetType').value,
                    ticker: document.getElementById('ticker').value.trim(),
                    quantity: parseFloat(document.getElementById('quantity').value),
                    price: parseFloat(document.getElementById('price').value),
                    date: document.getElementById('transactionDate').value
                };

                console.log('Form data collected:', formData);

                // Validate form
                if (!formData.type) {
                    throw new Error('Please select an asset type');
                }
                if (!formData.ticker) {
                    throw new Error('Please enter a ticker symbol');
                }
                if (isNaN(formData.quantity) || formData.quantity <= 0) {
                    throw new Error('Please enter a valid quantity (must be greater than 0)');
                }
                if (isNaN(formData.price) || formData.price <= 0) {
                    throw new Error('Please enter a valid price (must be greater than 0)');
                }
                if (!formData.date) {
                    throw new Error('Please select a transaction date');
                }

                // Here you would typically send the data to your backend
                console.log('Form data validated, ready to submit:', formData);
                
                // Simulate API call (replace with actual API call)
                const response = await simulateApiCall(formData);
                
                if (response.success) {
                    // Show success message
                    showNotification('Asset added successfully!', 'success');
                    
                    // Reset form
                    form.reset();
                    if (dateInput) {
                        dateInput.value = today; // Reset date to today
                    }
                    
                    console.log('Form submitted successfully');
                    
                    // Optional: Refresh the portfolio data
                    if (window.refreshPortfolioData) {
                        window.refreshPortfolioData();
                    }
                } else {
                    throw new Error(response.message || 'Failed to add asset');
                }
            } catch (error) {
                console.error('Form submission error:', error);
                showNotification(error.message || 'An error occurred while adding the asset', 'error');
            }
        });
    } else {
        console.error('Could not find addAssetForm element');
    }
    
    // Simulate API call (replace with actual API call)
    async function simulateApiCall(formData) {
        return new Promise((resolve) => {
            // Simulate network delay
            setTimeout(() => {
                console.log('Simulating API call with data:', formData);
                // In a real app, you would make an actual API call here
                // For example:
                // return fetch('/api/assets', {
                //     method: 'POST',
                //     headers: { 'Content-Type': 'application/json' },
                //     body: JSON.stringify(formData)
                // });
                
                // For now, just return a success response
                resolve({
                    success: true,
                    message: 'Asset added successfully'
                });
            }, 500);
        });
    }

    // Show notification function
    function showNotification(message, type = 'info') {
        // Remove any existing notifications
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Add to DOM
        document.body.appendChild(notification);
        
        // Show notification
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Remove notification after delay
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 5000);
    }
});
