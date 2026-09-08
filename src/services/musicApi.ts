import { Track } from '../types';

export interface SearchResult {
  tracks: Track[];
  message?: string;
  offset?: number;
  hasMore?: boolean;
}

// Clean track title to extract the original song name, removing Uploader noise, SEO tags, video labels, etc.
export function cleanTrackTitle(rawTitle: string = '', rawArtist: string = ''): string {
  if (!rawTitle || typeof rawTitle !== 'string') return '';
  let title = rawTitle.trim();
  const artist = (rawArtist || '').trim();

  // 1. If title contains pipe '|' or double slash '//' or bullet '•',
  // everything after is almost exclusively promotional clutter
  if (/[|/•]/.test(title)) {
    const parts = title.split(/[|/•]/).map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0 && parts[0].length >= 2) {
      title = parts[0];
    }
  }

  // 2. Strip noise inside parentheses and brackets:
  const noiseRegex = /\b(official\s+)?(music\s+)?(video|audio|visualizer|lyric(s)?|hd|4k|1080p|720p|hq|uhd|320kbps|128kbps|lossless|high\s+quality)(\s+(song|video|track))?\b/i;
  const extraPromoRegex = /\b(full\s+(song|video|track|audio)|live\s+session|live\s+video|studio\s+version|studio\s+master|original\s+mix|teaser|trailer|promo|exclusive|extended\s+cut|coke\s+studio|slowed\s*\+?\s*reverb|slowed\s+and\s+reverb|bass\s+boosted|high\s+bass|8d\s+audio|out\s+now|remastered|lyrical|lyrics|audio\s+song|video\s+song|from\s+["'].*?["']|from\s+the\s+album\s+["'].*?["'])\b/i;
  const curatedThemeRegex = /\b(viral\s+beat|animal\s+rock\s+bass|stadium\s+anthems?|disco\s+pop|acoustic\s+poetry|classic\s+melodies|soulful\s+session|spiritual\s+folk|synthwave\s+bass|synth\s+rework|garba\s+high\s+bass|traditional\s+gujarati\s+garba|traditional\s+united\s+garba|desi\s+dhol\s+beats|folk\s+fusion|no\s+love\s+anthem|urban\s+punjabi|dhol\s*&\s*808\s+bass|bad\s+newz\s+anthems?|moosetape\s+295\s+anthem|karan\s+aujla\s+bass\s+edition)\b/i;

  title = title.replace(/\[(.*?)\]/g, (match, inner) => {
    if (noiseRegex.test(inner) || extraPromoRegex.test(inner) || curatedThemeRegex.test(inner) || /^\s*(official|lyrics?|audio|video|hd|4k|hq|remastered|out now)\s*$/i.test(inner)) {
      return '';
    }
    return `[${inner}]`;
  });

  title = title.replace(/\((.*?)\)/g, (match, inner) => {
    if (noiseRegex.test(inner) || extraPromoRegex.test(inner) || curatedThemeRegex.test(inner) || /^\s*(official|lyrics?|audio|video|hd|4k|hq|remastered|out now|full song|audio song)\s*$/i.test(inner)) {
      return '';
    }
    return `(${inner})`;
  });

  // 3. Remove trailing promo slogans or album buzzwords
  title = title.replace(/\s+(moonchild\s+era|bad\s+newz|still\s+rollin|moosetape)\b/gi, '');

  // 4. Handle "Artist - Song" vs "Song - Movie/Album" vs "Song - Artist"
  if (/^([^-–—:]+)[\s]*[-–—:][\s]*([^-–—:]+)$/.test(title)) {
    const match = title.match(/^([^-–—:]+)[\s]*[-–—:][\s]*([^-–—:]+)$/);
    if (match) {
      const left = match[1].trim();
      const right = match[2].trim();
      const lowerArtist = artist.toLowerCase();
      const lowerLeft = left.toLowerCase();
      const lowerRight = right.toLowerCase();

      if (lowerArtist && (lowerLeft === lowerArtist || lowerArtist.includes(lowerLeft) || lowerLeft.includes(lowerArtist))) {
        title = right;
      } else if (lowerArtist && (lowerRight === lowerArtist || lowerArtist.includes(lowerRight) || lowerRight.includes(lowerArtist))) {
        title = left;
      } else if (left.length >= 2 && right.length >= 2) {
        title = left;
      }
    }
  }

  // 5. If title still starts with "Artist - " or ends with " - Artist"
  if (artist) {
    const escapedArtist = artist.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    title = title.replace(new RegExp(`^${escapedArtist}\\s*[-:–—]\\s*`, 'i'), '');
    title = title.replace(new RegExp(`\\s*[-:–—]\\s*${escapedArtist}$`, 'i'), '');
  }

  // 6. Clean up trailing/leading dashes, colons, brackets, or excess whitespace
  title = title
    .replace(/\(\s*\)/g, '')
    .replace(/\[\s*\]/g, '')
    .replace(/\s*[-–—:]\s*$/g, '')
    .replace(/^\s*[-–—:]\s*/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (title === title.toUpperCase() && title.length > 3) {
    title = title.charAt(0).toUpperCase() + title.slice(1).toLowerCase();
  }

  return title || rawTitle;
}

export async function searchTracks(
  query: string,
  language: string = 'all',
  offset: number = 0,
  userArtists: string = '',
  mode: 'normal' | 'mixed' = 'normal',
  seed: string = '',
  exclude: string = ''
): Promise<SearchResult> {
  const trimmed = query.trim();
  let url = `/api/search?q=${encodeURIComponent(trimmed)}&lang=${encodeURIComponent(language)}&offset=${offset}&mode=${mode}`;
  if (userArtists) {
    url += `&artists=${encodeURIComponent(userArtists)}`;
  }
  if (seed) {
    url += `&seed=${encodeURIComponent(seed)}`;
  }
  if (exclude) {
    url += `&exclude=${encodeURIComponent(exclude)}`;
  }

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Search failed');
    const data = await res.json();
    const cleanedTracks = (data.tracks || []).map((t: Track) => ({
      ...t,
      title: cleanTrackTitle(t.title, t.artist)
    }));
    return {
      tracks: cleanedTracks,
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
    return (data.tracks || []).map((t: Track) => ({
      ...t,
      title: cleanTrackTitle(t.title, t.artist)
    }));
  } catch (err) {
    console.error('Failed to load curated tracks:', err);
    return [];
  }
}

export function createCustomTrack(url: string, title?: string, artist?: string): Track {
  const cleanUrl = url.trim();
  const fallbackTitle = title?.trim() || cleanUrl.split('/').pop()?.split('?')[0] || 'Custom Stream';
  const cleanTitle = cleanTrackTitle(fallbackTitle, artist);

  return {
    id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    title: cleanTitle,
    artist: artist?.trim() || 'Direct Stream / URL',
    album: 'Custom Audio Stream',
    duration: 300,
    genre: 'Custom Stream',
    artwork: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
    audioUrl: cleanUrl,
    source: 'Custom URL'
  };
}
