export type UserRole = 'host' | 'dj' | 'listener' | 'system';

export interface User {
  id: string;
  deviceId?: string;
  name: string;
  role: UserRole;
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
}

export interface SyncStats {
  rtt: number; // ms
  clockOffset: number; // ms
  drift: number; // ms
  isLocked: boolean;
  syncQuality: 'excellent' | 'good' | 'fair' | 'poor';
}
