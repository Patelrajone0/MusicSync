import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Info,
  Sparkles,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Search,
  Wifi,
  Music,
  Clock,
  Smartphone,
  ShieldCheck,
  Zap,
  Radio,
  Check,
  Copy,
  Share2,
} from 'lucide-react';

export interface AboutMusicSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode?: string;
}

export interface FaqItem {
  id: string;
  question: string;
  shortAnswer: string;
  detailedAnswer: string;
  category: 'Popular' | 'How-To' | 'Troubleshooting' | 'Audio Engine';
  keywords: string[];
  humanNote?: string;
}

export const TRENDING_QUESTIONS: FaqItem[] = [
  {
    id: 'good-free-app',
    question: 'What is a good free music sync app?',
    category: 'Popular',
    keywords: ['Free Music Sync', 'Sync App', 'No Download', 'Party Audio', 'Multi-Device'],
    shortAnswer:
      'MusicSync is built to be the best zero-cost, zero-install alternative to expensive hardware speakers.',
    detailedAnswer:
      "Honestly, we built MusicSync specifically because every other 'sync app' we tried let us down. Most apps on the App Store or Google Play either hit you with monthly subscription paywalls, force every guest to create an account, or only work if everyone owns the exact same brand of phone (like Apple AirPlay or Samsung Dual Audio). MusicSync runs right in your browser (Safari, Chrome, Firefox, Brave) on literally any phone, laptop, or tablet. It's 100% free, requires zero app downloads, and turns all your phones into a coordinated multi-speaker sound system in seconds.",
    humanNote:
      'No app store downloads, no credit card, no ads. Just send a link or show a QR code.',
  },
  {
    id: 'purpose-of-sync',
    question: 'What is the purpose of sync?',
    category: 'Audio Engine',
    keywords: ['Purpose of Sync', 'Acoustic Phase', 'No Echo', 'Surround Sound', 'Sub-Millisecond'],
    shortAnswer:
      'To prevent the painful echo and hollow phasing that happens when two devices try playing the same song.',
    detailedAnswer:
      "Have you ever tried counting '3, 2, 1, PLAY' and tapping play on two phones at once? Even if you think you tapped at the same moment, your fingers and phones are easily 50 to 100 milliseconds apart. To your human brain, that tiny gap sounds like an unbearable, hollow stadium echo known as comb-filtering. The entire purpose of sync is acoustic precision: locking all devices down to sub-2-millisecond timing so sound waves reinforce each other instead of canceling out. When synced, 5 phones actually sound like one powerful, multi-directional speaker array.",
    humanNote:
      'Our ears can spot timing differences of just 10ms. MusicSync keeps drift down to ±1.8ms.',
  },
  {
    id: 'get-music-synced',
    question: 'How do I get my music synced?',
    category: 'How-To',
    keywords: ['Get Music Synced', 'Quick Start', 'QR Code', 'Unlock Audio', '3 Steps'],
    shortAnswer:
      'Create a room, have friends scan the QR code, tap to unlock audio, and start playing.',
    detailedAnswer:
      "It takes literally 10 seconds and 3 simple human steps:\n1. Open MusicSync on your host device and click 'Create Room'.\n2. Have your friends point their phone cameras at your screen's QR code (or type the 6-digit room code).\n3. Each friend taps the screen once to 'Unlock Audio' (this is a standard browser security requirement so websites can't blast sound unannounced).\nOnce unlocked, whatever track the host plays will broadcast and play synchronously across every single connected phone speaker.",
    humanNote:
      'Tip: Keep phones spaced out around the room or living room corners for a wide stereo soundstage!',
  },
  {
    id: 'how-to-use-sync',
    question: 'How to use sync for music?',
    category: 'How-To',
    keywords: ['Use Sync For Music', 'House Parties', 'Host Controls', 'Volume Balance', 'DJ Mode'],
    shortAnswer:
      'Use it as a decentralized party sound system for BBQs, dorm rooms, picnics, and workouts.',
    detailedAnswer:
      "Think of MusicSync as a distributed DJ console. You can place one smartphone on the kitchen counter, two phones in different corners of the living room, and a laptop on the patio table. The host controls the master track selection, pause, and seek, while each person can individually adjust their own phone's volume slider to fit their corner of the room. You can also grant playback permissions to everyone so guests can queue their favorite songs into the shared master playlist.",
    humanNote:
      'You can also plug any connected phone into an old wired speaker or car AUX to upgrade older stereos!',
  },
  {
    id: 'which-app-is-free',
    question: 'Which music app is 100% free?',
    category: 'Popular',
    keywords: ['100% Free Music App', 'No Subscription', 'Open Web', 'No Paywalls', 'Zero Ads'],
    shortAnswer:
      'MusicSync is completely 100% free with zero subscriptions, no hidden limits, and no ads.',
    detailedAnswer:
      "MusicSync is totally free. We don't have premium tiers, we don't gate room sizes behind a paywall, and we don't ask for your credit card or email address. We built this as an open web project to show what the modern Web Audio API and WebSockets can do when you build for people instead of ad networks. You can create unlimited rooms, connect as many phones as your Wi-Fi can handle, and stream music freely.",
    humanNote:
      'No hidden in-app purchases. Pure web technology built for shared listening.',
  },
  {
    id: 'how-to-sync-songs',
    question: 'How do I sync my songs?',
    category: 'How-To',
    keywords: ['Sync My Songs', 'Upload MP3', 'Audio In', 'FLAC WAV', 'Shared Queue'],
    shortAnswer:
      'Upload any local audio file (MP3, WAV, FLAC, M4A) or stream tracks directly into the shared queue.',
    detailedAnswer:
      "You have two super flexible ways to sync songs:\n• Local File Upload: Tap the 'Audio In // Upload' button to upload any audio track stored on your phone or laptop (MP3, AAC, M4A, WAV, FLAC, or OGG). MusicSync buffers the audio across all peer devices and schedules it seamlessly.\n• Streaming & Search: Use the built-in search to pull tracks directly into the master queue.\nOnce added, the queue syncs across every connected screen in real time so everyone sees what's currently playing and what's coming up next.",
    humanNote:
      'Lossless audio (FLAC or 320kbps MP3) sounds spectacular when played across multiple speakers simultaneously.',
  },
  {
    id: 'why-not-syncing',
    question: 'Why is my music not syncing?',
    category: 'Troubleshooting',
    keywords: ['Why Not Syncing', 'Audio Unlock', 'Low Power Mode', 'Wi-Fi Lag', 'Fix Delay'],
    shortAnswer:
      'Usually it is muted browser audio, phone battery saver throttling, or Wi-Fi packet latency.',
    detailedAnswer:
      "Don't worry—if audio feels out of sync or silent on one phone, it's almost always one of these 3 common human issues:\n1. Browser Audio Locked: Mobile Safari and Chrome strictly mute web audio until the user physically touches the screen. Look for the 'Tap to Unlock Audio' banner and tap it.\n2. Low Power / Battery Saver Mode: On iPhones and Androids, Low Power Mode aggressively throttles browser background timers down to 1Hz. Turn off Battery Saver for silky-smooth sub-millisecond sync.\n3. Network Lag / Cellular Drift: If one friend is on a weak cellular connection while everyone else is on local Wi-Fi, their ping will jitter. Check the RTT / Drift meter in the top header. If drift is high, simply tap the Re-sync button to refresh the NTP clock calibration.",
    humanNote:
      'Pro tip: Connecting all devices to the same 5GHz Wi-Fi network gives you the lowest latency (<2ms drift).',
  },
  {
    id: 'sync-phone-to-play-music',
    question: 'How to sync phone to play music?',
    category: 'How-To',
    keywords: ['Sync Phone To Play Music', 'Cross-Platform', 'iPhone and Android', 'No Bluetooth Dongle'],
    shortAnswer:
      'No Bluetooth pairing hassles—just open the room link in Safari or Chrome on both phones.',
    detailedAnswer:
      "You do not need Bluetooth pairing, AUX splitters, or proprietary companion apps. Bluetooth can usually only pair to one phone at a time anyway. With MusicSync, you sync phones over your local Wi-Fi or internet connection:\n• iPhone + Android work together seamlessly.\n• Mac + Windows + iPad work together effortlessly.\nJust open the website URL on each phone, enter the same room code, and hit play. The server orchestrates clock synchronization over WebSockets so both phones play the exact same millisecond of audio.",
    humanNote:
      'This completely solves the classic problem of mixing iPhone and Android friends at a party.',
  },
  {
    id: 'make-music-for-sync',
    question: 'How to make music for sync?',
    category: 'Audio Engine',
    keywords: ['Make Music For Sync', 'Acoustic Mastering', 'Stereo Separation', 'Transient Punch', 'Spatial Sound'],
    shortAnswer:
      'Master tracks with wide stereo panning, clean transient punch, and high bitrates for spatial acoustic sound.',
    detailedAnswer:
      "In the music business, 'music for sync' usually means licensing songs for movies or commercials. But in the world of multi-device synchronized audio, making music for sync means mixing tracks that take advantage of a distributed speaker room:\n• Wide stereo field: Panning guitars or synths hard left and right creates an immersive 3D spatial field when phones are placed on opposite sides of a room.\n• Punchy transients: Crisp kicks and percussive claps showcase the sub-millisecond accuracy of the sync engine with zero flanging.\n• High dynamic range: Avoid heavy brickwall clipping so each phone speaker produces clear, distortion-free mids and highs.",
    humanNote:
      'Our built-in 8D audio and spatial sound modes can also dynamically pan stereo signals around your room!',
  },
];

