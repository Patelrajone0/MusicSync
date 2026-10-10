import React from 'react';
import {
  X,
  Volume2,
  Check,
  Sparkles,
  Speaker,
  Compass,
  Tv,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { SpeakerRole, User } from '../types';
import { spatialTheaterEngine } from '../services/spatialTheaterEngine';
import { movieSyncService } from '../services/movieSyncService';

interface SurroundRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  users: User[];
  isHost: boolean;
  activeTheme?: string;
}

interface RoleConfig {
  role: SpeakerRole;
  label: string;
  shortLabel: string;
  channelDesc: string;
  gridPos: string;
  acousticBadge: string;
  color: string;
}

const ROLES: RoleConfig[] = [
  {
    role: 'front_left',
    label: 'Front Left Speaker',
    shortLabel: 'LEFT',
    channelDesc: 'Left stereo channel · High-shelf presence',
    gridPos: 'col-start-1 row-start-1',
    acousticBadge: '8kHz High-Shelf · Pan -85%',
    color: 'from-blue-500/20 border-blue-400/40 text-blue-300',
  },
  {
    role: 'center',
    label: 'Center Dialogue',
    shortLabel: 'CENTER',
    channelDesc: 'Dialogue clarity boost · High-pass 120Hz',
    gridPos: 'col-start-2 row-start-1',
    acousticBadge: '2.8kHz Vocal EQ · Center Focus',
    color: 'from-amber-500/20 border-amber-400/40 text-amber-300',
  },
  {
    role: 'front_right',
    label: 'Front Right Speaker',
    shortLabel: 'RIGHT',
    channelDesc: 'Right stereo channel · High-shelf presence',
    gridPos: 'col-start-3 row-start-1',
    acousticBadge: '8kHz High-Shelf · Pan +85%',
    color: 'from-blue-500/20 border-blue-400/40 text-blue-300',
  },
  {
    role: 'subwoofer',
    label: 'Subwoofer / LFE',
    shortLabel: 'SUB / BASS',
    channelDesc: '24dB/oct low-pass at 120Hz · 55Hz rumble',
    gridPos: 'col-start-2 row-start-2',
    acousticBadge: '120Hz Low-Pass · +6dB Sub Rumble',
    color: 'from-red-500/20 border-rose-400/40 text-rose-300',
  },
  {
    role: 'surround_left',
    label: 'Rear Left Surround',
    shortLabel: 'REAR L',
    channelDesc: 'Haas +22ms delay · Air dampening filter',
    gridPos: 'col-start-1 row-start-3',
    acousticBadge: '+22ms Delay · Pan -95%',
    color: 'from-purple-500/20 border-purple-400/40 text-purple-300',
  },
  {
    role: 'surround_right',
    label: 'Rear Right Surround',
    shortLabel: 'REAR R',
    channelDesc: 'Haas +22ms delay · Air dampening filter',
    gridPos: 'col-start-3 row-start-3',
    acousticBadge: '+22ms Delay · Pan +95%',
    color: 'from-purple-500/20 border-purple-400/40 text-purple-300',
  },
];

