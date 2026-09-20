import React from 'react';
import { User as UserIcon, Wifi, Globe, Zap, ArrowRight, Radio, Sliders } from 'lucide-react';
import { LobbyThemeProps } from './types';

export const LobbyStudioPro: React.FC<LobbyThemeProps> = ({
  userName,
  onNameChange,
  networkMode,
  onNetworkModeChange,
  roomCodeInput,
  onRoomCodeChange,
  isCreating,
  isJoining,
  isEntering,
  errorMessage,
  onCreateRoom,
  onJoinRoom,
}) => {
  const userInitial = userName.trim() ? userName.trim().slice(0, 2).toUpperCase() : 'DJ';

  return (
    <div className="relative w-full max-w-md mx-auto animate-fade-in select-none">
      {/* Matte Obsidian Glass Container */}
      <div className="relative bg-dark-950/95 backdrop-blur-3xl border border-white/10 hover:border-cyan-400/30 rounded-3xl p-5 sm:p-7 shadow-[0_0_50px_rgba(0,0,0,0.9),0_0_20px_rgba(0,240,255,0.08)] space-y-5 transition-all duration-300 overflow-hidden">
        {/* Top Precision Cyan Hairline */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent pointer-events-none" />

        {/* 1. USERNAME with User Avatar Node */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3 h-3 text-cyan-400" />
              <span>Identity Profile</span>
            </span>
            <span className="text-[10px] font-mono text-cyan-400/80">Anonymous Session</span>
          </div>

          <div className="flex items-center gap-2.5 bg-dark-900/90 border border-white/10 hover:border-cyan-400/30 focus-within:border-cyan-400 rounded-2xl p-2 sm:p-2.5 transition-all">
            {/* Avatar Badge */}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400/20 to-sky-500/10 border border-cyan-400/30 flex items-center justify-center text-xs font-mono font-bold text-cyan-300 shrink-0 shadow-inner">
              {userInitial}
            </div>

            <input
              type="text"
              value={userName}
              onChange={onNameChange}
              placeholder="Your Session Handle"
              maxLength={24}
              className="w-full bg-transparent text-sm text-white font-medium placeholder:text-slate-500 outline-none"
            />
          </div>
        </div>

        {/* 2. HIGH-DENSITY TELEMETRY NETWORK SELECTOR */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Radio className="w-3 h-3 text-cyan-400" />
              <span>Audio Network Route</span>
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {networkMode === 'local' ? 'LAN Broadcast' : 'Cloud WAN Relay'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* Local Wi-Fi Card */}
            <button
              type="button"
              onClick={() => onNetworkModeChange('local')}
              className={`p-3 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                networkMode === 'local'
                  ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_16px_rgba(0,240,255,0.25)] ring-1 ring-cyan-400/50'
                  : 'bg-dark-900/60 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <Wifi className={`w-4 h-4 ${networkMode === 'local' ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span className="px-1.5 py-0.2 rounded font-mono text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  &lt;1ms
                </span>
              </div>
              <h4 className="text-xs font-bold text-white">Local Wi-Fi</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Zero-jitter LAN mesh</p>
            </button>

            {/* Online Cloud Card */}
            <button
              type="button"
              onClick={() => onNetworkModeChange('online')}
              className={`p-3 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                networkMode === 'online'
                  ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_16px_rgba(0,240,255,0.25)] ring-1 ring-cyan-400/50'
                  : 'bg-dark-900/60 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <Globe className={`w-4 h-4 ${networkMode === 'online' ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span className="px-1.5 py-0.2 rounded font-mono text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  Global
                </span>
              </div>
              <h4 className="text-xs font-bold text-white">Online Cloud</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Cellular & remote WAN</p>
            </button>
          </div>
        </div>

        {/* 3. PRIMARY CTA */}
        <div>
          <button
            type="button"
            onClick={onCreateRoom}
            disabled={isCreating || isJoining || isEntering}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-cyan-300 hover:brightness-105 text-black font-extrabold text-sm transition-all duration-200 active:scale-[0.98] shadow-[0_0_20px_rgba(0,240,255,0.4)] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isCreating || isEntering ? (
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin shrink-0" />
            ) : (
              <Zap className="w-4 h-4 fill-current text-black shrink-0" />
            )}
            <span className="tracking-tight text-black font-black">
              {isEntering
                ? 'Establishing Sync...'
                : isCreating
                ? 'Creating Session...'
                : `Host New Studio Room (${networkMode === 'local' ? 'LAN' : 'Cloud'})`}
            </span>
          </button>
        </div>

        {/* 4. DIVIDER */}
        <div className="relative flex py-0.5 items-center">
          <div className="flex-grow border-t border-white/10" />
          <span className="mx-3 text-[10px] font-mono uppercase tracking-widest text-slate-500">
            or connect to room
          </span>
          <div className="flex-grow border-t border-white/10" />
        </div>

        {/* 5. INLINE JOIN BAR */}
        <form onSubmit={onJoinRoom} className="flex items-center gap-2">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={roomCodeInput}
            onChange={(e) => onRoomCodeChange(e.target.value.replace(/\D/g, ''))}
            placeholder="6-Digit Session Code"
            maxLength={6}
            disabled={isEntering}
            className="flex-1 bg-dark-900/90 border border-white/10 hover:border-cyan-400/30 focus:border-cyan-400 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-mono tracking-wider text-white placeholder:text-slate-500 outline-none transition-all"
          />
          <button
            type="submit"
            disabled={!roomCodeInput.trim() || isJoining || isEntering}
            className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-cyan-400 hover:text-black text-white font-bold text-xs sm:text-sm transition-all duration-200 active:scale-95 disabled:opacity-30 cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <span>Join</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Error Feedback */}
        {errorMessage && (
          <div className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-red-950/50 border border-red-500/30 text-red-300 text-xs text-center shadow-[0_0_15px_rgba(239,68,68,0.2)]">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.8)]" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
};
