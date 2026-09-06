import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import play from 'play-dl';
import { CURATED_TRACKS } from './curatedTracks.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingInterval: 10000,
  pingTimeout: 5000,
});

app.use(cors());
app.use(express.json());

// Initialize SoundCloud Full-Track Streaming Client
let soundcloudReady = false;
async function initSoundCloud() {
  try {
    const clientId = await play.getFreeClientID();
    await play.setToken({ soundcloud: { client_id: clientId } });
    soundcloudReady = true;
    console.log('> SoundCloud Full-Track Engine Initialized');
  } catch (e) {
    console.warn('SoundCloud init notice:', e.message);
  }
}
initSoundCloud();

// In-Memory Room Store
/**
 * Room Schema:
 * {
 *   code: string,
 *   createdAt: number,
 *   hostId: string,
 *   users: Map<string, { id, name, role, isAudioReady, avatarColor }>,
 *   queue: Array<Track>,
 *   currentTrack: Track | null,
 *   playbackState: {
 *     status: 'playing' | 'paused' | 'stopped',
 *     scheduledServerTime: number,
 *     scheduledPosition: number,
 *     lastPausedPosition: number,
 *     duration: number
 *   },
 *   chatMessages: Array<{ id, user, text, timestamp, isSystem }>
 * }
 */
const rooms = new Map();

// Helper to generate fun anonymous names
const ADJECTIVES = [
  'Neon', 'Cyber', 'Cosmic', 'Electric', 'Sonic', 'Astral', 'Hyper',
  'Pulse', 'Quantum', 'Glitch', 'Turbo', 'Vibe', 'Solar', 'Velvet', 'Prism'
];
const ANIMALS = [
  'Tiger', 'Falcon', 'Panda', 'Wolf', 'Panther', 'Fox', 'Viper',
  'Otter', 'Jaguar', 'Lynx', 'Raven', 'Eagle', 'Cheetah', 'Badger', 'Cobra'
];
const AVATAR_COLORS = [
  '#00f0ff', '#9d4edd', '#ff007f', '#00ff88', '#ffb703', '#3a86ff', '#fb5607'
];

function generateGuestName() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const num = Math.floor(10 + Math.random() * 90);
  return `${adj}-${animal}-${num}`;
}

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function calculateCurrentTrackPosition(room) {
  if (!room.currentTrack || room.playbackState.status !== 'playing') {
    return room.playbackState.lastPausedPosition || 0;
  }
  const now = Date.now();
  const elapsed = (now - room.playbackState.scheduledServerTime) / 1000;
  const pos = Math.max(0, (room.playbackState.scheduledPosition || 0) + elapsed);
  return Math.min(pos, room.playbackState.duration || Infinity);
}

function sortQueue(queue) {
  return [...queue].sort((a, b) => (a.addedAt || 0) - (b.addedAt || 0));
}

// ----------------------------------------------------
// REST API ENDPOINTS
// ----------------------------------------------------

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', serverTime: Date.now(), activeRooms: rooms.size });
});

// Network info for mobile QR code sync
function getLocalNetworkIp() {
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
  } catch (e) {}
  return 'localhost';
}

app.get('/api/network-info', (req, res) => {
  res.json({
    localIp: getLocalNetworkIp(),
    serverPort: PORT,
  });
});

// Curated library endpoint
app.get('/api/tracks/curated', (req, res) => {
  res.json({ tracks: CURATED_TRACKS });
});

// Full Track Audio Stream Proxy Endpoint (SoundCloud Progressive MP3)
app.get('/api/stream/soundcloud', async (req, res) => {
  const progUrl = req.query.progUrl;
  if (!progUrl) return res.status(400).send('Missing progUrl');

  try {
    const clientId = await play.getFreeClientID();
    const mediaRes = await fetch(`${progUrl}?client_id=${clientId}`);
    if (!mediaRes.ok) throw new Error('SoundCloud media fetch error');
    const data = await mediaRes.json();
    if (data.url) {
      // Direct redirect to Cloudflare high-speed audio CDN with CORS *
      return res.redirect(302, data.url);
    }
    res.status(404).send('Stream URL not found');
  } catch (err) {
    console.error('SoundCloud stream error:', err.message);
    if (!res.headersSent) res.status(500).send('Streaming error');
  }
});

// ----------------------------------------------------
// LANGUAGE FILTERING & CLASSIFICATION (English, Hindi, Gujarati, Punjabi)
// ----------------------------------------------------
// STRICT LANGUAGE FILTERING ENGINE:
// ONLY English, Hindi, Gujarati, and Punjabi songs are permitted on MusicSync.
// All foreign languages (Spanish, French, German, Italian, Portuguese, Korean, Japanese, Chinese, Arabic, Russian, etc.) are strictly disallowed.
// ----------------------------------------------------
const GUJARATI_SCRIPT_REGEX = /[\u0A80-\u0AFF]/;
const PUNJABI_SCRIPT_REGEX = /[\u0A00-\u0A7F]/;
const HINDI_SCRIPT_REGEX = /[\u0900-\u097F]/;

// Non-allowed scripts (Korean, Japanese, Chinese, Cyrillic, Arabic, Hebrew, Thai, Greek, Tamil, Telugu, Kannada, Malayalam, Bengali)
const DISALLOWED_SCRIPTS_REGEX = /[\uAC00-\uD7AF\u1100-\u11FF\u3040-\u30FF\u31F0-\u31FF\u4E00-\u9FFF\u0400-\u04FF\u0600-\u06FF\u0750-\u077F\u0590-\u05FF\u0E00-\u0E7F\u0370-\u03FF\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F]/;

