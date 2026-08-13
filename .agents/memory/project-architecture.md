---
name: Project Architecture
description: Multi-brand Telegram Mailer Engine — overall system design decisions
---

## System overview
- **Primary admin UI**: Telegram bot with inline keyboards (conversation state machine)
- **Secondary admin UI**: React web panel (templates CRUD, brands, logs, compose)
- **Delivery channel**: HTML emails via SMTP (NOT Telegram messages to end recipients)
- **Bot role**: Admin picks brand → template → fills variables → previews HTML → dispatches email

## Key files
- Bot handlers: `artifacts/api-server/src/lib/bot-handlers.ts`
- Email service: `artifacts/api-server/src/lib/email.ts`
- Template renderer: `artifacts/api-server/src/lib/telegram.ts` (renderTemplate, flattenBrandContext)

## Brand variable flattening
Brand fields are flattened before template substitution: `brand.primaryColor` → `{{brand_primary_color}}`.
Email templates use flat variables like `{{brand_name}}`, `{{brand_primary_color}}`, `{{brand_card_bg}}`.

## DB tables
- `brands` — 18 seeded brands (crypto, banking_uk, banking_us, banking_aus, institution)
- `templates` — has emailSubject, emailContent, brandKey columns added
- `email_dispatches` — logs every email attempt from bot or web panel
- `notification_logs` — Telegram message send history

**Why:** The spec (5-part architecture document) revealed the system sends real HTML emails; Telegram is the admin control panel, not the end-user delivery channel.

**How to apply:** When adding new delivery features, maintain bot as primary flow and web panel as secondary. Email templates use `{{brand_*}}` flat variables.