export const SurroundRoleModal: React.FC<SurroundRoleModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  users,
  isHost,
}) => {
  if (!isOpen) return null;

  const currentRole: SpeakerRole = currentUser?.speakerRole || 'all';

  const handleSelectRole = (role: SpeakerRole) => {
    movieSyncService.setSpeakerRole(role);
    // Play instant acoustic test tone
    spatialTheaterEngine.playSpeakerTestTone(role);
  };

  const handleTestTone = (role: SpeakerRole, e: React.MouseEvent) => {
    e.stopPropagation();
    spatialTheaterEngine.playSpeakerTestTone(role);
  };

  // Find devices mapped to each role
  const getDevicesForRole = (role: SpeakerRole) => {
    return users.filter((u) => u.speakerRole === role);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xl animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--bg-surface, rgba(14, 16, 24, 0.95))',
          borderColor: 'var(--bg-border, rgba(255, 255, 255, 0.12))',
        }}
        className="relative w-full max-w-xl max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden backdrop-blur-2xl"
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent blur-sm pointer-events-none" />

        {/* Modal Header */}
        <div
          style={{ borderColor: 'var(--bg-border, rgba(255, 255, 255, 0.08))' }}
          className="flex items-center justify-between px-5 py-4 border-b shrink-0"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)]">
              <Speaker className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Multi-Device Surround Setup
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold">
                  5.1 SURROUND
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Tap your device's physical position in the room
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 no-scrollbar">
          {/* Virtual Cinema Room Stage Layout */}
          <div
            style={{
              backgroundColor: 'var(--bg-card, rgba(0, 0, 0, 0.6))',
              borderColor: 'var(--bg-border, rgba(255, 255, 255, 0.08))',
            }}
            className="p-4 rounded-2xl border relative flex flex-col items-center select-none"
          >
            {/* Movie Screen at Front of Room */}
            <div className="w-3/4 max-w-xs py-2 px-4 rounded-xl bg-gradient-to-b from-white/20 to-white/5 border border-white/20 text-center mb-5 shadow-[0_0_24px_rgba(255,255,255,0.15)] relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none animate-pulse" />
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-white uppercase tracking-widest">
                <Tv className="w-3.5 h-3.5 text-cyan-400" />
                <span>Movie Screen (Host)</span>
              </div>
            </div>

            {/* Interactive 3x3 Surround Sound Speaker Grid */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3 w-full">
              {ROLES.map((cfg) => {
                const isSelected = currentRole === cfg.role;
                const devices = getDevicesForRole(cfg.role);

                return (
                  <div
                    key={cfg.role}
                    onClick={() => handleSelectRole(cfg.role)}
                    className={`relative p-2.5 sm:p-3 rounded-2xl border transition-all cursor-pointer group flex flex-col items-center justify-between text-center min-h-[105px] ${
                      isSelected
                        ? 'bg-gradient-to-b from-cyan-500/25 to-blue-600/10 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.35)] ring-2 ring-cyan-400/40'
                        : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/10 hover:border-white/20'
                    }`}
                  >
                    {/* Active Selected Checkmark */}
                    {isSelected && (
                      <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-cyan-400 text-black flex items-center justify-center text-[10px] font-bold shadow-md">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                    )}

                    <div className="w-full flex flex-col items-center">
                      <span
                        className={`text-[10px] font-mono font-black tracking-wider px-2 py-0.5 rounded-full mb-1 border ${
                          isSelected
                            ? 'bg-cyan-400/20 text-cyan-300 border-cyan-400/50'
                            : 'bg-white/5 text-zinc-300 border-white/10'
                        }`}
                      >
                        {cfg.shortLabel}
                      </span>
                      <h4
                        className={`text-xs font-bold truncate max-w-full ${
                          isSelected ? 'text-white' : 'text-zinc-200'
                        }`}
                      >
                        {cfg.label}
                      </h4>
                    </div>

                    {/* Devices currently mapped to this speaker */}
                    <div className="my-1 flex flex-wrap gap-1 justify-center max-w-full">
                      {devices.length > 0 ? (
                        devices.map((d) => (
                          <span
                            key={d.id}
                            className="text-[9px] font-mono px-1.5 py-0.2 rounded-md bg-white/10 text-zinc-300 border border-white/10 truncate max-w-[80px]"
                            title={d.name}
                          >
                            {d.name.split('-')[0]}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-zinc-400 italic">
                          No device
                        </span>
                      )}
                    </div>

                    {/* Test Audio Chime Button */}
                    <button
                      type="button"
                      onClick={(e) => handleTestTone(cfg.role, e)}
                      className="mt-1 w-full flex items-center justify-center gap-1 text-[10px] font-mono py-1 px-2 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                      title="Play acoustic test tone"
                    >
                      <Volume2 className="w-3 h-3 text-cyan-400" />
                      <span>Test Chime</span>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Listener Position Pin at Center of Room */}
            <div className="mt-4 flex items-center gap-2 text-xs text-zinc-400 font-mono">
              <Compass className="w-3.5 h-3.5 text-cyan-400 animate-spin-slow" />
              <span>Center Listening Sweet Spot (Audience)</span>
            </div>
          </div>

          {/* Full Stereo Option */}
          <div
            onClick={() => handleSelectRole('all')}
            style={{
              backgroundColor:
                currentRole === 'all'
                  ? 'rgba(6, 182, 212, 0.12)'
                  : 'var(--bg-card, rgba(0, 0, 0, 0.4))',
              borderColor:
                currentRole === 'all'
                  ? 'rgba(6, 182, 212, 0.5)'
                  : 'var(--bg-border, rgba(255, 255, 255, 0.08))',
            }}
            className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
              currentRole === 'all'
                ? 'shadow-[0_0_16px_rgba(6,182,212,0.25)] ring-1 ring-cyan-400/40'
                : 'hover:bg-white/[0.04]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-zinc-200">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs sm:text-sm font-bold text-white">
                    Full Stereo / Standard
                  </h4>
                  {currentRole === 'all' && (
                    <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40">
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400">
                  Plays complete full-range stereo with 3D theater spatial reverb
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => handleTestTone('all', e)}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-mono text-zinc-300 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Test</span>
            </button>
          </div>

          {/* Acoustic Guide Note */}
          <div
            style={{
              backgroundColor: 'var(--bg-elevated, rgba(255, 255, 255, 0.03))',
              borderColor: 'var(--bg-border, rgba(255, 255, 255, 0.08))',
            }}
            className="p-3 rounded-2xl border text-xs text-zinc-400 flex items-start gap-2.5"
          >
            <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <span className="text-zinc-200 font-semibold">Pro Home Theater Tip:</span> Place one phone near the TV for{' '}
              <strong className="text-cyan-300">Center Dialogue</strong>, two phones on side tables as{' '}
              <strong className="text-blue-300">Left & Right</strong>, two behind you as{' '}
              <strong className="text-purple-300">Rear Surrounds</strong>, and one phone on a wooden table as{' '}
              <strong className="text-rose-300">Subwoofer</strong> for real cinematic room rumble!
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{ borderColor: 'var(--bg-border, rgba(255, 255, 255, 0.08))' }}
          className="p-4 border-t flex items-center justify-between shrink-0"
        >
          <div className="text-xs text-zinc-400">
            Selected:{' '}
            <span className="font-mono text-cyan-400 font-bold uppercase">
              {currentRole.replace('_', ' ')}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 active:scale-95 text-black font-extrabold text-xs tracking-wide shadow-[0_0_15px_rgba(6,182,212,0.4)] cursor-pointer transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
