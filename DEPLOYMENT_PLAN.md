# Gech EV Makina Ekub — Deployment & Telegram Bot Plan

This document is the complete, beginner-friendly plan for taking the project you
downloaded (a pnpm monorepo: Vite/React frontend + Express API + Drizzle/Postgres
DB) and running it on **Vercel** with **Supabase** as the database, then turning it
into a **Telegram bot** where users register with their phone number.

I have already created the files needed to do this. This guide explains what each
piece does and the exact steps to follow.

---

## 0. Big picture (what changes, what stays the same)

| Layer        | Before (Replit)                     | After (Vercel + Supabase)                          |
|--------------|-------------------------------------|----------------------------------------------------|
| Database     | Replit Postgres                     | **Supabase Postgres** (same SQL, same Drizzle code) |
| API          | Long-running Express server (port 8080) | **Vercel Serverless Function** at `/api`        |
| Frontend     | Vite dev/preview server (port 3000) | **Vercel static hosting** (built `dist/`)          |
| Telegram bot | (none)                              | **Vercel Serverless Function** at `/api/telegram`  |

Important mental model: **Supabase is "just Postgres" plus extras.** Your existing
Drizzle code (`lib/db`) keeps talking to Postgres with the `pg` driver — you only
swap the `DATABASE_URL` to point at Supabase. Supabase also gives you Auth
(phone OTP) and Storage (file uploads) as optional extras later; you do **not**
need to rewrite your API to use them.

---

## 1. Current project map (so you know where things live)

```
Gechiyozip/                         <- repo root (pnpm workspace)
├─ artifacts/
│  ├─ gech-ev/                      <- FRONTEND (Vite + React 19)
│  │  ├─ index.html                 <- source HTML entry (Vite turns this into dist/index.html)
│  │  ├─ vite.config.ts             <- base: "/", build -> dist/
│  │  ├─ src/main.tsx               <- React entry
│  │  └─ src/pages/*                <- Home, BuyTicket, Checkout, MyTickets, Chat, Admin...
│  └─ api-server/                   <- BACKEND (Express 5)
│     ├─ src/app.ts                 <- the Express app (exported, no listen)  ★ used by Vercel
│     ├─ src/index.ts               <- starts the server (listen on PORT) — NOT used on Vercel
│     └─ src/routes/*               <- /api/campaigns, /api/tickets, /api/chat, /api/leaderboard
├─ lib/
│  ├─ db/                           <- Drizzle schema + pg Pool  ★ updated for Supabase
│  ├─ api-zod/                      <- Zod validation schemas
│  └─ api-client-react/             <- generated hooks the frontend uses to call /api/*
├─ scripts/  pnpm-workspace.yaml  package.json
├─ api/                             <- ★ NEW: Vercel Serverless Functions
│  ├─ index.ts                      <- wraps the Express app (your API on Vercel)
│  └─ telegram.ts                   <- ★ NEW: Telegram bot webhook
├─ supabase/schema.sql              <- ★ NEW: SQL to create tables in Supabase
├─ vercel.json                      <- ★ NEW: Vercel build + routing config
└─ .env.example                     <- ★ NEW: list of environment variables
```

**About the "root HTML file" you asked about:** the file Vercel actually serves is
`artifacts/gech-ev/dist/index.html` — the *built* output. You never move
`artifacts/gech-ev/index.html`; Vite reads it and produces the bundled version in
`dist/`. `vercel.json` tells Vercel the output lives in `artifacts/gech-ev/dist`,
so Vercel serves that folder as the website. The source `index.html` stays put.

---

## 2. Supabase setup (from zero, step by step)

1. **Create an account** at https://supabase.com and click **New project**.
   - Pick a region close to your users (for Ethiopia, `eu-central-1` Frankfurt or
     `ap-southeast-1` Singapore are common choices).
   - Choose a strong DB password and **save it** — you need it for `DATABASE_URL`.
   - Free tier is fine to start.

2. **Get your database connection strings.**
   Go to **Project → Settings → Database → Connection string**.
   You will use the **URI** form. There are two variants:
   - **Direct** (port `5432`): use this for `drizzle-kit push` (schema creation).
   - **Transaction pooler** (port `6543`, the URL ends with `?pgbouncer=true`):
     use this as the runtime `DATABASE_URL` on Vercel (serverless needs pooling
     to avoid exhausting connections).
   Example pooler URI:
   ```
   postgresql://postgres:PASSWORD@db.XXXX.supabase.co:6543/postgres?pgbouncer=true
   ```

