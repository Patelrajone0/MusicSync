import { Track } from '../types';

export interface SearchResult {
  tracks: Track[];
  message?: string;
  offset?: number;
  hasMore?: boolean;
}

export async function searchTracks(
  query: string,
  language: string = 'all',
  offset: number = 0,
  userArtists: string = '',
  mode: 'normal' | 'mixed' = 'normal'
): Promise<SearchResult> {
  const trimmed = query.trim();
  let url = `/api/search?q=${encodeURIComponent(trimmed)}&lang=${encodeURIComponent(language)}&offset=${offset}&mode=${mode}`;
  if (userArtists) {
    url += `&artists=${encodeURIComponent(userArtists)}`;
  }

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Search failed');
    const data = await res.json();
    return {
      tracks: data.tracks || [],
      message: data.message,
      offset: data.offset,
      hasMore: data.hasMore
    };
  } catch (err) {
    console.warn('Search query error, falling back to curated:', err);
    const curated = await getCuratedTracks(mode);
    return { tracks: curated, hasMore: false };
  }
}

export async function getSearchSuggestions(query: string, language: string = 'all', mode: 'normal' | 'mixed' = 'normal'): Promise<string[]> {
  try {
    const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query.trim())}&lang=${encodeURIComponent(language)}&mode=${mode}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.suggestions || [];
  } catch (err) {
    return [];
  }
}

export async function getCuratedTracks(mode: 'normal' | 'mixed' = 'normal'): Promise<Track[]> {
  try {
    const res = await fetch(`/api/tracks/curated?mode=${mode}`);
    if (!res.ok) throw new Error('Curated fetch failed');
    const data = await res.json();
    return data.tracks || [];
  } catch (err) {
    console.error('Failed to load curated tracks:', err);
    return [];
  }
}

export function createCustomTrack(url: string, title?: string, artist?: string): Track {
  const cleanUrl = url.trim();
  const fallbackTitle = title?.trim() || cleanUrl.split('/').pop()?.split('?')[0] || 'Custom Stream';

  return {
    id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    title: fallbackTitle,
    artist: artist?.trim() || 'Direct Stream / URL',
    album: 'Custom Audio Stream',
    duration: 300,
    genre: 'Custom Stream',
    artwork: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
    audioUrl: cleanUrl,
    source: 'Custom URL'
  };
}
