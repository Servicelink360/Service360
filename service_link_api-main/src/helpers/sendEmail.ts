import axios from 'axios';
import config from 'src/config';

const BREVO_SEND_URL = 'https://api.brevo.com/v3/smtp/email';

const getBrevoApiKey = (): string =>
  String(config.BREVO_API_KEY || config.MAIL_PASSWORD || '').trim();

export const isMailConfigured = (): boolean => {
  const key = getBrevoApiKey();
  return Boolean(config.MAIL_FROM && key.length >= 16);
};

const htmlToPlainText = (html: string): string =>
  html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const SendMail = async function (
  to: string,
  subject: string,
  body: string,
  opts?: { replyTo?: { email: string; name?: string } },
) {
  if (!to?.trim()) {
    console.error('SendMail skipped: missing recipient');
    return false;
  }
  if (!isMailConfigured()) {
    console.error(
      'SendMail skipped: set MAIL_FROM and BREVO_API_KEY (Brevo transactional API key)',
    );
    return false;
  }

  const senderName = config.MAIL_FROM_NAME || 'Service360';
  const payload: Record<string, unknown> = {
    sender: { name: senderName, email: config.MAIL_FROM },
    to: [{ email: to.trim() }],
    subject,
    htmlContent: body,
    textContent: htmlToPlainText(body),
  };
  if (opts?.replyTo?.email?.trim()) {
    payload.replyTo = {
      email: opts.replyTo.email.trim(),
      name: opts.replyTo.name?.trim() || opts.replyTo.email.trim(),
    };
  }

  try {
    await axios.post(BREVO_SEND_URL, payload, {
      headers: {
        'api-key': getBrevoApiKey(),
        'content-type': 'application/json',
        accept: 'application/json',
      },
      timeout: 30000,
    });
    return true;
  } catch (error) {
    const err = error as {
      message?: string;
      response?: { status?: number; data?: unknown };
    };
    console.error('SendMail failed:', err.message || error);
    if (err.response?.data) {
      console.error(err.response.data);
    }
    return false;
  }
};

export { SendMail };
