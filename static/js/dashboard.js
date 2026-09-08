// static/js/dashboard.js
// This REPLACES your existing dashboard.js — adds the Add Transaction
// modal wiring (category dropdown population, save handler, validation).

document.addEventListener('DOMContentLoaded', async function () {
    requireAuth(); // Redirect to login if not authenticated

    await Promise.all([
        loadSummaryCards(),
        loadSpendingChart(),
        loadTrendChart(),
        loadRecentTransactions(),
        loadBudgetProgress(),
        populateCategoryDropdown()
    ]);

    setupAddTransactionForm();
});

async function loadSummaryCards() {
    try {
        const summary = await ApiClient.getSummary();

        document.getElementById('totalIncome').textContent = formatCurrency(summary.total_income);
        document.getElementById('totalExpenses').textContent = formatCurrency(summary.total_expenses);
        document.getElementById('balance').textContent = formatCurrency(summary.balance);
        document.getElementById('transactionCount').textContent = summary.transaction_count;

        const balanceEl = document.getElementById('balance');
        balanceEl.classList.toggle('text-success', summary.balance >= 0);
        balanceEl.classList.toggle('text-danger', summary.balance < 0);
    } catch (error) {
        alert(error.message);
        console.error('Failed to load summary:', error);
    }
}

async function loadSpendingChart() {
    try {
        const today = new Date();
        const data = await ApiClient.getByCategory(today.getFullYear(), today.getMonth() + 1);
        const container = document.getElementById('spendingChartContainer');

        if (!data.length) {
            container.innerHTML = '<p class="text-muted text-center py-4">No expense data this month.</p>';
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
                    legend: {position: 'bottom', labels: {padding: 20, usePointStyle: true}},
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
    } catch (error) {
        console.error('Failed to load spending chart:', error);
    }
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
            plugins: {legend: {position: 'top'}},
            scales: {y: {beginAtZero: true, ticks: {callback: (v) => '$' + v.toLocaleString()}}}
        }
    });
}

async function loadRecentTransactions() {
    const container = document.getElementById('recentTransactionsList');
    if (!container) return; // safe no-op if you haven't added this section yet

    const data = await ApiClient.getTransactions({ordering: '-date', page_size: 5});
    const transactions = data.results || data;

    if (!transactions.length) {
        container.innerHTML = '<p class="text-muted text-center py-3">No transactions yet. Add your first one above.</p>';
        return;
    }

    container.innerHTML = transactions.map(t => `
    <div class="d-flex justify-content-between align-items-center transaction-item ${t.transaction_type} p-2 mb-1 rounded">
        <div class="d-flex align-items-center">
            <span class="badge rounded-pill me-2" style="background-color:${t.category_color || '#6c757d'}">&nbsp;</span>
            <div>
                <div class="fw-medium">${t.description || t.category_name || 'Transaction'}</div>
                <small class="text-muted">${t.category_name || 'Uncategorized'} · ${t.date}</small>
            </div>
        </div>
        <span class="fw-semibold ${t.transaction_type === 'income' ? 'text-success' : 'text-danger'}">
            ${t.transaction_type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}
        </span>
    </div>
`).join('');
}

async function loadBudgetProgress() {
    const budgets = await ApiClient.getCurrentBudgets();
    const container = document.getElementById('budgetList');
    if (!container) return;

    if (!budgets.length) {
        container.innerHTML = '<p class="text-muted">No budgets set for this month. <a href="/budgets/">Create one</a>.</p>';
        return;
    }

    container.innerHTML = budgets.map(budget => {
        const pct = Math.min(budget.percentage_used, 100);
        const barClass = budget.percentage_used >= 100 ? 'danger' : budget.percentage_used >= 80 ? 'warning' : '';
        const progressColor = budget.percentage_used >= 100 ? 'bg-danger' : budget.percentage_used >= 80 ? 'bg-warning' : 'bg-success';

        return `
    <div class="mb-3">
        <div class="d-flex justify-content-between mb-1">
            <span class="fw-medium">
                <span class="badge rounded-pill me-1" style="background-color:${budget.category_color}">&nbsp;</span>
                ${budget.category_name}
            </span>
            <small class="text-muted">${formatCurrency(budget.spent)} / ${formatCurrency(budget.amount)}</small>
        </div>
        <div class="progress budget-progress ${barClass}" style="height:8px">
            <div class="progress-bar ${progressColor}" style="width:${pct}%" role="progressbar"
                 aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"></div>
        </div>
        <small class="text-muted">${budget.percentage_used}% used</small>
    </div>`;
    }).join('');
}

