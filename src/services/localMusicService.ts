import { Track } from '../types';

const STORAGE_KEY = 'musicsync_local_tracks_v1';

export interface LocalUploadProgress {
  isUploading: boolean;
  progress: number; // 0 - 100
  currentFile: string;
  totalFiles: number;
  completedFiles: number;
  error?: string;
}

// Clean title and artist from file name
export function parseAudioFileName(fileName: string): { title: string; artist: string; format: string } {
  const dotIndex = fileName.lastIndexOf('.');
  const ext = dotIndex !== -1 ? fileName.substring(dotIndex + 1).toUpperCase() : 'MP3';
  let baseName = dotIndex !== -1 ? fileName.substring(0, dotIndex) : fileName;

  // Replace underscores and multiple dashes/spaces
  baseName = baseName.replace(/_/g, ' ').trim();

  let artist = 'Local Device';
  let title = baseName;

  // Check for common separators: "Artist - Title" or "Artist - Title [128kbps]"
  if (baseName.includes(' - ')) {
    const parts = baseName.split(' - ');
    if (parts.length >= 2) {
      artist = parts[0].trim();
      title = parts.slice(1).join(' - ').trim();
    }
  }

  // Remove common noise suffixes like (Official Audio), [320kbps], etc.
  title = title.replace(/\[.*?\]|\(.*?\)/g, (match) => {
    if (/kbps|audio|music|official|lyric|hd|hq|original|remaster/i.test(match)) {
      return '';
    }
    return match;
  }).trim();

  return {
    title: title || 'Local Audio Track',
    artist: artist || 'Local Device',
    format: ext,
  };
}

// Extract track duration by loading metadata in an Audio element
export async function extractAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const audio = new Audio();
      audio.preload = 'metadata';

      const cleanup = () => {
        URL.revokeObjectURL(url);
        audio.removeAttribute('src');
      };

      const timer = setTimeout(() => {
        cleanup();
        resolve(0);
      }, 4000);

      audio.onloadedmetadata = () => {
        clearTimeout(timer);
        const dur = audio.duration;
        cleanup();
        resolve(isFinite(dur) && dur > 0 ? Math.round(dur) : 0);
      };

      audio.onerror = () => {
        clearTimeout(timer);
        cleanup();
        resolve(0);
      };

      audio.src = url;
    } catch {
      resolve(0);
    }
  });
}

class LocalMusicService {
  private tracks: Track[] = [];
  private listeners: Set<() => void> = new Set();
  private uploadListeners: Set<(p: LocalUploadProgress) => void> = new Set();
  private uploadState: LocalUploadProgress = {
    isUploading: false,
    progress: 0,
    currentFile: '',
    totalFiles: 0,
    completedFiles: 0,
  };

  constructor() {
    this.loadTracks();
    this.syncWithServer();
  }

