/**
 * AFTERTHOUGHT Ambient Soundscape Engine
 * 100% Offline Procedural Web Audio API soundscapes
 * Zero network dependencies, zero copyright, zero latency, lightweight footprint.
 */

import { SoundscapeId, SoundscapeTrack } from '@/types/entry';

export const SOUNDSCAPE_TRACKS: SoundscapeTrack[] = [
  {
    id: 'rain',
    name: 'Gentle Rain',
    description: 'Steady soothing rain falling softly into the quiet night.',
    iconName: 'CloudRain',
  },
  {
    id: 'window-rain',
    name: 'Rain on Window',
    description: 'Muffled raindrops tapping rhythmic patterns against a bedroom pane.',
    iconName: 'CloudDrizzle',
  },
  {
    id: 'night',
    name: 'Night Ambience',
    description: 'Distant nocturnal stillness with gentle crickets under starlight.',
    iconName: 'Moon',
  },
  {
    id: 'wind',
    name: 'Soft Wind',
    description: 'A whisper of night wind drifting through distant trees.',
    iconName: 'Wind',
  },
  {
    id: 'ocean',
    name: 'Ocean Swells',
    description: 'Rhythmic, slow waves washing against peaceful shores.',
    iconName: 'Waves',
  },
  {
    id: 'fireplace',
    name: 'Hearth & Ember',
    description: 'Subtle warmth with delicate crackles and glowing embers.',
    iconName: 'Flame',
  },
  {
    id: 'drone',
    name: 'Nocturnal Drone',
    description: 'A deep 432Hz harmonic warmth designed for peaceful contemplation.',
    iconName: 'Disc',
  },
];

const PREFS_KEY = 'afterthought_sound_prefs_v1';

export interface SoundPreferences {
  volume: number; // 0.0 to 1.0
  activeTrackId: SoundscapeId | null;
  isMuted: boolean;
}

export function loadSoundPreferences(): SoundPreferences {
  if (typeof window === 'undefined') {
    return { volume: 0.4, activeTrackId: null, isMuted: false };
  }
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { volume: 0.4, activeTrackId: null, isMuted: false };
    const parsed = JSON.parse(raw);
    return {
      volume: typeof parsed.volume === 'number' ? Math.max(0, Math.min(1, parsed.volume)) : 0.4,
      activeTrackId: parsed.activeTrackId || null,
      isMuted: Boolean(parsed.isMuted),
    };
  } catch {
    return { volume: 0.4, activeTrackId: null, isMuted: false };
  }
}

