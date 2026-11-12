import config from '../config';
import { reportFaultStatus } from '../constants/status';
import { convertReportLayoutPdf } from '../helpers/util';

export type FaultPdfAnswer = {
  message?: string | null;
  attachFiles?: string | null;
  createdAt?: Date | string | null;
  type?: number | null;
  userName?: string | null;
};

export type FaultPdfInput = {
  id: number;
  subject?: string | null;
  issue?: string | null;
  toiletArea?: string | null;
  customerName?: string | null;
  companyName?: string | null;
  siteName?: string | null;
  serviceName?: string | null;
  priority?: number | null;
  message?: string | null;
  attachFiles?: string | null;
  status?: number | null;
  createdAt?: Date | string | null;
  /** Staff/customer who lodged the fault — shown in PDF footer. */
  submittedBy?: string | null;
  delegatedToType?: string | null;
  delegationNote?: string | null;
  delegatedUntil?: Date | string | null;
  delegatedActedAt?: Date | string | null;
  answers?: FaultPdfAnswer[];
};

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(value: unknown) {
  return escapeHtml(value).replace(/'/g, '&#39;');
}

function formatWhen(value?: Date | string | null) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Australia/Sydney',
  }).format(date);
}

function statusLabel(status?: number | null) {
  if (+status === reportFaultStatus.COMPLETED) return 'Completed';
  if (+status === reportFaultStatus.PENDING) return 'Pending';
  if (+status === reportFaultStatus.DELETED) return 'Deleted';
  if (+status === reportFaultStatus.INPROGRESS) return 'In progress';
  return 'New';
}

function priorityLabel(priority?: number | null) {
  return +priority === 1 ? 'Urgent' : 'Normal';
}

function parseAttachFiles(attachFiles: unknown): string[] {
  if (!attachFiles) return [];
  if (Array.isArray(attachFiles)) return attachFiles.filter(Boolean).map(String);
  try {
    const parsed = JSON.parse(String(attachFiles));
    return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : [];
  } catch {
    const raw = String(attachFiles).trim();
    return raw ? [raw] : [];
  }
}

function absoluteMediaUrl(raw: string): string {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s) || /^data:/i.test(s)) return s;
  const base = String(config.BASE_UPLOAD_URL || '').replace(/\/+$/, '');
  if (!base) return s.startsWith('/') ? s : `/${s}`;
  if (s.startsWith('/')) return `${base}${s}`;
  return `${base}/${s.replace(/^\/+/, '')}`;
}

