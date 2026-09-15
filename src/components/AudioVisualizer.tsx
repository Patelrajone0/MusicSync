import React, { useEffect, useRef } from 'react';
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

    // Studio Equalizer Bar & Peak Physics State
    const MAX_BARS = 64;
    const currentHeights = new Float32Array(MAX_BARS);
    const peakHeights = new Float32Array(MAX_BARS);
    const peakHoldTimes = new Uint8Array(MAX_BARS);
    const peakDropSpeeds = new Float32Array(MAX_BARS);

    // Ambient floating cyber dust particles
    const particles: Array<{ x: number; y: number; vx: number; vy: number; radius: number; alpha: number }> = [];
    for (let i = 0; i < 26; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.25 + 0.08,
      });
    }

    // Helper: Draw clean rounded-top bar for maximum cross-browser compatibility
    const drawRoundedTopBar = (
      context: CanvasRenderingContext2D,
      x: number,
      y: number,
      w: number,
      h: number,
      r: number
    ) => {
      const radius = Math.min(r, w / 2, h / 2);
      context.beginPath();
      context.moveTo(x, y + h);
      context.lineTo(x, y + radius);
      context.quadraticCurveTo(x, y, x + radius, y);
      context.lineTo(x + w - radius, y);
      context.quadraticCurveTo(x + w, y, x + w, y + radius);
      context.lineTo(x + w, y + h);
      context.closePath();
    };

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      ctx.clearRect(0, 0, width, height);

      // Determine bar count and geometry based on current canvas width
      const barCount = Math.min(48, Math.max(22, Math.floor(width / 11.5)));
      const paddingX = 14;
      const usableWidth = width - paddingX * 2;
      const barSlot = usableWidth / barCount;
      const barWidth = Math.max(3.5, barSlot * 0.68);
      const barGap = barSlot - barWidth;

      // Vertical margins: baseline is near bottom, leaving space for subtle floor reflection
      const topMargin = 22;
      const bottomFloor = 28;
      const baseLineY = height - bottomFloor;
      const maxBarHeight = baseLineY - topMargin;

      // 1. Draw Subtle Background Studio dB Grid Lines
      const gridLevels = [0.25, 0.5, 0.75, 1.0];
      ctx.lineWidth = 1;
      gridLevels.forEach((lvl) => {
        const y = baseLineY - maxBarHeight * lvl;
        ctx.beginPath();
        ctx.strokeStyle = lvl === 1.0 ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.035)';
        ctx.moveTo(paddingX, y);
        ctx.lineTo(width - paddingX, y);
        ctx.stroke();
      });

      // 2. Draw Floating Cyber Dust Particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 240, 255, ${p.alpha * (isPlaying ? 0.7 : 0.25)})`;
        ctx.fill();
      });

      // 3. Audio & FFT Analysis / Synthetic Rhythm Engine
      let hasRealFft = false;
      const analyserNode = syncEngine.getAnalyser();
      if (analyserNode && isPlaying) {
        try {
          analyserNode.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < 32; i++) sum += dataArray[i];
          if (sum > 10) hasRealFft = true;
        } catch (e) {}
      }

      const audioEl = syncEngine.getAudioElement();
      const curTime = audioEl && !audioEl.paused ? audioEl.currentTime : Date.now() / 1000;
      const bpm = 126;
      const beatProgress = curTime * (bpm / 60);
      const barPos = beatProgress % 4;

      // Synthesized rhythmic pulses (kick, snare, hi-hat)
      const kick = isPlaying ? Math.pow(Math.max(0, 1 - (barPos % 2) * 2.8), 2.2) : 0;
      const isSnare = (barPos >= 1 && barPos < 2) || (barPos >= 3 && barPos < 4);
      const snare = isPlaying && isSnare ? Math.pow(Math.max(0, 1 - (barPos % 1) * 2.8), 2.0) : 0;
      const hihat = isPlaying ? Math.pow(Math.max(0, 1 - ((beatProgress * 2) % 1) * 2.6), 1.6) * 0.6 : 0;

      // 4. Calculate and Animate Each Frequency Bar
      for (let i = 0; i < barCount; i++) {
        const ratio = i / (barCount - 1);
        let targetRatio = 0.05; // Idle floor level

        if (isPlaying) {
          if (hasRealFft) {
            // Perceptual logarithmic mapping across FFT bins
            const binIndex = Math.min(
              bufferLength - 1,
              Math.floor(Math.pow(ratio, 1.45) * (bufferLength * 0.75))
            );
            const rawVal = dataArray[binIndex] / 255;
            // Boost treble slightly since higher frequencies naturally have lower amplitude
            const trebleBoost = 1.0 + ratio * 0.65;
            targetRatio = Math.min(1.0, Math.max(0.06, rawVal * trebleBoost));
          } else {
            // High-fidelity synthetic studio rhythm pattern
            let freqWeight = 0;
            if (ratio < 0.28) {
              const bassSubRatio = ratio / 0.28;
              freqWeight = kick * 0.85 + Math.sin(beatProgress * 2 + bassSubRatio * 4) * 0.15;
            } else if (ratio < 0.65) {
              const midSubRatio = (ratio - 0.28) / 0.37;
              freqWeight = snare * 0.80 + Math.sin(beatProgress * 3 + midSubRatio * 6) * 0.20 + kick * 0.25;
            } else {
              const highSubRatio = (ratio - 0.65) / 0.35;
              freqWeight = hihat * 0.75 + Math.cos(beatProgress * 4 + highSubRatio * 8) * 0.25;
            }

            const naturalEnvelope = 0.45 + Math.sin(ratio * Math.PI) * 0.55;
            const noise = Math.sin(curTime * 14 + i * 1.3) * 0.08 + Math.cos(curTime * 8 + i * 2.1) * 0.06;
            targetRatio = Math.min(0.96, Math.max(0.08, freqWeight * 0.75 + naturalEnvelope * 0.22 + noise));
          }
        } else {
          // Paused / Standby: Gentle resting ripple
          const idleWave = Math.sin(curTime * 2 + i * 0.28) * 0.02 + 0.05;
          targetRatio = idleWave;
        }

        const targetHeight = targetRatio * maxBarHeight;

        // Smooth attack & decay physics for main bar
        if (targetHeight > currentHeights[i]) {
          currentHeights[i] += (targetHeight - currentHeights[i]) * 0.42;
        } else {
          currentHeights[i] += (targetHeight - currentHeights[i]) * 0.18;
        }

        const barH = Math.max(4, currentHeights[i]);

        // Peak Meter Cap Physics (Holds at peak, then accelerates down with gravity)
        if (barH >= peakHeights[i]) {
          peakHeights[i] = barH;
          peakHoldTimes[i] = 10; // Hold for 10 frames
          peakDropSpeeds[i] = 0.5;
        } else {
          if (peakHoldTimes[i] > 0) {
            peakHoldTimes[i]--;
          } else {
            peakHeights[i] -= peakDropSpeeds[i];
            peakDropSpeeds[i] += 0.35; // Gravity acceleration
            if (peakHeights[i] < barH) {
              peakHeights[i] = barH;
            }
          }
        }

        const x = paddingX + i * barSlot + barGap / 2;
        const y = baseLineY - barH;

        // 5. Draw Vertical Gradient Equalizer Bar
        // Gradient: Electric Cyan -> Royal Azure -> Vivid Violet -> Hot Neon Pink / Amber at top
        const barGrad = ctx.createLinearGradient(0, baseLineY, 0, baseLineY - maxBarHeight);
        barGrad.addColorStop(0, 'rgba(0, 240, 255, 0.95)'); // Base: Neon Cyan
        barGrad.addColorStop(0.35, 'rgba(14, 165, 233, 0.95)'); // Mid-low: Sky Blue
        barGrad.addColorStop(0.65, 'rgba(168, 85, 247, 0.95)'); // Mid-high: Electric Purple
        barGrad.addColorStop(0.9, 'rgba(244, 63, 94, 0.98)'); // High: Neon Pink
        barGrad.addColorStop(1.0, 'rgba(251, 191, 36, 1.0)'); // Peak top: Amber Hot

        ctx.fillStyle = barGrad;
        const cornerR = Math.min(barWidth / 2, 2.5);
        drawRoundedTopBar(ctx, x, y, barWidth, barH, cornerR);
        ctx.fill();

        // 6. Draw Subtle Glass Segment Lines (Studio Hardware Segmented Feel)
        const segmentStep = 6;
        if (barH > segmentStep * 2) {
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
          ctx.lineWidth = 1.2;
          for (let segY = baseLineY - segmentStep; segY > y + 2; segY -= segmentStep) {
            ctx.beginPath();
            ctx.moveTo(x, segY);
            ctx.lineTo(x + barWidth, segY);
            ctx.stroke();
          }
        }

        // 7. Draw Floating Peak Meter Cap
        const peakY = Math.max(topMargin - 4, baseLineY - peakHeights[i] - 4);
        const peakCapH = 2.5;

        ctx.fillStyle = ratio > 0.75 ? '#ffd166' : '#ffffff';
        ctx.shadowColor = ratio > 0.75 ? '#f59e0b' : '#00f0ff';
        ctx.shadowBlur = 6;

        ctx.fillRect(x, peakY, barWidth, peakCapH);
        ctx.shadowBlur = 0;

        // 8. Draw Subtle Floor Reflection
        const reflectionH = Math.min(18, barH * 0.22);
        const reflectGrad = ctx.createLinearGradient(0, baseLineY, 0, baseLineY + reflectionH);
        reflectGrad.addColorStop(0, 'rgba(0, 240, 255, 0.28)');
        reflectGrad.addColorStop(1, 'rgba(0, 240, 255, 0)');

        ctx.fillStyle = reflectGrad;
        ctx.fillRect(x, baseLineY + 1.5, barWidth, reflectionH);
      }

      // 9. Draw Polished Floor Horizon Line
      const horizonGrad = ctx.createLinearGradient(paddingX, baseLineY, width - paddingX, baseLineY);
      horizonGrad.addColorStop(0, 'rgba(0, 240, 255, 0.1)');
      horizonGrad.addColorStop(0.5, 'rgba(0, 240, 255, 0.65)');
      horizonGrad.addColorStop(1, 'rgba(0, 240, 255, 0.1)');

      ctx.fillStyle = horizonGrad;
      ctx.fillRect(paddingX, baseLineY, usableWidth, 1.5);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, customHeight]);

  return (
    <div className={`relative overflow-hidden w-full h-full ${className}`}>
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};
