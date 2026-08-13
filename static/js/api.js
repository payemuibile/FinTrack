// static/js/api.js
// Central place for all API calls.
// This REPLACES your existing api.js — it includes everything from the
// original guide plus categories CRUD, budgets CRUD, profile, and CSV export.

const API_BASE = '/api';

const ApiClient = {
    /**
     * Makes an authenticated request to the Django API.
     * Automatically adds the JWT token to the Authorization header.
     */
    async request(endpoint, options = {}) {
        const token = Auth.getAccessToken();

        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                ...options.headers
            },
            ...options
        };

        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        const response = await fetch(`${API_BASE}${endpoint}`, config);

        // If token expired, try to refresh
        if (response.status === 401) {
            const refreshed = await this.refreshToken();
            if (refreshed) {
                config.headers['Authorization'] = `Bearer ${Auth.getAccessToken()}`;
                return fetch(`${API_BASE}${endpoint}`, config);
            } else {
                Auth.logout();
                return;
            }
        }

        return response;
    },

    async refreshToken() {
        const refresh = Auth.getRefreshToken();
        if (!refresh) return false;

        const response = await fetch(`${API_BASE}/auth/token/refresh/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh })
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('access_token', data.access);
            return true;
        }
        return false;
    },

    // ===== TRANSACTIONS =====
    async getTransactions(params = {}) {
        const query = new URLSearchParams(params).toString();
        const res = await this.request(`/transactions/?${query}`);
        return res.json();
    },

    async getTransaction(id) {
        const res = await this.request(`/transactions/${id}/`);
        return res.json();
    },

    async createTransaction(data) {
        const res = await this.request('/transactions/', {
            method: 'POST',
            body: data
        });
        return res.json();
    },

    async updateTransaction(id, data) {
        const res = await this.request(`/transactions/${id}/`, {
            method: 'PUT',
            body: data
        });
        return res.json();
    },

    async deleteTransaction(id) {
        await this.request(`/transactions/${id}/`, { method: 'DELETE' });
    },

    async getSummary() {
        const res = await this.request('/transactions/summary/');
        return res.json();
    },

    async getByCategory(year, month) {
        const res = await this.request(`/transactions/by-category/?year=${year}&month=${month}`);
        return res.json();
    },

    async getMonthlyTrend() {
        const res = await this.request('/transactions/monthly-trend/');
        return res.json();
    },

    async downloadCsv(params = {}) {
        const query = new URLSearchParams(params).toString();
        const res = await this.request(`/transactions/export-csv/?${query}`);
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'transactions.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    },

    // ===== CATEGORIES =====
    async getCategories() {
        const res = await this.request('/categories/');
        const data = await res.json();

        // Category list responses are paginated by Django REST Framework.
        // Always expose an array to callers so dropdowns can render it.
        return data.results || data;
    },

    async getCategory(id) {
        const res = await this.request(`/categories/${id}/`);
        return res.json();
    },

    async createCategory(data) {
        const res = await this.request('/categories/', {
            method: 'POST',
            body: data
        });
        return res.json();
    },

    async updateCategory(id, data) {
        const res = await this.request(`/categories/${id}/`, {
            method: 'PUT',
            body: data
        });
        return res.json();
    },

    async deleteCategory(id) {
        const res = await this.request(`/categories/${id}/`, { method: 'DELETE' });
        return res;
    },

    // ===== BUDGETS =====
    async getBudgets(params = {}) {
        const query = new URLSearchParams(params).toString();
        const res = await this.request(`/budgets/?${query}`);
        return res.json();
    },

    async getCurrentBudgets() {
        const res = await this.request('/budgets/current-month/');
        return res.json();
    },

    async createBudget(data) {
        const res = await this.request('/budgets/', {
            method: 'POST',
            body: data
        });
        return res.json();
    },

    async updateBudget(id, data) {
        const res = await this.request(`/budgets/${id}/`, {
            method: 'PUT',
            body: data
        });
        return res.json();
    },

    async deleteBudget(id) {
        const res = await this.request(`/budgets/${id}/`, { method: 'DELETE' });
        return res;
    },

    // ===== PROFILE =====
    async getProfile() {
        const res = await this.request('/auth/profile/');
        return res.json();
    },

    async updateProfile(data) {
        const res = await this.request('/auth/profile/', {
            method: 'PATCH',
            body: data
        });
        return res.json();
    }
};
