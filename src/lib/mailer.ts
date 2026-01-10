'use server';

import { randomUUID } from 'crypto';
import { Resend } from 'resend';

type MailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  cc?: string | string[];
  replyTo?: string;
};

let cachedResend: Resend | null = null;

function getResendClient() {
  if (cachedResend) return cachedResend;

  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error('RESEND_API_KEY environment variable is not set.');
  }

  cachedResend = new Resend(apiKey);
  return cachedResend;
}

export async function sendMail({ to, subject, html, text, cc, replyTo }: MailInput) {
  const fromName = process.env.SMTP_FROM_NAME || 'iRefair';
  const fromEmail = process.env.SMTP_FROM_EMAIL || 'info@andbeyondca.com';
  const from = `${fromName} <${fromEmail}>`;

  try {
    const resend = getResendClient();
    const uniqueId = randomUUID();

    const { data, error } = await resend.emails.send({
      from,
      to,
      cc,
      reply_to: replyTo,
      subject,
      html,
      text,
      headers: {
        'X-Entity-Ref-ID': uniqueId,
      },
    });

    if (error) {
      console.error('[MAILER] Resend error:', error);
      throw new Error(error.message);
    }

    console.log('[MAILER] Email sent - MessageId:', data?.id, 'To:', to);
    return { messageId: data?.id, response: 'OK' };
  } catch (error) {
    console.error('Error sending mail', error);
    throw error;
  }
}
