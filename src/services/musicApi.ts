import { Track } from '../types';

export interface SearchResult {
  tracks: Track[];
  message?: string;
  offset?: number;
  hasMore?: boolean;
}

// List of famous artists to detect and block title clickbait (e.g. track titled purely "Karan Aujla" without a song name)
export const FAMOUS_ARTISTS = [
  'karan aujla', 'diljit dosanjh', 'sidhu moose wala', 'sidhu moosewala', 'ap dhillon',
  'shubh', 'amrinder gill', 'ammy virk', 'b praak', 'guru randhawa', 'jass manak',
  'parmish verma', 'hustinder', 'jordan sandhu', 'honey singh', 'yo yo honey singh',
  'badshah', 'arijit singh', 'shreya ghoshal', 'neha kakkar', 'jubin nautiyal',
  'sonu nigam', 'kumar sanu', 'udit narayan', 'alka yagnik', 'ar rahman',
  'pritam', 'anirudh', 'atif aslam', 'aditya gadhvi', 'kinjal dave',
  'kirtidan gadhvi', 'geeta rabari', 'falguni pathak', 'the weeknd',
  'taylor swift', 'ed sheeran', 'billie eilish', 'dua lipa', 'coldplay',
  'drake', 'post malone', 'bruno mars', 'eminem', 'justin bieber', 'ariana grande',
  'darshan raval', 'anuv jain', 'prateek kuhad', 'amit trivedi', 'sachin jigar',
  'sunidhi chauhan', 'mohit chauhan', 'shaan'
];

export const PROFANITY_REGEX = /\b(gandu|gand|gaand|dalle|dalla|chutiya|chutya|bhosad|bhosd|bhosadi|bhosadika|lodu|loda|lauda|lund|madarchod|mc|bc|behenchod|bhenchod|harami|randi|kutti|kutta|kamina|chinal|fuck|fucker|fucking|bitch|slut|porn|xxx|nude|sex)\b/i;
export const FILE_EXT_REGEX = /\.(mp3|wav|m4a|aac|flac|ogg|opus)\b/i;
export const RIP_SPAM_REGEX = /\b(kalam|naat|nohay|marsiya|majlis|bayan|status\s+video|whatsapp\s+status|tiktok\s+viral|viral\s+reels?|reels?\s+audio|viral\s+kalam|punjabisong\s+viral)\b/i;

// Filter out low-quality audio rips, profane/abusive titles, religious amateur recordings, and SEO junk
export function isJunkOrSpamTrack(title: string = '', artist: string = ''): boolean {
  if (!title || typeof title !== 'string') return true;
  const raw = `${title} ${artist || ''}`.toLowerCase();

  // 1. Explicit profanity / vulgarity / abusive language
  if (PROFANITY_REGEX.test(raw)) return true;

  // 2. Religious kalam/naat/bayan amateur audio clips (not music tracks)
  if (/\b(kalam|naat\s+sharif|nohay|marsiya|majlis|bayan)\b/i.test(title)) return true;

  // 3. Audio rip files with spam keywords (.mp3, tiktok viral, reels audio, etc.)
  if (FILE_EXT_REGEX.test(title) && (RIP_SPAM_REGEX.test(title) || /song|viral|trending/i.test(title))) return true;

  // 4. Strip noise and check remaining substantive content
  const stripped = title.toLowerCase()
    .replace(/\.(mp3|wav|m4a|aac|flac|ogg|opus)\b/gi, ' ')
    .replace(/[\(\[].*?[\)\]]/g, ' ')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\b(latest|new|punjabi|punjabisong|hindi|gujarati|english|bollywood|songs?|viral|trending|reels?|tiktok|audio|video|status|whatsapp|best|top|hit|hits|kalam|studio|singer|singers?|records?|remix|mix|official|hd|4k|hq|mp3|mp4|\d{4})\b/gi, ' ')
    .trim();

  // If after stripping generic filler words, virtually nothing remains, it's pure SEO spam!
  if (stripped.replace(/\s+/g, '').length < 3) return true;

  // 5. Title is purely an artist's name or combination of artists (e.g. "Sidhu Moose Wala Ft. Diljit Dosanjh" with no actual song name)
  const normTitle = title.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
  const normArtist = (artist || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();

  if (normArtist && normTitle === normArtist && normTitle.split(' ').length <= 4) return true;
  if (FAMOUS_ARTISTS.some(a => normTitle === a || normTitle === a.replace(/[^a-z0-9]/g, ' '))) return true;

  // Check if title consists only of artist names and connector words (ft, feat, vs, x, &) without a song title
  let strippedArtists = normTitle.replace(/\b(ft|feat|featuring|vs|x|and|with)\b/gi, ' ').trim();
  for (const a of FAMOUS_ARTISTS) {
    const na = a.replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
    strippedArtists = strippedArtists.replace(new RegExp(`\\b${na}\\b`, 'gi'), ' ').trim();
  }
  if (normArtist) {
    strippedArtists = strippedArtists.replace(new RegExp(`\\b${normArtist}\\b`, 'gi'), ' ').trim();
  }
  if (strippedArtists.replace(/\s+/g, '').length < 3) return true;

  // 6. Generic placeholder titles
  if (/^(track\s*\d+|audio\s*\d+|untitled|recording|new recording|voice memo|whatsapp audio|soundcloud track)$/i.test(normTitle)) {
    return true;
  }

  // 7. Overly long rambling keyword dump (> 65 chars with > 9 words)
  if (title.length > 65 && normTitle.split(/\s+/).length > 9) {
    return true;
  }

  return false;
}

