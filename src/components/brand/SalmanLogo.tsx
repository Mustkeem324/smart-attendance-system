'use client';

import React from 'react';
import Link from 'next/link';

interface SalmanLogoProps {
  variant?: 'full' | 'icon' | 'compact';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  href?: string;
  className?: string;
}

export function SalmanIcon({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
        <defs>
          <linearGradient id="seIconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#9D72FF" />
            <stop offset="50%" stopColor="#602BF7" />
            <stop offset="100%" stopColor="#4818D9" />
          </linearGradient>
          <linearGradient id="seBorderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#A78BFA" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#5428E8" stopOpacity="0.3" />
          </linearGradient>
          <filter id="seGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Squircle Shell */}
        <rect x="3" y="3" width="94" height="94" rx="26" fill="#0C102C" stroke="url(#seBorderGrad)" strokeWidth="3" />
        
        {/* Ambient Inner Glow */}
        <circle cx="50" cy="50" r="28" fill="#602BF7" opacity="0.35" filter="url(#seGlow)" />

        {/* Stylized Interlocking SE Monogram */}
        <path
          d="M 32 36 C 32 27, 43 23, 53 23 C 66 23, 75 28, 77 37 C 78 41, 75 44, 70 44 L 46 44 C 40 44, 36 47, 36 52 C 36 56, 40 60, 46 60 L 67 60 C 72 60, 75 63, 75 68 C 75 77, 66 81, 52 81 C 37 81, 27 75, 26 66 C 25 62, 28 59, 32 59 L 56 59 C 62 59, 65 56, 65 52 C 65 48, 62 45, 56 45 L 39 45 C 34 45, 32 41, 32 36 Z"
          fill="url(#seIconGrad)"
        />

        {/* Precision Circuit Nodes */}
        <circle cx="32" cy="36" r="3.5" fill="#00E5FF" />
        <circle cx="68" cy="80" r="3.5" fill="#00E5FF" />
        <circle cx="50" cy="52" r="3" fill="#FFFFFF" />
      </svg>
    </div>
  );
}

export default function SalmanLogo({
  variant = 'full',
  size = 'md',
  showSubtitle = true,
  href,
  className = '',
}: SalmanLogoProps) {
  const sizeClasses = {
    sm: { icon: 'h-7 w-7', title: 'text-xs', sub: 'text-[8px]' },
    md: { icon: 'h-9 w-9 sm:h-10 sm:w-10', title: 'text-sm sm:text-base', sub: 'text-[9px] sm:text-[10px]' },
    lg: { icon: 'h-12 w-12', title: 'text-lg sm:text-xl', sub: 'text-[11px]' },
    xl: { icon: 'h-16 w-16', title: 'text-2xl sm:text-3xl', sub: 'text-xs' },
  }[size];

  const content = (
    <div className={`flex items-center gap-2.5 sm:gap-3 group select-none ${className}`}>
      <SalmanIcon className={sizeClasses.icon} />

      {variant !== 'icon' && (
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1 leading-tight font-black tracking-tight text-white font-sans">
            <span className={sizeClasses.title}>SALMAN</span>
            <span className={`bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent ${sizeClasses.title}`}>
              ENTERPRISES
            </span>
          </div>
          {showSubtitle && (
            <span className={`font-bold uppercase tracking-widest text-purple-400 block leading-tight ${sizeClasses.sub}`}>
              B2B DISTRIBUTION
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center focus:outline-none">
        {content}
      </Link>
    );
  }

  return content;
}
