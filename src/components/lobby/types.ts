import React from 'react';
import { NetworkMode } from '../NetworkModeModal';

export type LobbyThemeVariant = 'cyber_deck' | 'studio_pro' | 'holo_tabs' | 'classic';

export interface LobbyThemeProps {
  userName: string;
  onNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  networkMode: NetworkMode;
  onNetworkModeChange: (mode: NetworkMode) => void;
  roomCodeInput: string;
  onRoomCodeChange: (val: string) => void;
  isCreating: boolean;
  isJoining: boolean;
  isEntering: boolean;
  errorMessage: string;
  onCreateRoom: () => void;
  onJoinRoom: (e: React.FormEvent) => void;
}
