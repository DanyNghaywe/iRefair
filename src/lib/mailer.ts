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

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error('GMAIL_USER or GMAIL_APP_PASSWORD environment variable is not set.');
  }

  cachedTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass,
    },
  });

  return cachedTransporter;
}

export async function sendMail({ to, subject, html, text, cc, replyTo }: MailInput) {
  const fromName = process.env.SMTP_FROM_NAME || 'iRefair';
  const fromEmail = process.env.GMAIL_USER || 'irefair.andbeyondconsulting@gmail.com';
  const from = `${fromName} <${fromEmail}>`;

  try {
    const transporter = getTransporter();
    const uniqueId = randomUUID();

    const info = await transporter.sendMail({
      from,
      to,
      cc,
      replyTo: replyTo || fromEmail,
      subject,
      html,
      text,
      headers: {
        'X-Entity-Ref-ID': uniqueId,
      },
    });

    console.log('[MAILER] Email sent - MessageId:', info.messageId, 'To:', to);
    return { messageId: info.messageId, response: info.response };
  } catch (error) {
    console.error('Error sending mail', error);
    throw error;
  }
}
