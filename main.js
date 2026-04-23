const pages = ["home", "intro", "about", "work", "events", "support", "contact", "terms"];
const defaultApiBaseUrl = "https://raabta-foundation.onrender.com";
let apiBaseUrl = defaultApiBaseUrl;

function go(id) {
  pages.forEach((p) => {
    const pageEl = document.getElementById("pg-" + p);
    if (pageEl) {
      pageEl.classList.toggle("on", p === id);
    }
    const nb = document.getElementById("n-" + p);
    if (nb) {
      nb.classList.toggle("on", p === id);
    }
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
  observe();
}

window.go = go;

function observe() {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
        }
      });
    },
    { threshold: 0.1 }
  );

  document.querySelectorAll(".rv:not(.in)").forEach((el) => io.observe(el));
}

async function postJson(url, payload, retries = 1) {
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        return { ok: true, status: response.status };
      }

      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
  }

  return {
    ok: false,
    status: 0,
    error: lastError ? lastError.message : "Unknown request error"
  };
}

function apiUrl(path) {
  return `${apiBaseUrl}${path}`;
}

async function loadApiConfig() {
  try {
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      const response = await fetch("/api/config");
      if (response.ok) {
        const data = await response.json();
        if (data && typeof data.apiBaseUrl === "string" && data.apiBaseUrl.trim()) {
          apiBaseUrl = data.apiBaseUrl.replace(/\/$/, "");
        }
      }
      return;
    }

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

function currentPageId() {
  const active = document.querySelector(".pg.on");
  return active ? active.id.replace("pg-", "") : "unknown";
}

function logButtonClick(label, details) {
  postJson(apiUrl("/api/action"), {
    actionType: "button_click",
    label,
    page: currentPageId(),
    details: details || {}
  }).catch(() => {
    // Ignore non-critical analytics failures.
  });
}

function setContactPrefill(subject, message) {
  const subjectSelect = document.getElementById("contact-subject");
  const messageInput = document.getElementById("contact-message");

  if (subjectSelect) {
    const matchOption = Array.from(subjectSelect.options).find(
      (opt) => opt.textContent.trim() === subject
    );
    if (matchOption) {
      subjectSelect.value = matchOption.value;
    }
  }

  if (messageInput && !messageInput.value.trim()) {
    messageInput.value = message;
  }
}

function wireEventButtons() {
  document.querySelectorAll(".ev-acts .btn-sm").forEach((button) => {
    button.addEventListener("click", () => {
      const card = button.closest(".ev-card");
      const title = card ? card.querySelector(".ev-t")?.textContent.trim() : "Event";
      const actionLabel = button.textContent.trim();

      logButtonClick(actionLabel, { eventTitle: title });
      go("contact");
      setContactPrefill("Event Information", `I am interested in: ${title} (${actionLabel}).`);
      alert("Great! Please complete the contact form and our team will get in touch.");
    });
  });
}

function wireDonationButtons() {
  document.querySelectorAll(".tier .btn").forEach((button) => {
    button.addEventListener("click", () => {
      const tier = button.closest(".tier");
      const tierName = tier ? tier.querySelector(".tier-name")?.textContent.trim() : "General";
      const amount = tier ? tier.querySelector(".tier-amt")?.textContent.trim() : "";
      const label = button.textContent.trim();

      logButtonClick(label, { tierName, amount });
      go("contact");
      setContactPrefill(
        "Donation / Support",
        `I want to proceed with ${tierName}${amount ? " (" + amount + ")" : ""}.`
      );
      alert("Thank you for your support. Please submit the contact form to continue.");
    });
  });
}

function wireGenericTracking() {
  document.querySelectorAll("button").forEach((button) => {
    if (button.closest(".ev-acts") || button.closest(".tier") || button.classList.contains("f-btn")) {
      return;
    }

    button.addEventListener("click", () => {
      const label = button.textContent.replace(/\s+/g, " ").trim();
      if (!label) {
        return;
      }
      logButtonClick(label);
    });
  });
}

function wireEventFilter() {
  const cards = Array.from(document.querySelectorAll(".ev-card"));

  document.querySelectorAll(".f-btn").forEach((button) => {
    button.addEventListener("click", function () {
      const label = this.textContent.trim().toLowerCase();
      this.closest(".f-wrap").querySelectorAll(".f-btn").forEach((x) => x.classList.remove("on"));
      this.classList.add("on");

      cards.forEach((card) => {
        const badge = card.querySelector(".ev-badge")?.textContent.trim().toLowerCase() || "";
        const shouldShow = label === "all" || badge === label;
        card.style.display = shouldShow ? "grid" : "none";
      });

      logButtonClick("Filter: " + this.textContent.trim());
    });
  });
}

function wireContactSubmission() {
  const submitButton = document.getElementById("contact-submit");
  if (!submitButton) {
    return;
  }

  submitButton.addEventListener("click", async () => {
    const name = document.getElementById("contact-name")?.value.trim() || "";
    const phone = document.getElementById("contact-phone")?.value.trim() || "";
    const email = document.getElementById("contact-email")?.value.trim() || "";
    const subject = document.getElementById("contact-subject")?.value.trim() || "Other";
    const message = document.getElementById("contact-message")?.value.trim() || "";

    if (!name || !phone || !message) {
      alert("Please fill Name, Phone Number, and Message before sending.");
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Sending...";

    const result = await postJson(apiUrl("/api/contact"), {
      name,
      phone,
      email,
      subject,
      message
    }, 2);

    if (result.ok) {
      alert("Your message has been sent successfully. We will get back to you soon.");
      document.getElementById("contact-name").value = "";
      document.getElementById("contact-phone").value = "";
      document.getElementById("contact-email").value = "";
      document.getElementById("contact-subject").selectedIndex = 0;
      document.getElementById("contact-message").value = "";
    } else {
      console.error("Contact submit failed:", result);
      alert("Unable to send right now. Please wait 10 seconds and try again.");
    }

    submitButton.disabled = false;
    submitButton.textContent = "📨 Send Message";
  });
}

loadApiConfig().finally(() => {
  wireEventFilter();
  wireEventButtons();
  wireDonationButtons();
  wireGenericTracking();
  wireContactSubmission();
  observe();
});
