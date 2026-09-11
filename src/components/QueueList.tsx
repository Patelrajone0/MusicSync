import React, { useState } from 'react';
import {
  Trash2,
  Play,
  Music2,
  Plus,
  Radio,
  Star,
  Check,
  ArrowLeft,
  Sparkles
} from 'lucide-react';
import { Track, UserRole } from '../types';
import { socket } from '../services/socket';
import { syncEngine } from '../services/syncEngine';
import { cleanTrackTitle } from '../services/musicApi';
import { useFavorites } from '../services/favoritesService';

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
  const [activeView, setActiveView] = useState<'queue' | 'favorites'>('queue');
  const [addedTrackIds, setAddedTrackIds] = useState<Set<string>>(new Set());
  const { favorites, favoriteCount, isFavorite, toggleFavorite } = useFavorites();
  const canControl = userRole === 'host' || userRole === 'dj';

  const handleRemove = (queueId: string) => {
    if (!canControl) return;
    socket.emit('queue_remove', { queueId });
  };

  const handleForcePlay = (track: Track) => {
    if (!canControl) return;
    syncEngine.primePlayback(track, 0);
    socket.emit('request_play', { track, position: 0 });
  };

  const handleClear = () => {
    if (userRole !== 'host') return;
    socket.emit('queue_clear');
  };

  const handleAddFavoriteToQueue = (track: Track) => {
    socket.emit('queue_add', { track });
    setAddedTrackIds((prev) => new Set(prev).add(track.id));
    setTimeout(() => {
      setAddedTrackIds((prev) => {
        const next = new Set(prev);
        next.delete(track.id);
        return next;
      });
    }, 1800);
  };

  // If queue is empty and user has favorites, ALWAYS display Favorite songs there instead of empty space!
  const isShowingFavorites = activeView === 'favorites' || (queue.length === 0 && favorites.length > 0);

  return (
    <div className="bg-dark-900/70 backdrop-blur-xl border border-white/10 hover:border-cyan-400/30 rounded-2xl p-4 sm:p-5 flex flex-col h-full shadow-2xl transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-3.5 sm:mb-4">
        <div className="flex items-center gap-2 sm:gap-2.5">
          {activeView === 'favorites' ? (
            <>
              <button
                onClick={() => setActiveView('queue')}
                className="p-1 -ml-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                title="Back to Queue"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full p-[1.5px] bg-gradient-to-tr from-amber-400 via-yellow-300 to-rose-400 shadow-[0_0_8px_rgba(251,191,36,0.45)] shrink-0 flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-dark-950 flex items-center justify-center text-amber-400">
                  <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-amber-400" />
                </div>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white">Favorites</h3>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-[11px] sm:text-xs font-mono font-semibold text-amber-300 border border-amber-500/20">
                {favoriteCount}
              </span>
            </>
          ) : (
            <>
              <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full p-[1.5px] bg-gradient-to-tr from-cyan-400 via-sky-400 to-fuchsia-500 shadow-[0_0_8px_rgba(0,240,255,0.45)] shrink-0 flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-dark-950 flex items-center justify-center text-cyan-400">
                  <Music2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white">Up Next</h3>
              <span className="px-2 py-0.5 rounded-full bg-dark-950 text-[11px] sm:text-xs font-mono font-bold text-cyan-400 border border-white/10 shadow-sm">
                {queue.length}
              </span>
              {queue.length === 0 && favorites.length > 0 && (
                <span className="text-[11px] font-semibold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-full hidden sm:inline-flex items-center gap-1 shadow-sm">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span>Showing Favorites ({favoriteCount})</span>
                </span>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {activeView === 'queue' && userRole === 'host' && queue.length > 0 && (
            <button
              onClick={handleClear}
              className="text-xs text-slate-400 hover:text-red-400 px-2.5 py-1 rounded-full hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition-all"
            >
              Clear All
            </button>
          )}

          {/* Add Song Button */}
          <button
            onClick={onOpenSearch}
            className="group flex items-center gap-1.5 p-1 pl-1.5 pr-3 rounded-full bg-dark-900/90 hover:bg-dark-850 border border-cyan-400/40 hover:border-cyan-400 text-white text-xs font-bold transition-all duration-200 shadow-[0_0_10px_rgba(0,240,255,0.2)] hover:shadow-[0_0_16px_rgba(0,240,255,0.5)] active:scale-95 shrink-0 cursor-pointer select-none"
            title="Search & browse songs"
          >
            <div className="relative w-[20px] h-[20px] sm:w-[22px] sm:h-[22px] rounded-full p-[1.5px] bg-gradient-to-tr from-cyan-400 via-sky-400 to-fuchsia-500 shadow-[0_0_6px_rgba(0,240,255,0.5)] shrink-0 flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-cyan-400 flex items-center justify-center text-black font-black">
                <Plus className="w-3 h-3 stroke-[2.5]" />
              </div>
            </div>
            <span className="text-white group-hover:text-cyan-300 transition-colors tracking-tight">Add Song</span>
          </button>

          {/* Favorites Button (Immediately beside Add Song) */}
          <button
            onClick={() => setActiveView(activeView === 'favorites' ? 'queue' : 'favorites')}
            className={`group flex items-center gap-1.5 p-1 pl-1.5 pr-3 rounded-full text-xs font-bold transition-all duration-200 active:scale-95 shadow-lg shrink-0 cursor-pointer select-none ${
              isShowingFavorites
                ? 'bg-amber-400 text-black shadow-[0_0_16px_rgba(251,191,36,0.4)]'
                : 'bg-dark-900/90 hover:bg-dark-850 border border-amber-400/30 hover:border-amber-400/60 text-amber-300'
            }`}
            title={activeView === 'favorites' ? 'Return to Queue' : 'View Your Saved Favorites'}
          >
            <div className={`relative w-[20px] h-[20px] sm:w-[22px] sm:h-[22px] rounded-full p-[1.5px] ${
              isShowingFavorites
                ? 'bg-black/30'
                : 'bg-gradient-to-tr from-amber-400 via-yellow-300 to-rose-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]'
            } shrink-0 flex items-center justify-center`}>
              <div className={`w-full h-full rounded-full flex items-center justify-center ${
                isShowingFavorites ? 'bg-black text-amber-400' : 'bg-dark-950 text-amber-400'
              }`}>
                <Star className="w-2.5 h-2.5 fill-current" />
              </div>
            </div>
            <span>Favorites</span>
            {favoriteCount > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  isShowingFavorites
                    ? 'bg-black/20 text-black'
                    : 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                }`}
              >
                {favoriteCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* DISPLAY FAVORITES SONGS (Whenever in Favorites view OR whenever queue is empty and favorites exist) */}
      {isShowingFavorites ? (
        favorites.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-8 sm:py-10 text-center text-slate-500 border border-dashed border-amber-500/20 bg-amber-500/[0.02] rounded-xl p-4 sm:p-6">
            <div className="relative w-12 h-12 rounded-full p-[2px] bg-gradient-to-tr from-amber-400 via-yellow-300 to-rose-400 shadow-[0_0_16px_rgba(251,191,36,0.4)] flex items-center justify-center text-amber-400 mb-3">
              <div className="w-full h-full rounded-full bg-dark-950 flex items-center justify-center">
                <Star className="w-6 h-6 fill-amber-400 text-amber-400 animate-pulse" />
              </div>
            </div>
            <p className="text-sm font-semibold text-slate-200">No favorite songs yet</p>
            <p className="text-xs text-slate-400 max-w-xs mt-1 mb-4 leading-relaxed">
              Click the <span className="text-amber-400 font-bold">★ star icon</span> next to <span className="text-cyan-300 font-semibold">+ Add</span> on any song to save it here permanently!
            </p>
            <button
              onClick={onOpenSearch}
              className="px-4 py-2 rounded-full bg-amber-400 text-black font-bold text-xs hover:bg-white transition-all shadow-md active:scale-95 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Browse & Star Songs</span>
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Banner when auto-displaying favorites because queue is empty */}
            {queue.length === 0 && (
              <div className="flex items-center justify-between px-3 py-1.5 mb-3 rounded-full bg-amber-500/10 border border-amber-400/25 text-xs text-amber-200 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="relative w-5 h-5 rounded-full p-[1px] bg-gradient-to-tr from-amber-400 to-rose-400 shadow-[0_0_6px_rgba(251,191,36,0.5)] shrink-0 flex items-center justify-center">
                    <div className="w-full h-full rounded-full bg-dark-950 flex items-center justify-center text-amber-400">
                      <Star className="w-2.5 h-2.5 fill-current" />
                    </div>
                  </div>
                  <span className="font-medium text-[11px] sm:text-xs">Queue is empty — play or queue your favorite songs:</span>
                </div>
                <button
                  onClick={onOpenSearch}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 hover:underline shrink-0 pl-2"
                >
                  <Plus className="w-3 h-3" />
                  <span>Browse More</span>
                </button>
              </div>
            )}

            <div className="space-y-1.5 sm:space-y-2 overflow-y-auto max-h-[440px] pr-1">
              {favorites.map((track, idx) => {
                const isAdded = addedTrackIds.has(track.id);
                return (
                  <div
                    key={track.id || `fav-${idx}`}
                    className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl border border-white/5 bg-dark-950/70 hover:border-amber-400/30 transition-all group"
                  >
                    {/* Track Details */}
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                      <span className="text-xs font-mono font-bold text-amber-400/60 w-5 text-right shrink-0">
                        #{idx + 1}
                      </span>

                      {/* Circular Artwork with Neon Halo Ring */}
                      <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-full p-[1.5px] bg-gradient-to-tr from-cyan-400 via-sky-400 to-fuchsia-500 shadow-[0_0_8px_rgba(0,240,255,0.35)] group-hover:shadow-[0_0_12px_rgba(0,240,255,0.65)] shrink-0 flex items-center justify-center transition-all duration-200">
                        <img
                          src={track.artwork || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100'}
                          alt={track.title}
                          className="w-full h-full rounded-full object-cover bg-dark-950 border border-dark-950"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs sm:text-sm font-semibold truncate text-white group-hover:text-amber-300 transition-colors">
                          {cleanTrackTitle(track.title, track.artist)}
                        </h4>
                        <p className="text-[11px] sm:text-xs text-slate-400 truncate">{track.artist}</p>
                        <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 text-[10px] text-slate-500">
                          {track.languageBadge && (
                            <span className="px-1.5 py-0.2 rounded bg-dark-800 text-slate-300 border border-white/5 font-mono">
                              {track.languageBadge}
                            </span>
                          )}
                          <span className="shrink-0">
                            {Math.floor(track.duration / 60)}:
                            {(track.duration % 60).toString().padStart(2, '0')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {/* Add to Queue Button */}
                      <button
                        onClick={() => handleAddFavoriteToQueue(track)}
                        className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all active:scale-95 shadow-sm ${
                          isAdded
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_8px_rgba(52,211,153,0.3)]'
                            : 'bg-dark-900 hover:bg-dark-850 text-cyan-300 border border-cyan-400/30 hover:border-cyan-400 shadow-[0_0_8px_rgba(0,240,255,0.2)]'
                        }`}
                        title="Add this favorite song to live queue"
                      >
                        {isAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Added!</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add</span>
                          </>
                        )}
                      </button>

                      {/* Play Now (if host or DJ) */}
                      {canControl && (
                        <button
                          onClick={() => handleForcePlay(track)}
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center bg-dark-900/90 text-slate-300 hover:text-black hover:bg-cyan-400 border border-white/10 hover:border-cyan-400 transition-all duration-200 shadow-sm active:scale-90"
                          title="Play Now across room"
                        >
                          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                        </button>
                      )}

                      {/* Star Icon Button (Always active/filled in Favorites view, click to unstar) */}
                      <button
                        onClick={() => toggleFavorite(track)}
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-amber-400 bg-amber-400/15 hover:bg-rose-500/20 hover:text-rose-400 border border-amber-400/30 transition-all active:scale-90 shadow-[0_0_6px_rgba(251,191,36,0.25)]"
                        title="Remove from Favorites"
                      >
                        <Star className="w-3.5 h-3.5 fill-current" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      ) : (
        /* DISPLAY QUEUE (When queue has tracks and activeView is 'queue') */
        queue.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-8 sm:py-10 text-center text-slate-500 border border-dashed border-white/5 rounded-xl p-4 sm:p-6">
            <div className="relative w-12 h-12 rounded-full p-[2px] bg-gradient-to-tr from-cyan-400 via-sky-400 to-fuchsia-500 shadow-[0_0_14px_rgba(0,240,255,0.4)] flex items-center justify-center text-cyan-400 mb-2.5 sm:mb-3">
              <div className="w-full h-full rounded-full bg-dark-950 flex items-center justify-center">
                <Music2 className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />
              </div>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-slate-200">No songs lined up next</p>
            <p className="text-[11px] sm:text-xs text-slate-400 max-w-xs mt-1 mb-3 sm:mb-4">
              Add songs to the playlist to keep the music playing smoothly!
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenSearch}
                className="px-4 py-2 rounded-full bg-cyan-400 text-black font-semibold text-xs hover:bg-white transition-all shadow-md active:scale-95"
              >
                Browse & Add Songs
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5 sm:space-y-2 overflow-y-auto max-h-[440px] pr-1">
            {queue.map((track, idx) => {
              const isCurrent = Boolean(
                currentTrack &&
                  ((track.queueId && currentTrack.queueId && track.queueId === currentTrack.queueId) ||
                    track.id === currentTrack.id)
              );
              const isStarred = isFavorite(track.id);

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

                    {/* Circular Artwork with Neon Halo Ring */}
                    <div className="relative shrink-0">
                      <div className={`relative w-11 h-11 sm:w-12 sm:h-12 rounded-full p-[1.5px] ${
                        isCurrent
                          ? 'bg-gradient-to-tr from-cyan-400 via-sky-400 to-fuchsia-500 shadow-[0_0_14px_rgba(0,240,255,0.7)] animate-pulse'
                          : 'bg-gradient-to-tr from-cyan-400/70 via-sky-400/70 to-fuchsia-500/70 shadow-[0_0_8px_rgba(0,240,255,0.3)] group-hover:shadow-[0_0_12px_rgba(0,240,255,0.6)]'
                      } shrink-0 flex items-center justify-center transition-all duration-200`}>
                        <img
                          src={track.artwork || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100'}
                          alt={track.title}
                          className="w-full h-full rounded-full object-cover bg-dark-950 border border-dark-950"
                        />
                      </div>
                      {isCurrent && (
                        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-cyan-400 border-2 border-dark-950 shadow-[0_0_6px_#00f0ff]"></span>
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4
                        className={`text-xs sm:text-sm font-semibold truncate transition-colors ${
                          isCurrent ? 'text-cyan-300 font-bold' : 'text-white group-hover:text-cyan-400'
                        }`}
                      >
                        {cleanTrackTitle(track.title, track.artist)}
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
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {/* Star toggle button for queue row */}
                    <button
                      onClick={() => toggleFavorite(track)}
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border transition-all active:scale-90 ${
                        isStarred
                          ? 'bg-amber-400/20 text-amber-400 border-amber-400/40 shadow-[0_0_8px_rgba(251,191,36,0.3)]'
                          : 'bg-dark-900/80 text-slate-500 hover:text-amber-300 border-white/10 hover:border-amber-400/40'
                      }`}
                      title={isStarred ? 'Remove from Favorites' : 'Add to Favorites'}
                    >
                      <Star className={`w-3.5 h-3.5 ${isStarred ? 'fill-amber-400 text-amber-400' : ''}`} />
                    </button>

                    {canControl ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleForcePlay(track)}
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 ${
                            isCurrent
                              ? 'text-cyan-400 bg-cyan-950 border border-cyan-400 shadow-[0_0_10px_rgba(0,240,255,0.4)] animate-pulse'
                              : 'bg-dark-900/90 text-slate-300 hover:text-black hover:bg-cyan-400 border border-white/10 hover:border-cyan-400'
                          }`}
                          title={isCurrent ? 'Restart track across room' : 'Play Now across room'}
                        >
                          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                        </button>
                        <button
                          onClick={() => track.queueId && handleRemove(track.queueId)}
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center bg-dark-900/90 text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 border border-white/10 hover:border-rose-500/40 transition-all active:scale-90"
                          title="Remove from queue"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : isCurrent ? (
                      <span className="text-[10px] font-mono font-bold text-cyan-400 px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-400/30 shadow-[0_0_6px_rgba(0,240,255,0.3)]">
                        Playing
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-slate-400 px-2 py-0.5 rounded-full bg-dark-900 border border-white/5">
                        Queued
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
};
