import siteConfig from '@app/config/site.config';
import React from 'react';

type Props = {
  className?: string;
};

export default function FooterCopyright({ className }: Props) {
  return (
    <a
      className={className}
      href={siteConfig.footerCompanyUrl}
      target="_blank"
      rel="noopener noreferrer"
    >
      {siteConfig.footerText}
    </a>
  );
}
