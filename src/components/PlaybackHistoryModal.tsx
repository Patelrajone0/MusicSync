import React, { useState, useEffect, useRef } from 'react';
import {
  History,
  X,
  Play,
  Pause,
  Plus,
  Check,
  Trash2,
  Search,
  Music,
  Sparkles,
  Clock,
  RotateCcw,
  Flame
} from 'lucide-react';
import { Track } from '../types';
import { userTasteEngine, HistoryItem } from '../services/userTaste';
import { socket } from '../services/socket';

interface PlaybackHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 45) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export const PlaybackHistoryModal: React.FC<PlaybackHistoryModalProps> = ({ isOpen, onClose }) => {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>(() => userTasteEngine.getHistory());
  const [searchFilter, setSearchFilter] = useState('');
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  // Local audio preview
  const [previewTrackId, setPreviewTrackId] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setHistoryItems(userTasteEngine.getHistory());
    } else {
      stopPreview();
    }
  }, [isOpen]);

  // Subscribe to real-time changes in history
  useEffect(() => {
    const unsub = userTasteEngine.subscribe(() => {
      setHistoryItems(userTasteEngine.getHistory());
    });
    return unsub;
  }, []);

  // Listen to Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        stopPreview();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const stopPreview = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.src = '';
      previewAudioRef.current = null;
    }
    setPreviewTrackId(null);
  };

  const togglePreview = (track: Track) => {
    if (previewTrackId === track.id) {
      stopPreview();
    } else {
      stopPreview();
      const audio = new Audio(track.audioUrl);
      audio.volume = 0.5;
      audio.play().catch(() => {});
      audio.onended = () => setPreviewTrackId(null);
      previewAudioRef.current = audio;
      setPreviewTrackId(track.id);
    }
  };

  const handleQueueAgain = (track: Track) => {
    socket.emit('queue_add', { track });
    userTasteEngine.recordInteraction(track, 'queued');

    setAddedIds((prev) => new Set(prev).add(track.id));
    setTimeout(() => {
      setAddedIds((prev) => {
        const next = new Set(prev);
        next.delete(track.id);
        return next;
      });
    }, 2000);
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear your playback history?')) {
      userTasteEngine.clearHistory();
      setHistoryItems([]);
      stopPreview();
    }
  };

  const handleRemoveSingle = (id: string) => {
    userTasteEngine.removeHistoryItem(id);
    setHistoryItems(userTasteEngine.getHistory());
  };

  if (!isOpen) return null;

  const filteredItems = historyItems.filter((item) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      item.track.title.toLowerCase().includes(q) ||
      item.track.artist.toLowerCase().includes(q) ||
      (item.track.language && item.track.language.toLowerCase().includes(q))
    );
  });

  return (
    <div
      onClick={() => {
        stopPreview();
        onClose();
      }}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-dark-900 border border-white/10 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-modal-spring"
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-electric-cyan/10 text-electric-cyan">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Playback History</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-electric-cyan/10 text-electric-cyan border border-electric-cyan/30 font-mono font-bold">
                  {historyItems.length} {historyItems.length === 1 ? 'Track' : 'Tracks'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                All music played and queued on your device
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {historyItems.length > 0 && (
              <button
                onClick={handleClearAll}
                className="px-2.5 py-1 text-xs text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-1"
                title="Clear all playback history"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear History</span>
              </button>
            )}
            <button
              onClick={() => {
                stopPreview();
                onClose();
              }}
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-dark-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search within History Filter Bar */}
        {historyItems.length > 0 && (
          <div className="p-3 border-b border-white/5 bg-dark-950/60">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search history by song, artist, or language..."
                className="w-full bg-dark-900 border border-white/10 rounded-xl pl-9 pr-8 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-electric-cyan transition-colors"
              />
              {searchFilter && (
                <button
                  onClick={() => setSearchFilter('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* History List Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
          {historyItems.length === 0 ? (
            <div className="text-center py-16 px-6">
              <div className="inline-flex items-center justify-center p-4 rounded-full bg-electric-cyan/10 text-electric-cyan mb-4">
                <Music className="w-8 h-8" />
              </div>
              <h4 className="text-sm font-semibold text-white mb-1.5">No Listening History Yet</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Music played or queued during your listening parties will automatically appear here so you can re-play your favorite tracks anytime.
              </p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No matching tracks found in your history for "{searchFilter}".
            </div>
          ) : (
            filteredItems.map((item) => {
              const { track } = item;
              const isAdded = addedIds.has(track.id);
              const isPreviewing = previewTrackId === track.id;

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-dark-950 border border-white/5 hover:border-white/10 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Artwork with Preview Button */}
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-dark-800 shrink-0 shadow-sm">
                      <img
                        src={track.artwork || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100'}
                        alt={track.title}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => togglePreview(track)}
                        title={isPreviewing ? 'Stop Preview' : 'Audition Preview'}
                        className={`absolute inset-0 flex items-center justify-center bg-black/50 transition-opacity ${
                          isPreviewing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        {isPreviewing ? (
                          <Pause className="w-5 h-5 text-electric-cyan fill-current" />
                        ) : (
                          <Play className="w-5 h-5 text-white fill-current ml-0.5" />
                        )}
                      </button>
                    </div>

                    {/* Title, Artist, and Played Time */}
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-white truncate">{track.title}</h4>
                      <p className="text-xs text-slate-400 truncate">{track.artist}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {/* Played Time badge */}
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-dark-800 text-slate-300 border border-white/5 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {formatTimeAgo(item.playedAt)}
                        </span>

                        {/* Play count badge */}
                        {item.playCount > 1 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-electric-cyan/10 text-electric-cyan border border-electric-cyan/20 font-semibold">
                            Played {item.playCount}x
                          </span>
                        )}

                        {/* Language badge */}
                        {track.languageBadge && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-dark-800 text-slate-300 border border-white/5">
                            {track.languageBadge}
                          </span>
                        )}

                        {/* Duration */}
                        {track.duration > 0 && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions: Re-queue & Remove */}
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <button
                      onClick={() => handleQueueAgain(track)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                        isAdded
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-electric-cyan text-black hover:bg-white shadow-md'
                      }`}
                      title="Add back to room queue"
                    >
                      {isAdded ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Queued!</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Queue Again</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleRemoveSingle(item.id)}
                      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      title="Remove from history"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
