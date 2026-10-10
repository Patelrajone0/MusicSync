import { SpeakerRole, TheaterPreset, TheaterSettings } from '../types';

export const THEATER_PRESETS: Record<
  TheaterPreset,
  {
    name: string;
    description: string;
    tag: string;
    badgeColor: string;
    decay: number;
    wetLevel: number;
    widening: number;
    dialogue: number;
    lfe: number;
    haasDelay: number;
  }
> = {
  cinema: {
    name: 'Dolby Cinema Hall',
    description: 'Grand commercial theater hall with rich diffusion, balanced acoustic absorption, and authentic cinema weight.',
    tag: 'CINEMA HALL · BALANCED',
    badgeColor: 'border-amber-400/40 bg-amber-500/15 text-amber-300',
    decay: 2.2,
    wetLevel: 0.35,
    widening: 0.75,
    dialogue: 0.6,
    lfe: 0.7,
    haasDelay: 18,
  },
  imax: {
    name: 'IMAX Grand Dome',
    description: 'Massive acoustic volume with towering vertical reverb tails, ultra-deep sub-bass resonance, and expansive early reflections.',
    tag: 'IMAX DOME · MAXIMUM DEPTH',
    badgeColor: 'border-blue-400/40 bg-blue-500/15 text-blue-300',
    decay: 3.4,
    wetLevel: 0.48,
    widening: 0.9,
    dialogue: 0.5,
    lfe: 0.95,
    haasDelay: 28,
  },
  atmos: {
    name: 'Dolby Atmos 3D',
    description: 'Binaural object-oriented soundstage with crisp 360-degree spatial envelopment, pinpoint panning, and clear speech.',
    tag: 'ATMOS 3D · IMMERSIVE',
    badgeColor: 'border-cyan-400/40 bg-cyan-500/15 text-cyan-300',
    decay: 1.8,
    wetLevel: 0.32,
    widening: 1.0,
    dialogue: 0.75,
    lfe: 0.65,
    haasDelay: 14,
  },
  intimate: {
    name: 'Studio Screening Room',
    description: 'Acoustically treated private VIP screening room with tight impulse decay, zero slap-back echo, and broadcast dialogue intelligibility.',
    tag: 'STUDIO VIP · ULTRA CRISP',
    badgeColor: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300',
    decay: 0.85,
    wetLevel: 0.18,
    widening: 0.5,
    dialogue: 0.9,
    lfe: 0.5,
    haasDelay: 8,
  },
  widener: {
    name: 'Acoustic Super-Widener',
    description: 'Psychoacoustic phase widener with Haas effect side-channel expansion to transform narrow smartphone speakers into a wide soundbar.',
    tag: 'SUPER WIDE · STEREO BOOST',
    badgeColor: 'border-purple-400/40 bg-purple-500/15 text-purple-300',
    decay: 1.2,
    wetLevel: 0.25,
    widening: 1.0,
    dialogue: 0.6,
    lfe: 0.6,
    haasDelay: 22,
  },
};

export class SpatialTheaterEngine {
  private audioContext: AudioContext | null = null;
  private inputNode: GainNode | null = null;
  private outputNode: GainNode | null = null;

  // Processing nodes
  private dryGain: GainNode | null = null;
  private wetGain: GainNode | null = null;
  private convolver: ConvolverNode | null = null;
  private earlyReflectionDelayL: DelayNode | null = null;
  private earlyReflectionDelayR: DelayNode | null = null;
  private reflectionGain: GainNode | null = null;
  private dialogueFilter: BiquadFilterNode | null = null;
  private lfeShelfFilter: BiquadFilterNode | null = null;

  // Speaker Role Routing Nodes
  private rolePanNode: StereoPannerNode | null = null;
  private roleFilterNode: BiquadFilterNode | null = null;
  private roleDelayNode: DelayNode | null = null;
  private roleGainNode: GainNode | null = null;
  private lfeSubFilter1: BiquadFilterNode | null = null;
  private lfeSubFilter2: BiquadFilterNode | null = null;

