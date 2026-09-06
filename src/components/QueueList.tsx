import React from 'react';
import {
  ThumbsUp,
  ThumbsDown,
  Trash2,
  Play,
  Music2,
  Plus,
  Flame,
  User as UserIcon
} from 'lucide-react';
import { Track, UserRole } from '../types';
import { socket } from '../services/socket';
import { userTasteEngine } from '../services/userTaste';

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

  const handleVote = (queueId: string, type: 'up' | 'down') => {
    socket.emit('queue_vote', { queueId, type });
    if (type === 'up') {
      const target = queue.find((t) => (t.queueId || t.id) === queueId);
      if (target) {
        userTasteEngine.recordInteraction(target, 'upvoted');
      }
    }
  };

  const handleRemove = (queueId: string) => {
    if (!canControl) return;
    socket.emit('queue_remove', { queueId });
  };

  const handleForcePlay = (track: Track) => {
    if (!canControl) return;
    socket.emit('request_play', { track, position: 0 });
  };

  const handleClear = () => {
    if (userRole !== 'host') return;
    socket.emit('queue_clear');
  };

  return (
    <div className="bg-dark-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 md:p-5 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Music2 className="w-5 h-5 text-electric-cyan" />
          <h3 className="text-base font-bold text-white">Upcoming Queue</h3>
          <span className="px-2 py-0.5 rounded-full bg-dark-800 text-xs font-mono font-semibold text-electric-cyan border border-white/5">
            {queue.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
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
            className="flex items-center gap-1.5 bg-electric-cyan/15 hover:bg-electric-cyan/25 text-electric-cyan border border-electric-cyan/30 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Track</span>
          </button>
        </div>
      </div>

      {/* Queue Items */}
      {queue.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-10 text-center text-slate-500 border border-dashed border-white/5 rounded-xl p-6">
          <div className="w-12 h-12 rounded-2xl bg-dark-850 flex items-center justify-center text-slate-400 mb-3 border border-white/5">
            <Music2 className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-slate-300">No tracks in queue</p>
          <p className="text-xs text-slate-500 max-w-xs mt-1 mb-4">
            Anyone in the room can add songs. The room votes to choose what plays next!
          </p>
          <button
            onClick={onOpenSearch}
            className="px-4 py-2 rounded-xl bg-electric-cyan text-black font-semibold text-xs hover:bg-white transition-all shadow-md active:scale-95"
          >
            Browse Music Catalog
          </button>
        </div>
      ) : (
        <div className="space-y-2 overflow-y-auto max-h-[440px] pr-1">
          {queue.map((track, idx) => {
            const upvotes = track.upvotes || [];
            const downvotes = track.downvotes || [];
            const score = upvotes.length - downvotes.length;
            const hasUpvoted = currentUserId ? upvotes.includes(currentUserId) : false;
            const hasDownvoted = currentUserId ? downvotes.includes(currentUserId) : false;

            return (
              <div
                key={track.queueId || track.id}
                className="flex items-center justify-between p-3 rounded-xl bg-dark-950/70 border border-white/5 hover:border-white/10 transition-all group"
              >
                {/* Track Details */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="text-xs font-mono font-bold text-slate-500 w-4 text-right">
                    #{idx + 1}
                  </span>

                  <img
                    src={track.artwork || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100'}
                    alt={track.title}
                    className="w-11 h-11 rounded-lg object-cover bg-dark-800 shrink-0 border border-white/5"
                  />

                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold text-white truncate group-hover:text-electric-cyan transition-colors">
                      {track.title}
                    </h4>
                    <p className="text-xs text-slate-400 truncate">{track.artist}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500">
                      <span>Added by {track.addedBy || 'Guest'}</span>
                      <span>•</span>
                      <span>
                        {Math.floor(track.duration / 60)}:
                        {(track.duration % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Democratic Voting Controls */}
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <div className="flex items-center bg-dark-900 rounded-xl border border-white/10 p-1 shadow-inner">
                    <button
                      onClick={() => track.queueId && handleVote(track.queueId, 'up')}
                      className={`p-1.5 rounded-lg transition-all ${
                        hasUpvoted
                          ? 'bg-emerald-500 text-black font-bold scale-105'
                          : 'text-slate-400 hover:text-white hover:bg-dark-800'
                      }`}
                      title="Upvote track"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                    </button>

                    <span
                      className={`px-2 text-xs font-mono font-bold ${
                        score > 0
                          ? 'text-emerald-400'
                          : score < 0
                          ? 'text-rose-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {score > 0 ? `+${score}` : score}
                    </span>

                    <button
                      onClick={() => track.queueId && handleVote(track.queueId, 'down')}
                      className={`p-1.5 rounded-lg transition-all ${
                        hasDownvoted
                          ? 'bg-rose-500 text-black font-bold scale-105'
                          : 'text-slate-400 hover:text-white hover:bg-dark-800'
                      }`}
                      title="Downvote track"
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* DJ / Host Quick Actions */}
                  {canControl && (
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleForcePlay(track)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-electric-cyan hover:bg-dark-800 transition-colors"
                        title="Play Now across room"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                      <button
                        onClick={() => track.queueId && handleRemove(track.queueId)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-dark-800 transition-colors"
                        title="Remove from queue"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
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