// Accented Latin characters specific to foreign languages (Spanish, Portuguese, French, German, Italian, Turkish, Polish, Nordic)
const DISALLOWED_CHARACTERS_REGEX = /[ñç¿¡ßãõğşıİłąęśćżźńøåæœčšž]/i;

// Regex patterns for foreign keywords, genres, and artist names that are strictly blocked
const DISALLOWED_REGEX_PATTERNS = [
  // Spanish / Latin / Reggaeton
  /\b(despacito|reggaeton|reggaet[oó]n|latino|latina|coraz[oó]n|canci[oó]n|m[uú]sica|te quiero|te amo|mi gente|bailando|adi[oó]s|conmigo|contigo|se[nñ]orita|perreo|bachata|cumbia|flamenco|mariachi|ranchera|corridos?|dembow|hermano|hermana|noche|verano|caliente|bonita|bonito|feliz|chica|chico|mujer|hombre|espa[nñ]ol|spanish|luis fonsi|daddy yankee|bad bunny|ozuna|j balvin|maluma|rosal[ií]a|anuel|karol g|enrique iglesias|shakira|ricky martin|becky g|camila cabello|farruko|nicky jam|romeo santos|prince royce|rauw alejandro|feid|peso pluma|natanael cano|grupo frontera|fuerza regida|carin leon|christian nodal|alejandro sanz|juanes)\b/i,
  // French
  /\b(fran[cç]ais|french|chanson|toujours|jamais|avec|c[oœ]ur|paris|stromae|aya nakamura|gims|booba|indila|ang[eè]le|kendji|soprano|dadju|ninho|sch|plk|damso)\b/i,
  // German
  /\b(deutsch|german|liebe|nacht|leben|herz|wieder|rammstein|apache 207|bonez mc|raf camora|capital bra|peter fox)\b/i,
  // Portuguese / Brazilian
  /\b(portugu[eê]s|brasil|brazil|funk rj|sertanejo|anitta|luan santana|mar[ií]lia mendon[cç]a|gusttavo lima|z[eé] neto|pedro sampaio|matue)\b/i,
  // Italian
  /\b(italiano|italian|canzone|amore|sempre|bella ciao|m[aå]neskin|andrea bocelli|eros ramazzotti|laura pausini|tiziano ferro|fedez|sfera ebbasta|blanco|mahmood)\b/i,
  // K-Pop / Korean
  /\b(k-pop|kpop|korean|bts|blackpink|stray kids|twice|exo|nct|seventeen|enhypen|newjeans|le sserafim|aespa|itzy|ateez|red velvet|mamamoo|shinee|super junior|bigbang|jungkook|kdrama)\b/i,
  // J-Pop / Anime / Japanese
  /\b(j-pop|jpop|japanese|anime|vocaloid|hatsune miku|yoasobi|kenshi yonezu|radwimps|aimer|naruto|attack on titan|demon slayer|jujutsu kaisen|one piece|tokyo ghoul|bleach)\b/i,
  // Arabic / Turkish / Russian
  /\b(arabic|turkish|russian|habibi|amr diab|nancy ajram|tarkan|morgenshtern|miyagi)\b/i
];

const GUJARATI_KEYWORDS = [
  'gujarati', 'garba', 'khalasi', 'gadhvi', 'kinjal', 'kirtidan', 'geeta rabari',
  'mor bani', 'dandiya', 'sanedo', 'tahukar', 'chogada', 'gujju', 'dayro', 'aditya gadhvi',
  'jignesh', 'osman mir', 'dakla', 'dholida', 'raas', 'khelo', 'kamlesh barot', 'rohit thakor',
  'vijay suvada', 'vikram thakor', 'char bangdi', 'pankhida', 'gujarat'
];

const PUNJABI_KEYWORDS = [
  'punjabi', 'diljit', 'dosanjh', 'moose wala', 'moosetape', 'ap dhillon', 'karan aujla', 'shubh',
  'b praak', 'amrit maan', 'sidhu', 'jassi', 'honey singh', 'hardy sandhu', 'harrdy sandhu',
  'guru randhawa', 'ammy virk', 'bhangra', 'boliyan', 'tappe', 'munde', 'parmish verma',
  'maninder buttar', 'jass manak', 'sukhe', 'bohemia', 'gidha', 'dhol', 'patiala', 'tarsem jassar',
  'mankirt aulakh', 'kulwinder billa', 'tauba tauba', 'jasleen royal'
];

const HINDI_KEYWORDS = [
  'hindi', 'bollywood', 'arijit', 'atif aslam', 'atif', 'shreya ghoshal', 'shreya', 'pritam',
  'neha kakkar', 'jubin', 'sonu nigam', 'kishore kumar', 'kishore', 'lata mangeshkar', 'lata',
  'kumar sanu', 'udit narayan', 'badshah', 'armaan malik', 'kk', 'alka yagnik', 'kesariya',
  'tum hi ho', 'channa mereya', 'shayari', 'ghazal', 'lofi hindi', 'sunidhi', 'mohit chauhan',
  'shaan', 'darshan raval', 'anuv jain', 'prateek kuhad', 'amit trivedi', 'vishal shekhar',
  'sachin jigar', 'mithoon', 'himesh reshammiya', 'raftaar', 'emiway', 'mc stan', 'divine',
  'king', 'seedhe maut', 't-series', 'zeemusic'
];

