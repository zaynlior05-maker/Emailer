import nodemailer from "nodemailer";
import { logger } from "./logger";

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT ?? "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    logger.warn("SMTP credentials not configured — email sending will fail");
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  senderName?: string;
}

export async function sendEmail(opts: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  const transporter = createTransporter();
  if (!transporter) {
    return { success: false, error: "SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS secrets." };
  }

  const fromEmail = process.env.SMTP_FROM_EMAIL ?? process.env.SMTP_USER ?? "noreply@example.com";
  const senderName = opts.senderName ?? "Support Team";

  try {
    await transporter.sendMail({
      from: `"${senderName}" <${fromEmail}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err }, "SMTP send failed");
    return { success: false, error: message };
  }
}

export function isSmtpConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}
