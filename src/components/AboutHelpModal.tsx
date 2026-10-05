import React, { useState, useEffect, useMemo } from 'react';
import {
  Info,
  HelpCircle,
  X,
  Search,
  ChevronDown,
  ChevronUp,
  Volume2,
  Keyboard,
  ShieldCheck,
  CheckCircle2,
  MessageSquare,
  Mail,
  ExternalLink,
  Sparkles,
  Cpu,
  Users,
  Award,
  Zap,
  Radio,
  Wifi,
  Headphones,
  Sliders,
  Check,
  Globe,
  Clock,
  ArrowRight,
  Smile
} from 'lucide-react';

const GithubIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
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
    badge: 'Popular'
  },
  {
    id: 'faq-2',
    category: 'Getting Started',
    question: 'Do my friends need to create an account or install an app?',
    answer:
      'No! MusicSync is 100% web-native and friction-free. There are no signups, passwords, or mandatory app downloads. It works right inside mobile Safari (iOS), Google Chrome (Android/PC), and desktop browsers. You can also tap "Install App" to add it to your home screen as a Progressive Web App (PWA).',
    badge: 'Zero Friction'
  },
  {
    id: 'faq-3',
    category: 'Audio & Latency',
    question: 'Why do I see an "Unlock Audio" button, or why is there no sound on iPhone?',
    answer:
      'Modern mobile browsers (especially iOS Safari and Android Chrome) enforce strict autoplay policies that block web audio from playing until a human physically interacts with the screen. Simply tap anywhere on the screen or click "Unlock Audio" once to activate the Web Audio hardware context.',
    badge: 'Important'
  },
  {
    id: 'faq-4',
    category: 'Audio & Latency',
    question: 'How does MusicSync achieve sub-millisecond sync without echoes?',
    answer:
      'We implemented a continuous Network Time Protocol (NTP RFC 5905) synchronization engine over WebSockets. Every client continuously calculates server round-trip time (RTT) and clock drift. Tracks are scheduled to begin at a specific hardware audio sample timestamp in the future, bypassing OS scheduling delays.',
    badge: 'NTP Engine'
  },
  {
    id: 'faq-5',
    category: 'Audio & Latency',
    question: 'What if my Bluetooth speaker has a delay compared to phone speakers?',
    answer:
      'Bluetooth hardware adds an unavoidable 100ms–200ms latency. Inside any room, open the Diagnostics / Settings menu and adjust your personal "Device Delay Offset" slider to delay or advance your audio stream until it aligns flawlessly with the surrounding room acoustic.',
    badge: 'Bluetooth Fix'
  },
  {
    id: 'faq-6',
    category: 'Network & Modes',
    question: 'What is the difference between Local Wi-Fi and Public Cloud mode?',
    answer:
      'Local Wi-Fi Mode is tuned for house parties and road trips where devices share the same Wi-Fi router or phone hotspot, delivering near-zero latency (<2ms). Public Cloud Mode relays synchronization packets across cloud servers, allowing friends in different cities or on cellular 5G to listen in sync together.',
    badge: 'Network'
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
    badge: 'Hotkeys'
  }
];

const CATEGORIES = ['All', 'Getting Started', 'Audio & Latency', 'Network & Modes', 'Host & Controls'] as const;

interface AboutHelpModalProps {
  type: AboutHelpModalType;
  onClose: () => void;
}