function mediaKey(raw: string): string {
  return absoluteMediaUrl(raw).split(/[?#]/)[0].replace(/\/+$/, '').toLowerCase();
}

function isVideoUrl(url: string): boolean {
  return /\.(mp4|mov|m4v|webm|avi|3gp|mpeg|mpg)(?:[?#].*)?$/i.test(url);
}

function fieldRow(label: string, value: string) {
  return `<div class="field-row">
    <div class="field-label">${escapeHtml(label)}</div>
    <div class="field-value"><span class="value-text">${escapeHtml(value)}</span></div>
  </div>`;
}

function sectionHead(label: string) {
  return `<div class="section-head"><span>${escapeHtml(label)}</span></div>`;
}

function mediaBlock(urls: string[]) {
  if (!urls.length) return '';
  const items = urls
    .map((raw) => {
      const url = absoluteMediaUrl(raw);
      if (!url) return '';
      if (isVideoUrl(url)) {
        return `<div class="images-item" style="font-size:12px;color:#64748b;padding:8px;">Video<br/><a href="${escapeAttr(url)}">${escapeHtml(url)}</a></div>`;
      }
      return `<div class="images-item"><img alt="" src="${escapeAttr(url)}" /></div>`;
    })
    .filter(Boolean)
    .join('');
  if (!items) return '';
  return `<div class="field-row field-row--stack">
    <div class="field-label">Photos</div>
    <div class="field-value"><div class="images">${items}</div></div>
  </div>`;
}

function sameFileSet(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const keys = new Set(a.map(mediaKey));
  return b.every((u) => keys.has(mediaKey(u)));
}

/** Drop the seed answer created with the fault (same message + same files). */
function followUpAnswers(fault: FaultPdfInput): FaultPdfAnswer[] {
  const answers = Array.isArray(fault.answers) ? fault.answers : [];
  const faultMessage = String(fault.message || '').trim();
  const faultFiles = parseAttachFiles(fault.attachFiles);
  return answers.filter((a) => {
    const msg = String(a.message || '').trim();
    const files = parseAttachFiles(a.attachFiles);
    const sameMsg = msg === faultMessage;
    const sameFiles = sameFileSet(files, faultFiles);
    if (sameMsg && sameFiles) return false;
    if (sameMsg && files.length === 0 && faultFiles.length > 0) return false;
    return Boolean(msg || files.length);
  });
}

function buildContentHtml(fault: FaultPdfInput): string {
  const customer =
    String(fault.companyName || '').trim() ||
    String(fault.customerName || '').trim() ||
    '—';
  const issue = String(fault.issue || fault.subject || '').trim() || '—';
  const toiletArea = String(fault.toiletArea || '').trim();
  const message = String(fault.message || '').trim();
  const faultFiles = parseAttachFiles(fault.attachFiles);
  const shownKeys = new Set(faultFiles.map(mediaKey));

  let html = '';
  html += sectionHead('Fault details');
  html += fieldRow('Fault ID', `#${fault.id}`);
  html += fieldRow('Issue', issue);
  html += fieldRow('Site', String(fault.siteName || '').trim() || '—');
  html += fieldRow('Customer', customer);
  html += fieldRow('Service', String(fault.serviceName || '').trim() || '—');
  if (toiletArea) html += fieldRow('Toilet / area', toiletArea);
  html += fieldRow('Priority', priorityLabel(fault.priority));
  html += fieldRow('Status', statusLabel(fault.status));
  html += fieldRow('Reported', formatWhen(fault.createdAt) || '—');

  if (message) {
    html += sectionHead('Message');
    html += `<div class="field-row field-row--stack">
      <div class="field-label">Details</div>
      <div class="field-value"><span class="value-text">${escapeHtml(message).replace(/\n/g, '<br/>')}</span></div>
    </div>`;
  }

  if (faultFiles.length) {
    html += sectionHead('Attachments');
    html += mediaBlock(faultFiles);
  }

  const delegationType = String(fault.delegatedToType || '').trim();
  if (delegationType) {
    html += sectionHead('Assignment');
    html += fieldRow('Assigned as', delegationType);
    if (fault.delegatedUntil) html += fieldRow('Due', formatWhen(fault.delegatedUntil));
    if (fault.delegatedActedAt) html += fieldRow('Acted', formatWhen(fault.delegatedActedAt));
    if (fault.delegationNote) html += fieldRow('Note', String(fault.delegationNote));
  }

  const comments = followUpAnswers(fault);
  if (comments.length) {
    html += sectionHead('Comments');
    for (const a of comments) {
      const who = String(a.userName || '').trim() || 'User';
      const when = formatWhen(a.createdAt);
      const body = String(a.message || '').trim();
      const files = parseAttachFiles(a.attachFiles).filter((u) => {
        const key = mediaKey(u);
        if (!key || shownKeys.has(key)) return false;
        shownKeys.add(key);
        return true;
      });
      const meta = when ? `${who} · ${when}` : who;
      html += fieldRow('From', meta);
      if (body) {
        html += `<div class="field-row field-row--stack">
          <div class="field-label">Comment</div>
          <div class="field-value"><span class="value-text">${escapeHtml(body).replace(/\n/g, '<br/>')}</span></div>
        </div>`;
      }
      if (files.length) html += mediaBlock(files);
    }
  }

  return html;
}

export async function generateFaultReportPdfBuffer(fault: FaultPdfInput): Promise<Buffer> {
  const issue = String(fault.issue || fault.subject || '').trim() || `Fault #${fault.id}`;
  const site = String(fault.siteName || '').trim();
  const dateLabel = formatWhen(fault.createdAt) || '';
  const submittedBy = String(fault.submittedBy || '').trim() || 'Usr-0';
  const pdf = await convertReportLayoutPdf({
    title: 'Fault Report',
    subtitle: site ? `${issue} — ${site}` : issue,
    dateLabel,
    contentHtml: buildContentHtml(fault),
    submittedBy,
    rowNumber: fault.id,
    asBuffer: true,
  });
  const buf = !pdf
    ? null
    : Buffer.isBuffer(pdf)
      ? pdf
      : Buffer.from(pdf as any);
  if (!buf?.length) {
    throw new Error('Could not generate fault PDF');
  }
  return buf;
}
