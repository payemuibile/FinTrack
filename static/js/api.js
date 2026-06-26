// Central place for all API calls

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
                // Retry the original request with new token
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

    // Transactions
    async getTransactions(params = {}) {
        const query = new URLSearchParams(params).toString();
        const res = await this.request(`/transactions/?${query}`);
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

    // Categories
    async getCategories() {
        const res = await this.request('/categories/');
        return res.json();
    },

    // Budgets
    async getCurrentBudgets() {
        const res = await this.request('/budgets/current-month/');
        return res.json();
    }
};