// Convert text to clean Title Case
function toTitleCase(str: string = ''): string {
  if (!str) return '';
  return str.replace(/\w\S*/g, (txt) => {
    if (/^(feat\.?|ft\.?|vs\.?)$/i.test(txt)) return txt.toLowerCase();
    return txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase();
  });
}

// Clean track title to extract the original song name, removing Uploader noise, SEO tags, video labels, etc.
export function cleanTrackTitle(rawTitle: string = '', rawArtist: string = ''): string {
  if (!rawTitle || typeof rawTitle !== 'string') return '';
  let title = rawTitle.replace(/_+/g, ' ').trim();
  const artist = (rawArtist || '').trim();

  // Strip ripper file extensions: .mp3, .wav, .m4a, .aac, .flac, etc.
  title = title.replace(/\.(mp3|wav|m4a|aac|flac|ogg|opus)\b/gi, '').trim();

  // 1. If title contains pipe '|' or double slash '//' or bullet '•' or tilde '~',
  // everything after is almost exclusively promotional clutter
  if (/[|/•~]/.test(title)) {
    const parts = title.split(/[|/•~]/).map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0 && parts[0].length >= 2) {
      title = parts[0];
    }
  }

  // Strip ripper bitrate tags e.g. (256k), [320kbps], 128k
  title = title.replace(/[\(\[]?\b\d{2,3}k(bps)?\b[\)\]]?/gi, '').trim();

  // Strip standalone promo phrases
  title = title.replace(/\b(official\s+)?(music\s+)?(video|audio|visualizer|lyric(s)?)\b/gi, '');
  title = title.replace(/\b(latest|new)\s+(punjabi|hindi|gujarati|english|bollywood)?\s*songs?(\s+\d{4})?\b/gi, '');
  title = title.replace(/\b(full\s+song|audio\s+song|video\s+song|full\s+audio|full\s+video)\b/gi, '');
  title = title.replace(/\b(tiktok\s+viral|viral\s+trending|viral\s+reels?|reels?\s+trending|trending\s+audio|trending\s+song|reels?\s+audio)\b/gi, '');
  title = title.replace(/\b(whatsapp\s+status(\s+video)?|status\s+video)\b/gi, '');
  title = title.replace(/\b(slowed\s*\+?\s*reverb|slowed\s+and\s+reverb|bass\s+boosted|8d\s+audio|lofi\s+remix|lofi\s+flip)\b/gi, '');
  title = title.replace(/\b(vintage\s+records|black\s+virus|gdm\s+studio|speed\s+records|white\s+hill)\b/gi, '');
  title = title.replace(/\b(presented\s+by|produced\s+by|prod\.?\s+by|music\s+by|lyrics\s+by|directed\s+by)\s+.*$/gi, '');
  title = title.replace(/\b(singer\s*[:\-]?\s*.*$|starring\s*[:\-]?\s*.*$)/gi, '');

  // 2. Strip noise inside parentheses and brackets:
  const noiseRegex = /\b(official\s+)?(music\s+)?(video|audio|visualizer|lyric(s)?|hd|4k|1080p|720p|hq|uhd|320kbps|128kbps|256k|256kbps|lossless|high\s+quality)(\s+(song|video|track))?\b/i;
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
        // Standard music naming convention: [Artist] - [Song Title]
        // Left is the Artist, Right is the actual Song Title!
        title = right;
      }
    }
  }

  // 5. If title still starts with "Artist - " or ends with " - Artist"
  if (artist) {
    const escapedArtist = artist.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    title = title.replace(new RegExp(`^${escapedArtist}\\s*[-–—:]\\s*`, 'i'), '');
    title = title.replace(new RegExp(`\\s*[-–—:]\\s*${escapedArtist}$`, 'i'), '');
  }

  // 6. Clean up trailing/leading dashes, colons, brackets, or excess whitespace
  title = title
    .replace(/\(\s*\)/g, '')
    .replace(/\[\s*\]/g, '')
    .replace(/\s*[-–—:]\s*$/g, '')
    .replace(/^\s*[-–—:]\s*/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // If ALL CAPS or all lowercase, convert cleanly to Title Case
  if (title.length > 2 && (title === title.toUpperCase() || title === title.toLowerCase())) {
    title = toTitleCase(title);
  }

  return title || rawTitle;
}

