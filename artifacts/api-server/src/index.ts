import app from "./app";
import { logger } from "./lib/logger";
import { bot } from "./lib/telegram";
import { registerBotHandlers } from "./lib/bot-handlers";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, async (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Start Telegram bot handlers once the server is up
  if (bot) {
    try {
      // Clear any existing webhook to enable polling
      await bot.deleteWebHook({ drop_pending_updates: true });
      logger.info("Telegram webhook cleared");
    } catch {
      // Non-fatal — webhook may not have been set
    }

    // Verify token is valid before enabling handlers
    try {
      const me = await bot.getMe();
      registerBotHandlers(bot);
      logger.info({ username: me.username }, "Telegram bot active");
    } catch (err) {
      logger.error({ err }, "Telegram bot token invalid or API unreachable — bot commands disabled");
      // Stop polling to avoid log spam
      try { bot.stopPolling(); } catch { /* ignore */ }
    }
  } else {
    logger.warn("Telegram bot not started — TELEGRAM_BOT_TOKEN not set");
  }
});
