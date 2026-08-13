import TelegramBot from "node-telegram-bot-api";
import { db, brandsTable, templatesTable, emailDispatchesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { renderTemplate, flattenBrandContext, extractVariables } from "./telegram";
import { sendEmail } from "./email";
import { logger } from "./logger";

// ─── State machine ───────────────────────────────────────────────────────────

enum BotState {
  IDLE = "IDLE",
  SELECT_CATEGORY = "SELECT_CATEGORY",
  SELECT_BRAND = "SELECT_BRAND",
  SELECT_TEMPLATE = "SELECT_TEMPLATE",
  INPUT_EMAIL = "INPUT_EMAIL",
  INPUT_NAME = "INPUT_NAME",
  INPUT_SUBJECT = "INPUT_SUBJECT",
  INPUT_VAR = "INPUT_VAR",
  CONFIRM = "CONFIRM",
}

interface UserSession {
  state: BotState;
  selectedCategory?: string;
  selectedBrandKey?: string;
  selectedBrandName?: string;
  selectedTemplateId?: number;
  selectedTemplateName?: string;
  recipientEmail?: string;
  recipientName?: string;
  emailSubject?: string;
  variables: Record<string, string>;
  pendingVariables: string[];
  renderedHtml?: string;
}

const sessions = new Map<number, UserSession>();

function getSession(userId: number): UserSession {
  if (!sessions.has(userId)) {
    sessions.set(userId, { state: BotState.IDLE, variables: {}, pendingVariables: [] });
  }
  return sessions.get(userId)!;
}

function resetSession(userId: number): void {
  sessions.set(userId, { state: BotState.IDLE, variables: {}, pendingVariables: [] });
}

// ─── Admin guard ─────────────────────────────────────────────────────────────

function isAdmin(userId: number): boolean {
  const adminIds = process.env.TELEGRAM_ADMIN_IDS;
  if (!adminIds) return true; // open in dev if not configured
  return adminIds.split(",").map((s) => s.trim()).includes(String(userId));
}

// ─── Inline keyboards ────────────────────────────────────────────────────────

function mainMenuKeyboard(): TelegramBot.InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: "📧 Create New Email", callback_data: "nav_create_mail" }],
      [
        { text: "🎨 Manage Templates", callback_data: "nav_templates" },
        { text: "⚙️ SMTP Status", callback_data: "nav_settings" },
      ],
      [{ text: "📊 Dispatch Logs", callback_data: "nav_logs" }],
    ],
  };
}

function categoryKeyboard(): TelegramBot.InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "🪙 Crypto", callback_data: "cat_crypto" },
        { text: "🏦 UK Banks", callback_data: "cat_banking_uk" },
      ],
      [
        { text: "🏦 US Banks", callback_data: "cat_banking_us" },
        { text: "🏦 AUS Banks", callback_data: "cat_banking_aus" },
      ],
      [{ text: "🏢 Institutions", callback_data: "cat_institution" }],
      [{ text: "⬅️ Back to Main Menu", callback_data: "nav_main" }],
    ],
  };
}

function brandsKeyboard(brands: { key: string; name: string }[]): TelegramBot.InlineKeyboardMarkup {
  const rows: TelegramBot.InlineKeyboardButton[][] = [];
  for (let i = 0; i < brands.length; i += 2) {
    const row: TelegramBot.InlineKeyboardButton[] = [
      { text: brands[i].name, callback_data: `brand_${brands[i].key}` },
    ];
    if (brands[i + 1]) {
      row.push({ text: brands[i + 1].name, callback_data: `brand_${brands[i + 1].key}` });
    }
    rows.push(row);
  }
  rows.push([{ text: "⬅️ Back", callback_data: "nav_create_mail" }]);
  return { inline_keyboard: rows };
}

