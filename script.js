const JSON_URL = 'https://script.google.com/macros/s/AKfycbzyv3Y_0nups9x9RNo-EVtEJfyHiVeblf87ILJLRhC2cx2p3ewSqdE-RwlKpvsTXqQrUA/exec';

let rawData = [];
let salesChart = null;
let statePie = null, cityPie = null, repPie = null;

document.addEventListener('DOMContentLoaded', () => {
  fetchData();
  setupEventListeners();
});

function fetchData() {
  fetch(JSON_URL)
    .then(response => response.json())
    .then(data => {
      rawData = data.map(row => ({
        ...row,
        "Bill Date": parseDate(row["Bill Date"]),
        "Bill Amount": parseFloat(row["Bill Amount"].replace(/[^0-9.-]+/g, "")) || 0
      }));
      extractUniqueFilters();
      initAutocompleteFilters();
      renderTable();
      updateTotalSales();
      updateChart();
      updatePieCharts();
    })
    .catch(err => console.error('Error fetching JSON:', err));
}

function parseDate(dateStr) {
  const date = new Date(dateStr);
  return isNaN(date) ? null : date;
}

function formatDate(dateObj) {
  if (!(dateObj instanceof Date) || isNaN(dateObj)) return "Invalid Date";
  const dd = String(dateObj.getDate()).padStart(2, "0");
  const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
  const yyyy = dateObj.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function getFilters() {
  return {
    state: document.getElementById("stateFilter").value.trim(),
    rep: document.getElementById("repFilter").value.trim(),
    city: document.getElementById("cityFilter").value.trim(),
    distributor: document.getElementById("distributorFilter").value.trim(),
    fromDate: document.getElementById("fromDate").value ? new Date(document.getElementById("fromDate").value) : null,
    toDate: document.getElementById("toDate").value ? new Date(document.getElementById("toDate").value) : null
  };
}

function applyFilters(data) {
  const { state, rep, city, distributor, fromDate, toDate } = getFilters();
  return data.filter(row => {
    if (state && state.toLowerCase() !== "all" && row.State.toLowerCase() !== state.toLowerCase()) return false;
    if (rep && rep.toLowerCase() !== "all" && row.Rep.toLowerCase() !== rep.toLowerCase()) return false;
    if (city && city.toLowerCase() !== "all" && row.City.toLowerCase() !== city.toLowerCase()) return false;
    if (distributor && distributor.toLowerCase() !== "all" && row.Distributor.toLowerCase() !== distributor.toLowerCase()) return false;
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
  const tableBody = document.querySelector("table tbody");
  tableBody.innerHTML = "";

  filtered.forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row["Bill No"] || "-"}</td>
      <td>${formatDate(row["Bill Date"])}</td>
      <td>₹${row["Bill Amount"].toFixed(2)}</td>
      <td>${row["Distributor"]}</td>
      <td>${row["City"]}</td>
      <td>${row["State"]}</td>
      <td>${row["Rep"]}</td>
    `;
    tableBody.appendChild(tr);
  });

  updateChart();
  updatePieCharts();
}

function updateTotalSales() {
  const filtered = applyFilters(rawData);
  const total = filtered.reduce((sum, row) => sum + (row["Bill Amount"] || 0), 0);
  document.getElementById("totalSales").textContent = `Total Sales: ₹${total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

function setupEventListeners() {
  ["stateFilter", "repFilter", "cityFilter", "distributorFilter"].forEach(id => {
    const input = document.getElementById(id);
    input.addEventListener("input", () => {
      showSuggestions(id);
      renderTable();
      updateTotalSales();
      updatePieCharts();
    });
    input.addEventListener("blur", () => {
      setTimeout(() => hideSuggestions(id), 200);
    });
  });

  ["fromDate", "toDate"].forEach(id => {
    document.getElementById(id).addEventListener("change", () => {
      renderTable();
      updateTotalSales();
      updatePieCharts();
    });
  });
}

function extractUniqueFilters() {
  window.filterData = {
    states: [...new Set(rawData.map(row => row.State).filter(Boolean))].sort(),
    reps: [...new Set(rawData.map(row => row.Rep).filter(Boolean))].sort(),
    cities: [...new Set(rawData.map(row => row.City).filter(Boolean))].sort(),
    distributors: [...new Set(rawData.map(row => row.Distributor).filter(Boolean))].sort()
  };
}

function initAutocompleteFilters() {
  ["stateFilter", "repFilter", "cityFilter", "distributorFilter"].forEach(id => {
    const input = document.getElementById(id);
    const suggestionsDiv = document.createElement("div");
    suggestionsDiv.className = "suggestions";
    suggestionsDiv.id = id + "Suggestions";
    input.parentNode.appendChild(suggestionsDiv);
  });
}

function showSuggestions(filterId) {
  const input = document.getElementById(filterId);
  const suggestionsDiv = document.getElementById(filterId + "Suggestions");
  const query = input.value.toLowerCase();
  let list = [];

  switch (filterId) {
    case "stateFilter": list = window.filterData.states; break;
    case "repFilter": list = window.filterData.reps; break;
    case "cityFilter": list = window.filterData.cities; break;
    case "distributorFilter": list = window.filterData.distributors; break;
  }

  const filteredList = list.filter(item => item.toLowerCase().startsWith(query));
  suggestionsDiv.innerHTML = "";

  if (filteredList.length === 0) {
    suggestionsDiv.style.display = "none";
    return;
  }

  filteredList.forEach(item => {
    const div = document.createElement("div");
    div.textContent = item;
    div.addEventListener("mousedown", () => {
      input.value = item;
      suggestionsDiv.style.display = "none";
      renderTable();
      updateTotalSales();
      updatePieCharts();
    });
    suggestionsDiv.appendChild(div);
  });

  suggestionsDiv.style.display = "block";
}

function hideSuggestions(filterId) {
  const suggestionsDiv = document.getElementById(filterId + "Suggestions");
  suggestionsDiv.style.display = "none";
}

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
  if (salesChart) salesChart.destroy();

  salesChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
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

function updatePieCharts() {
  const filtered = applyFilters(rawData);

  const groupData = (key) => {
    return filtered.reduce((acc, row) => {
      const label = row[key] || "Unknown";
      acc[label] = (acc[label] || 0) + row["Bill Amount"];
      return acc;
    }, {});
  };

  const createPie = (ctxId, dataMap, oldChart) => {
    const ctx = document.getElementById(ctxId).getContext("2d");
    if (oldChart) oldChart.destroy();

    return new Chart(ctx, {
      type: "pie",
      data: {
        labels: Object.keys(dataMap),
        datasets: [{
          data: Object.values(dataMap),
          backgroundColor: Object.keys(dataMap).map(() => '#' + Math.floor(Math.random()*16777215).toString(16))
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: "bottom" },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `₹${context.raw.toLocaleString("en-IN", {minimumFractionDigits: 2})}`;
              }
            }
          }
        }
      }
    });
  };

  statePie = createPie("statePieChart", groupData("State"), statePie);
  cityPie = createPie("cityPieChart", groupData("City"), cityPie);
  repPie = createPie("repPieChart", groupData("Rep"), repPie);
}
