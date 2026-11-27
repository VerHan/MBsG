// ============================================================
// RIFTBOUND: SLAYER CORPS — ModeManager
// Manages transitions between game modes within a stage:
// TRAVERSE | SURVIVAL | DEFENSE | GAUNTLET | BOSS
// ============================================================

import type { GameMode, SegmentConfig, WaveConfig } from '../types';

export interface ModeState {
  mode: GameMode;
  segment: SegmentConfig;
  /** Survival: remaining seconds */
  timer: number;
  /** Defense: current Pylon HP */
  pylonHp: number;
  pylonMaxHp: number;
  /** Current wave index (survival & defense) */
  currentWave: number;
  totalWaves: number;
  /** Gauntlet: scroll offset */
  scrollOffset: number;
  scrollSpeed: number;
  /** Whether mode is active (enemies spawning, timer ticking) */
  active: boolean;
  /** Whether mode is complete */
  completed: boolean;
}

/**
 * ModeManager — orchestrates the lifecycle of each segment's game mode.
 *
 * Usage flow:
 *   const mgr = new ModeManager();
 *   mgr.enter(segmentConfig);           // start segment
 *   mgr.update(dt);                      // call every frame
 *   if (mgr.state.completed) { ... }     // check win condition
 */
export class ModeManager {
  public state: ModeState;

  private _waveTimer = 0;
  private _waveCooldown = 12; // seconds between waves
  private _onSpawnWave?: (wave: WaveConfig) => void;
  private _onModeComplete?: () => void;
  private _onPylonDestroyed?: () => void;

  constructor() {
    this.state = this._defaultState();
  }

  // ── Lifecycle Hooks ─────────────────────────────────────
  onSpawnWave(cb: (wave: WaveConfig) => void) {
    this._onSpawnWave = cb;
  }
  onModeComplete(cb: () => void) {
    this._onModeComplete = cb;
  }
  onPylonDestroyed(cb: () => void) {
    this._onPylonDestroyed = cb;
  }

  // ── Enter a new segment ─────────────────────────────────
  enter(segment: SegmentConfig) {
    this.state = this._defaultState();
    this.state.mode = segment.mode;
    this.state.segment = segment;
    this.state.active = true;

    switch (segment.mode) {
      case 'survival':
        this.state.timer = segment.survivalDuration ?? 60;
        this.state.totalWaves = segment.survivalWaves?.length ?? 0;
        this._waveCooldown = this.state.timer / Math.max(this.state.totalWaves, 1);
        this._waveTimer = 0; // spawn first wave immediately
        break;

      case 'defense':
        this.state.pylonMaxHp = segment.pylonHp ?? 500;
        this.state.pylonHp = this.state.pylonMaxHp;
        this.state.totalWaves = segment.defenseWaves?.length ?? 0;
        this._waveCooldown = 15;
        this._waveTimer = 3; // 3s grace period before first wave
        break;

      case 'gauntlet':
        this.state.timer = segment.gauntletDuration ?? 45;
        this.state.scrollSpeed = segment.scrollSpeed ?? 180;
        break;

      case 'boss':
        // Boss mode has its own lifecycle via Boss entity
        break;

      case 'traverse':
      default:
        // No special init needed
        break;
    }
  }

  // ── Frame Update ────────────────────────────────────────
  update(dt: number) {
    if (!this.state.active || this.state.completed) return;

    switch (this.state.mode) {
      case 'survival':
        this._updateSurvival(dt);
        break;
      case 'defense':
        this._updateDefense(dt);
        break;
      case 'gauntlet':
        this._updateGauntlet(dt);
        break;
      // traverse & boss are event-driven, not timer-driven
    }
  }

  // ── Survival Timer Logic ────────────────────────────────
  private _updateSurvival(dt: number) {
    this.state.timer -= dt;
    this._waveTimer -= dt;

    // Spawn next wave
    if (this._waveTimer <= 0 && this.state.currentWave < this.state.totalWaves) {
      const waves = this.state.segment.survivalWaves;
      if (waves && waves[this.state.currentWave]) {
        this._onSpawnWave?.(waves[this.state.currentWave]);
      }
      this.state.currentWave++;
      this._waveTimer = this._waveCooldown;
    }

    // Win: timer reaches 0
    if (this.state.timer <= 0) {
      this.state.timer = 0;
      this._complete();
    }
  }

  // ── Hold-the-Fort / Defense Logic ───────────────────────
  private _updateDefense(dt: number) {
    this._waveTimer -= dt;

    // Spawn next wave
    if (this._waveTimer <= 0 && this.state.currentWave < this.state.totalWaves) {
      const waves = this.state.segment.defenseWaves;
      if (waves && waves[this.state.currentWave]) {
        this._onSpawnWave?.(waves[this.state.currentWave]);
      }
      this.state.currentWave++;
      this._waveTimer = this._waveCooldown;
    }

    // Pylon destroyed → game over
    if (this.state.pylonHp <= 0) {
      this.state.pylonHp = 0;
      this.state.active = false;
      this._onPylonDestroyed?.();
    }
  }

  /** Called externally when all enemies of all waves are dead (defense mode) */
  notifyAllWavesCleared() {
    if (
      this.state.mode === 'defense' &&
      this.state.currentWave >= this.state.totalWaves &&
      this.state.pylonHp > 0
    ) {
      this._complete();
    }
  }

  /** Called externally when pylon takes damage */
  damagePylon(amount: number) {
    this.state.pylonHp = Math.max(0, this.state.pylonHp - amount);
  }

  /** Called externally when repair terminal is used successfully */
  repairPylon(amount: number) {
    this.state.pylonHp = Math.min(this.state.pylonMaxHp, this.state.pylonHp + amount);
  }

  // ── Gauntlet Run Logic ──────────────────────────────────
  private _updateGauntlet(dt: number) {
    this.state.timer -= dt;
    this.state.scrollOffset += this.state.scrollSpeed * dt;

    // Win: timer reaches 0 (MC survived the run)
    if (this.state.timer <= 0) {
      this.state.timer = 0;
      this._complete();
    }
  }

  // ── Traverse: called when player reaches exit gate ──────
  completeTraverse() {
    if (this.state.mode === 'traverse') {
      this._complete();
    }
  }

  // ── Boss: called when boss HP reaches 0 ─────────────────
  completeBoss() {
    if (this.state.mode === 'boss') {
      this._complete();
    }
  }

  // ── Internal ────────────────────────────────────────────
  private _complete() {
    this.state.completed = true;
    this.state.active = false;
    this._onModeComplete?.();
  }

  private _defaultState(): ModeState {
    return {
      mode: 'traverse',
      segment: { id: '', mode: 'traverse', name: '' },
      timer: 0,
      pylonHp: 0,
      pylonMaxHp: 0,
      currentWave: 0,
      totalWaves: 0,
      scrollOffset: 0,
      scrollSpeed: 0,
      active: false,
      completed: false,
    };
  }
}
