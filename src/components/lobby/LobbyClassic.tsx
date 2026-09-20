import React from 'react';
import { User as UserIcon, Wifi, Globe, Zap, ArrowRight, Radio, Lock } from 'lucide-react';
import { LobbyThemeProps } from './types';

export const LobbyClassic: React.FC<LobbyThemeProps> = ({
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
  return (
    <div className="relative bg-dark-900/85 backdrop-blur-2xl border border-white/10 hover:border-cyan-400/30 rounded-3xl p-4 sm:p-6 md:p-7 shadow-[0_0_50px_rgba(0,0,0,0.8),0_0_25px_rgba(0,240,255,0.06)] space-y-4 sm:space-y-6 transition-all duration-300 w-full max-w-md mx-auto overflow-hidden box-border animate-fade-in select-none">
      {/* Ambient Cyber Top Accent Line */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent pointer-events-none" />

      {/* Username Input */}
      <div>
        <div className="flex items-center gap-1.5 mb-1.5 sm:mb-2">
          <div className="relative w-4 h-4 rounded-full p-[1px] bg-gradient-to-tr from-cyan-400 via-sky-400 to-fuchsia-500 shadow-[0_0_6px_rgba(0,240,255,0.4)] shrink-0 flex items-center justify-center">
            <div className="w-full h-full rounded-full bg-dark-950 flex items-center justify-center">
              <UserIcon className="w-2.5 h-2.5 text-cyan-400" />
            </div>
          </div>
          <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono">
            Username
          </label>
        </div>
        <div className="relative w-full">
          <input
            type="text"
            value={userName}
            onChange={onNameChange}
            placeholder="Enter your username"
            maxLength={24}
            className="w-full min-w-0 bg-dark-950/90 border border-white/10 hover:border-cyan-400/30 focus:border-cyan-400 focus:shadow-[0_0_16px_rgba(0,240,255,0.25)] rounded-full px-4 sm:px-5 py-2.5 sm:py-3 text-sm sm:text-base text-white font-semibold focus:outline-none transition-all duration-200"
          />
        </div>
        <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1 sm:mt-1.5 pl-1">
          No account required. Instant anonymous access.
        </p>
      </div>

      {/* Network Mode Setting */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="relative w-4 h-4 rounded-full p-[1px] bg-gradient-to-tr from-cyan-400 via-sky-400 to-fuchsia-500 shadow-[0_0_6px_rgba(0,240,255,0.4)] shrink-0 flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-dark-950 flex items-center justify-center">
                <Radio className="w-2.5 h-2.5 text-cyan-400" />
              </div>
            </div>
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono">
              Room Network Mode
            </label>
          </div>
          <span className={`text-[10px] font-mono font-bold ${networkMode === 'local' ? 'text-emerald-400' : 'text-cyan-400'}`}>
            {networkMode === 'local' ? '🔒 Private · Same Wi-Fi Only' : '🌐 Public · Open to Everyone'}
          </span>
        </div>

        {/* 2 Selectable Mode Cards */}
        <div className="grid grid-cols-2 gap-2 w-full">
          {/* Option A: Local Wi-Fi (Private) */}
          <button
            type="button"
            onClick={() => onNetworkModeChange('local')}
            className={`p-2.5 sm:p-3 rounded-2xl border text-left transition-all duration-200 cursor-pointer active:scale-[0.98] ${
              networkMode === 'local'
                ? 'bg-emerald-950/60 border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.3)] ring-1 ring-emerald-400/60'
                : 'bg-dark-950/70 hover:bg-dark-850/80 border-white/10 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white">
                <Wifi className={`w-3.5 h-3.5 ${networkMode === 'local' ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>Local Wi-Fi</span>
              </span>
              {networkMode === 'local' && (
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-0.5">
                  <Lock className="w-2 h-2 text-emerald-400" />
                  PRIVATE
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 font-bold mb-0.5">
              <Zap className="w-3 h-3 fill-emerald-400 shrink-0" />
              <span>0ms Delay · Same Wi-Fi</span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 leading-tight">
              Private room. Only devices on the same Wi-Fi or hotspot can join.
            </p>
          </button>

          {/* Option B: Online Cloud (Public) */}
          <button
            type="button"
            onClick={() => onNetworkModeChange('online')}
            className={`p-2.5 sm:p-3 rounded-2xl border text-left transition-all duration-200 cursor-pointer active:scale-[0.98] ${
              networkMode === 'online'
                ? 'bg-cyan-950/60 border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.3)] ring-1 ring-cyan-400/60'
                : 'bg-dark-950/70 hover:bg-dark-850/80 border-white/10 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white">
                <Globe className={`w-3.5 h-3.5 ${networkMode === 'online' ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>Online Cloud</span>
              </span>
              {networkMode === 'online' && (
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-0.5">
                  <Globe className="w-2 h-2 text-cyan-300" />
                  PUBLIC
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-[10px] font-mono text-cyan-400 font-bold mb-0.5">
              <Globe className="w-3 h-3 shrink-0" />
              <span>Open for All</span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 leading-tight">
              Public room. Anyone can join from cellular data (4G/5G) worldwide.
            </p>
          </button>
        </div>
      </div>

      {/* Action 1: Create New Room */}
      <div>
        <button
          onClick={onCreateRoom}
          disabled={isCreating || isJoining || isEntering}
          className={`w-full py-3 sm:py-3.5 px-3 sm:px-6 rounded-full font-extrabold text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed select-none active:scale-[0.98] ${
            networkMode === 'local'
              ? 'bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 hover:brightness-105 text-black shadow-[0_0_25px_rgba(52,211,153,0.45)] hover:shadow-[0_0_35px_rgba(52,211,153,0.7)]'
              : 'bg-gradient-to-r from-cyan-400 via-sky-400 to-cyan-300 hover:brightness-105 text-black shadow-[0_0_25px_rgba(0,240,255,0.45)] hover:shadow-[0_0_35px_rgba(0,240,255,0.8)]'
          }`}
        >
          {isCreating || isEntering ? (
            <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-black border-t-transparent rounded-full animate-spin shrink-0" />
          ) : networkMode === 'local' ? (
            <Lock className="w-4 h-4 text-black shrink-0" />
          ) : (
            <Globe className="w-4 h-4 text-black shrink-0" />
          )}
          <span className="font-black tracking-tight text-xs sm:text-sm text-black truncate">
            {isEntering
              ? 'Entering Music Room...'
              : isCreating
              ? `Creating ${networkMode === 'local' ? 'Private Local Wi-Fi' : 'Public Online Cloud'} Room...`
              : `Create ${networkMode === 'local' ? 'Private Room (Same Wi-Fi · 0ms Lag)' : 'Public Room (Worldwide · Open for All)'}`}
          </span>
        </button>
      </div>

      {/* Divider */}
      <div className="relative flex py-0.5 sm:py-1 items-center">
        <div className="flex-grow border-t border-white/10" />
        <div className="flex-shrink mx-2 sm:mx-3 px-2.5 sm:px-3 py-0.5 rounded-full bg-dark-950/80 border border-white/10 shadow-sm flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(0,240,255,0.8)] animate-pulse" />
          <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-widest text-slate-400 font-medium">
            or join room
          </span>
        </div>
        <div className="flex-grow border-t border-white/10" />
      </div>

      {/* Action 2: Join Existing Room */}
      <form onSubmit={onJoinRoom} className="space-y-3 w-full">
        <div className="flex items-stretch gap-1.5 sm:gap-2 w-full">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={roomCodeInput}
            onChange={(e) => onRoomCodeChange(e.target.value.replace(/\D/g, ''))}
            placeholder="Room Code"
            maxLength={6}
            disabled={isEntering}
            className="min-w-0 flex-1 bg-dark-950/90 border border-white/10 hover:border-cyan-400/30 focus:border-cyan-400 focus:shadow-[0_0_16px_rgba(0,240,255,0.25)] rounded-full px-3.5 sm:px-4 py-2 sm:py-2.5 md:py-3 text-xs sm:text-sm md:text-base font-mono tracking-wider sm:tracking-widest text-center text-white placeholder-slate-600 focus:outline-none transition-all duration-200"
          />
          <button
            type="submit"
            disabled={!roomCodeInput.trim() || isJoining || isEntering}
            className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-full bg-dark-900/90 hover:bg-dark-850 border border-white/15 hover:border-cyan-400/60 text-white font-bold text-xs sm:text-sm transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer shadow-md group/join whitespace-nowrap select-none"
          >
            <span className="tracking-wide">{isEntering ? 'Entering...' : 'Join'}</span>
            <div className="relative w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded-full p-[1px] sm:p-[1.5px] bg-gradient-to-tr from-cyan-400 via-sky-400 to-fuchsia-500 shadow-[0_0_6px_rgba(0,240,255,0.4)] group-hover/join:shadow-[0_0_12px_rgba(0,240,255,0.7)] shrink-0 flex items-center justify-center transition-shadow duration-200">
              <div className="w-full h-full rounded-full bg-dark-950 flex items-center justify-center text-cyan-400 group-hover/join:text-white transition-colors">
                {isJoining || isEntering ? (
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ArrowRight className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 group-hover/join:translate-x-0.5 transition-transform duration-200" />
                )}
              </div>
            </div>
          </button>
        </div>
      </form>

      {/* Error Message Feedback */}
      {errorMessage && (
        <div className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-red-950/50 border border-red-500/30 text-red-300 text-xs text-center shadow-[0_0_15px_rgba(239,68,68,0.2)]">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.8)]" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
