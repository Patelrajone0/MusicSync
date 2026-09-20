import React, { useRef } from 'react';
import { Sparkles, Check, Sliders, Layers, Terminal, Compass } from 'lucide-react';
import { LobbyThemeVariant } from './types';

export const AudioWaveform: React.FC<{ active?: boolean; barCount?: number }> = ({
  active = true,
  barCount = 14,
}) => {
  const heights = [40, 75, 30, 95, 60, 100, 70, 85, 45, 90, 35, 65, 80, 50];

  return (
    <div className="flex items-center gap-[2.5px] h-6 px-1 shrink-0 pointer-events-none select-none">
      {Array.from({ length: barCount }).map((_, i) => {
        const h = heights[i % heights.length];
        return (
          <span
            key={i}
            className="w-[2px] sm:w-[2.5px] rounded-full bg-gradient-to-t from-cyan-400 via-sky-400 to-fuchsia-500 transition-all duration-300 shadow-[0_0_6px_rgba(0,240,255,0.4)]"
            style={{
              height: active ? `${h}%` : '20%',
              animation: active
                ? `cyberWavePulse ${0.5 + (i % 6) * 0.15}s ease-in-out infinite alternate`
                : 'none',
              animationDelay: `${i * 0.07}s`,
            }}
          />
        );
      })}
    </div>
  );
};

export const PinCodeInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}> = ({ value, onChange, disabled }) => {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }).map((_, i) => value[i] || '');

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '');
    if (!rawVal) {
      // Clear digit
      const next = value.slice(0, index) + value.slice(index + 1);
      onChange(next);
      return;
    }

    if (rawVal.length > 1) {
      // Multiple chars pasted
      const nextVal = (value.slice(0, index) + rawVal).slice(0, 6);
      onChange(nextVal);
      const nextIndex = Math.min(5, nextVal.length);
      inputsRef.current[nextIndex]?.focus();
      return;
    }

    // Single digit entered
    const char = rawVal[rawVal.length - 1];
    const valArr = value.split('');
    valArr[index] = char;
    const nextVal = valArr.join('').slice(0, 6);
    onChange(nextVal);

    if (index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) {
      onChange(pasted);
      const nextIndex = Math.min(5, pasted.length);
      inputsRef.current[nextIndex]?.focus();
    }
  };

  return (
    <div className="flex items-center justify-between gap-1.5 sm:gap-2 w-full select-none" onPaste={handlePaste}>
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => (inputsRef.current[i] = el)}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          disabled={disabled}
          value={digit}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className={`w-10 sm:w-12 h-11 sm:h-13 text-center text-base sm:text-lg font-mono font-black rounded-2xl border transition-all duration-200 outline-none ${
            digit
              ? 'bg-cyan-950/50 border-cyan-400 text-cyan-300 shadow-[0_0_16px_rgba(0,240,255,0.4)] ring-1 ring-cyan-400/50'
              : 'bg-dark-950/80 border-white/10 text-white hover:border-cyan-400/30 focus:border-cyan-400 focus:shadow-[0_0_12px_rgba(0,240,255,0.25)]'
          }`}
          placeholder="·"
        />
      ))}
    </div>
  );
};

export const ThemeSwitcherDock: React.FC<{
  currentTheme: LobbyThemeVariant;
  onSelectTheme: (theme: LobbyThemeVariant) => void;
}> = ({ currentTheme, onSelectTheme }) => {
  const themes: { id: LobbyThemeVariant; label: string; badge: string; icon: any }[] = [
    { id: 'cyber_deck', label: 'Concept 1: Cyber Deck', badge: 'Neon Glow', icon: Sparkles },
    { id: 'studio_pro', label: 'Concept 2: Studio Pro', badge: 'Obsidian', icon: Compass },
    { id: 'holo_tabs', label: 'Concept 3: Holo Tabs', badge: 'Host/Join Tabs', icon: Layers },
    { id: 'classic', label: 'Classic', badge: 'Original', icon: Terminal },
  ];

  return (
    <div className="fixed bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-[96vw] sm:max-w-xl w-full px-2 animate-fade-in select-none">
      <div className="p-1.5 sm:p-2 rounded-2xl bg-dark-900/95 backdrop-blur-2xl border border-white/15 shadow-[0_0_40px_rgba(0,0,0,0.9),0_0_20px_rgba(0,240,255,0.15)] flex items-center justify-between gap-1 overflow-x-auto">
        <div className="hidden sm:flex items-center gap-1.5 pl-2 pr-1 shrink-0">
          <div className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-[0_0_8px_rgba(0,240,255,0.4)]">
            <Sliders className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col text-left leading-none">
            <span className="text-[10px] font-mono font-bold text-white uppercase tracking-wider">
              Live Demo
            </span>
            <span className="text-[9px] font-mono text-slate-400">
              Click to preview
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 w-full sm:w-auto justify-between sm:justify-end">
          {themes.map((t) => {
            const isActive = currentTheme === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelectTheme(t.id)}
                className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-400 via-sky-400 to-cyan-300 text-black font-extrabold shadow-[0_0_16px_rgba(0,240,255,0.5)]'
                    : 'bg-dark-950/70 hover:bg-dark-850 text-slate-300 hover:text-white border border-white/5 hover:border-white/15'
                }`}
                title={`Switch to ${t.label}`}
              >
                <Icon className={`w-3 h-3 ${isActive ? 'text-black' : 'text-cyan-400'}`} />
                <span className="text-[11px] sm:text-xs">{t.label.split(':')[1] || t.label}</span>
                {isActive && <Check className="w-3 h-3 stroke-[3]" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
