const defaultApiBaseUrl = "https://raabta-foundation.onrender.com";
let apiBaseUrl = defaultApiBaseUrl;

const authForm = document.getElementById("auth-form");
const tokenInput = document.getElementById("admin-token");
const logoutButton = document.getElementById("logout-btn");
const refreshButton = document.getElementById("refresh-btn");
const exportButton = document.getElementById("export-btn");
const tabContacts = document.getElementById("tab-contacts");
const tabOrders = document.getElementById("tab-orders");
const searchInput = document.getElementById("search-input");
const statusFilter = document.getElementById("status-filter");
const contactsWrap = document.getElementById("contacts-wrap");
const ordersWrap = document.getElementById("orders-wrap");
const ordersBody = document.getElementById("orders-body");
const tableTitle = document.getElementById("table-title");
const statusEl = document.getElementById("status");
const contactsBody = document.getElementById("contacts-body");

const statusOptions = ["New", "Contacted", "Converted", "Closed"];
let activeTab = "contacts";
let contactsState = [];
let ordersState = [];
let searchDebounceTimer = null;

function setStatus(message, type) {
  statusEl.textContent = message || "";
  statusEl.className = "status";
  if (type) {
    statusEl.classList.add(type);
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(dateString) {
  if (!dateString) {
    return "-";
  }
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getToken() {
  return localStorage.getItem("raabta_admin_token") || "";
}

function setToken(token) {
  localStorage.setItem("raabta_admin_token", token);
}

function clearToken() {
  localStorage.removeItem("raabta_admin_token");
}

function renderEmpty(message) {
  contactsBody.innerHTML = `<tr><td colspan="9" class="empty">${escapeHtml(message)}</td></tr>`;
}

function renderEmptyOrders(message) {
  ordersBody.innerHTML = `<tr><td colspan="9" class="empty">${escapeHtml(message)}</td></tr>`;
}

function renderContacts(items) {
  if (!Array.isArray(items) || items.length === 0) {
    renderEmpty("No contact records found.");
    return;
  }

  contactsBody.innerHTML = items.map((item) => `
    <tr>
      <td>${escapeHtml(item.id)}</td>
      <td>${escapeHtml(item.name || item.full_name)}</td>
      <td>${escapeHtml(item.phone)}</td>
      <td>${escapeHtml(item.email)}</td>
      <td>${escapeHtml(item.subject)}</td>
      <td>${escapeHtml(item.message)}</td>
      <td>
        <select class="status-select" data-contact-id="${escapeHtml(item.id)}">
          ${statusOptions.map((option) => `<option value="${option}" ${option === (item.status || "New") ? "selected" : ""}>${option}</option>`).join("")}
        </select>
      </td>
      <td>
        <textarea class="note-input" data-note-id="${escapeHtml(item.id)}" placeholder="Add follow-up note">${escapeHtml(item.admin_note || "")}</textarea>
        <button class="save-note-btn" data-save-id="${escapeHtml(item.id)}" type="button">Save</button>
      </td>
      <td>${escapeHtml(formatDate(item.created_at))}</td>
    </tr>
  `).join("");

  document.querySelectorAll(".save-note-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const recordId = button.dataset.saveId;
      const statusSelect = document.querySelector(`.status-select[data-contact-id=\"${recordId}\"]`);
      const noteInput = document.querySelector(`.note-input[data-note-id=\"${recordId}\"]`);
      await saveContactUpdate(recordId, statusSelect?.value || "New", noteInput?.value || "");
    });
  });
}

function formatInr(value) {
  return `Rs ${Number(value || 0).toLocaleString("en-IN")}`;
}

function itemsToSummary(items) {
  if (!items) {
    return "-";
  }
  if (typeof items === "string") {
    return items;
  }
  if (!Array.isArray(items)) {
    return "-";
  }
  return items.map((item) => `${item.name || item.id || "Item"} x ${item.qty || 1}`).join("; ");
}

function renderOrders(items) {
  if (!Array.isArray(items) || items.length === 0) {
    renderEmptyOrders("No order records found.");
    return;
  }

  ordersBody.innerHTML = items.map((item) => {
    const customer = item.customer_name || item.name || "-";
    const total = item.total_amount || item.totalAmount || 0;
    return `
      <tr>
        <td>${escapeHtml(item.id)}</td>
        <td>${escapeHtml(customer)}</td>
        <td>${escapeHtml(item.phone)}</td>
        <td>${escapeHtml(item.email)}</td>
        <td>${escapeHtml(item.payment_method || item.paymentMethod || "UPI")}</td>
        <td>${escapeHtml(item.address)}</td>
        <td>${escapeHtml(itemsToSummary(item.items))}</td>
        <td>${escapeHtml(formatInr(total))}</td>
        <td>${escapeHtml(formatDate(item.created_at || item.createdAt))}</td>
      </tr>
    `;
  }).join("");
}

function apiUrl(path) {
  return `${apiBaseUrl}${path}`;
}

async function loadApiConfig() {
  try {
    const response = await fetch(`${defaultApiBaseUrl}/api/config`);
    if (!response.ok) {
      return;
    }
    const data = await response.json();
    if (data && typeof data.apiBaseUrl === "string" && data.apiBaseUrl.trim()) {
      apiBaseUrl = data.apiBaseUrl.replace(/\/$/, "");
    }
  } catch (_error) {
    apiBaseUrl = defaultApiBaseUrl;
  }
}

