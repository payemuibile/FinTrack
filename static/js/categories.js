// static/js/categories.js

let allCategories = [];
let activeTab = 'expense';
let deleteCategoryTargetId = null;

document.addEventListener('DOMContentLoaded', async function () {
    requireAuth();
    await loadCategories();
    setupSaveHandler();
    setupDeleteHandler();

    // Reset to "New" mode when modal opened via the top button (not edit)
    document.getElementById('categoryModal').addEventListener('show.bs.modal', function (e) {
        if (!e.relatedTarget) return; // opened programmatically by editCategory(), skip reset
        resetCategoryForm();
    });
});

async function loadCategories() {
    allCategories = await ApiClient.getCategories();
    renderGrid();
}

function switchTab(event, type) {
    event.preventDefault();
    activeTab = type;
    document.querySelectorAll('#categoryTypeTabs .nav-link').forEach(el => el.classList.remove('active'));
    event.target.classList.add('active');
    renderGrid();
}

function renderGrid() {
    const grid = document.getElementById('categoryGrid');
    const filtered = allCategories.filter(c => c.category_type === activeTab);

    if (!filtered.length) {
        grid.innerHTML = `<div class="col-12 text-center text-muted py-4">
            No ${activeTab} categories yet. Click "New Category" to add one.</div>`;
        return;
    }

    grid.innerHTML = filtered.map(c => `
        <div class="col-sm-6 col-lg-4 col-xl-3">
            <div class="card stat-card h-100">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <div class="icon-box" style="background-color:${c.color}22; color:${c.color};">
                            <i class="bi ${c.icon}"></i>
                        </div>
                        <div class="dropdown">
                            <button class="btn btn-sm btn-link text-muted" data-bs-toggle="dropdown">
                                <i class="bi bi-three-dots-vertical"></i>
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end">
                                <li><a class="dropdown-item" href="#" onclick="editCategory(${c.id}); return false;">
                                    <i class="bi bi-pencil me-2"></i>Edit</a></li>
                                ${c.is_default ? '' : `<li><a class="dropdown-item text-danger" href="#" onclick="promptDeleteCategory(${c.id}); return false;">
                                    <i class="bi bi-trash me-2"></i>Delete</a></li>`}
                            </ul>
                        </div>
                    </div>
                    <h6 class="fw-semibold mb-1">${c.name}</h6>
                    <small class="text-muted">${c.transaction_count} transaction${c.transaction_count !== 1 ? 's' : ''}</small>
                    ${c.is_default ? '<span class="badge bg-secondary-subtle text-secondary ms-2">Default</span>' : ''}
                </div>
            </div>
        </div>
    `).join('');
}

function resetCategoryForm() {
    document.getElementById('editCategoryId').value = '';
    document.getElementById('categoryModalTitle').textContent = 'New Category';
    document.getElementById('catName').value = '';
    document.getElementById('catType').value = activeTab;
    document.getElementById('catColor').value = '#0d6efd';
    document.getElementById('catIcon').value = 'bi-tag';
    document.getElementById('categoryFormError').classList.add('d-none');
}

function editCategory(id) {
    resetCategoryForm();
    const c = allCategories.find(cat => cat.id === id);
    if (!c) return;

    document.getElementById('editCategoryId').value = c.id;
    document.getElementById('categoryModalTitle').textContent = 'Edit Category';
    document.getElementById('catName').value = c.name;
    document.getElementById('catType').value = c.category_type;
    document.getElementById('catColor').value = c.color;
    document.getElementById('catIcon').value = c.icon;

    new bootstrap.Modal(document.getElementById('categoryModal')).show();
}

function setupSaveHandler() {
    document.getElementById('saveCategoryBtn').addEventListener('click', async function () {
        const errorBox = document.getElementById('categoryFormError');
        const btn = this;
        const btnText = document.getElementById('saveCategoryBtnText');
        const spinner = document.getElementById('saveCategoryBtnSpinner');

        errorBox.classList.add('d-none');

        const editId = document.getElementById('editCategoryId').value;
        const name = document.getElementById('catName').value.trim();
        const category_type = document.getElementById('catType').value;
        const color = document.getElementById('catColor').value;
        const icon = document.getElementById('catIcon').value;

        if (!name) {
            errorBox.textContent = 'Please enter a category name.';
            errorBox.classList.remove('d-none');
            return;
        }

        btn.disabled = true;
        btnText.textContent = 'Saving...';
        spinner.classList.remove('d-none');

        const payload = { name, category_type, color, icon };

        try {
            const endpoint = editId ? `/categories/${editId}/` : '/categories/';
            const method = editId ? 'PUT' : 'POST';

            const response = await ApiClient.request(endpoint, { method, body: payload });
            const data = await response.json();

            if (!response.ok) {
                const firstKey = Object.keys(data)[0];
                const message = Array.isArray(data[firstKey]) ? data[firstKey][0] : data[firstKey];
                throw new Error(message || 'Could not save category.');
            }

            bootstrap.Modal.getInstance(document.getElementById('categoryModal')).hide();
            await loadCategories();

        } catch (err) {
            errorBox.textContent = err.message;
            errorBox.classList.remove('d-none');
        } finally {
            btn.disabled = false;
            btnText.textContent = 'Save Category';
            spinner.classList.add('d-none');
        }
    });
}

function promptDeleteCategory(id) {
    deleteCategoryTargetId = id;
    new bootstrap.Modal(document.getElementById('deleteCategoryModal')).show();
}

function setupDeleteHandler() {
    document.getElementById('confirmDeleteCategoryBtn').addEventListener('click', async function () {
        if (!deleteCategoryTargetId) return;
        await ApiClient.deleteCategory(deleteCategoryTargetId);
        bootstrap.Modal.getInstance(document.getElementById('deleteCategoryModal')).hide();
        deleteCategoryTargetId = null;
        await loadCategories();
    });
}
