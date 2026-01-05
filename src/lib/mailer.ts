'use server';

import { randomUUID } from 'crypto';
import nodemailer from 'nodemailer';

type MailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  cc?: string | string[];
  replyTo?: string;
};

let cachedTransporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    throw new Error('SMTP configuration is missing. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.');
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  return cachedTransporter;
}

export async function sendMail({ to, subject, html, text, cc, replyTo }: MailInput) {
  const fromName = process.env.SMTP_FROM_NAME || 'iRefair';
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'info@andbeyondca.com';
  const from = `"${fromName}" <${fromEmail}>`;

  try {
    const transporter = getTransporter();
    const messageIdDomain = fromEmail.split('@')[1] || 'localhost';
    const uniqueId = randomUUID();
    const messageId = `<${uniqueId}@${messageIdDomain}>`;
    const info = await transporter.sendMail({
      from,
      to,
      cc,
      replyTo,
      subject,
      html,
      text,
      messageId,
      // Prevent email clients (especially Gmail) from threading unrelated emails together.
      // Each email gets a unique X-Entity-Ref-ID, and we explicitly clear References/In-Reply-To
      // to ensure emails are treated as standalone messages, not part of a conversation.
      headers: {
        'X-Entity-Ref-ID': uniqueId,
        'References': '',
        'In-Reply-To': '',
      },
    });
    console.log('[MAILER] Email sent - Response:', info.response, 'MessageId:', info.messageId, 'To:', to);
    return info;
  } catch (error) {
    console.error('Error sending mail', error);
    throw error;
  }
}