  // State
  private isEnabled: boolean = false;
  private currentPreset: TheaterPreset = 'cinema';
  private currentRole: SpeakerRole = 'all';
  private settings: TheaterSettings = {
    enabled: false,
    preset: 'cinema',
    spatialWidening: 0.75,
    dialogueBoost: 0.6,
    lfeBoost: 0.7,
    reverbDecay: 2.2,
    haasDelayMs: 18,
  };

  private listeners: Set<(settings: TheaterSettings, role: SpeakerRole) => void> = new Set();

  constructor() {
    // Lazy initialization on first audio context demand
  }

  public subscribe(cb: (settings: TheaterSettings, role: SpeakerRole) => void): () => void {
    this.listeners.add(cb);
    cb(this.settings, this.currentRole);
    return () => this.listeners.delete(cb);
  }

  private notify() {
    this.listeners.forEach((cb) => {
      try {
        cb({ ...this.settings }, this.currentRole);
      } catch (e) {
        console.error('TheaterEngine notify error:', e);
      }
    });
  }

  public ensureContext(externalCtx?: AudioContext): AudioContext | null {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      return this.audioContext;
    }
    if (externalCtx && externalCtx.state !== 'closed') {
      this.audioContext = externalCtx;
      this.buildGraph();
      return this.audioContext;
    }
    if (typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
        this.buildGraph();
        return this.audioContext;
      }
    }
    return null;
  }

  public buildGraph() {
    if (!this.audioContext) return;
    try {
      const ctx = this.audioContext;

      // Master Input and Output
      this.inputNode = ctx.createGain();
      this.outputNode = ctx.createGain();

      // Dry / Wet Paths
      this.dryGain = ctx.createGain();
      this.dryGain.gain.setValueAtTime(1.0, ctx.currentTime);

      this.wetGain = ctx.createGain();
      this.wetGain.gain.setValueAtTime(0.0, ctx.currentTime);

      // Reverb Convolver
      this.convolver = ctx.createConvolver();
      this.updateImpulseResponse(this.settings.preset, this.settings.reverbDecay);

      // Early Reflection Network
      this.earlyReflectionDelayL = ctx.createDelay(0.1);
      this.earlyReflectionDelayR = ctx.createDelay(0.1);
      this.reflectionGain = ctx.createGain();
      this.earlyReflectionDelayL.delayTime.setValueAtTime(0.016, ctx.currentTime);
      this.earlyReflectionDelayR.delayTime.setValueAtTime(0.024, ctx.currentTime);
      this.reflectionGain.gain.setValueAtTime(0.2, ctx.currentTime);

      // Dialogue Enhancer Filter (Peaking around 2.8kHz)
      this.dialogueFilter = ctx.createBiquadFilter();
      this.dialogueFilter.type = 'peaking';
      this.dialogueFilter.frequency.setValueAtTime(2800, ctx.currentTime);
      this.dialogueFilter.Q.setValueAtTime(1.2, ctx.currentTime);
      this.dialogueFilter.gain.setValueAtTime(0, ctx.currentTime);

      // Cinema Low Frequency Effects (LFE) Shelf Filter
      this.lfeShelfFilter = ctx.createBiquadFilter();
      this.lfeShelfFilter.type = 'lowshelf';
      this.lfeShelfFilter.frequency.setValueAtTime(80, ctx.currentTime);
      this.lfeShelfFilter.gain.setValueAtTime(0, ctx.currentTime);

      // Role Processor Nodes
      if (ctx.createStereoPanner) {
        this.rolePanNode = ctx.createStereoPanner();
      }
      this.roleFilterNode = ctx.createBiquadFilter();
      this.roleDelayNode = ctx.createDelay(0.1);
      this.roleGainNode = ctx.createGain();

      // Dedicated steep 24dB/oct Subwoofer filters
      this.lfeSubFilter1 = ctx.createBiquadFilter();
      this.lfeSubFilter1.type = 'lowpass';
      this.lfeSubFilter1.frequency.setValueAtTime(120, ctx.currentTime);
      this.lfeSubFilter1.Q.setValueAtTime(0.707, ctx.currentTime);

      this.lfeSubFilter2 = ctx.createBiquadFilter();
      this.lfeSubFilter2.type = 'lowpass';
      this.lfeSubFilter2.frequency.setValueAtTime(120, ctx.currentTime);
      this.lfeSubFilter2.Q.setValueAtTime(0.707, ctx.currentTime);

      // Connections:
      // inputNode -> dialogueFilter -> lfeShelfFilter
      this.inputNode.connect(this.dialogueFilter);
      this.dialogueFilter.connect(this.lfeShelfFilter);

      // -> Dry path
      this.lfeShelfFilter.connect(this.dryGain);

      // -> Wet Reverb path
      this.lfeShelfFilter.connect(this.convolver);
      this.convolver.connect(this.wetGain);

      // -> Early reflections
      this.lfeShelfFilter.connect(this.earlyReflectionDelayL);
      this.lfeShelfFilter.connect(this.earlyReflectionDelayR);
      this.earlyReflectionDelayL.connect(this.reflectionGain);
      this.earlyReflectionDelayR.connect(this.reflectionGain);

      // Combine dry + wet + reflections into Speaker Role processor
      const preRoleGain = ctx.createGain();
      this.dryGain.connect(preRoleGain);
      this.wetGain.connect(preRoleGain);
      this.reflectionGain.connect(preRoleGain);

      // Route through Speaker Role processing:
      // preRoleGain -> roleDelayNode -> roleFilterNode -> rolePanNode -> roleGainNode -> outputNode
      preRoleGain.connect(this.roleDelayNode);
      this.roleDelayNode.connect(this.roleFilterNode);

      if (this.rolePanNode) {
        this.roleFilterNode.connect(this.rolePanNode);
        this.rolePanNode.connect(this.roleGainNode);
      } else {
        this.roleFilterNode.connect(this.roleGainNode);
      }

      this.roleGainNode.connect(this.outputNode);

      // Apply initial settings
      this.applySettingsToNodes();
      this.applySpeakerRoleToNodes(this.currentRole);
    } catch (err) {
      console.warn('[SpatialTheaterEngine] Graph build warning:', err);
    }
  }

  // Algorithmic Synthetic Cinema Impulse Response Generator
  private generateCinemaImpulseResponse(preset: TheaterPreset, decaySecs: number): AudioBuffer | null {
    if (!this.audioContext) return null;
    try {
      const sampleRate = this.audioContext.sampleRate;
      const length = Math.max(sampleRate * 0.2, Math.floor(sampleRate * decaySecs));
      const buffer = this.audioContext.createBuffer(2, length, sampleRate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);

      // Multi-tap early reflection delays in samples (simulating wall & ceiling distances)
      const reflectionTaps = [
        { delay: Math.floor(sampleRate * 0.012), gainL: 0.6, gainR: 0.3 },
        { delay: Math.floor(sampleRate * 0.024), gainL: 0.4, gainR: 0.7 },
        { delay: Math.floor(sampleRate * 0.038), gainL: 0.5, gainR: 0.4 },
        { delay: Math.floor(sampleRate * 0.055), gainL: 0.3, gainR: 0.5 },
      ];

      // Add early reflections
      for (const tap of reflectionTaps) {
        if (tap.delay < length) {
          left[tap.delay] += tap.gainL;
          right[tap.delay] += tap.gainR;
        }
      }

      // Generate diffused exponential decay reverb tail with frequency dampening
      let lastValL = 0;
      let lastValR = 0;
      // High-frequency dampening coefficient (air absorption in large cinema halls)
      const dampening = preset === 'imax' ? 0.25 : preset === 'cinema' ? 0.35 : 0.45;

      for (let i = 0; i < length; i++) {
        const progress = i / length;
        // Exponential decay envelope
        const envelope = Math.pow(1 - progress, 2.5);

        // White noise grain
        const noiseL = (Math.random() * 2 - 1) * envelope;
        const noiseR = (Math.random() * 2 - 1) * envelope;

        // One-pole low-pass filter for realistic air absorption
        lastValL = lastValL + dampening * (noiseL - lastValL);
        lastValR = lastValR + dampening * (noiseR - lastValR);

        left[i] += lastValL * 0.4;
        right[i] += lastValR * 0.4;
      }

      return buffer;
    } catch (e) {
      console.warn('[SpatialTheaterEngine] Impulse response generation failed:', e);
      return null;
    }
  }

  private updateImpulseResponse(preset: TheaterPreset, decaySecs: number) {
    if (!this.convolver || !this.audioContext) return;
    try {
      const ir = this.generateCinemaImpulseResponse(preset, decaySecs);
      if (ir) {
        this.convolver.buffer = ir;
      }
    } catch (e) {
      console.warn('[SpatialTheaterEngine] Reverb update notice:', e);
    }
  }

  private applySettingsToNodes() {
    if (!this.audioContext) return;
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const cfg = THEATER_PRESETS[this.settings.preset];

    if (!this.isEnabled) {
      // Bypass: 100% dry, 0% wet
      if (this.dryGain) this.dryGain.gain.setValueAtTime(1.0, now);
      if (this.wetGain) this.wetGain.gain.setValueAtTime(0.0, now);
      if (this.reflectionGain) this.reflectionGain.gain.setValueAtTime(0.0, now);
      if (this.dialogueFilter) this.dialogueFilter.gain.setValueAtTime(0, now);
      if (this.lfeShelfFilter) this.lfeShelfFilter.gain.setValueAtTime(0, now);
      return;
    }

    const wetVal = Math.min(0.7, cfg.wetLevel * (0.6 + this.settings.spatialWidening * 0.4));
    const dryVal = Math.max(0.65, 1.0 - wetVal * 0.5);

    if (this.dryGain) this.dryGain.gain.setValueAtTime(dryVal, now);
    if (this.wetGain) this.wetGain.gain.setValueAtTime(wetVal, now);
    if (this.reflectionGain) {
      this.reflectionGain.gain.setValueAtTime(0.25 * this.settings.spatialWidening, now);
    }

    // Dialogue Boost: 0 to +6dB peaking at 2.8kHz
    if (this.dialogueFilter) {
      const boostDb = this.settings.dialogueBoost * 6;
      this.dialogueFilter.gain.setValueAtTime(boostDb, now);
    }

    // LFE Bass Rumble: 0 to +8dB low shelf at 80Hz
    if (this.lfeShelfFilter) {
      const lfeDb = this.settings.lfeBoost * 8;
      this.lfeShelfFilter.gain.setValueAtTime(lfeDb, now);
    }

    // Early reflection delay offsets based on preset
    if (this.earlyReflectionDelayL && this.earlyReflectionDelayR) {
      const delaySecs = (this.settings.haasDelayMs || cfg.haasDelay) / 1000;
      this.earlyReflectionDelayL.delayTime.setValueAtTime(delaySecs, now);
      this.earlyReflectionDelayR.delayTime.setValueAtTime(delaySecs * 1.5, now);
    }
  }

  // Dynamic Speaker Role Processing (Left, Right, Center, Rear, Subwoofer)
  public applySpeakerRoleToNodes(role: SpeakerRole) {
    if (!this.audioContext) return;
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    this.currentRole = role;

    if (!this.roleFilterNode || !this.roleGainNode || !this.roleDelayNode) return;

    switch (role) {
      case 'front_left':
        if (this.rolePanNode) this.rolePanNode.pan.setValueAtTime(-0.85, now);
        this.roleDelayNode.delayTime.setValueAtTime(0, now);
        this.roleFilterNode.type = 'highshelf';
        this.roleFilterNode.frequency.setValueAtTime(8000, now);
        this.roleFilterNode.gain.setValueAtTime(2.0, now); // Crisp staging presence
        this.roleGainNode.gain.setValueAtTime(1.0, now);
        break;

      case 'front_right':
        if (this.rolePanNode) this.rolePanNode.pan.setValueAtTime(0.85, now);
        this.roleDelayNode.delayTime.setValueAtTime(0, now);
        this.roleFilterNode.type = 'highshelf';
        this.roleFilterNode.frequency.setValueAtTime(8000, now);
        this.roleFilterNode.gain.setValueAtTime(2.0, now);
        this.roleGainNode.gain.setValueAtTime(1.0, now);
        break;

      case 'center':
        // Dead center dialogue channel: High-pass at 110Hz to eliminate muddy rumble + dialogue presence
        if (this.rolePanNode) this.rolePanNode.pan.setValueAtTime(0.0, now);
        this.roleDelayNode.delayTime.setValueAtTime(0, now);
        this.roleFilterNode.type = 'peaking';
        this.roleFilterNode.frequency.setValueAtTime(2800, now);
        this.roleFilterNode.Q.setValueAtTime(1.5, now);
        this.roleFilterNode.gain.setValueAtTime(5.0, now); // Pronounced dialogue intelligibility
        this.roleGainNode.gain.setValueAtTime(1.05, now);
        break;

      case 'surround_left':
        // Rear Left: Haas psychoacoustic delay (~22ms), low-pass filter (air/head shadow)
        if (this.rolePanNode) this.rolePanNode.pan.setValueAtTime(-0.95, now);
        this.roleDelayNode.delayTime.setValueAtTime(0.022, now);
        this.roleFilterNode.type = 'lowpass';
        this.roleFilterNode.frequency.setValueAtTime(6500, now);
        this.roleGainNode.gain.setValueAtTime(0.95, now);
        break;

      case 'surround_right':
        // Rear Right: Haas psychoacoustic delay (~22ms), low-pass filter
        if (this.rolePanNode) this.rolePanNode.pan.setValueAtTime(0.95, now);
        this.roleDelayNode.delayTime.setValueAtTime(0.022, now);
        this.roleFilterNode.type = 'lowpass';
        this.roleFilterNode.frequency.setValueAtTime(6500, now);
        this.roleGainNode.gain.setValueAtTime(0.95, now);
        break;

      case 'subwoofer':
        // Subwoofer / LFE: Steep Low-Pass Filter at 120Hz + 60Hz sub-bass boost
        if (this.rolePanNode) this.rolePanNode.pan.setValueAtTime(0.0, now);
        this.roleDelayNode.delayTime.setValueAtTime(0, now);
        this.roleFilterNode.type = 'lowpass';
        this.roleFilterNode.frequency.setValueAtTime(120, now);
        this.roleFilterNode.Q.setValueAtTime(1.4, now);
        this.roleGainNode.gain.setValueAtTime(1.3, now); // Emphasize bass vibration
        break;

      case 'all':
      default:
        // Standard full-range stereo
        if (this.rolePanNode) this.rolePanNode.pan.setValueAtTime(0.0, now);
        this.roleDelayNode.delayTime.setValueAtTime(0, now);
        this.roleFilterNode.type = 'allpass';
        this.roleGainNode.gain.setValueAtTime(1.0, now);
        break;
    }
  }

  // Connect any external AudioNode into the theater chain and connect output to destination
  public attachToSource(sourceNode: AudioNode, destinationNode?: AudioNode): AudioNode {
    if (!this.inputNode || !this.outputNode) {
      this.ensureContext(sourceNode.context as AudioContext);
    }
    if (this.inputNode && this.outputNode) {
      sourceNode.connect(this.inputNode);
      if (destinationNode) {
        this.outputNode.connect(destinationNode);
      } else if (this.audioContext) {
        this.outputNode.connect(this.audioContext.destination);
      }
      return this.outputNode;
    }
    return sourceNode;
  }

  public getInputNode(): GainNode | null {
    return this.inputNode;
  }

  public getOutputNode(): GainNode | null {
    return this.outputNode;
  }

  // Public Controls
  public setTheaterEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    this.settings.enabled = enabled;
    this.applySettingsToNodes();
    this.notify();
  }

  public toggleTheater(): boolean {
    this.setTheaterEnabled(!this.isEnabled);
    return this.isEnabled;
  }

  public setPreset(preset: TheaterPreset) {
    this.currentPreset = preset;
    const cfg = THEATER_PRESETS[preset];
    this.settings.preset = preset;
    this.settings.reverbDecay = cfg.decay;
    this.settings.spatialWidening = cfg.widening;
    this.settings.dialogueBoost = cfg.dialogue;
    this.settings.lfeBoost = cfg.lfe;
    this.settings.haasDelayMs = cfg.haasDelay;

    this.updateImpulseResponse(preset, cfg.decay);
    this.applySettingsToNodes();
    this.notify();
  }

  public setSpatialWidening(amount: number) {
    this.settings.spatialWidening = Math.max(0, Math.min(1, amount));
    this.applySettingsToNodes();
    this.notify();
  }

  public setDialogueBoost(amount: number) {
    this.settings.dialogueBoost = Math.max(0, Math.min(1, amount));
    this.applySettingsToNodes();
    this.notify();
  }

  public setLfeBoost(amount: number) {
    this.settings.lfeBoost = Math.max(0, Math.min(1, amount));
    this.applySettingsToNodes();
    this.notify();
  }

  public setSpeakerRole(role: SpeakerRole) {
    this.currentRole = role;
    this.applySpeakerRoleToNodes(role);
    this.notify();
  }

  public getSpeakerRole(): SpeakerRole {
    return this.currentRole;
  }

  public getSettings(): TheaterSettings {
    return { ...this.settings, enabled: this.isEnabled };
  }

  public isTheaterActive(): boolean {
    return this.isEnabled;
  }

  // Play Acoustic Test Tone to verify physical speaker role
  public playSpeakerTestTone(role: SpeakerRole) {
    try {
      const ctx = this.audioContext || this.ensureContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (role === 'subwoofer') {
        // Deep 45Hz -> 75Hz low frequency rumble test tone
        osc.type = 'sine';
        osc.frequency.setValueAtTime(45, now);
        osc.frequency.exponentialRampToValueAtTime(75, now + 0.35);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.7);

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.6, now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.85);
      } else if (role === 'center') {
        // Double mid-frequency voice chirp (1200Hz)
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1200, now);
        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.25);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.5);
      } else {
        // Spatial Panned Chime
        const isLeft = role === 'front_left' || role === 'surround_left';
        const isRight = role === 'front_right' || role === 'surround_right';
        const isRear = role === 'surround_left' || role === 'surround_right';

        osc.type = 'sine';
        const freq = isRear ? 640 : 880;
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.2);

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.35, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        if (ctx.createStereoPanner) {
          const pan = ctx.createStereoPanner();
          pan.pan.setValueAtTime(isLeft ? -0.9 : isRight ? 0.9 : 0, now);
          osc.connect(gain);
          gain.connect(pan);
          pan.connect(ctx.destination);
        } else {
          osc.connect(gain);
          gain.connect(ctx.destination);
        }

        osc.start(now);
        osc.stop(now + 0.55);
      }
    } catch (e) {
      console.warn('[SpatialTheaterEngine] Test tone notice:', e);
    }
  }
}

export const spatialTheaterEngine = new SpatialTheaterEngine();