function templatesKeyboard(templates: { id: number; name: string }[]): TelegramBot.InlineKeyboardMarkup {
  const rows: TelegramBot.InlineKeyboardButton[][] = templates.map((t) => [
    { text: t.name, callback_data: `tmpl_${t.id}` },
  ]);
  rows.push([{ text: "⬅️ Back", callback_data: "nav_create_mail" }]);
  return { inline_keyboard: rows };
}

function confirmKeyboard(): TelegramBot.InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "👁 Send Preview", callback_data: "action_preview" },
        { text: "🚀 Dispatch Email", callback_data: "action_dispatch" },
      ],
      [{ text: "❌ Cancel", callback_data: "nav_main" }],
    ],
  };
}

// ─── Handler registration ────────────────────────────────────────────────────

export function registerBotHandlers(bot: TelegramBot): void {
  // /start command
  bot.onText(/\/start/, async (msg) => {
    try {
      const userId = msg.from?.id;
      if (!userId || !isAdmin(userId)) return;
      resetSession(userId);
      await bot.sendMessage(
        msg.chat.id,
        "<b>Welcome to Mailer Control Panel</b>\n\nSelect an option below to start building and dispatching emails.",
        { parse_mode: "HTML", reply_markup: mainMenuKeyboard() },
      );
    } catch (err) {
      logger.error(err, "Error in /start handler");
    }
  });

  // /cancel command
  bot.onText(/\/cancel/, async (msg) => {
    try {
      const userId = msg.from?.id;
      if (!userId) return;
      resetSession(userId);
      await bot.sendMessage(msg.chat.id, "Session cancelled. Use /start to begin again.");
    } catch (err) {
      logger.error(err, "Error in /cancel handler");
    }
  });

  // Callback queries (inline button taps)
  bot.on("callback_query", async (query) => {
    try {
    const userId = query.from.id;
    const chatId = query.message?.chat.id;
    if (!chatId || !isAdmin(userId)) {
      await bot.answerCallbackQuery(query.id);
      return;
    }

    await bot.answerCallbackQuery(query.id);
    const data = query.data ?? "";
    const session = getSession(userId);

    // ── Navigation ──
    if (data === "nav_main") {
      resetSession(userId);
      await bot.editMessageText(
        "<b>Main Menu</b>\nSelect an option below:",
        { chat_id: chatId, message_id: query.message?.message_id, parse_mode: "HTML", reply_markup: mainMenuKeyboard() },
      );
      return;
    }

    if (data === "nav_create_mail") {
      session.state = BotState.SELECT_CATEGORY;
      await bot.editMessageText(
        "<b>Step 1: Select a Brand Category</b>",
        { chat_id: chatId, message_id: query.message?.message_id, parse_mode: "HTML", reply_markup: categoryKeyboard() },
      );
      return;
    }

    if (data === "nav_settings") {
      const smtpOk = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
      const text = smtpOk
        ? `⚙️ <b>SMTP Settings</b>\n\n✅ SMTP configured\nHost: <code>${process.env.SMTP_HOST}</code>\nPort: <code>${process.env.SMTP_PORT ?? "587"}</code>`
        : "⚙️ <b>SMTP Settings</b>\n\n❌ SMTP not configured\nSet SMTP_HOST, SMTP_USER, SMTP_PASS, and SMTP_FROM_EMAIL in your environment secrets.";
      await bot.editMessageText(text, {
        chat_id: chatId,
        message_id: query.message?.message_id,
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [[{ text: "⬅️ Back", callback_data: "nav_main" }]] },
      });
      return;
    }

    if (data === "nav_templates") {
      const templates = await db.select().from(templatesTable).orderBy(templatesTable.name).limit(20);
      const lines = templates.map((t) => `• <b>${t.name}</b> [${t.category}/${t.theme}]`).join("\n");
      await bot.editMessageText(
        `<b>🎨 Available Templates</b>\n\n${lines || "No templates found."}`,
        {
          chat_id: chatId,
          message_id: query.message?.message_id,
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [[{ text: "⬅️ Back", callback_data: "nav_main" }]] },
        },
      );
      return;
    }

    if (data === "nav_logs") {
      const logs = await db
        .select()
        .from(emailDispatchesTable)
        .orderBy(desc(emailDispatchesTable.createdAt))
        .limit(5);

      if (!logs.length) {
        await bot.editMessageText("<b>📊 No dispatch logs found.</b>", {
          chat_id: chatId,
          message_id: query.message?.message_id,
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [[{ text: "⬅️ Back", callback_data: "nav_main" }]] },
        });
        return;
      }

      let text = "<b>📊 Recent Email Dispatches</b>\n\n";
      for (const log of logs) {
        const icon = log.status === "sent" ? "✅" : "❌";
        const date = log.createdAt.toISOString().slice(0, 16).replace("T", " ");
        text += `${icon} <b>${log.recipientEmail}</b> (${log.brandName})\n└ ${date} | ${log.status.toUpperCase()}\n\n`;
      }

      await bot.editMessageText(text, {
        chat_id: chatId,
        message_id: query.message?.message_id,
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [[{ text: "⬅️ Back", callback_data: "nav_main" }]] },
      });
      return;
    }

    // ── Category selection ──
    if (data.startsWith("cat_")) {
      const category = data.slice(4);
      session.selectedCategory = category;
      session.state = BotState.SELECT_BRAND;

      const brands = await db
        .select({ key: brandsTable.key, name: brandsTable.name })
        .from(brandsTable)
        .where(eq(brandsTable.category, category))
        .orderBy(brandsTable.name);

      if (!brands.length) {
        await bot.editMessageText(
          `<b>No brands found for this category.</b>\nAdd brands from the web admin panel.`,
          {
            chat_id: chatId,
            message_id: query.message?.message_id,
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: [[{ text: "⬅️ Back", callback_data: "nav_create_mail" }]] },
          },
        );
        return;
      }

      await bot.editMessageText(
        "<b>Step 2: Select a Brand</b>",
        { chat_id: chatId, message_id: query.message?.message_id, parse_mode: "HTML", reply_markup: brandsKeyboard(brands) },
      );
      return;
    }

    // ── Brand selection ──
    if (data.startsWith("brand_")) {
      const brandKey = data.slice(6);
      const [brand] = await db.select().from(brandsTable).where(eq(brandsTable.key, brandKey));
      if (!brand) return;

      session.selectedBrandKey = brandKey;
      session.selectedBrandName = brand.name;
      session.state = BotState.SELECT_TEMPLATE;

      // Get templates for this brand or generic ones
      const branded = await db
        .select({ id: templatesTable.id, name: templatesTable.name })
        .from(templatesTable)
        .where(eq(templatesTable.brandKey, brandKey))
        .orderBy(templatesTable.name);

      const generic = await db
        .select({ id: templatesTable.id, name: templatesTable.name })
        .from(templatesTable)
        .orderBy(templatesTable.name)
        .limit(10);

      const templates = branded.length ? branded : generic;

      if (!templates.length) {
        await bot.editMessageText("<b>No templates available.</b>", {
          chat_id: chatId,
          message_id: query.message?.message_id,
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [[{ text: "⬅️ Back", callback_data: "nav_create_mail" }]] },
        });
        return;
      }

      await bot.editMessageText(
        `<b>Step 3: Select a Template</b>\nBrand: <b>${brand.name}</b>`,
        { chat_id: chatId, message_id: query.message?.message_id, parse_mode: "HTML", reply_markup: templatesKeyboard(templates) },
      );
      return;
    }

    // ── Template selection ──
    if (data.startsWith("tmpl_")) {
      const templateId = parseInt(data.slice(5), 10);
      const [template] = await db.select().from(templatesTable).where(eq(templatesTable.id, templateId));
      if (!template) return;

      session.selectedTemplateId = templateId;
      session.selectedTemplateName = template.name;
      session.variables = {};
      session.state = BotState.INPUT_EMAIL;

      await bot.sendMessage(
        chatId,
        `<b>Step 4: Enter Recipient Details</b>\nTemplate: <b>${template.name}</b>\n\n📧 Please enter the <b>recipient email address</b>:`,
        { parse_mode: "HTML" },
      );
      return;
    }

    // ── Preview action ──
    if (data === "action_preview") {
      if (!session.selectedTemplateId || !session.selectedBrandKey || !session.renderedHtml) {
        await bot.sendMessage(chatId, "❌ Session expired. Use /start to begin again.");
        return;
      }

      await bot.sendDocument(
        chatId,
        Buffer.from(session.renderedHtml, "utf-8"),
        {
          caption: `<b>📧 HTML Email Preview</b>\nBrand: ${session.selectedBrandName}\nTemplate: ${session.selectedTemplateName}\n\nInspect the file before dispatching.`,
          parse_mode: "HTML",
        },
        { filename: `preview_${session.selectedBrandKey}_${Date.now()}.html`, contentType: "text/html" },
      );
      return;
    }

    // ── Dispatch action ──
    if (data === "action_dispatch") {
      if (!session.selectedTemplateId || !session.selectedBrandKey || !session.recipientEmail || !session.renderedHtml) {
        await bot.sendMessage(chatId, "❌ Session expired. Use /start to begin again.");
        return;
      }

      await bot.editMessageText("⏳ <b>Dispatching email via SMTP...</b>", {
        chat_id: chatId,
        message_id: query.message?.message_id,
        parse_mode: "HTML",
      });

      const [brand] = await db.select().from(brandsTable).where(eq(brandsTable.key, session.selectedBrandKey));
      const result = await sendEmail({
        to: session.recipientEmail,
        subject: session.emailSubject ?? "Account Notification",
        html: session.renderedHtml,
        senderName: `${session.selectedBrandName ?? "Support"} Support`,
      });

      await db.insert(emailDispatchesTable).values({
        telegramUserId: String(userId),
        templateId: session.selectedTemplateId,
        templateName: session.selectedTemplateName ?? "Unknown",
        brandKey: session.selectedBrandKey,
        brandName: session.selectedBrandName ?? "Unknown",
        recipientEmail: session.recipientEmail,
        emailSubject: session.emailSubject ?? "Account Notification",
        status: result.success ? "sent" : "failed",
        errorMessage: result.error ?? null,
      });

      const statusText = result.success
        ? `✅ <b>Email Dispatched Successfully!</b>\n\n• <b>Recipient:</b> <code>${session.recipientEmail}</code>\n• <b>Brand:</b> ${session.selectedBrandName}\n• <b>Subject:</b> ${session.emailSubject}\n• <b>Status:</b> Delivered`
        : `❌ <b>Dispatch Failed!</b>\n\n• <b>Recipient:</b> <code>${session.recipientEmail}</code>\n• <b>Error:</b> <code>${result.error}</code>`;

      await bot.sendMessage(chatId, statusText, {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [[{ text: "🏠 Main Menu", callback_data: "nav_main" }]] },
      });

      resetSession(userId);
      logger.info({ userId, recipient: session.recipientEmail, brand: session.selectedBrandKey, success: result.success }, "Bot email dispatch");
      return;
    }
    } catch (err) {
      logger.error(err, "Error in callback_query handler");
      try {
        await bot.sendMessage(
          query.message!.chat.id,
          "❌ An internal error occurred. Please use /start to try again.",
        );
      } catch (_) { /* ignore send failure */ }
    }
  });

  // Text message handler (for variable input steps)
  bot.on("message", async (msg) => {
    try {
      if (msg.text?.startsWith("/")) return;
      const userId = msg.from?.id;
      const chatId = msg.chat.id;
      if (!userId || !isAdmin(userId)) return;

      const session = getSession(userId);
      const text = msg.text?.trim() ?? "";

      if (session.state === BotState.INPUT_EMAIL) {
        if (!text.includes("@")) {
          await bot.sendMessage(chatId, "❌ That doesn't look like a valid email. Please enter a valid email address:");
          return;
        }
        session.recipientEmail = text;
        session.state = BotState.INPUT_NAME;
        await bot.sendMessage(chatId, "👤 Enter the <b>recipient's name</b> (used for <code>{{recipient_name}}</code>):", { parse_mode: "HTML" });
        return;
      }

      if (session.state === BotState.INPUT_NAME) {
        session.recipientName = text;
        session.variables["recipient_name"] = text;
        session.state = BotState.INPUT_SUBJECT;
        await bot.sendMessage(chatId, "📝 Enter the <b>email subject line</b>:", { parse_mode: "HTML" });
        return;
      }

      if (session.state === BotState.INPUT_SUBJECT) {
        session.emailSubject = text;
        session.variables["timestamp"] = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";

        // Determine remaining variables from template
        const [template] = await db.select().from(templatesTable).where(eq(templatesTable.id, session.selectedTemplateId!));
        if (template) {
          const emailContent = template.emailContent ?? template.content;
          const allVars = extractVariables(emailContent);
          session.pendingVariables = allVars.filter(
            (v) => !["recipient_name", "timestamp"].includes(v) && !(v in session.variables),
          );
        }

        if (session.pendingVariables.length > 0) {
          session.state = BotState.INPUT_VAR;
          const next = session.pendingVariables[0];
          await bot.sendMessage(chatId, `📌 Enter value for <code>{{${next}}}</code>:`, { parse_mode: "HTML" });
        } else {
          await renderAndConfirm(bot, chatId, session, userId);
        }
        return;
      }

      if (session.state === BotState.INPUT_VAR) {
        const varName = session.pendingVariables[0];
        session.variables[varName] = text;
        session.pendingVariables.shift();

        if (session.pendingVariables.length > 0) {
          const next = session.pendingVariables[0];
          await bot.sendMessage(chatId, `📌 Enter value for <code>{{${next}}}</code>:`, { parse_mode: "HTML" });
        } else {
          await renderAndConfirm(bot, chatId, session, userId);
        }
        return;
      }
    } catch (err) {
      logger.error(err, "Error in message handler");
    }
  });
}

