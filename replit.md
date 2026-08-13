# Telegram Notification Engine

A web admin panel for managing multi-brand Telegram notification templates. Lets operators create, edit, and send HTML-formatted Telegram messages using dynamic variable substitution, with full send history logs and dashboard analytics.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/admin-panel run dev` — run the admin panel (port 20130)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `TELEGRAM_BOT_TOKEN` — Telegram bot token from @BotFather

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui + React Query
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (zod/v4), drizzle-zod
- API codegen: Orval (from OpenAPI spec)
- Telegram: node-telegram-bot-api (send-only, no polling)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contracts)
- `lib/db/src/schema/templates.ts` — templates table
- `lib/db/src/schema/notification_logs.ts` — send history table
- `artifacts/api-server/src/lib/telegram.ts` — Telegram bot, renderTemplate(), extractVariables()
- `artifacts/api-server/src/routes/templates.ts` — template CRUD
- `artifacts/api-server/src/routes/notifications.ts` — send, preview, logs
- `artifacts/api-server/src/routes/stats.ts` — dashboard stats
- `artifacts/admin-panel/src/` — React frontend (pages, components)

## Architecture decisions

- **Send-only bot**: The Telegram bot is initialized without polling (`polling: false`) so it only fires outbound messages. No webhook server is needed for the current feature set.
- **Template variables**: `{{ variable }}` placeholders are substituted server-side in `renderTemplate()` before sending to the Telegram API with `parse_mode: HTML`.
- **OpenAPI-first**: All API types flow from `lib/api-spec/openapi.yaml` → codegen → typed React Query hooks + Zod validators. Never hand-write types that codegen produces.
- **integer → number in spec**: Orval with zod v3 generates `zod.int()` for OpenAPI `integer` types, which doesn't exist in v3. All integer fields in the spec use `type: number` instead.

## Product

- **Dashboard** — stats cards (total sent, failed, success rate, templates), 7-day delivery chart, recent transmission log
- **Templates** — create/edit/delete Telegram HTML templates with theme (minimalist, high-priority, custom) and category (banking, crypto, e-commerce, support)
- **Compose & Send** — select template, fill dynamic variables, enter chat ID, preview rendered HTML, send
- **Delivery Logs** — paginated send history with status badges and error details

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After any OpenAPI spec change, always run `pnpm --filter @workspace/api-spec run codegen` before touching backend routes — Orval Zod schema names vary by parameter location (QueryParams, Params, Body).
- `integer` type in OpenAPI spec causes `zod.int()` which doesn't exist in zod v3. Use `type: number` for all integer fields.
- The bot token must be set as `TELEGRAM_BOT_TOKEN` secret — if missing, sends are logged as failed but the app still runs.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
