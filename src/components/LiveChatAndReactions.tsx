import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Sparkles,
  Flame,
  Heart,
  PartyPopper,
  Zap,
  Rocket,
  Volume2,
  Smile,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ChatMessage, ReactionItem, User } from '../types';
import { socket } from '../services/socket';

interface LiveChatAndReactionsProps {
  messages: ChatMessage[];
  currentUser: User | null;
  onHide?: () => void;
}

const REACTION_EMOJIS = ['🔥', '❤️', '🎉', '⚡', '🚀', '🔊', '💃', '🤯'];

export const LiveChatAndReactions: React.FC<LiveChatAndReactionsProps> = ({
  messages,
  currentUser,
  onHide,
}) => {
  const [inputText, setInputText] = useState('');
  const [reactions, setReactions] = useState<ReactionItem[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll internal chat container to bottom on new message (WITHOUT scrolling the main page/window)
  useEffect(() => {
    if (chatContainerRef.current && isChatOpen) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isChatOpen]);

  // Listen to real-time reaction events from other users
  useEffect(() => {
    const handleReaction = (payload: { id: string; emoji: string; userName: string }) => {
      const newReaction: ReactionItem = {
        id: payload.id || `r-${Date.now()}-${Math.random()}`,
        emoji: payload.emoji,
        userName: payload.userName || 'Guest',
        xPosition: Math.floor(15 + Math.random() * 70), // Random horizontal %
        timestamp: Date.now(),
      };

      setReactions((prev) => [...prev, newReaction]);

      // Trigger party confetti for celebration emojis
      if (payload.emoji === '🎉' || payload.emoji === '🔥') {
        confetti({
          particleCount: 20,
          spread: 55,
          origin: { y: 0.8 },
          colors: ['#00f0ff', '#9d4edd', '#ff007f'],
        });
      }

      // Automatically remove reaction item after animation completes
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
      }, 3500);
    };

    socket.on('reaction_received', handleReaction);

    return () => {
      socket.off('reaction_received', handleReaction);
    };
  }, []);

  const handleSendReaction = (emoji: string) => {
    socket.emit('send_reaction', { emoji });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    socket.emit('send_chat', { text: inputText.trim() });
    setInputText('');
  };

  return (
    <>
      {/* 1. Full-Screen Floating Real-Time Emoji Layer */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {reactions.map((r) => (
          <div
            key={r.id}
            style={{ left: `${r.xPosition}%`, bottom: '90px' }}
            className="absolute animate-float-up flex flex-col items-center select-none"
          >
            <span className="text-3xl md:text-5xl filter drop-shadow-[0_0_12px_rgba(0,240,255,0.6)]">
              {r.emoji}
            </span>
            <span className="text-[10px] font-mono text-cyan-400 bg-dark-950/80 px-1.5 py-0.5 rounded-full border border-white/10 mt-1 whitespace-nowrap">
              {r.userName}
            </span>
          </div>
        ))}
      </div>

      {/* 2. Compact Live Chat & Reaction Dock */}
      <div className="bg-dark-900/70 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-lg transition-all duration-300">
        {/* Chat Header */}
        <div className="px-3.5 py-2.5 border-b border-white/10 flex items-center justify-between bg-dark-950/40">
          <div
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="flex items-center gap-2 cursor-pointer select-none hover:opacity-80 transition-opacity"
          >
            <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
            <h3 className="text-xs font-semibold text-white">Live Room Chat</h3>
            <span className="text-[10px] font-mono text-slate-400">({messages.length})</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-dark-800 transition-colors"
              title={isChatOpen ? 'Collapse chat' : 'Expand chat'}
            >
              {isChatOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
            {onHide && (
              <button
                onClick={onHide}
                className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-white px-2 py-0.5 rounded-md hover:bg-dark-800 border border-white/5 hover:border-white/15 transition-all ml-1"
                title="Hide chat to get more space for music"
              >
                <X className="w-3 h-3" />
                <span>Hide</span>
              </button>
            )}
          </div>
        </div>

        {/* Reaction Emoji Strip (Comfortable Touch Targets) */}
        <div className="px-1.5 sm:px-2.5 py-1.5 bg-dark-950/70 border-b border-white/5 flex items-center justify-around gap-0.5 sm:gap-1 overflow-x-auto no-scrollbar">
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleSendReaction(emoji)}
              className="text-lg sm:text-base min-w-[34px] min-h-[34px] sm:min-w-0 sm:min-h-0 p-1 sm:p-1 rounded-lg hover:bg-dark-800 hover:scale-125 transition-transform active:scale-95 flex items-center justify-center shrink-0"
              title={`Send ${emoji} reaction`}
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Shorter Chat Messages Body (Collapsible, h-40/h-44 instead of h-72) */}
        {isChatOpen && (
          <div className="flex flex-col h-40 md:h-44">
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-2.5 space-y-2 text-xs">
              {messages.map((msg) => {
                const isMe = msg.user.id === currentUser?.id;
                const isSys = msg.isSystem;

                if (isSys) {
                  return (
                    <div key={msg.id} className="text-center my-1">
                      <span className="text-[10px] text-slate-400 bg-dark-950/70 border border-white/5 px-2 py-0.5 rounded-full inline-block">
                        {msg.text}
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span
                        style={{ color: msg.user.avatarColor || '#00f0ff' }}
                        className="font-medium text-[10px]"
                      >
                        {msg.user.name}
                      </span>
                      {msg.user.role === 'host' && (
                        <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1 rounded">
                          HOST
                        </span>
                      )}
                      {msg.user.role === 'dj' && (
                        <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1 rounded">
                          DJ
                        </span>
                      )}
                      <span className="text-[9px] text-slate-500">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div
                      className={`max-w-[85%] px-2.5 py-1 rounded-xl text-xs break-words ${
                        isMe
                          ? 'bg-cyan-400 text-black font-medium rounded-tr-none'
                          : 'bg-dark-800 text-slate-100 rounded-tl-none border border-white/5'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Chat Input (Compact & Mobile zoom-proof) */}
            <form onSubmit={handleSendMessage} className="p-1.5 bg-dark-950/90 border-t border-white/5 flex gap-1.5">
              <input
                type="text"
                placeholder="Say something to room..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                maxLength={300}
                className="flex-1 bg-dark-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-base sm:text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="px-2.5 py-1.5 bg-cyan-400 text-black rounded-lg hover:bg-white disabled:opacity-40 disabled:hover:bg-cyan-400 transition-colors flex items-center justify-center shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}
      </div>
    </>
  );
};
