const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT5XxdtzE8EspXl6l5EwqPg6kC0E36q6F9P7vKuT7RwSpa3981Mc6mt5xUOCRtXcLSrOWPX6oQb4geg/pub?gid=0&single=true&output=csv';

let rawData = [];
let salesChart = null;

document.addEventListener('DOMContentLoaded', () => {
  fetchData();
  setupEventListeners();
});

function fetchData() {
  fetch(CSV_URL)
    .then(response => response.text())
    .then(csv => {
      const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
      rawData = parsed.data.map(row => ({
        ...row,
        "Bill Date": parseDate(row["Bill Date"]),
        "Bill Amount": parseFloat(row["Bill Amount"].replace(/[^0-9.-]+/g, "")) || 0
      }));
      populateFilters();
      renderTable();
      updateTotalSales();
      updateChart();
    })
    .catch(err => {
      console.error('Error fetching CSV:', err);
    });
}

function parseDate(dateStr) {
  if (!dateStr || !dateStr.includes("-")) return null;
  const [dd, mm, yyyy] = dateStr.split("-");
  return new Date(`${yyyy}-${mm}-${dd}`);
}

function populateFilters() {
  populateSelect("stateFilter", [...new Set(rawData.map(r => r.State).filter(Boolean))]);
  populateSelect("repFilter", [...new Set(rawData.map(r => r.Rep).filter(Boolean))]);
  populateSelect("cityFilter", [...new Set(rawData.map(r => r.City).filter(Boolean))]);
  populateSelect("distributorFilter", [...new Set(rawData.map(r => r.Distributor).filter(Boolean))]);
}

function populateSelect(id, values) {
  const select = document.getElementById(id);
  values.sort().forEach(value => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

function getFilters() {
  return {
    state: document.getElementById("stateFilter").value,
    rep: document.getElementById("repFilter").value,
    city: document.getElementById("cityFilter").value,
    distributor: document.getElementById("distributorFilter").value,
    fromDate: document.getElementById("fromDate").value ? new Date(document.getElementById("fromDate").value) : null,
    toDate: document.getElementById("toDate").value ? new Date(document.getElementById("toDate").value) : null
  };
}

function applyFilters(data) {
  const { state, rep, city, distributor, fromDate, toDate } = getFilters();
  return data.filter(row => {
    if (state && row.State !== state) return false;
    if (rep && row.Rep !== rep) return false;
    if (city && row.City !== city) return false;
    if (distributor && row.Distributor !== distributor) return false;
    if (row["Bill Date"] instanceof Date && !isNaN(row["Bill Date"])) {
      if (fromDate && row["Bill Date"] < fromDate) return false;
      if (toDate && row["Bill Date"] > toDate) return false;
    } else {
      return false;
    }
    return true;
  });
}

function renderTable() {
  const filtered = applyFilters(rawData);
  const tbody = document.querySelector("table tbody");
  tbody.innerHTML = "";

  filtered.forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row["Bill No"]}</td>
      <td>${formatDate(row["Bill Date"])}</td>
      <td>₹${row["Bill Amount"].toFixed(2)}</td>
      <td>${row["Distributor"]}</td>
      <td>${row["City"]}</td>
      <td>${row["State"]}</td>
      <td>${row["Rep"]}</td>
    `;
    tbody.appendChild(tr);
  });

  updateChart();
}

function updateTotalSales() {
  const filtered = applyFilters(rawData);
  const total = filtered.reduce((sum, row) => sum + (row["Bill Amount"] || 0), 0);
  document.getElementById("totalSales").textContent = `Total Sales: ₹${total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

function formatDate(dateObj) {
  if (!(dateObj instanceof Date) || isNaN(dateObj)) return "Invalid Date";
  const dd = String(dateObj.getDate()).padStart(2, "0");
  const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
  const yyyy = dateObj.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function setupEventListeners() {
  ["stateFilter", "repFilter", "cityFilter", "distributorFilter", "fromDate", "toDate"].forEach(id => {
    document.getElementById(id).addEventListener("change", () => {
      renderTable();
      updateTotalSales();
    });
  });
}

// Chart Drawing Function
function updateChart() {
  const filtered = applyFilters(rawData);

  const salesByCity = {};
  filtered.forEach(row => {
    const city = row.City || "Unknown";
    salesByCity[city] = (salesByCity[city] || 0) + row["Bill Amount"];
  });

  const labels = Object.keys(salesByCity);
  const values = Object.values(salesByCity);

  const ctx = document.getElementById('salesChart').getContext('2d');

  if (salesChart) {
    salesChart.destroy();
  }

  salesChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Sales by City',
        data: values,
        backgroundColor: '#4285F4'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: { mode: 'index', intersect: false }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}