3. **Create the tables.** Pick ONE method:
   - **Easiest (recommended):** run from your terminal (you already have the code):
     ```bash
     DATABASE_URL="postgresql://postgres:PASSWORD@db.XXXX.supabase.co:5432/postgres" \
       pnpm --filter @workspace/db run push
     ```
     This reads `lib/db/src/schema/*` and creates `campaigns`, `tickets`, and the
     new `registrations` table in Supabase.
   - **Or paste** `supabase/schema.sql` into the **Supabase SQL Editor** and click Run.

4. **(Optional) Seed a campaign** so the app isn't empty — run in the SQL Editor:
   ```sql
   insert into campaigns (title, description, vehicle_model, vehicle_year,
     ticket_price, total_slots, draw_date, payment_details)
   values ('BYD Yuan Up Launch', 'Win a brand new EV', 'BYD Yuan Up', 2025,
     100, 1000, now() + interval '30 days',
     '{"telebirrNumber":"123","cbeAccount":"456","accountName":"Gech EV"}');
   ```

5. **(Optional later) Supabase Auth / Storage.** You do *not* need these now. The
   bot collects the phone number itself via Telegram's contact button, and the app
   stores receipt images as base64 data URIs (no file storage required). See
   "Next steps" at the end.

---

## 3. Vercel deployment (the actual steps)

### 3a. Push your repo to GitHub (you already did this)
Make sure the new files (`vercel.json`, `api/`, `supabase/`, the DB changes) are
committed and pushed.

### 3b. Import the project in Vercel
1. Go to https://vercel.com → **Add New → Project** → import your GitHub repo.
2. Vercel should auto-detect pnpm from `pnpm-lock.yaml`. The settings come from
   `vercel.json`, but verify them:
   - **Framework Preset:** leave as "Other" / none (we set output dir explicitly).
   - **Build Command:** `pnpm --filter @workspace/gech-ev run build`
   - **Output Directory:** `artifacts/gech-ev/dist`
   - **Install Command:** `pnpm install --frozen-lockfile`
   - **Node Version:** `22.x` (set in vercel.json; also selectable in Project Settings).

### 3c. Add Environment Variables (Project → Settings → Environment Variables)
Add every variable from `.env.example`:
```
DATABASE_URL        = <Supabase pooler URI, port 6543, ?pgbouncer=true>
OPENAI_API_KEY      = <your key, or leave blank — chat just won't work>
TELEGRAM_BOT_TOKEN  = <from BotFather, set after you create the bot — see Part 4>
TELEGRAM_WEBHOOK_SECRET = <any long random string>
NODE_ENV            = production
```
Set them for **Production**, **Preview**, and **Development** so all environments work.

### 3d. Deploy
Click **Deploy**. Vercel will:
1. `pnpm install` (uses the workspace).
2. Build the frontend into `artifacts/gech-ev/dist`.
3. Detect `api/index.ts` and `api/telegram.ts` as Serverless Functions and bundle them
   (this is where it resolves your `@workspace/*` packages).

After deploy, your site is live at `https://<project>.vercel.app`.

### 3e. How routing works (why nothing 404s)
`vercel.json` contains two rewrites:
```json
{ "source": "/api/(.*)",        "destination": "/api" },          // all /api/* -> Express function
{ "source": "/((?!api/|telegram).*)", "destination": "/index.html" } // SPA fallback for the React app
```
- The frontend calls relative `/api/campaigns` etc. Those now hit the Express
  function (same origin, so no CORS/cross-origin code changes needed).
- Client-side routes (`/tickets`, `/buy/1`, …) fall back to `index.html` so the
  React router (wouter) renders them.
- The Telegram webhook lives at `/api/telegram` and is a separate function that
  takes priority over the `/api/*` rewrite.

> **If Vercel's build fails to resolve `@workspace/db`** (rare with pnpm workspaces),
> the fallback is to pre-bundle the API with esbuild into a single file. Tell me and
> I'll add `scripts/build-vercel-api.mjs` + switch `api/index.ts` to re-export that
> bundle. The setup above works in the vast majority of cases.

---

## 4. The Telegram bot (phone-number registration)

### 4a. Create the bot
1. In Telegram, message **@BotFather** → `/newbot` → choose a name + username.
2. Copy the **HTTP API token** (looks like `123456789:AA...`).
3. Put it in Vercel as `TELEGRAM_BOT_TOKEN`.
4. Set the webhook (replace values) — run this once from your terminal or a browser:
   ```
   https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<your-vercel-domain>/api/telegram
   ```
   If you set `TELEGRAM_WEBHOOK_SECRET`, also pass the header when setting the hook:
   ```
   curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<domain>/api/telegram&secret_token=<SECRET>"
   ```
   Verify with `https://api.telegram.org/bot<TOKEN>/getWebhookInfo`.

### 4b. How the bot works (file: `api/telegram.ts`)
It is a **webhook** (not polling) — perfect for Vercel, because Vercel functions are
event-driven and cannot run a forever-loop. Flow:

