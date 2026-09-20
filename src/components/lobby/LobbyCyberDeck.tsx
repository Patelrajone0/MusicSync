import React from 'react';
import { User as UserIcon, Wifi, Globe, Zap, Lock, Key, ArrowRight, Radio, Infinity as InfinityIcon } from 'lucide-react';
import { LobbyThemeProps } from './types';
import { AudioWaveform, PinCodeInput } from './LobbyHelpers';

export const LobbyCyberDeck: React.FC<LobbyThemeProps> = ({
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
    <div className="relative w-full max-w-md mx-auto animate-fade-in select-none">
      {/* Dual Neon Aura Glow behind the card */}
      <div className="absolute -inset-1 rounded-[32px] bg-gradient-to-r from-cyan-500/40 via-sky-500/20 to-fuchsia-500/40 blur-xl opacity-70 pointer-events-none" />

      {/* Main Glass Deck Container */}
      <div className="relative bg-dark-900/90 backdrop-blur-2xl border-2 border-cyan-400/40 hover:border-cyan-400/60 rounded-[28px] p-5 sm:p-7 shadow-[0_0_50px_rgba(0,0,0,0.85),0_0_30px_rgba(0,240,255,0.15)] space-y-5 transition-all duration-300 overflow-hidden">
        {/* Ambient Corner Accents */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-400 via-sky-400 to-fuchsia-500 pointer-events-none" />
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-fuchsia-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-cyan-500/20 rounded-full blur-2xl pointer-events-none" />

        {/* 1. USERNAME FIELD with Embedded Live Soundwave */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <div className="relative w-4 h-4 rounded-full p-[1px] bg-gradient-to-tr from-cyan-400 via-sky-400 to-fuchsia-500 shadow-[0_0_8px_rgba(0,240,255,0.5)] shrink-0 flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-dark-950 flex items-center justify-center">
                <UserIcon className="w-2.5 h-2.5 text-cyan-400" />
              </div>
            </div>
            <label className="text-[11px] font-bold text-slate-200 uppercase tracking-widest font-mono">
              Username
            </label>
          </div>

          <div className="relative w-full flex items-center bg-dark-950/90 border border-white/10 hover:border-cyan-400/40 focus-within:border-cyan-400 focus-within:shadow-[0_0_20px_rgba(0,240,255,0.25)] rounded-full px-4 py-1.5 transition-all duration-200">
            <input
              type="text"
              value={userName}
              onChange={onNameChange}
              placeholder="laptop"
              maxLength={24}
              className="w-full min-w-0 bg-transparent py-1.5 text-sm sm:text-base text-white font-semibold placeholder:text-slate-500 outline-none caret-cyan-400"
            />
            {/* Embedded Live Equalizer Wave */}
            <AudioWaveform active={Boolean(userName.trim())} barCount={12} />
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5 pl-2">
            No account required. Instant anonymous access.
          </p>
        </div>

        {/* 2. ROOM NETWORK MODE (Infinity Connected Pill Toggle) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="relative w-4 h-4 rounded-full p-[1px] bg-gradient-to-tr from-cyan-400 to-fuchsia-500 shadow-[0_0_6px_rgba(0,240,255,0.4)] shrink-0 flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-dark-950 flex items-center justify-center">
                  <Radio className="w-2.5 h-2.5 text-cyan-400" />
                </div>
              </div>
              <label className="text-[11px] font-bold text-slate-200 uppercase tracking-widest font-mono">
                Room Network Mode
              </label>
            </div>
            <span className="text-[10px] font-mono font-bold text-cyan-300 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_6px_rgba(0,240,255,0.8)]" />
              <span>{networkMode === 'local' ? 'Private · Wi-Fi Only' : 'Public · Worldwide'}</span>
            </span>
          </div>

          {/* Connected Infinity Pill Dock */}
          <div className="relative p-1 rounded-2xl bg-dark-950/90 border border-white/10 grid grid-cols-2 gap-1 overflow-hidden">
            {/* Option A: Local Wi-Fi */}
            <button
              type="button"
              onClick={() => onNetworkModeChange('local')}
              className={`p-2.5 rounded-xl text-left transition-all duration-200 cursor-pointer relative z-10 ${
                networkMode === 'local'
                  ? 'bg-gradient-to-br from-fuchsia-950/70 to-dark-900 border border-fuchsia-400/60 shadow-[0_0_16px_rgba(232,121,249,0.3)] text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <Wifi className={`w-3.5 h-3.5 ${networkMode === 'local' ? 'text-fuchsia-400' : 'text-slate-500'}`} />
                <span className="text-xs font-bold text-white">Local Wi-Fi</span>
              </div>
              <p className="text-[9px] font-mono text-fuchsia-300 font-semibold">0ms Mesh · Same Wi-Fi</p>
            </button>

            {/* Option B: Online Cloud */}
            <button
              type="button"
              onClick={() => onNetworkModeChange('online')}
              className={`p-2.5 rounded-xl text-left transition-all duration-200 cursor-pointer relative z-10 ${
                networkMode === 'online'
                  ? 'bg-gradient-to-br from-cyan-950/70 to-dark-900 border border-cyan-400/60 shadow-[0_0_16px_rgba(0,240,255,0.3)] text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <Globe className={`w-3.5 h-3.5 ${networkMode === 'online' ? 'text-cyan-400' : 'text-slate-500'}`} />
                <span className="text-xs font-bold text-white">Online Cloud</span>
              </div>
              <p className="text-[9px] font-mono text-cyan-300 font-semibold">Worldwide · Cellular</p>
            </button>
          </div>
        </div>

        {/* 3. PRIMARY CREATE ROOM BUTTON */}
        <div>
          <button
            type="button"
            onClick={onCreateRoom}
            disabled={isCreating || isJoining || isEntering}
            className="w-full py-3.5 px-6 rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-cyan-300 hover:brightness-110 text-black font-extrabold text-sm transition-all duration-200 active:scale-[0.98] shadow-[0_0_25px_rgba(0,240,255,0.55)] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isCreating || isEntering ? (
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin shrink-0" />
            ) : (
              <Zap className="w-4 h-4 fill-current text-black shrink-0" />
            )}
            <span className="tracking-tight text-black font-black">
              {isEntering
                ? 'Connecting to Audio Mesh...'
                : isCreating
                ? 'Launching Room...'
                : `Create ${networkMode === 'local' ? 'Private' : 'Public'} Room`}
            </span>
          </button>
        </div>

        {/* 4. DIVIDER */}
        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-white/10" />
          <div className="flex-shrink mx-3 px-3 py-0.5 rounded-full bg-dark-950 border border-white/10 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 shadow-[0_0_6px_rgba(232,121,249,0.8)] animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold">
              or join room
            </span>
          </div>
          <div className="flex-grow border-t border-white/10" />
        </div>

        {/* 5. JOIN WITH 6-BOX PIN CODE ENTRY */}
        <form onSubmit={onJoinRoom} className="space-y-3">
          <PinCodeInput
            value={roomCodeInput}
            onChange={onRoomCodeChange}
            disabled={isEntering || isJoining}
          />

          <button
            type="submit"
            disabled={!roomCodeInput.trim() || isJoining || isEntering}
            className="w-full py-2.5 px-4 rounded-full bg-dark-950/90 hover:bg-dark-850 border border-white/15 hover:border-cyan-400/50 text-white font-bold text-xs sm:text-sm transition-all duration-200 active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer shadow-md group/join select-none"
          >
            <Key className="w-4 h-4 text-cyan-400 group-hover/join:rotate-45 transition-transform duration-300" />
            <span>{isJoining || isEntering ? 'Verifying Room...' : 'Enter with Code'}</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover/join:translate-x-1 transition-transform" />
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