function isDisallowedForeignText(text = '') {
  if (DISALLOWED_SCRIPTS_REGEX.test(text)) return true;
  if (DISALLOWED_CHARACTERS_REGEX.test(text)) return true;
  for (const pattern of DISALLOWED_REGEX_PATTERNS) {
    if (pattern.test(text)) return true;
  }
  return false;
}

function classifyTrackLanguage(title = '', artist = '', genre = '') {
  const text = `${title} ${artist} ${genre}`.toLowerCase();

  // 1. Strictly block foreign non-allowed languages
  if (isDisallowedForeignText(text)) return null;

  // 2. Gujarati check
  if (GUJARATI_SCRIPT_REGEX.test(text) || GUJARATI_KEYWORDS.some(kw => text.includes(kw))) {
    return { name: 'Gujarati', badge: '🪘 Gujarati' };
  }

  // 3. Punjabi check
  if (PUNJABI_SCRIPT_REGEX.test(text) || PUNJABI_KEYWORDS.some(kw => text.includes(kw))) {
    return { name: 'Punjabi', badge: '🎶 Punjabi' };
  }

  // 4. Hindi check
  if (HINDI_SCRIPT_REGEX.test(text) || HINDI_KEYWORDS.some(kw => text.includes(kw))) {
    return { name: 'Hindi', badge: '🇮🇳 Hindi' };
  }

  // 5. English default for remaining Latin text
  return { name: 'English', badge: '🇬🇧 English' };
}

const SEARCH_AUTOCOMPLETE_DATABASE = {
  hindi: [
    'Arijit Singh', 'Arijit Singh Romantic Hits', 'Arijit Singh Lofi', 'Arijit Singh Sad Songs',
    'Atif Aslam', 'Atif Aslam Live', 'Atif Aslam Mashup',
    'Shreya Ghoshal', 'Pritam', 'Pritam Bollywood Hits',
    'Kesariya', 'Tum Hi Ho', 'Channa Mereya', 'Raataan Lambiyan', 'Apna Bana Le',
    'Neha Kakkar', 'Jubin Nautiyal', 'Sonu Nigam 90s', 'Kishore Kumar Classics',
    'Lata Mangeshkar', 'Kumar Sanu Melodies', 'Udit Narayan', 'Badshah Party Hits',
    'Armaan Malik', 'KK Nostalgia', 'Alka Yagnik', 'Mohit Chauhan', 'Shaan',
    'Darshan Raval', 'Anuv Jain', 'Prateek Kuhad', 'Amit Trivedi', 'Sachin-Jigar',
    'Bollywood Lofi Chill', 'Bollywood 90s Romantic', 'Desi Hip-Hop Divine', 'Seedhe Maut', 'King Maan Meri Jaan'
  ],
  punjabi: [
    'Diljit Dosanjh', 'Diljit Dosanjh Lover', 'Diljit Dosanjh G.O.A.T.', 'Diljit Dosanjh Born to Shine',
    'Sidhu Moose Wala', 'Sidhu Moose Wala 295', 'Sidhu Moose Wala The Last Ride', 'Moosetape',
    'Karan Aujla', 'Karan Aujla Tauba Tauba', 'Karan Aujla Winning Speech', 'Karan Aujla Making Memories',
    'AP Dhillon', 'AP Dhillon Brown Munde', 'AP Dhillon Excuses', 'AP Dhillon Insane',
    'Shubh', 'Shubh Cheques', 'Shubh Elevated', 'Shubh Baller',
    'Amrit Maan', 'B Praak Filhall', 'B Praak Teri Mitti', 'Guru Randhawa High Rated Gabru',
    'Ammy Virk', 'Parmish Verma', 'Jass Manak Lehanga', 'Honey Singh Dope Shope',
    'Bhangra Dhol High Bass', 'Punjabi Car Bass Mix', 'Punjabi Club Party', 'UK Punjabi Sound'
  ],
  gujarati: [
    'Aditya Gadhvi', 'Khalasi Coke Studio', 'Aditya Gadhvi Garba', 'Aditya Gadhvi Dayro',
    'Kinjal Dave', 'Kinjal Dave Char Char Bangdi', 'Kinjal Dave Garba',
    'Kirtidan Gadhvi', 'Kirtidan Gadhvi Tahukar', 'Kirtidan Gadhvi Dayro',
    'Geeta Rabari', 'Geeta Rabari Rona Serma', 'Geeta Rabari Garba',
    'Chogada Tara', 'Mor Bani Thanghat Kare', 'Sanedo Sanedo', 'Dholida Dhol Re Vagad',
    'Dakla DJ Mix High Bass', 'Navratri Non Stop Garba', 'Falguni Pathak Dandiya',
    'Atul Purohit Tara Vina Shyam', 'Osman Mir Folk', 'Jignesh Kaviraj', 'Vijay Suvada',
    'Vikram Thakor', 'Gujarat Folk Fusion', 'Titoda Non Stop', 'Dandiya Raas High Energy'
  ],
  english: [
    'The Weeknd', 'The Weeknd Blinding Lights', 'The Weeknd Starboy', 'The Weeknd After Hours',
    'Coldplay', 'Coldplay Yellow', 'Coldplay Viva La Vida', 'Coldplay Fix You', 'Coldplay Hymn For The Weekend',
    'Dua Lipa', 'Dua Lipa Levitating', 'Dua Lipa Don\'t Start Now', 'Dua Lipa Houdini',
    'Ed Sheeran', 'Ed Sheeran Shape of You', 'Ed Sheeran Perfect', 'Ed Sheeran Bad Habits',
    'Taylor Swift', 'Taylor Swift Cruel Summer', 'Taylor Swift Anti-Hero',
    'Drake', 'Drake God\'s Plan', 'Drake Hotline Bling', 'Post Malone Circles',
    'Billie Eilish', 'Bruno Mars', 'Imagine Dragons Believer', 'Eminem',
    'Synthwave 80s Cyberpunk', 'Deep House Club Mix', 'EDM Festival Anthems', 'Lo-Fi Chill Beats', 'Retro Wave'
  ]
};

