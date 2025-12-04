import { NextResponse } from 'next/server';
import { sendMail } from '@/lib/mailer';
import { appendReferrerRow, generateSubmissionId } from '@/lib/sheets';

type ReferrerPayload = {
  name?: string;
  email?: string;
  targetRoles?: string;
  regions?: string;
  referralType?: string;
  monthlySlots?: string;
  phone?: string;
  country?: string;
  company?: string;
  companyIndustry?: string;
  companyIndustryOther?: string;
  workType?: string;
  constraints?: string;
};

const subject = 'Thanks for offering referrals – iRefair';

const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Thanks for offering referrals – iRefair</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body style="margin:0;padding:0;background:#041923;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#041923;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px;border-radius:24px;background:radial-gradient(circle at top left, #1d728f 0, #041923 50%, #020b10 100%);box-shadow:0 18px 40px rgba(0,0,0,0.6);overflow:hidden;border:1px solid rgba(255,255,255,0.07);">
            <tr>
              <td style="padding:22px 28px 10px 28px;text-align:left;">
                <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:20px;font-weight:700;color:#f5fbff;">
                  iRefair
                </div>
                <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(217,240,255,0.75);margin-top:4px;">
                  Referral offer received
                </div>
                <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;color:rgba(227,242,255,0.8);margin-top:6px;">
                  Request ID: <strong>{{requestId}}</strong>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 16px 28px 16px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-radius:18px;background:rgba(2,16,24,0.96);border:1px solid rgba(255,255,255,0.06);">
                  <tr>
                    <td style="padding:22px 24px 12px 24px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#f5fbff;">
                      <h1 style="margin:0 0 10px 0;font-size:22px;line-height:1.4;font-weight:700;">Hi {{name}}, thank you for offering referrals.</h1>
                      <p style="margin:0 0 12px 0;font-size:14px;line-height:1.7;color:rgba(227,242,255,0.88);">
                        We appreciate your willingness to refer candidates. We'll reach out when we have someone who matches the teams and roles you cover.
                      </p>
                      <p style="margin:0;font-size:13px;line-height:1.7;color:rgba(205,228,244,0.9);">
                        You can reply to this email anytime to adjust your availability or update the roles/regions you support.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 24px 18px 24px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:rgba(220,238,255,0.9);font-size:13px;">
                      <strong>Snapshot you shared</strong><br />
                      <div style="margin-top:6px;line-height:1.6;">
                        <div><strong>Roles you cover:</strong> {{targetRoles}}</div>
                        <div><strong>Regions:</strong> {{regions}}</div>
                        <div><strong>Referral type:</strong> {{referralType}}</div>
                        <div><strong>Monthly slots:</strong> {{monthlySlots}}</div>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 20px 28px;text-align:center;">
                <p style="margin:10px 0 0 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;line-height:1.6;color:rgba(201,223,237,0.7);">
                  You're receiving this because you offered to refer candidates on iRefair.<br />
                  If this wasn't you, you can safely ignore this message.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

const textTemplate = `Hi {{name}},

Thank you for offering referrals. We'll reach out when we have a candidate who matches the teams and roles you cover.

Request ID: {{requestId}}

Snapshot you shared:
- Roles you cover: {{targetRoles}}
- Regions: {{regions}}
- Referral type: {{referralType}}
- Monthly slots: {{monthlySlots}}

Reply to this email anytime to adjust your availability or update the roles/regions you support.

— The iRefair team`;

function fillTemplate(template: string, values: Record<string, string>) {
  return template.replace(/{{(.*?)}}/g, (_, key) => values[key.trim()] ?? '');
}

function sanitize(value: unknown) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

export async function POST(request: Request) {
  try {
    const body: ReferrerPayload = await request.json();
    const name = sanitize(body.name);
    const email = sanitize(body.email);
    const phone = sanitize(body.phone);
    const country = sanitize(body.country);
    const company = sanitize(body.company);
    const companyIndustry = sanitize(body.companyIndustry);
    const companyIndustryOther = sanitize(body.companyIndustryOther);
    const workType = sanitize(body.workType);
    const constraints = sanitize(body.constraints);

    if (!email) {
      return NextResponse.json({ ok: false, error: 'Missing required field: email.' }, { status: 400 });
    }

    const requestId = generateSubmissionId('REF');

    const values = {
      requestId,
      name: name || 'there',
      targetRoles: sanitize(body.targetRoles) || 'Not provided',
      regions: sanitize(body.regions) || 'Not provided',
      referralType: sanitize(body.referralType) || 'Not provided',
      monthlySlots: sanitize(body.monthlySlots) || 'Not provided',
    };

    const html = fillTemplate(htmlTemplate, values);
    const text = fillTemplate(textTemplate, values);

    await appendReferrerRow({
      id: requestId,
      name,
      email,
      phone,
      country,
      company,
      companyIndustry,
      companyIndustryOther,
      workType,
      targetRoles: sanitize(body.targetRoles),
      regions: sanitize(body.regions),
      referralType: sanitize(body.referralType),
      monthlySlots: sanitize(body.monthlySlots),
      constraints,
    });

    await sendMail({
      to: email,
      subject,
      html,
      text,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Referrer email API error', error);
    return NextResponse.json({ ok: false, error: 'Failed to send email' }, { status: 500 });
  }
}