1. User sends `/start` → bot ensures a `registrations` row exists and shows a
   **"📱 Share my phone number"** button (`request_contact: true`).
2. User taps it → Telegram returns `message.contact.phone_number` → bot saves it to
   `registrations.phone`. **This is the phone-number registration.**
3. `/campaigns` lists active lotteries from the DB.
4. `/buy` → inline buttons let them pick a lottery → bot asks (in sequence, using
   ForceReply) for **lucky numbers → quantity → payment method → sender account**,
   then shows a **Confirm/Cancel** inline keyboard.
5. On Confirm, the bot inserts a row into `tickets` (status `pending`) and increments
   `campaigns.sold_slots` — exactly like the web app does.
6. Conversation state is persisted in `registrations.bot_state` (a JSONB column)
   because serverless functions have no memory between calls.

The bot reuses `lib/db` (same Drizzle schema), so the web admin panel and the bot
share one source of truth.

### 4c. Local testing of the bot
Run the API + a tunnel, or test the handler logic with a mock request. Simplest:
deploy to Vercel Preview, set the webhook to the preview URL, and talk to the bot.
To test the function locally you can use `vercel dev` (installs with Vercel CLI).

---

## 5. Local development (before/after deploy)

```bash
pnpm install                              # install workspace deps
cp .env.example .env                      # fill in DATABASE_URL etc.
DATABASE_URL="<supabase direct URI>" \
  pnpm --filter @workspace/db run push    # create tables in Supabase
pnpm --filter @workspace/gech-ev run dev  # frontend on :3000
pnpm --filter @workspace/api-server run dev  # API on :8080 (needs PORT=8080)
```
For a fully local DB you can run Postgres/Supabase locally; for now Supabase cloud
is the simplest. `vercel dev` lets you run the whole thing (frontend + both functions)
locally and is the best way to debug the Telegram webhook.

---

## 6. Gotchas & FAQ

- **`DATABASE_URL` must be the pooler (`:6543`, `?pgbouncer=true`) on Vercel.**
  Direct `:5432` works for `drizzle-kit push` but will exhaust connections under
  serverless load. The code in `lib/db/src/index.ts` auto-disables prepared
  statements when it detects the pooler.
- **`PORT` is not needed on Vercel.** The API function is `api/index.ts` (which
  imports `app.ts`, *not* `index.ts`). `index.ts` calls `app.listen()` and requires
  `PORT` — that's only for Replit/long-running hosts.
- **Cold starts:** the first request after idle may take ~1s while the function
  wakes and opens a DB connection. Fine for this app.
- **OpenAI chat** (`/api/chat`) streams SSE; it works on Vercel but keep
  `maxDuration: 30`. If you don't set `OPENAI_API_KEY`, that one route errors but
  everything else works.
- **pnpm `minimumReleaseAge`** in `pnpm-workspace.yaml` blocks packages published
  < 1 day ago. Normal for existing deps; only matters if you add a brand-new package.
- **Function size:** the API bundle includes `openai` + `express` + `drizzle` and is
  well under Vercel's limit. If you later hit the limit, lazy-import `openai` only
  inside the chat route.
- **Secrets:** never commit `.env`. Only `.env.example` is committed.

---

## 7. Optional next steps (when you're ready)

1. **Supabase Auth phone OTP** — let web users log in with a phone number instead of
   the current name/phone form. The bot can stay as-is or call Supabase Auth.
2. **Supabase Storage** — upload receipt images to a bucket instead of base64 data
   URIs (change `/api/receipts/upload` and the `receiptImageUrl` column).
3. **Supabase Edge Functions** — move the Telegram bot (or just the webhook
   verification) to an Edge Function if you want sub-ms cold starts and global
   regions. The logic in `api/telegram.ts` ports almost verbatim (swap `pg` for
   `@supabase/supabase-js`).
4. **Admin verification** — add a Telegram command for an admin to flip a ticket from
   `pending` → `active` (you already have `PATCH /api/tickets/:id/status`).
5. **Draws/winners** — automate the draw on `draw_date` with a Vercel Cron job.

---

## 8. Files I created/changed for you

- `vercel.json` — build + routing config.
- `api/index.ts` — Express API as a Vercel Serverless Function.
- `api/telegram.ts` — Telegram bot webhook (phone registration + ticket purchase).
- `lib/db/src/schema/registrations.ts` (+ exported in `schema/index.ts`) — bot users.
- `lib/db/src/index.ts` — pooler/`prepare:false` support for serverless.
- `supabase/schema.sql` — copy-paste table creation.
- `.env.example` — all environment variables documented.

Nothing in your existing frontend or API behavior changed — these are additive.
