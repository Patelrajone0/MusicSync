import React, { useState, useEffect, useRef } from 'react';
import {
  Sliders,
  Sparkles,
  Check,
  X,
  Search,
  Disc3,
  MessageCircle,
  Compass,
  Send,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Volume2,
  VolumeX,
  Activity,
  Maximize2,
  LayoutGrid,
  Radio,
  Plus,
} from 'lucide-react';

export type TitaniumStudioTheme = 'studio' | 'rack' | 'stealth' | 'aerograde';

export const TITANIUM_STUDIO_THEMES: {
  id: TitaniumStudioTheme;
  name: string;
  tag: string;
  desc: string;
}[] = [
  {
    id: 'studio',
    name: 'Titanium Studio Minimal',
    tag: 'RECOMMENDED',
    desc: 'Apple Studio & Leica precision luxury brushed titanium with platinum play button and laser typography.',
  },
  {
    id: 'rack',
    name: 'Hardware Audio Console',
    tag: 'TE PRO RACK',
    desc: 'Teenage Engineering OP-1 aesthetic with knurled hardware switches, green phosphor digits, and tactile transport.',
  },
  {
    id: 'stealth',
    name: 'Stealth Obsidian DLC',
    tag: 'SURGICAL MATTE',
    desc: 'Deep matte black diamond-like carbon plate with zero glare, surgical hairline borders, and pure emerald accents.',
  },
  {
    id: 'aerograde',
    name: 'Aerograde Prism Glass',
    tag: 'VISION GLASS',
    desc: 'Frosted multi-tone titanium glass with continuous metallic specular sweep and translucent glass dock.',
  },
];

const THEME_STORAGE_KEY = 'musicsync_titanium_studio_theme';

export function getStoredStudioTheme(): TitaniumStudioTheme {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'studio' || saved === 'rack' || saved === 'stealth' || saved === 'aerograde') {
      return saved;
    }
  } catch {}
  return 'studio';
}

export function saveStoredStudioTheme(theme: TitaniumStudioTheme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {}
}

interface TitaniumStudioShowcaseProps {
  onClose?: () => void;
  onApplyTheme?: (theme: TitaniumStudioTheme) => void;
}

