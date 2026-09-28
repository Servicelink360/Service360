import React from 'react';
import { Link } from 'react-router-dom';
import { PUBLIC_ROUTE } from '@app/route.constants';
import servicelinkLogo from '@app/assets/images/signin/servicelink-logo-transparent.png';
import './certificateSample.css';

const SAMPLE = {
  staffName: 'Alex Nguyen',
  moduleTitle: 'Servicelink Training',
  moduleCode: 'SL',
  score: '5/5 (100%)',
  completed: '15 September 2026',
  validUntil: '15 September 2027',
  certificateId: 'S360-SL-SAMPLE',
};

const logoMask = { ['--cert-logo']: `url("${servicelinkLogo}")` } as React.CSSProperties;

export default function CertificateSamplePage() {
  return (
    <main className="cert-sample">
      <p className="cert-sample-note">
        Sample only. Staff receive a certificate like this after they pass an assigned module.{' '}
        <Link to={PUBLIC_ROUTE.MARKETING_TRAINING}>Training and induction</Link>
      </p>
      <article className="cert-sheet" aria-label="Sample training certificate">
        <div className="cert-geo cert-geo-tl" aria-hidden="true" />
        <div className="cert-geo cert-geo-br" aria-hidden="true" />
        <div className="cert-sheet-inner">
          <div className="cert-logo" style={logoMask} role="img" aria-label="Servicelink" />
          <p className="cert-org">Service360</p>
          <h1>Certificate of Completion</h1>
          <p className="cert-name">{SAMPLE.staffName}</p>
          <p className="cert-lead">
            has successfully completed the
            <br />
            Servicelink training module
          </p>
          <p className="cert-module">{SAMPLE.moduleTitle}</p>
          <p className="cert-when">This module was completed on</p>
          <p className="cert-date">{SAMPLE.completed}</p>
          <p className="cert-award">
            Score {SAMPLE.score}. Module code {SAMPLE.moduleCode}.
            <br />
            Valid until {SAMPLE.validUntil}.
          </p>
          <div className="cert-signs">
            <div>
              <span className="cert-script">Service360</span>
              <span className="cert-sign-rule" />
              <strong>Issued by Service360</strong>
              <span>Training record</span>
            </div>
            <div>
              <span className="cert-script">Passed</span>
              <span className="cert-sign-rule" />
              <strong>Certificate ID</strong>
              <span>{SAMPLE.certificateId}</span>
            </div>
          </div>
        </div>
      </article>
    </main>
  );
}
