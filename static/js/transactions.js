// static/js/transactions.js

let currentPage = 1;
let currentFilters = {};
let deleteTargetId = null;

document.addEventListener('DOMContentLoaded', async function () {
    requireAuth();

    await populateCategoryFilterAndForm();
    await loadTransactionsTable();

    setupFilterListeners();
    setupSaveHandler();
    setupDeleteHandler();

    // Default the date field to today for new transactions
    document.getElementById('transDate').value = new Date().toISOString().split('T')[0];

    // Reset modal to "Add" mode whenever it's opened fresh (not via edit button)
    document.getElementById('addTransactionModal').addEventListener('show.bs.modal', function (e) {
        if (!e.relatedTarget) return; // opened programmatically by editTransaction(), skip reset
        resetTransactionForm();
    });
});

// ===== LOAD + RENDER TABLE =====

async function loadTransactionsTable() {
    const tbody = document.getElementById('transactionsTableBody');
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4">
        <div class="spinner-border spinner-border-sm text-primary"></div></td></tr>`;

    const params = { ...currentFilters, page: currentPage };
    const data = await ApiClient.getTransactions(params);

    const results = data.results || data; // handles paginated or non-paginated responses
    const count = data.count !== undefined ? data.count : results.length;

    if (!results.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">
            No transactions found. Try adjusting your filters or add a new one.</td></tr>`;
        document.getElementById('resultsCount').textContent = '0 results';
        document.getElementById('pagination').innerHTML = '';
        return;
    }

    tbody.innerHTML = results.map(t => `
        <tr>
            <td>${formatDate(t.date)}</td>
            <td>${t.description || '<span class="text-muted">—</span>'}</td>
            <td>
                <span class="badge rounded-pill" style="background-color:${t.category_color || '#6c757d'}">
                    ${t.category_name || 'Uncategorized'}
                </span>
            </td>
            <td>
                <span class="badge ${t.transaction_type === 'income' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}">
                    ${t.transaction_type}
                </span>
            </td>
            <td class="text-end fw-semibold ${t.transaction_type === 'income' ? 'text-success' : 'text-danger'}">
                ${t.transaction_type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}
            </td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-secondary me-1" onclick="editTransaction(${t.id})" title="Edit">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="promptDelete(${t.id})" title="Delete">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');

    document.getElementById('resultsCount').textContent = `${count} result${count !== 1 ? 's' : ''}`;
    renderPagination(count, data);
}

function renderPagination(count, data) {
    const pageSize = 20; // matches PAGE_SIZE in DRF settings
    const totalPages = Math.ceil(count / pageSize);
    const pagination = document.getElementById('pagination');

    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    let html = '';
    for (let i = 1; i <= totalPages; i++) {
        html += `<li class="page-item ${i === currentPage ? 'active' : ''}">
            <a class="page-link" href="#" onclick="goToPage(${i}); return false;">${i}</a>
        </li>`;
    }
    pagination.innerHTML = html;
}

function goToPage(page) {
    currentPage = page;
    loadTransactionsTable();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== FILTERS =====

function setupFilterListeners() {
    const debouncedSearch = debounce(applyFilters, 400);

    document.getElementById('filterType').addEventListener('change', applyFilters);
    document.getElementById('filterCategory').addEventListener('change', applyFilters);
    document.getElementById('filterDateAfter').addEventListener('change', applyFilters);
    document.getElementById('filterDateBefore').addEventListener('change', applyFilters);
    document.getElementById('filterSearch').addEventListener('input', debouncedSearch);

    document.getElementById('clearFiltersBtn').addEventListener('click', () => {
        document.getElementById('filterType').value = '';
        document.getElementById('filterCategory').value = '';
        document.getElementById('filterDateAfter').value = '';
        document.getElementById('filterDateBefore').value = '';
        document.getElementById('filterSearch').value = '';
        applyFilters();
    });

    document.getElementById('exportBtn').addEventListener('click', () => {
        ApiClient.downloadCsv(currentFilters);
    });
}

function applyFilters() {
    currentFilters = {};
    const type = document.getElementById('filterType').value;
    const category = document.getElementById('filterCategory').value;
    const dateAfter = document.getElementById('filterDateAfter').value;
    const dateBefore = document.getElementById('filterDateBefore').value;
    const search = document.getElementById('filterSearch').value.trim();

    if (type) currentFilters.transaction_type = type;
    if (category) currentFilters.category = category;
    if (dateAfter) currentFilters.date_after = dateAfter;
    if (dateBefore) currentFilters.date_before = dateBefore;
    if (search) currentFilters.search = search;

    currentPage = 1;
    loadTransactionsTable();
}

// ===== CATEGORY DROPDOWNS =====

async function populateCategoryFilterAndForm() {
    const categories = await ApiClient.getCategories();
    window._categoriesCache = categories;

    const filterSelect = document.getElementById('filterCategory');
    filterSelect.innerHTML = '<option value="">All Categories</option>' +
        categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

    renderCategoryOptionsForType('expense');
    document.querySelectorAll('input[name="transType"]').forEach(radio => {
        radio.addEventListener('change', (e) => renderCategoryOptionsForType(e.target.value));
    });
}

function renderCategoryOptionsForType(type) {
    const select = document.getElementById('category');
    const categories = (window._categoriesCache || []).filter(c => c.category_type === type);
    select.innerHTML = '<option value="">Select category...</option>' +
        categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

// ===== ADD / EDIT =====

function resetTransactionForm() {
    document.getElementById('editTransactionId').value = '';
    document.getElementById('transactionModalTitle').textContent = 'Add Transaction';
    document.getElementById('amount').value = '';
    document.getElementById('description').value = '';
    document.getElementById('notes').value = '';
    document.getElementById('category').value = '';
    document.getElementById('transDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('typeExpense').checked = true;
    renderCategoryOptionsForType('expense');
    document.getElementById('formError').classList.add('d-none');
}

async function editTransaction(id) {
    resetTransactionForm();
    const t = await ApiClient.getTransaction(id);

    document.getElementById('editTransactionId').value = t.id;
    document.getElementById('transactionModalTitle').textContent = 'Edit Transaction';
    document.getElementById('amount').value = t.amount;
    document.getElementById('description').value = t.description || '';
    document.getElementById('notes').value = t.notes || '';
    document.getElementById('transDate').value = t.date;

    if (t.transaction_type === 'income') {
        document.getElementById('typeIncome').checked = true;
    } else {
        document.getElementById('typeExpense').checked = true;
    }
    renderCategoryOptionsForType(t.transaction_type);
    document.getElementById('category').value = t.category || '';

    const modal = new bootstrap.Modal(document.getElementById('addTransactionModal'));
    modal.show();
}

function setupSaveHandler() {
    document.getElementById('saveTransaction').addEventListener('click', async function () {
        const errorBox = document.getElementById('formError');
        const btn = this;
        const btnText = document.getElementById('saveBtnText');
        const spinner = document.getElementById('saveBtnSpinner');

        errorBox.classList.add('d-none');

        const editId = document.getElementById('editTransactionId').value;
        const amount = document.getElementById('amount').value;
        const category = document.getElementById('category').value;
        const description = document.getElementById('description').value.trim();
        const notes = document.getElementById('notes').value.trim();
        const date = document.getElementById('transDate').value;
        const transaction_type = document.querySelector('input[name="transType"]:checked').value;

        if (!amount || parseFloat(amount) <= 0) {
            errorBox.textContent = 'Please enter a valid amount greater than zero.';
            errorBox.classList.remove('d-none');
            return;
        }
        if (!category) {
            errorBox.textContent = 'Please select a category.';
            errorBox.classList.remove('d-none');
            return;
        }

        btn.disabled = true;
        btnText.textContent = 'Saving...';
        spinner.classList.remove('d-none');

        const payload = { amount, category, description, notes, date, transaction_type };

        try {
            const endpoint = editId ? `/transactions/${editId}/` : '/transactions/';
            const method = editId ? 'PUT' : 'POST';

            const response = await ApiClient.request(endpoint, { method, body: payload });
            const data = await response.json();

            if (!response.ok) {
                const firstKey = Object.keys(data)[0];
                const message = Array.isArray(data[firstKey]) ? data[firstKey][0] : data[firstKey];
                throw new Error(message || 'Could not save transaction.');
            }

            bootstrap.Modal.getInstance(document.getElementById('addTransactionModal')).hide();
            await loadTransactionsTable();

        } catch (err) {
            errorBox.textContent = err.message;
            errorBox.classList.remove('d-none');
        } finally {
            btn.disabled = false;
            btnText.textContent = 'Save Transaction';
            spinner.classList.add('d-none');
        }
    });
}

// ===== DELETE =====

function promptDelete(id) {
    deleteTargetId = id;
    new bootstrap.Modal(document.getElementById('deleteConfirmModal')).show();
}

function setupDeleteHandler() {
    document.getElementById('confirmDeleteBtn').addEventListener('click', async function () {
        if (!deleteTargetId) return;
        await ApiClient.deleteTransaction(deleteTargetId);
        bootstrap.Modal.getInstance(document.getElementById('deleteConfirmModal')).hide();
        deleteTargetId = null;
        await loadTransactionsTable();
    });
}

// ===== HELPERS =====

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatDate(dateStr) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
    });
}

function debounce(fn, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}
