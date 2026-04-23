const pages = ["home", "intro", "about", "work", "events", "shop", "support", "contact", "terms"];
const defaultApiBaseUrl = "https://raabta-foundation.onrender.com";
let apiBaseUrl = defaultApiBaseUrl;
const cartState = [];

const shopCatalog = [
  {
    id: "tote-bag",
    name: "Raabta Canvas Tote Bag",
    price: 499,
    description: "Reusable hand-printed tote made by women self-help groups.",
    emoji: "👜"
  },
  {
    id: "seed-kit",
    name: "Urban Seed Starter Kit",
    price: 699,
    description: "Grow-at-home herb and greens starter kit with guide.",
    emoji: "🌱"
  },
  {
    id: "community-shirt",
    name: "Raabta Community T-Shirt",
    price: 899,
    description: "Premium cotton support tee. Every purchase funds youth workshops.",
    emoji: "👕"
  }
];

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

function formatInr(amount) {
  return `Rs ${Number(amount).toLocaleString("en-IN")}`;
}

function findProductById(productId) {
  return shopCatalog.find((item) => item.id === productId);
}

function getCartTotal() {
  return cartState.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function renderCart() {
  const cartItemsEl = document.getElementById("shop-cart-items");
  const cartTotalEl = document.getElementById("shop-cart-total");
  if (!cartItemsEl || !cartTotalEl) {
    return;
  }

  if (cartState.length === 0) {
    cartItemsEl.innerHTML = "<p class=\"shop-empty\">Your cart is empty. Add products to continue.</p>";
    cartTotalEl.textContent = formatInr(0);
    return;
  }

  cartItemsEl.innerHTML = cartState.map((item) => `
    <div class="shop-cart-item">
      <div>
        <div class="shop-cart-title">${item.name}</div>
        <div class="shop-cart-meta">Qty ${item.qty} x ${formatInr(item.price)}</div>
      </div>
      <button class="shop-remove" data-remove-item="${item.id}">Remove</button>
    </div>
  `).join("");

  cartTotalEl.textContent = formatInr(getCartTotal());
}

function addToCart(productId) {
  const product = findProductById(productId);
  if (!product) {
    return;
  }

  const existing = cartState.find((item) => item.id === productId);
  if (existing) {
    existing.qty += 1;
  } else {
    cartState.push({ ...product, qty: 1 });
  }

  renderCart();
}

function removeFromCart(productId) {
  const index = cartState.findIndex((item) => item.id === productId);
  if (index >= 0) {
    cartState.splice(index, 1);
  }
  renderCart();
}

function renderShopProducts() {
  const productGrid = document.getElementById("shop-products");
  if (!productGrid) {
    return;
  }

  productGrid.innerHTML = shopCatalog.map((item) => `
    <div class="card shop-card">
      <div class="shop-emoji">${item.emoji}</div>
      <div class="c-t">${item.name}</div>
      <p class="c-p">${item.description}</p>
      <div class="shop-card-foot">
        <strong>${formatInr(item.price)}</strong>
        <button class="btn btn-navy shop-add-btn" data-add-item="${item.id}">Add to Cart</button>
      </div>
    </div>
  `).join("");
}

function getOrderPayload() {
  const name = document.getElementById("order-name")?.value.trim() || "";
  const phone = document.getElementById("order-phone")?.value.trim() || "";
  const email = document.getElementById("order-email")?.value.trim() || "";
  const paymentMethod = document.getElementById("order-payment")?.value.trim() || "UPI";
  const address = document.getElementById("order-address")?.value.trim() || "";
  const notes = document.getElementById("order-notes")?.value.trim() || "";

  return {
    name,
    phone,
    email,
    paymentMethod,
    address,
    notes,
    items: cartState.map((item) => ({
      productId: item.id,
      name: item.name,
      unitPrice: item.price,
      quantity: item.qty,
      lineTotal: item.price * item.qty
    })),
    totalAmount: getCartTotal()
  };
}

function clearOrderForm() {
  ["order-name", "order-phone", "order-email", "order-address", "order-notes"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.value = "";
    }
  });
  const paymentEl = document.getElementById("order-payment");
  if (paymentEl) {
    paymentEl.selectedIndex = 0;
  }
}

function wireShop() {
  const productGrid = document.getElementById("shop-products");
  const cartItemsEl = document.getElementById("shop-cart-items");
  const submitOrderButton = document.getElementById("order-submit");
  if (!productGrid || !cartItemsEl || !submitOrderButton) {
    return;
  }

  renderShopProducts();
  renderCart();

  productGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-add-item]");
    if (!button) {
      return;
    }
    const productId = button.getAttribute("data-add-item");
    addToCart(productId);
    logButtonClick("Add To Cart", { productId });
  });

  cartItemsEl.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-item]");
    if (!button) {
      return;
    }
    const productId = button.getAttribute("data-remove-item");
    removeFromCart(productId);
    logButtonClick("Remove From Cart", { productId });
  });

  submitOrderButton.addEventListener("click", async () => {
    if (cartState.length === 0) {
      alert("Please add at least one product to cart.");
      return;
    }

    const payload = getOrderPayload();
    if (!payload.name || !payload.phone || !payload.address) {
      alert("Please fill Name, Phone Number, and Delivery Address.");
      return;
    }

    submitOrderButton.disabled = true;
    submitOrderButton.textContent = "Placing Order...";

    const result = await postJson(apiUrl("/api/order"), payload, 1);
    if (result.ok) {
      alert("Order placed successfully. Our team will contact you for confirmation.");
      cartState.splice(0, cartState.length);
      renderCart();
      clearOrderForm();
    } else {
      alert("Unable to place order right now. Please try again in a moment.");
    }

    submitOrderButton.disabled = false;
    submitOrderButton.textContent = "Place Order";
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
  wireShop();
  observe();
});
