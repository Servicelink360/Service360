import React from 'react';

type Props = {
  variant?: 'dark' | 'light';
};

export default function MarketingLogo({ variant = 'dark' }: Props) {
  const isLight = variant === 'light';
  const ringId = isLight ? 'logo-ring-green' : 'logo-ring-light';
  const outerStroke = isLight ? '#e1f3ed' : 'rgba(255,255,255,0.18)';
  const ringGradient = isLight ? (
    <>
      <stop offset="0%" stopColor="#397d36" />
      <stop offset="100%" stopColor="#2f6b2c" />
    </>
  ) : (
    <>
      <stop offset="0%" stopColor="#86efac" />
      <stop offset="100%" stopColor="#4ade80" />
    </>
  );

  return (
    <div className="logo-mark" aria-hidden="true">
      <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Service360">
        <defs>
          <linearGradient id={ringId} x1="0%" y1="0%" x2="100%" y2="100%">
            {ringGradient}
          </linearGradient>
        </defs>
        <circle cx="24" cy="24" r="19" fill="none" stroke={outerStroke} strokeWidth="3.5" />
        <circle
          cx="24"
          cy="24"
          r="19"
          fill="none"
          stroke={`url(#${ringId})`}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray="119.38"
          transform="rotate(-90 24 24)"
        />
        <path
          d="M24 5 L27 11 L21 11 Z"
          fill={isLight ? '#397d36' : '#86efac'}
          transform="rotate(0 24 24)"
        />
        <text
          x="24"
          y="28"
          textAnchor="middle"
          fontSize="12"
          fontWeight="700"
          fill={isLight ? '#0f5c3f' : '#ffffff'}
          fontFamily="Plus Jakarta Sans, system-ui, sans-serif"
        >
          360°
        </text>
      </svg>
    </div>
  );
}
