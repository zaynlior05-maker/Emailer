import TelegramBot from "node-telegram-bot-api";
import { logger } from "./logger";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  logger.warn("TELEGRAM_BOT_TOKEN is not set — bot will not function");
}

// Use polling to receive commands and callback queries
export const bot = token ? new TelegramBot(token, { polling: true }) : null;

/**
 * Flatten a brand object into template variables (brand.primary_color → brand_primary_color)
 */
export function flattenBrandContext(brand: Record<string, unknown>): Record<string, string> {
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(brand)) {
    const key = `brand_${k.replace(/([A-Z])/g, "_$1").toLowerCase()}`;
    flat[key] = String(v ?? "");
  }
  return flat;
}

/**
 * Render template content by substituting {{ variable }} placeholders.
 * Supports flat variables: {{ recipient_name }}, {{ brand_primary_color }}, etc.
 */
export function renderTemplate(
  content: string,
  variables: Record<string, string>,
): string {
  let rendered = content;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\}\\}`, "g");
    rendered = rendered.replace(regex, value ?? "");
  }
  return rendered;
}

/**
 * Extract all {{ variable }} names from template content.
 */
export function extractVariables(content: string): string[] {
  const matches = content.matchAll(/\{\{\s*(\w+)\s*\}\}/g);
  const vars = new Set<string>();
  for (const match of matches) {
    if (!match[1].startsWith("brand_")) {
      vars.add(match[1]);
    }
  }
  return Array.from(vars);
}

/**
 * Send a Telegram HTML-formatted message to a chat.
 */
export async function sendTelegramMessage(
  chatId: string,
  html: string,
  inlineButton?: { label: string; url: string },
): Promise<number> {
  if (!bot) {
    throw new Error("Telegram bot token not configured");
  }

  const options: TelegramBot.SendMessageOptions = {
    parse_mode: "HTML",
  };

  if (inlineButton) {
    options.reply_markup = {
      inline_keyboard: [
        [{ text: inlineButton.label, url: inlineButton.url }],
      ],
    };
  }

  const msg = await bot.sendMessage(chatId, html, options);
  return msg.message_id;
}
