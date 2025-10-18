// apps/api/src/services/emailService.ts
import nodemailer from "nodemailer";
import type { Transporter, SendMailOptions } from "nodemailer";
import * as dotenv from "dotenv";
dotenv.config(); // loads .env in current directory automatically

let transporter: Transporter | null = null;

function getTransport(): Transporter {
  if (!transporter) {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT) || 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;
    const secure = process.env.SMTP_SECURE === "true";

    if (!host || !user || !pass) {
      throw new Error("SMTP credentials missing in environment variables.");
    }

    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
  }

  return transporter;
}

export async function sendEmail(
  to: string | string[],
  subject: string,
  html: string,
  text?: string,
  options?: Partial<SendMailOptions>
): Promise<{ success: boolean; messageId?: string }> {
  try {
    const from = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@gmail.com";

    const result = await getTransport().sendMail({
      from,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, ""),
      ...options,
    });

    console.log(`📨 Email sent successfully to ${to}: ${result.messageId}`);
    return { success: true, messageId: result.messageId };
  } catch (error: any) {
    console.error("❌ Failed to send email:", error.message);
    return { success: false };
  }
}

export async function testEmail(): Promise<boolean> {
  try {
    await getTransport().verify();
    console.log("✅ SMTP connection verified.");
    return true;
  } catch (error: any) {
    console.error("❌ SMTP verification failed:", error.message);
    return false;
  }
}
