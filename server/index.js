import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';
import play from 'play-dl';
import { CURATED_TRACKS, CURATED_MIXED_TRACKS } from './curatedTracks.js';

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

// Initialize SoundCloud Full-Track Streaming Client with Caching & Resilience
let soundcloudReady = false;
let cachedClientId = null;
let lastClientIdFetch = 0;

async function getCachedClientId() {
  const now = Date.now();
  // Reuse clientId for up to 3 hours to avoid hitting SoundCloud rate limits
  if (cachedClientId && (now - lastClientIdFetch < 3 * 60 * 60 * 1000)) {
    return cachedClientId;
  }
  try {
    const clientId = await play.getFreeClientID();
    if (clientId) {
      cachedClientId = clientId;
      lastClientIdFetch = now;
      await play.setToken({ soundcloud: { client_id: clientId } }).catch(() => {});
      soundcloudReady = true;
      console.log('> SoundCloud Full-Track Engine Initialized (client_id cached)');
      return clientId;
    }
  } catch (e) {
    console.warn('SoundCloud init notice:', e.message);
  }
  return cachedClientId || 'Pb72ranhoyt6gw7hM7TkzUItXlMWSNSo';
}

async function initSoundCloud() {
  await getCachedClientId();
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
  // 5-digit purely numeric code (10000 - 99999) - numbers only, no letters
  return Math.floor(10000 + Math.random() * 90000).toString();
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
// SERVER-SIDE AUTHORITATIVE AUTO-ADVANCE & REPEAT CORE
// ----------------------------------------------------
const BUFFER_LEAD_MS = 1200;

function clearServerAutoAdvance(room) {
  if (room && room.autoAdvanceTimer) {
    clearTimeout(room.autoAdvanceTimer);
    room.autoAdvanceTimer = null;
  }
}

function scheduleServerAutoAdvance(roomCode) {
  if (!roomCode) return;
  const room = rooms.get(roomCode);
  if (!room || !room.currentTrack || room.playbackState.status !== 'playing') {
    return;
  }

  clearServerAutoAdvance(room);

  const duration = room.playbackState.duration || room.currentTrack.duration || 0;
  if (!duration || duration <= 0) return;

  const scheduledServerTime = room.playbackState.scheduledServerTime || Date.now();
  const startPosition = room.playbackState.scheduledPosition || 0;
  const remainingSec = Math.max(0, duration - startPosition);
  const finishTime = scheduledServerTime + (remainingSec * 1000);
  // Trigger transition with lead time for seamless gapless crossfade
  const delayMs = Math.max(500, finishTime - Date.now() - 400);

  room.autoAdvanceTimer = setTimeout(() => {
    executeAutoAdvance(roomCode);
  }, delayMs);
}

// Helper to determine next track without removing anything from Up Next queue
function getNextTrack(room) {
  if (!room.queue || room.queue.length === 0) return null;
  const currentId = room.currentTrack?.queueId || room.currentTrack?.id;
  const currentIdx = room.queue.findIndex(q => (currentId && q.queueId === currentId) || q.id === currentId);
  if (currentIdx === -1) {
    return room.queue[0];
  }
  const nextIdx = currentIdx + 1;
  if (nextIdx < room.queue.length) {
    return room.queue[nextIdx];
  }
  // At end of playlist: loop back if repeat mode is 'all'
  if (room.repeatMode === 'all') {
    return room.queue[0];
  }
  return null;
}

// Helper to determine previous track without removing anything from Up Next queue
function getPreviousTrack(room) {
  if (!room.queue || room.queue.length === 0) return null;
  const currentId = room.currentTrack?.queueId || room.currentTrack?.id;
  const currentIdx = room.queue.findIndex(q => (currentId && q.queueId === currentId) || q.id === currentId);
  if (currentIdx === -1) {
    return room.queue[0];
  }
  const prevIdx = currentIdx - 1;
  if (prevIdx >= 0) {
    return room.queue[prevIdx];
  }
  if (room.repeatMode === 'all') {
    return room.queue[room.queue.length - 1];
  }
  return room.queue[0];
}

function executeAutoAdvance(roomCode) {
  const room = rooms.get(roomCode);
  if (!room || room.playbackState.status !== 'playing' || !room.currentTrack) return;

  // 1. Repeat Single Track Mode
  if (room.repeatMode === 'one') {
    const scheduledTime = Date.now() + BUFFER_LEAD_MS;
    room.playbackState = {
      status: 'playing',
      scheduledServerTime: scheduledTime,
      scheduledPosition: 0,
      lastPausedPosition: 0,
      duration: room.currentTrack.duration || 0
    };

    io.to(roomCode).emit('playback_scheduled', {
      track: room.currentTrack,
      status: 'playing',
      scheduledServerTime: scheduledTime,
      startPosition: 0,
      serverTime: Date.now()
    });

    scheduleServerAutoAdvance(roomCode);
    return;
  }

  // 2. Advance to next track in queue (WITHOUT removing previous songs)
  const nextTrack = getNextTrack(room);
  if (nextTrack) {
    room.currentTrack = nextTrack;
    const scheduledTime = Date.now() + BUFFER_LEAD_MS;

    room.playbackState = {
      status: 'playing',
      scheduledServerTime: scheduledTime,
      scheduledPosition: 0,
      lastPausedPosition: 0,
      duration: nextTrack.duration || 0
    };

    io.to(roomCode).emit('playback_scheduled', {
      track: nextTrack,
      status: 'playing',
      scheduledServerTime: scheduledTime,
      startPosition: 0,
      serverTime: Date.now()
    });

    scheduleServerAutoAdvance(roomCode);
    return;
  }

  // Otherwise, stop playback gracefully
  room.playbackState.status = 'stopped';
  room.playbackState.lastPausedPosition = 0;
  room.playbackState.scheduledPosition = 0;
  room.playbackState.scheduledServerTime = 0;

  io.to(roomCode).emit('playback_paused', {
    position: 0,
    serverTime: Date.now()
  });
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
  const mode = (req.query.mode || 'normal').toString().toLowerCase();
  if (mode === 'mixed') {
    return res.json({ tracks: CURATED_MIXED_TRACKS });
  }
  res.json({ tracks: CURATED_TRACKS });
});

