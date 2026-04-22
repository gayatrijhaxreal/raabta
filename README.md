# Raabta Foundation Deployment

## One-Click Deploy on Render

Use this button after pushing your latest code to GitHub:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/gayatrijhaxreal/raabta)

Render will use `render.yaml` automatically.

## API URL Wiring

Frontend calls are wired through `/api/config`.

- If `PUBLIC_API_BASE_URL` is set in Render, frontend will use that value.
- If not set, frontend defaults to same-origin API (recommended for this project).

## Required Render Settings

1. Build Command: `npm install`
2. Start Command: `npm start`
3. Health Check Path: `/health`

## Local Run

```bash
npm install
npm start
```

Open `http://localhost:3000`.
