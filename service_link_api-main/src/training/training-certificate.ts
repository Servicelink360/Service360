import * as fs from 'fs';
import * as path from 'path';
import * as puppeteer from 'puppeteer';
import {
  shouldUploadReportPdfsToS3,
  uploadBufferToS3,
} from '../upload/s3-upload.helper';
import config from '../config';

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

export type CertificateLayout = {
  templateKey?: string;
  orgName?: string;
  heading?: string;
  lead?: string;
  completedLine?: string;
  body?: string;
  signLeft?: string;
  signLeftRole?: string;
  signLeftNote?: string;
  signRight?: string;
  signRightRole?: string;
  signRightNote?: string;
  staffLine?: string;
  moduleLine?: string;
  dateLine?: string;
  imageUrl?: string;
  logoUrl?: string;
};

export function defaultCertificateLayout(templateKey = 'classic'): CertificateLayout {
  return {
    templateKey,
    orgName: 'Service360',
    heading: 'Certificate of Completion',
    staffLine: '{staff}',
    lead: 'has successfully completed the\n{modules}',
    moduleLine: '{title}',
    completedLine: 'This module was completed on',
    dateLine: '{date}',
    body: 'Score {score}. Module code {module}.\nValid until {valid}.',
    signLeft: 'Service360',
    signLeftRole: 'Issued by Service360',
    signLeftNote: 'Training record',
    signRight: 'Passed',
    signRightRole: 'Certificate ID',
    signRightNote: '{code}',
  };
}

function fillCertificateText(
  text: string,
  vars: { staff: string; modules: string; date: string; code: string; score: string; module: string; valid: string; title: string },
) {
  return escapeHtml(text || '')
    .replace(/\{staff\}/g, escapeHtml(vars.staff))
    .replace(/\{title\}/g, escapeHtml(vars.title))
    .replace(/\{modules\}/g, escapeHtml(vars.modules))
    .replace(/\{date\}/g, escapeHtml(vars.date))
    .replace(/\{code\}/g, escapeHtml(vars.code))
    .replace(/\{score\}/g, escapeHtml(vars.score))
    .replace(/\{module\}/g, escapeHtml(vars.module))
    .replace(/\{valid\}/g, escapeHtml(vars.valid))
    .replace(/\n/g, '<br/>');
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
  detail?: string;
  layout?: CertificateLayout | null;
}): string {
  const passedStr = formatCertDate(opts.passedAt);
  const expiresStr = opts.expiresAt ? formatCertDate(opts.expiresAt) : 'Does not expire';
  const isInduction = String(opts.kind || '').toUpperCase() === 'INDUCTION';
  const layout = {
    ...defaultCertificateLayout(opts.layout?.templateKey || 'classic'),
    ...(opts.layout || {}),
  };
  const tokens = {
    staff: opts.staffName,
    modules: opts.detail || opts.moduleTitle,
    date: passedStr,
    code: opts.certificateCode,
    score: `${opts.score}/${opts.total} (${opts.percent}%)`,
    module: opts.moduleCode,
    valid: expiresStr,
    title: opts.moduleTitle,
  };
  const lead = opts.layout
    ? fillCertificateText(layout.lead || '', tokens)
    : opts.detail
      ? 'has successfully completed'
      : isInduction
        ? 'has successfully completed the<br/>site induction'
        : 'has successfully completed the<br/>Servicelink training module';
  const customImage = layout.imageUrl ? escapeHtml(layout.imageUrl) : '';
  const plain = layout.templateKey === 'plain';
  const bundledLogo = logoDataUri();
  const logoHtml = layout.logoUrl
    ? `<img class="logo-img" src="${escapeHtml(layout.logoUrl)}" alt="" />`
    : bundledLogo
      ? `<div class="logo" style="-webkit-mask-image:url('${bundledLogo}');mask-image:url('${bundledLogo}');" role="img" aria-label="Servicelink"></div>`
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
    .sheet.plain {
      background: #fff;
      background-image: none;
      border: 10px solid #0f5c3f;
      box-sizing: border-box;
    }
    .sheet.plain .geo { display: none; }
    .sheet.custom {
      background: #fff center / contain no-repeat;
    }
    .sheet.custom .geo { display: none; }
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
    .logo-img {
      width: 58mm;
      height: 38mm;
      margin-top: 6mm;
      object-fit: contain;
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
  <div class="sheet${customImage ? ' custom' : plain ? ' plain' : ''}"${customImage ? ` style="background-image:url('${customImage}')"` : ''}>
    <div class="geo geo-tl"></div>
    <div class="geo geo-br"></div>
    <div class="inner">
      ${logoHtml}
      <p class="org">${fillCertificateText(layout.orgName || 'Service360', tokens)}</p>
      <h1>${opts.layout ? fillCertificateText(layout.heading || '', tokens) : 'Certificate of Completion'}</h1>
      <p class="name">${fillCertificateText(layout.staffLine || '{staff}', tokens)}</p>
      <p class="lead">${lead}</p>
      <p class="module">${fillCertificateText(layout.moduleLine || '{title}', tokens)}</p>
      <p class="when">${opts.layout ? fillCertificateText(layout.completedLine || '', tokens) : 'This module was completed on'}</p>
      <p class="date">${fillCertificateText(layout.dateLine || '{date}', tokens)}</p>
      <p class="award">${
        opts.layout
          ? fillCertificateText(layout.body || '', tokens)
          : opts.detail
            ? escapeHtml(opts.detail)
            : `Score ${opts.score}/${opts.total} (${opts.percent}%). Module code ${escapeHtml(opts.moduleCode)}.<br/>Valid until ${escapeHtml(expiresStr)}.`
      }</p>
      <div class="signs">
        <div>
          <span class="script">${opts.layout ? fillCertificateText(layout.signLeft || '', tokens) : 'Service360'}</span>
          <span class="rule"></span>
          <strong>${opts.layout ? fillCertificateText(layout.signLeftRole || '', tokens) : 'Issued by Service360'}</strong>
          <em>${opts.layout ? fillCertificateText(layout.signLeftNote || '', tokens) : 'Training record'}</em>
        </div>
        <div>
          <span class="script">${opts.layout ? fillCertificateText(layout.signRight || '', tokens) : 'Passed'}</span>
          <span class="rule"></span>
          <strong>${opts.layout ? fillCertificateText(layout.signRightRole || '', tokens) : 'Certificate ID'}</strong>
          <em>${fillCertificateText(layout.signRightNote || '{code}', tokens)}</em>
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
  detail?: string;
  layout?: CertificateLayout | null;
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
