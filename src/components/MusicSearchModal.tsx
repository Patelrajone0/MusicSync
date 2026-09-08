import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Plus,
  Play,
  Pause,
  X,
  Music,
  Link,
  Check,
  Disc,
  Flame,
  Radio,
  Sparkles,
  ExternalLink,
  Loader2,
  Compass,
  Zap,
  RotateCcw,
  Heart,
  History,
  Clock,
  Trash2
} from 'lucide-react';
import { Track } from '../types';
import { searchTracks, getSearchSuggestions, createCustomTrack } from '../services/musicApi';
import { userTasteEngine, TasteSummary, HistoryItem } from '../services/userTaste';
import { socket } from '../services/socket';
import { syncEngine } from '../services/syncEngine';

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 45) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

interface MusicSearchModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  inline?: boolean;
}

export const MusicSearchModal: React.FC<MusicSearchModalProps> = ({
  isOpen = false,
  onClose = () => {},
  inline = false,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [addedTrackIds, setAddedTrackIds] = useState<Set<string>>(new Set());

  // Local track preview audio element (inaudible to room)
  const [previewTrackId, setPreviewTrackId] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Selected filter (For You, Trending, All, English, Hindi, Punjabi, Gujarati)
  const [selectedLanguage, setSelectedLanguage] = useState<
    'for_you' | 'trending' | 'all' | 'english' | 'hindi' | 'gujarati' | 'punjabi'
  >('all');
  const [serverMessage, setServerMessage] = useState<string | null>(null);

  // User Taste Profile
  const [tasteSummary, setTasteSummary] = useState<TasteSummary>(() => userTasteEngine.getTasteSummary());

  // Suggestions drawer & Live Autocomplete
  const [suggestionTab, setSuggestionTab] = useState<'artists' | 'moods'>('artists');
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<string[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const searchInputContainerRef = useRef<HTMLDivElement | null>(null);
  const autocompleteRef = useRef<HTMLDivElement | null>(null);
  const resultsContainerRef = useRef<HTMLDivElement | null>(null);

  // Tabs: search, history, custom
  const [activeTab, setActiveTab] = useState<'search' | 'history' | 'custom'>('search');
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>(() => userTasteEngine.getHistory());
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customArtist, setCustomArtist] = useState('');

  // Subscribe to taste and history updates
  useEffect(() => {
    const unsub = userTasteEngine.subscribe(() => {
      setHistoryItems(userTasteEngine.getHistory());
      setTasteSummary(userTasteEngine.getTasteSummary());
    });
    return unsub;
  }, []);

  // Initial load when modal opens, inline mounts, or filter changes
  useEffect(() => {
    if (isOpen || inline) {
      setTasteSummary(userTasteEngine.getTasteSummary());
      setHistoryItems(userTasteEngine.getHistory());
      loadDefaultResults(selectedLanguage);
    } else {
      stopPreview();
      setShowAutocomplete(false);
    }
  }, [isOpen, inline, selectedLanguage]);

  // Escape key closes search modal
  useEffect(() => {
    if (!isOpen || inline) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        stopPreview();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, inline, onClose]);

  // Live autocomplete debounced fetch
  useEffect(() => {
    if (!query.trim()) {
      setAutocompleteSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      const suggestions = await getSearchSuggestions(query, selectedLanguage === 'for_you' || selectedLanguage === 'trending' ? 'all' : selectedLanguage);
      setAutocompleteSuggestions(suggestions);
    }, 150);
    return () => clearTimeout(timer);
  }, [query, selectedLanguage]);

  // Close autocomplete on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchInputContainerRef.current &&
        !searchInputContainerRef.current.contains(e.target as Node)
      ) {
        setShowAutocomplete(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadDefaultResults = async (lang: string = selectedLanguage) => {
    setIsLoading(true);
    setCurrentOffset(0);
    setHasMore(true);
    try {
      const tasteQuery = lang === 'for_you' ? userTasteEngine.getPersonalizedQuery() : '';
      const res = await searchTracks('', lang, 0, tasteQuery);
      setResults(res.tracks);
      setServerMessage(res.message || null);
      setCurrentOffset(res.offset || 30);
      setHasMore(res.hasMore !== false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (
    e?: React.FormEvent,
    overrideQuery?: string,
    overrideLang?: string,
    newOffset: number = 0
  ) => {
    if (e) e.preventDefault();
    const q = overrideQuery !== undefined ? overrideQuery : query;
    const l = overrideLang !== undefined ? overrideLang : selectedLanguage;
    setShowAutocomplete(false);
    setIsLoading(true);
    setCurrentOffset(0);
    setHasMore(true);
    stopPreview();

    try {
      const tasteQuery = l === 'for_you' ? userTasteEngine.getPersonalizedQuery() : '';
      const res = await searchTracks(q, l, newOffset, tasteQuery);
      setResults(res.tracks);
      setServerMessage(res.message || null);
      setCurrentOffset(res.offset || 30);
      setHasMore(res.hasMore !== false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore || isLoading) return;
    setIsLoadingMore(true);
    try {
      const tasteQuery = selectedLanguage === 'for_you' ? userTasteEngine.getPersonalizedQuery() : '';
      const res = await searchTracks(query, selectedLanguage, currentOffset, tasteQuery);
      if (res.tracks.length > 0) {
        setResults((prev) => {
          const existingIds = new Set(prev.map((t) => t.id));
          const newUnique = res.tracks.filter((t) => !existingIds.has(t.id));
          return [...prev, ...newUnique];
        });
        setCurrentOffset(res.offset || currentOffset + 30);
        setHasMore(res.hasMore !== false && res.tracks.length > 0);
      } else {
        setHasMore(false);
      }
    } catch (e) {
      console.error('Failed to load more tracks:', e);
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 150) {
      handleLoadMore();
    }
  };

  const handleLanguageChange = (
    lang: 'for_you' | 'trending' | 'all' | 'english' | 'hindi' | 'gujarati' | 'punjabi'
  ) => {
    setSelectedLanguage(lang);
    handleSearch(undefined, query, lang, 0);
  };

  const handleAddTrack = (track: Track) => {
    syncEngine.unlockAudio().catch(() => {});
    socket.emit('queue_add', { track });
    // Save to user taste profile!
    userTasteEngine.recordInteraction(track, 'queued');
    setTasteSummary(userTasteEngine.getTasteSummary());

    setAddedTrackIds((prev) => new Set(prev).add(track.id));
    setTimeout(() => {
      setAddedTrackIds((prev) => {
        const next = new Set(prev);
        next.delete(track.id);
        return next;
      });
    }, 2000);
  };

  const handleAddCustomTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) return;
    syncEngine.unlockAudio().catch(() => {});
    const track = createCustomTrack(customUrl, customTitle, customArtist);
    socket.emit('queue_add', { track });
    userTasteEngine.recordInteraction(track, 'queued');
    setCustomUrl('');
    setCustomTitle('');
    setCustomArtist('');
    onClose();
  };

  const handleClearAllHistory = () => {
    if (window.confirm('Are you sure you want to clear your playback history?')) {
      userTasteEngine.clearHistory();
      setHistoryItems([]);
      stopPreview();
    }
  };

  const handleRemoveHistoryItem = (id: string) => {
    userTasteEngine.removeHistoryItem(id);
    setHistoryItems(userTasteEngine.getHistory());
  };

  const togglePreview = (track: Track) => {
    if (previewTrackId === track.id) {
      stopPreview();
    } else {
      stopPreview();
      const audio = new Audio(track.audioUrl);
      audio.volume = 0.5;
      audio.play().catch(() => {});
      audio.onended = () => setPreviewTrackId(null);
      previewAudioRef.current = audio;
      setPreviewTrackId(track.id);
    }
  };

  const stopPreview = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.src = '';
      previewAudioRef.current = null;
    }
    setPreviewTrackId(null);
  };

  const languageOptions = [
    { id: 'all', label: 'All' },
    { id: 'trending', label: 'Trending' },
    { id: 'for_you', label: 'For You' },
    { id: 'english', label: 'English' },
    { id: 'hindi', label: 'Hindi' },
    { id: 'punjabi', label: 'Punjabi' },
    { id: 'gujarati', label: 'Gujarati' },
  ] as const;

  const limitlessArtists: Record<string, string[]> = {
    for_you: tasteSummary.topArtists.length > 0 ? tasteSummary.topArtists : ['Diljit Dosanjh', 'Arijit Singh', 'Karan Aujla', 'Aditya Gadhvi', 'Coldplay'],
    trending: ['Tauba Tauba', 'Sari Duniya Jala Denge', 'Khalasi', 'Starboy', 'Lover', 'Kesariya', 'Blinding Lights', 'Chogada Tara'],
    all: [
      'Diljit Dosanjh', 'Arijit Singh', 'Coldplay', 'Aditya Gadhvi', 'The Weeknd', 'Sidhu Moose Wala',
      'Shreya Ghoshal', 'AP Dhillon', 'Dua Lipa', 'Kinjal Dave', 'Pritam', 'Karan Aujla',
      'Ed Sheeran', 'Kirtidan Gadhvi', 'Atif Aslam', 'Shubh', 'Taylor Swift', 'Geeta Rabari', 'Badshah', 'Drake'
    ],
    hindi: [
      'Arijit Singh', 'Atif Aslam', 'Shreya Ghoshal', 'Pritam', 'Neha Kakkar', 'Jubin Nautiyal',
      'Sonu Nigam', 'KK', 'Mohit Chauhan', 'Kishore Kumar', 'Lata Mangeshkar', 'Kumar Sanu',
      'Badshah', 'Armaan Malik', 'Darshan Raval', 'Anuv Jain', 'Prateek Kuhad', 'Seedhe Maut', 'King', 'Divine'
    ],
    punjabi: [
      'Diljit Dosanjh', 'Sidhu Moose Wala', 'Karan Aujla', 'AP Dhillon', 'Shubh', 'Amrit Maan',
      'B Praak', 'Guru Randhawa', 'Amrinder Gill', 'Parmish Verma', 'Jass Manak', 'Honey Singh',
      'Ammy Virk', 'Bohemia', 'Tarsem Jassar', 'Mankirt Aulakh', 'Garry Sandhu', 'Kulwinder Billa'
    ],
    gujarati: [
      'Aditya Gadhvi', 'Khalasi', 'Kinjal Dave', 'Kirtidan Gadhvi', 'Geeta Rabari', 'Osman Mir',
      'Jignesh Kaviraj', 'Atul Purohit', 'Falguni Pathak', 'Chogada', 'Sanedo', 'Dholida',
      'Garba Nonstop', 'Titoda', 'Dayro', 'Vijay Suvada', 'Vikram Thakor', 'Hemant Chauhan'
    ],
    english: [
      'The Weeknd', 'Coldplay', 'Dua Lipa', 'Ed Sheeran', 'Taylor Swift', 'Drake',
      'Post Malone', 'Bruno Mars', 'Billie Eilish', 'Imagine Dragons', 'Synthwave', 'Deep House',
      'EDM Festival', 'Cyberpunk', '80s Retro', 'Chillhop', 'Eminem', 'Maroon 5', 'Adele', 'Queen'
    ],
  };

  const limitlessMoods: Record<string, { label: string; q: string }[]> = {
    for_you: [
      { label: 'My Mix', q: userTasteEngine.getPersonalizedQuery() || 'trending' },
      { label: 'Energy Boost', q: 'high bass party' },
      { label: 'Late Night Chill', q: 'lofi chill' }
    ],
    trending: [
      { label: 'Top Chartbusters', q: 'trending chartbusters 2024' },
      { label: 'Viral Bass Drops', q: 'viral high bass songs' },
      { label: 'Club Anthems', q: 'trending party club' }
    ],
    all: [
      { label: 'Party Dance', q: 'party dance high bass' },
      { label: 'Midnight Lofi', q: 'lofi chill midnight' },
      { label: 'Romantic Ballads', q: 'romantic love songs' },
      { label: 'Car Bass Drive', q: 'car bass songs' },
      { label: 'Garba & Dandiya', q: 'gujarati garba non stop' },
      { label: 'Bhangra Energy', q: 'punjabi bhangra dhol' },
      { label: 'Gym Workout EDM', q: 'gym edm workout' },
      { label: 'Acoustic Chill', q: 'acoustic guitar unplugged' },
      { label: '90s Melodies', q: '90s classic melodies' }
    ],
    hindi: [
      { label: 'Bollywood Romance', q: 'arijit singh romantic hits' },
      { label: 'Bollywood Lofi', q: 'bollywood lofi chill' },
      { label: 'Party Dance Anthems', q: 'bollywood party dance' },
      { label: '90s Golden Era', q: '90s bollywood melodies' },
      { label: 'Desi Hip-Hop', q: 'desi hip hop divine seedhe maut' },
      { label: 'Emotional & Sad', q: 'sad hindi songs arijit' },
      { label: 'Acoustic Unplugged', q: 'hindi acoustic cover' }
    ],
    punjabi: [
      { label: 'Bhangra Dhol Beats', q: 'punjabi bhangra dhol' },
      { label: 'Car Bass & 808s', q: 'punjabi car bass 808' },
      { label: 'Sidhu Moosetape', q: 'sidhu moose wala moosetape' },
      { label: 'Club Soundclash', q: 'punjabi club party mix' },
      { label: 'Romantic Punjabi', q: 'punjabi romantic love' },
      { label: 'UK Punjabi Bass', q: 'uk punjabi bass' }
    ],
    gujarati: [
      { label: 'Non-Stop Garba Raas', q: 'gujarati garba non stop' },
      { label: 'Coke Studio Folk', q: 'khalasi aditya gadhvi' },
      { label: 'Dandiya Dholida', q: 'dholida garba high bass' },
      { label: 'Titoda & Sanedo', q: 'sanedo titoda non stop' },
      { label: 'Dayro & Lokgeet', q: 'gujarati dayro lokgeet' },
      { label: 'Kinjal & Geeta Hits', q: 'kinjal dave geeta rabari' }
    ],
    english: [
      { label: 'Synthwave & Cyberpunk', q: 'synthwave 80s cyberpunk' },
      { label: 'Midnight Lofi Beats', q: 'chillhop lofi english beats' },
      { label: 'Global Pop Hits', q: 'top billboard pop 2024' },
      { label: 'Deep House Club', q: 'deep house club mix' },
      { label: 'Festival EDM Anthem', q: 'edm festival anthem' },
      { label: '80s Retro Rock', q: 'retro classic rock 80s' }
    ]
  };

  const currentArtists = limitlessArtists[selectedLanguage] || limitlessArtists.all;
  const currentMoods = limitlessMoods[selectedLanguage] || limitlessMoods.all;

  if (!inline && !isOpen) return null;

  const content = (
    <div
      id="universal-music-library"
      onClick={(e) => e.stopPropagation()}
      className={`bg-dark-900 border border-white/10 rounded-2xl flex flex-col shadow-xl overflow-hidden ${
        inline
          ? 'w-full bg-dark-900/60 backdrop-blur-xl'
          : 'max-w-2xl w-full max-h-[88vh] animate-modal-spring'
      }`}
    >
      {/* Header */}
      <div className="p-4 md:p-5 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-electric-cyan/10 text-electric-cyan">
            <Music className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-white">Universal Music Library</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-electric-cyan/10 text-electric-cyan border border-electric-cyan/30 font-mono font-bold uppercase tracking-wider">
                Limitless Catalog
              </span>
              {tasteSummary.totalInteractions > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30 font-mono font-semibold hidden sm:inline-flex items-center gap-1">
                  <Heart className="w-2.5 h-2.5 fill-current text-purple-400" />
                  Taste AI Calibrated
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Trending chartbusters & personalized suggestions in <strong className="text-white">English, Hindi, Gujarati & Punjabi</strong>
            </p>
          </div>
        </div>
        {!inline && (
          <button
            onClick={() => {
              stopPreview();
              onClose();
            }}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-dark-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

        {/* Filter Pills Bar (Explore Section - Clean & Simple) */}
        <div className="bg-dark-950 px-4 py-2.5 border-b border-white/5 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider shrink-0 mr-1">Explore:</span>
          {languageOptions.map((opt) => {
            const isSelected = selectedLanguage === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => handleLanguageChange(opt.id)}
                className={`px-3.5 py-1 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all ${
                  isSelected
                    ? 'bg-cyan-400 text-black font-semibold shadow-sm border border-cyan-400'
                    : 'bg-dark-850 hover:bg-dark-800 text-slate-300 hover:text-white border border-white/5'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Tab Toggle */}
        <div className="flex border-b border-white/5 px-4 pt-2 gap-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('search')}
            className={`pb-2.5 px-3.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === 'search'
                ? 'border-electric-cyan text-electric-cyan'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search & Suggestions</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-2.5 px-3.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-electric-cyan text-electric-cyan'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Listening History</span>
            {historyItems.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-electric-cyan/20 text-electric-cyan font-mono font-bold">
                {historyItems.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`pb-2.5 px-3.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === 'custom'
                ? 'border-electric-purple text-electric-purple'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Link className="w-3.5 h-3.5" />
            <span>Paste Stream URL</span>
          </button>
        </div>

        {/* Tab 1: Search & Limitless Suggestions Catalog */}
        {activeTab === 'search' && (
          <div className="p-3 sm:p-4 flex-1 flex flex-col min-h-0">
            {/* Search Input with Live Autocomplete */}
            <div ref={searchInputContainerRef} className="relative mb-3">
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-3 sm:left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onFocus={() => setShowAutocomplete(true)}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setShowAutocomplete(true);
                  }}
                  placeholder={
                    selectedLanguage === 'for_you'
                      ? 'Search recommendations...'
                      : selectedLanguage === 'trending'
                      ? 'Search trending songs...'
                      : selectedLanguage === 'hindi'
                      ? 'Search Hindi songs...'
                      : selectedLanguage === 'gujarati'
                      ? 'Search Gujarati songs...'
                      : selectedLanguage === 'punjabi'
                      ? 'Search Punjabi songs...'
                      : 'Search English, Hindi, Gujarati & Punjabi...'
                  }
                  className="w-full bg-dark-950 border border-white/10 rounded-xl pl-9 sm:pl-10 pr-20 sm:pr-24 py-2.5 text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-electric-cyan transition-colors"
                  autoFocus={!inline}
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      loadDefaultResults(selectedLanguage);
                    }}
                    className="absolute right-16 sm:right-20 top-2.5 text-slate-400 hover:text-white p-1"
                  >
                    <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                )}
                <button
                  type="submit"
                  className="absolute right-1.5 sm:right-2 top-1.5 px-2.5 sm:px-3 py-1.5 bg-electric-cyan text-black font-semibold text-xs rounded-lg hover:bg-white transition-colors"
                >
                  Search
                </button>
              </form>

              {/* Floating Autocomplete Dropdown */}
              {showAutocomplete && autocompleteSuggestions.length > 0 && (
                <div
                  ref={autocompleteRef}
                  className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-dark-950/95 backdrop-blur-xl border border-white/15 rounded-xl shadow-2xl overflow-hidden divide-y divide-white/5 animate-popover-spring"
                >
                  <div className="px-3 py-1.5 text-[10px] font-mono text-slate-400 bg-dark-900/60 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-electric-cyan" /> Suggested Matches
                  </div>
                  {autocompleteSuggestions.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setQuery(item);
                        handleSearch(undefined, item, selectedLanguage, 0);
                        setShowAutocomplete(false);
                      }}
                      className="w-full text-left px-3.5 py-2.5 text-xs text-slate-200 hover:text-white hover:bg-white/10 flex items-center justify-between transition-colors group"
                    >
                      <span className="flex items-center gap-2">
                        <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-electric-cyan" />
                        <span className="font-medium">{item}</span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono group-hover:text-slate-300">Tap to search</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Personalized "For You" Banner */}
            {selectedLanguage === 'for_you' && (
              <div className="p-2.5 sm:p-3 bg-purple-950/40 border border-purple-500/30 rounded-xl mb-3 flex items-center justify-between text-xs text-purple-200 shadow-inner">
                <div className="flex items-center gap-2 min-w-0">
                  <Sparkles className="w-4 h-4 text-purple-400 shrink-0 animate-pulse" />
                  <span className="truncate text-[11px] sm:text-xs">
                    {tasteSummary.topArtists.length > 0 ? (
                      <>
                        Curated for you based on: <strong className="text-white">{tasteSummary.topArtists.slice(0, 3).join(', ')}</strong>
                      </>
                    ) : (
                      <>Queue songs in rooms to train your personalized listening engine!</>
                    )}
                  </span>
                </div>
                {tasteSummary.totalInteractions > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      userTasteEngine.clearTasteProfile();
                      setTasteSummary(userTasteEngine.getTasteSummary());
                      loadDefaultResults('for_you');
                    }}
                    className="text-[10px] text-slate-400 hover:text-red-400 underline ml-2 shrink-0 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset Taste
                  </button>
                )}
              </div>
            )}

            {/* Limitless Categorized Suggestions Ribbon */}
            <div className="mb-3 space-y-1.5">
              {/* Category Toggle Tabs */}
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSuggestionTab('artists')}
                    className={`flex items-center gap-1 font-semibold transition-colors ${
                      suggestionTab === 'artists' ? 'text-electric-cyan font-bold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    <span>Artists ({currentArtists.length})</span>
                  </button>
                  <span className="text-slate-600">•</span>
                  <button
                    type="button"
                    onClick={() => setSuggestionTab('moods')}
                    className={`flex items-center gap-1 font-semibold transition-colors ${
                      suggestionTab === 'moods' ? 'text-electric-cyan font-bold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Compass className="w-3.5 h-3.5 text-purple-400" />
                    <span>Vibes ({currentMoods.length})</span>
                  </button>
                </div>
                <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
                  {results.length > 0 ? `${results.length} songs loaded` : 'Infinite feed'}
                </span>
              </div>

              {/* Scrollable Suggestion Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 no-scrollbar scroll-smooth">
                {suggestionTab === 'artists'
                  ? currentArtists.map((artist) => (
                      <button
                        key={artist}
                        type="button"
                        onClick={() => {
                          setQuery(artist);
                          handleSearch(undefined, artist, selectedLanguage, 0);
                        }}
                        className={`px-3 py-1 bg-dark-850 hover:bg-dark-800 border rounded-lg text-xs whitespace-nowrap shrink-0 transition-all shadow-sm ${
                          query.toLowerCase() === artist.toLowerCase()
                            ? 'border-electric-cyan text-electric-cyan bg-electric-cyan/10 font-semibold'
                            : 'border-white/5 hover:border-white/20 text-slate-300 hover:text-white'
                        }`}
                      >
                        {artist}
                      </button>
                    ))
                  : currentMoods.map((mood) => (
                      <button
                        key={mood.label}
                        type="button"
                        onClick={() => {
                          setQuery(mood.q);
                          handleSearch(undefined, mood.q, selectedLanguage, 0);
                        }}
                        className="px-3 py-1 bg-dark-850 hover:bg-dark-800 border border-white/5 hover:border-white/20 rounded-lg text-slate-300 hover:text-white text-xs whitespace-nowrap shrink-0 transition-all shadow-sm flex items-center gap-1"
                      >
                        {mood.label}
                      </button>
                    ))}
              </div>
            </div>

            {/* Results List with Endless Infinite Scroll */}
            <div
              ref={resultsContainerRef}
              onScroll={handleScroll}
              className={`overflow-y-auto space-y-1.5 sm:space-y-2 pr-1 relative ${
                inline ? 'max-h-[460px] sm:max-h-[520px] min-h-[300px]' : 'flex-1 min-h-0'
              }`}
            >
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-sm gap-2">
                  <div className="w-6 h-6 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin"></div>
                  <span>Searching music databases for full tracks...</span>
                </div>
              ) : results.length === 0 ? (
                <div className="text-center py-10 sm:py-12 px-4 sm:px-6">
                  <div className="inline-flex items-center justify-center p-3 rounded-full bg-electric-cyan/10 text-electric-cyan mb-3">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-semibold text-white mb-1.5">
                    {serverMessage || 'No tracks found matching your query'}
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    MusicSync curates full songs in <span className="text-electric-cyan font-medium">English, Hindi, Gujarati & Punjabi</span>.
                  </p>
                </div>
              ) : (
                <>
                  {results.map((track) => {
                    const isAdded = addedTrackIds.has(track.id);
                    const isPreviewing = previewTrackId === track.id;

                    return (
                      <div
                        key={track.id}
                        className={`flex items-center justify-between p-2 sm:p-2.5 rounded-xl border transition-colors group ${
                          track.isTrending
                            ? 'bg-gradient-to-r from-amber-950/20 via-dark-950 to-dark-950 border-amber-500/20 hover:border-amber-500/40'
                            : track.isRecommended
                            ? 'bg-gradient-to-r from-purple-950/20 via-dark-950 to-dark-950 border-purple-500/20 hover:border-purple-500/40'
                            : 'bg-dark-950 border-white/5 hover:border-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                          {/* Artwork with Preview Play Button */}
                          <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-lg overflow-hidden bg-dark-800 shrink-0">
                            <img
                              src={track.artwork || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100'}
                              alt={track.title}
                              className="w-full h-full object-cover"
                            />
                            <button
                              onClick={() => togglePreview(track)}
                              title={isPreviewing ? 'Stop Preview' : 'Audition Preview'}
                              className={`absolute inset-0 flex items-center justify-center bg-black/50 transition-opacity ${
                                isPreviewing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                              }`}
                            >
                              {isPreviewing ? (
                                <Pause className="w-5 h-5 text-electric-cyan fill-current" />
                              ) : (
                                <Play className="w-5 h-5 text-white fill-current ml-0.5" />
                              )}
                            </button>
                          </div>

                          {/* Title & Artist */}
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs sm:text-sm font-semibold text-white truncate flex items-center gap-1.5">
                              {track.title}
                            </h4>
                            <p className="text-[11px] sm:text-xs text-slate-400 truncate">{track.artist}</p>
                            <div className="flex items-center gap-1 sm:gap-1.5 mt-1 flex-wrap">
                              {track.isTrending && (
                                <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full font-mono bg-amber-500/15 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-0.5 shadow-sm">
                                  <Flame className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400 fill-current animate-pulse" />
                                  <span>{track.trendingRank ? `#${track.trendingRank}` : 'Trending'}</span>
                                </span>
                              )}
                              {track.isRecommended && (
                                <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full font-mono bg-purple-500/15 text-purple-300 border border-purple-500/40 font-semibold flex items-center gap-0.5">
                                  <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-purple-400" />
                                  <span>For You</span>
                                </span>
                              )}
                              <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full font-mono bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                <span>{Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}</span>
                              </span>
                              {track.languageBadge && (
                                <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full font-mono bg-dark-800 text-slate-200 border border-white/10">
                                  {track.languageBadge}
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400 font-mono hidden sm:inline-block">
                                {track.source}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Add Button */}
                        <button
                          onClick={() => handleAddTrack(track)}
                          className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 shrink-0 ml-1.5 ${
                            isAdded
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : 'bg-electric-cyan text-black hover:bg-white shadow-md'
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Added!</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>Queue</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}


                  {/* Endless Scroll Bottom State & Load More Button */}
                  <div className="pt-2 pb-4 text-center">
                    {isLoadingMore ? (
                      <div className="flex items-center justify-center gap-2 py-3 text-xs text-electric-cyan">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Streaming next batch from limitless catalog...</span>
                      </div>
                    ) : hasMore ? (
                      <button
                        type="button"
                        onClick={handleLoadMore}
                        className="w-full py-2 px-4 rounded-xl bg-dark-850 hover:bg-dark-800 border border-white/10 hover:border-electric-cyan/40 text-xs font-semibold text-slate-300 hover:text-white flex items-center justify-center gap-2 transition-all group"
                      >
                        <Zap className="w-3.5 h-3.5 text-electric-cyan group-hover:scale-110 transition-transform" />
                        <span>Load 30+ More Suggestions (Limitless)</span>
                      </button>
                    ) : (
                      <div className="text-[11px] text-slate-500 py-2">
                        ✓ All available suggestions for this query have been loaded.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Listening History */}
        {activeTab === 'history' && (
          <div className="p-4 flex-1 flex flex-col min-h-0">
            {/* Top Controls: Search filter & Clear History */}
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  placeholder="Filter history by song, artist, or language..."
                  className="w-full bg-dark-950 border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-electric-cyan transition-colors"
                />
                {historySearchQuery && (
                  <button
                    onClick={() => setHistorySearchQuery('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {historyItems.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllHistory}
                  className="px-3 py-2 bg-dark-950 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 text-xs text-slate-400 hover:text-red-400 rounded-xl transition-all flex items-center gap-1.5 shrink-0"
                  title="Clear all playback history"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Clear</span>
                </button>
              )}
            </div>

            {/* History List */}
            <div
              className={`overflow-y-auto space-y-2 pr-1 relative ${
                inline ? 'max-h-[500px] min-h-[260px]' : 'flex-1 min-h-0'
              }`}
            >
              {historyItems.length === 0 ? (
                <div className="text-center py-16 px-6">
                  <div className="inline-flex items-center justify-center p-3 rounded-full bg-electric-cyan/10 text-electric-cyan mb-3">
                    <Music className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-semibold text-white mb-1">No Listening History Yet</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Songs played or added to the queue in your listening sessions will automatically be recorded here so you can easily queue them again.
                  </p>
                </div>
              ) : (
                (() => {
                  const filtered = historyItems.filter((item) => {
                    if (!historySearchQuery.trim()) return true;
                    const q = historySearchQuery.toLowerCase();
                    return (
                      item.track.title.toLowerCase().includes(q) ||
                      item.track.artist.toLowerCase().includes(q) ||
                      (item.track.language && item.track.language.toLowerCase().includes(q))
                    );
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-12 text-slate-500 text-xs">
                        No songs in history matching "{historySearchQuery}".
                      </div>
                    );
                  }

                  return filtered.map((item) => {
                    const { track } = item;
                    const isAdded = addedTrackIds.has(track.id);
                    const isPreviewing = previewTrackId === track.id;

                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-dark-950 border border-white/5 hover:border-white/10 transition-colors group"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {/* Artwork with Preview Button */}
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-dark-800 shrink-0 shadow-sm">
                            <img
                              src={track.artwork || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100'}
                              alt={track.title}
                              className="w-full h-full object-cover"
                            />
                            <button
                              onClick={() => togglePreview(track)}
                              title={isPreviewing ? 'Stop Preview' : 'Audition Preview'}
                              className={`absolute inset-0 flex items-center justify-center bg-black/50 transition-opacity ${
                                isPreviewing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                              }`}
                            >
                              {isPreviewing ? (
                                <Pause className="w-5 h-5 text-electric-cyan fill-current" />
                              ) : (
                                <Play className="w-5 h-5 text-white fill-current ml-0.5" />
                              )}
                            </button>
                          </div>

                          {/* Title, Artist, badges */}
                          <div className="min-w-0">
                            <h4 className="text-sm font-semibold text-white truncate">{track.title}</h4>
                            <p className="text-xs text-slate-400 truncate">{track.artist}</p>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-dark-800 text-slate-300 border border-white/5 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                {formatTimeAgo(item.playedAt)}
                              </span>

                              {item.playCount > 1 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-electric-cyan/10 text-electric-cyan border border-electric-cyan/20 font-semibold">
                                  Played {item.playCount}x
                                </span>
                              )}

                              {track.languageBadge && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-dark-800 text-slate-300 border border-white/5">
                                  {track.languageBadge}
                                </span>
                              )}

                              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 font-semibold">
                                {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <button
                            onClick={() => handleAddTrack(track)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                              isAdded
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                : 'bg-electric-cyan text-black hover:bg-white shadow-md'
                            }`}
                            title="Add back to room queue"
                          >
                            {isAdded ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Queued!</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" />
                                <span>Queue Again</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleRemoveHistoryItem(item.id)}
                            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            title="Remove from history"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  });
                })()
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Custom Audio URL Stream */}
        {activeTab === 'custom' && (
          <div className="p-6">
            <form onSubmit={handleAddCustomTrack} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Direct Audio Stream URL (MP3, AAC, OGG, WebM, M3U8):
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://example.com/audio/my-track.mp3"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  className="w-full bg-dark-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-electric-purple"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Track Title (Optional):</label>
                  <input
                    type="text"
                    placeholder="E.g. Bass Drop Live"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="w-full bg-dark-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-electric-purple"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Artist (Optional):</label>
                  <input
                    type="text"
                    placeholder="E.g. DJ Shadow"
                    value={customArtist}
                    onChange={(e) => setCustomArtist(e.target.value)}
                    className="w-full bg-dark-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-electric-purple"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-dark-950 border border-white/5 text-xs text-slate-400">
                <strong className="text-slate-300">Tip:</strong> You can paste any direct web audio stream or hosted sound file. When queued, all connected devices will synchronize playback to this URL simultaneously!
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-electric-purple to-electric-cyan text-black font-bold text-sm hover:brightness-110 transition-all shadow-lg active:scale-95"
              >
                Add Stream to Room Queue
              </button>
            </form>
          </div>
        )}
      </div>
  );

  if (inline) {
    return content;
  }

  return (
    <div
      onClick={() => {
        stopPreview();
        onClose();
      }}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
    >
      {content}
    </div>
  );
};