// Autocomplete suggestions endpoint
app.get('/api/search/suggestions', (req, res) => {
  const query = (req.query.q || '').toString().trim().toLowerCase();
  const lang = (req.query.lang || 'all').toString().trim().toLowerCase();

  let pool = [];
  if (lang === 'all') {
    pool = [
      ...SEARCH_AUTOCOMPLETE_DATABASE.hindi,
      ...SEARCH_AUTOCOMPLETE_DATABASE.punjabi,
      ...SEARCH_AUTOCOMPLETE_DATABASE.gujarati,
      ...SEARCH_AUTOCOMPLETE_DATABASE.english
    ];
  } else if (SEARCH_AUTOCOMPLETE_DATABASE[lang]) {
    pool = SEARCH_AUTOCOMPLETE_DATABASE[lang];
  } else {
    pool = SEARCH_AUTOCOMPLETE_DATABASE.english;
  }

  if (!query) {
    return res.json({ suggestions: pool.slice(0, 8) });
  }

  const matches = pool.filter(item => item.toLowerCase().includes(query)).slice(0, 8);
  res.json({ suggestions: matches });
});

// Universal Search & Limitless Suggestions Endpoint (Exclusively English, Hindi, Gujarati, Punjabi)
app.get('/api/search', async (req, res) => {
  const query = (req.query.q || '').toString().trim().toLowerCase();
  const selectedLang = (req.query.lang || 'all').toString().trim().toLowerCase();
  const offset = Math.max(0, parseInt(req.query.offset) || 0);
  const limit = Math.min(50, Math.max(10, parseInt(req.query.limit) || 30));

  // If query itself targets a disallowed foreign language (e.g. 'despacito', 'bts', 'spanish songs')
  if (query && isDisallowedForeignText(query)) {
    return res.json({
      tracks: [],
      hasMore: false,
      offset: 0,
      message: 'MusicSync strictly curates songs in English, Hindi, Gujarati, and Punjabi only.'
    });
  }

  const rawTracks = [];
  const userArtists = (req.query.artists || '').toString().trim();

  // If no query is typed, generate limit-less suggestions based on selected language & offset
  let scQuery = query;
  if (!query) {
    // Curated library starter matches (only on first page offset 0, sorted with trending first)
    if (offset === 0) {
      const filteredCurated = CURATED_TRACKS.filter(t => {
        if (selectedLang === 'all' || selectedLang === 'trending' || selectedLang === 'for_you') return true;
        return t.language?.toLowerCase() === selectedLang;
      }).sort((a, b) => (a.trendingRank || 99) - (b.trendingRank || 99));
      rawTracks.push(...filteredCurated);
    }

    // Dynamic limitless suggestion search queries per language
    const suggestionQueries = {
      hindi: ['bollywood trending hits 2024', 'sari duniya jala denge', 'kesariya arijit singh', 'bollywood lofi chill', 't-series latest party'],
      punjabi: ['tauba tauba karan aujla', 'latest punjabi hits', 'diljit dosanjh lover', 'sidhu moose wala 295', 'punjabi bhangra dhol'],
      gujarati: ['khalasi aditya gadhvi', 'gujarati garba songs non stop', 'chogada tara mor bani', 'kinjal dave geeta rabari', 'dandiya raas high bass'],
      english: ['the weeknd starboy blinding lights', 'top billboard pop hits', 'coldplay dua lipa', 'trending synthwave edm club', 'chill lofi english beats'],
      all: ['tauba tauba khalasi starboy', 'trending party songs 2024', 'punjabi hindi english hits', 'top bollywood and pop', 'best dance tracks dhol edm'],
      trending: ['trending chartbusters 2024', 'tauba tauba khalasi starboy', 'viral hits hindi punjabi english', 'top billboard bollywood'],
      for_you: userArtists ? [userArtists, `${userArtists} hits`, `${userArtists} live`] : ['trending party songs 2024', 'top bollywood and pop']
    };

    const qList = suggestionQueries[selectedLang] || suggestionQueries.all;
    const qIndex = Math.floor(offset / limit) % qList.length;
    scQuery = qList[qIndex];
  } else {
    // Curated library matches matching query on first page
    if (offset === 0) {
      const curatedMatches = CURATED_TRACKS.filter(t =>
        t.title.toLowerCase().includes(query) ||
        t.artist.toLowerCase().includes(query) ||
        t.genre.toLowerCase().includes(query)
      ).sort((a, b) => (a.trendingRank || 99) - (b.trendingRank || 99));
      rawTracks.push(...curatedMatches);
    }
  }

  // 1. Query SoundCloud for Full-Length Tracks (>= 75 seconds) with pagination
  try {
    const clientId = await play.getFreeClientID();
    const scUrl = `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(scQuery)}&client_id=${clientId}&limit=${limit}&offset=${offset}`;
    const scRes = await fetch(scUrl);
    if (scRes.ok) {
      const data = await scRes.json();
      if (data.collection && Array.isArray(data.collection)) {
        for (const item of data.collection) {
          const durSec = Math.round((item.duration || 0) / 1000);
          if (durSec >= 75) {
            const prog = item.media?.transcodings?.find(t => t.format.protocol === 'progressive');
            if (prog) {
              rawTracks.push({
                id: `sc-${item.id}`,
                title: item.title,
                artist: item.user?.username || item.publisher_metadata?.artist || 'SoundCloud Artist',
                album: 'Full Track',
                duration: durSec,
                genre: item.genre || 'Full Song',
                artwork: item.artwork_url ? item.artwork_url.replace('-large', '-t500x500') : (item.user?.avatar_url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80'),
                audioUrl: `/api/stream/soundcloud?progUrl=${encodeURIComponent(prog.url)}`,
                source: 'SoundCloud (Full Song)'
              });
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('SoundCloud search error:', err.message);
  }

  // 2. Query Audius Search API for Full-Length Tracks (>= 75 seconds)
  if (query) {
    try {
      const audiusDiscoveryUrl = 'https://discoveryprovider.audius.co/v1/tracks/search';
      const audiusRes = await fetch(`${audiusDiscoveryUrl}?query=${encodeURIComponent(query)}&app_name=musicsync&limit=10&offset=${offset}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (audiusRes.ok) {
        const audiusData = await audiusRes.json();
        if (audiusData.data && Array.isArray(audiusData.data)) {
          for (const track of audiusData.data) {
            const durSec = track.duration || 0;
            if (track.is_streamable !== false && durSec >= 75) {
              rawTracks.push({
                id: `audius-${track.id}`,
                title: track.title,
                artist: track.user ? track.user.name : 'Unknown Artist',
                album: 'Audius Release',
                duration: durSec,
                genre: track.genre || 'Electronic',
                artwork: track.artwork ? track.artwork['480x480'] || track.artwork['150x150'] : 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80',
                audioUrl: `https://discoveryprovider.audius.co/v1/tracks/${track.id}/stream?app_name=musicsync`,
                source: 'Audius (Full Song)'
              });
            }
          }
        }
      }
    } catch (err) {
      console.warn('Audius API search error:', err.message);
    }
  }

  // Deduplicate and filter exclusively allowed languages: English, Hindi, Punjabi, Gujarati
  const seenIds = new Set();
  const filteredResults = [];

  for (const t of rawTracks) {
    if (seenIds.has(t.id)) continue;
    seenIds.add(t.id);

    const langInfo = t.language ? { name: t.language, badge: t.languageBadge } : classifyTrackLanguage(t.title, t.artist, t.genre);
    if (!langInfo) continue; // Disallowed foreign language

    // If specific language is requested, filter strictly
    if (selectedLang !== 'all' && selectedLang !== 'trending' && selectedLang !== 'for_you' && langInfo.name.toLowerCase() !== selectedLang) {
      continue;
    }

    filteredResults.push({
      ...t,
      language: langInfo.name,
      languageBadge: langInfo.badge
    });
  }

  // Ensure trending chartbusters appear FIRST in suggestions
  if (offset === 0 && !query) {
    filteredResults.sort((a, b) => {
      const rankA = a.isTrending ? (a.trendingRank || 1) : 999;
      const rankB = b.isTrending ? (b.trendingRank || 1) : 999;
      return rankA - rankB;
    });
  }

  res.json({
    tracks: filteredResults,
    offset: offset + limit,
    hasMore: rawTracks.length > 0
  });
});

// Serve frontend in production
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/socket.io/')) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) res.status(200).send('MusicSync Server Running. Please start client in dev mode or build frontend.');
  });
});

