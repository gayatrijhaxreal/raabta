require("dotenv").config();

const express = require("express");
const fs = require("fs");
const path = require("path");

const { Pool } = require("pg");

const app = express();
const port = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === "production";

const dataDir = path.join(__dirname, "data");
const actionsFile = path.join(dataDir, "actions.json");
const contactsFile = path.join(dataDir, "contacts.json");

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
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  return next();
});

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
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

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

app.get("/api/config", (req, res) => {
  const configuredBase = process.env.PUBLIC_API_BASE_URL;
  const requestOrigin = `${req.protocol}://${req.get("host")}`;

  res.json({
    ok: true,
    apiBaseUrl: configuredBase || requestOrigin
  });
});

app.get("/api/admin/contacts", async (_req, res) => {
  try {
    if (isProduction) {
      const result = await pool.query("SELECT * FROM contacts ORDER BY created_at DESC LIMIT 100");
      res.json({ ok: true, data: result.rows });
      return;
    }

    ensureStorage();
    const content = fs.readFileSync(contactsFile, "utf8");
    res.json({ ok: true, data: JSON.parse(content) });
  } catch (error) {
    console.error("Failed to fetch contacts:", error);
    res.status(500).json({ ok: false, message: "Failed to fetch contacts" });
  }
});

app.get("/api/admin/actions", async (_req, res) => {
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