export function saveSoundPreferences(prefs: Partial<SoundPreferences>): void {
  if (typeof window === 'undefined') return;
  try {
    const current = loadSoundPreferences();
    const updated = { ...current, ...prefs };
    localStorage.setItem(PREFS_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage write issues
  }
}

class SoundscapeEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private currentTrackId: SoundscapeId | null = null;
  private isPlaying = false;
  private activeNodes: Array<{ stop?: () => void; disconnect: () => void }> = [];
  private intervalIds: number[] = [];

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    if (!this.masterGain) {
      this.masterGain = this.ctx.createGain();
      const prefs = loadSoundPreferences();
      this.masterGain.gain.setValueAtTime(prefs.isMuted ? 0 : prefs.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  public getTrackId(): SoundscapeId | null {
    return this.currentTrackId;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public setVolume(val: number, isMuted = false): void {
    if (!this.masterGain || !this.ctx) return;
    const targetGain = isMuted ? 0 : Math.max(0, Math.min(1, val));
    this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.masterGain.gain.linearRampToValueAtTime(targetGain, this.ctx.currentTime + 0.1);
  }

  public play(trackId: SoundscapeId): void {
    if (typeof window === 'undefined') return;
    const ctx = this.ensureContext();

    if (this.currentTrackId === trackId && this.isPlaying) {
      return;
    }

    this.stopCurrent();
    this.currentTrackId = trackId;
    this.isPlaying = true;
    saveSoundPreferences({ activeTrackId: trackId });

    switch (trackId) {
      case 'rain':
        this.synthesizeRain(ctx);
        break;
      case 'window-rain':
        this.synthesizeWindowRain(ctx);
        break;
      case 'night':
        this.synthesizeNight(ctx);
        break;
      case 'wind':
        this.synthesizeWind(ctx);
        break;
      case 'ocean':
        this.synthesizeOcean(ctx);
        break;
      case 'fireplace':
        this.synthesizeFireplace(ctx);
        break;
      case 'drone':
        this.synthesizeDrone(ctx);
        break;
    }
  }

  public pause(): void {
    this.stopCurrent();
    this.isPlaying = false;
  }

  public toggle(trackId?: SoundscapeId): void {
    if (this.isPlaying) {
      this.pause();
    } else {
      const target = trackId || this.currentTrackId || 'rain';
      this.play(target);
    }
  }

  private stopCurrent(): void {
    for (const id of this.intervalIds) {
      window.clearInterval(id);
    }
    this.intervalIds = [];

    for (const node of this.activeNodes) {
      try {
        if (node.stop) node.stop();
        node.disconnect();
      } catch {
        // Node already stopped/disconnected
      }
    }
    this.activeNodes = [];
    this.isPlaying = false;
  }

  // Helper: Generates 5 seconds of pink noise buffer
  private createPinkNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const bufferSize = ctx.sampleRate * 5;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
    return buffer;
  }

  // --- 1. Rain ---
  private synthesizeRain(ctx: AudioContext): void {
    if (!this.masterGain) return;
    const buffer = this.createPinkNoiseBuffer(ctx);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(1200, ctx.currentTime);

    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(300, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.7, ctx.currentTime);

    src.connect(lowpass);
    lowpass.connect(highpass);
    highpass.connect(gain);
    gain.connect(this.masterGain);

    src.start();
    this.activeNodes.push(src, lowpass, highpass, gain);
  }

  // --- 2. Window Rain (muffled + patter) ---
  private synthesizeWindowRain(ctx: AudioContext): void {
    if (!this.masterGain) return;
    const buffer = this.createPinkNoiseBuffer(ctx);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(600, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.85, ctx.currentTime);

    src.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(this.masterGain);

    src.start();
    this.activeNodes.push(src, lowpass, gain);

    // Occasional glass droplet patter
    const interval = window.setInterval(() => {
      if (!this.isPlaying || !this.masterGain || !this.ctx) return;
      if (Math.random() > 0.4) {
        const dropOsc = this.ctx.createOscillator();
        const dropGain = this.ctx.createGain();
        dropOsc.type = 'sine';
        const startFreq = 800 + Math.random() * 600;
        dropOsc.frequency.setValueAtTime(startFreq, this.ctx.currentTime);
        dropOsc.frequency.exponentialRampToValueAtTime(startFreq * 0.5, this.ctx.currentTime + 0.08);

        dropGain.gain.setValueAtTime(0.04 + Math.random() * 0.05, this.ctx.currentTime);
        dropGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.08);

        dropOsc.connect(dropGain);
        dropGain.connect(this.masterGain);
        dropOsc.start();
        dropOsc.stop(this.ctx.currentTime + 0.09);
      }
    }, 280);

    this.intervalIds.push(interval);
  }

  // --- 3. Night Ambience (soft bed + gentle crickets) ---
  private synthesizeNight(ctx: AudioContext): void {
    if (!this.masterGain) return;
    const buffer = this.createPinkNoiseBuffer(ctx);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(450, ctx.currentTime);
    filter.Q.setValueAtTime(0.8, ctx.currentTime);

    const bgGain = ctx.createGain();
    bgGain.gain.setValueAtTime(0.3, ctx.currentTime);

    src.connect(filter);
    filter.connect(bgGain);
    bgGain.connect(this.masterGain);
    src.start();
    this.activeNodes.push(src, filter, bgGain);

    // Cricket rhythm
    const interval = window.setInterval(() => {
      if (!this.isPlaying || !this.masterGain || !this.ctx) return;
      if (Math.random() > 0.3) {
        const chirps = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < chirps; i++) {
          const osc = this.ctx.createOscillator();
          const chirpGain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(4600 + Math.random() * 200, this.ctx.currentTime);
          const t = this.ctx.currentTime + i * 0.06;
          chirpGain.gain.setValueAtTime(0.015, t);
          chirpGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);

          osc.connect(chirpGain);
          chirpGain.connect(this.masterGain);
          osc.start(t);
          osc.stop(t + 0.05);
        }
      }
    }, 1400);

    this.intervalIds.push(interval);
  }

  // --- 4. Soft Wind (LFO modulated lowpass noise) ---
  private synthesizeWind(ctx: AudioContext): void {
    if (!this.masterGain) return;
    const buffer = this.createPinkNoiseBuffer(ctx);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(350, ctx.currentTime);
    filter.Q.setValueAtTime(3.0, ctx.currentTime);

    // LFO for slow gust modulation
    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.12, ctx.currentTime);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(250, ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.65, ctx.currentTime);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    src.start();
    lfo.start();
    this.activeNodes.push(src, filter, lfo, lfoGain, gain);
  }

  // --- 5. Ocean Waves ---
  private synthesizeOcean(ctx: AudioContext): void {
    if (!this.masterGain) return;
    const buffer = this.createPinkNoiseBuffer(ctx);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(320, ctx.currentTime);
    filter.Q.setValueAtTime(1.2, ctx.currentTime);

    // Wave swell LFO
    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.08, ctx.currentTime); // ~12 second swell cycle
    const swellGain = ctx.createGain();
    swellGain.gain.setValueAtTime(0.4, ctx.currentTime);

    const mainGain = ctx.createGain();
    mainGain.gain.setValueAtTime(0.5, ctx.currentTime);

    lfo.connect(swellGain.gain);

    src.connect(filter);
    filter.connect(swellGain);
    swellGain.connect(mainGain);
    mainGain.connect(this.masterGain);

    src.start();
    lfo.start();
    this.activeNodes.push(src, filter, lfo, swellGain, mainGain);
  }

  // --- 6. Fireplace (Warm lowpass + random crackle pops) ---
  private synthesizeFireplace(ctx: AudioContext): void {
    if (!this.masterGain) return;
    const buffer = this.createPinkNoiseBuffer(ctx);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(220, ctx.currentTime);

    const rumbleGain = ctx.createGain();
    rumbleGain.gain.setValueAtTime(0.6, ctx.currentTime);

    src.connect(filter);
    filter.connect(rumbleGain);
    rumbleGain.connect(this.masterGain);
    src.start();
    this.activeNodes.push(src, filter, rumbleGain);

    // Random ember crackles
    const interval = window.setInterval(() => {
      if (!this.isPlaying || !this.masterGain || !this.ctx) return;
      if (Math.random() > 0.45) {
        const popOsc = this.ctx.createOscillator();
        const popGain = this.ctx.createGain();
        popOsc.type = 'triangle';
        popOsc.frequency.setValueAtTime(120 + Math.random() * 800, this.ctx.currentTime);

        const crackleDuration = 0.015 + Math.random() * 0.02;
        popGain.gain.setValueAtTime(0.08 + Math.random() * 0.12, this.ctx.currentTime);
        popGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + crackleDuration);

        popOsc.connect(popGain);
        popGain.connect(this.masterGain);
        popOsc.start();
        popOsc.stop(this.ctx.currentTime + crackleDuration);
      }
    }, 180);

    this.intervalIds.push(interval);
  }

  // --- 7. Nocturnal Drone (432Hz meditative warm chords) ---
  private synthesizeDrone(ctx: AudioContext): void {
    if (!this.masterGain) return;
    const rootFreq = 108; // 432Hz two octaves down (warm cello/synth frequency)
    const freqs = [rootFreq, rootFreq * 1.5, rootFreq * 2, rootFreq * 2.667]; // Root, Fifth, Octave, Fourth

    const droneGain = ctx.createGain();
    droneGain.gain.setValueAtTime(0.25, ctx.currentTime);
    droneGain.connect(this.masterGain);
    this.activeNodes.push(droneGain);

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, ctx.currentTime);

      const subGain = ctx.createGain();
      subGain.gain.setValueAtTime(1 / freqs.length, ctx.currentTime);

      osc.connect(filter);
      filter.connect(subGain);
      subGain.connect(droneGain);

      osc.start();
      this.activeNodes.push(osc, filter, subGain);
    });
  }
}

// Global singleton instance
export const ambientSound = typeof window !== 'undefined' ? new SoundscapeEngine() : (null as unknown as SoundscapeEngine);