export const UNOFFICIAL_TRACK_REGEX = /\b(remix|re-mix|remixed|remixing|mashup|mash-up|mash\s+up|dj\s+mix|club\s+mix|party\s+mix|party\s+remix|dance\s+mix|extended\s+mix|megamix|mega-mix|continuous\s+mix|non[- ]?stop|nonstop|mixtape|soundclash|dhol\s+mix|dubstep\s+mix|trap\s+mix|trance\s+mix|house\s+mix|edm\s+mix|bootleg|vip\s+edit|vip\s+mix|dj\s+edit|party\s+edit|club\s+edit|bass\s+boost(ed)?|high\s+bass|heavy\s+bass|car\s+bass|extra\s+bass|ultra\s+bass|synth\s+rework|re-drum|redrum|slowed|slowed\s*\+?\s*reverb|slowed\s+and\s+reverb|slowed\s+down|reverb\s+version|reverbed|sped\s+up|speed\s+up|speedup|speed-up|nightcore|daycore|[381]d\s+audio|[381]d\s+sound|8d\s+music|surround\s+sound|pitch\s+shift(ed)?|pitched\s+up|pitched\s+down|lofi\s+remix|lo-fi\s+remix|lofi\s+version|lo-fi\s+version|lofi\s+edit|lo-fi\s+edit|lofi\s+flip|lo-fi\s+flip|club\s+flip|bass\s+flip|remix\s+flip|acoustic\s+cover|piano\s+cover|guitar\s+cover|drum\s+cover|vocal\s+cover|female\s+cover|male\s+cover|violin\s+cover|flute\s+cover|orchestral\s+cover|live\s+cover|unplugged\s+cover|fan\s+cover|female\s+version|male\s+version|fan\s+version|fan\s+made|fanmade|tribute\s+version|tribute\s+to|parody\s+version|parody\s+song|ai\s+cover|ai\s+version|ai\s+song|ai\s+voice|ai\s+vocal|fingerstyle\s+guitar|fingerstyle\s+cover|synthesizer\s+cover|synth\s+cover|karaoke|minus\s+one|backing\s+track|without\s+vocals?|no\s+vocals?|vocals?\s+removed|acapella|a\s+cappella|bgm\s+only|bgm\s+cover|music\s+only|track\s+only|tutorial|how\s+to\s+play|reaction|reacting\s+to|review|podcast|interview|motivational\s+speech|political\s+speech|inspirational\s+speech|full\s+speech|dialogue\s+scene|movie\s+scene|film\s+scene|comedy\s+scene|status\s+video|whatsapp\s+status|reels\s+audio|reels\s+viral|tiktok\s+viral|tiktok\s+sound|trending\s+sound|ringtone|caller\s+tune|teaser|trailer|motion\s+poster|preview\s+clip|short\s+clip|snippet|leaked\s+audio|unreleased\s+snippet|10\s+hours|1\s+hour\s+loop|loop\s+1\s+hour|hours\s+loop)\b/i;

