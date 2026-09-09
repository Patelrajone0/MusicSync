import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'favorites.json');

// In-memory cache for ultra-fast lookups
let inMemoryDb = { users: {} };
let isInitialized = false;
let writeQueue = Promise.resolve();

async function ensureDataFile() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      const content = await fs.readFile(DB_FILE, 'utf-8');
      inMemoryDb = JSON.parse(content);
      if (!inMemoryDb.users || typeof inMemoryDb.users !== 'object') {
        inMemoryDb = { users: {} };
      }
    } catch (readErr) {
      if (readErr.code === 'ENOENT') {
        inMemoryDb = { users: {} };
        await fs.writeFile(DB_FILE, JSON.stringify(inMemoryDb, null, 2), 'utf-8');
      } else {
        console.warn('Could not parse favorites database, initializing fresh store:', readErr.message);
        inMemoryDb = { users: {} };
      }
    }
    isInitialized = true;
  } catch (err) {
    console.error('Failed to initialize favorites database directory/file:', err);
    inMemoryDb = { users: {} };
    isInitialized = true;
  }
}

async function persistToDisk() {
  writeQueue = writeQueue.then(async () => {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      const tempFile = `${DB_FILE}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 6)}`;
      await fs.writeFile(tempFile, JSON.stringify(inMemoryDb, null, 2), 'utf-8');
      await fs.rename(tempFile, DB_FILE);
    } catch (err) {
      console.error('Failed to persist favorites database to disk:', err);
    }
  });
  return writeQueue;
}

export async function initFavoritesDb() {
  if (!isInitialized) {
    await ensureDataFile();
  }
}

export async function getUserFavorites(userId) {
  if (!isInitialized) await ensureDataFile();
  if (!userId) return [];
  const userData = inMemoryDb.users[userId];
  if (!userData || !Array.isArray(userData.tracks)) {
    return [];
  }
  return userData.tracks;
}

export async function addFavorite(userId, rawTrack) {
  if (!isInitialized) await ensureDataFile();
  if (!userId || !rawTrack || !rawTrack.id) {
    throw new Error('Valid userId and track with id are required');
  }

  if (!inMemoryDb.users[userId]) {
    inMemoryDb.users[userId] = {
      updatedAt: Date.now(),
      tracks: []
    };
  }

  const userRecord = inMemoryDb.users[userId];
  const existingIdx = userRecord.tracks.findIndex(
    (t) => t.id === rawTrack.id || (t.title === rawTrack.title && t.artist === rawTrack.artist)
  );

  const favoriteTrack = {
    id: rawTrack.id,
    title: rawTrack.title,
    artist: rawTrack.artist || 'Unknown Artist',
    album: rawTrack.album || '',
    duration: typeof rawTrack.duration === 'number' ? rawTrack.duration : 0,
    genre: rawTrack.genre || '',
    language: rawTrack.language || '',
    languageBadge: rawTrack.languageBadge || '',
    artwork: rawTrack.artwork || '',
    audioUrl: rawTrack.audioUrl || '',
    source: rawTrack.source || 'Search',
    favoritedAt: Date.now()
  };

  if (existingIdx >= 0) {
    // Move to front with updated timestamp and details
    userRecord.tracks.splice(existingIdx, 1);
  }

  userRecord.tracks.unshift(favoriteTrack);
  userRecord.updatedAt = Date.now();

  await persistToDisk();
  return userRecord.tracks;
}

export async function removeFavorite(userId, trackId) {
  if (!isInitialized) await ensureDataFile();
  if (!userId || !trackId) {
    throw new Error('Valid userId and trackId are required');
  }

  const userRecord = inMemoryDb.users[userId];
  if (!userRecord || !Array.isArray(userRecord.tracks)) {
    return [];
  }

  userRecord.tracks = userRecord.tracks.filter((t) => t.id !== trackId);
  userRecord.updatedAt = Date.now();

  await persistToDisk();
  return userRecord.tracks;
}

export async function isFavorite(userId, trackId) {
  if (!isInitialized) await ensureDataFile();
  if (!userId || !trackId) return false;
  const tracks = await getUserFavorites(userId);
  return tracks.some((t) => t.id === trackId);
}
