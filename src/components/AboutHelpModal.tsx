import React, { useState, useEffect, useMemo } from 'react';
import {
  Info,
  HelpCircle,
  X,
  ChevronDown,
  ChevronUp,
  Search,
  Mail,
  ExternalLink,
  Sparkles,
  Zap,
  Check,
  Globe,
  Smartphone,
  CheckCircle2,
} from 'lucide-react';
import {
  getStoredBackgroundTheme,
  BackgroundThemeId,
  BACKGROUND_THEMES,
} from '../types/backgroundThemes';

const GithubIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

export type AboutHelpModalType = 'about' | 'help' | null;

interface FAQItem {
  id: string;
  category: 'Getting Started' | 'Audio & Latency' | 'Network & Modes' | 'Host & Controls';
  question: string;
  answer: string;
  badge?: string;
}

const FAQS_DATA: FAQItem[] = [
  {
    id: 'faq-1',
    category: 'Getting Started',
    question: 'How do I connect multiple phones or speakers together?',
    answer:
      'One person taps "Create Room" to become the Host/DJ and receives a 6-digit room code and QR code. All other devices simply visit MusicSync, select "Join Room", and enter that 6-digit code. As soon as the host hits play, every connected device starts streaming the exact same song in millisecond synchrony.',
    badge: 'Popular',
  },
  {
    id: 'faq-2',
    category: 'Getting Started',
    question: 'Do my friends need to create an account or install an app?',
    answer:
      'No! MusicSync is 100% web-native and friction-free. There are no signups, passwords, or mandatory app downloads. It works right inside mobile Safari (iOS), Google Chrome (Android/PC), and desktop browsers. You can also tap "Install App" to add it to your home screen as a Progressive Web App (PWA).',
    badge: 'Zero Friction',
  },
  {
    id: 'faq-3',
    category: 'Audio & Latency',
    question: 'Why do I see an "Unlock Audio" button, or why is there no sound on iPhone?',
    answer:
      'Modern mobile browsers (especially iOS Safari and Android Chrome) enforce strict autoplay policies that block web audio from playing until a human physically interacts with the screen. Simply tap anywhere on the screen or click "Unlock Audio" once to activate the Web Audio hardware context.',
    badge: 'Important',
  },
  {
    id: 'faq-4',
    category: 'Audio & Latency',
    question: 'How does MusicSync achieve sub-millisecond sync without echoes?',
    answer:
      'We implemented a continuous Network Time Protocol (NTP RFC 5905) synchronization engine over WebSockets. Every client continuously calculates server round-trip time (RTT) and clock drift. Tracks are scheduled to begin at a specific hardware audio sample timestamp in the future, bypassing OS scheduling delays.',
    badge: 'NTP Engine',
  },
  {
    id: 'faq-5',
    category: 'Audio & Latency',
    question: 'What if my Bluetooth speaker has a delay compared to phone speakers?',
    answer:
      'Bluetooth hardware adds an unavoidable 100ms–200ms latency. Inside any room, open the Diagnostics / Settings menu and adjust your personal "Device Delay Offset" slider to delay or advance your audio stream until it aligns flawlessly with the surrounding room acoustic.',
    badge: 'Bluetooth Fix',
  },
  {
    id: 'faq-6',
    category: 'Network & Modes',
    question: 'What is the difference between Local Wi-Fi and Public Cloud mode?',
    answer:
      'Local Wi-Fi Mode is tuned for house parties and road trips where devices share the same Wi-Fi router or phone hotspot, delivering near-zero latency (<2ms). Public Cloud Mode relays synchronization packets across cloud servers, allowing friends in different cities or on cellular 5G to listen in sync together.',
    badge: 'Network',
  },
  {
    id: 'faq-7',
    category: 'Host & Controls',
    question: 'Can guests search, queue, and skip songs?',
    answer:
      'By default, yes—anyone in the room can search and add tracks to the live collaborative queue! If the host wants exclusive control (e.g. at a formal event), they can toggle "Queue Permissions" to "Host Only" inside the room settings.',
  },
  {
    id: 'faq-8',
    category: 'Host & Controls',
    question: 'What keyboard shortcuts are supported on desktop?',
    answer:
      'Space = Play / Pause | Shift + Right Arrow = Skip Track | Shift + Left Arrow = Previous Track | M = Mute Audio | F = Fullscreen Stage | Esc = Close Search / Modals | H = View Playback History.',
    badge: 'Hotkeys',
  },
];

