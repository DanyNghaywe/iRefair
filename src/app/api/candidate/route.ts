import { NextResponse } from 'next/server';
import { sendMail } from '@/lib/mailer';
import { appendCandidateRow, generateSubmissionId } from '@/lib/sheets';

type CandidatePayload = {
  firstName?: string;
  middleName?: string;
  familyName?: string;
  email?: string;
  phone?: string;
  locatedCanada?: string;
  province?: string;
  authorizedCanada?: string;
  industryType?: string;
  industryOther?: string;
  employmentStatus?: string;
  countryOfOrigin?: string;
  languages?: string;
  languagesOther?: string;
};

const subject = 'We’ve received your referral request – iRefair';
const jobOpeningsUrl =
  'https://docs.google.com/document/d/1z6s9qb7G_7NUKlgar0eCzFfFvhfe4tW6L45S1wFvuQk/edit?tab=t.0';

const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>We’ve received your referral request – iRefair</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body style="margin:0;padding:0;background:#041923;">
    <div style="display:none;max-height:0;overflow:hidden;font-size:0;line-height:0;">
      Thanks for sharing your background. We’ll match you with referrers when they’re available.
    </div>

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
                  Referral request received
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
                    <td style="padding:22px 24px 6px 24px;">
                      <h1 style="margin:0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:22px;line-height:1.4;font-weight:700;color:#f5fbff;">
                        Hi {{firstName}}, we’ve got your details. ✨
                      </h1>
                      <p style="margin:12px 0 14px 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.7;color:rgba(227,242,255,0.88);">
                        Thanks for submitting your referral request to <strong>iRefair</strong>.
                        We’ll review your profile and start looking for referrers who can help with roles that match your experience and preferences.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:4px 24px 4px 24px;">
                      <p style="margin:0 0 6px 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;letter-spacing:0.17em;text-transform:uppercase;color:rgba(158,206,231,0.9);">
                        Quick snapshot
                      </p>
                      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td style="padding:6px 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:#e5f6ff;">
                            <strong>Location</strong>
                          </td>
                          <td align="right" style="padding:6px 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:rgba(220,238,255,0.9);">
                            {{location}}
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:6px 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:#e5f6ff;">
                            <strong>Work authorization</strong>
                          </td>
                          <td align="right" style="padding:6px 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:rgba(220,238,255,0.9);">
                            {{authorization}}
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:6px 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:#e5f6ff;">
                            <strong>Industry focus</strong>
                          </td>
                          <td align="right" style="padding:6px 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:rgba(220,238,255,0.9);">
                            {{industry}}
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:6px 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:#e5f6ff;">
                            <strong>Languages</strong>
                          </td>
                          <td align="right" style="padding:6px 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:rgba(220,238,255,0.9);">
                            {{languages}}
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:12px 24px 16px 24px;">
                      <p style="margin:0 0 6px 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;letter-spacing:0.17em;text-transform:uppercase;color:rgba(158,206,231,0.9);">
                        What happens next
                      </p>
                      <ol style="margin:0;padding-left:18px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;line-height:1.7;color:rgba(227,242,255,0.9);">
                        <li>We review your profile for clarity and completeness.</li>
                        <li>We look for referrers whose teams and roles match what you’re targeting.</li>
                        <li>When there’s a potential match, we’ll contact you before any intro is made.</li>
                      </ol>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:4px 24px 22px 24px;">
                      <p style="margin:0 0 10px 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;line-height:1.7;color:rgba(205,228,244,0.9);">
                        If anything changes (new resume, updated targets, different locations), just reply to this email
                        and we’ll update your details on our side.
                      </p>
                      <p style="margin:0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;line-height:1.7;color:rgba(205,228,244,0.9);">
                        Thanks again for trusting iRefair with your search. 💼
                      </p>
                      <div style="margin:16px 0 0 0;">
                        <a href="${jobOpeningsUrl}" style="display:inline-block;padding:12px 16px;border-radius:10px;background:linear-gradient(120deg,#5ae6ff,#5d8bff);color:#041923;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-weight:700;font-size:14px;text-decoration:none;box-shadow:0 8px 24px rgba(0,0,0,0.35);">
                          See who’s hiring in Canada right now
                        </a>
                        <p style="margin:10px 0 0 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;line-height:1.6;color:rgba(205,228,244,0.9);">
                          Quick company notes, what they need, and links to apply.
                        </p>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 20px 28px;text-align:center;">
                <p style="margin:10px 0 0 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;line-height:1.6;color:rgba(201,223,237,0.7);">
                  You’re receiving this because you submitted a referral request on iRefair.<br />
                  If this wasn’t you, you can safely ignore this message.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