// ===== ADD TRANSACTION MODAL =====

async function populateCategoryDropdown() {
    const select = document.getElementById('category');
    if (!select) return;

    const categories = await ApiClient.getCategories();

    window._categoriesCache = categories; // used to filter by type below

    renderCategoryOptions('expense');

    // Re-filter category options whenever the type toggle changes
    document.querySelectorAll('input[name="transType"]').forEach(radio => {
        radio.addEventListener('change', (e) => renderCategoryOptions(e.target.value));
    });
}

function renderCategoryOptions(type) {
    const select = document.getElementById('category');
    const categories = (window._categoriesCache || []).filter(c => c.category_type === type);

    select.innerHTML = '<option value="">Select category...</option>' +
        categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

function setupAddTransactionForm() {
    const saveBtn = document.getElementById('saveTransaction');
    if (!saveBtn) return;

    // Default the date field to today
    const dateInput = document.getElementById('transDate');
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

    saveBtn.addEventListener('click', async function () {
        const errorBox = document.getElementById('formError');
        const btnText = document.getElementById('saveBtnText');
        const spinner = document.getElementById('saveBtnSpinner');

        errorBox.classList.add('d-none');

        const amount = document.getElementById('amount').value;
        const category = document.getElementById('category').value;
        const description = document.getElementById('description').value.trim();
        const date = document.getElementById('transDate').value;
        const transaction_type = document.querySelector('input[name="transType"]:checked').value;

        // Client-side validation before hitting the API
        if (!amount || parseFloat(amount) <= 0) {
            showFormError('Please enter a valid amount greater than zero.');
            return;
        }
        if (!category) {
            showFormError('Please select a category.');
            return;
        }
        if (!date) {
            showFormError('Please select a date.');
            return;
        }

        saveBtn.disabled = true;
        btnText.textContent = 'Saving...';
        spinner.classList.remove('d-none');

        try {
            const response = await ApiClient.request('/transactions/', {
                method: 'POST',
                body: {amount, category, description, date, transaction_type}
            });
            const data = await response.json();

            if (!response.ok) {
                // Surface DRF validation errors, e.g. { amount: [...], non_field_errors: [...] }
                const firstKey = Object.keys(data)[0];
                const message = Array.isArray(data[firstKey]) ? data[firstKey][0] : data[firstKey];
                throw new Error(message || 'Could not save transaction.');
            }

            // Close modal and reset form
            const modalEl = document.getElementById('addTransactionModal');
            bootstrap.Modal.getInstance(modalEl).hide();
            document.getElementById('amount').value = '';
            document.getElementById('description').value = '';
            document.getElementById('category').value = '';

            // Refresh dashboard data so the new transaction shows everywhere immediately
            await Promise.all([
                loadSummaryCards(),
                loadSpendingChart(),
                loadTrendChart(),
                loadRecentTransactions(),
                loadBudgetProgress()
            ]);

        } catch (err) {
            showFormError(err.message);
        } finally {
            saveBtn.disabled = false;
            btnText.textContent = 'Save Transaction';
            spinner.classList.add('d-none');
        }
    });

    function showFormError(message) {
        errorBox().textContent = message;
        errorBox().classList.remove('d-none');
    }

    function errorBox() {
        return document.getElementById('formError');
    }
}

    function formatCurrency(amount) {
        return new Intl.NumberFormat('en-NG', {style: 'currency', currency: 'NGN'}).format(amount);
    }

