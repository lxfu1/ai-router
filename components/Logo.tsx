'use client';

interface LogoProps {
  size?: number;
  idPrefix?: string;
}

export default function Logo({ size = 36, idPrefix = 'logo' }: LogoProps) {
  const mId = `${idPrefix}-m`;
  const aId = `${idPrefix}-a`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={size}
      height={size}
    >
      <defs>
        <linearGradient id={mId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#667eea" />
          <stop offset="100%" stopColor="#764ba2" />
        </linearGradient>
        <linearGradient id={aId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#4facfe" />
          <stop offset="100%" stopColor="#00f2fe" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="20" fill={`url(#${mId})`} />
      <circle cx="50" cy="50" r="15" fill="white" />
      <circle cx="50" cy="50" r="8" fill={`url(#${aId})`} />
      <circle cx="50" cy="22" r="5" fill="white" />
      <circle cx="26" cy="70" r="5" fill="white" />
      <circle cx="74" cy="70" r="5" fill="white" />
      <path
        d="M50 35 L50 27 M38 58 L30 67 M62 58 L70 67"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
