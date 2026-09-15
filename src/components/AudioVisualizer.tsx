import React, { useEffect, useRef, useState } from 'react';
import { syncEngine } from '../services/syncEngine';
import { Radio, Activity, Sparkles, Waves } from 'lucide-react';

interface AudioVisualizerProps {
  isPlaying: boolean;
  className?: string;
  height?: number;
}

export type VisualizerMode = 'chroma' | 'spectrum' | 'wave' | 'pulsar';

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isPlaying,
  className = '',
  height: customHeight,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mode, setMode] = useState<VisualizerMode>('chroma');
  const [isHovered, setIsHovered] = useState(false);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = customHeight || canvas.parentElement?.clientHeight || 240);

    const handleResize = () => {
      if (canvas && canvas.parentElement) {
        width = canvas.width = canvas.parentElement.clientWidth;
        height = canvas.height = customHeight || canvas.parentElement.clientHeight || 240;
      }
    };
    window.addEventListener('resize', handleResize);

    const analyser = syncEngine.getAnalyser();
    const bufferLength = analyser ? analyser.frequencyBinCount : 128;
    const dataArray = new Uint8Array(bufferLength);
    let idlePhase = 0;

    // Ambient floating dust particles
    const particles: Array<{ x: number; y: number; vx: number; vy: number; radius: number; alpha: number }> = [];
    for (let i = 0; i < 35; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 1.8 + 0.8,
        alpha: Math.random() * 0.4 + 0.1,
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
        idlePhase += 0.045;
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          const bass = Math.sin(idlePhase * 2.2 + i * 0.08) * 60;
          const mid = Math.cos(idlePhase * 1.5 + i * 0.15) * 40;
          const high = Math.sin(idlePhase * 3.1 + i * 0.25) * 25;
          const val = Math.max(15, Math.min(255, 110 + bass + mid + high));
          dataArray[i] = val;
          sum += val;
        }
        averageEnergy = sum / bufferLength;
      } else if (!hasRealData && !isPlaying) {
        // Subtle resting idle glow when paused
        idlePhase += 0.018;
        for (let i = 0; i < bufferLength; i++) {
          dataArray[i] = Math.max(10, Math.sin(idlePhase + i * 0.12) * 14 + 18);
        }
        averageEnergy = 16;
      } else if (hasRealData) {
        idlePhase += 0.04;
      }

      // 1. Draw subtle floating dust particles that react to bass energy
      const energyMultiplier = isPlaying ? 1 + (averageEnergy / 255) * 2.2 : 0.8;
      particles.forEach((p) => {
        p.x += p.vx * energyMultiplier;
        p.y += p.vy * energyMultiplier;
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 240, 255, ${p.alpha * (isPlaying ? 0.75 : 0.2)})`;
        ctx.fill();
      });

      // 2. Render Selected Visualizer Mode
      if (mode === 'chroma') {
        renderChromaWave(ctx, width, height, dataArray, bufferLength, idlePhase, averageEnergy);
      } else if (mode === 'pulsar') {
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
  }, [isPlaying, mode, customHeight]);

  // Visualizer Mode: Neon Chroma Wave (Exact Match to Uploaded Sample 2)
  const renderChromaWave = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    data: Uint8Array,
    len: number,
    phase: number,
    energy: number
  ) => {
    const centerY = h / 2;
    const barCount = Math.min(84, Math.floor(w / 7.5));
    const barWidth = Math.max(2.5, (w / barCount) * 0.55);
    const spacing = w / barCount;
    const maxHalfHeight = h * 0.46;

    // Helper to get multi-color neon gradient matching Image 2 across horizontal position (0 to 1)
    const getChromaColor = (ratio: number, alpha = 1) => {
      if (ratio < 0.25) {
        // Teal / Emerald Green -> Cyan
        const t = ratio / 0.25;
        const r = Math.round(0 + t * 0);
        const g = Math.round(230 + t * 10);
        const b = Math.round(160 + t * 95);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      } else if (ratio < 0.5) {
        // Cyan -> Electric Blue
        const t = (ratio - 0.25) / 0.25;
        const r = Math.round(0 + t * 30);
        const g = Math.round(240 - t * 110);
        const b = Math.round(255);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      } else if (ratio < 0.75) {
        // Electric Blue -> Vivid Magenta / Hot Pink
        const t = (ratio - 0.5) / 0.25;
        const r = Math.round(30 + t * 225);
        const g = Math.round(130 - t * 110);
        const b = Math.round(255 - t * 110);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      } else {
        // Hot Pink -> Orange / Golden Yellow
        const t = (ratio - 0.75) / 0.25;
        const r = 255;
        const g = Math.round(20 + t * 185);
        const b = Math.round(145 - t * 135);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }
    };

    // A. Draw Mirrored Symmetrical Equalizer Bars
    for (let i = 0; i < barCount; i++) {
      const ratio = i / barCount;
      const x = i * spacing + spacing * 0.25;

      // Frequency mapping with natural audio bell-curve
      const dataIdx = Math.floor(Math.pow(ratio, 1.4) * (len * 0.75));
      const rawVal = data[dataIdx] || 0;
      
      // Amplitude shaping with harmonic motion
      const waveMod = Math.sin(phase * 1.8 + i * 0.18) * 0.18 + 0.82;
      const normalized = Math.min(1, Math.max(0.04, (rawVal / 255) * waveMod));
      const barH = Math.max(3, normalized * maxHalfHeight);

      // Create vertical linear gradient for this bar (mirrored from center horizon)
      const grad = ctx.createLinearGradient(x, centerY - barH, x, centerY + barH);
      const baseColor = getChromaColor(ratio, 0.95);
      const brightColor = getChromaColor(ratio, 1);
      const fadeColor = getChromaColor(ratio, 0.12);

      grad.addColorStop(0, fadeColor);
      grad.addColorStop(0.2, baseColor);
      grad.addColorStop(0.5, brightColor);
      grad.addColorStop(0.8, baseColor);
      grad.addColorStop(1, fadeColor);

      ctx.fillStyle = grad;

      // Draw mirrored rounded bar
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, centerY - barH, barWidth, barH * 2, [barWidth / 2]);
      } else {
        ctx.rect(x, centerY - barH, barWidth, barH * 2);
      }
      ctx.fill();

      // Top & bottom peak luminous dots if high energy
      if (normalized > 0.45) {
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 8;
        ctx.shadowColor = brightColor;
        ctx.beginPath();
        ctx.arc(x + barWidth / 2, centerY - barH, barWidth * 0.6, 0, Math.PI * 2);
        ctx.arc(x + barWidth / 2, centerY + barH, barWidth * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    // B. Draw Fluid Multi-Strand Sine Wave Filaments (Image 2 style)
    const strands = [
      { freq: 0.007, phaseSpeed: 1.2, amp: h * 0.24, color: 'rgba(255, 255, 255, 0.9)', width: 2, shadowColor: '#00f0ff' },
      { freq: 0.011, phaseSpeed: -0.9, amp: h * 0.19, color: 'rgba(0, 240, 255, 0.85)', width: 1.8, shadowColor: '#00f0ff' },
      { freq: 0.009, phaseSpeed: 1.5, amp: h * 0.22, color: 'rgba(255, 77, 184, 0.85)', width: 1.8, shadowColor: '#ff007f' },
      { freq: 0.015, phaseSpeed: -1.4, amp: h * 0.14, color: 'rgba(255, 187, 0, 0.8)', width: 1.5, shadowColor: '#facc15' },
      { freq: 0.013, phaseSpeed: 0.8, amp: h * 0.16, color: 'rgba(77, 171, 247, 0.75)', width: 1.4, shadowColor: '#0080ff' },
    ];

    strands.forEach((strand, sIdx) => {
      ctx.beginPath();
      ctx.lineWidth = strand.width;
      ctx.strokeStyle = strand.color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = strand.shadowColor;

      const energyScale = 0.5 + (energy / 255) * 0.75;
      const strandPhase = phase * strand.phaseSpeed + sIdx * 0.65;

      for (let x = 0; x <= w; x += 3) {
        const ratio = x / w;
        // Harmonic modulation creating dynamic peaks and troughs like Image 2
        const y =
          centerY +
          Math.sin(x * strand.freq + strandPhase) * strand.amp * energyScale * Math.sin(ratio * Math.PI) +
          Math.cos(x * strand.freq * 2.1 - strandPhase * 0.6) * (strand.amp * 0.35);

        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    });

    // C. Center Luminous Horizon Glow
    const horizonGrad = ctx.createLinearGradient(0, centerY - 2, 0, centerY + 2);
    horizonGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    horizonGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.85)');
    horizonGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = horizonGrad;
    ctx.fillRect(0, centerY - 1.5, w, 3);
  };

  // Visualizer Mode 2: Radial Pulsar
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

  // Visualizer Mode 3: Mirrored Frequency Spectrum Bars
  const renderSpectrum = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    data: Uint8Array,
    len: number
  ) => {
    const bars = 52;
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
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, barWidth, barHeight, [3, 3, 0, 0]);
      } else {
        ctx.rect(x, y, barWidth, barHeight);
      }
      ctx.fill();
    }
  };

  // Visualizer Mode 4: Oscilloscope Waveform
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
        className={`absolute bottom-2 right-2 flex items-center gap-1 p-1 rounded-full bg-dark-950/85 backdrop-blur-md border border-white/10 transition-opacity duration-200 z-10 ${
          isHovered ? 'opacity-100' : 'opacity-40 hover:opacity-100'
        }`}
      >
        <button
          onClick={() => setMode('chroma')}
          title="Neon Chroma Waves (Sample Style)"
          className={`p-1.5 rounded-full transition-colors ${
            mode === 'chroma' ? 'bg-cyan-400 text-black font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Waves className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setMode('pulsar')}
          title="Radial Pulsar"
          className={`p-1.5 rounded-full transition-colors ${
            mode === 'pulsar' ? 'bg-cyan-400 text-black font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setMode('spectrum')}
          title="Frequency Spectrum"
          className={`p-1.5 rounded-full transition-colors ${
            mode === 'spectrum' ? 'bg-cyan-400 text-black font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setMode('wave')}
          title="Waveform Oscilloscope"
          className={`p-1.5 rounded-full transition-colors ${
            mode === 'wave' ? 'bg-cyan-400 text-black font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

