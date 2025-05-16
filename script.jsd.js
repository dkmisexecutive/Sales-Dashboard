const API_URL = 'https://script.google.com/macros/s/AKfycbwwaks-PzLMCcGt3Gj8wZ29Q97wDB8R9clz3mqZfRvVWMveZbYZvJrCXHQIZDOCR1HJ/exec';

let salesData = [];
let filteredData = [];

const fetchData = async () => {
    try {
        const res = await fetch(API_URL);
        const data = await res.json();
        salesData = data.map(item => ({
            ...item,
            Date: moment(item.Date, "DD-MM-YYYY").toDate(),
            Quantity: Number(item.Quantity),
            Amount: Number(item.Amount)
        }));
        filteredData = [...salesData];
        initializeDashboard();
    } catch (error) {
        console.error("Error fetching data:", error);
    }
};

const initializeDashboard = () => {
    populateFilters();
    updateSummary();
    renderCharts();
    renderTable();
    $('#loading').addClass('hidden');
    $('#dashboard-content').removeClass('hidden');
    $('#last-updated').text(moment().format('DD MMM YYYY, HH:mm'));
    $('#current-date').text(moment().format('dddd, DD MMM YYYY'));
};

const populateFilters = () => {
    const states = new Set();
    const districts = new Set();
    const salespersons = new Set();

    salesData.forEach(item => {
        states.add(item.State);
        districts.add(item.District);
        salespersons.add(item.Salesperson);
    });

    populateSelect('#state-filter', Array.from(states));
    populateSelect('#district-filter', Array.from(districts));
    populateSelect('#salesperson-filter', Array.from(salespersons));
};

const populateSelect = (selector, values) => {
    const select = $(selector);
    values.sort().forEach(value => {
        select.append(new Option(value, value));
    });
};

const updateSummary = () => {
    const totalSales = filteredData.reduce((sum, item) => sum + item.Amount, 0);
    const totalOrders = filteredData.length;
    const avgOrder = totalOrders ? (totalSales / totalOrders).toFixed(2) : 0;

    const salesByPerson = {};
    filteredData.forEach(item => {
        salesByPerson[item.Salesperson] = (salesByPerson[item.Salesperson] || 0) + item.Amount;
    });
    const topSalesperson = Object.entries(salesByPerson).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";

    $('#total-sales').text(`₹${totalSales.toFixed(2)}`);
    $('#total-orders').text(totalOrders);
    $('#avg-order-value').text(`₹${avgOrder}`);
    $('#top-salesperson').text(topSalesperson);
};

const renderCharts = () => {
    renderLineChart();
    renderBarChart();
    renderSalespersonChart();
    renderPieChart();
};

const renderLineChart = () => {
    const salesByDate = {};
    filteredData.forEach(item => {
        const dateStr = moment(item.Date).format("YYYY-MM-DD");
        salesByDate[dateStr] = (salesByDate[dateStr] || 0) + item.Amount;
    });

    const labels = Object.keys(salesByDate).sort();
    const data = labels.map(date => salesByDate[date]);

    new Chart(document.getElementById("sales-trend-chart"), {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Sales (₹)',
                data,
                borderColor: '#4361ee',
                backgroundColor: 'rgba(67, 97, 238, 0.1)',
                fill: true,
                tension: 0.3
            }]
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
    });
};

const renderBarChart = () => {
    const salesByState = {};
    filteredData.forEach(item => {
        salesByState[item.State] = (salesByState[item.State] || 0) + item.Amount;
    });

    const labels = Object.keys(salesByState);
    const data = labels.map(state => salesByState[state]);

    new Chart(document.getElementById("sales-by-state-chart"), {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Sales (₹)',
                data,
                backgroundColor: '#3a0ca3'
            }]
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
    });
};

const renderSalespersonChart = () => {
    const salesByPerson = {};
    filteredData.forEach(item => {
        salesByPerson[item.Salesperson] = (salesByPerson[item.Salesperson] || 0) + item.Amount;
    });

    const labels = Object.keys(salesByPerson);
    const data = labels.map(p => salesByPerson[p]);

    new Chart(document.getElementById("sales-by-salesperson-chart"), {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Sales (₹)',
                data,
                backgroundColor: '#f72585'
            }]
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
    });
};

const renderPieChart = () => {
    const productDistribution = {};
    filteredData.forEach(item => {
        productDistribution[item.Product] = (productDistribution[item.Product] || 0) + item.Amount;
    });

    const labels = Object.keys(productDistribution);
    const data = labels.map(p => productDistribution[p]);

    new Chart(document.getElementById("sales-distribution-chart"), {
        type: 'pie',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: ['#4361ee', '#3a0ca3', '#f72585', '#4cc9f0', '#f9c74f', '#ef476f']
            }]
        },
        options: { responsive: true }
    });
};

const renderTable = () => {
    const tbody = $('#table-body').empty();
    filteredData.forEach(item => {
        tbody.append(`
            <tr>
                <td>${moment(item.Date).format("DD-MM-YYYY")}</td>
                <td>${item.State}</td>
                <td>${item.District}</td>
                <td>${item.Salesperson}</td>
                <td>${item.Product}</td>
                <td>${item.Quantity}</td>
                <td>₹${item.Amount.toFixed(2)}</td>
            </tr>
        `);
    });

    $('#sales-table').DataTable().destroy();
    $('#sales-table').DataTable();
};

const applyFilters = () => {
    const state = $('#state-filter').val();
    const district = $('#district-filter').val();
    const salesperson = $('#salesperson-filter').val();
    const dateRange = $('#date-range').val();
    const [start, end] = dateRange ? dateRange.split(' - ').map(d => moment(d, "MM/DD/YYYY").toDate()) : [null, null];

    filteredData = salesData.filter(item => {
        return (!state || item.State === state) &&
               (!district || item.District === district) &&
               (!salesperson || item.Salesperson === salesperson) &&
               (!start || (item.Date >= start && item.Date <= end));
    });

    updateSummary();
    renderCharts();
    renderTable();
};

const resetFilters = () => {
    $('#state-filter, #district-filter, #salesperson-filter').val('');
    $('#date-range').val('');
    filteredData = [...salesData];
    updateSummary();
    renderCharts();
    renderTable();
};

$(document).ready(() => {
    fetchData();

    $('#apply-filters').on('click', applyFilters);
    $('#reset-filters').on('click', resetFilters);

    $('#date-range').daterangepicker({
        opens: 'left',
        autoUpdateInput: false
    }, function(start, end) {
        $('#date-range').val(`${start.format('MM/DD/YYYY')} - ${end.format('MM/DD/YYYY')}`);
    });
});
