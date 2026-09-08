// static/js/budgets.js

const MONTH_NAMES = ['January','February','March','April','May','June',
                      'July','August','September','October','November','December'];

let selectedMonth = new Date().getMonth() + 1;
let selectedYear = new Date().getFullYear();
let currentBudgets = [];
let expenseCategories = [];
let deleteBudgetTargetId = null;

document.addEventListener('DOMContentLoaded', async function () {
    requireAuth();

    setupMonthYearSelectors();
    await loadExpenseCategories();
    await loadBudgets();

    setupSaveHandler();
    setupDeleteHandler();

    document.getElementById('budgetModal').addEventListener('show.bs.modal', function (e) {
        if (!e.relatedTarget) return; // skip reset when opened programmatically for editing
        resetBudgetForm();
    });
});

function setupMonthYearSelectors() {
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    const formMonth = document.getElementById('budgetMonth');
    const formYear = document.getElementById('budgetYear');

    monthSelect.innerHTML = MONTH_NAMES.map((m, i) =>
        `<option value="${i + 1}" ${i + 1 === selectedMonth ? 'selected' : ''}>${m}</option>`).join('');
    formMonth.innerHTML = monthSelect.innerHTML;

    const currentYear = new Date().getFullYear();
    const years = [currentYear - 1, currentYear, currentYear + 1];
    const yearOptions = years.map(y => `<option value="${y}" ${y === selectedYear ? 'selected' : ''}>${y}</option>`).join('');
    yearSelect.innerHTML = yearOptions;
    formYear.innerHTML = yearOptions;

    monthSelect.addEventListener('change', () => { selectedMonth = parseInt(monthSelect.value); loadBudgets(); });
    yearSelect.addEventListener('change', () => { selectedYear = parseInt(yearSelect.value); loadBudgets(); });
}

