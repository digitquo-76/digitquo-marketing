import React from 'react';

export function Svg({ size = 24, strokeWidth = "1.8", children, ...props }: { size?: number | string, strokeWidth?: string, children: React.ReactNode, [key: string]: any }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      {children}
    </svg>
  );
}

export function LogoMark() {
  return <span className="logo-mark"><LogoIcon size={18} strokeWidth="2.5" /></span>;
}

export function LogoIcon({ size = 18, strokeWidth = '2.4' }) {
  return (
    <Svg size={size} strokeWidth={strokeWidth}>
      <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
      <line x1="12" y1="22" x2="12" y2="15.5" />
      <polyline points="22 8.5 12 15.5 2 8.5" />
    </Svg>
  );
}

export function ArrowRightIcon({ size = 16 }) {
  return (
    <Svg size={size} strokeWidth="2.5">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </Svg>
  );
}

export function PlayIcon() {
  return (
    <Svg size={16} strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polygon points="10 8 16 12 10 16 10 8" />
    </Svg>
  );
}

export function StarIcon() {
  return (
    <Svg size={14} strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </Svg>
  );
}

export function LayersIcon() {
  return (
    <Svg>
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </Svg>
  );
}

export function SearchIcon({ size = 24 }) {
  return (
    <Svg size={size}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </Svg>
  );
}

export function ShieldIcon({ size = 24 }) {
  return (
    <Svg size={size}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </Svg>
  );
}

export function ChartIcon() {
  return (
    <Svg>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </Svg>
  );
}

export function ClockIcon() {
  return (
    <Svg size={14} strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </Svg>
  );
}

export function UsersIcon({ size = 14 }) {
  return (
    <Svg size={size} strokeWidth={size === 14 ? '2' : '1.5'}>
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </Svg>
  );
}

export function HomeIcon({ size = 28 }) {
  return (
    <Svg size={size} strokeWidth={size === 28 ? '1.5' : '1.8'}>
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </Svg>
  );
}

export function CheckIcon() {
  return (
    <Svg size={14} strokeWidth="2.5">
      <polyline points="20 6 9 17 4 12" />
    </Svg>
  );
}

export function MessageIcon() {
  return (
    <Svg size={14} strokeWidth="2">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </Svg>
  );
}

export function TwitterIcon() {
  return (
    <Svg size={18} strokeWidth="1.5">
      <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
    </Svg>
  );
}

export function LinkedInIcon() {
  return (
    <Svg size={18} strokeWidth="1.5">
      <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </Svg>
  );
}

export function InstagramIcon() {
  return (
    <Svg size={18} strokeWidth="1.5">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </Svg>
  );
}

export function GridIcon() {
  return (
    <Svg size={18}>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </Svg>
  );
}

export function PackageIcon({ size = 18 }) {
  return (
    <Svg size={size}>
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </Svg>
  );
}

export function ActivityIcon({ size = 18 }) {
  return (
    <Svg size={size}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </Svg>
  );
}

export function SaleIcon({ size = 18 }) {
  return (
    <Svg size={size}>
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 000 7H14a3.5 3.5 0 010 7H6" />
    </Svg>
  );
}

export function EditIcon() {
  return (
    <Svg size={15} strokeWidth="2">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 013 3L8 18l-4 1 1-4z" />
    </Svg>
  );
}

export function TrashIcon() {
  return (
    <Svg size={15} strokeWidth="2">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6m3 0V4h8v2" />
    </Svg>
  );
}

export function MenuIcon() {
  return (
    <Svg size={20} strokeWidth="2">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </Svg>
  );
}

export function BackIcon() {
  return (
    <Svg size={18}>
      <path d="M19 12H5" />
      <polyline points="12 19 5 12 12 5" />
    </Svg>
  );
}
