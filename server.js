const express = require("express");
const { Pool } = require("pg");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://localhost/raabta",
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
});

app.use(express.json());
app.use(express.static(__dirname));

async function initDatabase() {
  try {
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

    console.log("Database tables initialized");
  } catch (error) {
    console.error("Database init error:", error.message);
  }
}

app.post("/api/action", async (req, res) => {
  try {
    const { actionType, label, page, details } = req.body || {};
    await pool.query(
      "INSERT INTO actions (action_type, label, page, details) VALUES ($1, $2, $3, $4)",
      [actionType || "button_click", label || "unknown", page || "unknown", JSON.stringify(details || {})]
    );
    res.status(201).json({ ok: true, message: "Action logged" });
  } catch (error) {
    console.error("Action log error:", error.message);
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

    await pool.query(
      "INSERT INTO contacts (name, phone, email, subject, message) VALUES ($1, $2, $3, $4, $5)",
      [name, phone, email || "", subject || "Other", message]
    );

    res.status(201).json({ ok: true, message: "Message submitted successfully" });
  } catch (error) {
    console.error("Contact submit error:", error.message);
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

app.get("/api/admin/contacts", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM contacts ORDER BY created_at DESC LIMIT 100");
    res.json({ ok: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ ok: false, message: "Failed to fetch contacts" });
  }
});

app.get("/api/admin/actions", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM actions ORDER BY created_at DESC LIMIT 200");
    res.json({ ok: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ ok: false, message: "Failed to fetch actions" });
  }
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "raabta-backend" });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

initDatabase().then(() => {
  app.listen(port, () => {
    console.log(`Raabta app running on http://localhost:${port}`);
  });
});
