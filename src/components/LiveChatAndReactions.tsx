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
  ChevronUp
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ChatMessage, ReactionItem, User } from '../types';
import { socket } from '../services/socket';

interface LiveChatAndReactionsProps {
  messages: ChatMessage[];
  currentUser: User | null;
}

const REACTION_EMOJIS = ['🔥', '❤️', '🎉', '⚡', '🚀', '🔊', '💃', '🤯'];

export const LiveChatAndReactions: React.FC<LiveChatAndReactionsProps> = ({
  messages,
  currentUser,
}) => {
  const [inputText, setInputText] = useState('');
  const [reactions, setReactions] = useState<ReactionItem[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll chat to bottom on new message
  useEffect(() => {
    if (chatBottomRef.current && isChatOpen) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
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
          origin: { y: 0.85, x: newReaction.xPosition / 100 },
          colors: ['#00f0ff', '#9d4edd', '#ff007f'],
        });
      }

      // Automatically remove reaction item after animation completes
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
      }, 3000);
    };

    socket.on('new_reaction', handleReaction);

    return () => {
      socket.off('new_reaction', handleReaction);
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
            <span className="text-[10px] font-mono text-electric-cyan/90 bg-dark-950/80 px-1.5 py-0.5 rounded-full border border-white/10 mt-1 whitespace-nowrap">
              {r.userName}
            </span>
          </div>
        ))}
      </div>

      {/* 2. Floating Live Chat & Reaction Dock */}
      <div className="bg-dark-900/60 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col overflow-hidden transition-all duration-300">
        {/* Chat Header */}
        <div
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="p-3.5 border-b border-white/10 flex items-center justify-between cursor-pointer hover:bg-dark-850/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-electric-cyan" />
            <h3 className="text-sm font-bold text-white">Live Room Chat</h3>
            <span className="text-[11px] font-mono text-slate-400">({messages.length})</span>
          </div>
          <button className="text-slate-400 hover:text-white p-1">
            {isChatOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>

        {/* Reaction Emoji Strip (Always Available) */}
        <div className="px-3 py-2 bg-dark-950/80 border-b border-white/5 flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleSendReaction(emoji)}
              className="text-lg md:text-xl p-1.5 rounded-xl hover:bg-dark-800 hover:scale-125 transition-transform active:scale-95"
              title={`Send ${emoji} reaction to all synced speakers`}
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Chat Messages Body (Collapsible) */}
        {isChatOpen && (
          <div className="flex flex-col h-72">
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs">
              {messages.map((msg) => {
                const isMe = msg.user.id === currentUser?.id;
                const isSys = msg.isSystem;

                if (isSys) {
                  return (
                    <div key={msg.id} className="text-center my-1.5">
                      <span className="text-[11px] text-slate-400 bg-dark-950/70 border border-white/5 px-2.5 py-1 rounded-full inline-block">
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
                        className="font-semibold text-[11px]"
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
                      <span className="text-[10px] text-slate-500">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div
                      className={`max-w-[85%] px-3 py-1.5 rounded-2xl break-words ${
                        isMe
                          ? 'bg-electric-cyan text-black font-medium rounded-tr-none'
                          : 'bg-dark-800 text-slate-100 rounded-tl-none border border-white/5'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })}
              <div ref={chatBottomRef} />
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendMessage} className="p-2 bg-dark-950/90 border-t border-white/5 flex gap-2">
              <input
                type="text"
                placeholder="Say something to the room..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                maxLength={300}
                className="flex-1 bg-dark-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-electric-cyan transition-colors"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="p-2 bg-electric-cyan text-black rounded-xl hover:bg-white disabled:opacity-40 disabled:hover:bg-electric-cyan transition-colors"
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
