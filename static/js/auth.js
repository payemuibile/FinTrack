// Handles JWT token storage and authentication state

const Auth = {
    // Store tokens in localStorage
    setTokens(access, refresh) {
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
    },

    getAccessToken() {
        return localStorage.getItem('access_token');
    },

    getRefreshToken() {
        return localStorage.getItem('refresh_token');
    },

    isLoggedIn() {
        return !!this.getAccessToken();
    },

    logout() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_info');
        window.location.href = '/login/';
    },

    getUserInfo() {
        const info = localStorage.getItem('user_info');
        return info ? JSON.parse(info) : null;
    },

    setUserInfo(userInfo) {
        localStorage.setItem('user_info', JSON.stringify(userInfo));
    }
};

// Redirect to login if not authenticated (call this on protected pages)
function requireAuth() {
    if (!Auth.isLoggedIn()) {
        window.location.href = '/login/';
    }
}

// Set up logout buttons
document.addEventListener('DOMContentLoaded', function() {
    // Display username in navbar
    const user = Auth.getUserInfo();
    const usernameEl = document.getElementById('usernameDisplay');
    if (user && usernameEl) {
        usernameEl.textContent = user.first_name || user.username;
    }

    // Display current date
    const dateEl = document.getElementById('currentDate');
    if (dateEl) {
        dateEl.textContent = new Date().toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    }

    // Logout buttons
    ['logoutBtn', 'logoutBtn2'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener('click', (e) => {
            e.preventDefault();
            Auth.logout();
        });
    });

    // Sidebar toggle
    const toggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    if (toggle && sidebar) {
        toggle.addEventListener('click', () => {
            if (window.matchMedia('(max-width: 768px)').matches) {
                sidebar.classList.toggle('mobile-open');
                return;
            }

            sidebar.classList.toggle('collapsed');
        });
    }
});
