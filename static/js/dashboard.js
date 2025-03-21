// Initialize charts when the document is ready
document.addEventListener('DOMContentLoaded', function() {
    initializeFraudTrendsChart();
    initializePaymentModeChart();
    loadRecentTransactions();
});

function initializeFraudTrendsChart() {
    const ctx = document.getElementById('fraudTrends').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Fraud Cases',
                data: [12, 19, 3, 5, 2, 3],
                borderColor: 'rgb(255, 99, 132)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function initializePaymentModeChart() {
    const ctx = document.getElementById('paymentModeChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Credit Card', 'Debit Card', 'UPI', 'Net Banking', 'Wallet'],
            datasets: [{
                label: 'Fraud Cases by Payment Mode',
                data: [12, 19, 3, 5, 2],
                backgroundColor: [
                    'rgba(255, 99, 132, 0.2)',
                    'rgba(54, 162, 235, 0.2)',
                    'rgba(255, 206, 86, 0.2)',
                    'rgba(75, 192, 192, 0.2)',
                    'rgba(153, 102, 255, 0.2)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

async function loadRecentTransactions() {
    try {
        const response = await fetch('/api/transactions');
        const transactions = await response.json();
        
        const tbody = document.getElementById('transactionsBody');
        tbody.innerHTML = transactions.map(tx => `
            <tr class="${getRiskClass(tx.riskScore)}">
                <td>${tx.id}</td>
                <td>$${tx.amount.toFixed(2)}</td>
                <td>${new Date(tx.date).toLocaleDateString()}</td>
                <td class="status-${tx.status.toLowerCase()}">${tx.status}</td>
                <td>${(tx.riskScore * 100).toFixed(2)}%</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading transactions:', error);
    }
}

// Load transactions every 30 seconds
setInterval(loadRecentTransactions, 30000);

function getRiskClass(score) {
    if (score > 0.7) return 'risk-high';
    if (score > 0.3) return 'risk-medium';
    return 'risk-low';
} 