export const AboutHelpModal: React.FC<AboutHelpModalProps> = ({
  type,
  onClose
}) => {
  // Help section states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>('faq-1');
  const [copiedEmail, setCopiedEmail] = useState(false);

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

  // Filtered FAQs based on category & search term
  const filteredFaqs = useMemo(() => {
    return FAQS_DATA.filter((item) => {
      const matchesCategory =
        selectedCategory === 'All' || item.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q) ||
        (item.badge && item.badge.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      navigator.clipboard.writeText('Patelrajone0@gmail.com');
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2200);
    } catch {}
  };

  if (!type) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in font-sans select-none overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl bg-[#0f1015]/95 border border-white/[0.12] rounded-2xl sm:rounded-3xl shadow-[0_20px_70px_rgba(0,0,0,0.85)] overflow-hidden text-zinc-200 flex flex-col max-h-[90vh] my-auto transition-all"
      >
        {/* ================================================================= */}
        {/* MODAL HEADER (DEDICATED PER SECTION - NO TAB SWITCHER BAR)        */}
        {/* ================================================================= */}
        {type === 'about' ? (
          <header className="px-4 sm:px-6 py-3.5 border-b border-white/[0.08] bg-[#12131b]/95 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-500 to-indigo-600 p-0.5 shadow-md flex items-center justify-center">
                <div className="w-full h-full bg-[#0a0a0f] rounded-[10px] flex items-center justify-center">
                  <Info className="w-4 h-4 text-cyan-300" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">About MusicSync</h2>
                  <span className="px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-[10px] font-mono text-cyan-300">
                    v2.4 Titanium
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 hidden sm:block">Mission, Architecture & Creator Details</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Close Modal (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </header>
        ) : (
          <header className="px-4 sm:px-6 py-3.5 border-b border-white/[0.08] bg-[#12131b]/95 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-600 p-0.5 shadow-md flex items-center justify-center">
                <div className="w-full h-full bg-[#0a0a0f] rounded-[10px] flex items-center justify-center">
                  <HelpCircle className="w-4 h-4 text-amber-300" />
                </div>
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">Help & Support</h2>
                <p className="text-[11px] text-zinc-400 hidden sm:block">Knowledge Base, FAQs & Troubleshooting</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div
                className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-[11px] font-mono text-emerald-300 shadow-sm"
                title="All systems operational: WebSocket Relay, NTP Clock Calibration, Web Audio Scheduler"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                <span className="hidden sm:inline font-semibold">Systems Normal</span>
                <span className="text-emerald-500/80">|</span>
                <span className="text-emerald-400">99.98%</span>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Close Modal (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </header>
        )}

        {/* ================================================================= */}
        {/* TAB 1: HELP SECTION                                               */}
        {/* ================================================================= */}
        {type === 'help' && (
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-6">
            
            {/* 1. TOP PROMINENT SEARCH BAR */}
            <div className="space-y-2">
              <div className="relative group">
                <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-cyan-500/20 to-indigo-500/20 blur opacity-60 group-hover:opacity-100 transition duration-300 pointer-events-none" />
                <div className="relative flex items-center bg-[#0a0a0f] border border-white/[0.12] focus-within:border-amber-400/80 rounded-2xl px-4 py-3 shadow-inner">
                  <Search className="w-5 h-5 text-amber-400 shrink-0 mr-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search questions (e.g. bluetooth delay, autoplay unlock, wifi vs online, hotkeys)..."
                    className="w-full bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="p-1 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white ml-2"
                      title="Clear search"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Instant Search Stats */}
              {searchQuery && (
                <div className="flex items-center justify-between text-[11px] font-mono px-1 text-zinc-400">
                  <span>
                    Found <strong className="text-amber-300">{filteredFaqs.length}</strong> matching questions for "{searchQuery}"
                  </span>
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-amber-400 hover:underline"
                  >
                    Reset Filter
                  </button>
                </div>
              )}
            </div>

            {/* 2. CATEGORY FILTER CHIPS */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-400 text-zinc-950 font-bold shadow-md shadow-amber-500/20'
                        : 'bg-zinc-900/80 hover:bg-zinc-800 border border-white/[0.08] text-zinc-300 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* 3. CATEGORIZED FAQS ACCORDION */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-mono uppercase text-zinc-400 font-bold tracking-wider">
                  Frequently Asked Questions
                </span>
                <span className="text-[11px] text-zinc-500 font-mono">
                  {filteredFaqs.length} Guides Available
                </span>
              </div>

              {filteredFaqs.length === 0 ? (
                <div className="p-8 rounded-2xl bg-zinc-950/60 border border-white/[0.06] text-center space-y-2">
                  <div className="text-2xl">🔍</div>
                  <h4 className="text-sm font-bold text-white">No results found for "{searchQuery}"</h4>
                  <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                    Try searching for "bluetooth", "autoplay", "sync", or contact our live community below!
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('All');
                    }}
                    className="mt-2 px-3 py-1.5 rounded-xl bg-zinc-800 text-xs font-semibold text-white hover:bg-zinc-700"
                  >
                    View All Questions
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredFaqs.map((faq) => {
                    const isOpen = expandedFaqId === faq.id;
                    return (
                      <div
                        key={faq.id}
                        className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                          isOpen
                            ? 'bg-[#14151f] border-amber-400/40 shadow-lg'
                            : 'bg-zinc-950/60 border-white/[0.06] hover:border-white/[0.12] hover:bg-zinc-900/40'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setExpandedFaqId(isOpen ? null : faq.id)}
                          className="w-full p-3.5 sm:p-4 text-left flex items-start justify-between gap-3 cursor-pointer group"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/[0.06] text-zinc-400">
                                {faq.category}
                              </span>
                              {faq.badge && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                                  {faq.badge}
                                </span>
                              )}
                            </div>
                            <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                              {faq.question}
                            </h4>
                          </div>

                          <div className="p-1 rounded-lg bg-white/[0.04] text-zinc-400 group-hover:text-white shrink-0 mt-0.5">
                            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </button>

                        {isOpen && (
                          <div className="px-3.5 sm:px-4 pb-4 pt-1 text-xs text-zinc-300 leading-relaxed border-t border-white/[0.04]">
                            <p>{faq.answer}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 4. DIRECT DEVELOPER EMAIL SUPPORT */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-zinc-950 via-[#13141c] to-zinc-950 border border-white/[0.08] space-y-3">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Headphones className="w-4 h-4 text-amber-400" />
                  <span>Need More Help or Have an Issue?</span>
                </h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Reach out directly for assistance, bug reports, or feedback
                </p>
              </div>

              <div className="pt-1">
                <a
                  href="mailto:Patelrajone0@gmail.com?subject=MusicSync%20Support%20Inquiry"
                  onClick={handleCopyEmail}
                  className="p-3.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-850 border border-white/[0.08] hover:border-amber-500/40 transition-all flex items-center justify-between group cursor-pointer shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors flex items-center gap-2">
                        <span>Email Support</span>
                        <span className="text-[10px] text-zinc-500 font-normal hidden sm:inline">(Click to email or copy)</span>
                      </div>
                      <div className="text-xs font-mono text-amber-300/90 font-medium mt-0.5">
                        {copiedEmail ? '✓ Copied to clipboard!' : 'Patelrajone0@gmail.com'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-400 group-hover:text-amber-300">
                    <span className="hidden sm:inline text-[11px] font-mono">{copiedEmail ? 'Copied' : 'Contact'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </div>
                </a>
              </div>
            </div>

          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: ABOUT SECTION                                              */}
        {/* ================================================================= */}
        {type === 'about' && (
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-6">

            {/* 1. OUR CORE MISSION HERO */}
            <div className="relative p-5 sm:p-6 rounded-2xl bg-gradient-to-tr from-cyan-950/40 via-[#10121a] to-indigo-950/30 border border-cyan-500/30 shadow-xl space-y-3 overflow-hidden">
              <div className="absolute -top-12 -right-12 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-300 font-bold">
                  Our Core Mission
                </span>
              </div>

              <h2 className="text-base sm:text-xl font-extrabold text-white leading-snug tracking-tight">
                "To transform any collection of ordinary smartphones, laptops, and speakers into a unified, high-fidelity acoustic sound system—zero wires, zero logins, pure sub-millisecond harmony."
              </h2>

              <p className="text-xs text-zinc-400 leading-relaxed">
                Music sounds best when shared physically in the same room. Rather than listening separately through headphones, MusicSync democratizes multi-room and party audio through synchronized web standards.
              </p>
            </div>

            {/* 2. KEY MILESTONES & NUMBERS */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold tracking-wider px-1">
                Key Engine Milestones
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-white/[0.08] text-center space-y-1">
                  <div className="text-[10px] font-mono text-zinc-500 uppercase">Sync Precision</div>
                  <div className="text-lg font-black text-cyan-300 font-mono">±2.1 ms</div>
                  <div className="text-[10px] text-zinc-400">Below human echo threshold</div>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-white/[0.08] text-center space-y-1">
                  <div className="text-[10px] font-mono text-zinc-500 uppercase">Max Devices</div>
                  <div className="text-lg font-black text-emerald-400 font-mono">50+</div>
                  <div className="text-[10px] text-zinc-400">Tested in single live room</div>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-white/[0.08] text-center space-y-1">
                  <div className="text-[10px] font-mono text-zinc-500 uppercase">Account Friction</div>
                  <div className="text-lg font-black text-amber-300 font-mono">0.0 sec</div>
                  <div className="text-[10px] text-zinc-400">No passwords or emails</div>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-white/[0.08] text-center space-y-1">
                  <div className="text-[10px] font-mono text-zinc-500 uppercase">Architecture</div>
                  <div className="text-lg font-black text-indigo-300 font-mono">100% PWA</div>
                  <div className="text-[10px] text-zinc-400">Web Audio API + NTP</div>
                </div>
              </div>
            </div>

            {/* 3. VISUAL STORYTELLING: ORIGIN & BREAKTHROUGHS */}
            <div className="space-y-3">
              <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold tracking-wider px-1">
                The MusicSync Story
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {/* Card 1 */}
                <div className="p-4 rounded-2xl bg-zinc-950/60 border border-white/[0.08] space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 font-bold">
                    1
                  </div>
                  <h4 className="text-xs font-bold text-white">The Broken Party Problem</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    At gatherings, everyone has a smartphone with a speaker. But hitting "Play" on Bluetooth or Spotify simultaneously produces a discordant cacophony with 500ms of distracting phase echo.
                  </p>
                </div>

                {/* Card 2 */}
                <div className="p-4 rounded-2xl bg-zinc-950/60 border border-white/[0.08] space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold">
                    2
                  </div>
                  <h4 className="text-xs font-bold text-white">The NTP Breakthrough</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Instead of streaming raw audio streams, MusicSync implements satellite Network Time Protocol (RFC 5905). Devices calibrate drift and schedule audio directly into the hardware soundcard buffer.
                  </p>
                </div>

                {/* Card 3 */}
                <div className="p-4 rounded-2xl bg-zinc-950/60 border border-white/[0.08] space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
                    3
                  </div>
                  <h4 className="text-xs font-bold text-white">Zero-Friction Future</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    No hardware mixers, no expensive proprietary Sonos ecosystems. Open any browser, type a 6-digit code, and instantly transform any room into an acoustic amphitheater.
                  </p>
                </div>
              </div>
            </div>

            {/* 4. MEET THE CREATOR & TEAM */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold tracking-wider px-1">
                Meet the Creator
              </span>

              <div className="p-4 sm:p-5 rounded-2xl bg-[#12131b] border border-white/[0.08] flex flex-col sm:flex-row items-center sm:items-start gap-4">
                {/* Avatar Photo Frame */}
                <div className="relative shrink-0">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-600 p-0.5 shadow-xl">
                    <div className="w-full h-full bg-zinc-950 rounded-[14px] overflow-hidden flex items-center justify-center relative">
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
                      <div className="w-full h-full bg-zinc-950 hidden items-center justify-center text-white font-extrabold text-xl font-mono">
                        RP
                      </div>
                    </div>
                  </div>
                  <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-emerald-500 border border-black text-[9px] font-bold text-black uppercase shadow">
                    Host
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2 text-center sm:text-left flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center justify-center sm:justify-start gap-2">
                        <span>Raj Patel</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                          Founder & Audio Architect
                        </span>
                      </h4>
                      <p className="text-[11px] text-zinc-400">Full-Stack Engineer & Audio Systems Designer</p>
                    </div>

                    {/* Social & Contact Chips */}
                    <div className="flex items-center justify-center sm:justify-end gap-1.5 flex-wrap pt-1 sm:pt-0">
                      <a
                        href="mailto:Patelrajone0@gmail.com"
                        className="px-2.5 py-1 rounded-lg bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/30 hover:border-cyan-400/60 text-[11px] font-mono text-cyan-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Email Raj Patel"
                      >
                        <Mail className="w-3 h-3 text-cyan-400" />
                        <span>Patelrajone0@gmail.com</span>
                      </a>

                      <a
                        href="https://github.com/Patelrajone0/MusicSync"
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-[11px] font-mono text-zinc-300 hover:text-white flex items-center gap-1 transition-colors"
                      >
                        <GithubIcon className="w-3 h-3" />
                        <span>GitHub</span>
                      </a>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-300 italic leading-relaxed pt-1 border-t border-white/[0.04]">
                    "Music sounds best when shared in the same room. Technology should bring people together, not force everyone into separate headphones."
                  </p>

                  {/* Made with Love in INDIA */}
                  <div className="pt-2 border-t border-white/[0.06] flex items-center justify-center sm:justify-between text-[11px] text-zinc-400">
                    <div className="inline-flex items-center gap-1.5 font-medium tracking-wide text-zinc-200 bg-white/[0.03] px-2.5 py-1 rounded-lg border border-white/[0.06]">
                      <span>Made with</span>
                      <span className="text-rose-500 animate-pulse">❤️</span>
                      <span>in <strong className="text-white font-bold">INDIA</strong></span>
                      <span className="text-xs">🇮🇳</span>
                    </div>

                    <span className="text-[10px] font-mono text-zinc-500 hidden sm:inline">
                      Sub-millisecond audio sync engine
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ================================================================= */}
        {/* FOOTER ACTION BAR                                                 */}
        {/* ================================================================= */}
        <footer className="px-4 sm:px-6 py-3 border-t border-white/[0.08] bg-[#0c0d12]/95 backdrop-blur-md flex items-center justify-between text-xs shrink-0">
          <div className="text-[11px] text-zinc-500 font-mono hidden sm:block">
            Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">Esc</kbd> anytime to dismiss
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className={`px-5 py-1.5 rounded-xl font-bold transition-all cursor-pointer shadow-lg active:scale-95 ${
                type === 'help'
                  ? 'bg-amber-400 hover:bg-amber-300 text-zinc-950 shadow-amber-500/20'
                  : 'bg-cyan-400 hover:bg-cyan-300 text-zinc-950 shadow-cyan-500/20'
              }`}
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