export const COVER_PATTERNS = /(\bcovered?\s+by\b|[\(\[]\s*cover\s*[\)\]]|\s*[-–—:]\s*cover\b|\bcover\s+(version|song|by|audio|track)\b|\bcover$|\b\w+\s+cover\b)/i;
export const AI_PATTERNS = /\b(ai\s+.*?(cover|version|song|voice|remake)|ai\s+generated)\b/i;
export const INSTRUMENTAL_PATTERNS = /([\(\[]\s*instrumental\s*[\)\]]|\s*[-–—:]\s*instrumental\b|\binstrumental\s+(version|cover|track)\b)/i;

export function isOfficialOriginalSong(rawTitle: string = '', artist: string = '', genre: string = '', duration: number = 0): boolean {
  if (!rawTitle || typeof rawTitle !== 'string') return false;
  // Strict commercial song duration: 75 seconds to 480 seconds (8 minutes max)
  if (duration > 0 && (duration < 75 || duration > 480)) return false;

  const combined = `${rawTitle} ${artist || ''} ${genre || ''}`;
  if (UNOFFICIAL_TRACK_REGEX.test(combined)) return false;
  if (COVER_PATTERNS.test(combined)) return false;
  if (AI_PATTERNS.test(combined)) return false;
  if (INSTRUMENTAL_PATTERNS.test(combined)) return false;

  return true;
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
  let url = `/api/search?q=${encodeURIComponent(trimmed)}&lang=${encodeURIComponent(language)}&offset=${offset}`;
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
    const cleanedTracks = (data.tracks || [])
      .filter((t: Track) => isOfficialOriginalSong(t.title, t.artist, t.genre, t.duration) && !isJunkOrSpamTrack(t.title, t.artist))
      .map((t: Track) => ({
        ...t,
        title: cleanTrackTitle(t.title, t.artist),
        isOfficial: true,
        isMixed: false
      }))
      .filter((t: Track) => isOfficialOriginalSong(t.title, t.artist, t.genre, t.duration) && !isJunkOrSpamTrack(t.title, t.artist));
    return {
      tracks: cleanedTracks,
      message: data.message,
      offset: data.offset,
      hasMore: data.hasMore
    };
  } catch (err) {
    console.warn('Search query error, falling back to curated:', err);
    const curated = await getCuratedTracks();
    return { tracks: curated, hasMore: false };
  }
}

export async function getSearchSuggestions(query: string, language: string = 'all', mode: 'normal' | 'mixed' = 'normal'): Promise<string[]> {
  try {
    const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query.trim())}&lang=${encodeURIComponent(language)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.suggestions || [];
  } catch (err) {
    return [];
  }
}

export async function getCuratedTracks(mode: 'normal' | 'mixed' = 'normal'): Promise<Track[]> {
  try {
    const res = await fetch('/api/tracks/curated');
    if (!res.ok) throw new Error('Curated fetch failed');
    const data = await res.json();
    return (data.tracks || [])
      .filter((t: Track) => isOfficialOriginalSong(t.title, t.artist, t.genre, t.duration) && !isJunkOrSpamTrack(t.title, t.artist))
      .map((t: Track) => ({
        ...t,
        title: cleanTrackTitle(t.title, t.artist),
        isOfficial: true,
        isMixed: false
      }))
      .filter((t: Track) => isOfficialOriginalSong(t.title, t.artist, t.genre, t.duration) && !isJunkOrSpamTrack(t.title, t.artist));
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
