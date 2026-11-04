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

const parseEmailList = (value?: string | string[]): { email: string }[] => {
  const raw = Array.isArray(value) ? value.join(',') : String(value || '');
  return raw
    .split(/[;,]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((email) => ({ email }));
};

export type SendMailResult = { ok: boolean; error?: string };

const brevoErrorMessage = (data: unknown, fallback: string): string => {
  if (!data) return fallback;
  if (typeof data === 'string') return data.slice(0, 400);
  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    const msg = obj.message || obj.error || obj.code;
    if (typeof msg === 'string' && msg.trim()) return msg.slice(0, 400);
    try {
      return JSON.stringify(data).slice(0, 400);
    } catch {
      return fallback;
    }
  }
  return fallback;
};

const SendMailDetailed = async function (
  to: string,
  subject: string,
  body: string,
  opts?: {
    replyTo?: { email: string; name?: string };
    cc?: string | string[];
  },
): Promise<SendMailResult> {
  if (!to?.trim()) {
    console.error('SendMail skipped: missing recipient');
    return { ok: false, error: 'Missing recipient email' };
  }
  if (!isMailConfigured()) {
    console.error(
      'SendMail skipped: set MAIL_FROM and BREVO_API_KEY (Brevo transactional API key)',
    );
    return { ok: false, error: 'Email is not configured (MAIL_FROM / BREVO_API_KEY)' };
  }

  const toList = parseEmailList(to);
  if (!toList.length) {
    console.error('SendMail skipped: missing recipient');
    return { ok: false, error: 'Missing recipient email' };
  }
  const senderName = config.MAIL_FROM_NAME || 'Service360';
  const payload: Record<string, unknown> = {
    sender: { name: senderName, email: config.MAIL_FROM },
    to: toList,
    subject,
    htmlContent: body,
    textContent: htmlToPlainText(body),
  };
  const toSet = new Set(toList.map((r) => r.email.toLowerCase()));
  // Never CC someone already in To — Brevo would deliver the same mail twice.
  const cc = parseEmailList(opts?.cc).filter((r) => !toSet.has(r.email.toLowerCase()));
  if (cc.length) payload.cc = cc;
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
    return { ok: true };
  } catch (error) {
    const err = error as {
      message?: string;
      response?: { status?: number; data?: unknown };
    };
    console.error('SendMail failed:', err.message || error);
    if (err.response?.data) {
      console.error(err.response.data);
    }
    const status = err.response?.status ? `HTTP ${err.response.status}: ` : '';
    return {
      ok: false,
      error: status + brevoErrorMessage(err.response?.data, err.message || 'Email failed to send'),
    };
  }
};

const SendMail = async function (
  to: string,
  subject: string,
  body: string,
  opts?: {
    replyTo?: { email: string; name?: string };
    cc?: string | string[];
  },
) {
  const result = await SendMailDetailed(to, subject, body, opts);
  return result.ok;
};

export { SendMail, SendMailDetailed };
