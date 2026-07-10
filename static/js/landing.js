// static/js/landing.js
// Populates the hero "ledger" with a small realistic sample, animated in,
// and redirects logged-in users straight to the dashboard.

document.addEventListener('DOMContentLoaded', function () {
    // If a token already exists, skip the pitch and go to the app
    if (typeof Auth !== 'undefined' && Auth.isLoggedIn && Auth.isLoggedIn()) {
        window.location.href = '/dashboard/';
        return;
    }

    const sample = [
        { label: 'Freelance payment', cat: 'Freelance', amount: 450.00, type: 'income' },
        { label: 'Groceries', cat: 'Food & Dining', amount: -62.30, type: 'expense' },
        { label: 'Bus pass', cat: 'Transport', amount: -18.00, type: 'expense' },
        { label: 'Textbook refund', cat: 'Education', amount: 22.50, type: 'income' },
        { label: 'Coffee with client', cat: 'Food & Dining', amount: -6.75, type: 'expense' },
    ];

    const rowsEl = document.getElementById('ledgerRows');
    const balanceEl = document.getElementById('ledgerBalance');

    let running = 0;
    sample.forEach((entry, i) => {
        running += entry.amount;

        const li = document.createElement('li');
        li.className = 'ledger-row';
        li.style.animationDelay = `${0.15 + i * 0.12}s`;

        const sign = entry.amount >= 0 ? '+' : '−';
        const display = formatCurrency(Math.abs(entry.amount));
        const dotColor = entry.type === 'income' ? '#5B7F63' : '#C2451E';

        li.innerHTML = `
            <span class="ledger-row-left">
                <span class="ledger-dot" style="background:${dotColor}"></span>
                <span>
                    <span class="ledger-label">${entry.label}</span>
                    <span class="ledger-cat">${entry.cat}</span>
                </span>
            </span>
            <span class="ledger-amount ${entry.type}">${sign}${display}</span>
        `;
        rowsEl.appendChild(li);
    });

    // Animate the running balance counting up after the rows finish appearing
    const finalBalance = running;
    setTimeout(() => animateBalance(0, finalBalance, 700), sample.length * 120 + 250);

    function animateBalance(from, to, duration) {
        const start = performance.now();
        function tick(now) {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const value = from + (to - from) * eased;
            balanceEl.textContent = formatCurrency(value);
            if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    }

    function formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    }
});