import React, { useState } from 'react';
import { User as UserIcon, Wifi, Globe, Zap, ArrowRight, Radio, Key, Disc3 } from 'lucide-react';
import { LobbyThemeProps } from './types';
import { AudioWaveform, PinCodeInput } from './LobbyHelpers';

export const LobbyHoloTabs: React.FC<LobbyThemeProps> = ({
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
  const [activeTab, setActiveTab] = useState<'host' | 'join'>('host');

  return (
    <div className="relative w-full max-w-md mx-auto animate-fade-in select-none">
      {/* Background Side Acoustic Wave Particle Glows */}
      <div className="absolute -left-16 top-1/2 -translate-y-1/2 w-32 h-64 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none hidden md:block" />
      <div className="absolute -right-16 top-1/2 -translate-y-1/2 w-32 h-64 bg-fuchsia-500/15 rounded-full blur-3xl pointer-events-none hidden md:block" />

      {/* Main Holographic Glass Deck */}
      <div className="relative bg-dark-900/90 backdrop-blur-2xl border border-white/15 hover:border-cyan-400/40 rounded-3xl p-4 sm:p-6 shadow-[0_0_50px_rgba(0,0,0,0.85),0_0_30px_rgba(0,240,255,0.12)] space-y-4 sm:space-y-5 transition-all duration-300 overflow-hidden">
        {/* Top Cyber Hairline */}
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent pointer-events-none" />

        {/* 1. TOP SEGMENTED DUAL TABS: [Host Session] vs [Join Session] */}
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-dark-950/90 border border-white/10 text-xs sm:text-sm">
          <button
            type="button"
            onClick={() => setActiveTab('host')}
            className={`py-2 sm:py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'host'
                ? 'bg-gradient-to-r from-cyan-400 via-sky-400 to-cyan-300 text-black shadow-[0_0_16px_rgba(0,240,255,0.45)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${activeTab === 'host' ? 'text-black fill-black' : 'text-cyan-400'}`} />
            <span>Host Session</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('join')}
            className={`py-2 sm:py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'join'
                ? 'bg-gradient-to-r from-cyan-400 via-sky-400 to-cyan-300 text-black shadow-[0_0_16px_rgba(0,240,255,0.45)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Key className={`w-3.5 h-3.5 ${activeTab === 'join' ? 'text-black fill-black' : 'text-cyan-400'}`} />
            <span>Join Session</span>
          </button>
        </div>

        {/* TAB 1: HOST SESSION */}
        {activeTab === 'host' && (
          <div className="space-y-4 animate-fade-in">
            {/* Username Input with Embedded Soundwave */}
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="relative w-4 h-4 rounded-full p-[1px] bg-gradient-to-tr from-cyan-400 to-fuchsia-500 shadow-[0_0_6px_rgba(0,240,255,0.4)] shrink-0 flex items-center justify-center">
                  <div className="w-full h-full rounded-full bg-dark-950 flex items-center justify-center">
                    <UserIcon className="w-2.5 h-2.5 text-cyan-400" />
                  </div>
                </div>
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono">
                  Host Username
                </label>
              </div>

              <div className="relative w-full flex items-center bg-dark-950/90 border border-white/10 hover:border-cyan-400/40 focus-within:border-cyan-400 focus-within:shadow-[0_0_16px_rgba(0,240,255,0.25)] rounded-full px-4 py-1.5 transition-all">
                <input
                  type="text"
                  value={userName}
                  onChange={onNameChange}
                  placeholder="Enter your name"
                  maxLength={24}
                  className="w-full bg-transparent py-1.5 text-sm text-white font-semibold outline-none caret-cyan-400"
                />
                <AudioWaveform active={Boolean(userName.trim())} barCount={10} />
              </div>
            </div>

            {/* Network Mode Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="relative w-4 h-4 rounded-full p-[1px] bg-gradient-to-tr from-cyan-400 to-fuchsia-500 shadow-[0_0_6px_rgba(0,240,255,0.4)] shrink-0 flex items-center justify-center">
                    <div className="w-full h-full rounded-full bg-dark-950 flex items-center justify-center">
                      <Radio className="w-2.5 h-2.5 text-cyan-400" />
                    </div>
                  </div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono">
                    Network Mode
                  </label>
                </div>
                <span className="text-[10px] font-mono text-cyan-300 font-bold">
                  {networkMode === 'local' ? '🔒 Local Wi-Fi Mesh' : '🌐 Global Cloud (Open)'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onNetworkModeChange('local')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    networkMode === 'local'
                      ? 'bg-cyan-950/60 border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.3)] ring-1 ring-cyan-400/60 text-white'
                      : 'bg-dark-950/70 hover:bg-dark-850/80 border-white/10 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Wifi className={`w-3.5 h-3.5 ${networkMode === 'local' ? 'text-cyan-400' : 'text-slate-500'}`} />
                    <span className="text-xs font-bold text-white">Local Wi-Fi</span>
                  </div>
                  <p className="text-[10px] text-cyan-400 font-mono font-bold">0ms Latency</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Same hotspot or Wi-Fi</p>
                </button>

                <button
                  type="button"
                  onClick={() => onNetworkModeChange('online')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    networkMode === 'online'
                      ? 'bg-cyan-950/60 border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.3)] ring-1 ring-cyan-400/60 text-white'
                      : 'bg-dark-950/70 hover:bg-dark-850/80 border-white/10 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Globe className={`w-3.5 h-3.5 ${networkMode === 'online' ? 'text-cyan-400' : 'text-slate-500'}`} />
                    <span className="text-xs font-bold text-white">Global Cloud</span>
                  </div>
                  <p className="text-[10px] text-cyan-400 font-mono font-bold">Worldwide</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Cellular 4G/5G enabled</p>
                </button>
              </div>
            </div>

            {/* Launch Action Button */}
            <button
              type="button"
              onClick={onCreateRoom}
              disabled={isCreating || isJoining || isEntering}
              className="w-full py-3.5 px-6 rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-cyan-300 hover:brightness-110 text-black font-extrabold text-sm transition-all duration-200 active:scale-[0.98] shadow-[0_0_25px_rgba(0,240,255,0.5)] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isCreating || isEntering ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin shrink-0" />
              ) : (
                <Zap className="w-4 h-4 fill-current text-black shrink-0" />
              )}
              <span className="tracking-tight text-black font-black">
                {isEntering
                  ? 'Entering Session...'
                  : isCreating
                  ? 'Initializing Host...'
                  : `Launch ${networkMode === 'local' ? 'Local Mesh' : 'Cloud Session'}`}
              </span>
            </button>
          </div>
        )}

        {/* TAB 2: JOIN SESSION */}
        {activeTab === 'join' && (
          <form onSubmit={onJoinRoom} className="space-y-4 animate-fade-in">
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="relative w-4 h-4 rounded-full p-[1px] bg-gradient-to-tr from-cyan-400 to-fuchsia-500 shadow-[0_0_6px_rgba(0,240,255,0.4)] shrink-0 flex items-center justify-center">
                  <div className="w-full h-full rounded-full bg-dark-950 flex items-center justify-center">
                    <UserIcon className="w-2.5 h-2.5 text-cyan-400" />
                  </div>
                </div>
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono">
                  Your Listener Name
                </label>
              </div>

              <div className="relative w-full flex items-center bg-dark-950/90 border border-white/10 hover:border-cyan-400/40 focus-within:border-cyan-400 rounded-full px-4 py-1.5 transition-all">
                <input
                  type="text"
                  value={userName}
                  onChange={onNameChange}
                  placeholder="Enter listener name"
                  maxLength={24}
                  className="w-full bg-transparent py-1.5 text-sm text-white font-semibold outline-none caret-cyan-400"
                />
              </div>
            </div>

            {/* 6-Digit PIN input */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center justify-between">
                <span>Enter 6-Digit Room Code</span>
                <span className="text-cyan-400 text-[10px] font-mono">Auto-Sync</span>
              </label>

              <PinCodeInput
                value={roomCodeInput}
                onChange={onRoomCodeChange}
                disabled={isEntering || isJoining}
              />
            </div>

            {/* Connect Action Button */}
            <button
              type="submit"
              disabled={!roomCodeInput.trim() || isJoining || isEntering}
              className="w-full py-3.5 px-6 rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-cyan-300 hover:brightness-110 text-black font-extrabold text-sm transition-all duration-200 active:scale-[0.98] shadow-[0_0_25px_rgba(0,240,255,0.5)] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isJoining || isEntering ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin shrink-0" />
              ) : (
                <Disc3 className="w-4 h-4 text-black shrink-0 animate-spin-slow" />
              )}
              <span className="tracking-tight text-black font-black">
                {isEntering ? 'Connecting to Room...' : 'Connect to Live Session'}
              </span>
              <ArrowRight className="w-4 h-4 text-black" />
            </button>
          </form>
        )}

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
