import React from 'react';
import {
  Trash2,
  Play,
  Music2,
  Plus,
  Radio
} from 'lucide-react';
import { Track, UserRole } from '../types';
import { socket } from '../services/socket';
import { syncEngine } from '../services/syncEngine';

interface QueueListProps {
  queue: Track[];
  currentTrack: Track | null;
  userRole: UserRole;
  currentUserId?: string;
  onOpenSearch: () => void;
}

export const QueueList: React.FC<QueueListProps> = ({
  queue,
  currentTrack,
  userRole,
  currentUserId,
  onOpenSearch,
}) => {
  const canControl = userRole === 'host' || userRole === 'dj';

  const handleRemove = (queueId: string) => {
    if (!canControl) return;
    socket.emit('queue_remove', { queueId });
  };

  const handleForcePlay = (track: Track) => {
    if (!canControl) return;
    syncEngine.unlockAudio().catch(() => {});
    socket.emit('request_play', { track, position: 0 });
  };

  const handleClear = () => {
    if (userRole !== 'host') return;
    socket.emit('queue_clear');
  };

  return (
    <div className="bg-dark-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-3.5 sm:p-5 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3.5 sm:mb-4">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <Music2 className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
          <h3 className="text-sm sm:text-base font-bold text-white">Up Next</h3>
          <span className="px-2 py-0.5 rounded-full bg-dark-800 text-[11px] sm:text-xs font-mono font-semibold text-cyan-400 border border-white/5">
            {queue.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {userRole === 'host' && queue.length > 0 && (
            <button
              onClick={handleClear}
              className="text-xs text-slate-400 hover:text-red-400 px-2 py-1 rounded hover:bg-dark-800 transition-colors"
            >
              Clear All
            </button>
          )}
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-1.5 bg-cyan-400/15 hover:bg-cyan-400/25 text-cyan-400 border border-cyan-400/30 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Song</span>
          </button>
        </div>
      </div>

      {/* Queue Items */}
      {queue.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-8 sm:py-10 text-center text-slate-500 border border-dashed border-white/5 rounded-xl p-4 sm:p-6">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-dark-850 flex items-center justify-center text-slate-400 mb-2.5 sm:mb-3 border border-white/5">
            <Music2 className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" />
          </div>
          <p className="text-xs sm:text-sm font-semibold text-slate-200">No songs lined up next</p>
          <p className="text-[11px] sm:text-xs text-slate-400 max-w-xs mt-1 mb-3 sm:mb-4">
            Add songs to the playlist to keep the music playing smoothly!
          </p>
          <button
            onClick={onOpenSearch}
            className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-cyan-400 text-black font-semibold text-xs hover:bg-white transition-all shadow-md active:scale-95"
          >
            Browse & Add Songs
          </button>
        </div>
      ) : (
        <div className="space-y-1.5 sm:space-y-2 overflow-y-auto max-h-[440px] pr-1">
          {queue.map((track, idx) => {
            const isCurrent = Boolean(
              currentTrack &&
                ((track.queueId && currentTrack.queueId && track.queueId === currentTrack.queueId) ||
                  track.id === currentTrack.id)
            );

            return (
              <div
                key={track.queueId || `${track.id}-${idx}`}
                className={`flex items-center justify-between p-2.5 sm:p-3 rounded-xl border transition-all group ${
                  isCurrent
                    ? 'bg-cyan-500/10 border-cyan-400/40 shadow-[0_0_20px_rgba(0,240,255,0.08)]'
                    : 'bg-dark-950/70 border-white/5 hover:border-white/10'
                }`}
              >
                {/* Track Details */}
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                  {isCurrent ? (
                    <div className="w-5 flex items-center justify-center shrink-0 relative" title="Currently Playing">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping absolute opacity-75" />
                      <span className="relative w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f0ff]" />
                    </div>
                  ) : (
                    <span className="text-xs font-mono font-bold text-slate-500 w-5 text-right shrink-0">
                      #{idx + 1}
                    </span>
                  )}

                  <div className="relative shrink-0">
                    <img
                      src={track.artwork || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100'}
                      alt={track.title}
                      className={`w-10 h-10 sm:w-11 sm:h-11 rounded-lg object-cover bg-dark-800 shrink-0 border ${
                        isCurrent ? 'border-cyan-400/50 shadow-sm' : 'border-white/5'
                      }`}
                    />
                    {isCurrent && (
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500 border border-dark-950"></span>
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4
                      className={`text-xs sm:text-sm font-semibold truncate transition-colors ${
                        isCurrent ? 'text-cyan-300 font-bold' : 'text-white group-hover:text-cyan-400'
                      }`}
                    >
                      {track.title}
                    </h4>
                    <p className="text-[11px] sm:text-xs text-slate-400 truncate">{track.artist}</p>
                    <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 text-[10px] text-slate-500">
                      {isCurrent && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-mono font-bold text-cyan-300 bg-cyan-950/80 px-1.5 py-0.2 rounded border border-cyan-400/30">
                          <Radio className="w-2.5 h-2.5 text-cyan-400 animate-pulse" />
                          <span>PLAYING</span>
                        </span>
                      )}
                      <span className="truncate max-w-[90px] sm:max-w-none">{track.addedBy || 'Guest'}</span>
                      <span>•</span>
                      <span className="shrink-0">
                        {Math.floor(track.duration / 60)}:
                        {(track.duration % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  {canControl ? (
                    <div className="flex items-center gap-0.5 sm:gap-1">
                      <button
                        onClick={() => handleForcePlay(track)}
                        className={`p-2 rounded-lg transition-colors active:scale-90 ${
                          isCurrent
                            ? 'text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 hover:bg-cyan-900/50'
                            : 'text-slate-400 hover:text-cyan-400 hover:bg-dark-800'
                        }`}
                        title={isCurrent ? 'Restart track across room' : 'Play Now across room'}
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                      <button
                        onClick={() => track.queueId && handleRemove(track.queueId)}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-dark-800 transition-colors active:scale-90"
                        title="Remove from queue"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : isCurrent ? (
                    <span className="text-[10px] font-mono font-bold text-cyan-400 px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-400/30">
                      Playing
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-slate-500 px-2 py-0.5 rounded bg-dark-900 border border-white/5">
                      Queued
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
