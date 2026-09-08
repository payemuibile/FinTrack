// static/js/profile.js

document.addEventListener('DOMContentLoaded', async function () {
    requireAuth();
    await loadProfile();
    await loadAccountStats();
    setupSaveHandler();
});

async function loadProfile() {
    const profile = await ApiClient.getProfile();

    document.getElementById('profUsername').value = profile.username || '';
    document.getElementById('profEmail').value = profile.email || '';
    document.getElementById('profFirstName').value = profile.first_name || '';
    document.getElementById('profLastName').value = profile.last_name || '';
    document.getElementById('profCurrency').value = profile.currency || 'JPG';
}

async function loadAccountStats() {
    const container = document.getElementById('accountStats');
    try {
        const [summary, categories, transactions] = await Promise.all([
            ApiClient.getSummary(),
            ApiClient.getCategories(),
            ApiClient.getTransactions({ page_size: 1 }) // just need the count
        ]);

        const totalTransactions = transactions.count !== undefined ? transactions.count : 'N/A';

        container.innerHTML = `
            <div class="d-flex justify-content-between py-2 border-bottom">
                <span class="text-muted">Total Transactions</span>
                <span class="fw-medium">${totalTransactions}</span>
            </div>
            <div class="d-flex justify-content-between py-2 border-bottom">
                <span class="text-muted">Categories Created</span>
                <span class="fw-medium">${categories.length}</span>
            </div>
            <div class="d-flex justify-content-between py-2 border-bottom">
                <span class="text-muted">This Month's Balance</span>
                <span class="fw-medium ${summary.balance >= 0 ? 'text-success' : 'text-danger'}">
                    ${formatCurrency(summary.balance)}
                </span>
            </div>
            <div class="d-flex justify-content-between py-2">
                <span class="text-muted">This Month's Transactions</span>
                <span class="fw-medium">${summary.transaction_count}</span>
            </div>
        `;
    } catch (err) {
        container.innerHTML = '<p class="text-muted">Could not load account stats.</p>';
    }
}

function setupSaveHandler() {
    document.getElementById('saveProfileBtn').addEventListener('click', async function () {
        const errorBox = document.getElementById('profileError');
        const successBox = document.getElementById('profileSuccess');
        const btn = this;
        const btnText = document.getElementById('saveProfileBtnText');
        const spinner = document.getElementById('saveProfileBtnSpinner');

        errorBox.classList.add('d-none');
        successBox.classList.add('d-none');

        btn.disabled = true;
        btnText.textContent = 'Saving...';
        spinner.classList.remove('d-none');

        const currency = document.getElementById('profCurrency').value;

        try {
            const response = await ApiClient.request('/auth/profile/', {
                method: 'PATCH',
                body: { currency }
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error('Could not save profile changes.');
            }

            successBox.textContent = 'Profile updated successfully.';
            successBox.classList.remove('d-none');

        } catch (err) {
            errorBox.textContent = err.message;
            errorBox.classList.remove('d-none');
        } finally {
            btn.disabled = false;
            btnText.textContent = 'Save Changes';
            spinner.classList.add('d-none');
        }
    });
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
}