import React from 'react';

export interface MoreOptionsCapsuleIconProps {
  className?: string;
  /** Whether to apply neon bloom glow filter */
  glow?: boolean;
  /** Active state for enhanced illumination */
  active?: boolean;
}

/**
 * Custom vector icon matching the user's design:
 * Stadium capsule container with 3 vertical dots, slash separator, and exit/logout arrow.
 * Supports theme-reactive colors via currentColor and CSS variables.
 */
export const MoreOptionsCapsuleIcon: React.FC<MoreOptionsCapsuleIconProps> = ({
  className = 'w-[60px] h-[26px]',
  glow = true,
  active = false,
}) => {
  return (
    <svg
      viewBox="0 0 72 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none transition-all duration-300 ${
        glow ? (active ? 'drop-shadow-[0_0_8px_currentColor]' : 'drop-shadow-[0_0_4px_currentColor]') : ''
      } ${className}`}
    >
      {/* Subtle translucent glass capsule background */}
      <rect
        x="1.5"
        y="1.5"
        width="69"
        height="29"
        rx="14.5"
        fill="currentColor"
        fillOpacity="0.06"
      />

      {/* Stadium capsule outline */}
      <rect
        x="1.5"
        y="1.5"
        width="69"
        height="29"
        rx="14.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeOpacity={active ? 1 : 0.85}
      />

      {/* 3 Vertical Dots (More Options) */}
      <circle cx="18" cy="9" r="2.2" fill="currentColor" />
      <circle cx="18" cy="16" r="2.2" fill="currentColor" />
      <circle cx="18" cy="23" r="2.2" fill="currentColor" />

      {/* Slanted Slash Divider */}
      <path
        d="M27 24L34 8"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />

      {/* Exit Door/Bracket */}
      <path
        d="M44 9H40C38.8954 9 38 9.89543 38 11V21C38 22.1046 38.8954 23 40 23H44"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* Exit Arrow Shaft */}
      <path
        d="M41 16H54"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* Exit Arrowhead */}
      <path
        d="M49 11L54 16L49 21"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default MoreOptionsCapsuleIcon;
