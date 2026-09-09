import { useState, useEffect, useSyncExternalStore } from 'react';
import { Track } from '../types';
import { cleanTrackTitle } from './musicApi';

const FAVORITES_USER_ID_KEY = 'musicsync_user_id';
const FAVORITES_CACHE_KEY = 'musicsync_favorites_cache_v1';

export function getPersistentUserId(): string {
  try {
    let id = localStorage.getItem(FAVORITES_USER_ID_KEY);
    if (!id || !id.trim()) {
      id = `user_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem(FAVORITES_USER_ID_KEY, id);
    }
    return id;
  } catch (err) {
    return 'default_guest_user';
  }
}

class FavoritesService {
  private userId: string;
  private favorites: Track[] = [];
  private listeners: Set<() => void> = new Set();
  private isLoaded: boolean = false;

  constructor() {
    this.userId = getPersistentUserId();
    this.loadFromLocalStorage();
    this.fetchFromServer();
  }

  private loadFromLocalStorage() {
    try {
      const raw = localStorage.getItem(FAVORITES_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.favorites = parsed.map((t: Track) => ({
            ...t,
            title: cleanTrackTitle(t.title, t.artist)
          }));
        }
      }
    } catch (e) {
      console.warn('Failed to load favorites from localStorage:', e);
    }
  }

  private saveToLocalStorage() {
    try {
      localStorage.setItem(FAVORITES_CACHE_KEY, JSON.stringify(this.favorites));
    } catch (e) {
      console.warn('Failed to save favorites to localStorage:', e);
    }
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Error in favorites listener:', err);
      }
    });
  }

  public async fetchFromServer(): Promise<Track[]> {
    try {
      const res = await fetch(`/api/favorites?userId=${encodeURIComponent(this.userId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.tracks)) {
          const cleaned = data.tracks.map((t: Track) => ({
            ...t,
            title: cleanTrackTitle(t.title, t.artist)
          }));
          this.favorites = cleaned;
          this.saveToLocalStorage();
          this.isLoaded = true;
          this.notify();
          return cleaned;
        }
      }
    } catch (err) {
      console.warn('Could not sync favorites with server (using local cache):', err);
    }
    this.isLoaded = true;
    return this.favorites;
  }

  public getFavorites(): Track[] {
    return this.favorites;
  }

  public getUserId(): string {
    return this.userId;
  }

  public isFavorite(trackId: string): boolean {
    if (!trackId) return false;
    return this.favorites.some((t) => t.id === trackId);
  }

  public async toggleFavorite(rawTrack: Track): Promise<boolean> {
    if (!rawTrack || !rawTrack.id) return false;

    const track: Track = {
      ...rawTrack,
      title: cleanTrackTitle(rawTrack.title, rawTrack.artist)
    };

    const alreadyFav = this.isFavorite(track.id);

    if (alreadyFav) {
      // Optimistic removal
      this.favorites = this.favorites.filter((t) => t.id !== track.id);
      this.saveToLocalStorage();
      this.notify();

      // Persist to backend database
      try {
        await fetch(`/api/favorites/${encodeURIComponent(track.id)}?userId=${encodeURIComponent(this.userId)}`, {
          method: 'DELETE',
        });
      } catch (err) {
        console.error('Failed to sync favorite deletion with backend:', err);
      }

      return false;
    } else {
      // Optimistic addition
      const favTrack: Track = {
        id: track.id,
        title: track.title,
        artist: track.artist || 'Unknown Artist',
        album: track.album || '',
        duration: typeof track.duration === 'number' ? track.duration : 0,
        genre: track.genre || '',
        language: track.language || '',
        languageBadge: track.languageBadge || '',
        artwork: track.artwork || '',
        audioUrl: track.audioUrl || '',
        source: track.source || 'Curated',
        addedAt: Date.now()
      };

      this.favorites = [favTrack, ...this.favorites.filter((t) => t.id !== track.id)];
      this.saveToLocalStorage();
      this.notify();

      // Persist to backend database
      try {
        await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: this.userId, track: favTrack }),
        });
      } catch (err) {
        console.error('Failed to sync favorite addition with backend:', err);
      }

      return true;
    }
  }

  public async addFavorite(track: Track): Promise<void> {
    if (!this.isFavorite(track.id)) {
      await this.toggleFavorite(track);
    }
  }

  public async removeFavorite(trackId: string): Promise<void> {
    if (this.isFavorite(trackId)) {
      const dummyTrack = { id: trackId } as Track;
      await this.toggleFavorite(dummyTrack);
    }
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
}

export const favoritesService = new FavoritesService();

export function useFavorites() {
  const favorites = useSyncExternalStore(
    (cb) => favoritesService.subscribe(cb),
    () => favoritesService.getFavorites(),
    () => []
  );

  return {
    favorites,
    favoriteCount: favorites.length,
    isFavorite: (trackId: string) => favoritesService.isFavorite(trackId),
    toggleFavorite: (track: Track) => favoritesService.toggleFavorite(track),
    addFavorite: (track: Track) => favoritesService.addFavorite(track),
    removeFavorite: (trackId: string) => favoritesService.removeFavorite(trackId),
    userId: favoritesService.getUserId(),
  };
}
