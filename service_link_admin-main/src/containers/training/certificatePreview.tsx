import servicelinkLogo from '@app/assets/images/signin/servicelink-logo-transparent.png';
import React from 'react';
import '../marketing/certificateSample.css';

const logoMask = { ['--cert-logo']: `url("${servicelinkLogo}")` } as React.CSSProperties;

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

export type CertificateFill = {
  staff?: string;
  title?: string;
  modules?: string;
  date?: string;
  code?: string;
  score?: string;
  module?: string;
  valid?: string;
};

function fill(text: string, sample: boolean, title: string, values?: CertificateFill) {
  const pick = (token: string, sampleValue: string, given?: string) =>
    given || (sample ? sampleValue : token);
  return String(text || '')
    .replace(/\{staff\}/g, pick('{staff}', 'Alex Nguyen', values?.staff))
    .replace(/\{title\}/g, pick(title || '{title}', title || 'Servicelink Training', values?.title || title))
    .replace(/\{modules\}/g, pick('{modules}', 'Office Worker Safety, Manual Handling', values?.modules))
    .replace(/\{date\}/g, pick('{date}', '15 September 2026', values?.date))
    .replace(/\{code\}/g, pick('{code}', 'S360-SL-SAMPLE', values?.code))
    .replace(/\{score\}/g, pick('{score}', '5/5 (100%)', values?.score))
    .replace(/\{module\}/g, pick('{module}', 'SL', values?.module))
    .replace(/\{valid\}/g, pick('{valid}', '15 September 2027', values?.valid));
}

export const CertificatePreview: React.FC<{
  title: string;
  layout: CertificateLayout;
  sample?: boolean;
  full?: boolean;
  values?: CertificateFill;
}> = ({ title, layout, sample = true, full = false, values }) => {
  const plain = layout.templateKey === 'plain';
  const text = (value?: string) => fill(value || '', sample, title, values);
  const frame = full
    ? {
        width: 'auto' as const,
        maxWidth: '100%',
        aspectRatio: '210 / 297',
        height: 'min(calc(100vh - 168px), calc(min(720px, 100vw - 96px) * 297 / 210))',
      }
    : { width: 280, maxWidth: 280 };
  return (
    <article
      className={`cert-sheet${plain ? ' cert-sheet-plain' : ''}`}
      aria-label="Certificate"
      style={
        layout.imageUrl
          ? {
              ...frame,
              backgroundColor: '#fff',
              backgroundImage: `url("${layout.imageUrl}")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              backgroundSize: 'contain',
            }
          : frame
      }
    >
      {layout.imageUrl ? null : (
        <>
          <div className="cert-geo cert-geo-tl" aria-hidden="true" />
          <div className="cert-geo cert-geo-br" aria-hidden="true" />
        </>
      )}
      <div className="cert-sheet-inner">
        {layout.logoUrl ? (
          <img className="cert-logo-img" src={layout.logoUrl} alt="" />
        ) : (
          <div className="cert-logo" style={logoMask} role="img" aria-label="Servicelink" />
        )}
        <p className="cert-org">{text(layout.orgName)}</p>
        <h1>{text(layout.heading)}</h1>
        <p className="cert-name">{text(layout.staffLine || '{staff}')}</p>
        <p className="cert-lead">{text(layout.lead)}</p>
        <p className="cert-module">{text(layout.moduleLine || '{title}')}</p>
        <p className="cert-when">{text(layout.completedLine)}</p>
        <p className="cert-date">{text(layout.dateLine || '{date}')}</p>
        <p className="cert-award">{text(layout.body)}</p>
        <div className="cert-signs">
          <div>
            <span className="cert-script">{text(layout.signLeft)}</span>
            <span className="cert-sign-rule" />
            <strong>{text(layout.signLeftRole)}</strong>
            <span>{text(layout.signLeftNote)}</span>
          </div>
          <div>
            <span className="cert-script">{text(layout.signRight)}</span>
            <span className="cert-sign-rule" />
            <strong>{text(layout.signRightRole)}</strong>
            <span>{text(layout.signRightNote || '{code}')}</span>
          </div>
        </div>
      </div>
    </article>
  );
};