interface AboutHelpModalProps {
  type: AboutHelpModalType;
  onClose: () => void;
}

export const AboutHelpModal: React.FC<AboutHelpModalProps> = ({ type, onClose }) => {
  const [currentTab, setCurrentTab] = useState<'about' | 'help'>('about');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>('faq-1');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<BackgroundThemeId>(getStoredBackgroundTheme);

  // Sync tab with incoming prop
  useEffect(() => {
    if (type) {
      setCurrentTab(type);
    }
  }, [type]);

  // Sync with background theme
  useEffect(() => {
    setCurrentTheme(getStoredBackgroundTheme());
    const handler = (e: any) => {
      if (e.detail?.themeId) {
        setCurrentTheme(e.detail.themeId);
      }
    };
    window.addEventListener('musicsync_bg_theme_changed', handler);
    return () => window.removeEventListener('musicsync_bg_theme_changed', handler);
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (type) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [type, onClose]);

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      navigator.clipboard.writeText('Patelrajone0@gmail.com');
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2200);
    } catch {}
  };

  const isLight = currentTheme === 'pure-light';
  const isOled = currentTheme === 'pure-oled-black';
  const themeDef = BACKGROUND_THEMES.find((t) => t.id === currentTheme) || BACKGROUND_THEMES[0];
  const accentColor = isLight ? '#2563eb' : themeDef.accentHex || '#00f0ff';

  // Filtered FAQs based on search & category
  const filteredFaqs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return FAQS_DATA.filter((faq) => {
      const matchesCategory = selectedCategory === 'All' || faq.category === selectedCategory;
      const matchesSearch =
        !q ||
        faq.question.toLowerCase().includes(q) ||
        faq.answer.toLowerCase().includes(q) ||
        faq.category.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  if (!type) return null;

  return (
    <div
      onClick={onClose}
      className={`fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 backdrop-blur-md animate-fade-in font-sans select-none overflow-y-auto ${
        isLight ? 'bg-slate-900/40' : 'bg-black/85'
      }`}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: isLight
            ? '#ffffff'
            : isOled
            ? '#000000'
            : 'var(--bg-surface-elevated, #0f1015)',
          borderColor: isLight
            ? 'rgba(203, 213, 225, 0.9)'
            : 'var(--bg-border, rgba(255, 255, 255, 0.12))',
        }}
        className={`relative w-full max-w-3xl rounded-2xl sm:rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto transition-all ${
          isLight
            ? 'light-modal text-slate-900 shadow-[0_24px_70px_rgba(15,23,42,0.18)]'
            : 'dark-modal text-zinc-100 shadow-[0_24px_70px_rgba(0,0,0,0.85)]'
        }`}
      >
        {/* Subtle Hairline Gradient Header */}
        <div
          style={{
            background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
          }}
          className="absolute top-0 left-0 right-0 h-[2px] pointer-events-none opacity-80"
        />

        {/* ================================================================= */}
        {/* MODAL HEADER: Clean, Integrated Segmented Switcher               */}
        {/* ================================================================= */}
        <header
          className={`px-4 sm:px-6 py-3.5 border-b flex items-center justify-between gap-3 shrink-0 backdrop-blur-md transition-colors ${
            isLight
              ? 'bg-slate-50/95 border-slate-200'
              : isOled
              ? 'bg-black/95 border-white/[0.08]'
              : 'bg-[#12131b]/95 border-white/[0.08]'
          }`}
        >
          {/* Brand & Title */}
          <div className="flex items-center gap-2.5">
            <div
              style={{
                backgroundColor: isLight ? 'rgba(37,99,235,0.1)' : `${accentColor}20`,
                borderColor: isLight ? 'rgba(37,99,235,0.25)' : `${accentColor}40`,
                color: accentColor,
              }}
              className="w-8 h-8 rounded-xl border flex items-center justify-center shadow-sm shrink-0"
            >
              {currentTab === 'about' ? (
                <Info className="w-4 h-4" />
              ) : (
                <HelpCircle className="w-4 h-4" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold tracking-tight">MusicSync</h2>
                <span
                  style={{
                    backgroundColor: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.06)',
                    borderColor: isLight ? '#e2e8f0' : 'rgba(255,255,255,0.1)',
                    color: isLight ? '#475569' : '#94a3b8',
                  }}
                  className="px-2 py-0.5 rounded-full text-[10px] font-mono border"
                >
                  v2.4 Titanium
                </span>
              </div>
              <p className={`text-[11px] hidden sm:block ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                {currentTab === 'about'
                  ? 'Mission, Architecture & Creator Details'
                  : 'Knowledge Base, FAQs & Troubleshooting'}
              </p>
            </div>
          </div>

          {/* Segmented Control Switcher */}
          <div
            className={`flex items-center p-1 rounded-xl border ${
              isLight
                ? 'bg-slate-200/60 border-slate-300/60'
                : 'bg-white/[0.04] border-white/[0.08]'
            }`}
          >
            <button
              type="button"
              onClick={() => setCurrentTab('about')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                currentTab === 'about'
                  ? isLight
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'bg-white/15 text-white shadow-sm'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              <span>About</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentTab('help')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                currentTab === 'help'
                  ? isLight
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'bg-white/15 text-white shadow-sm'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Help & FAQs</span>
            </button>
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-xl transition-colors cursor-pointer shrink-0 ${
              isLight
                ? 'text-slate-400 hover:text-slate-900 hover:bg-slate-200/70'
                : 'text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* ================================================================= */}
        {/* TAB 1: ABOUT SECTION                                              */}
        {/* ================================================================= */}
        {currentTab === 'about' && (
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-6">
            {/* 1. CORE MISSION HERO STATEMENT */}
            <div
              style={{
                backgroundColor: isLight
                  ? '#f8fafc'
                  : isOled
                  ? '#050505'
                  : 'var(--bg-card, rgba(20,20,28,0.7))',
                borderColor: isLight
                  ? '#e2e8f0'
                  : 'var(--bg-border, rgba(255,255,255,0.08))',
              }}
              className="p-5 sm:p-6 rounded-2xl border space-y-3 transition-colors relative overflow-hidden"
            >
              <div className="flex items-center gap-2">
                <span
                  style={{ backgroundColor: accentColor }}
                  className="w-2 h-2 rounded-full animate-pulse"
                />
                <span
                  style={{ color: accentColor }}
                  className="text-[10px] font-mono uppercase tracking-widest font-bold"
                >
                  Sub-Millisecond Acoustic Synchronization
                </span>
              </div>

              <h3 className="text-base sm:text-lg font-bold leading-snug tracking-tight">
                "Play music together across every device with zero delay, no apps to install, and pure acoustic harmony."
              </h3>

              <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? 'text-slate-600' : 'text-zinc-300'}`}>
                Music sounds best when shared physically in the same room. Rather than listening separately through
                headphones or suffering through 500ms of discordant Bluetooth echoes, MusicSync transforms any collection
                of smartphones, laptops, and speakers into a unified, high-fidelity soundstage right through standard web browsers.
              </p>
            </div>

            {/* 2. THREE CORE PILLARS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {/* Pillar 1 */}
              <div
                style={{
                  backgroundColor: isLight
                    ? '#f8fafc'
                    : isOled
                    ? '#050505'
                    : 'var(--bg-card, rgba(255,255,255,0.03))',
                  borderColor: isLight ? '#e2e8f0' : 'var(--bg-border, rgba(255,255,255,0.08))',
                }}
                className="p-4 rounded-2xl border space-y-2 transition-colors"
              >
                <div
                  style={{
                    backgroundColor: isLight ? 'rgba(37,99,235,0.1)' : `${accentColor}15`,
                    borderColor: isLight ? 'rgba(37,99,235,0.2)' : `${accentColor}30`,
                    color: accentColor,
                  }}
                  className="w-8 h-8 rounded-xl border flex items-center justify-center font-bold"
                >
                  <Smartphone className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold">Zero Friction</h4>
                <p className={`text-[11px] leading-relaxed ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                  No app store downloads, signups, or passwords. Join in seconds by scanning a QR code or entering a 6-digit room code on iOS, Android, Mac, or PC.
                </p>
              </div>

              {/* Pillar 2 */}
              <div
                style={{
                  backgroundColor: isLight
                    ? '#f8fafc'
                    : isOled
                    ? '#050505'
                    : 'var(--bg-card, rgba(255,255,255,0.03))',
                  borderColor: isLight ? '#e2e8f0' : 'var(--bg-border, rgba(255,255,255,0.08))',
                }}
                className="p-4 rounded-2xl border space-y-2 transition-colors"
              >
                <div
                  style={{
                    backgroundColor: isLight ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.15)',
                    borderColor: isLight ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.3)',
                    color: '#10b981',
                  }}
                  className="w-8 h-8 rounded-xl border flex items-center justify-center font-bold"
                >
                  <Zap className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold">Sub-2ms NTP Engine</h4>
                <p className={`text-[11px] leading-relaxed ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                  Continuous Network Time Protocol (RFC 5905) synchronization calculates hardware clock drift so sound waves reinforce each other with zero echo.
                </p>
              </div>

              {/* Pillar 3 */}
              <div
                style={{
                  backgroundColor: isLight
                    ? '#f8fafc'
                    : isOled
                    ? '#050505'
                    : 'var(--bg-card, rgba(255,255,255,0.03))',
                  borderColor: isLight ? '#e2e8f0' : 'var(--bg-border, rgba(255,255,255,0.08))',
                }}
                className="p-4 rounded-2xl border space-y-2 transition-colors"
              >
                <div
                  style={{
                    backgroundColor: isLight ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.15)',
                    borderColor: isLight ? 'rgba(245,158,11,0.2)' : 'rgba(245,158,11,0.3)',
                    color: '#f59e0b',
                  }}
                  className="w-8 h-8 rounded-xl border flex items-center justify-center font-bold"
                >
                  <Globe className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold">100% Free & Open Web</h4>
                <p className={`text-[11px] leading-relaxed ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                  No subscription paywalls, no banner ads, and no hardware brand restrictions. Built for friends, house parties, barbecues, and dorm rooms.
                </p>
              </div>
            </div>

            {/* 3. KEY ENGINE MILESTONES (MINIMALIST STAT CARDS) */}
            <div className="space-y-2">
              <span
                className={`text-[10px] font-mono uppercase font-bold tracking-wider px-1 ${
                  isLight ? 'text-slate-500' : 'text-zinc-400'
                }`}
              >
                Engine Specifications
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div
                  style={{
                    backgroundColor: isLight ? '#f8fafc' : isOled ? '#050505' : 'rgba(255,255,255,0.03)',
                    borderColor: isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)',
                  }}
                  className="p-3.5 rounded-xl border text-center space-y-1 transition-colors"
                >
                  <div className={`text-[10px] font-mono uppercase ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                    Sync Precision
                  </div>
                  <div style={{ color: accentColor }} className="text-lg font-black font-mono">
                    ±1.8 ms
                  </div>
                  <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                    Below echo threshold
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: isLight ? '#f8fafc' : isOled ? '#050505' : 'rgba(255,255,255,0.03)',
                    borderColor: isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)',
                  }}
                  className="p-3.5 rounded-xl border text-center space-y-1 transition-colors"
                >
                  <div className={`text-[10px] font-mono uppercase ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                    Max Devices
                  </div>
                  <div className="text-lg font-black text-emerald-500 font-mono">50+</div>
                  <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                    Tested in single room
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: isLight ? '#f8fafc' : isOled ? '#050505' : 'rgba(255,255,255,0.03)',
                    borderColor: isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)',
                  }}
                  className="p-3.5 rounded-xl border text-center space-y-1 transition-colors"
                >
                  <div className={`text-[10px] font-mono uppercase ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                    Sign-up Time
                  </div>
                  <div className="text-lg font-black text-amber-500 font-mono">0.0 sec</div>
                  <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                    Instant guest entry
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: isLight ? '#f8fafc' : isOled ? '#050505' : 'rgba(255,255,255,0.03)',
                    borderColor: isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)',
                  }}
                  className="p-3.5 rounded-xl border text-center space-y-1 transition-colors"
                >
                  <div className={`text-[10px] font-mono uppercase ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                    Platform
                  </div>
                  <div className="text-lg font-black text-indigo-500 font-mono">100% PWA</div>
                  <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                    Web Audio + NTP
                  </div>
                </div>
              </div>
            </div>

            {/* 4. MEET THE CREATOR (RAJ PATEL) */}
            <div className="space-y-2">
              <span
                className={`text-[10px] font-mono uppercase font-bold tracking-wider px-1 ${
                  isLight ? 'text-slate-500' : 'text-zinc-400'
                }`}
              >
                Meet the Creator
              </span>

              <div
                style={{
                  backgroundColor: isLight
                    ? '#f8fafc'
                    : isOled
                    ? '#050505'
                    : 'var(--bg-card, rgba(20,20,28,0.7))',
                  borderColor: isLight ? '#e2e8f0' : 'var(--bg-border, rgba(255,255,255,0.08))',
                }}
                className="p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row items-center sm:items-start gap-4 transition-colors"
              >
                {/* Avatar Photo Frame */}
                <div className="relative shrink-0">
                  <div
                    style={{
                      background: `linear-gradient(135deg, ${accentColor}, #6366f1)`,
                    }}
                    className="w-16 h-16 rounded-2xl p-0.5 shadow-md"
                  >
                    <div
                      style={{ backgroundColor: isLight ? '#ffffff' : '#090a0f' }}
                      className="w-full h-full rounded-[14px] overflow-hidden flex items-center justify-center relative"
                    >
                      <img
                        src="/raj-patel.png"
                        alt="Raj Patel"
                        className="w-full h-full object-cover object-top"
                        onError={(e) => {
                          const target = e.currentTarget as HTMLElement;
                          target.style.display = 'none';
                          const fallback = target.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                      <div
                        style={{ color: accentColor }}
                        className="w-full h-full hidden items-center justify-center font-extrabold text-xl font-mono"
                      >
                        RP
                      </div>
                    </div>
                  </div>
                  <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-emerald-500 text-black text-[9px] font-bold uppercase shadow">
                    Host
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2 text-center sm:text-left flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold flex items-center justify-center sm:justify-start gap-2">
                        <span>Raj Patel</span>
                        <span
                          style={{
                            backgroundColor: isLight ? 'rgba(37,99,235,0.1)' : `${accentColor}15`,
                            borderColor: isLight ? 'rgba(37,99,235,0.2)' : `${accentColor}30`,
                            color: accentColor,
                          }}
                          className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
                        >
                          Founder & Audio Architect
                        </span>
                      </h4>
                      <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                        Full-Stack Engineer & Audio Systems Designer
                      </p>
                    </div>

                    {/* Social & Contact Chips */}
                    <div className="flex items-center justify-center sm:justify-end gap-1.5 flex-wrap pt-1 sm:pt-0">
                      <button
                        type="button"
                        onClick={handleCopyEmail}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-mono flex items-center gap-1.5 transition-colors cursor-pointer border ${
                          isLight
                            ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                            : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-zinc-300 hover:text-white'
                        }`}
                        title="Copy email or click to email"
                      >
                        {copiedEmail ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span className="text-emerald-500 font-semibold">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Mail className="w-3 h-3 text-cyan-400" />
                            <span>Patelrajone0@gmail.com</span>
                          </>
                        )}
                      </button>

                      <a
                        href="https://github.com/Patelrajone0/MusicSync"
                        target="_blank"
                        rel="noreferrer"
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-mono flex items-center gap-1 transition-colors border ${
                          isLight
                            ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                            : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-zinc-300 hover:text-white'
                        }`}
                      >
                        <GithubIcon className="w-3 h-3" />
                        <span>GitHub</span>
                      </a>
                    </div>
                  </div>

                  <p
                    className={`text-xs italic leading-relaxed pt-1 border-t ${
                      isLight ? 'text-slate-600 border-slate-200' : 'text-zinc-300 border-white/[0.06]'
                    }`}
                  >
                    "Music sounds best when shared in the same room. Technology should bring people together, not force everyone into separate headphones."
                  </p>

                  {/* Made with Love in INDIA */}
                  <div
                    className={`pt-2 border-t flex items-center justify-center sm:justify-between text-[11px] ${
                      isLight ? 'border-slate-200 text-slate-500' : 'border-white/[0.06] text-zinc-400'
                    }`}
                  >
                    <div
                      className={`inline-flex items-center gap-1.5 font-medium px-2.5 py-1 rounded-lg border ${
                        isLight
                          ? 'bg-slate-100 border-slate-200 text-slate-700'
                          : 'bg-white/[0.03] border-white/[0.06] text-zinc-200'
                      }`}
                    >
                      <span>Made with</span>
                      <span className="text-rose-500">❤️</span>
                      <span>
                        in <strong className="font-bold">INDIA</strong>
                      </span>
                      <span className="text-xs">🇮🇳</span>
                    </div>

                    <span className="text-[10px] font-mono hidden sm:inline">
                      Sub-millisecond audio sync engine
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. OTHER PROJECTS BY RAJ PATEL */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <span
                  className={`text-[10px] font-mono uppercase font-bold tracking-wider flex items-center gap-1.5 ${
                    isLight ? 'text-slate-500' : 'text-zinc-400'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" style={{ color: accentColor }} />
                  <span>Other Projects by Raj Patel</span>
                </span>
                <span className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                  Web Ecosystem
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Parkable */}
                <a
                  href="https://patelrajone0.github.io/Parkable/login/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    backgroundColor: isLight ? '#f8fafc' : isOled ? '#050505' : 'rgba(255,255,255,0.03)',
                    borderColor: isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)',
                  }}
                  className={`p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 group cursor-pointer shadow-sm ${
                    isLight ? 'hover:bg-slate-100 hover:border-slate-300' : 'hover:bg-white/[0.06] hover:border-white/20'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold group-hover:text-blue-500 transition-colors">
                        Parkable
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-semibold">
                        Live App
                      </span>
                    </div>
                    <p className={`text-[11px] leading-snug ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                      Smart parking space management and vehicle slot reservation platform.
                    </p>
                    <span
                      style={{ color: accentColor }}
                      className="text-[10px] font-mono flex items-center gap-1 pt-0.5"
                    >
                      patelrajone0.github.io/Parkable
                    </span>
                  </div>
                  <div
                    className={`p-1.5 rounded-lg shrink-0 mt-0.5 transition-colors ${
                      isLight ? 'bg-slate-200/60 text-slate-500 group-hover:text-slate-900' : 'bg-white/[0.04] text-zinc-400 group-hover:text-white'
                    }`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </div>
                </a>

                {/* Ambient Clock */}
                <a
                  href="https://ambient-clock.onrender.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    backgroundColor: isLight ? '#f8fafc' : isOled ? '#050505' : 'rgba(255,255,255,0.03)',
                    borderColor: isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)',
                  }}
                  className={`p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 group cursor-pointer shadow-sm ${
                    isLight ? 'hover:bg-slate-100 hover:border-slate-300' : 'hover:bg-white/[0.06] hover:border-white/20'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold group-hover:text-amber-500 transition-colors">
                        Ambient Clock
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 font-semibold">
                        Live App
                      </span>
                    </div>
                    <p className={`text-[11px] leading-snug ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                      Minimalist ambient digital timepiece & aesthetic focus dashboard.
                    </p>
                    <span className="text-[10px] font-mono text-amber-500 flex items-center gap-1 pt-0.5">
                      ambient-clock.onrender.com
                    </span>
                  </div>
                  <div
                    className={`p-1.5 rounded-lg shrink-0 mt-0.5 transition-colors ${
                      isLight ? 'bg-slate-200/60 text-slate-500 group-hover:text-slate-900' : 'bg-white/[0.04] text-zinc-400 group-hover:text-white'
                    }`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </div>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: HELP & FAQS SECTION                                        */}
        {/* ================================================================= */}
        {currentTab === 'help' && (
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-5">
            {/* 1. SEARCH INPUT & CATEGORIES FILTER */}
            <div className="space-y-2.5">
              <div className="relative">
                <Search
                  className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${
                    isLight ? 'text-slate-400' : 'text-zinc-400'
                  }`}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search audio guides, latency tips, Bluetooth fixes..."
                  className={`w-full pl-10 pr-9 py-2.5 rounded-xl border text-xs transition-all font-sans focus:outline-none ${
                    isLight
                      ? 'bg-slate-100 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                      : 'bg-white/[0.05] border-white/10 text-white placeholder-zinc-500 focus:bg-white/[0.08] focus:border-white/30 focus:ring-1 focus:ring-white/20'
                  }`}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-md ${
                      isLight ? 'text-slate-400 hover:text-slate-700' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                {['All', 'Getting Started', 'Audio & Latency', 'Network & Modes', 'Host & Controls'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all shrink-0 cursor-pointer border ${
                      selectedCategory === cat
                        ? isLight
                          ? 'bg-blue-600 text-white border-blue-600 font-semibold shadow-sm'
                          : 'bg-white/20 text-white border-white/30 font-semibold'
                        : isLight
                        ? 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200/80 hover:text-slate-900'
                        : 'bg-white/[0.04] text-zinc-400 border-white/[0.06] hover:bg-white/[0.08] hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
                <span className={`ml-auto text-[10px] font-mono shrink-0 ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                  {filteredFaqs.length} Guides
                </span>
              </div>
            </div>

            {/* 2. FAQS ACCORDION LIST */}
            <div className="space-y-2">
              {filteredFaqs.length === 0 ? (
                <div
                  className={`p-8 text-center rounded-2xl border text-xs ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-white/[0.02] border-white/[0.06] text-zinc-500'
                  }`}
                >
                  No guides found matching "{searchQuery}". Try searching for 'bluetooth', 'wifi', or 'delay'.
                </div>
              ) : (
                filteredFaqs.map((faq) => {
                  const isOpen = expandedFaqId === faq.id;
                  return (
                    <div
                      key={faq.id}
                      style={{
                        backgroundColor: isLight
                          ? isOpen
                            ? 'rgba(37,99,235,0.04)'
                            : '#ffffff'
                          : isOpen
                          ? 'rgba(255,255,255,0.06)'
                          : isOled
                          ? '#050505'
                          : 'rgba(255,255,255,0.03)',
                        borderColor: isLight
                          ? isOpen
                            ? 'rgba(37,99,235,0.4)'
                            : '#e2e8f0'
                          : isOpen
                          ? `${accentColor}60`
                          : 'rgba(255,255,255,0.08)',
                      }}
                      className={`rounded-2xl border transition-all duration-200 overflow-hidden shadow-sm`}
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedFaqId(isOpen ? null : faq.id)}
                        className="w-full p-3.5 sm:p-4 text-left flex items-start justify-between gap-3 cursor-pointer group"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${
                                isLight
                                  ? 'bg-slate-100 border-slate-200 text-slate-600'
                                  : 'bg-white/[0.06] border-white/10 text-zinc-400'
                              }`}
                            >
                              {faq.category}
                            </span>
                            {faq.badge && (
                              <span
                                style={{
                                  backgroundColor: isLight ? 'rgba(37,99,235,0.1)' : `${accentColor}15`,
                                  borderColor: isLight ? 'rgba(37,99,235,0.25)' : `${accentColor}30`,
                                  color: accentColor,
                                }}
                                className="text-[10px] font-mono px-2 py-0.5 rounded-md font-semibold border"
                              >
                                {faq.badge}
                              </span>
                            )}
                          </div>
                          <h4
                            className={`text-xs sm:text-sm font-bold transition-colors ${
                              isOpen
                                ? isLight
                                  ? 'text-blue-600'
                                  : 'text-white'
                                : isLight
                                ? 'text-slate-900 group-hover:text-blue-600'
                                : 'text-zinc-100 group-hover:text-white'
                            }`}
                          >
                            {faq.question}
                          </h4>
                        </div>

                        <div
                          className={`p-1 rounded-lg shrink-0 mt-0.5 transition-colors ${
                            isLight
                              ? 'bg-slate-100 text-slate-500 group-hover:text-slate-900'
                              : 'bg-white/[0.04] text-zinc-400 group-hover:text-white'
                          }`}
                        >
                          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </button>

                      {isOpen && (
                        <div
                          className={`px-3.5 sm:px-4 pb-4 pt-1 text-xs leading-relaxed border-t ${
                            isLight
                              ? 'text-slate-600 border-slate-200/80 bg-white/50'
                              : 'text-zinc-300 border-white/[0.06]'
                          }`}
                        >
                          <p>{faq.answer}</p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* 3. DIRECT DEVELOPER SUPPORT BANNER */}
            <div
              style={{
                backgroundColor: isLight ? '#f8fafc' : isOled ? '#050505' : 'rgba(255,255,255,0.03)',
                borderColor: isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)',
              }}
              className="p-4 sm:p-5 rounded-2xl border space-y-3 transition-colors"
            >
              <div>
                <h4 className="text-sm font-bold flex items-center gap-2">
                  <Mail className="w-4 h-4" style={{ color: accentColor }} />
                  <span>Need Extra Help or Found an Issue?</span>
                </h4>
                <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                  Reach out directly for assistance, latency troubleshooting, or personal feature requests.
                </p>
              </div>

              <div>
                <a
                  href="mailto:Patelrajone0@gmail.com?subject=MusicSync%20Support%20Inquiry"
                  onClick={handleCopyEmail}
                  className={`p-3.5 rounded-xl border transition-all flex items-center justify-between group cursor-pointer shadow-sm ${
                    isLight
                      ? 'bg-white hover:bg-slate-100/90 border-slate-300/80 hover:border-blue-400'
                      : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      style={{
                        backgroundColor: isLight ? 'rgba(37,99,235,0.1)' : `${accentColor}15`,
                        borderColor: isLight ? 'rgba(37,99,235,0.25)' : `${accentColor}30`,
                        color: accentColor,
                      }}
                      className="w-9 h-9 rounded-lg border flex items-center justify-center shrink-0"
                    >
                      <Mail className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-bold transition-colors flex items-center gap-2">
                        <span>Direct Developer Email</span>
                        <span className={`text-[10px] hidden sm:inline ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>
                          (Click to email or copy)
                        </span>
                      </div>
                      <div
                        style={{ color: accentColor }}
                        className="text-xs font-mono font-medium mt-0.5"
                      >
                        {copiedEmail ? '✓ Copied to clipboard!' : 'Patelrajone0@gmail.com'}
                      </div>
                    </div>
                  </div>
                  <div className={`flex items-center gap-2 text-xs ${isLight ? 'text-slate-400 group-hover:text-slate-700' : 'text-zinc-400 group-hover:text-white'}`}>
                    <span className="hidden sm:inline text-[11px] font-mono">{copiedEmail ? 'Copied' : 'Contact'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </div>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* FOOTER: Minimalist Dismiss Action Bar                            */}
        {/* ================================================================= */}
        <footer
          className={`px-4 sm:px-6 py-3 border-t flex items-center justify-between text-xs shrink-0 backdrop-blur-md transition-colors ${
            isLight
              ? 'bg-slate-50/95 border-slate-200'
              : isOled
              ? 'bg-black/95 border-white/[0.08]'
              : 'bg-[#0d0e14]/95 border-white/[0.08]'
          }`}
        >
          <div className={`text-[11px] font-mono hidden sm:block ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
            Press <kbd className={`px-1.5 py-0.5 rounded border text-[10px] ${isLight ? 'bg-slate-200 border-slate-300 text-slate-700' : 'bg-white/10 border-white/10 text-zinc-300'}`}>Esc</kbd> anytime to dismiss
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              style={{
                backgroundColor: isLight ? '#2563eb' : accentColor,
                color: isLight ? '#ffffff' : '#000000',
              }}
              className="px-5 py-1.5 rounded-xl font-bold transition-all cursor-pointer shadow-md active:scale-95 text-xs hover:opacity-90"
            >
              Done
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default AboutHelpModal;