const textTemplate = `Hi {{firstName}},

Thanks for submitting your referral request to iRefair.

Request ID: {{requestId}}

Here’s a quick snapshot of what you shared:
- Location: {{location}}
- Work authorization: {{authorization}}
- Industry focus: {{industry}}
- Languages: {{languages}}

See who’s hiring in Canada right now (quick company notes, what they need, links to apply):
${jobOpeningsUrl}

What happens next:
1) We review your profile for clarity and completeness.
2) We look for referrers whose teams and roles match what you’re targeting.
3) When there’s a potential match, we’ll contact you before any intro is made.

If anything changes (new resume, updated targets, different locations), just reply to this email and we’ll update your details.

— The iRefair team
`;

function fillTemplate(template: string, values: Record<string, string>) {
  return template.replace(/{{(.*?)}}/g, (_, key) => values[key.trim()] ?? '');
}

function sanitize(value: unknown) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

export async function POST(request: Request) {
  try {
    const body: CandidatePayload = await request.json();
    const firstName = sanitize(body.firstName);
    const middleName = sanitize(body.middleName);
    const familyName = sanitize(body.familyName);
    const email = sanitize(body.email);
    const phone = sanitize(body.phone);

    if (!firstName || !email) {
      return NextResponse.json({ ok: false, error: 'Missing required fields: firstName and email.' }, { status: 400 });
    }

    const requestId = generateSubmissionId('CAND');

    const locationSnapshot = (() => {
      const locatedCanada = sanitize(body.locatedCanada);
      const province = sanitize(body.province);
      const country = sanitize(body.countryOfOrigin);

      if (locatedCanada === 'Yes') return province ? `Canada — ${province}` : 'Canada';
      if (locatedCanada === 'No' && country) return country;
      return country || 'Not provided';
    })();

    const authorizationSnapshot = sanitize(body.authorizedCanada) || 'Not provided';

    const industrySnapshot = (() => {
      const industryType = sanitize(body.industryType);
      const industryOther = sanitize(body.industryOther);
      if (industryType === 'Other' && industryOther) return industryOther;
      return industryType || 'Not provided';
    })();

    const languagesSnapshot = (() => {
      const languagesRaw = sanitize(body.languages);
      const languagesOther = sanitize(body.languagesOther);

      const baseList = languagesRaw
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item && item.toLowerCase() !== 'other');

      const all = languagesOther ? [...baseList, languagesOther.trim()] : baseList;
      const combined = all.filter(Boolean).join(', ');
      return combined || 'Not provided';
    })();

    const values = {
      requestId,
      firstName,
      location: locationSnapshot,
      authorization: authorizationSnapshot,
      industry: industrySnapshot,
      languages: languagesSnapshot,
    };

    const html = fillTemplate(htmlTemplate, values);
    const text = fillTemplate(textTemplate, values);

    await appendCandidateRow({
      id: requestId,
      firstName,
      middleName,
      familyName,
      email,
      phone,
      locatedCanada: sanitize(body.locatedCanada),
      province: sanitize(body.province),
      authorizedCanada: sanitize(body.authorizedCanada),
      countryOfOrigin: sanitize(body.countryOfOrigin),
      languages: languagesSnapshot,
      languagesOther: sanitize(body.languagesOther),
      industryType: sanitize(body.industryType),
      industryOther: sanitize(body.industryOther),
      employmentStatus: sanitize(body.employmentStatus),
    });

    await sendMail({
      to: email,
      subject,
      html,
      text,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Candidate email API error', error);
    return NextResponse.json({ ok: false, error: 'Failed to send email' }, { status: 500 });
  }
}
