---
name: Bot Token 404 Issue
description: TELEGRAM_BOT_TOKEN returns 404 from Telegram API — graceful disable pattern
---

## Symptom
`ETELEGRAM: 404 Not Found` on both `deleteWebhook` and `getMe` calls at startup.
This means the saved TELEGRAM_BOT_TOKEN is invalid or revoked.

## Current behavior
`src/index.ts` calls `bot.getMe()` after deleting webhook. If it throws, bot handlers are NOT registered and polling is stopped. Server continues running normally; API routes still work.

**Why:** 404 from getUpdates/getMe always means invalid token (webhook conflict returns 409). The user must re-check their BotFather token.

**How to apply:** Do not remove the graceful-disable logic in index.ts. When user fixes the token, the bot will activate automatically on next restart.
