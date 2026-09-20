import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Plus,
  Play,
  Pause,
  X,
  Music,
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
  Trash2,
  Star,
  HardDrive,
  FileAudio,
  Upload,
  ChevronDown
} from 'lucide-react';
import { Track } from '../types';
import { searchTracks, getSearchSuggestions, cleanTrackTitle, isJunkOrSpamTrack } from '../services/musicApi';
import { userTasteEngine, TasteSummary, HistoryItem } from '../services/userTaste';
import { socket } from '../services/socket';
import { syncEngine } from '../services/syncEngine';
import { useFavorites } from '../services/favoritesService';
import { localMusicService, LocalUploadProgress } from '../services/localMusicService';

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

function formatTrackDuration(sec: number): string {
  if (!sec || isNaN(sec) || sec <= 0) return '0:00';
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = Math.floor(sec % 60);
  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// SessionStorage key for tracking recently seen track IDs across refreshes
const SEEN_TRACKS_KEY = 'musicsync_recent_seen_ids';

function getRecentlySeenTrackIds(): string[] {
  try {
    const raw = sessionStorage.getItem(SEEN_TRACKS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.slice(-50);
    }
  } catch (e) {}
  return [];
}

function recordRecentlySeenTrackIds(ids: string[]) {
  try {
    const current = getRecentlySeenTrackIds();
    const combined = [...current];
    for (const id of ids) {
      if (id && !combined.includes(id)) {
        combined.push(id);
      }
    }
    const trimmed = combined.slice(-50);
    sessionStorage.setItem(SEEN_TRACKS_KEY, JSON.stringify(trimmed));
  } catch (e) {}
}

interface MusicSearchModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  inline?: boolean;
  demoMode?: 'option1' | 'option2' | 'option3';
  queue?: Track[];
  currentTrack?: Track | null;
}

