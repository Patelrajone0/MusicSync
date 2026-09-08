import React, { useEffect, useRef, useState } from 'react';
import { syncEngine } from '../services/syncEngine';
import { Eye, Activity, Radio, Sparkles } from 'lucide-react';

interface AudioVisualizerProps {
  isPlaying: boolean;
  className?: string;
}

export type VisualizerMode = 'spectrum' | 'wave' | 'pulsar';

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isPlaying, className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mode, setMode] = useState<VisualizerMode>('pulsar');
  const [isHovered, setIsHovered] = useState(false);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 260);

    const handleResize = () => {
      if (canvas && canvas.parentElement) {
        width = canvas.width = canvas.parentElement.clientWidth;
        height = canvas.height = canvas.parentElement.clientHeight || 260;
      }
    };
    window.addEventListener('resize', handleResize);

    const analyser = syncEngine.getAnalyser();
    const bufferLength = analyser ? analyser.frequencyBinCount : 128;
    const dataArray = new Uint8Array(bufferLength);
    let idlePhase = 0;

    // Ambient floating particles
    const particles: Array<{ x: number; y: number; vx: number; vy: number; radius: number; alpha: number }> = [];
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 2 + 1,
        alpha: Math.random() * 0.5 + 0.1,
      });
    }

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      ctx.clearRect(0, 0, width, height);

      let averageEnergy = 0;
      let hasRealData = false;

      if (analyser && isPlaying) {
        if (mode === 'wave') {
          analyser.getByteTimeDomainData(dataArray);
        } else {
          analyser.getByteFrequencyData(dataArray);
        }
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
        if (sum > 10) {
          hasRealData = true;
          averageEnergy = sum / bufferLength;
        }
      }

      if (!hasRealData && isPlaying) {
        // Dynamic music rhythm simulation responding to playback beat
        idlePhase += 0.055;
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          const bass = Math.sin(idlePhase * 2.2 + i * 0.08) * 55;
          const mid = Math.cos(idlePhase * 1.5 + i * 0.15) * 35;
          const high = Math.sin(idlePhase * 3.1 + i * 0.25) * 20;
          const val = Math.max(15, Math.min(255, 95 + bass + mid + high));
          dataArray[i] = val;
          sum += val;
        }
        averageEnergy = sum / bufferLength;
      } else if (!hasRealData && !isPlaying) {
        // Idle ambient waves when paused
        idlePhase += 0.02;
        for (let i = 0; i < bufferLength; i++) {
          dataArray[i] = Math.sin(idlePhase + i * 0.1) * 12 + 16;
        }
        averageEnergy = 15;
      }

      // 1. Draw subtle floating dust particles that react to bass energy
      const energyMultiplier = isPlaying ? 1 + (averageEnergy / 255) * 2.5 : 1;
      particles.forEach((p) => {
        p.x += p.vx * energyMultiplier;
        p.y += p.vy * energyMultiplier;
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 240, 255, ${p.alpha * (isPlaying ? 0.8 : 0.25)})`;
        ctx.fill();
      });

      // 2. Render Selected Visualizer Mode
      if (mode === 'pulsar') {
        renderPulsar(ctx, width, height, dataArray, bufferLength, averageEnergy);
      } else if (mode === 'spectrum') {
        renderSpectrum(ctx, width, height, dataArray, bufferLength);
      } else if (mode === 'wave') {
        renderWaveform(ctx, width, height, dataArray, bufferLength);
      }
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, mode]);

  // Visualizer 1: Radial Pulsar
  const renderPulsar = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    data: Uint8Array,
    len: number,
    energy: number
  ) => {
    const cx = w / 2;
    const cy = h / 2;
    const baseRadius = Math.min(w, h) * 0.24;
    const pulseRadius = baseRadius + (energy / 255) * 28;

    // Glowing core aura
    const gradient = ctx.createRadialGradient(cx, cy, 10, cx, cy, pulseRadius * 1.6);
    gradient.addColorStop(0, 'rgba(157, 78, 221, 0.25)');
    gradient.addColorStop(0.5, 'rgba(0, 240, 255, 0.12)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, pulseRadius * 1.6, 0, Math.PI * 2);
    ctx.fill();

    // Circular frequency bars
    const barCount = 72;
    const angleStep = (Math.PI * 2) / barCount;

    for (let i = 0; i < barCount; i++) {
      const angle = i * angleStep;
      const dataIdx = Math.floor((i / barCount) * (len / 2));
      const val = data[dataIdx] || 0;
      const barHeight = (val / 255) * (Math.min(w, h) * 0.22) + 4;

      const x1 = cx + Math.cos(angle) * pulseRadius;
      const y1 = cy + Math.sin(angle) * pulseRadius;
      const x2 = cx + Math.cos(angle) * (pulseRadius + barHeight);
      const y2 = cy + Math.sin(angle) * (pulseRadius + barHeight);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(0, 240, 255, 0.75)' : 'rgba(157, 78, 221, 0.75)';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  };

  // Visualizer 2: Mirrored Frequency Spectrum Bars
  const renderSpectrum = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    data: Uint8Array,
    len: number
  ) => {
    const bars = 48;
    const barWidth = (w / bars) * 0.65;
    const gap = (w / bars) * 0.35;
    const halfLen = Math.floor(len * 0.6);

    for (let i = 0; i < bars; i++) {
      const idx = Math.floor((i / bars) * halfLen);
      const val = data[idx] || 0;
      const barHeight = Math.max(3, (val / 255) * (h * 0.68));

      const x = i * (barWidth + gap) + gap / 2;
      const y = h - barHeight;

      const barGrad = ctx.createLinearGradient(x, y, x, h);
      barGrad.addColorStop(0, '#00f0ff');
      barGrad.addColorStop(0.6, '#9d4edd');
      barGrad.addColorStop(1, 'rgba(12, 12, 16, 0.4)');

      ctx.fillStyle = barGrad;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, [3, 3, 0, 0]);
      ctx.fill();
    }
  };

  // Visualizer 3: Oscilloscope Waveform
  const renderWaveform = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    data: Uint8Array,
    len: number
  ) => {
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#00f0ff';
    ctx.shadowBlur = 12;
    ctx.shadowColor = 'rgba(0, 240, 255, 0.8)';
    ctx.beginPath();

    const sliceWidth = w / len;
    let x = 0;

    for (let i = 0; i < len; i++) {
      const v = data[i] / 128.0;
      const y = (v * h) / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      x += sliceWidth;
    }

    ctx.lineTo(w, h / 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  };

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Visualizer Mode Controls overlay on hover */}
      <div
        className={`absolute bottom-3 right-3 flex items-center gap-1.5 p-1 rounded-full bg-dark-900/80 backdrop-blur-md border border-white/10 transition-opacity duration-200 ${
          isHovered ? 'opacity-100' : 'opacity-30 hover:opacity-100'
        }`}
      >
        <button
          onClick={() => setMode('pulsar')}
          title="Radial Pulsar"
          className={`p-1.5 rounded-full transition-colors ${
            mode === 'pulsar' ? 'bg-electric-cyan text-black font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setMode('spectrum')}
          title="Frequency Spectrum"
          className={`p-1.5 rounded-full transition-colors ${
            mode === 'spectrum' ? 'bg-electric-cyan text-black font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setMode('wave')}
          title="Waveform Oscilloscope"
          className={`p-1.5 rounded-full transition-colors ${
            mode === 'wave' ? 'bg-electric-cyan text-black font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