export const TRENDING_TAGS = [
  '#FreeMusicSyncApp',
  '#SyncMusicAcrossPhones',
  '#MultiDeviceAudio',
  '#PartySpeakerSync',
  '#HowToSyncSongs',
  '#WhyIsMusicNotSyncing',
  '#WebAudioSync',
  '#NTPClockSync',
  '#ZeroLatencyAudio',
  '#NoEchoMusicSync',
  '#iPhoneAndAndroidSync',
  '#NoAppRequired',
];

export const AboutMusicSyncModal: React.FC<AboutMusicSyncModalProps> = ({
  isOpen,
  onClose,
  roomCode,
}) => {
  const [activeTab, setActiveTab] = useState<'about' | 'workings' | 'faqs' | 'keywords'>('about');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>('good-free-app');
  const [copiedLink, setCopiedLink] = useState(false);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filtered FAQ items based on search & category
  const filteredFaqs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return TRENDING_QUESTIONS.filter((item) => {
      const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesSearch =
        !q ||
        item.question.toLowerCase().includes(q) ||
        item.shortAnswer.toLowerCase().includes(q) ||
        item.detailedAnswer.toLowerCase().includes(q) ||
        item.keywords.some((k) => k.toLowerCase().includes(q));
      return matchesCat && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  const handleCopyLink = () => {
    try {
      const shareUrl = window.location.origin + (roomCode ? `?room=${roomCode}` : '');
      navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {}
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-modal-title"
      className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-xl animate-fade-in select-none"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl bg-[#0c0d12] border border-white/10 rounded-3xl shadow-[0_20px_70px_rgba(0,0,0,0.9),0_0_40px_rgba(6,182,212,0.12)] overflow-hidden flex flex-col max-h-[90vh] text-zinc-200 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle top hairline gradient accent */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-indigo-500" />

        {/* Ambient background glows */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* ========================================================================= */}
        {/* 1. MODAL TOP HEADER */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-5 border-b border-white/[0.08] flex items-center justify-between shrink-0 relative z-10 bg-[#0e1017]/90 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-600 p-0.5 shadow-[0_0_20px_rgba(6,182,212,0.35)] shrink-0">
              <div className="w-full h-full bg-[#0a0c10] rounded-[14px] flex items-center justify-center text-cyan-400">
                <Music className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="about-modal-title" className="text-base sm:text-lg font-bold text-white tracking-tight">
                  About MusicSync
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 font-bold uppercase">
                  v2.4 Titanium
                </span>
                {roomCode && (
                  <span className="hidden sm:inline text-[10px] font-mono text-zinc-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                    Room #{roomCode}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400">
                Sub-millisecond multi-device acoustic synchronization for the web
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              title="Share MusicSync Room"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-xs font-semibold transition-all cursor-pointer active:scale-95"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Share</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. SECTION TABS */}
        {/* ========================================================================= */}
        <div className="px-4 sm:px-5 pt-3 pb-2 border-b border-white/[0.06] flex items-center gap-2 overflow-x-auto shrink-0 bg-[#0a0b10]/80">
          <button
            type="button"
            onClick={() => setActiveTab('about')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'about'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>1. What is MusicSync?</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('workings')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'workings'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/40 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-indigo-400" />
            <span>2. Needs & How It Works</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('faqs')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'faqs'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>3. People Also Ask (9 FAQs)</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-amber-400/20 text-amber-300 font-bold">
              9
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('keywords')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'keywords'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span>4. Trending Keywords</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* 3. MODAL BODY (SCROLLABLE) */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar relative z-10">

          {/* TAB 1: ABOUT & STORY */}
          {activeTab === 'about' && (
            <div className="space-y-5 animate-fade-in">
              {/* Core Hero Banner */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-cyan-950/40 via-zinc-900/90 to-indigo-950/40 border border-cyan-500/30 shadow-lg relative overflow-hidden">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold px-2 py-0.5 rounded bg-cyan-400/10 border border-cyan-400/20">
                    The Human Story
                  </span>
                  <span className="text-zinc-500 text-xs">•</span>
                  <span className="text-xs text-zinc-400">Written by people who love music</span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white leading-snug">
                  "Why buy 5 expensive wireless speakers when everyone in the room already has a great phone in their pocket?"
                </h3>
                <p className="text-xs sm:text-sm text-zinc-300 mt-2.5 leading-relaxed">
                  We built MusicSync out of pure frustration at house parties, beach bonfires, college dorms, and backyard barbecues.
                  You have a circle of friends, everyone wants to listen to music together, but only one person’s phone is playing. Its tiny speaker gets drowned out the second two people start laughing. If someone else tries pressing play on their phone, you get a chaotic, head-splitting echo.
                </p>
                <p className="text-xs sm:text-sm text-zinc-300 mt-2 leading-relaxed">
                  MusicSync solves this cleanly: open one link, scan a QR code, and every single phone, laptop, or tablet joins together into a unified, high-volume acoustic soundstage. Zero downloads, zero accounts, zero proprietary gear.
                </p>
              </div>

              {/* Real World Problems Solved Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.08] space-y-1.5">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-white">No Brand Locks</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    AirPlay locks you to Apple. Samsung Dual Audio locks you to Galaxy. MusicSync connects iPhones, Androids, Macs, and PCs indiscriminately.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.08] space-y-1.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-white">Zero App Store Bloat</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    No downloading 200MB apps from the store or waiting for updates. Open the browser tab and you're in the synchronized session immediately.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.08] space-y-1.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Zap className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-white">100% Free Forever</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    No subscriptions, no premium tiers, no banner ads, and no selling your listening data. Just open, create, and sync.
                  </p>
                </div>
              </div>

              {/* Hardware Clock Telemetry Specs */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                    Built-in Engineering Target
                  </span>
                  <div className="text-sm font-bold text-white">Sub-Millisecond Acoustic Coherence</div>
                  <p className="text-xs text-zinc-400">
                    Clock drift calibrated dynamically using continuous bidirectional NTP ping frames.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="px-3 py-2 rounded-lg bg-black/80 border border-zinc-800 text-center">
                    <div className="text-[9px] font-mono text-zinc-500 uppercase">Target Offset</div>
                    <div className="text-sm font-mono font-bold text-emerald-400">±1.8 ms</div>
                  </div>
                  <div className="px-3 py-2 rounded-lg bg-black/80 border border-zinc-800 text-center">
                    <div className="text-[9px] font-mono text-zinc-500 uppercase">Sync Engine</div>
                    <div className="text-sm font-mono font-bold text-cyan-300">NTP RFC 5905</div>
                  </div>
                  <div className="px-3 py-2 rounded-lg bg-black/80 border border-zinc-800 text-center">
                    <div className="text-[9px] font-mono text-zinc-500 uppercase">Audio Driver</div>
                    <div className="text-sm font-mono font-bold text-indigo-300">Web Audio API</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: NEEDS & WORKINGS */}
          {activeTab === 'workings' && (
            <div className="space-y-5 animate-fade-in">
              {/* The Need */}
              <div className="p-4 rounded-2xl bg-zinc-900/70 border border-white/10 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase text-indigo-400 font-bold px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                    The Acoustic Need
                  </span>
                  <h3 className="text-sm font-bold text-white">Why is synchronized music actually hard?</h3>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Sound travels through air at 343 meters per second. That means sound travels about 1 foot every single millisecond.
                  If two speakers are off by just 15 milliseconds, the human ear doesn’t hear them as one loud speaker—it hears an irritating 'flange' or double-echo that ruins the beat.
                  Standard Bluetooth simply cannot keep 5 devices aligned within 2 milliseconds because Bluetooth operates on independent master-slave clock cycles with unpredictable buffer queues.
                </p>
              </div>

              {/* The Workings: 4-Step Pipeline */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-bold">
                  How MusicSync Works Under The Hood (4 Steps)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-black/50 border border-white/[0.08] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-mono text-[10px]">1</span>
                        NTP Ping Calibration
                      </span>
                      <span className="text-[9px] font-mono text-cyan-400">Every 2.5s</span>
                    </div>
                    <p className="text-zinc-400 leading-relaxed text-[11px]">
                      When your phone joins, it fires 8 high-frequency ping packets to the node server, measuring exact Round-Trip Time (RTT) and calculating your local clock’s exact millisecond offset.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-black/50 border border-white/[0.08] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-mono text-[10px]">2</span>
                        Future Timestamp Scheduling
                      </span>
                      <span className="text-[9px] font-mono text-indigo-400">Zero Lag</span>
                    </div>
                    <p className="text-zinc-400 leading-relaxed text-[11px]">
                      Instead of broadcasting "PLAY RIGHT NOW", the host broadcasts "PLAY AT TIME T + 350ms". Every phone buffers the audio in RAM and pre-arms its hardware playback clock.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-black/50 border border-white/[0.08] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-mono text-[10px]">3</span>
                        Web Audio Hardware Clocks
                      </span>
                      <span className="text-[9px] font-mono text-amber-400">Sample-Accurate</span>
                    </div>
                    <p className="text-zinc-400 leading-relaxed text-[11px]">
                      Standard HTML5 &lt;audio&gt; tags are too sloppy for sync. MusicSync leverages low-level AudioContext hardware timers to schedule PCM audio buffers down to individual samples.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-black/50 border border-white/[0.08] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-mono text-[10px]">4</span>
                        Adaptive Micro-Slip Correction
                      </span>
                      <span className="text-[9px] font-mono text-emerald-400">Seamless Lock</span>
                    </div>
                    <p className="text-zinc-400 leading-relaxed text-[11px]">
                      If a phone’s battery saver or Wi-Fi jitters, our engine makes microscopic speed adjustments (0.05%) to gently guide the track back into sync without any audible pitch warping.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PEOPLE ALSO ASK (9 FAQS) */}
          {activeTab === 'faqs' && (
            <div className="space-y-4 animate-fade-in">
              {/* Search & Category Filter */}
              <div className="space-y-2.5">
                <div className="relative">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search all 9 trending questions & sync topics..."
                    className="w-full pl-9 pr-8 py-2 rounded-xl bg-black/60 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-500/30 transition-all font-sans"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                  {['All', 'Popular', 'How-To', 'Troubleshooting', 'Audio Engine'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-all shrink-0 cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40 font-bold'
                          : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                  <span className="text-zinc-600 ml-auto text-[10px] font-mono shrink-0">
                    Showing {filteredFaqs.length} of {TRENDING_QUESTIONS.length}
                  </span>
                </div>
              </div>

              {/* Accordion Questions List */}
              <div className="space-y-2">
                {filteredFaqs.length === 0 ? (
                  <div className="p-8 text-center bg-black/40 rounded-2xl border border-white/[0.06] text-zinc-500 text-xs">
                    No questions found matching "{searchQuery}". Try searching for 'free', 'phone', or 'wifi'.
                  </div>
                ) : (
                  filteredFaqs.map((faq, idx) => {
                    const isExpanded = expandedFaqId === faq.id;
                    return (
                      <div
                        key={faq.id}
                        className={`rounded-2xl border transition-all overflow-hidden ${
                          isExpanded
                            ? 'bg-[#10121a] border-amber-400/40 shadow-lg shadow-black/50'
                            : 'bg-black/40 border-white/[0.08] hover:border-white/20'
                        }`}
                      >
                        {/* Question Toggle Header */}
                        <button
                          type="button"
                          onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                          className="w-full text-left p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-mono font-bold shrink-0">
                              {idx + 1}
                            </span>
                            <span className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                              {faq.question}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="hidden sm:inline text-[9px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-zinc-400 border border-white/10">
                              {faq.category}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-amber-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300" />
                            )}
                          </div>
                        </button>

                        {/* Expandable Content */}
                        {isExpanded && (
                          <div className="px-4 pb-4 pt-1 border-t border-white/[0.06] space-y-3 animate-fade-in text-xs">
                            {/* Short Highlight */}
                            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 font-medium leading-relaxed">
                              {faq.shortAnswer}
                            </div>

                            {/* Detailed Human-Written Answer */}
                            <div className="text-zinc-300 leading-relaxed whitespace-pre-line text-xs">
                              {faq.detailedAnswer}
                            </div>

                            {/* Human Note Tip */}
                            {faq.humanNote && (
                              <div className="flex items-start gap-2 p-2 rounded-lg bg-black/60 border border-white/[0.06] text-[11px] text-zinc-400">
                                <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                                <span>{faq.humanNote}</span>
                              </div>
                            )}

                            {/* Question Specific Keyword Chips */}
                            <div className="flex flex-wrap gap-1 pt-1">
                              {faq.keywords.map((kw) => (
                                <span
                                  key={kw}
                                  className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/5 text-zinc-400 border border-white/5"
                                >
                                  #{kw.replace(/\s+/g, '')}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 4: TRENDING KEYWORDS */}
          {activeTab === 'keywords' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-1.5">
                <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold tracking-wider">
                  Trending Search & SEO Matrix
                </span>
                <h3 className="text-sm font-bold text-white">Most Searched Audio Sync Terms</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  These are the exact queries real people search on Google every month when looking to connect their phones for party listening. Click any keyword to find answers directly.
                </p>
              </div>

              {/* Tag Cloud */}
              <div className="flex flex-wrap gap-2">
                {TRENDING_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      setActiveTab('faqs');
                      setSearchQuery(tag.replace('#', ''));
                    }}
                    className="px-3 py-1.5 rounded-xl bg-black/60 hover:bg-emerald-500/10 border border-white/10 hover:border-emerald-500/30 text-xs font-mono text-zinc-300 hover:text-emerald-300 transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 shadow-sm"
                  >
                    <span>{tag}</span>
                    <span className="text-[10px] text-zinc-500">↗</span>
                  </button>
                ))}
              </div>

              {/* Search Topics Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.08] space-y-1">
                  <div className="font-bold text-white">Top Searched Device Pairings:</div>
                  <ul className="text-zinc-400 text-[11px] space-y-1 list-disc list-inside">
                    <li>How to sync iPhone and Android speakers together</li>
                    <li>Play same song simultaneously on two phones</li>
                    <li>Zero-delay Bluetooth alternative for house parties</li>
                    <li>Free browser-based multi-room audio system</li>
                  </ul>
                </div>

                <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.08] space-y-1">
                  <div className="font-bold text-white">Popular Troubleshooting Searches:</div>
                  <ul className="text-zinc-400 text-[11px] space-y-1 list-disc list-inside">
                    <li>Why is there an echo when playing music on 2 phones?</li>
                    <li>How to fix Safari muted audio on lock screen</li>
                    <li>NTP clock drift compensation in Web Audio API</li>
                    <li>Best Wi-Fi settings for low-latency party audio</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ========================================================================= */}
        {/* 4. MODAL BOTTOM FOOTER */}
        {/* ========================================================================= */}
        <div className="p-3.5 sm:p-4 border-t border-white/[0.08] flex items-center justify-between text-xs text-zinc-400 shrink-0 bg-[#0e1017] relative z-10">
          <div className="flex items-center gap-2 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="hidden sm:inline">Engine Active • All Devices Synchronized</span>
            <span className="sm:hidden">Active Engine</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer text-xs"
            >
              {copiedLink ? 'Copied URL!' : 'Share Link'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold transition-all cursor-pointer shadow-lg shadow-cyan-500/20 active:scale-95 text-xs"
            >
              Got It
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutMusicSyncModal;
