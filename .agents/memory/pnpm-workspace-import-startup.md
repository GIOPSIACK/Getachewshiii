---
name: pnpm-workspace import startup
description: Fixing a freshly-imported pnpm-workspace Replit project (multiple artifacts) whose workflows fail on first run
---

When a zip-imported project already has `artifact.toml` files and a pnpm-workspace structure (web frontend, api-server, drizzle db package) but has never been run in this environment, workflow failures are usually environment setup, not code bugs:

1. `vite: command not found` / `Cannot find package 'esbuild'` across all workflows → `node_modules` was never installed. Run `pnpm install` at the workspace root once, then restart all workflows.
2. API server 500s with a Drizzle "Failed query" on a real table (e.g. `select ... from "campaigns"`) → the Postgres database is provisioned but empty; the schema was never pushed. Run `pnpm --filter @workspace/db run push` (adjust package name) before re-testing.
3. After both steps, an empty-state UI (e.g. "No Active Campaigns") is expected and correct — it means the fix worked and the DB just has no seed rows yet, not a bug.

**Why:** imported zips carry source and lockfiles but not `node_modules` or the target Postgres schema, so first-run failures look like app bugs but are actually just "finish the install" steps.
**How to apply:** on any freshly imported/failed-to-run project with multiple pnpm-workspace artifacts, check for missing `node_modules` and missing DB tables before digging into application code.
