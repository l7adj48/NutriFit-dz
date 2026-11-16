import React from 'react';
import { clamp } from '../utils/nutrition';

interface SvgRingProps {
  progress: number;
  size: number;
  strokeWidth?: number;
  color: string;
  trackColor?: string;
  ariaLabel?: string;
  children?: React.ReactNode;
}

export const SvgRing: React.FC<SvgRingProps> = ({
  progress,
  size,
  strokeWidth = 9,
  color,
  trackColor = '#232329',
  ariaLabel,
  children,
}) => {
  const radius = size / 2 - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const clamped = clamp(progress, 0, 1);
  const offset = circumference * (1 - clamped);

  const rootAriaProps = ariaLabel
    ? { role: 'img' as const, 'aria-label': ariaLabel }
    : { 'aria-hidden': true as const };

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
      {...rootAriaProps}
    >
      <svg
        width={size}
        height={size}
        className="-rotate-90 block"
        aria-hidden="true"
        focusable="false"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
      </svg>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center text-center"
        aria-hidden="true"
      >
        {children}
      </div>
    </div>
  );
};