function getQueryParams() {
  const params = new URLSearchParams();
  const query = searchInput.value.trim();
  if (query) {
    params.set("q", query);
  }

  if (activeTab === "contacts") {
    const status = statusFilter.value;
    if (status && status !== "all") {
      params.set("status", status);
    }
  }

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

async function fetchContacts() {
  const token = getToken();
  if (!token) {
    renderEmpty("Enter admin token and click Load Dashboard.");
    setStatus("Admin token is required.", "error");
    return;
  }

  setStatus("Loading contact records...", "");

  try {
    const response = await fetch(apiUrl(`/api/admin/contacts${getQueryParams()}`), {
      headers: {
        "x-admin-token": token
      }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401) {
        setStatus("Unauthorized token. Please check ADMIN_TOKEN and try again.", "error");
      } else {
        setStatus(data.message || "Failed to load contacts.", "error");
      }
      renderEmpty("Could not load records.");
      return;
    }

    contactsState = Array.isArray(data.data) ? data.data : [];
    renderContacts(contactsState);
    setStatus(`Loaded ${contactsState.length} contact records.`, "success");
  } catch (_error) {
    renderEmpty("Could not connect to server.");
    setStatus("Network error while loading contacts.", "error");
  }
}

async function fetchOrders() {
  const token = getToken();
  if (!token) {
    renderEmptyOrders("Enter admin token and click Load Dashboard.");
    setStatus("Admin token is required.", "error");
    return;
  }

  setStatus("Loading order records...", "");

  try {
    const response = await fetch(apiUrl(`/api/admin/orders${getQueryParams()}`), {
      headers: {
        "x-admin-token": token
      }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401) {
        setStatus("Unauthorized token. Please check ADMIN_TOKEN and try again.", "error");
      } else {
        setStatus(data.message || "Failed to load orders.", "error");
      }
      renderEmptyOrders("Could not load order records.");
      return;
    }

    ordersState = Array.isArray(data.data) ? data.data : [];
    renderOrders(ordersState);
    setStatus(`Loaded ${ordersState.length} order records.`, "success");
  } catch (_error) {
    renderEmptyOrders("Could not connect to server.");
    setStatus("Network error while loading orders.", "error");
  }
}

async function saveContactUpdate(contactId, status, adminNote) {
  const token = getToken();
  if (!token) {
    setStatus("Admin token is required.", "error");
    return;
  }

  setStatus(`Saving contact #${contactId}...`, "");

  try {
    const response = await fetch(apiUrl(`/api/admin/contacts/${encodeURIComponent(contactId)}`), {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": token
      },
      body: JSON.stringify({ status, adminNote })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setStatus(data.message || "Failed to save contact update.", "error");
      return;
    }

    setStatus(`Saved contact #${contactId}.`, "success");
  } catch (_error) {
    setStatus("Network error while saving contact.", "error");
  }
}

async function refreshActiveTab() {
  if (activeTab === "contacts") {
    await fetchContacts();
    return;
  }
  await fetchOrders();
}

function setActiveTab(tabName) {
  activeTab = tabName;
  const contactsOn = tabName === "contacts";
  tabContacts.classList.toggle("on", contactsOn);
  tabOrders.classList.toggle("on", !contactsOn);
  contactsWrap.classList.toggle("hidden", !contactsOn);
  ordersWrap.classList.toggle("hidden", contactsOn);
  statusFilter.disabled = !contactsOn;
  tableTitle.textContent = contactsOn ? "Contact Form Database" : "Orders Database";
}

function exportCsv() {
  const rows = activeTab === "contacts" ? contactsState : ordersState;
  if (!rows.length) {
    setStatus("No rows available to export.", "error");
    return;
  }

  const headers = activeTab === "contacts"
    ? ["id", "name", "phone", "email", "subject", "message", "status", "admin_note", "created_at"]
    : ["id", "customer_name", "phone", "email", "payment_method", "address", "items", "total_amount", "created_at"];

  const csvLines = [headers.join(",")];
  rows.forEach((row) => {
    const line = headers.map((header) => {
      let value = row[header];
      if (header === "name") {
        value = row.name || row.full_name || "";
      }
      if (header === "customer_name") {
        value = row.customer_name || row.name || "";
      }
      if (header === "items") {
        value = itemsToSummary(row.items);
      }
      if (value === null || value === undefined) {
        value = "";
      }
      const escaped = String(value).replace(/\"/g, '""');
      return `"${escaped}"`;
    }).join(",");
    csvLines.push(line);
  });

  const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `raabta-${activeTab}-${Date.now()}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
  setStatus("CSV exported successfully.", "success");
}

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const token = tokenInput.value.trim();
  if (!token) {
    setStatus("Please enter admin token.", "error");
    return;
  }
  setToken(token);
  await refreshActiveTab();
});

logoutButton.addEventListener("click", () => {
  clearToken();
  tokenInput.value = "";
  renderEmpty("Token cleared. Enter admin token and click Load Dashboard.");
  renderEmptyOrders("Token cleared. Enter admin token and click Load Dashboard.");
  setStatus("Admin token cleared from this browser.", "");
});

refreshButton.addEventListener("click", async () => {
  await refreshActiveTab();
});

tabContacts.addEventListener("click", async () => {
  setActiveTab("contacts");
  await fetchContacts();
});

tabOrders.addEventListener("click", async () => {
  setActiveTab("orders");
  await fetchOrders();
});

statusFilter.addEventListener("change", async () => {
  if (activeTab === "contacts") {
    await fetchContacts();
  }
});

searchInput.addEventListener("input", () => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
  }
  searchDebounceTimer = setTimeout(async () => {
    await refreshActiveTab();
  }, 350);
});

exportButton.addEventListener("click", () => {
  exportCsv();
});

(async function init() {
  await loadApiConfig();
  setActiveTab("contacts");
  const savedToken = getToken();
  if (savedToken) {
    tokenInput.value = savedToken;
    await refreshActiveTab();
  }
})();
