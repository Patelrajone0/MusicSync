import React, { useState } from 'react';
import {
  Activity,
  X,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Cpu,
  ShieldCheck
} from 'lucide-react';
import { SyncStats } from '../types';
import { syncEngine } from '../services/syncEngine';

interface SyncDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncStats: SyncStats;
}

export const SyncDiagnosticsModal: React.FC<SyncDiagnosticsModalProps> = ({
  isOpen,
  onClose,
  syncStats,
}) => {
  const [hardwareDelayOffset, setHardwareDelayOffset] = useState<number>(() => syncEngine.getHardwareDelayOffset());
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [audioState, setAudioState] = useState<string>(() => syncEngine.getAudioContext()?.state || 'suspended');

  if (!isOpen) return null;

  const audioCtx = syncEngine.getAudioContext();

  React.useEffect(() => {
    if (!isOpen) return;
    setHardwareDelayOffset(syncEngine.getHardwareDelayOffset());
    setAudioState(audioCtx?.state || 'suspended');

    // Trigger instant ping on opening modal to guarantee fresh live data
    syncEngine.pingServer();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleRecalibrate = async () => {
    setIsCalibrating(true);
    await syncEngine.recalibrate();
    setIsCalibrating(false);
  };

  const handleSliderChange = (val: number) => {
    setHardwareDelayOffset(val);
    syncEngine.setHardwareDelayOffset(val);
  };

  const handleUnlockAudio = async () => {
    await syncEngine.unlockAudio();
    setAudioState(syncEngine.getAudioContext()?.state || 'running');
  };

  const isHealthy = syncStats.isLocked || (syncStats.rtt > 0 && syncStats.rtt < 350);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-dark-900 border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-modal-spring"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-400/10 text-cyan-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">NTP Sync & Hardware Diagnostics</h3>
              <p className="text-xs text-slate-400">Zero-latency distributed speaker telemetry</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-dark-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sync Status Banner */}
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between mb-4 ${
            isHealthy
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
              : 'bg-amber-950/40 border-amber-500/30 text-amber-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {isHealthy ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            )}
            <div>
              <div className="text-xs font-bold uppercase tracking-wider">
                {isHealthy ? 'Speaker Array Synchronized' : 'Calibrating Clock Phase'}
              </div>
              <div className="text-[11px] opacity-80">
                {syncStats.isLocked
                  ? `Phase locked · ${Math.abs(syncStats.drift)}ms drift`
                  : syncStats.rtt > 0
                  ? `NTP clock locked (${syncStats.rtt}ms RTT) · Ready for broadcast`
                  : 'Establishing low-jitter network baseline...'}
              </div>
            </div>
          </div>
          <button
            onClick={handleRecalibrate}
            disabled={isCalibrating}
            className="p-2 rounded-lg bg-dark-900/60 hover:bg-dark-800 text-white transition-colors border border-white/5 active:scale-95"
            title="Force instant NTP calibration burst"
          >
            <RefreshCw className={`w-4 h-4 ${isCalibrating ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <div className="bg-dark-950 p-3 rounded-xl border border-white/5">
            <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1">
              Network RTT
            </div>
            <div className="text-xl font-bold font-mono text-white flex items-baseline gap-1">
              {syncStats.rtt || '--'}
              <span className="text-xs font-normal text-slate-400">ms</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Round trip packet transit</div>
          </div>

          <div className="bg-dark-950 p-3 rounded-xl border border-white/5">
            <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1">
              Clock Offset (θ)
            </div>
            <div className="text-xl font-bold font-mono text-cyan-400 flex items-baseline gap-1">
              {syncStats.clockOffset > 0 ? `+${syncStats.clockOffset}` : syncStats.clockOffset}
              <span className="text-xs font-normal text-slate-400">ms</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Server delta relative to local clock</div>
          </div>

          <div className="bg-dark-950 p-3 rounded-xl border border-white/5">
            <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1">
              Audio Drift
            </div>
            <div className="text-xl font-bold font-mono text-indigo-400 flex items-baseline gap-1">
              {Math.abs(syncStats.drift)}
              <span className="text-xs font-normal text-slate-400">ms</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Hardware buffer phase deviation</div>
          </div>

          <div className="bg-dark-950 p-3 rounded-xl border border-white/5">
            <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1">
              Web Audio Status
            </div>
            <div className="text-sm font-bold text-white capitalize flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span>{audioState}</span>
              </span>
              {audioState === 'suspended' && (
                <button
                  onClick={handleUnlockAudio}
                  className="text-[10px] text-cyan-400 hover:text-white underline font-normal"
                >
                  Activate
                </button>
              )}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {audioCtx ? `${audioCtx.sampleRate} Hz sample rate` : '44.1 kHz'}
            </div>
          </div>
        </div>

        {/* Bluetooth Speaker Latency Calibration */}
        <div className="bg-dark-950 p-3.5 rounded-xl border border-white/5 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs font-semibold text-slate-200">Bluetooth / Soundbar Nudge</span>
            </div>
            <span className="text-xs font-mono font-bold text-cyan-400">
              {hardwareDelayOffset > 0 ? `+${hardwareDelayOffset}` : hardwareDelayOffset} ms
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mb-2">
            Compensates for external wireless speaker latency in real-time. Adjust to match nearby devices.
          </p>
          <input
            type="range"
            min="-150"
            max="150"
            step="5"
            value={hardwareDelayOffset}
            onChange={(e) => handleSliderChange(parseInt(e.target.value))}
            className="w-full h-1.5 bg-dark-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-dark-800 hover:bg-dark-750 text-white font-medium text-xs transition-colors border border-white/5"
        >
          Close Diagnostics
        </button>
      </div>
    </div>
  );
};
