import * as fs from 'fs';
import * as path from 'path';
import * as puppeteer from 'puppeteer';
import config from '../config';
import { shouldUploadReportPdfsToS3, uploadBufferToS3 } from '../upload/s3-upload.helper';

export type ToolboxRecordPerson = {
  name: string;
  signature: string;
  completedAt?: Date | null;
};

function logoDataUri(): string {
  const name = 'servicelink-logo.png';
  const candidates = [
    path.join(process.cwd(), 'public', 'assets', name),
    path.join(process.cwd(), 'public', 'upload', 'files', 'logo-a8a4.png'),
    path.join(__dirname, '..', '..', 'public', 'assets', name),
    path.join(__dirname, 'assets', name),
    path.join(__dirname, '..', 'training', 'assets', name),
    path.join(process.cwd(), 'src', 'training', 'assets', name),
    path.join(process.cwd(), 'dist', 'training', 'assets', name),
    path.join(process.cwd(), 'dist', 'src', 'training', 'assets', name),
  ];
  for (const filePath of candidates) {
    try {
      if (fs.existsSync(filePath)) {
        return `data:image/png;base64,${fs.readFileSync(filePath).toString('base64')}`;
      }
    } catch {
      /* try the next location */
    }
  }
  return '';
}

function escapeHtml(value: string) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatWhen(value?: Date | null) {
  if (!value) return 'Not completed';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not completed';
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Australia/Sydney',
  }).format(date);
}

function buildHtml(opts: {
  recordNo: string;
  kind: string;
  talkTitle: string;
  siteName?: string;
  deliveredAt?: Date | null;
  ledBy?: string;
  notes?: string;
  minutes?: string;
  people: ToolboxRecordPerson[];
}) {
  const rows = opts.people
    .map(
      (person) => `<tr>
        <td>${escapeHtml(person.name)}</td>
        <td class="sign">${person.signature ? escapeHtml(person.signature) : ''}</td>
        <td>${escapeHtml(formatWhen(person.completedAt))}</td>
      </tr>`,
    )
    .join('');
  const fields = [
    ['Record', opts.recordNo],
    ['Type', opts.kind],
    ['Toolbox talk', opts.talkTitle],
    ['Site', opts.siteName || ''],
    ['Session date', opts.deliveredAt ? formatWhen(opts.deliveredAt) : ''],
    ['Led by', opts.ledBy || ''],
  ]
    .filter(([, value]) => value)
    .map(
      ([label, value]) =>
        `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`,
    )
    .join('');
  const logo = logoDataUri();
  const logoHtml = logo
    ? `<img class="logo" src="${logo}" alt="Servicelink" />`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: A4; margin: 16mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #1f2937; font-size: 12px; }
    .header { margin-bottom: 14px; }
    .header-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; }
    .logo { height: 78px; width: auto; display: block; }
    .header-contact { text-align: right; color: #4b5563; font-size: 11.5px; line-height: 1.55; padding-top: 6px; }
    .header-contact .company { color: #166534; font-weight: 700; font-size: 13px; margin-bottom: 2px; }
    h1 { margin: 0 0 4px; color: #166534; font-size: 22px; }
    .sub { margin: 0 0 18px; color: #6b7280; }
    table.meta { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
    table.meta th { width: 140px; text-align: left; color: #166534; font-weight: 700; padding: 8px 8px 8px 0; border-bottom: 1px solid #e5e7eb; }
    table.meta td { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    table.people { width: 100%; border-collapse: collapse; }
    table.people th { background: #188038; color: #fff; text-align: left; padding: 8px; font-weight: 700; }
    table.people td { padding: 12px 8px; border-bottom: 1px solid #e5e7eb; vertical-align: middle; }
    .sign { font-family: "Segoe Script", "Brush Script MT", cursive; font-size: 22px; color: #14532d; }
    h2 { margin: 18px 0 8px; color: #166534; font-size: 14px; }
    .minutes { white-space: pre-wrap; line-height: 1.45; margin: 0; }
    .notes { margin-top: 16px; }
    .notes strong { color: #166534; }
    .statement { margin-top: 22px; font-size: 11px; color: #4b5563; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-row">
      <div>${logoHtml}</div>
      <div class="header-contact">
        <div class="company">Servicelink Pty Ltd</div>
        <div>ABN 77 624 079 698</div>
        <div>Suite 309/49-51 Queens Rd, Five Dock NSW 2046</div>
        <div>Helpdesk@servicelink.net.au</div>
        <div>www.servicelink.net.au</div>
        <div>0420 220 220</div>
      </div>
    </div>
  </div>
  <h1>Toolbox talk record</h1>
  <p class="sub">Service360 attendance and electronic acknowledgment</p>
  <table class="meta">${fields}</table>
  <table class="people">
    <thead>
      <tr>
        <th>Staff</th>
        <th>Signature</th>
        <th>Date of completion</th>
      </tr>
    </thead>
    <tbody>${rows || '<tr><td colspan="3">No staff recorded</td></tr>'}</tbody>
  </table>
  ${opts.minutes ? `<h2>Minutes</h2><p class="minutes">${escapeHtml(opts.minutes)}</p>` : ''}
  ${opts.notes ? `<p class="notes"><strong>Notes.</strong> ${escapeHtml(opts.notes)}</p>` : ''}
  <p class="statement">The signature is the name the staff member typed when they submitted their electronic acknowledgment that they completed this toolbox talk.</p>
</body>
</html>`;
}

export async function generateToolboxRecordPdf(opts: {
  recordNo: string;
  kind: string;
  talkTitle: string;
  siteName?: string;
  deliveredAt?: Date | null;
  ledBy?: string;
  notes?: string;
  minutes?: string;
  people: ToolboxRecordPerson[];
}): Promise<string> {
  const html = buildHtml(opts);
  const isWindows = process.platform === 'win32';
  const execPath =
    process.env.PUPPETEER_EXECUTABLE_PATH?.trim() ||
    process.env.CHROME_PATH?.trim() ||
    (!isWindows ? '/usr/bin/chromium' : undefined);
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    ...(execPath ? { executablePath: execPath } : {}),
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    const pdf = await page.pdf({
      format: 'A4',
      landscape: false,
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
    });
    const key = `toolbox_record_${opts.recordNo}_${Date.now()}.pdf`;
    const buf = Buffer.from(pdf);
    if (shouldUploadReportPdfsToS3()) {
      return await uploadBufferToS3(buf, key, 'application/pdf');
    }
    const dir = path.join(process.cwd(), 'public', 'pdf');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, key), buf);
    const base = String(config.BASE_UPLOAD_URL || '').replace(/\/$/, '');
    return base ? `${base}/public/pdf/${key}` : `/public/pdf/${key}`;
  } finally {
    await browser.close();
  }
}