export const TitaniumStudioShowcase: React.FC<TitaniumStudioShowcaseProps> = ({
  onClose,
  onApplyTheme,
}) => {
  const [activeTheme, setActiveTheme] = useState<TitaniumStudioTheme>(getStoredStudioTheme);
  const [viewMode, setViewMode] = useState<'compare' | TitaniumStudioTheme>('compare');
  const [savedToast, setSavedToast] = useState<string | null>(null);

  // Interactive Live Playground State
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [progress, setProgress] = useState<number>(34); // %
  const [volume, setVolume] = useState<number>(0.9);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [nudgeMs, setNudgeMs] = useState<number>(0);
  const [metronomeActive, setMetronomeActive] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'spatial'>('chat');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [chatMessage, setChatMessage] = useState<string>('');
  const [messages, setMessages] = useState<Array<{ id: string; user: string; text: string; isYou: boolean }>>([
    { id: '1', user: 'qqqqq', text: 'Zero latency clock locked on all speakers!', isYou: true },
    { id: '2', user: 'Sarah', text: 'Audio stream sounds super crisp 48kHz 🔥', isYou: false },
  ]);

  // Live progress simulation
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setProgress((p) => (p >= 100 ? 0 : p + 0.5));
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleApplyTheme = (themeId: TitaniumStudioTheme) => {
    setActiveTheme(themeId);
    saveStoredStudioTheme(themeId);
    if (onApplyTheme) onApplyTheme(themeId);

    const themeObj = TITANIUM_STUDIO_THEMES.find((t) => t.id === themeId);
    setSavedToast(themeObj?.name || 'Theme');
    setTimeout(() => setSavedToast(null), 2500);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    setMessages((prev) => [
      ...prev,
      { id: String(Date.now()), user: 'qqqqq', text: chatMessage.trim(), isYou: true },
    ]);
    setChatMessage('');
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) onClose();
      if (e.key === 'c' || e.key === '0') setViewMode('compare');
      if (e.key === '1') setViewMode('studio');
      if (e.key === '2') setViewMode('rack');
      if (e.key === '3') setViewMode('stealth');
      if (e.key === '4') setViewMode('aerograde');
      if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[99999] w-full h-full bg-[#08090c] flex flex-col select-none overflow-hidden font-sans text-white">
      {/* Top Header Bar */}
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
                <span>Titanium Studio Showcase</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 uppercase">
                  Queue · Chat · Player
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400 hidden sm:block">
                Compare and preview Titanium themes for search, queue, chat, and bottom player bar.
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

        {/* View Switchers */}
        <div className="flex items-center gap-2 overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setViewMode('compare')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              viewMode === 'compare'
                ? 'bg-white text-black shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Compare All 4</span>
          </button>

          {TITANIUM_STUDIO_THEMES.map((t, idx) => (
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
          <span>"{savedToast}" selected as active studio theme!</span>
        </div>
      )}

      {/* Interactive Controls Bar */}
      <div className="shrink-0 bg-[#0d0f13]/90 border-b border-white/[0.06] px-4 sm:px-6 py-2 flex items-center justify-between gap-4 text-xs font-mono text-zinc-400 overflow-x-auto">
        <div className="flex items-center gap-4 sm:gap-6 shrink-0">
          <div className="flex items-center gap-1.5 text-zinc-300">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] font-semibold">Interactive Studio Sandbox:</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-2.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-white text-[11px] font-bold cursor-pointer"
            >
              {isPlaying ? 'PAUSE' : 'PLAY'} (Space)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-zinc-500">Nudge:</span>
            <button
              type="button"
              onClick={() => setNudgeMs((m) => m - 10)}
              className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 hover:text-white text-[10px]"
            >
              -10ms
            </button>
            <span className="text-emerald-400 font-bold min-w-[36px] text-center">
              {nudgeMs >= 0 ? `+${nudgeMs}` : nudgeMs}ms
            </span>
            <button
              type="button"
              onClick={() => setNudgeMs((m) => m + 10)}
              className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 hover:text-white text-[10px]"
            >
              +10ms
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-zinc-500">Metronome:</span>
            <button
              type="button"
              onClick={() => setMetronomeActive(!metronomeActive)}
              className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                metronomeActive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {metronomeActive ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-2 text-zinc-500 text-[11px]">
          <span>Active Default:</span>
          <span className="text-emerald-400 font-bold">
            {TITANIUM_STUDIO_THEMES.find((t) => t.id === activeTheme)?.name}
          </span>
        </div>
      </div>

      {/* Main Viewport */}
      {viewMode === 'compare' ? (
        /* 4-Theme Grid Comparison View */
        <main className="flex-1 w-full h-full overflow-y-auto p-4 sm:p-6 pb-24 custom-scrollbar">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-zinc-400 px-1">
              <p>
                Compare all 4 complete studio themes (Search, Queue, Chat, and Player Bar). Click <strong>"Select This"</strong> to apply.
              </p>
              <span className="text-[11px] font-mono text-emerald-400">
                Live Interactive Sandbox
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {TITANIUM_STUDIO_THEMES.map((theme, idx) => {
                const isSelected = activeTheme === theme.id;

                return (
                  <div
                    key={theme.id}
                    className={`rounded-2xl border transition-all duration-200 flex flex-col overflow-hidden bg-zinc-950/70 backdrop-blur-xl shadow-2xl ${
                      isSelected
                        ? 'border-emerald-400/80 shadow-[0_0_25px_rgba(52,211,153,0.18)] ring-1 ring-emerald-400/40'
                        : 'border-white/[0.08] hover:border-white/[0.2]'
                    }`}
                  >
                    {/* Top Info Bar */}
                    <div className="px-4 py-2.5 bg-[#0f1116] border-b border-white/[0.08] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-zinc-500 font-bold">
                          0{idx + 1}
                        </span>
                        <div>
                          <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                            <span>{theme.name}</span>
                          </h3>
                          <span className="text-[9px] font-mono text-zinc-400 uppercase">
                            {theme.tag}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isSelected && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-mono font-bold">
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>ACTIVE</span>
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => setViewMode(theme.id)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-semibold cursor-pointer transition-colors"
                        >
                          <Maximize2 className="w-3 h-3" />
                          <span className="hidden sm:inline">Inspect</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleApplyTheme(theme.id)}
                          className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm ${
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

                    {/* Live Studio Layout Render */}
                    <div className="p-3 bg-[#08090c] flex flex-col gap-3">
                      <StudioLayoutPreview
                        theme={theme.id}
                        isPlaying={isPlaying}
                        onTogglePlay={() => setIsPlaying(!isPlaying)}
                        progress={progress}
                        volume={volume}
                        isMuted={isMuted}
                        nudgeMs={nudgeMs}
                        metronomeActive={metronomeActive}
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                        messages={messages}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                      />
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
          {/* Back to Compare */}
          <div className="absolute top-4 left-4 z-40 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode('compare')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-zinc-900/90 hover:bg-white text-zinc-300 hover:text-black border border-white/15 text-xs font-bold backdrop-blur-xl transition-all cursor-pointer shadow-lg"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>← Back to Compare All 4</span>
            </button>
          </div>

          {/* Select Button */}
          <div className="absolute top-4 right-4 z-40 flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleApplyTheme(viewMode as TitaniumStudioTheme)}
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
                <span>Apply as Default Studio Theme</span>
              )}
            </button>
          </div>

          {/* Centered Realistic Layout */}
          <div className="w-full max-w-5xl h-[580px] rounded-2xl border border-white/10 overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.9)] bg-[#0d0f14] flex flex-col p-4">
            <StudioLayoutPreview
              theme={viewMode as TitaniumStudioTheme}
              isPlaying={isPlaying}
              onTogglePlay={() => setIsPlaying(!isPlaying)}
              progress={progress}
              volume={volume}
              isMuted={isMuted}
              nudgeMs={nudgeMs}
              metronomeActive={metronomeActive}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              messages={messages}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              isFullscreen={true}
            />
          </div>
        </main>
      )}
    </div>
  );
};

// =========================================================================
// SUBCOMPONENT: STUDIO LAYOUT PREVIEW (Center, Right, and Bottom Bar)
// =========================================================================
interface StudioLayoutPreviewProps {
  theme: TitaniumStudioTheme;
  isPlaying: boolean;
  onTogglePlay: () => void;
  progress: number;
  volume: number;
  isMuted: boolean;
  nudgeMs: number;
  metronomeActive: boolean;
  activeTab: 'chat' | 'spatial';
  onTabChange: (tab: 'chat' | 'spatial') => void;
  messages: Array<{ id: string; user: string; text: string; isYou: boolean }>;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  isFullscreen?: boolean;
}

const StudioLayoutPreview: React.FC<StudioLayoutPreviewProps> = ({
  theme,
  isPlaying,
  onTogglePlay,
  progress,
  volume,
  isMuted,
  nudgeMs,
  metronomeActive,
  activeTab,
  onTabChange,
  messages,
  searchQuery,
  onSearchChange,
  isFullscreen = false,
}) => {
  // Theme Style Variables
  const isStudio = theme === 'studio';
  const isRack = theme === 'rack';
  const isStealth = theme === 'stealth';
  const isAerograde = theme === 'aerograde';

  return (
    <div className={`flex flex-col gap-3 w-full h-full ${isFullscreen ? 'h-full' : 'min-h-[380px]'}`}>
      {/* Top 2 Columns: Center Queue (Left) & Chat/Spatial (Right) */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* CENTER COLUMN (Search + Queue Card) - 2 cols */}
        <div className="md:col-span-2 flex flex-col gap-2.5">
          {/* Universal Search Bar */}
          <div
            className={`w-full h-10 px-3.5 flex items-center justify-between transition-all ${
              isStudio
                ? 'rounded-[16px] bg-[#0e1014]/95 border border-white/[0.1] hover:border-white/25 focus-within:border-white/40 shadow-sm'
                : isRack
                ? 'rounded-full bg-black/90 border border-zinc-800 hover:border-zinc-600 font-mono shadow-inner'
                : isStealth
                ? 'rounded-full bg-[#090a0c] border border-zinc-800/90 hover:border-zinc-700'
                : 'rounded-[16px] bg-white/[0.04] backdrop-blur-2xl border border-white/15 shadow-[0_2px_12px_rgba(0,0,0,0.3)]'
            }`}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Search className={`w-3.5 h-3.5 ${isStudio ? 'text-zinc-400' : isRack ? 'text-zinc-500' : isStealth ? 'text-zinc-400' : 'text-zinc-300'}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="What do you want to play?"
                className="w-full bg-transparent text-white text-xs font-medium placeholder:text-zinc-500 outline-none"
              />
            </div>
            <span className="px-2 py-0.5 rounded-full bg-zinc-900 border border-white/10 text-[9px] font-mono text-zinc-400">
              ⌘K
            </span>
          </div>

          {/* Queue Card */}
          <div
            className={`flex-1 p-4 flex flex-col items-center justify-center text-center relative overflow-hidden ${
              isStudio
                ? 'rounded-[22px] bg-[#0e1014]/90 backdrop-blur-2xl border border-white/[0.1] hover:border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.15)]'
                : isRack
                ? 'rounded-2xl bg-[#0d0f14] border border-zinc-800 font-mono shadow-inner'
                : isStealth
                ? 'rounded-2xl bg-[#090a0c] border border-zinc-800/90'
                : 'rounded-[22px] bg-zinc-950/60 backdrop-blur-2xl border border-white/[0.12] shadow-lg'
            }`}
          >
            {/* Specular Squircle Corner Accents for Studio Theme */}
            {isStudio && (
              <>
                <div className="absolute top-0 left-0 w-7 h-7 rounded-tl-[22px] border-t border-l border-white/30 pointer-events-none" />
                <div className="absolute top-0 right-0 w-7 h-7 rounded-tr-[22px] border-t border-r border-white/30 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-7 h-7 rounded-bl-[22px] border-b border-l border-white/20 pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-7 h-7 rounded-br-[22px] border-b border-r border-white/20 pointer-events-none" />
              </>
            )}

            {/* Top specular hairline */}
            <div
              className={`absolute top-0 left-1/2 -translate-x-1/2 w-48 h-[1px] pointer-events-none ${
                isStudio
                  ? 'bg-gradient-to-r from-transparent via-zinc-200/50 to-transparent shadow-[0_0_10px_rgba(255,255,255,0.4)]'
                  : isRack
                  ? 'bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent'
                  : isStealth
                  ? 'bg-gradient-to-r from-transparent via-zinc-600/30 to-transparent'
                  : 'bg-gradient-to-r from-transparent via-white/40 to-transparent'
              }`}
            />

            <div className="relative mb-2">
              <Disc3
                className={`w-10 h-10 animate-spin-slow ${
                  isStudio
                    ? 'text-zinc-400 opacity-60'
                    : isRack
                    ? 'text-emerald-400/70'
                    : isStealth
                    ? 'text-zinc-500'
                    : 'text-white opacity-70'
                }`}
              />
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </span>
            </div>
            <h4 className="text-xs sm:text-sm font-bold text-zinc-200 tracking-tight">
              No songs in queue
            </h4>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Type in the search bar above to add music
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN (Tabs + Chat Card) - 1 col */}
        <div className="flex flex-col gap-2.5">
          {/* Tabs: [ Chat ]  [ Spatial ] */}
          <div
            className={`grid grid-cols-2 p-0.5 rounded-full text-xs shrink-0 ${
              isStudio
                ? 'bg-zinc-950/90 border border-white/[0.08]'
                : isRack
                ? 'bg-black/90 border border-zinc-800 font-mono'
                : isStealth
                ? 'bg-[#090a0c] border border-zinc-800'
                : 'bg-white/[0.05] border border-white/15 backdrop-blur-xl'
            }`}
          >
            <button
              type="button"
              onClick={() => onTabChange('chat')}
              className={`py-1 rounded-full font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer text-[11px] ${
                activeTab === 'chat'
                  ? isStudio
                    ? 'bg-zinc-800/90 border border-white/15 text-white shadow-sm'
                    : isRack
                    ? 'bg-zinc-800 text-emerald-300 border border-zinc-600'
                    : isStealth
                    ? 'bg-zinc-800 text-white'
                    : 'bg-white/20 border border-white/30 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <MessageCircle className="w-3 h-3" />
              <span>Chat</span>
            </button>
            <button
              type="button"
              onClick={() => onTabChange('spatial')}
              className={`py-1 rounded-full font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer text-[11px] ${
                activeTab === 'spatial'
                  ? isStudio
                    ? 'bg-zinc-800/90 border border-white/15 text-white shadow-sm'
                    : isRack
                    ? 'bg-zinc-800 text-emerald-300 border border-zinc-600'
                    : isStealth
                    ? 'bg-zinc-800 text-white'
                    : 'bg-white/20 border border-white/30 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Compass className="w-3 h-3" />
              <span>Spatial</span>
            </button>
          </div>

          {/* Chat Container */}
          <div
            className={`flex-1 rounded-2xl p-2.5 flex flex-col justify-between overflow-hidden ${
              isStudio
                ? 'bg-[#0e1014]/90 border border-white/[0.08]'
                : isRack
                ? 'bg-[#0d0f14] border border-zinc-800 font-mono'
                : isStealth
                ? 'bg-[#090a0c] border border-zinc-800/90'
                : 'bg-zinc-950/60 border border-white/[0.12] backdrop-blur-2xl'
            }`}
          >
            <div className="space-y-2 overflow-y-auto flex-1 pr-1 custom-scrollbar text-[11px]">
              {messages.map((m) => (
                <div key={m.id} className={`flex flex-col ${m.isYou ? 'items-end' : 'items-start'}`}>
                  <span className="text-[9px] text-zinc-500 font-mono mb-0.5">{m.user}</span>
                  <div
                    className={`px-2.5 py-1.5 rounded-xl max-w-[90%] text-xs ${
                      m.isYou
                        ? isStudio
                          ? 'bg-zinc-800/90 border border-white/15 text-zinc-100'
                          : isRack
                          ? 'bg-black/90 border border-zinc-700 text-emerald-300'
                          : isStealth
                          ? 'bg-[#12141a] border border-zinc-700 text-white'
                          : 'bg-white/15 border border-white/25 text-white'
                        : 'bg-zinc-900/80 border border-white/[0.06] text-zinc-300'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Chat Input */}
            <div className="pt-2 border-t border-white/[0.08] flex items-center gap-1.5">
              <input
                type="text"
                placeholder="Message"
                className="flex-1 bg-zinc-900/80 border border-white/10 rounded-full px-3 py-1 text-xs text-white placeholder:text-zinc-500 outline-none"
              />
              <button
                type="button"
                className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
              >
                <Send className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM MASTER PLAYBACK BAR */}
      <footer
        className={`w-full px-4 py-2.5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3 relative overflow-hidden ${
          isStudio
            ? 'bg-[#0e1014]/95 border border-white/[0.08] shadow-[0_4px_25px_rgba(0,0,0,0.8)]'
            : isRack
            ? 'bg-[#0d0f14] border border-zinc-800 font-mono shadow-inner'
            : isStealth
            ? 'bg-[#090a0c] border border-zinc-800/90'
            : 'bg-zinc-950/75 backdrop-blur-3xl border border-white/[0.12] shadow-2xl'
        }`}
      >
        {/* Top hairline */}
        <div
          className={`absolute top-0 left-1/2 -translate-x-1/2 w-72 h-[1px] pointer-events-none ${
            isStudio
              ? 'bg-gradient-to-r from-transparent via-zinc-200/50 to-transparent'
              : isRack
              ? 'bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent'
              : isStealth
              ? 'bg-gradient-to-r from-transparent via-zinc-600/40 to-transparent'
              : 'bg-gradient-to-r from-transparent via-white/40 to-transparent'
          }`}
        />

        {/* Left: Nudge & Metronome */}
        <div className="flex items-center gap-2 text-xs text-zinc-400 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-1 bg-zinc-950/80 border border-white/[0.08] rounded-full px-2.5 py-0.5 font-mono">
            <span className="text-zinc-500 font-bold">&lt;&lt;</span>
            <span className="text-emerald-400 font-bold min-w-[34px] text-center">
              {nudgeMs >= 0 ? `+${nudgeMs}` : nudgeMs}ms
            </span>
            <span className="text-zinc-500 font-bold">&gt;&gt;</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="px-2 py-0.5 rounded-full bg-zinc-950/80 border border-white/[0.08] font-mono text-[10px] text-zinc-400">
              50
            </span>
            <div
              className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold cursor-pointer ${
                metronomeActive
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-zinc-950/80 border border-white/[0.08] text-zinc-300'
              }`}
            >
              <span>⏱ metronome</span>
            </div>
          </div>
        </div>

        {/* Center: Controls & Scrubber */}
        <div className="flex flex-col items-center justify-center gap-1.5 w-full md:max-w-md">
          {/* Controls */}
          <div className="flex items-center gap-3">
            <Shuffle className="w-3.5 h-3.5 text-zinc-400 hover:text-white cursor-pointer" />
            <SkipBack className="w-3.5 h-3.5 text-zinc-300 hover:text-white cursor-pointer fill-current" />

            {/* Main Play/Pause Button */}
            <button
              type="button"
              onClick={onTogglePlay}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                isStudio
                  ? 'bg-gradient-to-r from-zinc-100 via-white to-zinc-200 text-black shadow-[0_0_18px_rgba(255,255,255,0.3)] hover:brightness-110'
                  : isRack
                  ? 'bg-zinc-800 border border-zinc-600 text-emerald-400 shadow-inner'
                  : isStealth
                  ? 'bg-zinc-900 border border-zinc-700 text-white shadow-sm'
                  : 'bg-white/20 backdrop-blur-md border border-white/40 text-white shadow-[0_0_20px_rgba(255,255,255,0.4)]'
              }`}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            <SkipForward className="w-3.5 h-3.5 text-zinc-300 hover:text-white cursor-pointer fill-current" />
            <div className="relative cursor-pointer">
              <Repeat className="w-3.5 h-3.5 text-emerald-400" />
              <span className="w-1 h-1 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.8)] absolute bottom-0 left-1/2 -translate-x-1/2" />
            </div>
          </div>

          {/* Scrubber Progress Bar */}
          <div className="flex items-center gap-2 w-full text-[10px] font-mono text-zinc-400">
            <span>00:00</span>
            <div className="flex-1 h-1 bg-zinc-900 border border-white/[0.08] rounded-full overflow-hidden relative">
              <div
                className={`h-full transition-all ${
                  isStudio
                    ? 'bg-gradient-to-r from-zinc-400 via-zinc-200 to-white shadow-[0_0_8px_rgba(255,255,255,0.5)]'
                    : isRack
                    ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]'
                    : isStealth
                    ? 'bg-zinc-300'
                    : 'bg-gradient-to-r from-zinc-300 via-white to-zinc-200 shadow-[0_0_10px_rgba(255,255,255,0.6)]'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span>00:01</span>
          </div>
        </div>

        {/* Right: Master Volume */}
        <div className="flex items-center gap-2 w-full md:w-40 justify-end">
          <Volume2 className="w-3.5 h-3.5 text-zinc-300" />
          <div className="w-20 h-1 bg-zinc-900 border border-white/[0.08] rounded-full overflow-hidden">
            <div
              className={`h-full ${
                isStudio ? 'bg-zinc-200' : isRack ? 'bg-emerald-400' : isStealth ? 'bg-zinc-300' : 'bg-white'
              }`}
              style={{ width: '90%' }}
            />
          </div>
          <span className="text-[11px] font-mono text-zinc-300 font-bold min-w-[28px] text-right">
            90%
          </span>
        </div>
      </footer>
    </div>
  );
};

export default TitaniumStudioShowcase;
