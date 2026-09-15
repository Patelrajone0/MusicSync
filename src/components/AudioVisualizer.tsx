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
    const barCount = Math.min(92, Math.max(56, Math.floor(w / 7.2)));
    const spacing = w / barCount;
    const barWidth = Math.max(3.2, spacing * 0.62);
    const maxHalfHeight = h * 0.44;

    // Helper to calculate the 4-peak mountain envelope matching Image 2
    const getLobeEnvelope = (ratio: number) => {
      const p1 = Math.exp(-Math.pow((ratio - 0.16) / 0.075, 2)) * 0.72; // Left: Green/Teal
      const p2 = Math.exp(-Math.pow((ratio - 0.38) / 0.065, 2)) * 0.62; // Mid-left: Blue
      const p3 = Math.exp(-Math.pow((ratio - 0.63) / 0.082, 2)) * 0.94; // Center-right: Tallest Magenta/Pink
      const p4 = Math.exp(-Math.pow((ratio - 0.85) / 0.072, 2)) * 0.74; // Right: Orange/Yellow
      const baseline = 0.08;
      return Math.min(1.0, baseline + p1 + p2 + p3 + p4);
    };

    // Color mapper matching Image 2 (Green/Teal -> Blue -> Vivid Pink/Magenta -> Amber/Yellow)
    const getLobeColor = (ratio: number, brightness = 1) => {
      if (ratio < 0.28) {
        // Emerald Green -> Bright Cyan
        const t = ratio / 0.28;
        const r = Math.round(0 + t * 0);
        const g = Math.min(255, Math.round((225 + t * 30) * brightness));
        const b = Math.min(255, Math.round((120 + t * 135) * brightness));
        return { r, g, b, hex: `rgb(${r}, ${g}, ${b})` };
      } else if (ratio < 0.50) {
        // Cyan -> Electric Royal Blue
        const t = (ratio - 0.28) / 0.22;
        const r = Math.round((0 + t * 45) * brightness);
        const g = Math.round((240 - t * 130) * brightness);
        const b = Math.min(255, Math.round(255 * brightness));
        return { r, g, b, hex: `rgb(${r}, ${g}, ${b})` };
      } else if (ratio < 0.75) {
        // Electric Blue -> Deep Magenta / Hot Neon Pink
        const t = (ratio - 0.50) / 0.25;
        const r = Math.min(255, Math.round((45 + t * 210) * brightness));
        const g = Math.round((110 - t * 95) * brightness);
        const b = Math.round((255 - t * 115) * brightness);
        return { r, g, b, hex: `rgb(${r}, ${g}, ${b})` };
      } else {
        // Hot Pink -> Orange / Golden Yellow
        const t = (ratio - 0.75) / 0.25;
        const r = 255;
        const g = Math.min(255, Math.round((20 + t * 195) * brightness));
        const b = Math.round((140 - t * 140) * brightness);
        return { r, g, b, hex: `rgb(${r}, ${g}, ${b})` };
      }
    };

    // A. Draw Stacked Segmented LED Dashes for Mirrored Equalizer Bars (Image 2 style)
    const dashH = 3.6;
    const dashGap = 2.0;
    const step = dashH + dashGap;

    for (let i = 0; i < barCount; i++) {
      const ratio = i / barCount;
      const x = i * spacing + (spacing - barWidth) / 2;

      // Calculate envelope & audio reactivity
      const baseEnv = getLobeEnvelope(ratio);
      const dataIdx = Math.floor(Math.pow(ratio, 1.3) * (len * 0.7));
      const rawAudio = (data[dataIdx] || 0) / 255;

      // Undulating phase modulation for living motion
      const undulate = Math.sin(phase * 1.6 + i * 0.14) * 0.12 + 0.90;
      const energyPulse = 1 + (energy / 255) * 0.35;

      const dynamicHeight = Math.max(
        12,
        (baseEnv * 0.75 + rawAudio * 0.4) * undulate * energyPulse * maxHalfHeight
      );

      const color = getLobeColor(ratio, 1.0);
      const numDashes = Math.floor(dynamicHeight / step);

      for (let d = 0; d < numDashes; d++) {
        const offset = d * step;
        const dashRatio = d / Math.max(1, numDashes);
        
        // Intensity: brightest at center horizon and tips, luminous color in body
        let alpha = 0.95;
        let r = color.r;
        let g = color.g;
        let b = color.b;

        if (d === 0) {
          // Center horizon seam segment: brilliant white-cyan core
          r = Math.min(255, r + 90);
          g = Math.min(255, g + 90);
          b = Math.min(255, b + 90);
          alpha = 1.0;
        } else if (d === numDashes - 1 && baseEnv > 0.4) {
          // Peak tip segment: glowing highlight cap
          r = Math.min(255, r + 110);
          g = Math.min(255, g + 110);
          b = Math.min(255, b + 110);
          alpha = 1.0;
        } else {
          alpha = 0.75 + (1 - dashRatio) * 0.25;
        }

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;

        // Upper dash
        ctx.fillRect(x, centerY - offset - dashH, barWidth, dashH);
        // Lower mirrored dash
        ctx.fillRect(x, centerY + offset, barWidth, dashH);
      }
    }

    // B. Draw Dense Multi-Strand Wireframe Contour Ribbon Mesh (Image 2 style)
    // 14 woven strands with phase offsets that form laser ribbons across the peaks
    const strandCount = 14;
    for (let s = 0; s < strandCount; s++) {
      const strandRatio = s / (strandCount - 1);
      const phaseOffset = (s - 7) * 0.18;
      const verticalOffset = (strandRatio - 0.5) * 6;

      ctx.beginPath();
      ctx.lineWidth = s === 6 || s === 7 ? 2.0 : 1.2;

      // Color tinting: center strands glow white/cyan, outer strands shift pink/amber
      let strandColor = 'rgba(255, 255, 255, 0.85)';
      let shadowColor = '#00f0ff';
      if (s < 4) {
        strandColor = 'rgba(0, 240, 255, 0.75)';
        shadowColor = '#00f0ff';
      } else if (s > 9) {
        strandColor = 'rgba(255, 77, 184, 0.75)';
        shadowColor = '#ff007f';
      } else if (s % 2 === 0) {
        strandColor = 'rgba(255, 255, 255, 0.95)';
        shadowColor = '#ffffff';
      }

      ctx.strokeStyle = strandColor;
      ctx.shadowBlur = s === 6 || s === 7 ? 10 : 5;
      ctx.shadowColor = shadowColor;

      for (let x = 0; x <= w; x += 3.5) {
        const ratio = x / w;
        const env = getLobeEnvelope(ratio);

        // Sinusoidal wave that inflates with the lobe envelope
        const wave1 = Math.sin(x * 0.0075 + phase * 1.3 + phaseOffset);
        const wave2 = Math.cos(x * 0.016 - phase * 0.9 + phaseOffset * 0.5) * 0.35;
        const waveAmp = (env * maxHalfHeight * 0.85) * (wave1 + wave2);

        const y = centerY + verticalOffset + waveAmp;

        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // C. Center Luminous Seam Glow (Bright horizontal horizon)
    const horizonGrad = ctx.createLinearGradient(0, centerY - 2.5, 0, centerY + 2.5);
    horizonGrad.addColorStop(0, 'rgba(0, 240, 255, 0)');
    horizonGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.9)');
    horizonGrad.addColorStop(1, 'rgba(0, 240, 255, 0)');

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

