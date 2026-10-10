import React, { useState } from 'react';
import {
  X,
  Volume2,
  Check,
  Speaker,
  Compass,
  Tv,
  Layers,
  Sparkles,
} from 'lucide-react';
import { SpeakerRole, User } from '../types';
import { spatialTheaterEngine } from '../services/spatialTheaterEngine';
import { movieSyncService } from '../services/movieSyncService';
import { BACKGROUND_THEMES, BackgroundThemeId } from '../types/backgroundThemes';

interface SurroundRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  users: User[];
  isHost: boolean;
  activeTheme?: BackgroundThemeId;
}

interface RoleConfig {
  role: SpeakerRole;
  label: string;
  shortLabel: string;
  tagline: string;
}

const ROLES: RoleConfig[] = [
  {
    role: 'front_left',
    label: 'Front Left',
    shortLabel: 'L',
    tagline: 'Left Stereo Channel',
  },
  {
    role: 'center',
    label: 'Center Dialogue',
    shortLabel: 'C',
    tagline: 'Dialogue & Voices',
  },
  {
    role: 'front_right',
    label: 'Front Right',
    shortLabel: 'R',
    tagline: 'Right Stereo Channel',
  },
  {
    role: 'subwoofer',
    label: 'Subwoofer',
    shortLabel: 'SUB',
    tagline: 'Deep Bass & Impact',
  },
  {
    role: 'surround_left',
    label: 'Rear Left',
    shortLabel: 'RL',
    tagline: 'Surround Ambient',
  },
  {
    role: 'surround_right',
    label: 'Rear Right',
    shortLabel: 'RR',
    tagline: 'Surround Ambient',
  },
];