// ----------------------------------------------------
// SOCKET.IO REAL-TIME & NTP SYNC CORE
// ----------------------------------------------------

io.on('connection', (socket) => {
  let currentRoomCode = null;
  let currentUser = null;

  // 1. High Precision NTP Clock Synchronization (Ping-Pong)
  socket.on('ntp_ping', (data) => {
    // data contains client timestamp t0
    socket.emit('ntp_pong', {
      t0: data.t0,
      serverTime: Date.now()
    });
  });

  // 2. Room Creation
  socket.on('create_room', (data, callback) => {
    let code = generateRoomCode();
    while (rooms.has(code)) {
      code = generateRoomCode();
    }

    const userName = data?.userName?.trim() || generateGuestName();
    const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

    const user = {
      id: socket.id,
      name: userName,
      role: 'host',
      isAudioReady: false,
      avatarColor,
      joinedAt: Date.now()
    };

    const newRoom = {
      code,
      createdAt: Date.now(),
      hostId: socket.id,
      users: new Map([[socket.id, user]]),
      queue: [],
      currentTrack: null,
      playbackState: {
        status: 'stopped',
        scheduledServerTime: 0,
        scheduledPosition: 0,
        lastPausedPosition: 0,
        duration: 0
      },
      chatMessages: [
        {
          id: `msg-${Date.now()}`,
          user: { name: 'System', role: 'system', avatarColor: '#00f0ff' },
          text: `Room ${code} created! Turn your devices into synchronized speakers.`,
          timestamp: Date.now(),
          isSystem: true
        }
      ],
      masterVolume: 0.9
    };

    rooms.set(code, newRoom);
    currentRoomCode = code;
    currentUser = user;

    socket.join(code);

    const roomSnapshot = serializeRoom(newRoom);
    if (typeof callback === 'function') {
      callback({ success: true, room: roomSnapshot, user });
    }
  });

  // 3. Room Joining
  socket.on('join_room', ({ roomCode, userName, previousRole, avatarColor: savedColor }, callback) => {
    const code = (roomCode || '').trim().toUpperCase();
    const room = rooms.get(code);

    if (!room) {
      if (typeof callback === 'function') {
        return callback({ success: false, error: 'Room not found. Please check the code.' });
      }
      return;
    }

    const finalName = (userName && userName.trim()) ? userName.trim() : generateGuestName();
    const avatarColor = savedColor || AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

    // Role persistence: If room has 0 active users, or previousRole was host, restore host status
    let role = 'listener';
    if (room.users.size === 0 || previousRole === 'host' || room.hostId === socket.id) {
      role = 'host';
      room.hostId = socket.id;
    } else if (previousRole === 'dj') {
      role = 'dj';
    }

    const user = {
      id: socket.id,
      name: finalName,
      role,
      isAudioReady: false,
      avatarColor,
      joinedAt: Date.now()
    };

    room.users.set(socket.id, user);
    currentRoomCode = code;
    currentUser = user;

    socket.join(code);

    const joinMessage = {
      id: `msg-${Date.now()}`,
      user: { name: 'System', role: 'system', avatarColor: '#00f0ff' },
      text: `${finalName} joined the party! 🎧`,
      timestamp: Date.now(),
      isSystem: true
    };
    room.chatMessages.push(joinMessage);
    if (room.chatMessages.length > 100) room.chatMessages.shift();

    // Broadcast updated user list and join message
    io.to(code).emit('room_users_updated', {
      users: Array.from(room.users.values())
    });
    io.to(code).emit('new_chat_message', joinMessage);

    const roomSnapshot = serializeRoom(room);
    if (typeof callback === 'function') {
      callback({ success: true, room: roomSnapshot, user });
    }
  });

  // 4. Update Speaker Audio Unlock Status
  socket.on('set_audio_ready', ({ isReady }) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;
    const user = room.users.get(socket.id);
    if (user) {
      user.isAudioReady = !!isReady;
      io.to(currentRoomCode).emit('room_users_updated', {
        users: Array.from(room.users.values())
      });
    }
  });

  // 5. Host / DJ Playback Scheduling Controls
  // Pre-buffer lead time: 1200ms allows network transit & audio buffer prep
  const BUFFER_LEAD_MS = 1200;

  socket.on('request_play', ({ track, position }) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    // Verify role (Host or DJ)
    const user = room.users.get(socket.id);
    if (!user || (user.role !== 'host' && user.role !== 'dj')) {
      return socket.emit('error_message', 'Only Host or DJ can control playback.');
    }

    // Determine target track
    const targetTrack = track || room.currentTrack || room.queue[0];
    if (!targetTrack) return;

    const startPos = (typeof position === 'number' && position >= 0)
      ? position
      : (room.currentTrack?.id === targetTrack.id ? calculateCurrentTrackPosition(room) : 0);

    const scheduledTime = Date.now() + BUFFER_LEAD_MS;

    room.currentTrack = targetTrack;
    room.playbackState = {
      status: 'playing',
      scheduledServerTime: scheduledTime,
      scheduledPosition: startPos,
      lastPausedPosition: startPos,
      duration: targetTrack.duration || 0
    };

    // If track was from queue, remove it from queue
    if (room.queue.length > 0 && room.queue[0].id === targetTrack.id) {
      room.queue.shift();
      io.to(currentRoomCode).emit('queue_updated', { queue: room.queue });
    }

    io.to(currentRoomCode).emit('playback_scheduled', {
      track: room.currentTrack,
      status: 'playing',
      scheduledServerTime: scheduledTime,
      startPosition: startPos,
      serverTime: Date.now()
    });
  });

  socket.on('request_pause', () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    const user = room.users.get(socket.id);
    if (!user || (user.role !== 'host' && user.role !== 'dj')) return;

    const currentPos = calculateCurrentTrackPosition(room);
    room.playbackState.status = 'paused';
    room.playbackState.lastPausedPosition = currentPos;
    room.playbackState.scheduledServerTime = 0;

    io.to(currentRoomCode).emit('playback_paused', {
      position: currentPos,
      serverTime: Date.now()
    });
  });

  socket.on('request_seek', ({ position }) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || !room.currentTrack) return;

    const user = room.users.get(socket.id);
    if (!user || (user.role !== 'host' && user.role !== 'dj')) return;

    const seekPos = Math.max(0, position);
    const isPlaying = room.playbackState.status === 'playing';

    if (isPlaying) {
      const scheduledTime = Date.now() + 1000;
      room.playbackState.scheduledServerTime = scheduledTime;
      room.playbackState.scheduledPosition = seekPos;
      room.playbackState.lastPausedPosition = seekPos;

      io.to(currentRoomCode).emit('playback_scheduled', {
        track: room.currentTrack,
        status: 'playing',
        scheduledServerTime: scheduledTime,
        startPosition: seekPos,
        serverTime: Date.now()
      });
    } else {
      room.playbackState.lastPausedPosition = seekPos;
      io.to(currentRoomCode).emit('playback_seeked', {
        position: seekPos,
        serverTime: Date.now()
      });
    }
  });

  socket.on('request_skip', () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    const user = room.users.get(socket.id);
    if (!user || (user.role !== 'host' && user.role !== 'dj')) return;

    if (room.queue.length > 0) {
      const nextTrack = room.queue.shift();
      room.currentTrack = nextTrack;
      const scheduledTime = Date.now() + BUFFER_LEAD_MS;

      room.playbackState = {
        status: 'playing',
        scheduledServerTime: scheduledTime,
        scheduledPosition: 0,
        lastPausedPosition: 0,
        duration: nextTrack.duration || 0
      };

      io.to(currentRoomCode).emit('queue_updated', { queue: room.queue });
      io.to(currentRoomCode).emit('playback_scheduled', {
        track: nextTrack,
        status: 'playing',
        scheduledServerTime: scheduledTime,
        startPosition: 0,
        serverTime: Date.now()
      });
    } else {
      room.playbackState.status = 'stopped';
      room.playbackState.lastPausedPosition = 0;
      room.playbackState.scheduledPosition = 0;
      io.to(currentRoomCode).emit('playback_paused', {
        position: 0,
        serverTime: Date.now()
      });
    }
  });

  // 5b. Master Volume Control across all connected devices (Host only)
  socket.on('set_master_volume', ({ volume }) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    const user = room.users.get(socket.id);
    if (!user || user.role !== 'host') {
      return socket.emit('error_message', 'Only Room Host can adjust Master Volume across all devices.');
    }

    const val = Number(volume);
    if (isNaN(val)) return;

    const clamped = Math.max(0, Math.min(1, Math.round(val * 100) / 100));
    room.masterVolume = clamped;

    io.to(currentRoomCode).emit('master_volume_updated', {
      volume: clamped,
      setBy: user.name
    });
  });

  // 6. Collaborative Queue & Democratic Voting
  socket.on('queue_add', ({ track }) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || !track) return;

    const user = room.users.get(socket.id);
    const queueItem = {
      ...track,
      queueId: `q-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      addedBy: user ? user.name : 'Guest',
      addedAt: Date.now(),
      upvotes: user ? [user.id] : [],
      downvotes: []
    };

    // If nothing is playing and queue is empty, auto-play right away!
    if (!room.currentTrack && room.playbackState.status !== 'playing' && room.queue.length === 0) {
      room.currentTrack = queueItem;
      const scheduledTime = Date.now() + BUFFER_LEAD_MS;
      room.playbackState = {
        status: 'playing',
        scheduledServerTime: scheduledTime,
        scheduledPosition: 0,
        lastPausedPosition: 0,
        duration: queueItem.duration || 0
      };

      io.to(currentRoomCode).emit('playback_scheduled', {
        track: queueItem,
        status: 'playing',
        scheduledServerTime: scheduledTime,
        startPosition: 0,
        serverTime: Date.now()
      });
      return;
    }

    room.queue.push(queueItem);
    room.queue = sortQueue(room.queue);

    io.to(currentRoomCode).emit('queue_updated', { queue: room.queue });

    const chatAlert = {
      id: `msg-${Date.now()}`,
      user: { name: 'System', role: 'system', avatarColor: '#9d4edd' },
      text: `🎵 ${user ? user.name : 'Guest'} added "${track.title}" to the queue`,
      timestamp: Date.now(),
      isSystem: true
    };
    room.chatMessages.push(chatAlert);
    io.to(currentRoomCode).emit('new_chat_message', chatAlert);
  });

  socket.on('queue_vote', ({ queueId, type }) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    const item = room.queue.find(q => q.queueId === queueId);
    if (!item) return;

    const userId = socket.id;
    item.upvotes = item.upvotes || [];
    item.downvotes = item.downvotes || [];

    if (type === 'up') {
      const upIdx = item.upvotes.indexOf(userId);
      if (upIdx > -1) {
        item.upvotes.splice(upIdx, 1); // remove upvote
      } else {
        item.upvotes.push(userId);
        const downIdx = item.downvotes.indexOf(userId);
        if (downIdx > -1) item.downvotes.splice(downIdx, 1);
      }
    } else if (type === 'down') {
      const downIdx = item.downvotes.indexOf(userId);
      if (downIdx > -1) {
        item.downvotes.splice(downIdx, 1); // remove downvote
      } else {
        item.downvotes.push(userId);
        const upIdx = item.upvotes.indexOf(userId);
        if (upIdx > -1) item.upvotes.splice(upIdx, 1);
      }
    }

    room.queue = sortQueue(room.queue);
    io.to(currentRoomCode).emit('queue_updated', { queue: room.queue });
  });

  socket.on('queue_remove', ({ queueId }) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    const user = room.users.get(socket.id);
    if (!user || (user.role !== 'host' && user.role !== 'dj')) return;

    room.queue = room.queue.filter(q => q.queueId !== queueId);
    io.to(currentRoomCode).emit('queue_updated', { queue: room.queue });
  });

  socket.on('queue_clear', () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    const user = room.users.get(socket.id);
    if (!user || user.role !== 'host') return;

    room.queue = [];
    io.to(currentRoomCode).emit('queue_updated', { queue: [] });
  });

  // 7. Role Management (DJ Promotion / Demotion)
  socket.on('set_user_role', ({ targetUserId, newRole }) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    const host = room.users.get(socket.id);
    if (!host || host.role !== 'host') {
      return socket.emit('error_message', 'Only Room Host can change permissions.');
    }

    const target = room.users.get(targetUserId);
    if (target && targetUserId !== room.hostId) {
      target.role = newRole === 'dj' ? 'dj' : 'listener';
      io.to(currentRoomCode).emit('room_users_updated', {
        users: Array.from(room.users.values())
      });

      const promoMsg = {
        id: `msg-${Date.now()}`,
        user: { name: 'System', role: 'system', avatarColor: '#00f0ff' },
        text: `👑 ${target.name} is now a ${target.role.toUpperCase()}!`,
        timestamp: Date.now(),
        isSystem: true
      };
      room.chatMessages.push(promoMsg);
      io.to(currentRoomCode).emit('new_chat_message', promoMsg);
    }
  });

  // 7b. Kick Device / User from Room (Host Only)
  socket.on('kick_user', ({ targetUserId }) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    const host = room.users.get(socket.id);
    if (!host || host.role !== 'host') {
      return socket.emit('error_message', 'Only Room Host can remove devices.');
    }

    if (!targetUserId || targetUserId === room.hostId || targetUserId === socket.id) {
      return socket.emit('error_message', 'Cannot remove host device.');
    }

    const target = room.users.get(targetUserId);
    if (target) {
      room.users.delete(targetUserId);

      // Notify the target socket that they were removed
      io.to(targetUserId).emit('kicked_from_room', {
        reason: 'You were removed from the room by the host.'
      });

      // Leave socket.io room channel
      const targetSocket = io.sockets.sockets.get(targetUserId);
      if (targetSocket) {
        targetSocket.leave(currentRoomCode);
      }

      // Broadcast updated users list
      io.to(currentRoomCode).emit('room_users_updated', {
        users: Array.from(room.users.values()),
        hostId: room.hostId
      });

      const kickMsg = {
        id: `msg-${Date.now()}`,
        user: { name: 'System', role: 'system', avatarColor: '#f43f5e' },
        text: `🚪 ${target.name} was removed from the room by the host.`,
        timestamp: Date.now(),
        isSystem: true
      };
      room.chatMessages.push(kickMsg);
      io.to(currentRoomCode).emit('new_chat_message', kickMsg);
    }
  });

  // 8. Live Chat & Floating Reactions
  socket.on('send_chat', ({ text }) => {
    if (!currentRoomCode || !text || !text.trim()) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    const user = room.users.get(socket.id);
    if (!user) return;

    const chatMsg = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        avatarColor: user.avatarColor
      },
      text: text.trim().substring(0, 300),
      timestamp: Date.now(),
      isSystem: false
    };

    room.chatMessages.push(chatMsg);
    if (room.chatMessages.length > 150) room.chatMessages.shift();

    io.to(currentRoomCode).emit('new_chat_message', chatMsg);
  });

  socket.on('send_reaction', ({ emoji }) => {
    if (!currentRoomCode || !emoji) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    const user = room.users.get(socket.id);
    const reactionPayload = {
      id: `react-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      emoji,
      userId: socket.id,
      userName: user ? user.name : 'Guest',
      timestamp: Date.now()
    };

    io.to(currentRoomCode).emit('new_reaction', reactionPayload);
  });

  // 9. Disconnect Handling
  socket.on('disconnect', () => {
    if (currentRoomCode) {
      const room = rooms.get(currentRoomCode);
      if (room) {
        const leavingUser = room.users.get(socket.id);
        room.users.delete(socket.id);

        if (room.users.size === 0) {
          // Clean up empty room after 5 minutes
          setTimeout(() => {
            const r = rooms.get(currentRoomCode);
            if (r && r.users.size === 0) {
              rooms.delete(currentRoomCode);
            }
          }, 300000);
        } else {
          // If host left, transfer host to next connected user
          if (room.hostId === socket.id) {
            const nextUser = room.users.values().next().value;
            if (nextUser) {
              room.hostId = nextUser.id;
              nextUser.role = 'host';
            }
          }

          io.to(currentRoomCode).emit('room_users_updated', {
            users: Array.from(room.users.values()),
            hostId: room.hostId
          });

          if (leavingUser) {
            const leaveMsg = {
              id: `msg-${Date.now()}`,
              user: { name: 'System', role: 'system', avatarColor: '#555' },
              text: `${leavingUser.name} left the room.`,
              timestamp: Date.now(),
              isSystem: true
            };
            io.to(currentRoomCode).emit('new_chat_message', leaveMsg);
          }
        }
      }
    }
  });
});

function serializeRoom(room) {
  return {
    code: room.code,
    createdAt: room.createdAt,
    hostId: room.hostId,
    users: Array.from(room.users.values()),
    queue: room.queue,
    currentTrack: room.currentTrack,
    playbackState: {
      ...room.playbackState,
      currentPosition: calculateCurrentTrackPosition(room)
    },
    chatMessages: room.chatMessages,
    masterVolume: typeof room.masterVolume === 'number' ? room.masterVolume : 0.9
  };
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`> MusicSync Zero-Latency Real-Time Server running on http://localhost:${PORT}`);
});
