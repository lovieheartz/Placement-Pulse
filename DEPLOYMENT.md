# Deployment Guide (Free Tier)

This project is now deployment-ready. Free stack that works 30+ days:

| Part | Host | Notes |
|------|------|-------|
| Frontend (React/Vite) | **Vercel** | Free, permanent, no sleep |
| Backend (Express + WS) | **Render** (free web service) | 750 hrs/mo, WebSockets supported. Sleeps after 15 min idle |
| Database + Storage | **Supabase** | Already configured. Free forever; pauses after ~1 week of zero activity |

---

## 0. Before you start — rotate your secrets ⚠️

Your old `server/.env` contained **live** API keys (OpenAI, Gemini, Supabase service-role, Gmail app password). If that file was ever shared, **regenerate all of them** before going public. `.env` is git-ignored, so it will not be pushed — you'll paste the new values into Render's dashboard instead.

## 1. Push to GitHub

```bash
git add -A
git commit -m "Make project deployment-ready (env-driven URLs, gitignore, configs)"
git push
```
The `.gitignore` fix now correctly includes `client/src/lib/` and `server/lib/` (previously ignored — they would have broken the build).

## 2. Deploy the backend on Render

1. Go to <https://render.com> → **New → Blueprint** → connect this repo.
   Render reads [`render.yaml`](render.yaml) automatically. (Or: **New → Web Service**, root dir `server`, build `npm install`, start `npm start`.)
2. Fill in every env var marked `sync: false` using your **new** secret values (see [`server/.env.example`](server/.env.example)).
3. Set `FRONTEND_URL` to your Vercel URL (you can update it after step 3).
4. Deploy. Note the URL, e.g. `https://placement-pulse-api.onrender.com`.
5. Visit that URL — you should see `✅ Server is up and running`.

## 3. Deploy the frontend on Vercel

1. Go to <https://vercel.com> → **Add New → Project** → import this repo.
2. Set **Root Directory** to `client`. Framework preset: **Vite** (auto-detected via [`client/vercel.json`](client/vercel.json)).
3. Add an environment variable:
   - `VITE_API_URL` = your Render backend URL (no trailing slash), e.g. `https://placement-pulse-api.onrender.com`
4. Deploy. You get a URL like `https://placement-pulse.vercel.app`.
5. Go back to Render and set `FRONTEND_URL` to this Vercel URL, then redeploy the backend.

## 4. Keep it alive for 30 days (important)

Render free **sleeps** when idle (first request after ~15 min waits ~50s), and its `node-cron` jobs won't fire while asleep. Supabase free **pauses** after ~1 week of no traffic. Fix both for free:

- Create a free monitor at <https://cron-job.org> (or UptimeRobot) that pings your Render URL (`https://…onrender.com/`) every **10 minutes**. This keeps the backend awake and keeps Supabase active.

---

## How the URL configuration works now

- All API calls read the backend origin from `VITE_API_URL` via [`client/src/config/api.js`](client/src/config/api.js) (`API_BASE`).
- WebSocket URLs derive `ws://`/`wss://` automatically from the same base (`WS_BASE`) — no separate config needed.
- Locally, with no env var set, everything falls back to `http://localhost:3001`, so `npm run dev` still works unchanged.

To point the frontend at a different backend, just change `VITE_API_URL` — no code edits.