export const SurroundRoleModal: React.FC<SurroundRoleModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  users,
  isHost,
  activeTheme,
}) => {
  const [testingRole, setTestingRole] = useState<SpeakerRole | null>(null);

  if (!isOpen) return null;

  const activeThemeDef =
    BACKGROUND_THEMES.find((t) => t.id === activeTheme) || BACKGROUND_THEMES[0];
  const isLight = activeThemeDef.id === 'pure-light';

  const currentRole: SpeakerRole = currentUser?.speakerRole || 'all';

  const handleSelectRole = (role: SpeakerRole) => {
    movieSyncService.setSpeakerRole(role);
    playTestWithAnimation(role);
  };

  const playTestWithAnimation = (role: SpeakerRole) => {
    setTestingRole(role);
    spatialTheaterEngine.playSpeakerTestTone(role);
    setTimeout(() => {
      setTestingRole(null);
    }, 1200);
  };

  const handleTestTone = (role: SpeakerRole, e: React.MouseEvent) => {
    e.stopPropagation();
    playTestWithAnimation(role);
  };

  // Find devices mapped to each role
  const getDevicesForRole = (role: SpeakerRole) => {
    return users.filter((u) => u.speakerRole === role);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xl animate-fade-in select-none"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: isLight ? '#ffffff' : activeThemeDef.hexElevated,
          borderColor: isLight ? 'rgba(15, 23, 42, 0.1)' : activeThemeDef.hexBorder,
          color: isLight ? '#0f172a' : '#f8fafc',
        }}
        className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden backdrop-blur-2xl animate-scale-up"
      >
        {/* Subtle Accent Hairline Top Glow */}
        <div
          className="absolute top-0 left-0 right-0 h-1 pointer-events-none opacity-80"
          style={{
            background: `linear-gradient(90deg, transparent, ${activeThemeDef.accentHex || '#38bdf8'}, transparent)`,
          }}
        />

        {/* Modal Header */}
        <div
          style={{ borderColor: isLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.08)' }}
          className="flex items-center justify-between px-5 py-4 border-b shrink-0"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm">
              <Speaker className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-sm sm:text-base font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Surround Speaker Position
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 font-bold">
                  5.1 AUDIO
                </span>
              </div>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                Tap where this device is located in the room
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-full transition-colors cursor-pointer active:scale-90 ${isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 no-scrollbar">
          {/* Virtual Cinema Room Stage Layout */}
          <div
            style={{
              backgroundColor: isLight ? '#f8fafc' : 'rgba(0, 0, 0, 0.45)',
              borderColor: isLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.08)',
            }}
            className="p-3.5 sm:p-4 rounded-2xl border flex flex-col items-center"
          >
            {/* Movie Screen (Front of Room) */}
            <div
              style={{
                backgroundColor: isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.1)',
                borderColor: isLight ? 'rgba(15, 23, 42, 0.15)' : 'rgba(255, 255, 255, 0.2)',
              }}
              className="w-48 py-1.5 px-3 rounded-lg border text-center mb-4 flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Tv className="w-3.5 h-3.5 text-cyan-400" />
              <span className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-zinc-200'}`}>
                Movie Screen
              </span>
            </div>

            {/* Speaker Grid (3 Columns) */}
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5 w-full">
              {ROLES.map((cfg) => {
                const isSelected = currentRole === cfg.role;
                const isChiming = testingRole === cfg.role;
                const devices = getDevicesForRole(cfg.role);

                return (
                  <div
                    key={cfg.role}
                    onClick={() => handleSelectRole(cfg.role)}
                    style={{
                      backgroundColor: isSelected
                        ? isLight
                          ? '#e0f2fe'
                          : 'rgba(6, 182, 212, 0.15)'
                        : isLight
                        ? '#ffffff'
                        : 'rgba(255, 255, 255, 0.03)',
                      borderColor: isSelected
                        ? isLight
                          ? '#38bdf8'
                          : 'rgba(6, 182, 212, 0.6)'
                        : isLight
                        ? '#e2e8f0'
                        : 'rgba(255, 255, 255, 0.08)',
                    }}
                    className={`relative p-2.5 rounded-xl border flex flex-col items-center justify-between text-center min-h-[92px] cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                      isSelected ? 'shadow-[0_0_16px_rgba(6,182,212,0.25)] ring-1 ring-cyan-400/40' : ''
                    } ${isChiming ? 'animate-pulse ring-2 ring-cyan-400' : ''}`}
                  >
                    {/* Checkmark badge */}
                    {isSelected && (
                      <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-cyan-400 text-black flex items-center justify-center text-[9px] font-bold shadow-sm">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                    )}

                    <div className="flex flex-col items-center w-full">
                      <span
                        className={`text-[9px] font-mono font-black tracking-wider px-1.5 py-0.2 rounded-md mb-0.5 border ${
                          isSelected
                            ? 'bg-cyan-400/25 text-cyan-500 border-cyan-400/50'
                            : isLight
                            ? 'bg-slate-100 text-slate-600 border-slate-200'
                            : 'bg-white/5 text-zinc-400 border-white/10'
                        }`}
                      >
                        {cfg.shortLabel}
                      </span>
                      <h4
                        className={`text-[11px] font-bold truncate max-w-full ${
                          isSelected ? (isLight ? 'text-blue-900' : 'text-white') : isLight ? 'text-slate-800' : 'text-zinc-200'
                        }`}
                      >
                        {cfg.label}
                      </h4>
                      <p className={`text-[9px] truncate max-w-full ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                        {cfg.tagline}
                      </p>
                    </div>

                    {/* Test chime button */}
                    <button
                      type="button"
                      onClick={(e) => handleTestTone(cfg.role, e)}
                      className={`mt-1.5 w-full flex items-center justify-center gap-1 text-[9px] font-mono py-0.5 px-1.5 rounded-md transition-colors cursor-pointer active:scale-95 ${
                        isLight
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          : 'bg-white/10 hover:bg-white/20 text-zinc-300'
                      }`}
                      title="Play test chime"
                    >
                      <Volume2 className="w-2.5 h-2.5 text-cyan-400" />
                      <span>Test</span>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Audience Position Hint */}
            <div className={`mt-3 flex items-center gap-1.5 text-[11px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              <Compass className="w-3 h-3 text-cyan-400" />
              <span>Center Audience Spot</span>
            </div>
          </div>

          {/* Full Stereo (Default Mix) Card */}
          <div
            onClick={() => handleSelectRole('all')}
            style={{
              backgroundColor:
                currentRole === 'all'
                  ? isLight
                    ? '#e0f2fe'
                    : 'rgba(6, 182, 212, 0.15)'
                  : isLight
                  ? '#f8fafc'
                  : 'rgba(255, 255, 255, 0.03)',
              borderColor:
                currentRole === 'all'
                  ? isLight
                    ? '#38bdf8'
                    : 'rgba(6, 182, 212, 0.5)'
                  : isLight
                  ? '#e2e8f0'
                  : 'rgba(255, 255, 255, 0.08)',
            }}
            className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] ${
              currentRole === 'all'
                ? 'shadow-[0_0_16px_rgba(6,182,212,0.2)] ring-1 ring-cyan-400/40'
                : ''
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-7 h-7 rounded-lg border flex items-center justify-center ${
                  isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-white/10 border-white/15 text-zinc-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Full Stereo / Standard
                  </h4>
                  {currentRole === 'all' && (
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/40">
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                  Plays complete balanced stereo mix on this device
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => handleTestTone('all', e)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-mono flex items-center gap-1 transition-colors cursor-pointer active:scale-95 ${
                isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-800' : 'bg-white/10 hover:bg-white/20 text-zinc-300'
              }`}
            >
              <Volume2 className="w-3 h-3 text-cyan-400" />
              <span>Test</span>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{ borderColor: isLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.08)' }}
          className="p-3.5 sm:p-4 border-t flex items-center justify-between shrink-0"
        >
          <div className={`text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
            Assigned:{' '}
            <span className="font-mono text-cyan-400 font-bold uppercase">
              {currentRole === 'all' ? 'Stereo' : currentRole.replace('_', ' ')}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 active:scale-95 text-black font-extrabold text-xs tracking-wide shadow-[0_0_14px_rgba(6,182,212,0.35)] cursor-pointer transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