async function loadExpenseCategories() {
    const categories = await ApiClient.getCategories();
    expenseCategories = categories.filter(c => c.category_type === 'expense');

    const select = document.getElementById('budgetCategory');
    select.innerHTML = expenseCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

async function loadBudgets() {
    const grid = document.getElementById('budgetGrid');
    grid.innerHTML = `<div class="col-12 text-center py-4"><div class="spinner-border spinner-border-sm text-primary"></div></div>`;

    currentBudgets = await ApiClient.getBudgets({ month: selectedMonth, year: selectedYear });

    renderSummary();
    renderGrid();
}

function renderSummary() {
    const totalBudgeted = currentBudgets.reduce((sum, b) => sum + parseFloat(b.amount), 0);
    const totalSpent = currentBudgets.reduce((sum, b) => sum + b.spent, 0);
    const totalRemaining = totalBudgeted - totalSpent;

    document.getElementById('totalBudgeted').textContent = formatCurrency(totalBudgeted);
    document.getElementById('totalSpent').textContent = formatCurrency(totalSpent);

    const remainingEl = document.getElementById('totalRemaining');
    remainingEl.textContent = formatCurrency(totalRemaining);
    remainingEl.classList.toggle('text-danger', totalRemaining < 0);
    remainingEl.classList.toggle('text-success', totalRemaining >= 0);
}

function renderGrid() {
    const grid = document.getElementById('budgetGrid');

    if (!currentBudgets.length) {
        grid.innerHTML = `<div class="col-12 text-center text-muted py-4">
            No budgets set for ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}.
            Click "New Budget" to set one.</div>`;
        return;
    }

    grid.innerHTML = currentBudgets.map(b => {
        const pct = Math.min(b.percentage_used, 100);
        const isOver = b.percentage_used >= 100;
        const isWarning = b.percentage_used >= 80 && !isOver;
        const progressColor = isOver ? 'bg-danger' : isWarning ? 'bg-warning' : 'bg-success';

        return `
        <div class="col-sm-6 col-lg-4">
            <div class="card stat-card h-100">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <div class="d-flex align-items-center">
                            <span class="badge rounded-pill me-2" style="background-color:${b.category_color}">&nbsp;</span>
                            <h6 class="fw-semibold mb-0">${b.category_name}</h6>
                        </div>
                        <div class="dropdown">
                            <button class="btn btn-sm btn-link text-muted" data-bs-toggle="dropdown">
                                <i class="bi bi-three-dots-vertical"></i>
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end">
                                <li><a class="dropdown-item" href="#" onclick="editBudget(${b.id}); return false;">
                                    <i class="bi bi-pencil me-2"></i>Edit</a></li>
                                <li><a class="dropdown-item text-danger" href="#" onclick="promptDeleteBudget(${b.id}); return false;">
                                    <i class="bi bi-trash me-2"></i>Delete</a></li>
                            </ul>
                        </div>
                    </div>

                    <div class="d-flex justify-content-between mb-1">
                        <small class="text-muted">${formatCurrency(b.spent)} of ${formatCurrency(b.amount)}</small>
                        <small class="fw-medium ${isOver ? 'text-danger' : ''}">${b.percentage_used}%</small>
                    </div>
                    <div class="progress budget-progress" style="height:8px">
                        <div class="progress-bar ${progressColor}" style="width:${pct}%"></div>
                    </div>
                    ${isOver ? `<small class="text-danger d-block mt-2"><i class="bi bi-exclamation-triangle me-1"></i>Over budget by ${formatCurrency(Math.abs(b.remaining))}</small>` : ''}
                    ${isWarning ? `<small class="text-warning d-block mt-2"><i class="bi bi-exclamation-circle me-1"></i>Approaching limit</small>` : ''}
                </div>
            </div>
        </div>`;
    }).join('');
}

function resetBudgetForm() {
    document.getElementById('editBudgetId').value = '';
    document.getElementById('budgetModalTitle').textContent = 'New Budget';
    document.getElementById('budgetAmount').value = '';
    document.getElementById('budgetCategory').value = expenseCategories[0]?.id || '';
    document.getElementById('budgetMonth').value = selectedMonth;
    document.getElementById('budgetYear').value = selectedYear;
    document.getElementById('budgetFormError').classList.add('d-none');
}

function editBudget(id) {
    resetBudgetForm();
    const b = currentBudgets.find(bud => bud.id === id);
    if (!b) return;

    document.getElementById('editBudgetId').value = b.id;
    document.getElementById('budgetModalTitle').textContent = 'Edit Budget';
    document.getElementById('budgetAmount').value = b.amount;
    document.getElementById('budgetCategory').value = b.category;
    document.getElementById('budgetMonth').value = b.month;
    document.getElementById('budgetYear').value = b.year;

    new bootstrap.Modal(document.getElementById('budgetModal')).show();
}

function setupSaveHandler() {
    document.getElementById('saveBudgetBtn').addEventListener('click', async function () {
        const errorBox = document.getElementById('budgetFormError');
        const btn = this;
        const btnText = document.getElementById('saveBudgetBtnText');
        const spinner = document.getElementById('saveBudgetBtnSpinner');

        errorBox.classList.add('d-none');

        const editId = document.getElementById('editBudgetId').value;
        const category = document.getElementById('budgetCategory').value;
        const amount = document.getElementById('budgetAmount').value;
        const month = document.getElementById('budgetMonth').value;
        const year = document.getElementById('budgetYear').value;

        if (!category) {
            errorBox.textContent = 'Please select a category.';
            errorBox.classList.remove('d-none');
            return;
        }
        if (!amount || parseFloat(amount) <= 0) {
            errorBox.textContent = 'Please enter a valid budget amount.';
            errorBox.classList.remove('d-none');
            return;
        }

        btn.disabled = true;
        btnText.textContent = 'Saving...';
        spinner.classList.remove('d-none');

        const payload = { category, amount, month, year };

        try {
            const endpoint = editId ? `/budgets/${editId}/` : '/budgets/';
            const method = editId ? 'PUT' : 'POST';

            const response = await ApiClient.request(endpoint, { method, body: payload });
            const data = await response.json();

            if (!response.ok) {
                // Most likely error: unique_together violation (budget already exists for this category/month)
                const firstKey = Object.keys(data)[0];
                const message = Array.isArray(data[firstKey]) ? data[firstKey][0] : data[firstKey];
                throw new Error(message || 'A budget for this category and month may already exist.');
            }

            bootstrap.Modal.getInstance(document.getElementById('budgetModal')).hide();

            // If we just saved a budget for the currently-viewed month, refresh; otherwise just close
            if (parseInt(month) === selectedMonth && parseInt(year) === selectedYear) {
                await loadBudgets();
            }

        } catch (err) {
            errorBox.textContent = err.message;
            errorBox.classList.remove('d-none');
        } finally {
            btn.disabled = false;
            btnText.textContent = 'Save Budget';
            spinner.classList.add('d-none');
        }
    });
}

function promptDeleteBudget(id) {
    deleteBudgetTargetId = id;
    new bootstrap.Modal(document.getElementById('deleteBudgetModal')).show();
}

function setupDeleteHandler() {
    document.getElementById('confirmDeleteBudgetBtn').addEventListener('click', async function () {
        if (!deleteBudgetTargetId) return;
        await ApiClient.deleteBudget(deleteBudgetTargetId);
        bootstrap.Modal.getInstance(document.getElementById('deleteBudgetModal')).hide();
        deleteBudgetTargetId = null;
        await loadBudgets();
    });
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
}
