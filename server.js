require("dotenv").config();

const express = require("express");
const fs = require("fs");
const path = require("path");

const { Pool } = require("pg");

const app = express();
const port = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === "production";

app.set("trust proxy", 1);

const dataDir = path.join(__dirname, "data");
const actionsFile = path.join(dataDir, "actions.json");
const contactsFile = path.join(dataDir, "contacts.json");
const ordersFile = path.join(dataDir, "orders.json");

let pool = null;

if (isProduction) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
}

app.use(express.json());
app.use(express.static(__dirname));

const allowedOrigins = new Set([
  "https://gayatrijhaxreal.github.io",
  "http://localhost:3000",
  "http://127.0.0.1:3000"
]);

app.use((req, res, next) => {
  const origin = req.get("Origin");
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,x-admin-token,authorization");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  return next();
});

function requireAdminAuth(req, res, next) {
  const configuredToken = process.env.ADMIN_TOKEN;
  if (!configuredToken) {
    return next();
  }

  const headerToken = req.get("x-admin-token");
  const bearerToken = (req.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const provided = headerToken || bearerToken;

  if (provided !== configuredToken) {
    return res.status(401).json({ ok: false, message: "Unauthorized" });
  }

  return next();
}

function ensureStorage() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(actionsFile)) {
    fs.writeFileSync(actionsFile, "[]", "utf8");
  }

  if (!fs.existsSync(contactsFile)) {
    fs.writeFileSync(contactsFile, "[]", "utf8");
  }

  if (!fs.existsSync(ordersFile)) {
    fs.writeFileSync(ordersFile, "[]", "utf8");
  }
}

function appendRecord(filePath, record) {
  const current = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(current);
  data.push(record);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

async function initDatabase() {
  if (!isProduction) {
    ensureStorage();
    console.log("Local storage initialized (JSON files)");
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS actions (
      id SERIAL PRIMARY KEY,
      action_type VARCHAR(50) NOT NULL,
      label VARCHAR(255),
      page VARCHAR(100),
      details JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS contacts (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(20) NOT NULL,
      email VARCHAR(255),
      subject VARCHAR(255),
      message TEXT NOT NULL,
      status VARCHAR(40) DEFAULT 'New',
      admin_note TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      customer_name VARCHAR(255) NOT NULL,
      phone VARCHAR(20) NOT NULL,
      email VARCHAR(255),
      payment_method VARCHAR(80) NOT NULL,
      address TEXT NOT NULL,
      notes TEXT,
      items JSONB NOT NULL,
      total_amount NUMERIC(12,2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);`);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS phone VARCHAR(20);`);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS email VARCHAR(255);`);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(80);`);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS address TEXT;`);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT;`);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS items JSONB;`);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12,2);`);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);
  await pool.query(`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS status VARCHAR(40) DEFAULT 'New';`);
  await pool.query(`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS admin_note TEXT DEFAULT '';`);

  console.log("Database initialized (Postgres)");
}

app.post("/api/action", async (req, res) => {
  try {
    const { actionType, label, page, details } = req.body || {};

    if (isProduction) {
      await pool.query(
        "INSERT INTO actions (action_type, label, page, details) VALUES ($1, $2, $3, $4)",
        [actionType || "button_click", label || "unknown", page || "unknown", details || {}]
      );
    } else {
      ensureStorage();
      appendRecord(actionsFile, {
        actionType: actionType || "button_click",
        label: label || "unknown",
        page: page || "unknown",
        details: details || {},
        createdAt: new Date().toISOString()
      });
    }

    res.status(201).json({ ok: true, message: "Action logged" });
  } catch (error) {
    console.error("Action log error:", error);
    res.status(500).json({ ok: false, message: "Failed to log action" });
  }
});

