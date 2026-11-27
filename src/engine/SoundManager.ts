// ============================================================
// RIFTBOUND: SLAYER CORPS — SoundManager
// Web Audio API procedural retro SFX synthesizer
// Zero external audio files — all sounds generated at runtime.
// ============================================================

import type { SoundId } from '../types';

type OscType = OscillatorType;

interface ToneStep {
  freq: number;
  duration: number;
  type: OscType;
  gain: number;
  /** Frequency slide target (portamento) */
  slideTo?: number;
}

interface SfxDef {
  steps: ToneStep[];
  /** Optional noise burst (for impacts, explosions) */
  noise?: { duration: number; gain: number };
}

/**
 * Procedural retro SFX definitions.
 * Each sound is a sequence of oscillator tones + optional noise.
 */
const SFX_LIBRARY: Partial<Record<SoundId, SfxDef>> = {
  sword_slash: {
    steps: [
      { freq: 800, duration: 0.04, type: 'sawtooth', gain: 0.3, slideTo: 200 },
    ],
    noise: { duration: 0.06, gain: 0.15 },
  },
  dual_slash: {
    steps: [
      { freq: 900, duration: 0.03, type: 'sawtooth', gain: 0.25, slideTo: 300 },
      { freq: 1000, duration: 0.03, type: 'sawtooth', gain: 0.25, slideTo: 250 },
    ],
  },
  combo_spin: {
    steps: [
      { freq: 520, duration: 0.04, type: 'sawtooth', gain: 0.26, slideTo: 1180 },
      { freq: 980, duration: 0.06, type: 'triangle', gain: 0.28, slideTo: 420 },
    ],
    noise: { duration: 0.08, gain: 0.16 },
  },
  combo_finisher: {
    steps: [
      { freq: 340, duration: 0.05, type: 'sawtooth', gain: 0.36, slideTo: 90 },
      { freq: 180, duration: 0.1, type: 'square', gain: 0.3, slideTo: 55 },
    ],
    noise: { duration: 0.12, gain: 0.3 },
  },
  spear_thrust: {
    steps: [
      { freq: 1050, duration: 0.04, type: 'triangle', gain: 0.28, slideTo: 320 },
    ],
    noise: { duration: 0.04, gain: 0.14 },
  },
  hammer_slam: {
    steps: [
      { freq: 130, duration: 0.11, type: 'sawtooth', gain: 0.45, slideTo: 38 },
    ],
    noise: { duration: 0.16, gain: 0.38 },
  },
  block_clang: {
    steps: [
      { freq: 960, duration: 0.03, type: 'square', gain: 0.24, slideTo: 620 },
      { freq: 1320, duration: 0.05, type: 'triangle', gain: 0.2, slideTo: 880 },
    ],
    noise: { duration: 0.04, gain: 0.14 },
  },
  parry_flash: {
    steps: [
      { freq: 1100, duration: 0.04, type: 'sine', gain: 0.3, slideTo: 1800 },
      { freq: 1560, duration: 0.09, type: 'triangle', gain: 0.28, slideTo: 980 },
    ],
    noise: { duration: 0.06, gain: 0.18 },
  },
  axe_hit: {
    steps: [
      { freq: 200, duration: 0.08, type: 'sawtooth', gain: 0.4, slideTo: 60 },
    ],
    noise: { duration: 0.1, gain: 0.3 },
  },
  pistol_fire: {
    steps: [
      { freq: 600, duration: 0.05, type: 'square', gain: 0.25, slideTo: 100 },
    ],
    noise: { duration: 0.03, gain: 0.2 },
  },
  dual_pistol_fire: {
    steps: [
      { freq: 700, duration: 0.03, type: 'square', gain: 0.2, slideTo: 150 },
      { freq: 650, duration: 0.03, type: 'square', gain: 0.2, slideTo: 120 },
    ],
  },
  shotgun_blast: {
    steps: [
      { freq: 150, duration: 0.08, type: 'sawtooth', gain: 0.5, slideTo: 30 },
    ],
    noise: { duration: 0.15, gain: 0.45 },
  },
  rifle_beam: {
    steps: [
      { freq: 1200, duration: 0.12, type: 'sine', gain: 0.3, slideTo: 800 },
    ],
  },
  dash: {
    steps: [
      { freq: 400, duration: 0.08, type: 'sine', gain: 0.15, slideTo: 100 },
    ],
  },
  jump: {
    steps: [
      { freq: 250, duration: 0.1, type: 'square', gain: 0.15, slideTo: 500 },
    ],
  },
  double_jump: {
    steps: [
      { freq: 350, duration: 0.08, type: 'square', gain: 0.15, slideTo: 700 },
    ],
  },
  player_hit: {
    steps: [
      { freq: 200, duration: 0.1, type: 'sawtooth', gain: 0.35, slideTo: 80 },
    ],
    noise: { duration: 0.08, gain: 0.25 },
  },
  player_heal: {
    steps: [
      { freq: 400, duration: 0.1, type: 'sine', gain: 0.2, slideTo: 800 },
      { freq: 600, duration: 0.15, type: 'sine', gain: 0.2, slideTo: 1000 },
    ],
  },
  enemy_hit: {
    steps: [
      { freq: 300, duration: 0.05, type: 'square', gain: 0.2, slideTo: 100 },
    ],
    noise: { duration: 0.04, gain: 0.15 },
  },
  enemy_die: {
    steps: [
      { freq: 500, duration: 0.06, type: 'sawtooth', gain: 0.3, slideTo: 50 },
    ],
    noise: { duration: 0.12, gain: 0.25 },
  },
  chest_open: {
    steps: [
      { freq: 523, duration: 0.1, type: 'sine', gain: 0.25 },
      { freq: 659, duration: 0.1, type: 'sine', gain: 0.25 },
      { freq: 784, duration: 0.15, type: 'sine', gain: 0.3 },
    ],
  },
  puzzle_correct: {
    steps: [
      { freq: 523, duration: 0.08, type: 'square', gain: 0.2 },
      { freq: 659, duration: 0.08, type: 'square', gain: 0.2 },
      { freq: 784, duration: 0.08, type: 'square', gain: 0.2 },
      { freq: 1047, duration: 0.15, type: 'square', gain: 0.3 },
    ],
  },
  puzzle_wrong: {
    steps: [
      { freq: 300, duration: 0.15, type: 'sawtooth', gain: 0.25, slideTo: 100 },
      { freq: 250, duration: 0.2, type: 'sawtooth', gain: 0.2, slideTo: 80 },
    ],
  },
  style_rank_up: {
    steps: [
      { freq: 800, duration: 0.05, type: 'square', gain: 0.25, slideTo: 1200 },
      { freq: 1000, duration: 0.08, type: 'square', gain: 0.3, slideTo: 1600 },
    ],
  },
  adrenaline_burst: {
    steps: [
      { freq: 200, duration: 0.1, type: 'sawtooth', gain: 0.3, slideTo: 800 },
      { freq: 600, duration: 0.15, type: 'sawtooth', gain: 0.35, slideTo: 1200 },
    ],
    noise: { duration: 0.1, gain: 0.2 },
  },
  pylon_hit: {
    steps: [
      { freq: 150, duration: 0.1, type: 'sine', gain: 0.3, slideTo: 80 },
    ],
    noise: { duration: 0.06, gain: 0.2 },
  },
  pylon_repair: {
    steps: [
      { freq: 400, duration: 0.08, type: 'sine', gain: 0.2, slideTo: 600 },
      { freq: 500, duration: 0.1, type: 'sine', gain: 0.2, slideTo: 800 },
    ],
  },
  boss_roar: {
    steps: [
      { freq: 100, duration: 0.3, type: 'sawtooth', gain: 0.4, slideTo: 50 },
    ],
    noise: { duration: 0.2, gain: 0.35 },
  },
  boss_stun: {
    steps: [
      { freq: 800, duration: 0.2, type: 'sine', gain: 0.3, slideTo: 200 },
    ],
  },
  stage_clear: {
    steps: [
      { freq: 523, duration: 0.12, type: 'square', gain: 0.2 },
      { freq: 659, duration: 0.12, type: 'square', gain: 0.2 },
      { freq: 784, duration: 0.12, type: 'square', gain: 0.2 },
      { freq: 1047, duration: 0.12, type: 'square', gain: 0.25 },
      { freq: 1319, duration: 0.2, type: 'square', gain: 0.3 },
    ],
  },
  game_over: {
    steps: [
      { freq: 400, duration: 0.2, type: 'sawtooth', gain: 0.3, slideTo: 100 },
      { freq: 300, duration: 0.3, type: 'sawtooth', gain: 0.25, slideTo: 50 },
    ],
  },
  menu_select: {
    steps: [
      { freq: 800, duration: 0.04, type: 'square', gain: 0.1 },
    ],
  },
  menu_confirm: {
    steps: [
      { freq: 600, duration: 0.05, type: 'square', gain: 0.15, slideTo: 900 },
    ],
  },
};

