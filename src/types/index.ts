export type UserRole = 'host' | 'dj' | 'listener' | 'system';

export type SpeakerRole =
  | 'all'
  | 'front_left'
  | 'center'
  | 'front_right'
  | 'surround_left'
  | 'surround_right'
  | 'subwoofer';

export interface User {
  id: string;
  deviceId?: string;
  name: string;
  role: UserRole;
  speakerRole?: SpeakerRole;
  isAudioReady: boolean;
  avatarColor: string;
  joinedAt: number;
}

export interface Track {
  id: string;
  queueId?: string;
  title: string;
  artist: string;
  album?: string;
  duration: number; // in seconds
  genre?: string;
  language?: string;
  languageBadge?: string;
  artwork: string;
  audioUrl: string;
  source: string;
  addedBy?: string;
  addedAt?: number;
  upvotes?: string[];
  downvotes?: string[];
  isTrending?: boolean;
  trendingRank?: number;
  isRecommended?: boolean;
  isOfficial?: boolean;
  isMixed?: boolean;
  isLongMix?: boolean;
  mixBadge?: string;
  fileSize?: number;
  format?: string;
}

export interface PlaybackState {
  status: 'playing' | 'paused' | 'stopped' | 'buffering';
  scheduledServerTime: number;
  scheduledPosition: number;
  lastPausedPosition: number;
  currentPosition?: number;
  duration: number;
}

export interface ChatMessage {
  id: string;
  user: {
    id?: string;
    name: string;
    role?: UserRole;
    avatarColor?: string;
  };
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface ReactionItem {
  id: string;
  emoji: string;
  userName: string;
  xPosition: number; // horizontal % 10-90
  timestamp: number;
}

export type TheaterPreset = 'cinema' | 'imax' | 'atmos' | 'intimate' | 'widener';

export interface TheaterSettings {
  enabled: boolean;
  preset: TheaterPreset;
  spatialWidening: number; // 0 to 1
  dialogueBoost: number; // 0 to 1
  lfeBoost: number; // 0 to 1
  reverbDecay: number; // seconds
  haasDelayMs: number; // ms
}

export interface MovieState {
  isActive: boolean;
  title: string;
  fileName?: string;
  fileSize?: number;
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  isHostVideo: boolean;
  audioBroadcastMode: 'webrtc' | 'stream';
  streamUrl?: string;
  theaterSettings: TheaterSettings;
  lipSyncOffsetMs: number;
  updatedAt: number;
}

export interface RoomState {
  code: string;
  createdAt: number;
  hostId: string;
  users: User[];
  queue: Track[];
  currentTrack: Track | null;
  playbackState: PlaybackState;
  chatMessages: ChatMessage[];
  masterVolume?: number;
  networkMode?: 'local' | 'online';
  movieState?: MovieState;
}

export interface SyncStats {
  rtt: number; // ms
  clockOffset: number; // ms
  drift: number; // ms
  isLocked: boolean;
  syncQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