app.post("/api/contact", async (req, res) => {
  try {
    const { name, phone, email, subject, message } = req.body || {};

    if (!name || !phone || !message) {
      return res.status(400).json({
        ok: false,
        message: "Name, phone, and message are required"
      });
    }

    if (isProduction) {
      await pool.query(
        "INSERT INTO contacts (name, phone, email, subject, message) VALUES ($1, $2, $3, $4, $5)",
        [name, phone, email || "", subject || "Other", message]
      );
    } else {
      ensureStorage();
      appendRecord(contactsFile, {
        name,
        phone,
        email: email || "",
        subject: subject || "Other",
        message,
        createdAt: new Date().toISOString()
      });
    }

    res.status(201).json({ ok: true, message: "Message submitted successfully" });
  } catch (error) {
    console.error("Contact submit error:", error);
    res.status(500).json({ ok: false, message: "Failed to submit message" });
  }
});

app.post("/api/order", async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      paymentMethod,
      address,
      notes,
      items,
      totalAmount
    } = req.body || {};

    if (!name || !phone || !address || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        ok: false,
        message: "Name, phone, address and at least one cart item are required"
      });
    }

    if (isProduction) {
      await pool.query(
        "INSERT INTO orders (customer_name, phone, email, payment_method, address, notes, items, total_amount) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::numeric)",
        [
          name,
          phone,
          email || "",
          paymentMethod || "UPI",
          address,
          notes || "",
          JSON.stringify(items),
          Number(totalAmount || 0)
        ]
      );
    } else {
      ensureStorage();
      appendRecord(ordersFile, {
        name,
        phone,
        email: email || "",
        paymentMethod: paymentMethod || "UPI",
        address,
        notes: notes || "",
        items,
        totalAmount: Number(totalAmount || 0),
        createdAt: new Date().toISOString()
      });
    }

    return res.status(201).json({ ok: true, message: "Order placed successfully" });
  } catch (error) {
    console.error("Order submit error:", error);
    return res.status(500).json({ ok: false, message: "Failed to place order" });
  }
});

app.get("/api/config", (req, res) => {
  const configuredBase = process.env.PUBLIC_API_BASE_URL;
  const forwardedProto = req.get("x-forwarded-proto");
  const proto = (forwardedProto || req.protocol || "https").split(",")[0].trim();
  const normalizedProto = isProduction ? "https" : proto;
  const requestOrigin = `${normalizedProto}://${req.get("host")}`;

  res.json({
    ok: true,
    apiBaseUrl: configuredBase || requestOrigin
  });
});

app.get("/api/admin/contacts", requireAdminAuth, async (_req, res) => {
  try {
    const queryText = (_req.query.q || "").toString().trim();
    const statusFilter = (_req.query.status || "all").toString().trim();

    if (isProduction) {
      const params = [];
      let whereClause = "";

      if (queryText) {
        params.push(`%${queryText}%`);
        whereClause += ` WHERE (name ILIKE $${params.length} OR phone ILIKE $${params.length} OR email ILIKE $${params.length} OR subject ILIKE $${params.length} OR message ILIKE $${params.length})`;
      }

      if (statusFilter && statusFilter.toLowerCase() !== "all") {
        params.push(statusFilter);
        whereClause += whereClause ? ` AND status = $${params.length}` : ` WHERE status = $${params.length}`;
      }

      const result = await pool.query(`SELECT * FROM contacts${whereClause} ORDER BY created_at DESC LIMIT 300`, params);
      res.json({ ok: true, data: result.rows });
      return;
    }

    ensureStorage();
    const content = fs.readFileSync(contactsFile, "utf8");
    const rawItems = JSON.parse(content);
    const normalizedItems = rawItems.map((item, index) => ({
      id: item.id || index + 1,
      ...item,
      status: item.status || "New",
      admin_note: item.admin_note || ""
    }));

    const filtered = normalizedItems.filter((item) => {
      const matchesStatus = statusFilter.toLowerCase() === "all" || (item.status || "New") === statusFilter;
      if (!matchesStatus) {
        return false;
      }

      if (!queryText) {
        return true;
      }

      const haystack = `${item.name || ""} ${item.phone || ""} ${item.email || ""} ${item.subject || ""} ${item.message || ""}`.toLowerCase();
      return haystack.includes(queryText.toLowerCase());
    });

    res.json({ ok: true, data: filtered.reverse().slice(0, 300) });
  } catch (error) {
    console.error("Failed to fetch contacts:", error);
    res.status(500).json({ ok: false, message: "Failed to fetch contacts" });
  }
});

