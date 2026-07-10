// static/js/reports.js

const MONTH_NAMES = ['January','February','March','April','May','June',
                      'July','August','September','October','November','December'];

let selectedMonth = new Date().getMonth() + 1;
let selectedYear = new Date().getFullYear();
let breakdownChartInstance = null;
let trendChartInstance = null;

document.addEventListener('DOMContentLoaded', async function () {
    requireAuth();

    setupSelectors();
    await loadReportData();

    document.getElementById('reportExportBtn').addEventListener('click', () => {
        ApiClient.downloadCsv({ month: selectedMonth, year: selectedYear });
    });
});

function setupSelectors() {
    const monthSelect = document.getElementById('reportMonth');
    const yearSelect = document.getElementById('reportYear');

    monthSelect.innerHTML = MONTH_NAMES.map((m, i) =>
        `<option value="${i + 1}" ${i + 1 === selectedMonth ? 'selected' : ''}>${m}</option>`).join('');

    const currentYear = new Date().getFullYear();
    yearSelect.innerHTML = [currentYear - 1, currentYear, currentYear + 1]
        .map(y => `<option value="${y}" ${y === selectedYear ? 'selected' : ''}>${y}</option>`).join('');

    monthSelect.addEventListener('change', () => { selectedMonth = parseInt(monthSelect.value); loadReportData(); });
    yearSelect.addEventListener('change', () => { selectedYear = parseInt(yearSelect.value); loadReportData(); });
}

async function loadReportData() {
    document.getElementById('breakdownLabel').textContent = `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`;

    await Promise.all([
        loadSummaryStrip(),
        loadBreakdownChart(),
        loadTrendChart()
    ]);
}

async function loadSummaryStrip() {
    // Reuse the by-category endpoint's totals plus a direct transaction fetch for income
    const [expenseData, allTransactions] = await Promise.all([
        ApiClient.getByCategory(selectedYear, selectedMonth),
        ApiClient.getTransactions({ year: selectedYear, month: selectedMonth, page_size: 1000 })
    ]);

    const results = allTransactions.results || allTransactions;
    const income = results
        .filter(t => t.transaction_type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const expenses = expenseData.reduce((sum, c) => sum + c.total, 0);

    document.getElementById('reportIncome').textContent = formatCurrency(income);
    document.getElementById('reportExpenses').textContent = formatCurrency(expenses);

    const net = income - expenses;
    const netEl = document.getElementById('reportNet');
    netEl.textContent = formatCurrency(net);
    netEl.classList.toggle('text-success', net >= 0);
    netEl.classList.toggle('text-danger', net < 0);

    renderCategoryTable(expenseData, expenses);
}

function renderCategoryTable(data, totalExpenses) {
    const tbody = document.getElementById('categoryBreakdownTable');

    if (!data.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">No expenses recorded for this period.</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(c => {
        const pct = totalExpenses > 0 ? ((c.total / totalExpenses) * 100).toFixed(1) : 0;
        return `
        <tr>
            <td>
                <span class="badge rounded-pill me-2" style="background-color:${c.category__color}">&nbsp;</span>
                ${c.category__name}
            </td>
            <td class="text-end">${c.count}</td>
            <td class="text-end fw-medium">${formatCurrency(c.total)}</td>
            <td class="text-end">${pct}%</td>
        </tr>`;
    }).join('');
}

async function loadBreakdownChart() {
    const data = await ApiClient.getByCategory(selectedYear, selectedMonth);
    const container = document.getElementById('breakdownContainer');

    if (breakdownChartInstance) {
        breakdownChartInstance.destroy();
        breakdownChartInstance = null;
    }

    if (!data.length) {
        container.innerHTML = '<p class="text-muted text-center py-4">No expense data for this period.</p>';
        return;
    }

    // Re-add the canvas in case it was replaced by the "no data" message previously
    if (!document.getElementById('breakdownChart')) {
        container.innerHTML = '<canvas id="breakdownChart"></canvas>';
    }

    const ctx = document.getElementById('breakdownChart').getContext('2d');
    breakdownChartInstance = new Chart(ctx, {
        type: 'pie',
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
                legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true } }
            }
        }
    });
}

async function loadTrendChart() {
    const data = await ApiClient.getMonthlyTrend();

    if (trendChartInstance) {
        trendChartInstance.destroy();
    }

    const ctx = document.getElementById('reportTrendChart').getContext('2d');
    trendChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.month),
            datasets: [
                {
                    label: 'Income',
                    data: data.map(d => d.income),
                    borderColor: '#198754',
                    backgroundColor: 'rgba(25,135,84,0.1)',
                    fill: true,
                    tension: 0.3
                },
                {
                    label: 'Expenses',
                    data: data.map(d => d.expenses),
                    borderColor: '#dc3545',
                    backgroundColor: 'rgba(220,53,69,0.1)',
                    fill: true,
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'top' } },
            scales: { y: { beginAtZero: true, ticks: { callback: (v) => '$' + v.toLocaleString() } } }
        }
    });
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}