export const MusicSearchModal: React.FC<MusicSearchModalProps> = ({
  isOpen = false,
  onClose = () => {},
  inline = false,
  demoMode = 'option1',
  queue,
  currentTrack,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [addedTrackIds, setAddedTrackIds] = useState<Set<string>>(new Set());

  // Internal queue and currentTrack fallback if not supplied via props
  const [internalQueue, setInternalQueue] = useState<Track[]>([]);
  const [internalCurrentTrack, setInternalCurrentTrack] = useState<Track | null>(null);

  useEffect(() => {
    const handleQueueUpdated = ({ queue: q }: { queue: Track[] }) => {
      setInternalQueue(q || []);
    };
    const handlePlaybackScheduled = (data: { track: Track }) => {
      if (data?.track) setInternalCurrentTrack(data.track);
    };
    socket.on('queue_updated', handleQueueUpdated);
    socket.on('playback_scheduled', handlePlaybackScheduled);
    return () => {
      socket.off('queue_updated', handleQueueUpdated);
      socket.off('playback_scheduled', handlePlaybackScheduled);
    };
  }, []);

  const activeQueue = queue !== undefined ? queue : internalQueue;
  const activeCurrentTrack = currentTrack !== undefined ? currentTrack : internalCurrentTrack;

  // Keep addedTrackIds synchronized with active queue & playback state
  useEffect(() => {
    setAddedTrackIds((prev) => {
      if (prev.size === 0) return prev;
      const next = new Set<string>();
      for (const id of prev) {
        const inQueue = activeQueue.some((q) => q.id === id || q.queueId === id);
        const isCurrent = activeCurrentTrack?.id === id || activeCurrentTrack?.queueId === id;
        if (inQueue || isCurrent) {
          next.add(id);
        }
      }
      return next;
    });
  }, [activeQueue, activeCurrentTrack]);

  // Helper to check if a track is in the player (currentTrack) or in the queue
  const isTrackInPlayer = (track: Track): boolean => {
    if (!track) return false;
    if (addedTrackIds.has(track.id)) return true;

    const tId = track.id;
    const tTitle = track.title ? track.title.trim().toLowerCase() : '';
    const tArtist = track.artist ? track.artist.trim().toLowerCase() : '';
    const tAudio = track.audioUrl || '';

    // 1. Check current active track
    if (activeCurrentTrack) {
      if (tId && (activeCurrentTrack.id === tId || activeCurrentTrack.queueId === tId)) return true;
      if (tAudio && activeCurrentTrack.audioUrl && activeCurrentTrack.audioUrl === tAudio) return true;
      if (
        tTitle &&
        tArtist &&
        activeCurrentTrack.title &&
        activeCurrentTrack.artist &&
        activeCurrentTrack.title.trim().toLowerCase() === tTitle &&
        activeCurrentTrack.artist.trim().toLowerCase() === tArtist
      ) {
        return true;
      }
    }

    // 2. Check active room queue
    if (activeQueue && activeQueue.length > 0) {
      return activeQueue.some((q) => {
        if (tId && (q.id === tId || q.queueId === tId)) return true;
        if (tAudio && q.audioUrl && q.audioUrl === tAudio) return true;
        if (
          tTitle &&
          tArtist &&
          q.title &&
          q.artist &&
          q.title.trim().toLowerCase() === tTitle &&
          q.artist.trim().toLowerCase() === tArtist
        ) {
          return true;
        }
        return false;
      });
    }

    return false;
  };

  const getListScrollClassName = (defaultMaxH = 'max-h-[460px] sm:max-h-[520px]') => {
    if (!inline) return 'overflow-y-auto flex-1 min-h-0';
    if (demoMode === 'option1') {
      // Option 1: Flows naturally on mobile without nested scroll trap, so full page scrolls smoothly!
      return 'sm:overflow-y-auto sm:max-h-[520px]';
    }
    if (demoMode === 'option3') {
      // Option 3: Inner scroll box with safe touch margins and overscroll containment
      return `overflow-y-auto ${defaultMaxH} overscroll-contain px-2 sm:px-1 border-x border-cyan-400/20`;
    }
    return `overflow-y-auto ${defaultMaxH} min-h-[260px]`;
  };

  // Dynamic seed generated on every page refresh / modal mount to ensure varied suggestions
  const [refreshSeed, setRefreshSeed] = useState<string>(() =>
    Date.now().toString(36) + Math.random().toString(36).substring(2, 6)
  );
  const [isRotating, setIsRotating] = useState(false);

  // Local track preview audio element (inaudible to room)
  const [previewTrackId, setPreviewTrackId] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Selected filter for normal original songs
  const [selectedLanguage, setSelectedLanguage] = useState<
    'for_you' | 'trending' | 'all' | 'english' | 'hindi' | 'gujarati' | 'punjabi'
  >('all');

  // Selected filter for mixed songs (remixes, mashups, non-stop sets)
  const [selectedMixedLanguage, setSelectedMixedLanguage] = useState<
    'all' | 'hindi' | 'punjabi' | 'gujarati' | 'english'
  >('all');

  const [serverMessage, setServerMessage] = useState<string | null>(null);

  // User Taste Profile
  const [tasteSummary, setTasteSummary] = useState<TasteSummary>(() => userTasteEngine.getTasteSummary());

  // Suggestions drawer & Live Autocomplete
  const [suggestionTab, setSuggestionTab] = useState<'artists' | 'moods'>('artists');
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<string[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement | null>(null);
  const searchInputContainerRef = useRef<HTMLDivElement | null>(null);
  const autocompleteRef = useRef<HTMLDivElement | null>(null);
  const resultsContainerRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const isLoadingMoreRef = useRef<boolean>(false);

  // Tabs: search (original songs), mixed (remixes/mashups/non-stop), history, local (device import)
  const [activeTab, setActiveTab] = useState<'search' | 'mixed' | 'history' | 'local'>('search');
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>(() => userTasteEngine.getHistory());
  const { isFavorite, toggleFavorite } = useFavorites();

  // Local music import state
  const [localTracks, setLocalTracks] = useState<Track[]>(() => localMusicService.getTracks());
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [uploadProgress, setUploadProgress] = useState<LocalUploadProgress>(() => localMusicService.getUploadState());
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Subscribe to taste, history, and local tracks updates
  useEffect(() => {
    const unsub = userTasteEngine.subscribe(() => {
      setHistoryItems(userTasteEngine.getHistory());
      setTasteSummary(userTasteEngine.getTasteSummary());
    });
    const unsubLocal = localMusicService.subscribe(() => {
      setLocalTracks(localMusicService.getTracks());
    });
    const unsubUpload = localMusicService.subscribeUpload((p) => {
      setUploadProgress(p);
    });
    return () => {
      unsub();
      unsubLocal();
      unsubUpload();
    };
  }, []);

  // Initial load when modal opens, inline mounts, or filter/tab changes
  useEffect(() => {
    if (isOpen || inline) {
      setTasteSummary(userTasteEngine.getTasteSummary());
      setHistoryItems(userTasteEngine.getHistory());
      if (activeTab === 'mixed') {
        loadDefaultResults(selectedMixedLanguage, 'mixed');
      } else if (activeTab === 'search') {
        loadDefaultResults(selectedLanguage, 'normal');
      }
    } else {
      stopPreview();
      setShowAutocomplete(false);
    }
  }, [isOpen, inline, selectedLanguage, selectedMixedLanguage, activeTab]);

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
    if (!query.trim() || activeTab === 'history' || activeTab === 'local') {
      setAutocompleteSuggestions([]);
      return;
    }
    const currentMode = activeTab === 'mixed' ? 'mixed' : 'normal';
    const currentLang = currentMode === 'mixed'
      ? selectedMixedLanguage
      : (selectedLanguage === 'for_you' || selectedLanguage === 'trending' ? 'all' : selectedLanguage);

    const timer = setTimeout(async () => {
      const suggestions = await getSearchSuggestions(query, currentLang, currentMode);
      setAutocompleteSuggestions(suggestions);
    }, 150);
    return () => clearTimeout(timer);
  }, [query, selectedLanguage, selectedMixedLanguage, activeTab]);

  // Close autocomplete and dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchInputContainerRef.current &&
        !searchInputContainerRef.current.contains(e.target as Node)
      ) {
        setShowAutocomplete(false);
      }
      if (
        langDropdownRef.current &&
        !langDropdownRef.current.contains(e.target as Node)
      ) {
        setIsLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Strict Deduplication Helper: Guarantees no track or duplicate song is ever repeated
  const deduplicateTrackList = (tracks: Track[]): Track[] => {
    const seenIds = new Set<string>();
    const seenKeys = new Set<string>();
    const seenSignatures = new Set<string>();
    const unique: Track[] = [];

    const getCoreSig = (title: string, artist: string = ''): string => {
      let clean = title.toLowerCase()
        .replace(/\{.*?\}/g, '')
        .replace(/\(.*?\)/g, '')
        .replace(/\[.*?\]/g, '')
        .replace(/[^a-z0-9]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      clean = clean.replace(/\b(ft|feat|featuring|remix|mix|mashup|edit|prod|new song|official|video|audio|punjabi|hindi|gujarati|english|songs?|latest|viral|chartbuster|reels?|full song|audio song|riskyjatt|com)\b/gi, ' ');

      if (artist) {
        const normArtist = artist.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
        if (normArtist.length >= 3) {
          clean = clean.replace(new RegExp(`\\b${normArtist}\\b`, 'gi'), ' ');
        }
      }

      const words = clean.split(' ').filter((w) => w.length >= 2);
      return words.slice(0, 2).join('');
    };

    for (const t of tracks) {
      if (!t || !t.id) continue;
      if (seenIds.has(t.id)) continue;

      // Strictly filter out low-quality rips, profane/abusive tracks, or spam uploads
      if (isJunkOrSpamTrack(t.title, t.artist)) continue;

      const cleanTitle = cleanTrackTitle(t.title, t.artist).trim();
      if (!cleanTitle || isJunkOrSpamTrack(cleanTitle, t.artist)) continue;

      const normTitle = cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normArtist = (t.artist || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const key = `${normTitle}|${normArtist}`;

      // Never repeat a song with the same normalized title and artist
      if (normTitle.length >= 3 && seenKeys.has(key)) continue;

      // Never repeat duplicate songs or variations in the same list
      const sig = getCoreSig(cleanTitle, t.artist);
      if (sig.length >= 3 && seenSignatures.has(sig)) continue;

      seenIds.add(t.id);
      if (normTitle.length >= 3) {
        seenKeys.add(key);
      }
      if (sig.length >= 3) {
        seenSignatures.add(sig);
      }

      unique.push({
        ...t,
        title: cleanTitle
      });
    }

    return unique;
  };

  const loadDefaultResults = async (
    lang?: string,
    modeOverride?: 'normal' | 'mixed',
    seedOverride?: string
  ) => {
    const currentMode = modeOverride || (activeTab === 'mixed' ? 'mixed' : 'normal');
    const currentLang = lang || (currentMode === 'mixed' ? selectedMixedLanguage : selectedLanguage);
    const activeSeed = seedOverride || refreshSeed;
    const seenIds = getRecentlySeenTrackIds();

    setIsLoading(true);
    setCurrentOffset(0);
    setHasMore(true);
    try {
      const tasteQuery = (currentMode === 'normal' && currentLang === 'for_you') ? userTasteEngine.getPersonalizedQuery() : '';
      const res = await searchTracks('', currentLang, 0, tasteQuery, currentMode, activeSeed, seenIds.join(','));
      setResults(deduplicateTrackList(res.tracks || []));
      setServerMessage(res.message || null);
      setCurrentOffset(res.offset || 30);
      setHasMore(res.hasMore !== false);

      if (res.tracks.length > 0) {
        recordRecentlySeenTrackIds(res.tracks.map((t) => t.id));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRotateSuggestions = () => {
    setIsRotating(true);
    const newSeed = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    setRefreshSeed(newSeed);
    if (activeTab === 'mixed') {
      loadDefaultResults(selectedMixedLanguage, 'mixed', newSeed);
    } else {
      loadDefaultResults(selectedLanguage, 'normal', newSeed);
    }
    setTimeout(() => setIsRotating(false), 500);
  };

  const handleSearch = async (
    e?: React.FormEvent,
    overrideQuery?: string,
    overrideLang?: string,
    newOffset: number = 0,
    overrideMode?: 'normal' | 'mixed'
  ) => {
    if (e) e.preventDefault();
    const currentMode = overrideMode !== undefined ? overrideMode : (activeTab === 'mixed' ? 'mixed' : 'normal');
    const q = overrideQuery !== undefined ? overrideQuery : query;
    const l = overrideLang !== undefined ? overrideLang : (currentMode === 'mixed' ? selectedMixedLanguage : selectedLanguage);
    setShowAutocomplete(false);
    setIsLoading(true);
    setCurrentOffset(0);
    setHasMore(true);
    stopPreview();

    try {
      const tasteQuery = (currentMode === 'normal' && l === 'for_you') ? userTasteEngine.getPersonalizedQuery() : '';
      const seenIds = !q ? getRecentlySeenTrackIds() : [];
      const res = await searchTracks(q, l, newOffset, tasteQuery, currentMode, refreshSeed, seenIds.join(','));
      setResults(deduplicateTrackList(res.tracks || []));
      setServerMessage(res.message || null);
      setCurrentOffset(res.offset || 30);
      setHasMore(res.hasMore !== false);
      if (!q && res.tracks.length > 0) {
        recordRecentlySeenTrackIds(res.tracks.map((t) => t.id));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (isLoadingMoreRef.current || isLoadingMore || !hasMore || isLoading) return;
    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);

    const currentMode = activeTab === 'mixed' ? 'mixed' : 'normal';
    const l = currentMode === 'mixed' ? selectedMixedLanguage : selectedLanguage;
    try {
      const tasteQuery = (currentMode === 'normal' && l === 'for_you') ? userTasteEngine.getPersonalizedQuery() : '';
      const seenIds = !query ? getRecentlySeenTrackIds() : [];
      const res = await searchTracks(query, l, currentOffset, tasteQuery, currentMode, refreshSeed, seenIds.join(','));
      if (res.tracks && res.tracks.length > 0) {
        setResults((prev) => deduplicateTrackList([...prev, ...res.tracks]));
        setCurrentOffset(res.offset || currentOffset + 30);
        // Suggestions (!query) stream infinitely across all modes (Normal & Mixed)
        setHasMore(!query ? true : (res.hasMore !== false && res.tracks.length > 0));
        if (!query) {
          recordRecentlySeenTrackIds(res.tracks.map((t) => t.id));
        }
      } else {
        if (!query) {
          // If a batch returned 0, advance offset to jump to next rotation batch instead of halting
          setCurrentOffset((prev) => prev + 30);
          setHasMore(true);
        } else {
          setHasMore(false);
        }
      }
    } catch (e) {
      console.error('Failed to load more tracks:', e);
      if (!query) {
        setCurrentOffset((prev) => prev + 30);
        setHasMore(true);
      } else {
        setHasMore(false);
      }
    } finally {
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  };

  // Pre-fetch next batch 400px before reaching bottom
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 400) {
      handleLoadMore();
    }
  };

  // Continuous IntersectionObserver to seamlessly stream more tracks
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !isLoadingMoreRef.current) {
          handleLoadMore();
        }
      },
      {
        root: resultsContainerRef.current,
        rootMargin: '450px',
        threshold: 0
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoading, currentOffset, activeTab, query, results.length]);

  const handleTabChange = (tab: 'search' | 'mixed' | 'history' | 'local') => {
    setActiveTab(tab);
    stopPreview();
    setQuery('');
    setShowAutocomplete(false);
  };

  const handleLanguageChange = (
    lang: 'for_you' | 'trending' | 'all' | 'english' | 'hindi' | 'gujarati' | 'punjabi'
  ) => {
    setSelectedLanguage(lang);
    if (!query) {
      loadDefaultResults(lang, 'normal');
    } else {
      handleSearch(undefined, query, lang, 0, 'normal');
    }
  };

  const handleMixedLanguageChange = (
    lang: 'all' | 'hindi' | 'punjabi' | 'gujarati' | 'english'
  ) => {
    setSelectedMixedLanguage(lang);
    if (!query) {
      loadDefaultResults(lang, 'mixed');
    } else {
      handleSearch(undefined, query, lang, 0, 'mixed');
    }
  };

  const handleAddTrack = (track: Track) => {
    socket.emit('queue_add', { track });
    // Save to user taste profile!
    userTasteEngine.recordInteraction(track, 'queued');
    setTasteSummary(userTasteEngine.getTasteSummary());

    setAddedTrackIds((prev) => new Set(prev).add(track.id));
  };

  const handleClearAllHistory = () => {
    if (window.confirm('Are you sure you want to clear your playback history?')) {
      userTasteEngine.clearHistory();
      setHistoryItems([]);
      stopPreview();
    }
  };

  const handlePlayNow = (track: Track) => {
    stopPreview();
    syncEngine.primePlayback(track, 0);
    socket.emit('request_play', { track, position: 0 });
    userTasteEngine.recordInteraction(track, 'queued');
    setTasteSummary(userTasteEngine.getTasteSummary());
  };

  const handleDeleteLocalTrack = async (trackId: string) => {
    if (previewTrackId === trackId) {
      stopPreview();
    }
    await localMusicService.deleteTrack(trackId);
  };

  const handleClearAllLocalTracks = async () => {
    if (window.confirm('Are you sure you want to delete all imported local songs?')) {
      stopPreview();
      await localMusicService.clearAllTracks();
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
    { id: 'all', label: 'All Original', icon: Disc, color: 'text-cyan-400' },
    { id: 'trending', label: 'Trending', icon: Flame, color: 'text-amber-400' },
    { id: 'for_you', label: 'For You', icon: Sparkles, color: 'text-purple-400' },
    { id: 'english', label: 'English', icon: Radio, color: 'text-sky-400' },
    { id: 'hindi', label: 'Hindi', icon: Music, color: 'text-emerald-400' },
    { id: 'punjabi', label: 'Punjabi', icon: Zap, color: 'text-rose-400' },
    { id: 'gujarati', label: 'Gujarati', icon: Disc, color: 'text-yellow-400' },
  ] as const;

  const mixedLanguageOptions = [
    { id: 'all', label: '🔥 All Mixed', icon: Flame, color: 'text-amber-400' },
    { id: 'hindi', label: '🇮🇳 Hindi Mixes', icon: Music, color: 'text-rose-400' },
    { id: 'punjabi', label: '🎶 Punjabi Mixes', icon: Zap, color: 'text-amber-400' },
    { id: 'gujarati', label: '🪘 Gujarati Non-Stop', icon: Disc, color: 'text-emerald-400' },
    { id: 'english', label: '🇬🇧 English Club & EDM', icon: Radio, color: 'text-cyan-400' },
  ] as const;

  const mixedPartyVibes: Record<string, { label: string; q: string }[]> = {
    all: [
      { label: '🎉 Non-Stop Party Sets', q: 'party non stop megamix' },
      { label: '🎛️ Mega Mashups', q: 'mega mashup non stop' },
      { label: '⏳ 1-Hour Continuous Sets', q: '1 hour continuous mix' },
      { label: '🕺 Club DJ Sets', q: 'club dj set extended mix' },
      { label: '🔊 High Bass Dance Remixes', q: 'bass boosted dance remix' },
      { label: '⚡ Festival Anthems', q: 'festival anthem club mix' }
    ],
    hindi: [
      { label: '💃 Bollywood Club Mashup', q: 'bollywood club party mashup' },
      { label: '❤️ Romantic Mashup', q: 'romantic mashup arijit atif' },
      { label: '📻 Retro 90s Dance Remix', q: '90s bollywood retro dance remix' },
      { label: '⏳ 1-Hour Hindi Party Set', q: 'bollywood non stop 1 hour' },
      { label: '🔥 High Bass Party Mix', q: 'hindi party songs non stop remix' }
    ],
    punjabi: [
      { label: '🥁 Bhangra Dhol Mix', q: 'punjabi bhangra dhol party mix' },
      { label: '🦁 Sidhu x Aujla Mashup', q: 'sidhu moose wala karan aujla mashup' },
      { label: '🏎️ Punjabi Bass Boosted', q: 'punjabi bass boosted car mix' },
      { label: '⏳ Non-Stop Bhangra Party', q: 'punjabi party mix non-stop' }
    ],
    gujarati: [
      { label: '🪘 1-Hour Non-Stop Garba', q: 'non stop garba 1 hour raas' },
      { label: '🔥 Navratri High Energy', q: 'navratri high energy garba mix' },
      { label: '⚡ Sanedo & Titoda Remix', q: 'sanedo titoda fast garba remix' },
      { label: '💃 Folk Fusion Dandiya', q: 'gujarati folk dandiya fusion mix' }
    ],
    english: [
      { label: '⚡ 1-Hour EDM Festival Set', q: 'edm festival 1 hour continuous mix' },
      { label: '🌃 Synthwave Night Drive', q: 'synthwave 80s continuous mix' },
      { label: '🍸 Deep House Club Session', q: 'deep house club session 1 hour' },
      { label: '🔥 Pop Hits Party Mashup', q: 'pop dance mashup party mix' }
    ]
  };

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
  const currentMixedVibes = mixedPartyVibes[selectedMixedLanguage] || mixedPartyVibes.all;

  if (!inline && !isOpen) return null;

  const content = (
    <div
      id="universal-music-library"
      onClick={(e) => e.stopPropagation()}
      className={`bg-dark-900 border border-white/10 rounded-2xl flex flex-col shadow-xl overflow-hidden scroll-mt-20 sm:scroll-mt-24 transition-all duration-500 ${
        inline
          ? 'w-full bg-dark-900/60 backdrop-blur-xl'
          : 'max-w-2xl w-full max-h-[88vh] animate-modal-spring'
      }`}
    >
      {/* 1. Header with Integrated Tab Dock (Option 2: YouTube Music Style) */}
      <div className="p-3 sm:p-4 border-b border-white/10 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5">
        {/* Left: Icon & Title */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full p-[1.5px] bg-gradient-to-tr from-cyan-400 via-sky-400 to-fuchsia-500 shadow-[0_0_10px_rgba(0,240,255,0.4)] shrink-0 flex items-center justify-center">
            <div className="w-full h-full rounded-full bg-dark-950 flex items-center justify-center text-cyan-400">
              <Music className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-sm sm:text-base font-bold text-white tracking-tight whitespace-nowrap">Universal Music Library</h3>
        </div>

        {/* Right: Integrated Segmented Tab Dock */}
        <div className="flex items-center gap-1 p-1 bg-dark-950/90 rounded-full border border-white/10 shadow-inner overflow-x-auto no-scrollbar">
          {/* Tab 1: Songs */}
          <button
            type="button"
            onClick={() => handleTabChange('search')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 active:scale-95 cursor-pointer ${
              activeTab === 'search'
                ? 'bg-gradient-to-r from-cyan-400 to-sky-400 text-black shadow-[0_0_10px_rgba(0,240,255,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Disc className={`w-3 h-3 ${activeTab === 'search' ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
            <span>Songs</span>
          </button>

          {/* Tab 2: Mixes */}
          <button
            type="button"
            onClick={() => handleTabChange('mixed')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 active:scale-95 cursor-pointer ${
              activeTab === 'mixed'
                ? 'bg-gradient-to-r from-amber-400 to-rose-400 text-black shadow-[0_0_10px_rgba(251,191,36,0.4)]'
                : 'text-amber-400/80 hover:text-amber-300 hover:bg-amber-400/10'
            }`}
          >
            <Flame className="w-3 h-3 fill-current" />
            <span>Mixes</span>
          </button>

          {/* Tab 3: History */}
          <button
            type="button"
            onClick={() => handleTabChange('history')}
            className={`px-2.5 sm:px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 active:scale-95 cursor-pointer ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-cyan-400 to-sky-400 text-black shadow-[0_0_10px_rgba(0,240,255,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <History className="w-3 h-3" />
            <span>History</span>
            {historyItems.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold ${
                activeTab === 'history' ? 'bg-black text-cyan-300' : 'bg-cyan-500/20 text-cyan-300'
              }`}>
                {historyItems.length}
              </span>
            )}
          </button>

          {/* Tab 4: Local */}
          <button
            type="button"
            onClick={() => handleTabChange('local')}
            className={`px-2.5 sm:px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 active:scale-95 cursor-pointer ${
              activeTab === 'local'
                ? 'bg-gradient-to-r from-cyan-400 to-sky-400 text-black shadow-[0_0_10px_rgba(0,240,255,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <HardDrive className="w-3 h-3" />
            <span>Local</span>
            {localTracks.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold ${
                activeTab === 'local' ? 'bg-black text-cyan-300' : 'bg-cyan-500/20 text-cyan-300'
              }`}>
                {localTracks.length}
              </span>
            )}
          </button>

          {!inline && (
            <button
              onClick={() => {
                stopPreview();
                onClose();
              }}
              className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Tab 1 & Tab 2: Catalog Search (Original Songs & Mixed Songs) */}
      {(activeTab === 'search' || activeTab === 'mixed') && (
        <div className="p-3 sm:p-4 flex-1 flex flex-col min-h-0">
          {/* Mixed Songs Mini Banner */}
          {activeTab === 'mixed' && (
            <div className="mb-2.5 p-2 sm:p-2.5 rounded-xl bg-gradient-to-r from-amber-950/40 via-rose-950/30 to-dark-950 border border-amber-500/30 flex items-center gap-2.5 text-xs shadow-md">
              <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 shrink-0">
                <Flame className="w-4 h-4 fill-current animate-pulse" />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-white text-xs">Mixed Songs & Non-Stop Sets</span>
                <span className="text-[10px] text-slate-300 ml-2 hidden sm:inline">Continuous DJ mixes, mashups & party sets</span>
              </div>
            </div>
          )}

          {/* 2. Modern Search Bar with Integrated Language Filter Selector */}
          <div ref={searchInputContainerRef} className="relative mb-2.5">
            <form onSubmit={handleSearch} className="relative flex items-center">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={query}
                onFocus={() => setShowAutocomplete(true)}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShowAutocomplete(true);
                }}
                placeholder={
                  activeTab === 'mixed'
                    ? 'Search party mixes, DJ sets, remixes...'
                    : 'Search songs, artists, or genres...'
                }
                className="w-full bg-dark-950/80 border border-white/10 rounded-full pl-10 pr-48 sm:pr-56 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_12px_rgba(0,240,255,0.25)] transition-all"
                autoFocus={!inline}
              />

              {/* Trailing Controls Container: Clear button, Language Dropdown & Search Button */}
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 sm:gap-2 z-10">
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      loadDefaultResults();
                    }}
                    className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Custom Integrated Theme Dropdown inside Search Bar */}
                <div ref={langDropdownRef} className="relative flex items-center shrink-0">
                  {activeTab === 'search' && (
                    <button
                      type="button"
                      onClick={() => setIsLangDropdownOpen((prev) => !prev)}
                      className={`h-7 px-2.5 rounded-full border text-[11px] font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer select-none active:scale-95 ${
                        isLangDropdownOpen
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                          : 'bg-dark-900/95 hover:bg-dark-850 text-cyan-300 border-cyan-400/30 hover:border-cyan-400'
                      }`}
                      title="Filter songs by language or category"
                    >
                      <span className="truncate max-w-[85px] sm:max-w-none">
                        {languageOptions.find((o) => o.id === selectedLanguage)?.label || 'All Original'}
                      </span>
                      <ChevronDown
                        className={`w-3 h-3 text-cyan-400 transition-transform duration-200 shrink-0 ${
                          isLangDropdownOpen ? 'rotate-180 text-cyan-300' : ''
                        }`}
                      />
                    </button>
                  )}

                  {activeTab === 'mixed' && (
                    <button
                      type="button"
                      onClick={() => setIsLangDropdownOpen((prev) => !prev)}
                      className={`h-7 px-2.5 rounded-full border text-[11px] font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer select-none active:scale-95 ${
                        isLangDropdownOpen
                          ? 'bg-amber-500/20 text-amber-300 border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.3)]'
                          : 'bg-dark-900/95 hover:bg-dark-850 text-amber-300 border-amber-500/30 hover:border-amber-400'
                      }`}
                      title="Filter mix vibes"
                    >
                      <span className="truncate max-w-[85px] sm:max-w-none">
                        {mixedLanguageOptions.find((o) => o.id === selectedMixedLanguage)?.label || 'All Mixed'}
                      </span>
                      <ChevronDown
                        className={`w-3 h-3 text-amber-400 transition-transform duration-200 shrink-0 ${
                          isLangDropdownOpen ? 'rotate-180 text-amber-300' : ''
                        }`}
                      />
                    </button>
                  )}

                  {/* Custom Styled Theme Popover Menu */}
                  {isLangDropdownOpen && (
                    <div
                      className={`absolute right-0 top-full mt-2 w-48 sm:w-52 z-50 bg-dark-950/95 backdrop-blur-2xl rounded-2xl border p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.95)] animate-popover-spring ${
                        activeTab === 'mixed'
                          ? 'border-amber-500/30 shadow-[0_16px_40px_rgba(0,0,0,0.95),0_0_20px_rgba(251,191,36,0.15)]'
                          : 'border-cyan-400/30 shadow-[0_16px_40px_rgba(0,0,0,0.95),0_0_20px_rgba(0,240,255,0.15)]'
                      }`}
                    >
                      <div className="px-2.5 py-1 text-[9px] font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between border-b border-white/5 mb-1">
                        <span>{activeTab === 'mixed' ? 'Select Mix Vibes' : 'Filter Songs'}</span>
                        <span className={`text-[8px] px-1 py-0.5 rounded font-mono ${
                          activeTab === 'mixed' ? 'bg-amber-500/10 text-amber-300' : 'bg-cyan-500/10 text-cyan-300'
                        }`}>Live Sync</span>
                      </div>
                      <div className="space-y-0.5">
                        {(activeTab === 'mixed' ? mixedLanguageOptions : languageOptions).map((opt) => {
                          const isSelected =
                            activeTab === 'mixed'
                              ? selectedMixedLanguage === opt.id
                              : selectedLanguage === opt.id;
                          const IconComp = opt.icon;

                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                if (activeTab === 'mixed') {
                                  handleMixedLanguageChange(opt.id as any);
                                } else {
                                  handleLanguageChange(opt.id as any);
                                }
                                setIsLangDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer select-none active:scale-[0.98] ${
                                isSelected
                                  ? activeTab === 'mixed'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(251,191,36,0.2)]'
                                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                                  : 'text-slate-300 hover:text-white hover:bg-white/10 border border-transparent'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <IconComp
                                  className={`w-3.5 h-3.5 shrink-0 ${
                                    isSelected
                                      ? activeTab === 'mixed'
                                        ? 'text-amber-400'
                                        : 'text-cyan-400'
                                      : opt.color
                                  }`}
                                />
                                <span className="truncate">{opt.label}</span>
                              </div>
                              {isSelected && (
                                <Check
                                  className={`w-3.5 h-3.5 shrink-0 ${
                                    activeTab === 'mixed' ? 'text-amber-400' : 'text-cyan-400'
                                  }`}
                                />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className={`h-7 px-3 flex items-center justify-center font-bold text-xs rounded-full transition-all active:scale-95 cursor-pointer shadow-md shrink-0 ${
                    activeTab === 'mixed'
                      ? 'bg-gradient-to-r from-amber-400 to-rose-400 text-black hover:brightness-110 shadow-[0_0_8px_rgba(251,191,36,0.3)]'
                      : 'bg-cyan-400 text-black hover:bg-white shadow-[0_0_8px_rgba(0,240,255,0.35)]'
                  }`}
                >
                  Search
                </button>
              </div>
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
                      handleSearch(undefined, item, undefined, 0);
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

          {/* Personalized "For You" Banner (Original Mode) */}
          {activeTab === 'search' && selectedLanguage === 'for_you' && (
            <div className="p-2 sm:p-2.5 bg-purple-950/40 border border-purple-500/30 rounded-xl mb-2.5 flex items-center justify-between text-xs text-purple-200 shadow-inner">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0 animate-pulse" />
                <span className="truncate text-[11px]">
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
                    loadDefaultResults('for_you', 'normal');
                  }}
                  className="text-[10px] text-slate-400 hover:text-red-400 underline ml-2 shrink-0 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              )}
            </div>
          )}



            {/* Results List with Endless Infinite Scroll */}
            <div
              ref={resultsContainerRef}
              onScroll={handleScroll}
              className={`space-y-1.5 sm:space-y-2 pr-1 relative ${getListScrollClassName()}`}
            >
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-sm gap-2">
                  <div className="w-6 h-6 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin"></div>
                  <span>
                    {activeTab === 'mixed'
                      ? 'Finding continuous party mixes & mashups...'
                      : 'Searching music databases for original tracks...'}
                  </span>
                </div>
              ) : results.length === 0 ? (
                <div className="text-center py-10 sm:py-12 px-4 sm:px-6">
                  <div className="inline-flex items-center justify-center p-3 rounded-full bg-electric-cyan/10 text-electric-cyan mb-3">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-semibold text-white mb-1.5">
                    {serverMessage ||
                      (activeTab === 'mixed'
                        ? 'No party mixes found matching your query'
                        : 'No tracks found matching your query')}
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {activeTab === 'mixed'
                      ? 'MusicSync brings you high-energy remixes, party mashups and non-stop continuous sets in English, Hindi, Gujarati & Punjabi.'
                      : 'MusicSync curates full original songs in English, Hindi, Gujarati & Punjabi.'}
                  </p>
                </div>
              ) : (
                <>
                  {results.map((track) => {
                    const isAdded = isTrackInPlayer(track);
                    const isPreviewing = previewTrackId === track.id;
                    const isLongTrack = track.duration >= 600 || track.isLongMix;

                    return (
                      <div
                        key={track.id}
                        className={`flex items-center justify-between p-2 sm:p-2.5 rounded-xl border transition-colors group ${
                          track.isMixed || isLongTrack
                            ? 'bg-gradient-to-r from-amber-950/25 via-rose-950/15 to-dark-950 border-amber-500/25 hover:border-amber-500/50'
                            : track.isTrending
                            ? 'bg-gradient-to-r from-amber-950/20 via-dark-950 to-dark-950 border-amber-500/20 hover:border-amber-500/40'
                            : track.isRecommended
                            ? 'bg-gradient-to-r from-purple-950/20 via-dark-950 to-dark-950 border-purple-500/20 hover:border-purple-500/40'
                            : 'bg-dark-950 border-white/5 hover:border-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                          {/* Circular Artwork with Neon Halo Ring & Preview Play Button */}
                          <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-full p-[1.5px] bg-gradient-to-tr from-cyan-400 via-sky-400 to-fuchsia-500 shadow-[0_0_8px_rgba(0,240,255,0.35)] group-hover:shadow-[0_0_14px_rgba(0,240,255,0.65)] shrink-0 flex items-center justify-center transition-all duration-200">
                            <img
                              src={track.artwork || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100'}
                              alt={track.title}
                              className="w-full h-full rounded-full object-cover bg-dark-950 border border-dark-950"
                            />
                            <button
                              onClick={() => togglePreview(track)}
                              title={isPreviewing ? 'Stop Preview' : 'Audition Preview'}
                              className={`absolute inset-0 rounded-full flex items-center justify-center bg-black/60 backdrop-blur-[1px] transition-opacity ${
                                isPreviewing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                              }`}
                            >
                              {isPreviewing ? (
                                <Pause className="w-4 h-4 text-cyan-400 fill-current" />
                              ) : (
                                <Play className="w-4 h-4 text-white fill-current ml-0.5" />
                              )}
                            </button>
                          </div>

                          {/* Title & Artist */}
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs sm:text-sm font-semibold text-white truncate flex items-center gap-1.5">
                              {cleanTrackTitle(track.title, track.artist)}
                            </h4>
                            <p className="text-[11px] sm:text-xs text-slate-400 truncate">{track.artist}</p>
                            <div className="flex items-center gap-1 sm:gap-1.5 mt-1 flex-wrap">
                              {/* Mixed Badge */}
                              {track.mixBadge && (
                                <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full font-mono bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold flex items-center gap-0.5 shadow-sm">
                                  <Flame className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-rose-400 fill-current animate-pulse" />
                                  <span>{track.mixBadge}</span>
                                </span>
                              )}

                              {/* Long Mix Non-Stop Badge */}
                              {isLongTrack && !track.mixBadge?.includes('Non-Stop') && (
                                <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-0.5">
                                  <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400" />
                                  <span>Non-Stop Set</span>
                                </span>
                              )}

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

                              {/* Duration Badge */}
                              <span
                                className={`text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full font-mono font-semibold flex items-center gap-1 ${
                                  isLongTrack
                                    ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
                                    : 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isLongTrack ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
                                  }`}
                                ></span>
                                <span>{formatTrackDuration(track.duration)}</span>
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

                        {/* Star Button (Immediately beside Add Button) */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(track);
                          }}
                          className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all active:scale-90 shrink-0 ml-1.5 ${
                            isFavorite(track.id)
                              ? 'bg-amber-400/20 text-amber-400 border-amber-400/50 shadow-[0_0_10px_rgba(251,191,36,0.35)]'
                              : 'bg-dark-900/80 text-slate-400 border-white/10 hover:text-amber-300 hover:border-amber-400/40 hover:bg-amber-400/10'
                          }`}
                          title={isFavorite(track.id) ? 'Remove from Favorites' : 'Add to Favorites'}
                        >
                          <Star className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isFavorite(track.id) ? 'fill-amber-400 text-amber-400' : ''}`} />
                        </button>

                        {/* Add Button */}
                        <button
                          type="button"
                          onClick={() => handleAddTrack(track)}
                          className={`flex items-center gap-1 sm:gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 shrink-0 ml-1.5 shadow-sm cursor-pointer ${
                            isAdded
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.35)] hover:bg-emerald-500/30'
                              : activeTab === 'mixed'
                              ? 'bg-gradient-to-r from-amber-400 to-rose-400 text-black hover:brightness-110 shadow-[0_0_10px_rgba(251,191,36,0.3)]'
                              : 'bg-dark-900 hover:bg-dark-850 text-cyan-300 border border-cyan-400/40 hover:border-cyan-400 shadow-[0_0_8px_rgba(0,240,255,0.25)]'
                          }`}
                          title={isAdded ? 'Added to player queue' : 'Add to queue'}
                        >
                          {isAdded ? (
                            <>
                              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>Added</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>Add</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}

                  {/* Endless Scroll Sentinel & Infinite Streaming Indicator */}
                  <div ref={sentinelRef} className="pt-2 pb-5 text-center min-h-[48px] flex items-center justify-center">
                    {isLoadingMore ? (
                      <div className="flex items-center justify-center gap-2 py-2 text-xs text-electric-cyan font-mono">
                        <Loader2 className="w-4 h-4 animate-spin text-electric-cyan" />
                        <span>Streaming next suggestions from limitless catalog...</span>
                      </div>
                    ) : hasMore ? (
                      <button
                        type="button"
                        onClick={handleLoadMore}
                        className="flex items-center justify-center gap-2 text-[11px] text-slate-500 hover:text-cyan-400 font-mono py-2 transition-colors cursor-pointer"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                        <span>
                          {activeTab === 'mixed'
                            ? 'Infinite party mixes & mashups streaming (Scroll for more)'
                            : 'Infinite songs suggestions streaming (Scroll for more)'}
                        </span>
                      </button>
                    ) : (
                      query && (
                        <div className="text-[11px] text-slate-500 py-2 font-mono">
                          ✓ All available songs for "{query}" have been loaded.
                        </div>
                      )
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}



        {/* Tab 3: Listening History */}
        {activeTab === 'history' && (
          <div className="p-4 flex-1 flex flex-col min-h-0">
            {/* Top Bar: Clear History button if history exists */}
            {historyItems.length > 0 && (
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs text-slate-400 font-mono">
                  {historyItems.length} {historyItems.length === 1 ? 'song' : 'songs'} in playback history
                </span>
                <button
                  type="button"
                  onClick={handleClearAllHistory}
                  className="px-3 py-1.5 bg-dark-950 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 text-xs text-slate-400 hover:text-red-400 rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                  title="Clear all playback history"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear History</span>
                </button>
              </div>
            )}

            {/* History List */}
            <div
              className={`space-y-2 pr-1 relative ${getListScrollClassName('max-h-[500px]')}`}
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
                historyItems.map((item) => {
                  const { track } = item;
                  const isAdded = isTrackInPlayer(track);
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
                            <h4 className="text-sm font-semibold text-white truncate">{cleanTrackTitle(track.title, track.artist)}</h4>
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
                          {/* Star Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(track);
                            }}
                            className={`p-1.5 rounded-lg border transition-all active:scale-90 ${
                              isFavorite(track.id)
                                ? 'bg-amber-400/20 text-amber-400 border-amber-400/40 shadow-[0_0_10px_rgba(251,191,36,0.25)]'
                                : 'text-slate-400 border-transparent hover:text-amber-300 hover:bg-white/5'
                            }`}
                            title={isFavorite(track.id) ? 'Remove from Favorites' : 'Add to Favorites'}
                          >
                            <Star className={`w-3.5 h-3.5 ${isFavorite(track.id) ? 'fill-amber-400 text-amber-400' : ''}`} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleAddTrack(track)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 cursor-pointer ${
                              isAdded
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.35)] hover:bg-emerald-500/30'
                                : 'bg-electric-cyan text-black hover:bg-white shadow-md'
                            }`}
                            title={isAdded ? 'Added to player queue' : 'Add back to room queue'}
                          >
                            {isAdded ? (
                              <>
                                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>Added</span>
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
                  })
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Local Music Import */}
        {activeTab === 'local' && (
          <div className="p-4 flex-1 flex flex-col min-h-0">
            {/* Hidden native file inputs */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="audio/*,.mp3,.wav,.flac,.m4a,.aac,.ogg,.opus,.wma"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  localMusicService.importFiles(e.target.files);
                  e.target.value = '';
                }
              }}
            />

            {/* Top Toolbar: Search filter, File buttons, Clear All */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 mb-3">
              {/* Filter Search Box */}
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={localSearchQuery}
                  onChange={(e) => setLocalSearchQuery(e.target.value)}
                  placeholder="Filter local music by title, artist, or format..."
                  className="w-full bg-dark-950 border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
                />
                {localSearchQuery && (
                  <button
                    onClick={() => setLocalSearchQuery('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-2 rounded-xl bg-dark-950 hover:bg-white/5 border border-white/10 hover:border-cyan-400/40 text-slate-200 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm"
                  title="Import audio song file from your device (.mp3, .wav, .flac, .m4a)"
                >
                  <FileAudio className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Import Song</span>
                </button>

                {localTracks.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllLocalTracks}
                    className="px-2.5 py-2 bg-dark-950 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 text-xs text-slate-400 hover:text-red-400 rounded-xl transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                    title="Remove all imported local files"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Clear</span>
                  </button>
                )}
              </div>
            </div>

            {/* Drag & Drop Import Dropzone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragOver(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragOver(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragOver(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  localMusicService.importFiles(e.dataTransfer.files);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`mb-3.5 p-3.5 sm:p-4 rounded-2xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center text-center cursor-pointer select-none ${
                isDragOver
                  ? 'border-cyan-400 bg-cyan-500/10 shadow-[0_0_25px_rgba(0,240,255,0.3)] scale-[1.01]'
                  : 'border-white/10 hover:border-cyan-400/40 bg-dark-950/60 hover:bg-dark-950/90'
              }`}
            >
              <div className="flex items-center gap-2 text-cyan-400 mb-1">
                <HardDrive className={`w-4 h-4 sm:w-5 sm:h-5 ${isDragOver ? 'animate-bounce' : ''}`} />
                <span className="text-xs sm:text-sm font-bold text-white">
                  {isDragOver ? 'Drop your audio files here!' : 'Drop audio files or click to browse from device'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 max-w-md leading-relaxed">
                Supports <strong className="text-slate-300 font-mono">MP3, WAV, FLAC, M4A, AAC, OGG</strong>. Tracks upload to room server with byte-range streaming for synchronized room playback!
              </p>
            </div>

            {/* Upload Progress Indicator Banner */}
            {uploadProgress.isUploading && (
              <div className="mb-3 p-3 rounded-xl bg-cyan-950/40 border border-cyan-400/30 text-xs shadow-md animate-fade-in">
                <div className="flex items-center justify-between text-cyan-300 mb-1.5 font-mono text-[11px]">
                  <div className="flex items-center gap-2 truncate">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400 shrink-0" />
                    <span className="truncate">
                      Uploading: <strong className="text-white">{uploadProgress.currentFile || 'audio file'}</strong>
                    </span>
                  </div>
                  <span className="font-bold text-cyan-400 shrink-0 ml-2">
                    {uploadProgress.progress}% ({uploadProgress.completedFiles}/{uploadProgress.totalFiles})
                  </span>
                </div>
                <div className="w-full bg-dark-950 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-cyan-400 via-sky-400 to-fuchsia-500 h-full rounded-full transition-all duration-200"
                    style={{ width: `${Math.max(5, uploadProgress.progress)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Local Tracks List */}
            <div
              className={`space-y-2 pr-1 relative ${getListScrollClassName('max-h-[500px]')}`}
            >
              {localTracks.length === 0 ? (
                <div className="text-center py-12 px-6 border border-dashed border-white/5 rounded-xl bg-dark-950/40">
                  <div className="inline-flex items-center justify-center p-3 rounded-full bg-cyan-400/10 text-cyan-400 mb-3 shadow-[0_0_14px_rgba(0,240,255,0.2)]">
                    <HardDrive className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-semibold text-white mb-1">No Local Music Imported Yet</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                    Import your own MP3s or music folders from your computer or phone using the dropzone above. They will be shared and synchronized with everyone in this room!
                  </p>
                </div>
              ) : (
                (() => {
                  const filtered = localTracks.filter((track) => {
                    if (!localSearchQuery.trim()) return true;
                    const q = localSearchQuery.toLowerCase();
                    return (
                      track.title.toLowerCase().includes(q) ||
                      track.artist.toLowerCase().includes(q) ||
                      (track.format && track.format.toLowerCase().includes(q))
                    );
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-12 text-slate-500 text-xs">
                        No local songs matching "{localSearchQuery}".
                      </div>
                    );
                  }

                  return filtered.map((track, idx) => {
                    const isAdded = isTrackInPlayer(track);
                    const isPreviewing = previewTrackId === track.id;
                    const isStarred = isFavorite(track.id);

                    return (
                      <div
                        key={track.id || `local-${idx}`}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-dark-950 border border-white/5 hover:border-cyan-400/30 transition-all group shadow-sm"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {/* Artwork Thumbnail with Play/Pause Audition Button */}
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-dark-850 shrink-0 shadow-sm border border-white/10 flex items-center justify-center">
                            <div className="w-full h-full bg-gradient-to-tr from-cyan-950 via-slate-900 to-fuchsia-950 flex items-center justify-center text-cyan-400">
                              <FileAudio className="w-6 h-6 stroke-[1.5]" />
                            </div>

                            <button
                              onClick={() => togglePreview(track)}
                              title={isPreviewing ? 'Stop Local Preview' : 'Listen Preview locally (Audition)'}
                              className={`absolute inset-0 flex items-center justify-center bg-black/60 transition-opacity cursor-pointer ${
                                isPreviewing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                              }`}
                            >
                              {isPreviewing ? (
                                <Pause className="w-5 h-5 text-cyan-400 fill-current" />
                              ) : (
                                <Play className="w-5 h-5 text-white fill-current ml-0.5" />
                              )}
                            </button>
                          </div>

                          {/* Title, Artist, and Badges */}
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-cyan-300 transition-colors">
                              {cleanTrackTitle(track.title, track.artist)}
                            </h4>
                            <p className="text-[11px] sm:text-xs text-slate-400 truncate">{track.artist}</p>

                            <div className="flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap text-[10px]">
                              {track.format && (
                                <span className="px-1.5 py-0.2 rounded-full font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                                  {track.format}
                                </span>
                              )}

                              <span className="px-1.5 py-0.2 rounded-full font-mono bg-dark-800 text-slate-300 border border-white/5">
                                {formatTrackDuration(track.duration)}
                              </span>

                              {track.fileSize && (
                                <span className="px-1.5 py-0.2 rounded-full font-mono bg-dark-800 text-slate-400 border border-white/5">
                                  {(track.fileSize / (1024 * 1024)).toFixed(1)} MB
                                </span>
                              )}

                              <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                                <HardDrive className="w-2.5 h-2.5 text-cyan-400/70" />
                                <span>Local Device</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {/* Star Favorite */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(track);
                            }}
                            className={`p-1.5 rounded-lg border transition-all active:scale-90 cursor-pointer ${
                              isStarred
                                ? 'bg-amber-400/20 text-amber-400 border-amber-400/40 shadow-[0_0_10px_rgba(251,191,36,0.25)]'
                                : 'text-slate-400 border-transparent hover:text-amber-300 hover:bg-white/5'
                            }`}
                            title={isStarred ? 'Remove from Favorites' : 'Add to Favorites'}
                          >
                            <Star className={`w-3.5 h-3.5 ${isStarred ? 'fill-amber-400 text-amber-400' : ''}`} />
                          </button>

                          {/* Play Now */}
                          <button
                            type="button"
                            onClick={() => handlePlayNow(track)}
                            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-dark-900 hover:bg-cyan-500/20 text-slate-200 hover:text-cyan-300 border border-white/10 hover:border-cyan-400/40 transition-all active:scale-95 cursor-pointer"
                            title="Play immediately across the room"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Play</span>
                          </button>

                          {/* Add to Queue */}
                          <button
                            type="button"
                            onClick={() => handleAddTrack(track)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 cursor-pointer ${
                              isAdded
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.35)] hover:bg-emerald-500/30'
                                : 'bg-cyan-400 text-black hover:bg-white shadow-md'
                            }`}
                            title={isAdded ? 'Added to player queue' : 'Add to room queue'}
                          >
                            {isAdded ? (
                              <>
                                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>Added</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>Add</span>
                              </>
                            )}
                          </button>

                          {/* Delete Local Track */}
                          <button
                            type="button"
                            onClick={() => handleDeleteLocalTrack(track.id)}
                            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                            title="Delete this local file from library"
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
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-[calc(1rem+env(safe-area-inset-bottom,0px))]"
    >
      {content}
    </div>
  );
};