async function renderAndConfirm(
  bot: TelegramBot,
  chatId: number,
  session: UserSession,
  userId: number,
): Promise<void> {
  session.state = BotState.CONFIRM;

  const [template] = await db.select().from(templatesTable).where(eq(templatesTable.id, session.selectedTemplateId!));
  const [brand] = await db.select().from(brandsTable).where(eq(brandsTable.key, session.selectedBrandKey!));

  if (!template || !brand) {
    await bot.sendMessage(chatId, "❌ Template or brand not found. Use /start to try again.");
    return;
  }

  const emailContent = template.emailContent ?? template.content;
  const brandContext = flattenBrandContext(brand as unknown as Record<string, unknown>);
  const allVars = { ...brandContext, ...session.variables };
  session.renderedHtml = renderTemplate(emailContent, allVars);

  const summary =
    `✅ <b>Ready to dispatch!</b>\n\n` +
    `• <b>Brand:</b> ${brand.name}\n` +
    `• <b>Template:</b> ${template.name}\n` +
    `• <b>Recipient:</b> <code>${session.recipientEmail}</code>\n` +
    `• <b>Subject:</b> ${session.emailSubject}\n\n` +
    `Tap <b>Send Preview</b> to receive the HTML file first, or <b>Dispatch Email</b> to send now.`;

  await bot.sendMessage(chatId, summary, { parse_mode: "HTML", reply_markup: confirmKeyboard() });
}
