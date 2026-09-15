import * as fs from 'fs';
import * as path from 'path';
import * as puppeteer from 'puppeteer';
import {
  shouldUploadReportPdfsToS3,
  uploadBufferToS3,
} from '../upload/s3-upload.helper';
import config from '../config';

function escapeHtml(s: string) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function generateTrainingCertificatePdf(opts: {
  staffName: string;
  moduleTitle: string;
  moduleCode: string;
  score: number;
  total: number;
  percent: number;
  passedAt: Date;
  expiresAt?: Date | null;
  certificateCode: string;
  kind?: string;
}): Promise<string> {
  const passedStr = opts.passedAt.toISOString().slice(0, 10);
  const expiresStr = opts.expiresAt
    ? opts.expiresAt.toISOString().slice(0, 10)
    : 'Does not expire';
  const kindLabel =
    String(opts.kind || '').toUpperCase() === 'INDUCTION'
      ? 'Site Induction'
      : 'Training Module';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: A4 landscape; margin: 24mm; }
    body {
      font-family: Georgia, "Times New Roman", serif;
      color: #0f241c;
      margin: 0;
    }
    .frame {
      border: 3px solid #147a54;
      padding: 36px 48px;
      min-height: 520px;
      box-sizing: border-box;
      position: relative;
      background:
        radial-gradient(800px 200px at 0% 0%, rgba(20,122,84,0.08), transparent 55%),
        #fff;
    }
    .eyebrow {
      text-transform: uppercase;
      letter-spacing: 0.18em;
      font-size: 12px;
      color: #147a54;
      font-family: Arial, sans-serif;
      font-weight: 700;
    }
    h1 {
      font-size: 42px;
      margin: 18px 0 8px;
      font-weight: 700;
    }
    .sub { color: #4d6359; font-size: 16px; margin: 0 0 28px; }
    .name {
      font-size: 34px;
      margin: 8px 0 20px;
      color: #147a54;
    }
    .meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px 28px;
      font-family: Arial, sans-serif;
      font-size: 14px;
      margin-top: 28px;
    }
    .meta div span { display: block; color: #4d6359; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; }
    .meta div strong { font-size: 15px; }
    .footer {
      margin-top: 40px;
      font-family: Arial, sans-serif;
      font-size: 12px;
      color: #4d6359;
    }
  </style>
</head>
<body>
  <div class="frame">
    <div class="eyebrow">Service360 � ${escapeHtml(kindLabel)} Certificate</div>
    <h1>Certificate of Completion</h1>
    <p class="sub">This certifies that</p>
    <div class="name">${escapeHtml(opts.staffName)}</div>
    <p class="sub">has successfully completed</p>
    <div style="font-size:22px;font-weight:700;">${escapeHtml(opts.moduleTitle)}</div>
    <div class="meta">
      <div><span>Module code</span><strong>${escapeHtml(opts.moduleCode)}</strong></div>
      <div><span>Score</span><strong>${opts.score}/${opts.total} (${opts.percent}%)</strong></div>
      <div><span>Completed</span><strong>${escapeHtml(passedStr)}</strong></div>
      <div><span>Valid until</span><strong>${escapeHtml(expiresStr)}</strong></div>
      <div><span>Certificate ID</span><strong>${escapeHtml(opts.certificateCode)}</strong></div>
    </div>
    <div class="footer">Provide this Certificate ID to employers who request proof of completion.</div>
  </div>
</body>
</html>`;

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
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' },
    });
    const buf = Buffer.from(pdf);
    const key = `training_cert_${opts.certificateCode}_${Date.now()}.pdf`;
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
