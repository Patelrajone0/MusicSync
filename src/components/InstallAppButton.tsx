import React from 'react';
import { Download } from 'lucide-react';
import { usePWAInstall } from '../services/usePWAInstall';
import { triggerPwaInstallModal } from './InstallPwaPrompt';

// Custom SVG icon matching the exact desktop address-bar install icon shown in the user's screenshot
export const DesktopInstallIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Computer monitor frame */}
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <path d="M8 21h8" />
    <path d="M12 17v4" />
    {/* Download arrow into the screen */}
    <path d="M12 7v6" />
    <path d="m9 10 3 3 3-3" />
  </svg>
);

interface InstallAppButtonProps {
  variant?: 'header' | 'lobby' | 'compact';
  className?: string;
}

export const InstallAppButton: React.FC<InstallAppButtonProps> = ({
  variant = 'header',
  className = ''
}) => {
  const { isInstalled } = usePWAInstall();

  // If already installed as a standalone app, hide the button
  if (isInstalled) return null;

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={() => triggerPwaInstallModal()}
        title="Install MusicSync App"
        aria-label="Install MusicSync App"
        className={`p-2 rounded-xl bg-slate-900/80 hover:bg-cyan-950/40 border border-slate-700/60 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-400 transition-all duration-200 active:scale-95 shadow-sm ${className}`}
      >
        <DesktopInstallIcon className="w-4 h-4" />
      </button>
    );
  }

  if (variant === 'lobby') {
    return (
      <button
        type="button"
        onClick={() => triggerPwaInstallModal()}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-850 border border-cyan-500/30 hover:border-cyan-400/60 text-cyan-300 hover:text-cyan-200 text-xs font-semibold tracking-wide shadow-[0_0_15px_rgba(0,240,255,0.15)] hover:shadow-[0_0_20px_rgba(0,240,255,0.25)] transition-all duration-200 active:scale-95 cursor-pointer ${className}`}
      >
        <DesktopInstallIcon className="w-3.5 h-3.5 text-cyan-400" />
        <span>Install App</span>
      </button>
    );
  }

  // Default 'header' style
  return (
    <button
      type="button"
      onClick={() => triggerPwaInstallModal()}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-cyan-950/50 border border-slate-700/60 hover:border-cyan-500/50 text-slate-200 hover:text-cyan-300 text-xs font-medium transition-all duration-200 active:scale-95 cursor-pointer ${className}`}
      title="Install MusicSync App to your desktop or phone"
    >
      <DesktopInstallIcon className="w-3.5 h-3.5 text-cyan-400" />
      <span className="hidden sm:inline font-semibold">Install</span>
    </button>
  );
};
