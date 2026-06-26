// static/js/dashboard.js

document.addEventListener('DOMContentLoaded', async function() {
    requireAuth(); // Redirect to login if not authenticated

    await Promise.all([
        loadSummaryCards(),
        loadSpendingChart(),
        loadTrendChart(),
        loadRecentTransactions(),
        loadBudgetProgress()
    ]);
});

async function loadSummaryCards() {
    try {
        const summary = await ApiClient.getSummary();

        document.getElementById('totalIncome').textContent =
            formatCurrency(summary.total_income);
        document.getElementById('totalExpenses').textContent =
            formatCurrency(summary.total_expenses);
        document.getElementById('balance').textContent =
            formatCurrency(summary.balance);
        document.getElementById('transactionCount').textContent =
            summary.transaction_count;

        // Color balance positive/negative
        const balanceEl = document.getElementById('balance');
        balanceEl.classList.toggle('text-success', summary.balance >= 0);
        balanceEl.classList.toggle('text-danger', summary.balance < 0);

    } catch (error) {
        console.error('Failed to load summary:', error);
    }
}

async function loadSpendingChart() {
    const today = new Date();
    const data = await ApiClient.getByCategory(today.getFullYear(), today.getMonth() + 1);

    if (data.length === 0) {
        document.getElementById('spendingChartContainer').innerHTML =
            '<p class="text-muted text-center py-4">No expense data this month.</p>';
        return;
    }

    const ctx = document.getElementById('spendingChart').getContext('2d');

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.map(d => d.category__name),
            datasets: [{
                data: data.map(d => d.total),
                backgroundColor: data.map(d => d.category__color),
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 20, usePointStyle: true }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = ((context.parsed / total) * 100).toFixed(1);
                            return ` ${context.label}: ${formatCurrency(context.parsed)} (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
}

async function loadTrendChart() {
    const data = await ApiClient.getMonthlyTrend();

    const ctx = document.getElementById('trendChart').getContext('2d');

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.month),
            datasets: [
                {
                    label: 'Income',
                    data: data.map(d => d.income),
                    backgroundColor: 'rgba(25, 135, 84, 0.8)',
                    borderRadius: 6
                },
                {
                    label: 'Expenses',
                    data: data.map(d => d.expenses),
                    backgroundColor: 'rgba(220, 53, 69, 0.8)',
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'top' } },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => '$' + value.toLocaleString()
                    }
                }
            }
        }
    });
}

async function loadBudgetProgress() {
    const budgets = await ApiClient.getCurrentBudgets();
    const container = document.getElementById('budgetList');

    if (budgets.length === 0) {
        container.innerHTML = '<p class="text-muted">No budgets set for this month.</p>';
        return;
    }

    container.innerHTML = budgets.map(budget => {
        const pct = Math.min(budget.percentage_used, 100);
        const barClass = budget.percentage_used >= 100 ? 'danger' :
                         budget.percentage_used >= 80 ? 'warning' : '';
        const progressColor = budget.percentage_used >= 100 ? 'bg-danger' :
                              budget.percentage_used >= 80 ? 'bg-warning' : 'bg-success';

        return `
        <div class="mb-3">
            <div class="d-flex justify-content-between mb-1">
                <span class="fw-medium">
                    <span class="badge rounded-pill me-1" style="background-color:${budget.category_color}">
                        &nbsp;
                    </span>
                    ${budget.category_name}
                </span>
                <small class="text-muted">
                    ${formatCurrency(budget.spent)} / ${formatCurrency(budget.amount)}
                </small>
            </div>
            <div class="progress budget-progress ${barClass}" style="height:8px">
                <div class="progress-bar ${progressColor}"
                     style="width:${pct}%"
                     role="progressbar"
                     aria-valuenow="${pct}"
                     aria-valuemin="0" aria-valuemax="100">
                </div>
            </div>
            <small class="text-muted">${budget.percentage_used}% used</small>
        </div>`;
    }).join('');
}

// Helper function
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}