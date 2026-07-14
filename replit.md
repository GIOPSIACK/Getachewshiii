# Gech EV Makina Ekub

A lottery/"ekub" style app where users buy tickets for a chance to win vehicles (EVs); tracks active campaigns, ticket sales, and draws.

## Run & Operate

- First-time setup after importing/cloning: run `pnpm install` at the workspace root, then `pnpm --filter @workspace/db run push` to create the `campaigns`/`tickets` tables in the (empty) Postgres database — the app returns 500s from `/api/campaigns` until this has been run.
- `pnpm --filter @workspace/gech-ev run dev` — run the web frontend (artifact `gech-ev`, workflow `artifacts/gech-ev: web`)
- `pnpm --filter @workspace/api-server run dev` — run the API server (artifact `api-server`, workflow `artifacts/api-server: API Server`, port 8080)
- `pnpm --filter @workspace/mockup-sandbox run dev` — canvas component preview server
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (already provisioned)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
