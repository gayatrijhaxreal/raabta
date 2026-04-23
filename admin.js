const defaultApiBaseUrl = "https://raabta-foundation.onrender.com";
let apiBaseUrl = defaultApiBaseUrl;

const authForm = document.getElementById("auth-form");
const tokenInput = document.getElementById("admin-token");
const logoutButton = document.getElementById("logout-btn");
const refreshButton = document.getElementById("refresh-btn");
const statusEl = document.getElementById("status");
const contactsBody = document.getElementById("contacts-body");

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
  contactsBody.innerHTML = `<tr><td colspan="7" class="empty">${escapeHtml(message)}</td></tr>`;
}

function renderContacts(items) {
  if (!Array.isArray(items) || items.length === 0) {
    renderEmpty("No contact records found.");
    return;
  }

  contactsBody.innerHTML = items.map((item) => `
    <tr>
      <td>${escapeHtml(item.id)}</td>
      <td>${escapeHtml(item.full_name)}</td>
      <td>${escapeHtml(item.phone)}</td>
      <td>${escapeHtml(item.email)}</td>
      <td>${escapeHtml(item.subject)}</td>
      <td>${escapeHtml(item.message)}</td>
      <td>${escapeHtml(formatDate(item.created_at))}</td>
    </tr>
  `).join("");
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

async function fetchContacts() {
  const token = getToken();
  if (!token) {
    renderEmpty("Enter admin token and click Load Contacts.");
    setStatus("Admin token is required.", "error");
    return;
  }

  setStatus("Loading contact records...", "");

  try {
    const response = await fetch(apiUrl("/api/admin/contacts"), {
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

    renderContacts(data.items || []);
    setStatus(`Loaded ${Array.isArray(data.items) ? data.items.length : 0} contact records.`, "success");
  } catch (_error) {
    renderEmpty("Could not connect to server.");
    setStatus("Network error while loading contacts.", "error");
  }
}

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const token = tokenInput.value.trim();
  if (!token) {
    setStatus("Please enter admin token.", "error");
    return;
  }
  setToken(token);
  await fetchContacts();
});

logoutButton.addEventListener("click", () => {
  clearToken();
  tokenInput.value = "";
  renderEmpty("Token cleared. Enter admin token and click Load Contacts.");
  setStatus("Admin token cleared from this browser.", "");
});

refreshButton.addEventListener("click", async () => {
  await fetchContacts();
});

(async function init() {
  await loadApiConfig();
  const savedToken = getToken();
  if (savedToken) {
    tokenInput.value = savedToken;
    await fetchContacts();
  }
})();
