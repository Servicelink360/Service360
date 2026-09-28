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

function formatCertDate(d: Date) {
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Australia/Sydney',
  }).format(d);
}

function logoDataUri(): string {
  const name = 'servicelink-logo.png';
  const candidates = [
    path.join(__dirname, 'assets', name),
    path.join(__dirname, 'training', 'assets', name),
    path.join(__dirname, 'src', 'training', 'assets', name),
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

export function buildTrainingCertificateHtml(opts: {
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
}): string {
  const passedStr = formatCertDate(opts.passedAt);
  const expiresStr = opts.expiresAt ? formatCertDate(opts.expiresAt) : 'Does not expire';
  const isInduction = String(opts.kind || '').toUpperCase() === 'INDUCTION';
  const lead = isInduction
    ? 'has successfully completed the<br/>site induction'
    : 'has successfully completed the<br/>Servicelink training module';
  const logo = logoDataUri();
  const logoHtml = logo
    ? `<div class="logo" style="-webkit-mask-image:url('${logo}');mask-image:url('${logo}');" role="img" aria-label="Servicelink"></div>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: A4 portrait; margin: 0; }
    html, body { margin: 0; padding: 0; }
    .sheet {
      width: 210mm;
      height: 297mm;
      position: relative;
      overflow: hidden;
      background-color: #fbfaf7;
      background-image:
        radial-gradient(ellipse at 18% 22%, rgba(255, 255, 255, 0.95), transparent 42%),
        radial-gradient(ellipse at 78% 62%, rgba(214, 206, 190, 0.45), transparent 46%),
        radial-gradient(ellipse at 40% 88%, rgba(186, 204, 192, 0.28), transparent 40%),
        linear-gradient(180deg, #fcfbf8 0%, #f4f1ea 100%);
      color: #1a1a1a;
    }
    .geo { position: absolute; width: 54mm; height: 54mm; }
    .geo-tl {
      top: 0; left: 0;
      background:
        linear-gradient(128deg, transparent 42%, #c6a15a 42.4%, #c6a15a 45.2%, transparent 45.6%),
        linear-gradient(148deg, #083828 0 34%, transparent 34.2%),
        linear-gradient(132deg, #0f5c3f 0 48%, transparent 48.2%),
        linear-gradient(118deg, #1b7a4e 0 62%, transparent 62.2%);
    }
    .geo-br {
      right: 0; bottom: 0;
      background:
        linear-gradient(308deg, transparent 42%, #c6a15a 42.4%, #c6a15a 45.2%, transparent 45.6%),
        linear-gradient(328deg, #083828 0 34%, transparent 34.2%),
        linear-gradient(312deg, #0f5c3f 0 48%, transparent 48.2%),
        linear-gradient(298deg, #1b7a4e 0 62%, transparent 62.2%);
    }
    .inner {
      position: relative;
      z-index: 1;
      height: 297mm;
      box-sizing: border-box;
      padding: 16mm 18mm 14mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      font-family: Georgia, "Times New Roman", serif;
    }
    .logo {
      width: 58mm;
      height: 38mm;
      margin-top: 6mm;
      background-color: #0f5c3f;
      -webkit-mask-repeat: no-repeat;
      mask-repeat: no-repeat;
      -webkit-mask-position: center;
      mask-position: center;
      -webkit-mask-size: contain;
      mask-size: contain;
    }
    .org { margin: 3mm 0 0; font-size: 13px; letter-spacing: 0.04em; color: #1c1c1c; }
    h1 {
      margin: 8mm 0 0;
      font-size: 34px;
      line-height: 1.05;
      font-weight: 700;
      color: #0f5c3f;
    }
    .name { margin: 6mm 0 0; font-size: 28px; line-height: 1.1; font-weight: 700; color: #161616; }
    .lead { margin: 7mm 0 0; font-size: 15px; line-height: 1.35; color: #3a3a3a; }
    .module { margin: 5mm 0 0; font-size: 24px; line-height: 1.15; font-weight: 700; color: #121212; }
    .when { margin: 8mm 0 0; font-size: 14px; color: #3a3a3a; }
    .date { margin: 2mm 0 0; font-size: 18px; font-weight: 700; color: #161616; }
    .award { margin: 4mm 0 0; font-size: 13px; line-height: 1.45; color: #3a3a3a; }
    .signs {
      margin-top: auto;
      margin-bottom: 16mm;
      width: 78%;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8mm;
    }
    .signs div { display: flex; flex-direction: column; align-items: center; }
    .script {
      font-family: "Segoe Script", "Brush Script MT", cursive;
      font-size: 20px;
      line-height: 1;
      color: #1a1a1a;
      margin-bottom: 1mm;
    }
    .rule { width: 78%; height: 1px; background: #1a1a1a; margin-bottom: 2mm; }
    .signs strong { font-size: 12px; font-weight: 700; }
    .signs em { font-style: normal; font-size: 11px; color: #333; }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="geo geo-tl"></div>
    <div class="geo geo-br"></div>
    <div class="inner">
      ${logoHtml}
      <p class="org">Service360</p>
      <h1>Certificate of Completion</h1>
      <p class="name">${escapeHtml(opts.staffName)}</p>
      <p class="lead">${lead}</p>
      <p class="module">${escapeHtml(opts.moduleTitle)}</p>
      <p class="when">This module was completed on</p>
      <p class="date">${escapeHtml(passedStr)}</p>
      <p class="award">Score ${opts.score}/${opts.total} (${opts.percent}%). Module code ${escapeHtml(opts.moduleCode)}.<br/>Valid until ${escapeHtml(expiresStr)}.</p>
      <div class="signs">
        <div>
          <span class="script">Service360</span>
          <span class="rule"></span>
          <strong>Issued by Service360</strong>
          <em>Training record</em>
        </div>
        <div>
          <span class="script">Passed</span>
          <span class="rule"></span>
          <strong>Certificate ID</strong>
          <em>${escapeHtml(opts.certificateCode)}</em>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
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
  const html = buildTrainingCertificateHtml(opts);

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