// Full Track Audio Stream Proxy Endpoint (SoundCloud Progressive MP3) with direct Byte-Range pipe
app.get('/api/stream/soundcloud', async (req, res) => {
  const progUrl = req.query.progUrl;
  if (!progUrl) return res.status(400).send('Missing progUrl');

  try {
    const clientId = await getCachedClientId();
    const mediaRes = await fetch(`${progUrl}?client_id=${clientId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    if (!mediaRes.ok) throw new Error(`SoundCloud media fetch error: ${mediaRes.status}`);
    const data = await mediaRes.json();
    if (!data.url) return res.status(404).send('Stream URL not found');

    const rangeHeader = req.headers.range;
    const fetchHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    };
    if (rangeHeader) {
      fetchHeaders['Range'] = rangeHeader;
    }

    const audioRes = await fetch(data.url, { headers: fetchHeaders });
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', audioRes.headers.get('content-type') || 'audio/mpeg');

    if (audioRes.headers.has('content-length')) {
      res.setHeader('Content-Length', audioRes.headers.get('content-length'));
    }
    if (audioRes.headers.has('content-range')) {
      res.setHeader('Content-Range', audioRes.headers.get('content-range'));
    }

    res.status(audioRes.status);
    Readable.fromWeb(audioRes.body).pipe(res);
  } catch (err) {
    console.error('SoundCloud stream error:', err.message);
    if (!res.headersSent) res.status(500).send('Streaming error');
  }
});

// Universal Audio Stream Proxy (for Curated or External Tracks with CORS & Range Support)
app.get('/api/stream/proxy', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send('Missing url parameter');

  try {
    const rangeHeader = req.headers.range;
    const fetchHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    };
    if (rangeHeader) {
      fetchHeaders['Range'] = rangeHeader;
    }

    const audioRes = await fetch(targetUrl, { headers: fetchHeaders });
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', audioRes.headers.get('content-type') || 'audio/mpeg');

    if (audioRes.headers.has('content-length')) {
      res.setHeader('Content-Length', audioRes.headers.get('content-length'));
    }
    if (audioRes.headers.has('content-range')) {
      res.setHeader('Content-Range', audioRes.headers.get('content-range'));
    }

    res.status(audioRes.status);
    Readable.fromWeb(audioRes.body).pipe(res);
  } catch (err) {
    console.error('Proxy stream error:', err.message);
    if (!res.headersSent) res.status(500).send('Audio proxy streaming error');
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

// Regex pattern to classify tracks as Remix / Mashup / Party Mix / Long Non-Stop Set
const MIXED_SONG_REGEX = /\b(remix|re-mix|mashup|mash-up|mash up|club mix|party mix|dj mix|megamix|mega-mix|non[- ]?stop|nonstop|continuous mix|extended mix|bootleg|flip|rework|dance mix|dhol mix|party mashup|bollywood mix|punjabi mix|garba mix|edm mix|festival mix|live set|dj set|mixtape|soundclash|dandiya mix|dhol blast|bass boosted|slowed|reverb)\b/i;

function isMixedTrack(title = '', artist = '', genre = '', duration = 0) {
  // Any track 10 minutes or longer (>= 600s) is considered a continuous mix / long non-stop set
  if (duration >= 600) return true;
  const text = `${title} ${artist} ${genre}`.toLowerCase();
  return MIXED_SONG_REGEX.test(text);
}

const SEARCH_MIXED_AUTOCOMPLETE_DATABASE = {
  hindi: [
    'Bollywood Party Non Stop Remix', 'Bollywood Dance Mashup 2024',
    'Arijit Singh Mashup Remix', '90s Bollywood Non Stop Party Mix',
    'DJ Chetas Bollywood Mashup', 'Atif Aslam Mashup', 'Hindi Club DJ Remix'
  ],
  punjabi: [
    'Punjabi Bhangra Non Stop Party Mix', 'Sidhu Moose Wala Mega Mashup',
    'Karan Aujla Party Remix', 'Punjabi Dhol High Bass Mix',
    'Diljit Dosanjh Non Stop Club Session', 'AP Dhillon Mashup'
  ],
  gujarati: [
    'Gujarati Garba Non Stop 1 Hour', 'Dandiya Raas High Energy Non Stop',
    'Atul Purohit Non Stop Garba', 'Kirtidan Gadhvi Tahukar Non Stop',
    'Falguni Pathak Dandiya Mix', 'Sanedo DJ Folk Remix'
  ],
  english: [
    'EDM Festival Club Mix Non Stop', 'Deep House Continuous Party Set',
    'Synthwave 80s Club Extended Remix', 'Ultra Music Festival Live Set',
    'Billboard Pop Dance Mashup 1 Hour', 'Chillhop Lofi 24/7 Mix'
  ]
};

// Autocomplete suggestions endpoint
app.get('/api/search/suggestions', (req, res) => {
  const query = (req.query.q || '').toString().trim().toLowerCase();
  const lang = (req.query.lang || 'all').toString().trim().toLowerCase();
  const mode = (req.query.mode || 'normal').toString().trim().toLowerCase();

  const db = mode === 'mixed' ? SEARCH_MIXED_AUTOCOMPLETE_DATABASE : SEARCH_AUTOCOMPLETE_DATABASE;

  let pool = [];
  if (lang === 'all') {
    pool = [
      ...db.hindi,
      ...db.punjabi,
      ...db.gujarati,
      ...db.english
    ];
  } else if (db[lang]) {
    pool = db[lang];
  } else {
    pool = db.english;
  }

  if (!query) {
    return res.json({ suggestions: pool.slice(0, 8) });
  }

  const matches = pool.filter(item => item.toLowerCase().includes(query)).slice(0, 8);
  res.json({ suggestions: matches });
});

// Helper to generate a deterministic integer hash from a string seed
function stringToHash(str = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Pseudo-random number generator seeded with a specific number
function seededRandom(seed) {
  let s = (seed % 2147483647) || 1;
  if (s <= 0) s += 2147483646;
  return function() {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Seeded Fisher-Yates array shuffle for consistent rotation per refresh seed
function seededShuffle(array, seedNum) {
  const arr = [...array];
  const rand = seededRandom(seedNum);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Clean track title to extract the original song name, removing Uploader noise, SEO tags, video labels, etc.
function cleanTrackTitle(rawTitle = '', rawArtist = '') {
  if (!rawTitle || typeof rawTitle !== 'string') return '';
  let title = rawTitle.trim();
  const artist = (rawArtist || '').trim();

  // 1. If title contains pipe '|' or double slash '//' or bullet '•',
  // in YouTube / SoundCloud metadata everything after is almost exclusively promotional clutter
  if (/[|/•]/.test(title)) {
    const parts = title.split(/[|/•]/).map(p => p.trim()).filter(Boolean);
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

// Universal Search & Limitless Suggestions Endpoint (Exclusively English, Hindi, Gujarati, Punjabi)
app.get('/api/search', async (req, res) => {
  const query = (req.query.q || '').toString().trim().toLowerCase();
  const selectedLang = (req.query.lang || 'all').toString().trim().toLowerCase();
  const mode = (req.query.mode || 'normal').toString().trim().toLowerCase(); // 'normal' or 'mixed'
  const isMixedMode = mode === 'mixed';
  const offset = Math.max(0, parseInt(req.query.offset) || 0);
  const limit = Math.min(50, Math.max(10, parseInt(req.query.limit) || 30));
  const seed = (req.query.seed || '').toString().trim();
  const excludeParam = (req.query.exclude || '').toString().trim();
  const excludeIds = new Set(excludeParam ? excludeParam.split(',').map(s => s.trim()).filter(Boolean) : []);
  const seedNum = seed ? stringToHash(seed) : Math.floor(Math.random() * 1000000);

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

  // If no query is typed, generate limit-less suggestions based on selected language, mode, seed & offset
  let scQuery = query;
  if (!query) {
    if (isMixedMode) {
      // Curated MIXED library starter matches (rotated on first page offset 0)
      if (offset === 0) {
        const candidates = CURATED_MIXED_TRACKS.filter(t => {
          if (selectedLang === 'all' || selectedLang === 'trending' || selectedLang === 'for_you') return true;
          return t.language?.toLowerCase() === selectedLang;
        });

        // Rotate unseen songs first so each refresh yields different party sets
        const unseen = candidates.filter(t => !excludeIds.has(t.id));
        const seen = candidates.filter(t => excludeIds.has(t.id));
        const shuffledUnseen = seededShuffle(unseen, seedNum);
        const shuffledSeen = seededShuffle(seen, seedNum + 13);
        const rotatedCurated = [...shuffledUnseen, ...shuffledSeen];

        rawTracks.push(...rotatedCurated.slice(0, 4));
      }

      // Dynamic suggestion queries specifically targeting remixes, mashups, and hours-long party mixes
      const mixedSuggestionQueries = {
        hindi: [
          'bollywood party non stop remix', 'bollywood dance mashup 2024', 'arijit singh mashup remix',
          'hindi club party mix non stop', 'bollywood 90s retro remix non stop', 'dj chetas bollywood mega mashup',
          'atif aslam soulful party remix', 'bollywood bass boosted club mix'
        ],
        punjabi: [
          'punjabi bhangra party mix non stop', 'punjabi club mashup high bass', 'sidhu moose wala karan aujla mashup',
          'punjabi non stop dhol mix 1 hour', 'diljit dosanjh party club remix', 'ap dhillon shubh bass mashup',
          'bhangra explosion dhol beats mix', 'desi hip hop non stop party set'
        ],
        gujarati: [
          'gujarati garba non stop 1 hour', 'dandiya raas non stop party mix', 'khalasi chogada remix garba',
          'falguni pathak non stop dandiya', 'tahukar sanedo non stop dj mix', 'kirtidan gadhvi garba non stop 2024',
          'navratri live dhol mix 1 hour', 'gujarati dj titoda high bass mix'
        ],
        english: [
          'edm festival club mix non stop', 'deep house continuous party mix', 'synthwave 80s extended club remix',
          'billboard pop dance mashup 1 hour', 'ultra festival live set party', 'tomorrowland electro house non stop',
          'summer club dance party mix 2024', 'chillhop lofi beats continuous mix'
        ],
        all: [
          'party mashup remix non stop 2024', 'bollywood punjabi edm club mix 1 hour', 'ultimate non stop dance party mix',
          'mega mashup club remix 2024', 'global festival club mix non stop', 'desi global fusion party mashup'
        ]
      };

      const qList = mixedSuggestionQueries[selectedLang] || mixedSuggestionQueries.all;
      const pageNumber = Math.floor(offset / limit);
      const qIndex = (seedNum + pageNumber) % qList.length;
      scQuery = qList[qIndex];
    } else {
      // Curated library starter matches (Strictly NORMAL songs - zero remixes/mashups!)
      if (offset === 0) {
        const candidates = CURATED_TRACKS.filter(t => {
          if (isMixedTrack(t.title, t.artist, t.genre, t.duration)) return false;
          if (selectedLang === 'all' || selectedLang === 'trending' || selectedLang === 'for_you') return true;
          return t.language?.toLowerCase() === selectedLang;
        });

        // Rotate unseen tracks first so each refresh presents brand new trending hits
        const unseen = candidates.filter(t => !excludeIds.has(t.id));
        const seen = candidates.filter(t => excludeIds.has(t.id));
        const shuffledUnseen = seededShuffle(unseen, seedNum);
        const shuffledSeen = seededShuffle(seen, seedNum + 17);
        const rotatedCurated = [...shuffledUnseen, ...shuffledSeen];

        // Pick top 6 fresh curated tracks to headline the recommendations
        rawTracks.push(...rotatedCurated.slice(0, 6));
      }

      // Dynamic limitless suggestion search queries per language (varied across refreshes via seedNum)
      const suggestionQueries = {
        hindi: [
          'bollywood trending hits 2024', 'arijit singh romantic hits', 'sari duniya jala denge animal',
          'kesariya brahmastra arijit', 'bollywood acoustic lofi', 't-series latest chartbusters',
          'bad newz vicky kaushal hits', 'stree 2 songs trending', 'armaan malik shreya ghoshal', 'pritam hits latest'
        ],
        punjabi: [
          'tauba tauba karan aujla', 'diljit dosanjh lover born to shine', 'sidhu moose wala moosetape 295',
          'shubh cheques still rollin', 'ap dhillon with you brown munde', 'karan aujla street dreams four me',
          'hustinder latest punjabi tracks', 'amrinder gill virasat songs', 'punjabi viral reels trending'
        ],
        gujarati: [
          'khalasi aditya gadhvi coke studio', 'chogada tara loveratri garba', 'kinjal dave char char bangdi',
          'kirtidan gadhvi tahukar dayro', 'geeta rabari rona serma', 'mor bani thanghat kare',
          'osman mir folk gujarati', 'atul purohit tara vina shyam', 'sanedo sanedo lal lal sanedo'
        ],
        english: [
          'the weeknd starboy blinding lights', 'top billboard hot 100 pop', 'dua lipa levitating houdini',
          'coldplay viva la vida yellow', 'ed sheeran bad habits shape of you', 'taylor swift cruel summer anti hero',
          'post malone circles sunflower', 'billie eilish birds of a feather', 'synthwave 80s retro wave chill',
          'deep house summer vibes'
        ],
        all: [
          'trending hit songs viral chartbusters', 'tauba tauba khalasi starboy lover', 'punjabi hindi english viral playlist',
          'top global hits and bollywood', 'hot 50 viral tracks worldwide', 'fresh trending hits radio',
          'diljit karan weeknd arijit', 'dance pop and desi beats'
        ],
        trending: [
          'viral trending chartbusters 2024', 'top trending hits spotify global', 'tauba tauba o maahi khalasi',
          'trending reels viral audio', 'top 50 trending chartbusters', 'latest viral songs radio'
        ],
        for_you: userArtists
          ? [userArtists, `${userArtists} hits`, `${userArtists} live`, `${userArtists} trending`]
          : ['trending songs 2024', 'top bollywood and pop', 'viral desi and global chartbusters']
      };

      const qList = suggestionQueries[selectedLang] || suggestionQueries.all;
      const pageNumber = Math.floor(offset / limit);
      const qIndex = (seedNum + pageNumber) % qList.length;
      scQuery = qList[qIndex];
    }
  } else {
    // If searching in Mixed mode, append remix/mashup keywords if not already present
    if (isMixedMode && !MIXED_SONG_REGEX.test(query)) {
      scQuery = `${query} remix mashup mix`;
    }

    // Curated library matches matching query on first page
    if (offset === 0) {
      const sourcePool = isMixedMode ? CURATED_MIXED_TRACKS : CURATED_TRACKS;
      const curatedMatches = sourcePool.filter(t => {
        const isMixed = isMixedTrack(t.title, t.artist, t.genre, t.duration);
        if (isMixedMode && !isMixed) return false;
        if (!isMixedMode && isMixed) return false;
        return (
          t.title.toLowerCase().includes(query) ||
          t.artist.toLowerCase().includes(query) ||
          t.genre.toLowerCase().includes(query)
        );
      }).sort((a, b) => (a.trendingRank || 99) - (b.trendingRank || 99));
      rawTracks.push(...curatedMatches);
    }
  }

  // Calculate distinct search offset for endless suggestion query rotation
  let searchOffset = offset;
  let fallbackQuery = '';
  if (!query) {
    const qList = isMixedMode
      ? (mixedSuggestionQueries[selectedLang] || mixedSuggestionQueries.all)
      : (suggestionQueries[selectedLang] || suggestionQueries.all);
    const pageNumber = Math.floor(offset / limit);
    const queryCycle = Math.floor(pageNumber / qList.length);
    searchOffset = queryCycle * 20;
    fallbackQuery = qList[(seedNum + pageNumber + 1) % qList.length];
  }

  // Helper to parse SoundCloud tracks
  const parseScItems = (items) => {
    if (!items || !Array.isArray(items)) return;
    for (const item of items) {
      const durSec = Math.round((item.duration || 0) / 1000);
      if (durSec >= 75) {
        const prog = item.media?.transcodings?.find(t => t.format.protocol === 'progressive');
        if (prog) {
          const cleanTitle = cleanTrackTitle(item.title, item.user?.username || item.publisher_metadata?.artist);
          rawTracks.push({
            id: `sc-${item.id}`,
            title: cleanTitle,
            artist: item.user?.username || item.publisher_metadata?.artist || 'SoundCloud Artist',
            album: durSec >= 600 ? 'Long Non-Stop Set' : 'Full Track',
            duration: durSec,
            genre: item.genre || (isMixedMode ? 'Party Mix' : 'Full Song'),
            artwork: item.artwork_url ? item.artwork_url.replace('-large', '-t500x500') : (item.user?.avatar_url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80'),
            audioUrl: `/api/stream/soundcloud?progUrl=${encodeURIComponent(prog.url)}`,
            source: isMixedMode ? (durSec >= 600 ? 'Non-Stop Set (SoundCloud)' : 'Party Mix (SoundCloud)') : 'SoundCloud (Full Song)'
          });
        }
      }
    }
  };

  // 1. Query SoundCloud for Full-Length Tracks (>= 75 seconds) with pagination
  try {
    const clientId = await getCachedClientId();
    const scUrl = `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(scQuery)}&client_id=${clientId}&limit=${limit}&offset=${searchOffset}`;
    const scRes = await fetch(scUrl);
    if (scRes.ok) {
      const data = await scRes.json();
      parseScItems(data.collection);
    }

    // If suggestions mode and batch is small, pull from fallback query to keep endless scroll lush
    if (!query && rawTracks.length < 15 && fallbackQuery) {
      const fbUrl = `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(fallbackQuery)}&client_id=${clientId}&limit=15&offset=${searchOffset}`;
      const fbRes = await fetch(fbUrl);
      if (fbRes.ok) {
        const fbData = await fbRes.json();
        parseScItems(fbData.collection);
      }
    }
  } catch (err) {
    console.warn('SoundCloud search error:', err.message);
  }

  // 2. Query Audius Search API for Full-Length Tracks (>= 75 seconds)
  if (query) {
    try {
      const audiusDiscoveryUrl = 'https://discoveryprovider.audius.co/v1/tracks/search';
      const audiusRes = await fetch(`${audiusDiscoveryUrl}?query=${encodeURIComponent(scQuery)}&app_name=musicsync&limit=10&offset=${offset}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (audiusRes.ok) {
        const audiusData = await audiusRes.json();
        if (audiusData.data && Array.isArray(audiusData.data)) {
          for (const track of audiusData.data) {
            const durSec = track.duration || 0;
            if (track.is_streamable !== false && durSec >= 75) {
              const cleanTitle = cleanTrackTitle(track.title, track.user ? track.user.name : '');
              rawTracks.push({
                id: `audius-${track.id}`,
                title: cleanTitle,
                artist: track.user ? track.user.name : 'Unknown Artist',
                album: durSec >= 600 ? 'Long Non-Stop Set' : 'Audius Release',
                duration: durSec,
                genre: track.genre || 'Electronic',
                artwork: track.artwork ? track.artwork['480x480'] || track.artwork['150x150'] : 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80',
                audioUrl: `https://discoveryprovider.audius.co/v1/tracks/${track.id}/stream?app_name=musicsync`,
                source: isMixedMode ? 'Party Mix (Audius)' : 'Audius (Full Song)'
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
  // STRICT SEPARATION: In Normal Songs, exclude all remixes/mashups. In Mixed Songs, include ONLY remixes/mashups/non-stop sets!
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

    const isMixed = isMixedTrack(t.title, t.artist, t.genre, t.duration);
    const finalCleanTitle = cleanTrackTitle(t.title, t.artist);

    if (isMixedMode) {
      // In Mixed Songs mode: ONLY include remixes, mashups, and non-stop long mixes!
      if (!isMixed) continue;

      const isLong = t.duration >= 600;
      let mixBadge = '🎛️ Remix / Mix';
      if (t.duration >= 3600) {
        const hours = (t.duration / 3600).toFixed(1);
        mixBadge = `⏳ ${hours}h Non-Stop Set`;
      } else if (t.duration >= 600) {
        mixBadge = `⏳ ${Math.floor(t.duration / 60)}m Non-Stop Set`;
      } else if (/mashup/i.test(t.title)) {
        mixBadge = '🎛️ Mashup';
      }

      filteredResults.push({
        ...t,
        title: finalCleanTitle,
        language: langInfo.name,
        languageBadge: langInfo.badge,
        isMixed: true,
        isLongMix: isLong,
        mixBadge
      });
    } else {
      // In Normal Songs mode: NEVER show remixes, mashups, or non-stop long mixes!
      if (isMixed) continue;

      filteredResults.push({
        ...t,
        title: finalCleanTitle,
        language: langInfo.name,
        languageBadge: langInfo.badge,
        isMixed: false
      });
    }
  }

  // Ensure trending chartbusters appear FIRST in suggestions, prioritizing unseen tracks across refreshes
  if (offset === 0 && !query) {
    filteredResults.sort((a, b) => {
      // 1. Prioritize unseen tracks over previously seen tracks
      const aExcluded = excludeIds.has(a.id) ? 1 : 0;
      const bExcluded = excludeIds.has(b.id) ? 1 : 0;
      if (aExcluded !== bExcluded) return aExcluded - bExcluded;

      // 2. Curated headline tracks come first
      const aCurated = a.id.startsWith('curated-') ? 0 : 1;
      const bCurated = b.id.startsWith('curated-') ? 0 : 1;
      if (aCurated !== bCurated) return aCurated - bCurated;

      return 0;
    });
  }

  res.json({
    tracks: filteredResults,
    offset: offset + limit,
    hasMore: !query ? true : rawTracks.length >= limit,
    mode: isMixedMode ? 'mixed' : 'normal'
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
      masterVolume: 0.9,
      repeatMode: 'off',
      autoAdvanceTimer: null
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
    const code = (roomCode || '').toString().trim().toUpperCase();
    const room = rooms.get(code);

    if (!room) {
      if (typeof callback === 'function') {
        return callback({ success: false, error: 'Room not found. Please check the code.' });
      }
      return;
    }

    const finalName = (userName && userName.trim()) ? userName.trim() : generateGuestName();
    const avatarColor = savedColor || AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

    // Role persistence: Only restore host if room was empty or user is existing host
    let role = 'listener';
    if (room.users.size === 0 || room.hostId === socket.id) {
      role = 'host';
      room.hostId = socket.id;
    } else if (previousRole === 'host' && (!room.hostId || !room.users.has(room.hostId))) {
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
      users: Array.from(room.users.values()),
      hostId: room.hostId
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
        users: Array.from(room.users.values()),
        hostId: room.hostId
      });
    }
  });

  // 5. Host / DJ Playback Scheduling Controls
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

    // Keep track in room.queue - NEVER remove it from Up Next!
    const existingIndex = room.queue.findIndex(q =>
      (targetTrack.queueId && q.queueId === targetTrack.queueId) ||
      (q.id && q.id === targetTrack.id)
    );

    let currentItem = targetTrack;
    if (existingIndex === -1) {
      // If a song was played directly (e.g. from search) and wasn't in Up Next yet, add it so it is kept in Up Next!
      const queueItem = {
        ...targetTrack,
        queueId: targetTrack.queueId || `q-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        addedBy: user ? user.name : 'Host',
        addedAt: Date.now(),
        upvotes: user ? [user.id] : [],
        downvotes: []
      };
      room.queue.push(queueItem);
      currentItem = queueItem;
      io.to(currentRoomCode).emit('queue_updated', { queue: room.queue });
    } else {
      currentItem = room.queue[existingIndex];
    }

    room.currentTrack = currentItem;
    room.playbackState = {
      status: 'playing',
      scheduledServerTime: scheduledTime,
      scheduledPosition: startPos,
      lastPausedPosition: startPos,
      duration: currentItem.duration || 0
    };

    io.to(currentRoomCode).emit('playback_scheduled', {
      track: room.currentTrack,
      status: 'playing',
      scheduledServerTime: scheduledTime,
      startPosition: startPos,
      serverTime: Date.now()
    });

    scheduleServerAutoAdvance(currentRoomCode);
  });

  socket.on('request_pause', () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    const user = room.users.get(socket.id);
    if (!user || (user.role !== 'host' && user.role !== 'dj')) return;

    const currentPos = calculateCurrentTrackPosition(room);
    clearServerAutoAdvance(room);
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

      scheduleServerAutoAdvance(currentRoomCode);
    } else {
      clearServerAutoAdvance(room);
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

    clearServerAutoAdvance(room);

    if (room.queue.length > 0) {
      let nextTrack = getNextTrack(room);
      // When skipping manually past the end, loop back to the first track in Up Next
      if (!nextTrack) {
        nextTrack = room.queue[0];
      }
      room.currentTrack = nextTrack;
      const scheduledTime = Date.now() + BUFFER_LEAD_MS;

      room.playbackState = {
        status: 'playing',
        scheduledServerTime: scheduledTime,
        scheduledPosition: 0,
        lastPausedPosition: 0,
        duration: nextTrack.duration || 0
      };

      io.to(currentRoomCode).emit('playback_scheduled', {
        track: nextTrack,
        status: 'playing',
        scheduledServerTime: scheduledTime,
        startPosition: 0,
        serverTime: Date.now()
      });

      scheduleServerAutoAdvance(currentRoomCode);
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

  // 5. Request Previous Track (Host or DJ only)
  socket.on('request_previous', () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    const user = room.users.get(socket.id);
    if (!user || (user.role !== 'host' && user.role !== 'dj')) return;

    clearServerAutoAdvance(room);

    if (room.queue.length > 0) {
      const prevTrack = getPreviousTrack(room) || room.queue[0];
      room.currentTrack = prevTrack;
      const scheduledTime = Date.now() + BUFFER_LEAD_MS;

      room.playbackState = {
        status: 'playing',
        scheduledServerTime: scheduledTime,
        scheduledPosition: 0,
        lastPausedPosition: 0,
        duration: prevTrack.duration || 0
      };

      io.to(currentRoomCode).emit('playback_scheduled', {
        track: prevTrack,
        status: 'playing',
        scheduledServerTime: scheduledTime,
        startPosition: 0,
        serverTime: Date.now()
      });

      scheduleServerAutoAdvance(currentRoomCode);
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

    // Always add track to room.queue so it stays in Up Next (never automatically start playing)
    room.queue.push(queueItem);
    room.queue = sortQueue(room.queue);
    io.to(currentRoomCode).emit('queue_updated', { queue: room.queue });

    // If a track is already currently playing, refresh auto-advance
    if (room.playbackState.status === 'playing') {
      scheduleServerAutoAdvance(currentRoomCode);
    }

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

  socket.on('queue_shuffle', () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    const user = room.users.get(socket.id);
    if (!user || (user.role !== 'host' && user.role !== 'dj')) return;

    if (room.queue.length > 1) {
      for (let i = room.queue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [room.queue[i], room.queue[j]] = [room.queue[j], room.queue[i]];
      }
      io.to(currentRoomCode).emit('queue_updated', { queue: room.queue });
      const chatAlert = {
        id: `msg-${Date.now()}`,
        user: { name: 'System', role: 'system', avatarColor: '#1ed760' },
        text: `🔀 ${user.name} shuffled the upcoming queue`,
        timestamp: Date.now(),
        isSystem: true
      };
      room.chatMessages.push(chatAlert);
      io.to(currentRoomCode).emit('new_chat_message', chatAlert);
    }
  });

  // 6b. Room Repeat Mode Synchronization
  socket.on('set_repeat_mode', ({ mode }) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    const user = room.users.get(socket.id);
    if (!user || (user.role !== 'host' && user.role !== 'dj')) return;

    room.repeatMode = ['off', 'all', 'one'].includes(mode) ? mode : 'off';
    io.to(currentRoomCode).emit('repeat_mode_updated', { repeatMode: room.repeatMode });
    scheduleServerAutoAdvance(currentRoomCode);
  });

  // 7. Make Host & Transfer Host Privileges (Host Only)
  socket.on('make_host', ({ targetUserId }) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    const host = room.users.get(socket.id);
    if (!host || host.role !== 'host') {
      return socket.emit('error_message', 'Only Room Host can transfer host permissions.');
    }

    if (!targetUserId || targetUserId === socket.id) {
      return socket.emit('error_message', 'Cannot transfer host to yourself.');
    }

    const target = room.users.get(targetUserId);
    if (target) {
      host.role = 'dj';
      target.role = 'host';
      room.hostId = targetUserId;

      io.to(currentRoomCode).emit('room_users_updated', {
        users: Array.from(room.users.values()),
        hostId: room.hostId
      });

      const promoMsg = {
        id: `msg-${Date.now()}`,
        user: { name: 'System', role: 'system', avatarColor: '#ffb703' },
        text: `👑 ${target.name} is now the Room Host!`,
        timestamp: Date.now(),
        isSystem: true
      };
      room.chatMessages.push(promoMsg);
      io.to(currentRoomCode).emit('new_chat_message', promoMsg);
    }
  });

  socket.on('reclaim_host', () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    const user = room.users.get(socket.id);
    if (!user) return;

    const currentHost = room.users.get(room.hostId);
    if (!currentHost) {
      user.role = 'host';
      room.hostId = socket.id;

      io.to(currentRoomCode).emit('room_users_updated', {
        users: Array.from(room.users.values()),
        hostId: room.hostId
      });

      const reclaimMsg = {
        id: `msg-${Date.now()}`,
        user: { name: 'System', role: 'system', avatarColor: '#ffb703' },
        text: `👑 ${user.name} reclaimed Room Host!`,
        timestamp: Date.now(),
        isSystem: true
      };
      room.chatMessages.push(reclaimMsg);
      io.to(currentRoomCode).emit('new_chat_message', reclaimMsg);
    }
  });

  // 7b. Role Management (DJ Promotion / Demotion)
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
        users: Array.from(room.users.values()),
        hostId: room.hostId
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

  socket.on('send_reaction', ({ emoji, reactionId }) => {
    if (!currentRoomCode || !emoji) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    const user = room.users.get(socket.id);
    const reactionPayload = {
      id: reactionId || `react-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      emoji,
      userId: socket.id,
      userName: user ? user.name : 'Guest',
      timestamp: Date.now()
    };

    io.to(currentRoomCode).emit('new_reaction', reactionPayload);
    io.to(currentRoomCode).emit('reaction_received', reactionPayload);
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
    masterVolume: typeof room.masterVolume === 'number' ? room.masterVolume : 0.9,
    repeatMode: room.repeatMode || 'off'
  };
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`> MusicSync Zero-Latency Real-Time Server running on http://localhost:${PORT}`);
});
