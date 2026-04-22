const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;
const dataDir = path.join(__dirname, "data");
const actionsFile = path.join(dataDir, "actions.json");
const contactsFile = path.join(dataDir, "contacts.json");

app.use(express.json());
app.use(express.static(__dirname));

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
  const content = fs.readFileSync(filePath, "utf8");
  const parsed = JSON.parse(content);
  parsed.push(record);
  fs.writeFileSync(filePath, JSON.stringify(parsed, null, 2), "utf8");
}

app.post("/api/action", (req, res) => {
  try {
    ensureStorage();
    const { actionType, label, page, details } = req.body || {};
    appendRecord(actionsFile, {
      actionType: actionType || "button_click",
      label: label || "unknown",
      page: page || "unknown",
      details: details || {},
      createdAt: new Date().toISOString()
    });
    res.status(201).json({ ok: true, message: "Action logged" });
  } catch (error) {
    res.status(500).json({ ok: false, message: "Failed to log action" });
  }
});

app.post("/api/contact", (req, res) => {
  try {
    ensureStorage();
    const { name, phone, email, subject, message } = req.body || {};

    if (!name || !phone || !message) {
      return res.status(400).json({
        ok: false,
        message: "Name, phone, and message are required"
      });
    }

    appendRecord(contactsFile, {
      name,
      phone,
      email: email || "",
      subject: subject || "Other",
      message,
      createdAt: new Date().toISOString()
    });

    res.status(201).json({ ok: true, message: "Message submitted successfully" });
  } catch (error) {
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

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "raabta-backend" });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(port, () => {
  console.log(`Raabta app running on http://localhost:${port}`);
});