  private notify() {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch (e) {
        console.error('LocalMusicService listener error:', e);
      }
    });
  }

  private notifyUploadProgress(progress: LocalUploadProgress) {
    this.uploadState = progress;
    this.uploadListeners.forEach((cb) => {
      try {
        cb(progress);
      } catch (e) {
        console.error('LocalMusicService upload listener error:', e);
      }
    });
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  public subscribeUpload(callback: (p: LocalUploadProgress) => void): () => void {
    this.uploadListeners.add(callback);
    callback(this.uploadState);
    return () => this.uploadListeners.delete(callback);
  }

  private loadTracks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.tracks = JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Failed to load local tracks from storage:', e);
      this.tracks = [];
    }
  }

  private saveTracks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.tracks));
    } catch (e) {
      console.warn('Failed to save local tracks to storage:', e);
    }
    this.notify();
  }

  public async syncWithServer() {
    try {
      const res = await fetch('/api/tracks/local');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.tracks)) {
          // Merge server tracks with local store, avoiding duplicates
          const serverTrackIds = new Set(data.tracks.map((t: Track) => t.id));
          const retainedLocal = this.tracks.filter((t) => !serverTrackIds.has(t.id));
          this.tracks = [...data.tracks, ...retainedLocal];
          this.saveTracks();
        }
      }
    } catch (e) {
      // Offline / standalone mode - ignore fetch error
    }
  }

  public getTracks(): Track[] {
    return [...this.tracks];
  }

  public getUploadState(): LocalUploadProgress {
    return { ...this.uploadState };
  }

  // Upload single file with XMLHttpRequest for live percentage tracking
  private uploadFileWithProgress(
    file: File,
    title: string,
    artist: string,
    duration: number,
    onProgressUpdate: (pct: number) => void
  ): Promise<Track> {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      const query = new URLSearchParams({
        filename: file.name,
        title,
        artist,
        duration: duration.toString(),
      });

      xhr.open('POST', `/api/tracks/local-upload?${query.toString()}`);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable) {
          const pct = Math.round((evt.loaded / evt.total) * 100);
          onProgressUpdate(pct);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            if (data.success && data.track) {
              return resolve(data.track);
            }
          } catch {}
        }
        // If server failed, create local fallback track
        const fallbackUrl = URL.createObjectURL(file);
        resolve({
          id: `local_fallback_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          title,
          artist,
          duration,
          artwork: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=160',
          audioUrl: fallbackUrl,
          source: 'local',
        });
      };

      xhr.onerror = () => {
        // Fallback to local URL on network error
        const fallbackUrl = URL.createObjectURL(file);
        resolve({
          id: `local_offline_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          title,
          artist,
          duration,
          artwork: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=160',
          audioUrl: fallbackUrl,
          source: 'local',
        });
      };

      xhr.send(file);
    });
  }

  public async importFiles(files: FileList | File[]): Promise<Track[]> {
    const fileList = Array.from(files).filter((file) => {
      // Filter for audio extensions and mime types
      const isAudioMime = file.type.startsWith('audio/');
      const hasAudioExt = /\.(mp3|wav|flac|m4a|aac|ogg|opus|wma)$/i.test(file.name);
      return isAudioMime || hasAudioExt;
    });

    if (fileList.length === 0) {
      return [];
    }

    const totalFiles = fileList.length;
    let completedFiles = 0;
    const newlyAddedTracks: Track[] = [];

    this.notifyUploadProgress({
      isUploading: true,
      progress: 0,
      currentFile: fileList[0].name,
      totalFiles,
      completedFiles: 0,
    });

    for (const file of fileList) {
      this.notifyUploadProgress({
        isUploading: true,
        progress: Math.round((completedFiles / totalFiles) * 100),
        currentFile: file.name,
        totalFiles,
        completedFiles,
      });

      const { title, artist } = parseAudioFileName(file.name);
      const duration = await extractAudioDuration(file);

      try {
        const track = await this.uploadFileWithProgress(
          file,
          title,
          artist,
          duration,
          (filePct) => {
            const overallPct = Math.round(
              ((completedFiles + filePct / 100) / totalFiles) * 100
            );
            this.notifyUploadProgress({
              isUploading: true,
              progress: overallPct,
              currentFile: file.name,
              totalFiles,
              completedFiles,
            });
          }
        );

        newlyAddedTracks.push(track);
      } catch (err) {
        console.error('Failed to import file:', file.name, err);
      }

      completedFiles++;
    }

    // Prepend newly uploaded tracks to list
    this.tracks = [...newlyAddedTracks, ...this.tracks];
    this.saveTracks();

    this.notifyUploadProgress({
      isUploading: false,
      progress: 100,
      currentFile: '',
      totalFiles,
      completedFiles: totalFiles,
    });

    return newlyAddedTracks;
  }

  public async deleteTrack(trackId: string): Promise<void> {
    this.tracks = this.tracks.filter((t) => t.id !== trackId);
    this.saveTracks();

    try {
      await fetch(`/api/tracks/local/${encodeURIComponent(trackId)}`, {
        method: 'DELETE',
      });
    } catch {
      // Ignore network errors
    }
  }

  public async clearAllTracks(): Promise<void> {
    const trackIds = this.tracks.map((t) => t.id);
    this.tracks = [];
    this.saveTracks();

    for (const id of trackIds) {
      try {
        await fetch(`/api/tracks/local/${encodeURIComponent(id)}`, {
          method: 'DELETE',
        });
      } catch {}
    }
  }
}

export const localMusicService = new LocalMusicService();
