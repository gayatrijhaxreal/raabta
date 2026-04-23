# Raabta Foundation - Full Deployment Guide

This guide is written so you can deploy, update, and migrate this project on your own even if chat history is gone.

## 1) Project Overview

This project has:

- Frontend: static files (`index.html`, `style.css`, `main.js`, `admin.html`, `admin.css`, `admin.js`)
- Backend: Node + Express API (`server.js`)
- Data storage:
  - Production: PostgreSQL (Render)
  - Local fallback: JSON files in `data/`

Current production links:

- Website: https://gayatrijhaxreal.github.io/raabta/
- Admin: https://gayatrijhaxreal.github.io/raabta/admin.html
- Backend health: https://raabta-foundation.onrender.com/health

## 2) Requirements

- Node.js 20+
- Git
- GitHub account
- Render account

## 3) Local Setup

Run in project root:

```bash
npm install
npm start
```

Open:

- http://localhost:3000
- http://localhost:3000/admin.html

Notes:

- In local mode, the app uses JSON files under `data/`.
- In production mode (`NODE_ENV=production`), the app uses PostgreSQL.

## 4) Environment Variables

Use these on Render backend service:

- `NODE_ENV=production`
- `DATABASE_URL` (from Render PostgreSQL)
- `ADMIN_TOKEN` (strong random secret)
- `PUBLIC_API_BASE_URL` (optional, usually `https://raabta-foundation.onrender.com`)

Why each variable matters:

- `DATABASE_URL`: enables Postgres reads/writes
- `ADMIN_TOKEN`: protects `/api/admin/*` endpoints
- `PUBLIC_API_BASE_URL`: controls API base URL returned by `/api/config`

## 5) Backend Deploy on Render

### Option A: Use existing service

1. Push latest code to GitHub `main` branch.
2. Open Render dashboard.
3. Open service: `raabta-foundation`.
4. Confirm settings:
   - Build command: `npm install`
   - Start command: `npm start`
   - Health path: `/health`
5. Confirm env vars are set.
6. Trigger redeploy (or auto-deploy runs after push).

### Option B: One-click from repo

Use:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/gayatrijhaxreal/raabta)

Render reads `render.yaml` and creates:

- Web service `raabta-foundation`
- PostgreSQL database `raabta-db`

## 6) Frontend Deploy on GitHub Pages

1. Push latest code to GitHub `main` branch.
2. In GitHub repo, go to Settings -> Pages.
3. Source:
   - Deploy from branch
   - Branch: `main`
   - Folder: `/ (root)`
4. Save and wait for publish.

Main files served directly from root.

## 7) Standard Update Workflow

Use this every time you change site content/design/code:

```bash
git status --short
git add .
git commit -m "Describe your update"
git push origin main
```

After push:

- GitHub Pages updates frontend
- Render auto-deploy updates backend

## 8) Post-Deploy Verification Checklist

### A. Site checks

- Home page opens
- About page design loads correctly
- Shop page products, cart, checkout render
- Contact page shows correct address

### B. API checks

- `GET /health` returns OK
- Contact form submit works
- Order submit works

### C. Admin security checks

- `GET /api/admin/contacts` without token returns 401 (if `ADMIN_TOKEN` set)
- Same endpoint with valid token returns data

### D. Admin page checks

- `admin.html` opens
- Token login works
- Contact records load

## 9) Important API Endpoints

Public:

- `POST /api/contact`
- `POST /api/order`
- `POST /api/action`
- `GET /api/config`
- `GET /health`

Admin (token-protected when `ADMIN_TOKEN` is set):

- `GET /api/admin/contacts`
- `GET /api/admin/orders`
- `GET /api/admin/actions`

## 10) CORS and Domain Notes

Backend CORS currently allows:

- `https://gayatrijhaxreal.github.io`
- `http://localhost:3000`
- `http://127.0.0.1:3000`

If frontend domain changes, update allowed origins in `server.js` and redeploy backend.

## 11) Change Domain Later (Safe Procedure)

Yes, you can change domain later.

Do this:

1. Buy/add new domain in registrar.
2. Point DNS to frontend host (GitHub Pages or new provider).
3. Add custom domain in hosting settings.
4. Enable SSL certificate.
5. Update backend CORS origins (`server.js`).
6. Confirm `PUBLIC_API_BASE_URL` is correct.
7. Test contact + order + admin flow end-to-end.

## 12) Change Hosting Later (Safe Procedure)

Yes, you can migrate hosting later.

Minimum migration steps:

1. Deploy backend on new platform.
2. Attach Postgres DB or migrate DB.
3. Set env vars (`NODE_ENV`, `DATABASE_URL`, `ADMIN_TOKEN`, `PUBLIC_API_BASE_URL`).
4. Update frontend API base if needed.
5. Verify SSL and CORS.
6. Run full production smoke test.

## 13) Backup and Recovery

Before major changes:

1. Export database backup.
2. Create git commit.
3. Tag release.

Example:

```bash
git add .
git commit -m "Pre-migration backup point"
git tag pre-migration-YYYY-MM-DD
git push origin main --tags
```

Rollback approach:

1. Find stable commit.
2. Revert problematic commit(s) with `git revert`.
3. Push again.

## 14) Troubleshooting

### Problem: Contact form fails from live site

Check:

- Backend is up (`/health`)
- HTTPS is used
- CORS origin includes current frontend domain

### Problem: Admin API returns unauthorized

Check:

- `ADMIN_TOKEN` is set in Render
- Same token is entered in admin page
- Header sent as `x-admin-token`

### Problem: Orders fail with server error

Check:

- `DATABASE_URL` exists and DB is reachable
- Render deploy completed successfully
- Backend logs for SQL/schema errors

## 15) Client Handover Files

Business docs are in:

- `docs/client-kit/01-client-proposal-template.md`
- `docs/client-kit/02-client-handover-checklist.md`
- `docs/client-kit/03-pricing-packages-template.md`

Use these for proposals, sign-off, and pricing negotiation.

## 16) Quick Command Reference

Install dependencies:

```bash
npm install
```

Run locally:

```bash
npm start
```

Check git changes:

```bash
git status --short
```

Deploy latest changes:

```bash
git add .
git commit -m "Your message"
git push origin main
```

## 17) Ownership and Security Best Practice

Before final client handover:

1. Rotate `ADMIN_TOKEN`.
2. Transfer domain and hosting ownership to client.
3. Enable 2FA on all client-owned accounts.
4. Share only required credentials.
5. Keep a signed handover acknowledgement.

---

If you follow this README step-by-step, you can deploy and maintain this project independently at any time.
