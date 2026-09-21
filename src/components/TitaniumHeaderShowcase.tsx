import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Check,
  X,
  Sliders,
  Copy,
  Maximize2,
  LayoutGrid,
  Radio,
  Activity,
  Layers,
  ShieldCheck,
  Cpu,
  RefreshCw,
  ArrowRight,
  Monitor,
} from 'lucide-react';
import {
  TitaniumHeader,
  TitaniumHeaderTheme,
  TITANIUM_HEADER_THEMES,
  getStoredHeaderTheme,
  saveStoredHeaderTheme,
} from './TitaniumHeader';
import { SyncStats } from '../types';

interface TitaniumHeaderShowcaseProps {
  onClose?: () => void;
  onApplyTheme?: (theme: TitaniumHeaderTheme) => void;
}

export const TitaniumHeaderShowcase: React.FC<TitaniumHeaderShowcaseProps> = ({
  onClose,
  onApplyTheme,
}) => {
  const [activeTheme, setActiveTheme] = useState<TitaniumHeaderTheme>(getStoredHeaderTheme);
  const [viewMode, setViewMode] = useState<'stack' | TitaniumHeaderTheme>('stack');
  const [savedToast, setSavedToast] = useState<string | null>(null);

  // Interactive Live Telemetry Simulators
  const [clockOffset, setClockOffset] = useState<number>(-11.0);
  const [rtt, setRtt] = useState<number>(102.0);
  const [drift, setDrift] = useState<number>(0);
  const [simRoomCode, setSimRoomCode] = useState<string>('64618');

  // Simulated telemetry live fluctuations
  useEffect(() => {
    const interval = setInterval(() => {
      setClockOffset((prev) => {
        const delta = (Math.random() - 0.5) * 0.4;
        return Number((prev + delta).toFixed(2));
      });
      setRtt((prev) => {
        const delta = (Math.random() - 0.5) * 2.0;
        return Math.max(20, Number((prev + delta).toFixed(2)));
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const simulatedStats: SyncStats = {
    clockOffset,
    rtt,
    drift,
    isLocked: true,
    syncQuality: 'excellent',
  };

  const handleSelectTheme = (themeId: TitaniumHeaderTheme) => {
    setActiveTheme(themeId);
    saveStoredHeaderTheme(themeId);
    if (onApplyTheme) onApplyTheme(themeId);

    const themeObj = TITANIUM_HEADER_THEMES.find((t) => t.id === themeId);
    setSavedToast(themeObj?.name || 'Theme');
    setTimeout(() => setSavedToast(null), 2500);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) onClose();
      if (e.key === 's' || e.key === '0') setViewMode('stack');
      if (e.key === '1') setViewMode('studio');
      if (e.key === '2') setViewMode('rack');
      if (e.key === '3') setViewMode('stealth');
      if (e.key === '4') setViewMode('aerograde');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[99999] w-full h-full bg-[#08090c] flex flex-col select-none overflow-hidden font-sans text-white">
      {/* Top Controls Bar */}
      <header className="sticky top-0 z-50 w-full px-4 sm:px-6 py-3 bg-[#0e1014]/95 backdrop-blur-2xl border-b border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xl">
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-zinc-300 via-zinc-500 to-zinc-700 p-0.5 shadow-[0_0_15px_rgba(255,255,255,0.2)]">
              <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
                <Sliders className="w-4 h-4 text-zinc-200" />
              </div>
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Titanium Theme Header Showcase</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 uppercase">
                  Live Preview
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400 hidden sm:block">
                Select your preferred titanium aesthetic. Active in both Room HUD and Pro Studio.
              </p>
            </div>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="sm:hidden p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* View Switchers & Controls */}
        <div className="flex items-center gap-2 overflow-x-auto max-w-full">
          {/* Stack View toggle */}
          <button
            type="button"
            onClick={() => setViewMode('stack')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              viewMode === 'stack'
                ? 'bg-white text-black shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Compare All 4</span>
          </button>

          {/* Direct Option Tabs */}
          {TITANIUM_HEADER_THEMES.map((t, idx) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setViewMode(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                viewMode === t.id
                  ? 'bg-emerald-400 text-black shadow-[0_0_12px_rgba(52,211,153,0.6)]'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="font-mono text-[10px]">0{idx + 1}</span>
              <span>{t.name.split(' ')[1]}</span>
            </button>
          ))}

          {onClose && (
            <>
              <div className="w-px h-4 bg-white/15 mx-0.5 shrink-0 hidden sm:block" />
              <button
                type="button"
                onClick={onClose}
                className="hidden sm:flex p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                title="Close Showcase (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </header>

      {/* Floating Saved Toast Notification */}
      {savedToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] animate-bounce px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-xs font-mono font-bold shadow-[0_0_24px_rgba(16,185,129,0.5)] flex items-center gap-2 backdrop-blur-xl">
          <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
          <span>"{savedToast}" applied as active Titanium Header!</span>
        </div>
      )}

      {/* Interactive Simulation Controls Drawer */}
      <div className="shrink-0 bg-[#0d0f13]/90 border-b border-white/[0.06] px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4 text-xs font-mono text-zinc-400 overflow-x-auto">
        <div className="flex items-center gap-4 sm:gap-6 shrink-0">
          <div className="flex items-center gap-1.5 text-zinc-300">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] font-semibold">Live Telemetry Simulator:</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-zinc-500">Offset:</span>
            <input
              type="range"
              min="-50"
              max="50"
              step="0.5"
              value={clockOffset}
              onChange={(e) => setClockOffset(parseFloat(e.target.value))}
              className="w-20 sm:w-28 accent-emerald-400 h-1 bg-zinc-800 rounded-lg cursor-pointer"
            />
            <span className="text-emerald-400 font-bold min-w-[50px]">{clockOffset.toFixed(1)}ms</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-zinc-500">RTT:</span>
            <input
              type="range"
              min="10"
              max="350"
              step="5"
              value={rtt}
              onChange={(e) => setRtt(parseFloat(e.target.value))}
              className="w-20 sm:w-28 accent-zinc-300 h-1 bg-zinc-800 rounded-lg cursor-pointer"
            />
            <span className="text-zinc-200 font-bold min-w-[45px]">{rtt.toFixed(0)}ms</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-zinc-500">Room:</span>
            <input
              type="text"
              value={simRoomCode}
              maxLength={6}
              onChange={(e) => setSimRoomCode(e.target.value.toUpperCase())}
              className="w-16 bg-zinc-900 border border-white/10 rounded px-1.5 py-0.5 text-center text-white text-xs font-bold"
            />
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-2 text-zinc-500 text-[11px]">
          <span>Active Default:</span>
          <span className="text-emerald-400 font-bold">
            {TITANIUM_HEADER_THEMES.find((t) => t.id === activeTheme)?.name}
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'stack' ? (
        /* Compare All 4 Stack View */
        <main className="flex-1 w-full h-full overflow-y-auto p-4 sm:p-6 pb-24 space-y-6 custom-scrollbar">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-zinc-400 px-1">
              <p>
                Compare all 4 real-width Titanium Header options. Click <strong>"Select This"</strong> to set it as your active header.
              </p>
              <span className="text-[11px] font-mono text-emerald-400">
                Click any room code to test copy feedback.
              </span>
            </div>

            <div className="space-y-6">
              {TITANIUM_HEADER_THEMES.map((theme, idx) => {
                const isSelected = activeTheme === theme.id;

                return (
                  <div
                    key={theme.id}
                    className={`rounded-2xl border transition-all duration-200 overflow-hidden bg-zinc-950/60 backdrop-blur-xl shadow-xl ${
                      isSelected
                        ? 'border-emerald-400/80 shadow-[0_0_25px_rgba(52,211,153,0.15)] ring-1 ring-emerald-400/30'
                        : 'border-white/[0.08] hover:border-white/[0.2]'
                    }`}
                  >
                    {/* Option Header Info Bar */}
                    <div className="px-4 py-2.5 bg-[#0f1116] border-b border-white/[0.08] flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-xs text-zinc-500 font-bold">
                          0{idx + 1}
                        </span>
                        <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                          <span>{theme.name}</span>
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-400 uppercase">
                            {theme.tag}
                          </span>
                        </h3>
                      </div>

                      <div className="flex items-center gap-2">
                        {isSelected && (
                          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-mono font-bold">
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>ACTIVE</span>
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => setViewMode(theme.id)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 text-[11px] font-semibold cursor-pointer transition-colors"
                          title="Full Screen Preview"
                        >
                          <Maximize2 className="w-3 h-3" />
                          <span className="hidden sm:inline">Inspect</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSelectTheme(theme.id)}
                          className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-emerald-400 hover:bg-emerald-300 text-black shadow-[0_0_12px_rgba(52,211,153,0.4)]'
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <Check className="w-3 h-3 stroke-[3]" />
                              <span>Applied</span>
                            </>
                          ) : (
                            <span>Select This</span>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Live Header Render Container */}
                    <div className="p-3 sm:p-5 bg-[#08090c] flex flex-col justify-center">
                      <div className="rounded-xl overflow-hidden shadow-2xl border border-white/[0.05]">
                        <TitaniumHeader
                          theme={theme.id}
                          roomCode={simRoomCode}
                          syncStats={simulatedStats}
                          onLeaveRoom={() => {
                            setSavedToast('Leave triggered (Simulation)');
                            setTimeout(() => setSavedToast(null), 1500);
                          }}
                          showThemeSwitcher={false}
                        />
                      </div>
                    </div>

                    {/* Description Footer */}
                    <div className="px-4 py-2 bg-[#0c0e12] border-t border-white/[0.06] flex items-center justify-between text-xs text-zinc-400">
                      <p>{theme.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      ) : (
        /* Fullscreen Single Theme Inspection View */
        <main className="flex-1 w-full h-full relative overflow-hidden flex flex-col items-center justify-center p-4 sm:p-8 bg-[#08090c]">
          {/* Back to Stack View */}
          <div className="absolute top-4 left-4 z-40 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode('stack')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-zinc-900/90 hover:bg-white text-zinc-300 hover:text-black border border-white/15 text-xs font-bold backdrop-blur-xl transition-all cursor-pointer shadow-lg"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>← Back to All 4</span>
            </button>
          </div>

          {/* Select Button */}
          <div className="absolute top-4 right-4 z-40 flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSelectTheme(viewMode as TitaniumHeaderTheme)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shadow-lg ${
                activeTheme === viewMode
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_14px_rgba(52,211,153,0.3)]'
                  : 'bg-emerald-400 hover:bg-emerald-300 text-black shadow-[0_0_16px_rgba(52,211,153,0.5)]'
              }`}
            >
              {activeTheme === viewMode ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                  <span>Active Default</span>
                </>
              ) : (
                <span>Apply as Default Theme</span>
              )}
            </button>
          </div>

          {/* Centered Realistic Room View Simulation */}
          <div className="w-full max-w-5xl rounded-2xl border border-white/10 overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.9)] bg-[#0d0f14] flex flex-col">
            <TitaniumHeader
              theme={viewMode as TitaniumHeaderTheme}
              roomCode={simRoomCode}
              syncStats={simulatedStats}
              onLeaveRoom={() => {
                setSavedToast('Leave triggered (Simulation)');
                setTimeout(() => setSavedToast(null), 1500);
              }}
              showThemeSwitcher={true}
              onThemeChange={(newTh) => setViewMode(newTh)}
            />

            {/* Simulated Room Interior */}
            <div className="h-64 sm:h-80 bg-gradient-to-b from-[#0e1015] to-[#07080b] p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center mb-3 shadow-inner">
                <Monitor className="w-8 h-8 text-zinc-400" />
              </div>
              <h4 className="text-base font-bold text-white mb-1">
                {TITANIUM_HEADER_THEMES.find((t) => t.id === viewMode)?.name}
              </h4>
              <p className="text-xs text-zinc-400 max-w-md mb-4">
                {TITANIUM_HEADER_THEMES.find((t) => t.id === viewMode)?.desc}
              </p>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleSelectTheme(viewMode as TitaniumHeaderTheme)}
                  className="px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-bold text-xs shadow-[0_0_16px_rgba(52,211,153,0.4)] transition-all cursor-pointer"
                >
                  Apply This Titanium Theme
                </button>
                {onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-xs font-semibold transition-all cursor-pointer"
                  >
                    Close Showcase
                  </button>
                )}
              </div>
            </div>
          </div>
        </main>
      )}
    </div>
  );
};

export default TitaniumHeaderShowcase;
