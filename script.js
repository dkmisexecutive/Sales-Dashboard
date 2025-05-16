const endpoint = 'https://script.google.com/macros/s/AKfycbwwaks-PzLMCcGt3Gj8wZ29Q97wDB8R9clz3mqZfRvVWMveZbYZvJrCXHQIZDOCR1HJ/exec'; // Replace with your actual Apps Script web app URL
let rawData = [];

$(document).ready(function () {
    $('#current-date').text(new Date().toDateString());
    $('#date-range').daterangepicker();
    fetchData();

    $('#apply-filters').on('click', applyFilters);
    $('#reset-filters').on('click', () => {
        $('#state-filter, #district-filter, #salesperson-filter').val('');
        $('#date-range').data('daterangepicker').setStartDate(moment().subtract(29, 'days'));
        $('#date-range').data('daterangepicker').setEndDate(moment());
        applyFilters();
    });
});

function fetchData() {
    $('#loading').removeClass('hidden');
    $('#dashboard-content').addClass('hidden');

    fetch(endpoint)
        .then(res => res.json())
        .then(data => {
            rawData = data.map(item => ({
                ...item,
                Date: moment(item.Date, 'YYYY-MM-DD') // Ensure consistent date parsing
            }));
            populateFilters(rawData);
            applyFilters();
        })
        .catch(err => {
            console.error('Error fetching data:', err);
            alert('Failed to load data.');
        })
        .finally(() => {
            $('#loading').addClass('hidden');
            $('#dashboard-content').removeClass('hidden');
            $('#last-updated').text(new Date().toLocaleString());
        });
}

function populateFilters(data) {
    const states = [...new Set(data.map(d => d.State))].sort();
    const districts = [...new Set(data.map(d => d.District))].sort();
    const salespersons = [...new Set(data.map(d => d.Salesperson))].sort();

    const addOptions = (selector, items) => {
        const dropdown = $(selector);
        dropdown.empty().append('<option value="">All</option>');
        items.forEach(item => dropdown.append(`<option value="${item}">${item}</option>`));
    };

    addOptions('#state-filter', states);
    addOptions('#district-filter', districts);
    addOptions('#salesperson-filter', salespersons);
}

function applyFilters() {
    const state = $('#state-filter').val();
    const district = $('#district-filter').val();
    const salesperson = $('#salesperson-filter').val();
    const dateRange = $('#date-range').data('daterangepicker');
    const startDate = dateRange.startDate.startOf('day');
    const endDate = dateRange.endDate.endOf('day');

    const filtered = rawData.filter(d => {
        return (!state || d.State === state) &&
               (!district || d.District === district) &&
               (!salesperson || d.Salesperson === salesperson) &&
               d.Date.isBetween(startDate, endDate, null, '[]');
    });

    updateStats(filtered);
    renderTable(filtered);
    renderCharts(filtered);
}

function updateStats(data) {
    const totalSales = data.reduce((sum, d) => sum + Number(d['Sales Amount'] || 0), 0);
    const totalOrders = data.length;
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    const salespersonTotals = {};
    data.forEach(d => {
        if (!salespersonTotals[d.Salesperson]) salespersonTotals[d.Salesperson] = 0;
        salespersonTotals[d.Salesperson] += Number(d['Sales Amount']);
    });
    const topSalesperson = Object.entries(salespersonTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';

    $('#total-sales').text(`₹${totalSales.toLocaleString()}`);
    $('#total-orders').text(totalOrders);
    $('#avg-order-value').text(`₹${Math.round(avgOrderValue).toLocaleString()}`);
    $('#top-salesperson').text(topSalesperson);
}

function renderTable(data) {
    if ($.fn.DataTable.isDataTable('#sales-table')) {
        $('#sales-table').DataTable().clear().destroy();
    }

    const tbody = $('#table-body');
    tbody.empty();

    data.forEach(d => {
        tbody.append(`
            <tr>
                <td>${d.Date.format('YYYY-MM-DD')}</td>
                <td>${d.State}</td>
                <td>${d.District}</td>
                <td>${d.Salesperson}</td>
                <td>${d.Product || '-'}</td>
                <td>${d.Quantity || '-'}</td>
                <td>₹${Number(d['Sales Amount']).toLocaleString()}</td>
            </tr>
        `);
    });

    $('#sales-table').DataTable();
}

function renderCharts(data) {
    const ctxIds = [
        'sales-trend-chart',
        'sales-by-state-chart',
        'sales-by-salesperson-chart',
        'sales-distribution-chart'
    ];

    ctxIds.forEach(id => {
        if (Chart.getChart(id)) Chart.getChart(id).destroy();
    });

    // Sales Trend (line chart)
    const salesByDate = {};
    data.forEach(d => {
        const date = d.Date.format('YYYY-MM-DD');
        salesByDate[date] = (salesByDate[date] || 0) + Number(d['Sales Amount']);
    });
    const trendDates = Object.keys(salesByDate).sort();
    const trendData = trendDates.map(d => salesByDate[d]);

    new Chart(document.getElementById('sales-trend-chart'), {
        type: 'line',
        data: {
            labels: trendDates,
            datasets: [{
                label: 'Sales',
                data: trendData,
                borderColor: '#4361ee',
                backgroundColor: 'rgba(67, 97, 238, 0.2)',
                fill: true,
                tension: 0.3
            }]
        },
        options: { responsive: true }
    });

    // Sales by State (bar chart)
    const salesByState = {};
    data.forEach(d => {
        salesByState[d.State] = (salesByState[d.State] || 0) + Number(d['Sales Amount']);
    });

    const stateLabels = Object.keys(salesByState);
    const stateData = Object.values(salesByState);

    new Chart(document.getElementById('sales-by-state-chart'), {
        type: 'bar',
        data: {
            labels: stateLabels,
            datasets: [{
                label: 'Sales',
                data: stateData,
                backgroundColor: '#3a0ca3'
            }]
        },
        options: { responsive: true }
    });

    // Sales by Salesperson (bar chart)
    const salesBySP = {};
    data.forEach(d => {
        salesBySP[d.Salesperson] = (salesBySP[d.Salesperson] || 0) + Number(d['Sales Amount']);
    });

    new Chart(document.getElementById('sales-by-salesperson-chart'), {
        type: 'bar',
        data: {
            labels: Object.keys(salesBySP),
            datasets: [{
                label: 'Sales',
                data: Object.values(salesBySP),
                backgroundColor: '#f72585'
            }]
        },
        options: { responsive: true }
    });

    // Sales Distribution (pie chart)
    new Chart(document.getElementById('sales-distribution-chart'), {
        type: 'pie',
        data: {
            labels: Object.keys(salesByState),
            datasets: [{
                data: Object.values(salesByState),
                backgroundColor: ['#4cc9f0', '#f72585', '#f9c74f', '#ef476f', '#4361ee']
            }]
        },
        options: { responsive: true }
    });
}
