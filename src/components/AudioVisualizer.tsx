import React, { useEffect, useRef } from 'react';
import { Waves, Radio, Activity, Sparkles } from 'lucide-react';
import { syncEngine } from '../services/syncEngine';

interface AudioVisualizerProps {
  isPlaying: boolean;
  className?: string;
  height?: number;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isPlaying,
  className = '',
  height: customHeight,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
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
    let wavePhase = 0;

    // Ambient floating dust particles
    const particles: Array<{ x: number; y: number; vx: number; vy: number; radius: number; alpha: number }> = [];
    for (let i = 0; i < 30; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        radius: Math.random() * 1.6 + 0.7,
        alpha: Math.random() * 0.35 + 0.1,
      });
    }

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      ctx.clearRect(0, 0, width, height);

      let averageEnergy = 0;
      let hasRealFft = false;
      const audioEl = syncEngine.getAudioElement();
      const analyserNode = syncEngine.getAnalyser();

      // Read real FFT data from Web Audio if available
      let fftBass = 0;
      let fftMid = 0;
      let fftHigh = 0;

      if (analyserNode && isPlaying) {
        try {
          analyserNode.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
          if (sum > 12) {
            hasRealFft = true;
            averageEnergy = sum / bufferLength;

            // Lows / sub-bass (0-8)
            let b = 0;
            for (let i = 0; i < 8; i++) b += dataArray[i];
            fftBass = b / (8 * 255);

            // Mids / vocals (8-32)
            let m = 0;
            for (let i = 8; i < 32; i++) m += dataArray[i];
            fftMid = m / (24 * 255);

            // Highs / percussion (32-80)
            let hg = 0;
            for (let i = 32; i < 80; i++) hg += dataArray[i];
            fftHigh = hg / (48 * 255);
          }
        } catch (e) {}
      }

      // Track playback time & rhythm
      const curTime = audioEl && !audioEl.paused ? audioEl.currentTime : Date.now() / 1000;
      const bpm = 124; // typical synthpop/dance BPM (Starboy / Blinding Lights)
      const beatProgress = curTime * (bpm / 60);

      // Musical beat envelopes (4/4 time):
      // 1. Kick on 1 and 3 (heavy downbeat punch)
      const barPos = beatProgress % 4;
      const kick = isPlaying ? Math.pow(Math.max(0, 1 - (barPos % 2) * 3.2), 2.4) : 0;

      // 2. Snare on 2 and 4 (sharp backbeat snap)
      const isSnare = (barPos >= 1 && barPos < 2) || (barPos >= 3 && barPos < 4);
      const snare = isPlaying && isSnare ? Math.pow(Math.max(0, 1 - (barPos % 1) * 3.0), 2.2) : 0;

      // 3. Hi-hat 8th/16th groove
      const hat = isPlaying ? Math.pow(Math.max(0, 1 - ((beatProgress * 2) % 1) * 3.0), 1.5) * 0.45 : 0;

      // 4. Bass groove undulation
      const groove = isPlaying ? Math.sin(beatProgress * Math.PI) * 0.35 + 0.35 : 0;

      if (isPlaying) {
        wavePhase += 0.052;
        if (!hasRealFft) {
          averageEnergy = 60 + kick * 120 + snare * 60;
        }
      } else {
        // Paused / Standby: calm ambient wave
        wavePhase += 0.016;
        averageEnergy = 18;
      }

      // 1. Draw subtle floating particles
      const energyMultiplier = isPlaying ? 1 + (averageEnergy / 255) * 2.0 : 0.7;
      particles.forEach((p) => {
        p.x += p.vx * energyMultiplier;
        p.y += p.vy * energyMultiplier;
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 240, 255, ${p.alpha * (isPlaying ? 0.7 : 0.2)})`;
        ctx.fill();
      });

      // 2. Render the exact Neon Audio Wave visualizer
      renderChromaWave(
        ctx,
        width,
        height,
        wavePhase,
        hasRealFft,
        fftBass,
        fftMid,
        fftHigh,
        kick,
        snare,
        hat,
        groove,
        isPlaying
      );
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, customHeight]);

  // Visualizer Mode: Neon Chroma Wave (Exact Match to Uploaded Sample)
  const renderChromaWave = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    phase: number,
    hasRealFft: boolean,
    fftBass: number,
    fftMid: number,
    fftHigh: number,
    kick: number,
    snare: number,
    hat: number,
    groove: number,
    playing: boolean
  ) => {
    const centerY = h / 2;
    const barCount = Math.min(88, Math.max(52, Math.floor(w / 7.6)));
    const spacing = w / barCount;
    const barWidth = Math.max(3.0, spacing * 0.60);
    const maxHalfHeight = h * 0.44;

    // Helper to calculate the 4-peak mountain envelope matching the reference image
    const getLobeEnvelope = (ratio: number) => {
      const p1 = Math.exp(-Math.pow((ratio - 0.16) / 0.075, 2)) * 0.70; // Left: Green/Teal
      const p2 = Math.exp(-Math.pow((ratio - 0.38) / 0.065, 2)) * 0.60; // Mid-left: Blue
      const p3 = Math.exp(-Math.pow((ratio - 0.63) / 0.082, 2)) * 0.95; // Center-right: Tallest Magenta/Pink
      const p4 = Math.exp(-Math.pow((ratio - 0.85) / 0.072, 2)) * 0.72; // Right: Orange/Yellow
      const baseline = 0.07;
      return Math.min(1.0, baseline + p1 + p2 + p3 + p4);
    };

    // Dynamic rhythm multiplier per lobe
    const getLobePulse = (ratio: number) => {
      if (!playing) return 1.0;
      if (ratio < 0.28) {
        // Lobe 1 (Kick / sub-bass rhythm)
        return 1.0 + (hasRealFft ? fftBass * 0.95 : kick * 0.85 + groove * 0.25);
      } else if (ratio < 0.50) {
        // Lobe 2 (Bassline / mid-bass)
        return 1.0 + (hasRealFft ? fftBass * 0.45 + fftMid * 0.45 : groove * 0.55 + kick * 0.35);
      } else if (ratio < 0.75) {
        // Lobe 3 (Snare / vocal / lead synth - tallest peak)
        return 1.0 + (hasRealFft ? fftMid * 1.15 : snare * 1.10 + hat * 0.30);
      } else {
        // Lobe 4 (Hi-hats / percussion)
        return 1.0 + (hasRealFft ? fftHigh * 0.90 : hat * 0.85 + snare * 0.25);
      }
    };

    // Color mapper matching Image 2 (Green/Teal -> Blue -> Vivid Pink/Magenta -> Amber/Yellow)
    const getLobeColor = (ratio: number, brightness = 1) => {
      if (ratio < 0.28) {
        // Emerald Green -> Bright Cyan
        const t = ratio / 0.28;
        const r = 0;
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

    // A. Draw Stacked Segmented LED Dashes for Mirrored Equalizer Bars (Exact match to sample)
    const dashH = 3.6;
    const dashGap = 2.0;
    const step = dashH + dashGap;

    for (let i = 0; i < barCount; i++) {
      const ratio = i / barCount;
      const x = i * spacing + (spacing - barWidth) / 2;

      // Base envelope & rhythm pulse
      const baseEnv = getLobeEnvelope(ratio);
      const pulse = getLobePulse(ratio);

      // Living wave phase undulation
      const undulate = Math.sin(phase * 1.5 + i * 0.15) * 0.10 + 0.90;
      const dynamicHeight = Math.max(12, baseEnv * pulse * undulate * maxHalfHeight);

      const color = getLobeColor(ratio, 1.0);
      const numDashes = Math.floor(dynamicHeight / step);

      for (let d = 0; d < numDashes; d++) {
        const offset = d * step;
        const dashRatio = d / Math.max(1, numDashes);

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
        } else if (d === numDashes - 1 && baseEnv > 0.38) {
          // Peak tip segment: glowing highlight cap
          r = Math.min(255, r + 115);
          g = Math.min(255, g + 115);
          b = Math.min(255, b + 115);
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

    // B. Draw Dense Multi-Strand Wireframe Contour Ribbon Mesh (Exact match to sample)
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
        const pulse = getLobePulse(ratio);

        // Sinusoidal wave that inflates with the lobe envelope and rhythm
        const wave1 = Math.sin(x * 0.0075 + phase * 1.3 + phaseOffset);
        const wave2 = Math.cos(x * 0.016 - phase * 0.9 + phaseOffset * 0.5) * 0.35;
        const waveAmp = env * maxHalfHeight * 0.85 * pulse * (wave1 + wave2);

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

  return (
    <div className={`relative overflow-hidden w-full h-full ${className}`}>
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Floating Pill Badge (Exact match to uploaded design) */}
      <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2 py-1.5 rounded-full bg-[#08121f]/90 border border-white/10 backdrop-blur-md shadow-lg pointer-events-none select-none z-10">
        <div className="w-6 h-6 rounded-full bg-cyan-400 flex items-center justify-center text-black shadow-[0_0_10px_#00f0ff]">
          <Waves className="w-3.5 h-3.5 stroke-[2.5]" />
        </div>
        <div className="p-1 text-slate-300">
          <Radio className="w-3.5 h-3.5" />
        </div>
        <div className="p-1 text-slate-300">
          <Activity className="w-3.5 h-3.5" />
        </div>
        <div className="p-1 text-slate-300">
          <Sparkles className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
};
