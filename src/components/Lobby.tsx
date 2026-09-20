import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  User as UserIcon,
  Wifi,
  Globe,
  Zap,
  Radio,
  Lock,
} from 'lucide-react';
import { RoomState, User } from '../types';
import { socket } from '../services/socket';
import { syncEngine } from '../services/syncEngine';
import { Logo } from './Logo';
import { getDeviceId } from '../utils/deviceId';
import { NetworkMode } from './NetworkModeModal';
import { LobbyThemeVariant, LobbyThemeProps } from './lobby/types';
import { LobbyCyberDeck } from './lobby/LobbyCyberDeck';
import { LobbyStudioPro } from './lobby/LobbyStudioPro';
import { LobbyHoloTabs } from './lobby/LobbyHoloTabs';
import { LobbyClassic } from './lobby/LobbyClassic';
import { ThemeSwitcherDock } from './lobby/LobbyHelpers';

interface LobbyProps {
  onRoomReady: (room: RoomState, user: User) => void;
  initialRoomCode?: string;
}

const USER_NAME_STORAGE_KEY = 'musicsync_user_name';
const LOBBY_THEME_STORAGE_KEY = 'musicsync_lobby_theme';

export const Lobby: React.FC<LobbyProps> = ({ onRoomReady, initialRoomCode = '' }) => {
  const [themeVariant, setThemeVariant] = useState<LobbyThemeVariant>(() => {
    try {
      return (localStorage.getItem(LOBBY_THEME_STORAGE_KEY) as LobbyThemeVariant) || 'cyber_deck';
    } catch {
      return 'cyber_deck';
    }
  });

  const handleSelectTheme = (variant: LobbyThemeVariant) => {
    setThemeVariant(variant);
    try {
      localStorage.setItem(LOBBY_THEME_STORAGE_KEY, variant);
    } catch {}
  };

  const [userName, setUserName] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(USER_NAME_STORAGE_KEY);
      if (saved && saved.trim()) return saved.trim();
    } catch (e) {}
    return '';
  });
  const [roomCodeInput, setRoomCodeInput] = useState<string>(initialRoomCode);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isEntering, setIsEntering] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const [networkMode, setNetworkMode] = useState<NetworkMode>(() => {
    try {
      return (localStorage.getItem('musicsync_network_mode') as NetworkMode) || 'local';
    } catch {
      return 'local';
    }
  });

  const handleNetworkModeChange = (mode: NetworkMode) => {
    setNetworkMode(mode);
    try {
      localStorage.setItem('musicsync_network_mode', mode);
    } catch {}
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem(USER_NAME_STORAGE_KEY);
      if (saved && saved.trim()) {
        setUserName(saved.trim());
      }
    } catch (e) {}

    if (initialRoomCode) {
      setRoomCodeInput(initialRoomCode.replace(/\D/g, ''));
    }
  }, [initialRoomCode]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUserName(val);
    try {
      localStorage.setItem(USER_NAME_STORAGE_KEY, val.trim());
    } catch (e) {}
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleCreateRoom = async () => {
    setIsCreating(true);
    setErrorMessage('');

    // Attempt to unlock Web Audio in background without blocking room creation
    syncEngine.unlockAudio().catch(() => {});

    const doCreate = () => {
      const timeoutId = setTimeout(() => {
        setIsCreating(false);
        setErrorMessage('Connection taking longer than expected. Please check your internet or retry.');
      }, 12000);

      socket.emit('create_room', { userName, deviceId: getDeviceId(), networkMode }, (res: any) => {
        clearTimeout(timeoutId);
        if (res && res.success && res.room && res.user) {
          setIsEntering(true);
          setTimeout(() => {
            setIsCreating(false);
            onRoomReady(res.room, res.user);
          }, 520);
        } else {
          setIsCreating(false);
          setErrorMessage(res?.error || 'Failed to create room. Please try again.');
        }
      });
    };

    if (socket.connected) {
      doCreate();
    } else {
      socket.connect();
      const waitingTimer = setTimeout(() => {
        setErrorMessage('Connecting to live server...');
      }, 1500);

      const connectTimeout = setTimeout(() => {
        socket.off('connect', onConnect);
        socket.off('connect_error', onErr);
        clearTimeout(waitingTimer);
        setIsCreating(false);
        setErrorMessage('Could not connect to the server. Please verify your connection or check if backend is running.');
      }, 12000);

      const onConnect = () => {
        clearTimeout(waitingTimer);
        clearTimeout(connectTimeout);
        socket.off('connect_error', onErr);
        setErrorMessage('');
        doCreate();
      };

      const onErr = (err: any) => {
        console.warn('Socket connect error:', err);
      };

      socket.once('connect', onConnect);
      socket.once('connect_error', onErr);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = roomCodeInput.trim().replace(/\D/g, '');
    if (!code) return;

    setIsJoining(true);
    setErrorMessage('');

    syncEngine.unlockAudio().catch(() => {});

    const doJoin = () => {
      const timeoutId = setTimeout(() => {
        setIsJoining(false);
        setErrorMessage('Connection timed out. Check the code and try again.');
      }, 12000);

      socket.emit('join_room', { roomCode: code, userName, deviceId: getDeviceId() }, (res: any) => {
        clearTimeout(timeoutId);
        if (res && res.success && res.room && res.user) {
          setIsEntering(true);
          setTimeout(() => {
            setIsJoining(false);
            onRoomReady(res.room, res.user);
          }, 520);
        } else {
          setIsJoining(false);
          setErrorMessage(res?.error || 'Room not found. Check code and try again.');
        }
      });
    };

    if (socket.connected) {
      doJoin();
    } else {
      socket.connect();
      const waitingTimer = setTimeout(() => {
        setErrorMessage('Connecting to live server...');
      }, 1500);

      const connectTimeout = setTimeout(() => {
        socket.off('connect', onConnect);
        socket.off('connect_error', onErr);
        clearTimeout(waitingTimer);
        setIsJoining(false);
        setErrorMessage('Could not connect to the server. Please verify your connection or check if backend is running.');
      }, 12000);

      const onConnect = () => {
        clearTimeout(waitingTimer);
        clearTimeout(connectTimeout);
        socket.off('connect_error', onErr);
        setErrorMessage('');
        doJoin();
      };

      const onErr = (err: any) => {
        console.warn('Socket join connect error:', err);
      };

      socket.once('connect', onConnect);
      socket.once('connect_error', onErr);
    }
  };

  const themeProps: LobbyThemeProps = {
    userName,
    onNameChange: handleNameChange,
    networkMode,
    onNetworkModeChange: handleNetworkModeChange,
    roomCodeInput,
    onRoomCodeChange: (val) => setRoomCodeInput(val),
    isCreating,
    isJoining,
    isEntering,
    errorMessage,
    onCreateRoom: handleCreateRoom,
    onJoinRoom: handleJoinRoom,
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-3 sm:px-4 pt-4 sm:pt-6 pb-20 sm:pb-24 relative overflow-y-auto">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-electric-cyan/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-96 h-96 bg-electric-purple/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div
        className="max-w-md w-full z-10 transition-all duration-300 relative my-auto"
        style={isEntering ? { animation: 'cyberBlurWarp 0.52s cubic-bezier(0.4, 0, 0.2, 1) forwards' } : {}}
      >
        {/* Logo & Headline */}
        <div className="text-center mb-3 sm:mb-4">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              handleRefresh();
            }}
            title="Refresh MusicSync"
            className="inline-flex flex-col items-center group cursor-pointer focus:outline-none transition-transform active:scale-95 mb-1"
          >
            <Logo size="lg" layout="vertical" showTagline={true} />
          </a>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-sm mx-auto px-2">
            Zero-latency synchronized music streaming. Turn any group of phones and laptops into an acoustic speaker system.
          </p>
        </div>

        {/* Selected Theme Variant Card */}
        {themeVariant === 'cyber_deck' && <LobbyCyberDeck {...themeProps} />}
        {themeVariant === 'studio_pro' && <LobbyStudioPro {...themeProps} />}
        {themeVariant === 'holo_tabs' && <LobbyHoloTabs {...themeProps} />}
        {themeVariant === 'classic' && <LobbyClassic {...themeProps} />}
      </div>

      {/* Interactive Live Theme Switcher Floating Dock */}
      <ThemeSwitcherDock
        currentTheme={themeVariant}
        onSelectTheme={handleSelectTheme}
      />

      {/* Smooth Cyber Light Flare Bloom during Room Entry */}
      {isEntering && (
        <div className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center animate-fade-in">
          <div className="w-[650px] h-[650px] rounded-full bg-cyan-400/25 blur-3xl animate-pulse" />
        </div>
      )}
    </div>
  );
};