app.patch("/api/admin/contacts/:id", requireAdminAuth, async (req, res) => {
  try {
    const recordId = Number(req.params.id);
    const { status, adminNote } = req.body || {};
    const safeStatus = (status || "New").toString().slice(0, 40);
    const safeNote = (adminNote || "").toString().slice(0, 3000);

    if (!recordId || Number.isNaN(recordId)) {
      return res.status(400).json({ ok: false, message: "Invalid contact id" });
    }

    if (isProduction) {
      const result = await pool.query(
        "UPDATE contacts SET status = $1, admin_note = $2 WHERE id = $3 RETURNING id, status, admin_note",
        [safeStatus, safeNote, recordId]
      );

      if (!result.rowCount) {
        return res.status(404).json({ ok: false, message: "Contact not found" });
      }

      return res.json({ ok: true, data: result.rows[0] });
    }

    ensureStorage();
    const content = fs.readFileSync(contactsFile, "utf8");
    const items = JSON.parse(content);
    const index = items.findIndex((item, idx) => Number(item.id || idx + 1) === recordId);

    if (index < 0) {
      return res.status(404).json({ ok: false, message: "Contact not found" });
    }

    items[index] = {
      ...items[index],
      id: items[index].id || recordId,
      status: safeStatus,
      admin_note: safeNote
    };

    fs.writeFileSync(contactsFile, JSON.stringify(items, null, 2), "utf8");
    return res.json({ ok: true, data: { id: recordId, status: safeStatus, admin_note: safeNote } });
  } catch (error) {
    console.error("Failed to update contact:", error);
    return res.status(500).json({ ok: false, message: "Failed to update contact" });
  }
});

app.get("/api/admin/actions", requireAdminAuth, async (_req, res) => {
  try {
    if (isProduction) {
      const result = await pool.query("SELECT * FROM actions ORDER BY created_at DESC LIMIT 200");
      res.json({ ok: true, data: result.rows });
      return;
    }

    ensureStorage();
    const content = fs.readFileSync(actionsFile, "utf8");
    res.json({ ok: true, data: JSON.parse(content) });
  } catch (error) {
    console.error("Failed to fetch actions:", error);
    res.status(500).json({ ok: false, message: "Failed to fetch actions" });
  }
});

app.get("/api/admin/orders", requireAdminAuth, async (_req, res) => {
  try {
    const queryText = (_req.query.q || "").toString().trim();

    if (isProduction) {
      if (!queryText) {
        const result = await pool.query("SELECT * FROM orders ORDER BY created_at DESC LIMIT 300");
        res.json({ ok: true, data: result.rows });
        return;
      }

      const result = await pool.query(
        "SELECT * FROM orders WHERE customer_name ILIKE $1 OR phone ILIKE $1 OR email ILIKE $1 OR address ILIKE $1 ORDER BY created_at DESC LIMIT 300",
        [`%${queryText}%`]
      );
      res.json({ ok: true, data: result.rows });
      return;
    }

    ensureStorage();
    const content = fs.readFileSync(ordersFile, "utf8");
    const rawItems = JSON.parse(content);
    const normalizedItems = rawItems.map((item, index) => ({
      id: item.id || index + 1,
      ...item
    }));

    const filtered = !queryText
      ? normalizedItems
      : normalizedItems.filter((item) => {
          const haystack = `${item.name || ""} ${item.customer_name || ""} ${item.phone || ""} ${item.email || ""} ${item.address || ""}`.toLowerCase();
          return haystack.includes(queryText.toLowerCase());
        });

    res.json({ ok: true, data: filtered.reverse().slice(0, 300) });
  } catch (error) {
    console.error("Failed to fetch orders:", error);
    res.status(500).json({ ok: false, message: "Failed to fetch orders" });
  }
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "raabta-backend" });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

initDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`Raabta app running on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("Startup error:", error);
    process.exit(1);
  });
