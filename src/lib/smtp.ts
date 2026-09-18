import nodemailer from "nodemailer";

export interface SMTPSendOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
  cc?: string[];
  bcc?: string[];
}

export interface SMTPSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  simulated?: boolean;
}

/**
 * Creates a Nodemailer transporter configured via environment variables.
 * Supported variables:
 * - SMTP_HOST (e.g., smtp.gmail.com, smtp.sendgrid.net, mail.travelocase.com)
 * - SMTP_PORT (e.g., 587, 465, 25)
 * - SMTP_SECURE (e.g., "true" for 465, "false" for 587/STARTTLS)
 * - SMTP_USER (e.g., ticketing@travelocase.com)
 * - SMTP_PASS (e.g., your-smtp-password-or-app-password)
 * - SMTP_FROM (e.g., "Travelocase Reservations <ticketing@travelocase.com>")
 */
export function getSMTPTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === "production",
    },
  });
}

/**
 * Dispatches an email via configured SMTP transport.
 * If SMTP credentials are not configured in .env, safely logs and simulates dispatch in development.
 */
export async function sendEmailViaSMTP(options: SMTPSendOptions): Promise<SMTPSendResult> {
  const transporter = getSMTPTransporter();
  const defaultFrom = process.env.SMTP_FROM || `"Travelocase Reservations & Ticketing Desk" <ticketing@travelocase.com>`;
  const from = options.from || defaultFrom;

  if (!transporter) {
    console.log(
      `[SMTP SIMULATION] (Configure SMTP_HOST, SMTP_USER, SMTP_PASS in .env for live relay)\n` +
      `To: ${options.to}\n` +
      `From: ${from}\n` +
      `Subject: ${options.subject}`
    );
    return {
      success: true,
      simulated: true,
      messageId: `sim_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    };
  }

  try {
    const info = await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      cc: options.cc,
      bcc: options.bcc,
    });

    console.log(`[SMTP DELIVERED] MessageId: ${info.messageId} to ${options.to}`);
    return {
      success: true,
      messageId: info.messageId,
      simulated: false,
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "SMTP transmission failed";
    console.error(`[SMTP ERROR] Failed to send email to ${options.to}:`, errorMsg);
    return {
      success: false,
      error: errorMsg,
    };
  }
}
