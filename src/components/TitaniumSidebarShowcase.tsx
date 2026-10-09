import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Check,
  X,
  Sliders,
  Users,
  Crown,
  LayoutGrid,
  Maximize2,
  Plus,
  Trash2,
  QrCode,
  Upload,
  ArrowRight,
} from 'lucide-react';
import {
  TitaniumSidebar,
  TitaniumSidebarTheme,
  TITANIUM_SIDEBAR_THEMES,
  getStoredSidebarTheme,
  saveStoredSidebarTheme,
} from './TitaniumSidebar';
import { User } from '../types';

interface TitaniumSidebarShowcaseProps {
  onClose?: () => void;
  onApplyTheme?: (theme: TitaniumSidebarTheme) => void;
}

export const TitaniumSidebarShowcase: React.FC<TitaniumSidebarShowcaseProps> = ({
  onClose,
  onApplyTheme,
}) => {
  const [activeTheme, setActiveTheme] = useState<TitaniumSidebarTheme>(getStoredSidebarTheme);
  const [viewMode, setViewMode] = useState<'grid' | TitaniumSidebarTheme>('grid');
  const [savedToast, setSavedToast] = useState<string | null>(null);

  // Interactive Live Simulators
  const [simRoomCode, setSimRoomCode] = useState<string>('14289');
  const [simPermission, setSimPermission] = useState<'everyone' | 'admins'>('admins');

  // Simulated users matching the user's screenshot ('qqqqq')
  const [simUsers, setSimUsers] = useState<User[]>([
    {
      id: 'usr-1',
      name: 'qqqqq',
      role: 'host',
      isAudioReady: true,
      avatarColor: '#10b981',
      joinedAt: Date.now(),
      deviceId: 'dev-1',
    },
    {
      id: 'usr-2',
      name: 'Sarah (Studio DJ)',
      role: 'dj',
      isAudioReady: true,
      avatarColor: '#8b5cf6',
      joinedAt: Date.now(),
      deviceId: 'dev-2',
    },
    {
      id: 'usr-3',
      name: 'Alex Beats',
      role: 'listener',
      isAudioReady: true,
      avatarColor: '#06b6d4',
      joinedAt: Date.now(),
      deviceId: 'dev-3',
    },
  ]);

  const currentUser = simUsers[0];

  const handleSelectTheme = (themeId: TitaniumSidebarTheme) => {
    setActiveTheme(themeId);
    saveStoredSidebarTheme(themeId);
    if (onApplyTheme) onApplyTheme(themeId);

    const themeObj = TITANIUM_SIDEBAR_THEMES.find((t) => t.id === themeId);
    setSavedToast(themeObj?.name || 'Theme');
    setTimeout(() => setSavedToast(null), 2500);
  };

  const handleAddUser = () => {
    const names = ['Liam Audio', 'Maya Sound', 'Noah Synth', 'Zoe Pulse', 'AcousticMesh'];
    const randomName = names[Math.floor(Math.random() * names.length)];
    const newUser: User = {
      id: `usr-${Date.now()}`,
      name: `${randomName} #${Math.floor(Math.random() * 90 + 10)}`,
      role: 'listener',
      isAudioReady: true,
      avatarColor: '#a1a1aa',
      joinedAt: Date.now(),
      deviceId: `dev-${Date.now()}`,
    };
    setSimUsers((prev) => [...prev, newUser]);
  };

  const handleRemoveUser = () => {
    if (simUsers.length > 1) {
      setSimUsers((prev) => prev.slice(0, prev.length - 1));
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) onClose();
      if (e.key === 'g' || e.key === '0') setViewMode('grid');
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
                <span>Titanium Sidebar Showcase</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 uppercase">
                  Left Sidebar Demos
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400 hidden sm:block">
                Choose your preferred titanium aesthetic for room info, permissions, and users.
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
          {/* Grid View toggle */}
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              viewMode === 'grid'
                ? 'bg-white text-black shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Compare All 4</span>
          </button>

          {/* Direct Option Tabs */}
          {TITANIUM_SIDEBAR_THEMES.map((t, idx) => (
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
          <span>"{savedToast}" selected as active Left Sidebar!</span>
        </div>
      )}

      {/* Interactive Simulation Controls Bar */}
      <div className="shrink-0 bg-[#0d0f13]/90 border-b border-white/[0.06] px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4 text-xs font-mono text-zinc-400 overflow-x-auto">
        <div className="flex items-center gap-4 sm:gap-6 shrink-0">
          <div className="flex items-center gap-1.5 text-zinc-300">
            <Sliders className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] font-semibold">Sidebar Simulator:</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-zinc-500">Room:</span>
            <input
              type="text"
              value={simRoomCode}
              maxLength={6}
              onChange={(e) => setSimRoomCode(e.target.value.toUpperCase())}
              className="w-20 bg-zinc-900 border border-white/10 rounded px-2 py-0.5 text-center text-white text-xs font-bold font-mono"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500">Users ({simUsers.length}):</span>
            <button
              type="button"
              onClick={handleAddUser}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] cursor-pointer"
              title="Add simulated user"
            >
              <Plus className="w-3 h-3 text-emerald-400" />
              <span>Add</span>
            </button>
            <button
              type="button"
              onClick={handleRemoveUser}
              disabled={simUsers.length <= 1}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] cursor-pointer disabled:opacity-40"
              title="Remove user"
            >
              <Trash2 className="w-3 h-3 text-rose-400" />
              <span>Remove</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-zinc-500">Permission:</span>
            <button
              type="button"
              onClick={() => setSimPermission(simPermission === 'everyone' ? 'admins' : 'everyone')}
              className="px-2.5 py-0.5 rounded bg-zinc-800 border border-white/10 text-white text-[11px] font-bold cursor-pointer"
            >
              {simPermission.toUpperCase()}
            </button>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-2 text-zinc-500 text-[11px]">
          <span>Active Default:</span>
          <span className="text-emerald-400 font-bold">
            {TITANIUM_SIDEBAR_THEMES.find((t) => t.id === activeTheme)?.name}
          </span>
        </div>
      </div>

      {/* Main Viewport */}
      {viewMode === 'grid' ? (
        /* 4-Card Comparison View */
        <main className="flex-1 w-full h-full overflow-y-auto p-4 sm:p-6 pb-24 custom-scrollbar">
          <div className="max-w-7xl mx-auto space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-zinc-400 px-1">
              <p>
                Compare all 4 real-dimension Titanium Sidebar designs. Click <strong>"Select This"</strong> to set as active.
              </p>
              <span className="text-[11px] font-mono text-emerald-400">
                Interactive: Click permissions or upload in any preview card!
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 sm:gap-6">
              {TITANIUM_SIDEBAR_THEMES.map((theme, idx) => {
                const isSelected = activeTheme === theme.id;

                return (
                  <div
                    key={theme.id}
                    className={`rounded-2xl border transition-all duration-200 flex flex-col overflow-hidden bg-zinc-950/70 backdrop-blur-xl shadow-xl ${
                      isSelected
                        ? 'border-emerald-400/80 shadow-[0_0_25px_rgba(52,211,153,0.18)] ring-1 ring-emerald-400/40'
                        : 'border-white/[0.08] hover:border-white/[0.2]'
                    }`}
                  >
                    {/* Top Info Bar */}
                    <div className="px-3.5 py-2.5 bg-[#0f1116] border-b border-white/[0.08] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-zinc-500 font-bold">
                          0{idx + 1}
                        </span>
                        <div>
                          <h3 className="text-xs font-bold text-white tracking-tight flex items-center gap-1.5">
                            <span>{theme.name}</span>
                          </h3>
                          <span className="text-[9px] font-mono text-zinc-400 uppercase">
                            {theme.tag}
                          </span>
                        </div>
                      </div>

                      {isSelected && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[9px] font-mono font-bold">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                          <span>ACTIVE</span>
                        </span>
                      )}
                    </div>

                    {/* Live Sidebar Preview Frame */}
                    <div className="relative h-[440px] w-full bg-[#08090c] flex justify-center overflow-hidden p-2">
                      <div className="w-full h-full rounded-xl overflow-hidden shadow-2xl border border-white/[0.05] flex">
                        <TitaniumSidebar
                          theme={theme.id}
                          roomCode={simRoomCode}
                          users={simUsers}
                          currentUser={currentUser}
                          hostId={currentUser.id}
                          playbackPermission={simPermission}
                          onPermissionChange={(perm) => setSimPermission(perm)}
                          onOpenQR={() => {
                            setSavedToast('QR Triggered (Simulation)');
                            setTimeout(() => setSavedToast(null), 1500);
                          }}
                          onUploadAudio={() => {
                            setSavedToast('Upload Triggered (Simulation)');
                            setTimeout(() => setSavedToast(null), 1500);
                          }}
                          showThemeSwitcher={false}
                          className="w-full h-full"
                        />
                      </div>

                      {/* Quick Fullscreen Hover Overlay */}
                      <button
                        type="button"
                        onClick={() => setViewMode(theme.id)}
                        className="absolute top-4 right-4 z-20 flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-900/90 hover:bg-white text-zinc-300 hover:text-black border border-white/10 text-[10px] font-mono font-bold backdrop-blur-md opacity-80 hover:opacity-100 transition-all cursor-pointer shadow-lg"
                        title="Fullscreen Preview"
                      >
                        <Maximize2 className="w-3 h-3" />
                        <span>Inspect</span>
                      </button>
                    </div>

                    {/* Card Action Footer */}
                    <div className="p-3 border-t border-white/[0.08] bg-zinc-950/80 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setViewMode(theme.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-semibold cursor-pointer transition-colors"
                      >
                        <Maximize2 className="w-3 h-3" />
                        <span>Full</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectTheme(theme.id)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm ${
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
                );
              })}
            </div>
          </div>
        </main>
      ) : (
        /* Fullscreen Single Theme Inspection View */
        <main className="flex-1 w-full h-full relative overflow-hidden flex flex-col items-center justify-center p-4 sm:p-8 bg-[#08090c]">
          {/* Back to Grid */}
          <div className="absolute top-4 left-4 z-40 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
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
              onClick={() => handleSelectTheme(viewMode as TitaniumSidebarTheme)}
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
                <span>Apply as Default Sidebar</span>
              )}
            </button>
          </div>

          {/* Centered Realistic Sidebar Inspection View */}
          <div className="w-full max-w-sm h-[520px] rounded-2xl border border-white/10 overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.9)] bg-[#0d0f14] flex">
            <TitaniumSidebar
              theme={viewMode as TitaniumSidebarTheme}
              roomCode={simRoomCode}
              users={simUsers}
              currentUser={currentUser}
              hostId={currentUser.id}
              playbackPermission={simPermission}
              onPermissionChange={(perm) => setSimPermission(perm)}
              onOpenQR={() => {
                setSavedToast('QR Triggered (Simulation)');
                setTimeout(() => setSavedToast(null), 1500);
              }}
              onUploadAudio={() => {
                setSavedToast('Upload Triggered (Simulation)');
                setTimeout(() => setSavedToast(null), 1500);
              }}
              showThemeSwitcher={true}
              onThemeChange={(newTh) => setViewMode(newTh)}
              className="w-full h-full"
            />
          </div>
        </main>
      )}
    </div>
  );
};

export default TitaniumSidebarShowcase;
