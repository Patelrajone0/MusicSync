import { Track } from '../types';

export interface HistoryItem {
  id: string;
  track: Track;
  playedAt: number; // timestamp in ms
  playCount: number;
  lastAction: 'queued' | 'listened' | 'upvoted';
}

export interface TasteSummary {
  topArtists: string[];
  topLanguages: string[];
  topGenres: string[];
  recentTracks: Track[];
  totalInteractions: number;
  historyCount: number;
}

const STORAGE_KEY = 'musicsync_user_taste_v1';

interface UserTasteStore {
  interactions: {
    trackId: string;
    title: string;
    artist: string;
    language?: string;
    action: 'queued' | 'listened' | 'upvoted';
    timestamp: number;
  }[];
  artistScores: Record<string, number>;
  languageScores: Record<string, number>;
  genreScores: Record<string, number>;
  recentTracks: Track[];
  history: HistoryItem[];
}

function loadStore(): UserTasteStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        interactions: parsed.interactions || [],
        artistScores: parsed.artistScores || {},
        languageScores: parsed.languageScores || {},
        genreScores: parsed.genreScores || {},
        recentTracks: parsed.recentTracks || [],
        history: parsed.history || []
      };
    }
  } catch (err) {
    console.warn('Failed to parse user taste storage:', err);
  }
  return {
    interactions: [],
    artistScores: {},
    languageScores: {},
    genreScores: {},
    recentTracks: [],
    history: []
  };
}

function saveStore(store: UserTasteStore) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (err) {
    console.warn('Failed to save user taste storage:', err);
  }
}

/**
 * Normalizes artist name (e.g. "Diljit Dosanjh ft. AP Dhillon" -> ["Diljit Dosanjh", "AP Dhillon"])
 */
function extractArtists(artistStr: string = ''): string[] {
  if (!artistStr) return [];
  const parts = artistStr
    .split(/ft\.|feat\.|&|,|❌|\/|x\s+/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 1 && !s.toLowerCase().includes('artist') && !s.toLowerCase().includes('unknown'));
  return parts.length > 0 ? parts : [artistStr.trim()];
}

class UserTasteEngine {
  private store: UserTasteStore;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.store = loadStore();
  }

  private notify() {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch (e) {
        console.error('Error in taste listener:', e);
      }
    });
  }

  /**
   * Subscribe to changes in user taste and history
   */
  public subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Record when user queues, upvotes, or listens to a track
   */
  public recordInteraction(track: Track, action: 'queued' | 'listened' | 'upvoted') {
    if (!track || !track.id) return;

    const weights = {
      upvoted: 3,
      queued: 2,
      listened: 1
    };
    const scoreAdd = weights[action] || 1;

    // 1. Record interaction event
    this.store.interactions.unshift({
      trackId: track.id,
      title: track.title,
      artist: track.artist,
      language: track.language,
      action,
      timestamp: Date.now()
    });
    if (this.store.interactions.length > 150) {
      this.store.interactions.pop();
    }

    // 2. Update artist scores
    const artists = extractArtists(track.artist);
    for (const a of artists) {
      const key = a.toLowerCase();
      this.store.artistScores[key] = (this.store.artistScores[key] || 0) + scoreAdd;
    }

    // 3. Update language scores
    if (track.language) {
      const langKey = track.language.toLowerCase();
      this.store.languageScores[langKey] = (this.store.languageScores[langKey] || 0) + scoreAdd;
    }

    // 4. Update genre scores
    if (track.genre) {
      const gKey = track.genre.toLowerCase();
      this.store.genreScores[gKey] = (this.store.genreScores[gKey] || 0) + scoreAdd;
    }

    // 5. Update recent tracks (deduped)
    const existingRecentIdx = this.store.recentTracks.findIndex(
      (t) => t.id === track.id || (t.title === track.title && t.artist === track.artist)
    );
    if (existingRecentIdx >= 0) {
      this.store.recentTracks.splice(existingRecentIdx, 1);
    }
    this.store.recentTracks.unshift({
      ...track,
      isRecommended: true
    });
    if (this.store.recentTracks.length > 30) {
      this.store.recentTracks.pop();
    }

    // 6. Update Playback History
    const existingHistIdx = this.store.history.findIndex(
      (h) => h.track.id === track.id || (h.track.title === track.title && h.track.artist === track.artist)
    );

    if (existingHistIdx >= 0) {
      const existing = this.store.history[existingHistIdx];
      existing.playCount = (existing.playCount || 1) + 1;
      existing.playedAt = Date.now();
      existing.lastAction = action;
      // Refresh track data if new artwork/details
      existing.track = { ...existing.track, ...track };

      // Move to top of history
      this.store.history.splice(existingHistIdx, 1);
      this.store.history.unshift(existing);
    } else {
      this.store.history.unshift({
        id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        track,
        playedAt: Date.now(),
        playCount: 1,
        lastAction: action
      });
    }

    if (this.store.history.length > 200) {
      this.store.history.pop();
    }

    saveStore(this.store);
    this.notify();
  }

  /**
   * Get all playback history items (sorted newest first)
   */
  public getHistory(): HistoryItem[] {
    return this.store.history || [];
  }

  /**
   * Clear all playback history
   */
  public clearHistory() {
    this.store.history = [];
    saveStore(this.store);
    this.notify();
  }

  /**
   * Remove single track from history
   */
  public removeHistoryItem(id: string) {
    this.store.history = this.store.history.filter((h) => h.id !== id && h.track.id !== id);
    saveStore(this.store);
    this.notify();
  }

  /**
   * Returns a structured summary of the user's taste profile
   */
  public getTasteSummary(): TasteSummary {
    // Sort artists by score
    const sortedArtists = Object.entries(this.store.artistScores)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name.replace(/\b\w/g, (c) => c.toUpperCase()));

    // Sort languages by score
    const sortedLanguages = Object.entries(this.store.languageScores)
      .sort((a, b) => b[1] - a[1])
      .map(([lang]) => lang);

    // Sort genres by score
    const sortedGenres = Object.entries(this.store.genreScores)
      .sort((a, b) => b[1] - a[1])
      .map(([genre]) => genre);

    return {
      topArtists: sortedArtists.slice(0, 8),
      topLanguages: sortedLanguages.slice(0, 3),
      topGenres: sortedGenres.slice(0, 5),
      recentTracks: this.store.recentTracks,
      totalInteractions: this.store.interactions.length,
      historyCount: this.store.history.length
    };
  }

  /**
   * Generates a personalized recommendation search query
   */
  public getPersonalizedQuery(): string {
    const summary = this.getTasteSummary();
    if (summary.topArtists.length > 0) {
      // Pick top 2 artists for high-relevance search
      return summary.topArtists.slice(0, 2).join(' ');
    }
    return '';
  }

  /**
   * Reset user taste profile
   */
  public clearTasteProfile() {
    this.store = {
      interactions: [],
      artistScores: {},
      languageScores: {},
      genreScores: {},
      recentTracks: [],
      history: this.store.history
    };
    saveStore(this.store);
    this.notify();
  }
}

export const userTasteEngine = new UserTasteEngine();