export class SoundManager {
  private _ctx: AudioContext | null = null;
  private _masterGain: GainNode | null = null;
  private _volume = 0.5;
  private _muted = false;

  /** Lazily create AudioContext (must be triggered after user gesture) */
  private _ensureCtx(): AudioContext {
    if (!this._ctx) {
      this._ctx = new AudioContext();
      this._masterGain = this._ctx.createGain();
      this._masterGain.gain.value = this._muted ? 0 : this._volume;
      this._masterGain.connect(this._ctx.destination);
    }
    if (this._ctx.state === 'suspended') {
      this._ctx.resume();
    }
    return this._ctx;
  }

  /** Play a named sound effect */
  play(id: SoundId) {
    const def = SFX_LIBRARY[id];
    if (!def) return;

    const ctx = this._ensureCtx();
    const master = this._masterGain!;
    let t = ctx.currentTime;

    // Play tone steps
    for (const step of def.steps) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = step.type;
      osc.frequency.setValueAtTime(step.freq, t);
      if (step.slideTo !== undefined) {
        osc.frequency.linearRampToValueAtTime(step.slideTo, t + step.duration);
      }

      gain.gain.setValueAtTime(step.gain, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + step.duration);

      osc.connect(gain);
      gain.connect(master);
      osc.start(t);
      osc.stop(t + step.duration + 0.01);

      t += step.duration;
    }

    // Play noise burst (for impacts)
    if (def.noise) {
      const bufferSize = Math.floor(ctx.sampleRate * def.noise.duration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noiseNode = ctx.createBufferSource();
      noiseNode.buffer = buffer;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(def.noise.gain, ctx.currentTime);
      noiseGain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + def.noise.duration
      );
      noiseNode.connect(noiseGain);
      noiseGain.connect(master);
      noiseNode.start(ctx.currentTime);
      noiseNode.stop(ctx.currentTime + def.noise.duration + 0.01);
    }
  }

  setVolume(v: number) {
    this._volume = Math.max(0, Math.min(1, v));
    if (this._masterGain && !this._muted) {
      this._masterGain.gain.value = this._volume;
    }
  }

  toggleMute(): boolean {
    this._muted = !this._muted;
    if (this._masterGain) {
      this._masterGain.gain.value = this._muted ? 0 : this._volume;
    }
    return this._muted;
  }

  get muted() {
    return this._muted;
  }
}
