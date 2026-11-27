// ============================================================
// RIFTBOUND: SLAYER CORPS — GameEngine (Animated Core Loop)
// Fixed-timestep 60fps engine with squash/stretch, flowing cape,
// weapon-in-hand swings, crescent slash arcs, hit-flash,
// bounce vents, puzzle shrine, and multi-area camera tracking.
// ============================================================

import type {
  ArmorId,
  GameMode,
  PlayerState,
  PuzzleTrigger,
  SavedGearState,
  StyleRank,
  WaveConfig,
  WeaponInstance,
} from '../types';
import { ARMORS } from '../data/armors';
import { ENEMIES } from '../data/enemies';
import { WEAPONS, getWeaponLevel } from '../data/weapons';
import { InputManager } from './InputManager';
import { ModeManager } from './ModeManager';
import { ParallaxRenderer } from './ParallaxRenderer';
import { ParticleSystem } from './ParticleSystem';
import {
  CHEST_SPRITE,
  ENEMY_PALETTES,
  PYLON_SPRITE,
  PixelSpriteRenderer,
  drawBossSprite,
  drawComplexSlayerAvatar,
  getEnemyMatrix,
} from './PixelSpriteRenderer';
import { SoundManager } from './SoundManager';
import {
  buildPlayableLevel,
  type BuiltLevel,
  type Platform,
  type PlayableModeKey,
} from './LevelBuilder';
import {
  canWeaponAirSlam,
  canWeaponDualCombo,
  canWeaponGroundSlam,
  computeWeaponBladeSegment,
  computeWeaponSweepHitbox,
  getRightClickSkillMeta,
  getWeaponMoveProfile,
  resolveCombatAction,
  sampleStickmanCombatPose,
  segmentIntersectsAABB,
  type CombatMoveType,
  type RightClickSkillKind,
} from './combatRules';
import { Player } from '../entities/Player';
import {
  breakShieldViaRunicPillar,
  createBoss,
  damageBoss,
  updateBoss,
  type BossInstance,
} from '../entities/Boss';
import {
  createEnemy,
  damageEnemy,
  damageEnemyDetailed,
  updateEnemyAI,
  type EnemyInstance,
} from '../entities/Enemy';
import {
  createBowArrow,
  createDualPistolBurst,
  createEnemyOrb,
  createProjectile,
  createRifleBeam,
  createShotgunSpread,
  updateProjectile,
  type ProjectileInstance,
} from '../entities/Projectile';
import {
  checkInteractRange,
  updateInteractable,
  type InteractableInstance,
} from '../entities/Interactables';

const FIXED_DT = 1 / 60;
const MAX_FRAME_SKIP = 5;

export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 270;

export interface Camera {
  x: number;
  y: number;
  shakeX: number;
  shakeY: number;
  shakeIntensity: number;
  shakeDuration: number;
}

interface SlashVisual {
  x: number;
  y: number;
  radius: number;
  isPogo: boolean;
  facingRight: boolean;
  comboStep: number;
  shape:
    | 'crescent'
    | 'spin_horizontal'
    | 'thrust'
    | 'dash_thrust'
    | 'slam_impact'
    | 'tornado'
    | 'vertical_chop'
    | 'vertical_spin'
    | 'x_cut'
    | 'silk_lash'
    | 'needle_thread';
  bidirectional?: boolean;
  color: string;
  life: number;
  maxLife: number;
}

interface HitEffect {
  x: number;
  y: number;
  color: string;
  radius: number;
  life: number;
  maxLife: number;
  kind: 'slash' | 'pierce' | 'impact' | 'parry';
}

interface PendingComboStrike {
  delay: number;
  rangeW: number;
  rangeH: number;
  radius: number;
  damageRatio: number;
  shape: SlashVisual['shape'];
  color: string;
  comboStep: number;
  isPogo: boolean;
  bidirectional: boolean;
  armorBreak: boolean;
  knockbackX: number;
  liftVy?: number;
  lungeVx?: number;
  shake?: number;
  sound?: Parameters<SoundManager['play']>[0];
}

interface FloatingText {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  isCrit?: boolean;
}

interface ManaTurret {
  x: number;
  y: number;
  life: number;
  fireTimer: number;
}

interface GhostTrail {
  x: number;
  y: number;
  facingRight: boolean;
  life: number;
  maxLife: number;
  color: string;
}

interface GroundDrop {
  id: string;
  kind: 'energy_orb' | 'ammo_pack' | 'boss_relic';
  x: number;
  y: number;
  vy: number;
  label: string;
  energyAmount?: number;
  ammoPacks?: number;
  shards?: number;
  weaponId?: WeaponInstance['defId'];
  weaponTier?: WeaponInstance['tier'];
  weaponLevel?: number;
  secondaryWeaponId?: WeaponInstance['defId'];
  secondaryWeaponTier?: WeaponInstance['tier'];
  armorId?: ArmorId;
  life: number;
}

const GEAR_STORAGE_KEY = 'riftbound_gear_save_v1';

export interface HudSnapshot {
  mode: GameMode;
  stageNumber: 1 | 2 | 3;
  themeTopic: string;
  segmentName: string;
  areaName: string;
  areaSubtitle: string;
  progressPct: number;
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  ammoPacks: number;
  maxAmmoPacks: number;
  nanoVials: number;
  maxNanoVials: number;
  shards: number;
  meleeWeapon: WeaponInstance;
  rangedWeapon: WeaponInstance | null;
  armorId: ArmorId;
  styleRank: StyleRank;
  stylePoints: number;
  adrenaline: number;
  adrenalineActive: boolean;
  timer: number;
  pylonHp: number;
  pylonMaxHp: number;
  currentWave: number;
  totalWaves: number;
  enemiesRemaining: number;
  kills: number;
  interactPrompt: string | null;
  manaShieldTimer: number;
  turretTimer: number;
  isBlocking: boolean;
  hasFullShield: boolean;
  meleeCombo: number;
  counterReady: boolean;
  activeMove: CombatMoveType | null;
  isMeleeMode: boolean;
  dashThrustReady: boolean;
  rightSkillKind: RightClickSkillKind;
  rightSkillLabel: string;
  rightSkillShortLabel: string;
  rightSkillInputHint: string;
  rightSkillCost: number;
  canAirSlam: boolean;
  boss?: {
    name: string;
    title: string;
    hp: number;
    maxHp: number;
    shieldActive: boolean;
    shieldHp: number;
    shieldMaxHp: number;
    stunned: boolean;
  };
  minimap?: {
    worldWidth: number;
    playerX: number;
    areas: Array<{ name: string; startX: number; endX: number }>;
    markers: Array<{ x: number; kind: 'chest' | 'chest_open' | 'shrine' | 'boss' | 'exit' }>;
  };
}

export interface PuzzleRequest {
  trigger: PuzzleTrigger;
  questionsRequired: number;
  title: string;
  interactableId: string;
}

export class GameEngine {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;
  public input: InputManager;
  public mode: ModeManager;
  public sound: SoundManager;
  public parallax: ParallaxRenderer;
  public particles: ParticleSystem;
  public sprites: PixelSpriteRenderer;
  public camera: Camera;

  public player: Player;
  public level: BuiltLevel | null = null;
  public enemies: EnemyInstance[] = [];
  public boss: BossInstance | null = null;
  public projectiles: ProjectileInstance[] = [];
  public interactables: InteractableInstance[] = [];
  public paused = false;
  public currentMode: GameMode = 'traverse';

  private _running = false;
  private _rafId = 0;
  private _accumulator = 0;
  private _lastTime = 0;
  private _hitstopFrames = 0;
  private _animTime = 0;
  private _dropThroughTimer = 0;
  private _manaShieldTimer = 0;
  private _spikeIFrame = 0;
  private _bounceCooldown = 0;
  private _bossTriggered = false;
  private _bossContactCooldown = 0;
  private _bossFlashTimer = 0;
  private _kills = 0;
  private _hudSyncCounter = 0;

  // Juice & animation state
  private _scaleX = 1;
  private _scaleY = 1;
  private _meleeAnimTimer = 0;
  private _meleeAnimDuration = 0.16;
  private _meleeAnimIsPogo = false;
  private _activeCombatMove: CombatMoveType | null = null;
  private _airSlamState: 'none' | 'windup' | 'dive' | 'impact' = 'none';
  private _airSlamTimer = 0;
  private _airSlamHitIds = new Set<string>();
  private _activeSwingHitIds = new Set<string>();
  private _activeSwingMeta: {
    move: CombatMoveType;
    damageRatio: number;
    armorBreak: boolean;
    knockbackX: number;
    color: string;
    isPogo: boolean;
    bidirectional: boolean;
    comboStep: number;
  } | null = null;
  private _meleePressHeld = false;
  private _meleeHoldTime = 0;
  private _meleeBufferTimer = 0;
  private _rangedPressHeld = false;
  private _rangedHoldTime = 0;
  private _dualChordWindow = 0;
  private _spinAttackTimer = 0;
  private _spinAttackDuration = 0.24;
  private _spinMode: 'vertical' | 'horizontal' = 'vertical';
  private _iaidoWindupTimer = 0;
  private _doubleJumpFlipTimer = 0;
  private _parryFlashTimer = 0;
  private _walkCycle = 0;
  private _prevFacingRight = true;
  private _ghostTrails: GhostTrail[] = [];
  private _gearStorageKey = GEAR_STORAGE_KEY;
  private _lastRunStep = -1;
  private _rangedAnimTimer = 0;
  private _scarfPoints: Array<{ x: number; y: number }> = [];
  private _currentAreaId = '';
  private _slashes: SlashVisual[] = [];
  private _hitEffects: HitEffect[] = [];
  private _pendingComboStrikes: PendingComboStrike[] = [];
  private _floatingTexts: FloatingText[] = [];
  private _screenFlashTimer = 0;
  private _screenFlashColor = 'rgba(239, 68, 68, 0.25)';
  private _turrets: ManaTurret[] = [];
  private _groundDrops: GroundDrop[] = [];
  private _dropIdCounter = 0;
  private _laserCooldown = 0;
  private _pendingSpawns: Array<{ enemyId: EnemyInstance['defId']; delay: number }> = [];
  private _pylonDamageCooldown = 0;
  private _lastStyleRank: StyleRank = 'D';

  // React callbacks
  public onHudUpdate?: (snapshot: HudSnapshot) => void;
  public onSegmentComplete?: (segmentId: string, kills: number, shards: number) => void;
  public onGameOver?: (reason: string) => void;
  public onPuzzleTrigger?: (req: PuzzleRequest) => void;
  public onAreaChange?: (name: string, subtitle: string) => void;
  public onPause?: () => void;
  public onToggleInventory?: () => void;
  public onToast?: (msg: string) => void;
  public onGearChange?: (gear: SavedGearState) => void;

  constructor(canvas: HTMLCanvasElement, initialPlayer?: Partial<PlayerState>) {
    this.canvas = canvas;
    this.canvas.width = GAME_WIDTH;
    this.canvas.height = GAME_HEIGHT;

    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    this.ctx = ctx;

    this.input = new InputManager(canvas);
    this.mode = new ModeManager();
    this.sound = new SoundManager();
    this.parallax = new ParallaxRenderer();
    this.particles = new ParticleSystem();
    this.sprites = new PixelSpriteRenderer();
    this.player = new Player(initialPlayer);

    this.camera = {
      x: 0,
      y: 0,
      shakeX: 0,
      shakeY: 0,
      shakeIntensity: 0,
      shakeDuration: 0,
    };

    this.mode.onSpawnWave((wave) => this._queueWave(wave));
    this.mode.onModeComplete(() => {
      this.sound.play('stage_clear');
      this.onSegmentComplete?.(this.mode.state.segment.id, this._kills, this.player.state.shards);
    });
    this.mode.onPylonDestroyed(() => {
      this.sound.play('game_over');
      this.onGameOver?.('Ancient Seal Pylon hancur! Rift melebar tak terkendali.');
    });
  }

  start() {
    if (this._running) return;
    this._running = true;
    this._lastTime = performance.now();
    this._accumulator = 0;
    this._rafId = requestAnimationFrame(this._loop);
  }

  stop() {
    this._running = false;
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = 0;
    }
  }

  setStudentKey(usernameKey: string | null) {
    this._gearStorageKey = usernameKey ? `${GEAR_STORAGE_KEY}_${usernameKey}` : GEAR_STORAGE_KEY;
  }

  loadPlayableMode(
    modeKey: PlayableModeKey,
    keepGear = false,
    cloudGear?: SavedGearState | null
  ) {
    const built = buildPlayableLevel(modeKey);
    this.level = built;
    this.currentMode = built.segment.mode;
    this.enemies = built.enemies;
    this.boss = null;
    this._bossTriggered = false;
    this._bossContactCooldown = 0;
    this._bossFlashTimer = 0;
    this.interactables = built.interactables;
    this.projectiles = [];
    this._slashes = [];
    this._hitEffects = [];
    this._pendingComboStrikes = [];
    this._ghostTrails = [];
    this._floatingTexts = [];
    this._screenFlashTimer = 0;
    this._turrets = [];
    this._groundDrops = [];
    this._laserCooldown = 0;
    this._pendingSpawns = [];
    this._manaShieldTimer = 0;
    this._meleePressHeld = false;
    this._meleeHoldTime = 0;
    this._meleeBufferTimer = 0;
    this._rangedPressHeld = false;
    this._rangedHoldTime = 0;
    this._dualChordWindow = 0;
    this._activeCombatMove = null;
    this._airSlamState = 'none';
    this._airSlamTimer = 0;
    this._airSlamHitIds.clear();
    this._spinAttackTimer = 0;
    this._iaidoWindupTimer = 0;
    this._doubleJumpFlipTimer = 0;
    this._parryFlashTimer = 0;
    this._walkCycle = 0;
    this._kills = 0;
    this._currentAreaId = '';
    this._lastStyleRank = 'D';
    this._scaleX = 1;
    this._scaleY = 1;

    if (!keepGear) {
      const saved = cloudGear ?? this._loadSavedGear();
      this.player = new Player(saved ?? undefined);
    }

    this.player.x = built.playerSpawn.x;
    this.player.y = built.playerSpawn.y;
    this.player.vx = 0;
    this.player.vy = 0;
    this._prevFacingRight = this.player.facingRight;
    this.player.state.hp = this.player.state.maxHp;
    this.player.state.energy = this.player.state.maxEnergy;
    this.player.state.styleRank = 'D';
    this.player.state.stylePoints = 0;

    this._scarfPoints = Array.from({ length: 4 }, (_, i) => ({
      x: this.player.x + 6 - i * 1.4,
      y: this.player.y + 9 + i * 2.2,
    }));

    this.parallax.setTheme(built.parallaxTheme);
    this.particles.clear();
    this.mode.enter(built.segment);
    this._checkAreaTransition();
    this._updateCamera(1);
    this._emitHud();
  }

  private _loop = (now: number) => {
    if (!this._running) return;
    this._rafId = requestAnimationFrame(this._loop);

    const frameTime = Math.min((now - this._lastTime) / 1000, 0.1);
    this._lastTime = now;

    if (this.paused) {
      this._render();
      return;
    }

    if (this._hitstopFrames > 0) {
      this._hitstopFrames--;
      this._render();
      return;
    }

    this._accumulator += frameTime;
    let steps = 0;
    while (this._accumulator >= FIXED_DT && steps < MAX_FRAME_SKIP) {
      this._fixedUpdate(FIXED_DT);
      this._accumulator -= FIXED_DT;
      steps++;
    }

    this._render();
  };

  private _fixedUpdate(dt: number) {
    if (!this.level) return;
    this._animTime += dt;

    this.input.update();

    if (this.input.isJustPressed('pause')) {
      this.pause();
      return;
    }
    if (this.input.isJustPressed('inventory')) {
      this.pauseForModal();
      this.onToggleInventory?.();
      return;
    }

    this.mode.update(dt);
    this._processPendingSpawns(dt);

    // Ambient drifting ash & Mana spores
    if (Math.random() < 0.35) {
      this.particles.emit(
        'mana_dust',
        this.camera.x + Math.random() * GAME_WIDTH,
        this.camera.y + GAME_HEIGHT - 8,
        -Math.PI / 2
      );
    }

    if (this._manaShieldTimer > 0) this._manaShieldTimer -= dt;
    if (this._spikeIFrame > 0) this._spikeIFrame -= dt;
    if (this._dropThroughTimer > 0) this._dropThroughTimer -= dt;
    if (this._bounceCooldown > 0) this._bounceCooldown -= dt;
    if (this._laserCooldown > 0) this._laserCooldown -= dt;
    if (this._pylonDamageCooldown > 0) this._pylonDamageCooldown -= dt;
    if (this._bossContactCooldown > 0) this._bossContactCooldown -= dt;
    if (this._bossFlashTimer > 0) this._bossFlashTimer -= dt;
    if (this._meleeAnimTimer > 0) {
      this._meleeAnimTimer = Math.max(0, this._meleeAnimTimer - dt);
      if (
        this._meleeAnimTimer <= 0 &&
        this._airSlamState === 'none' &&
        this._activeCombatMove !== 'ground_slam_charge'
      ) {
        this._activeCombatMove = null;
      }
    }
    if (this._rangedAnimTimer > 0) this._rangedAnimTimer = Math.max(0, this._rangedAnimTimer - dt);
    if (this._meleeBufferTimer > 0) this._meleeBufferTimer = Math.max(0, this._meleeBufferTimer - dt);
    if (this._dualChordWindow > 0) this._dualChordWindow = Math.max(0, this._dualChordWindow - dt);
    if (this._spinAttackTimer > 0) this._spinAttackTimer = Math.max(0, this._spinAttackTimer - dt);
    if (this._iaidoWindupTimer > 0) {
      this._iaidoWindupTimer = Math.max(0, this._iaidoWindupTimer - dt);
    }
    if (this._doubleJumpFlipTimer > 0) {
      this._doubleJumpFlipTimer = Math.max(0, this._doubleJumpFlipTimer - dt);
    }
    if (this._parryFlashTimer > 0) this._parryFlashTimer = Math.max(0, this._parryFlashTimer - dt);
    if (this._screenFlashTimer > 0) this._screenFlashTimer = Math.max(0, this._screenFlashTimer - dt);

    // Update Aerial Slam state machine (windup hover -> meteor dive -> ground impact settle)
    if (this._airSlamState === 'windup') {
      this._airSlamTimer -= dt;
      this.player.vy = -12;
      this.player.vx *= 0.82;
      if (this._airSlamTimer <= 0) {
        this._airSlamState = 'dive';
        this._activeCombatMove = 'air_slam_dive';
        this._meleeAnimDuration = 0.2;
        this._meleeAnimTimer = 0.2;
        this.player.vy = 475;
        this.sound.play('dash');
      }
    } else if (this._airSlamState === 'dive') {
      this.player.vy = Math.max(this.player.vy, 455);
      this._meleeAnimTimer = 0.12;
      this._checkAirSlamDiveHits();
    } else if (this._airSlamState === 'impact') {
      this._airSlamTimer -= dt;
      if (this._airSlamTimer <= 0) {
        this._airSlamState = 'none';
        this._activeCombatMove = null;
      }
    }

    // Continuous smooth stride cycle + turn-around skid dust
    if (this.player.onGround && Math.abs(this.player.vx) > 12) {
      const strideRate = (Math.abs(this.player.vx) / 165) * 14;
      this._walkCycle += strideRate * dt;
      const stepHalf = Math.floor(this._walkCycle / Math.PI);
      if (stepHalf !== this._lastRunStep) {
        this._lastRunStep = stepHalf;
        this.particles.emit(
          'mana_dust',
          this.player.x + this.player.width / 2,
          this.player.y + this.player.height,
          -Math.PI / 2
        );
      }
      if (this.player.facingRight !== this._prevFacingRight && Math.abs(this.player.vx) > 55) {
        this.particles.emit(
          'mana_dust',
          this.player.x + this.player.width / 2,
          this.player.y + this.player.height,
          this.player.facingRight ? Math.PI : 0
        );
      }
    } else {
      this._lastRunStep = -1;
    }
    this._prevFacingRight = this.player.facingRight;

    // Emit dynamic ghost afterimages on dash thrust, vertical spin, air slam dive, dash, or double-jump flip
    const isHighSpeedMove =
      this.player.isDashing ||
      this._activeCombatMove === 'dash_thrust' ||
      this._activeCombatMove === 'spin_vertical' ||
      this._airSlamState === 'dive' ||
      this._doubleJumpFlipTimer > 0;
    if (isHighSpeedMove && Math.random() < 0.78) {
      const armor = ARMORS[this.player.state.armorId] ?? ARMORS.recruit_mk1;
      const trailProfile = getWeaponMoveProfile(this.player.state.meleeWeapon.defId);
      this._ghostTrails.push({
        x: this.player.x + this.player.width / 2,
        y: this.player.y + this.player.height,
        facingRight: this.player.facingRight,
        life: 0.14,
        maxLife: 0.14,
        color:
          this._activeCombatMove === 'dash_thrust' || this._airSlamState === 'dive'
            ? trailProfile.trailColor
            : this._activeCombatMove === 'spin_vertical'
              ? '#FACC15'
              : armor.palette.glow,
      });
    }

    // Smooth squash & stretch recovery
    this._scaleX += (1 - this._scaleX) * Math.min(1, dt * 15);
    this._scaleY += (1 - this._scaleY) * Math.min(1, dt * 15);

    this._updateStageMechanisms(dt);
    this._handlePlayerInput(dt);
    for (let i = this._pendingComboStrikes.length - 1; i >= 0; i--) {
      this._pendingComboStrikes[i].delay -= dt;
      if (this._pendingComboStrikes[i].delay <= 0) {
        const strike = this._pendingComboStrikes.splice(i, 1)[0];
        this._executeMeleeStrike(strike);
      }
    }
    this.player.update(dt);
    this.player.applyGravity(dt);
    this._moveAndCollidePlayer(dt);
    this._checkLiveBladeContacts();
    this._updateGroundDrops(dt);
    this._updateScarf(dt);
    this._checkAreaTransition();

    if (this.player.state.styleRank !== this._lastStyleRank) {
      const order: StyleRank[] = ['D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];
      if (order.indexOf(this.player.state.styleRank) > order.indexOf(this._lastStyleRank)) {
        this.sound.play('style_rank_up');
        this._spawnFloatingText(
          this.player.x + 7,
          this.player.y - 12,
          `RANK ${this.player.state.styleRank}!`,
          '#FACC15'
        );
      }
      this._lastStyleRank = this.player.state.styleRank;
    }

    this._updateEnemies(dt);
    this._updateBoss(dt);
    this._updateTurrets(dt);
    this._updateProjectiles(dt);
    this._updateInteractables(dt);
    this._updateVisuals(dt);
    this.particles.update(dt);
    this._updateShake(dt);
    this._updateCamera(dt);

    if (
      this.mode.state.mode === 'defense' &&
      this._pendingSpawns.length === 0 &&
      this.enemies.length === 0
    ) {
      this.mode.notifyAllWavesCleared();
    }

    this._hudSyncCounter++;
    if (this._hudSyncCounter >= 3) {
      this._hudSyncCounter = 0;
      this._emitHud();
    }
  }

  private _updateScarf(dt: number) {
    if (this._scarfPoints.length === 0) return;
    const p = this.player;
    const anchorX = p.x + p.width / 2 + (p.facingRight ? -3 : 3);
    const anchorY = p.y + (p.isBlocking ? 11 : 9);
    this._scarfPoints[0].x = anchorX;
    this._scarfPoints[0].y = anchorY;

    // Compact draped cloak physics: hangs neatly down the back with gentle wind trail on run
    const speedLagX = -Math.max(-3.4, Math.min(3.4, p.vx * 0.02));
    const idleBackX = p.facingRight ? -1.4 : 1.4;
    const stepX = speedLagX + idleBackX;
    const fallLiftY = Math.max(-2.2, Math.min(2.0, -p.vy * 0.01));
    for (let i = 1; i < this._scarfPoints.length; i++) {
      const prev = this._scarfPoints[i - 1];
      const curr = this._scarfPoints[i];
      const wave = Math.sin(this._animTime * 9 + i * 0.85) * (Math.abs(p.vx) > 20 ? 0.9 : 0.35);
      const targetX = prev.x + stepX * 0.82;
      const targetY = prev.y + 2.2 + fallLiftY + wave;
      curr.x += (targetX - curr.x) * Math.min(1, dt * 22);
      curr.y += (targetY - curr.y) * Math.min(1, dt * 22);
    }
  }

  private _checkAreaTransition() {
    if (!this.level) return;
    const px = this.player.x + this.player.width / 2;
    const found = this.level.areas.find((a) => px >= a.startX && px < a.endX);
    if (found && found.id !== this._currentAreaId) {
      this._currentAreaId = found.id;
      this.onAreaChange?.(found.name, found.subtitle);
    }
  }

  // ── Player Input & Combat ───────────────────────────────
  private _handlePlayerInput(dt: number) {
    const p = this.player;

    let moveDir = 0;
    if (this.input.isHeld('move_left')) moveDir -= 1;
    if (this.input.isHeld('move_right')) moveDir += 1;
    p.moveHorizontal(moveDir, dt);

    if (this.input.isJustPressed('drop_down') && p.onGround) {
      this._dropThroughTimer = 0.22;
    }

    if (this.input.isJustPressed('jump')) {
      const jumpKind = p.jump();
      if (jumpKind) {
        this._scaleX = 0.76;
        this._scaleY = 1.26;
        if (jumpKind === 'double') {
          this._doubleJumpFlipTimer = 0.28;
          this.sound.play('double_jump');
        } else {
          this.sound.play('jump');
        }
        this.particles.emit('mana_dust', p.x + p.width / 2, p.y + p.height, -Math.PI / 2);
      }
    }
    if (this.input.isJustReleased('jump')) {
      p.releaseJump();
    }

    if (this.input.isJustPressed('dash')) {
      if (p.dash()) {
        this._scaleX = 1.3;
        this._scaleY = 0.76;
        this.sound.play('dash');
        this.particles.emit('dash_afterimage', p.x + p.width / 2, p.y + p.height / 2);
      }
    }

    if (p.isDashing && Math.random() < 0.8) {
      this.particles.emit('dash_afterimage', p.x + p.width / 2, p.y + p.height / 2);
    }

    if (this.input.isJustPressed('heal')) {
      if (p.heal()) {
        this.sound.play('player_heal');
        this._spawnFloatingText(p.x + 7, p.y - 8, '+35 HP', '#22C55E');
      }
    }

    if (this.input.isJustPressed('use_ammo')) {
      if (p.useAmmoPack()) {
        this.sound.play('pylon_repair');
        this._spawnFloatingText(p.x + 7, p.y - 10, '+60 AMMO!', '#00F0FF');
        this.saveGear();
      } else {
        this.onToast?.('Energy penuh atau Ammo Pack habis!');
      }
    }

    if (this.input.isJustPressed('adrenaline')) {
      if (p.activateAdrenaline()) {
        this.sound.play('adrenaline_burst');
        this.triggerShake(4, 0.25);
        this._spawnFloatingText(p.x + 7, p.y - 14, 'ADRENALINE!', '#F97316');
      }
    }

    // Unified Weapon-Balanced Stickman Combat Controls:
    // - Ground Tap LMB/[J] 3x: Hit 1 Standard Slash -> Hit 2 Spin Horizontal -> Hit 3 Mini Thrust
    // - Ground Hold LMB/[J] (>=0.20s): Block Guard & Parry
    // - Airborne Tap LMB/[J]: Spin Vertical
    // - Airborne Hold LMB/[J] (>=0.16s): Aerial Slam (DISABLED on Dagger!)
    // - RMB/[K]:
    //     * Gun Mode: Fire Ranged Weapon (Energy Cost)
    //     * Sword / Katana / Spear: Dash Thrust (Energy Cost)
    //     * Axe / Hammer: Hold RMB/[K] on Ground = Ground Slam (Energy Cost)
    //     * Dual Sword: RMB + LMB Chord = Dual X-Combo 2x Damage (Energy Cost)
    const inAirSlam = this._airSlamState === 'windup' || this._airSlamState === 'dive';
    const meleeId = p.state.meleeWeapon.defId;
    const hasGun = p.state.rangedWeapon !== null;

    let triggeredDualComboThisFrame = false;

    const tryTriggerDualCrossCombo = (): boolean => {
      if (hasGun || !canWeaponDualCombo(meleeId)) return false;
      const dualAction = resolveCombatAction({
        onGround: p.onGround,
        isHold: false,
        isRightClick: false,
        hasGun: false,
        comboStep: 1,
        weaponId: meleeId,
        isDualChord: true,
      });
      if (dualAction !== 'dual_cross_combo') return false;
      const res = p.triggerDualCrossCombo();
      this._dualChordWindow = 0;
      this._meleePressHeld = false;
      this._meleeHoldTime = 0;
      this._meleeBufferTimer = 0;
      if (res.ok) {
        this._performCombatMove('dual_cross_combo');
        return true;
      }
      if (res.reason === 'no_energy') {
        this.onToast?.(`Energy tidak cukup untuk Dual X-Combo (${res.cost} EN)!`);
      }
      return true;
    };

    if (this.input.isJustPressed('melee') && !inAirSlam) {
      // Check Dual Sword RMB + LMB chord (either holding RMB or pressed RMB within 0.32s)
      if (!hasGun && canWeaponDualCombo(meleeId) && (this.input.isHeld('ranged') || this._dualChordWindow > 0)) {
        triggeredDualComboThisFrame = tryTriggerDualCrossCombo();
      } else {
        this._meleePressHeld = true;
        this._meleeHoldTime = 0;
        if (p.onGround && this._meleeAnimTimer > 0) {
          this._meleeBufferTimer = 0.22;
        }
      }
    }

    if (this._meleePressHeld && this.input.isHeld('melee') && !inAirSlam) {
      this._meleeHoldTime += dt;
      if (!p.onGround) {
        // Jump-Hit Hold -> Aerial Slam (disabled on short Dagger!)
        if (this._meleeHoldTime >= 0.16 && this._airSlamState === 'none') {
          const action = resolveCombatAction({
            onGround: false,
            isHold: true,
            isRightClick: false,
            hasGun,
            comboStep: 1,
            weaponId: meleeId,
          });
          this._meleePressHeld = false;
          this._meleeHoldTime = 0;
          this._meleeBufferTimer = 0;
          if (action === 'air_slam_windup' && p.triggerAerialSlam()) {
            this._startAirSlam();
          } else if (action === 'spin_vertical' && p.triggerAirSpin()) {
            // Dagger fallback: airborne hold stays agile Spin Vertical, never Slam
            this._performCombatMove('spin_vertical');
          }
        }
      } else {
        if (this._meleeHoldTime < 0.2 && !p.isBlocking) {
          this._scaleX = 1.07;
          this._scaleY = 0.92;
        }
        if (this._meleeHoldTime >= 0.2 && !p.isBlocking && !p.isDashing) {
          this._meleeBufferTimer = 0;
          p.setBlocking(true);
          this.sound.play('menu_select');
        }
      }
    }

    if (this._meleePressHeld && (this.input.isJustReleased('melee') || !this.input.isHeld('melee'))) {
      const wasBlocking = p.isBlocking;
      const holdElapsed = this._meleeHoldTime;
      this._meleePressHeld = false;
      this._meleeHoldTime = 0;
      p.setBlocking(false);

      if (!wasBlocking && !inAirSlam && holdElapsed < 0.2) {
        if (!p.onGround) {
          // Jump-Hit Tap -> Spin Vertical!
          const action = resolveCombatAction({
            onGround: false,
            isHold: false,
            isRightClick: false,
            hasGun,
            comboStep: 1,
            weaponId: meleeId,
          });
          if (action === 'spin_vertical' && p.triggerAirSpin()) {
            this._meleeBufferTimer = 0;
            this._performCombatMove('spin_vertical');
          }
        } else {
          if (p.meleeAttack()) {
            this._meleeBufferTimer = 0;
            const action = resolveCombatAction({
              onGround: true,
              isHold: false,
              isRightClick: false,
              hasGun,
              comboStep: p.meleeCombo,
              weaponId: meleeId,
            });
            if (action !== 'ranged_fire' && action !== 'none') {
              this._performCombatMove(action);
            }
          } else {
            this._meleeBufferTimer = 0.22;
          }
        }
      }
    } else if (
      !this._meleePressHeld &&
      !p.isBlocking &&
      !inAirSlam &&
      p.onGround &&
      this._meleeBufferTimer > 0
    ) {
      if (p.meleeAttack()) {
        this._meleeBufferTimer = 0;
        const action = resolveCombatAction({
          onGround: true,
          isHold: false,
          isRightClick: false,
          hasGun,
          comboStep: p.meleeCombo,
          weaponId: meleeId,
        });
        if (action !== 'ranged_fire' && action !== 'none') {
          this._performCombatMove(action);
        }
      }
    }

    // ── RIGHT-CLICK / [K] WEAPON-SPECIFIC SKILLS ────────────
    if (this.input.isJustPressed('ranged') && !inAirSlam && !triggeredDualComboThisFrame) {
      if (!hasGun && canWeaponDualCombo(meleeId)) {
        // Open Dual X-Combo chord window; if LMB is already held/pressed, fire immediately!
        if (this.input.isHeld('melee') || this._meleePressHeld) {
          tryTriggerDualCrossCombo();
        } else {
          this._dualChordWindow = 0.34;
          this.sound.play('menu_select');
        }
      } else if (!hasGun && canWeaponGroundSlam(meleeId)) {
        if (p.onGround) {
          this._rangedPressHeld = true;
          this._rangedHoldTime = 0;
          this._activeCombatMove = 'ground_slam_charge';
          this._meleeAnimDuration = 0.24;
          this._meleeAnimTimer = 0.24;
          this.sound.play('menu_select');
        }
      } else {
        const rightAction = resolveCombatAction({
          onGround: p.onGround,
          isHold: false,
          isRightClick: true,
          hasGun,
          comboStep: 1,
          weaponId: meleeId,
        });

        if (rightAction === 'ranged_fire') {
          const rRes = p.rangedAttack();
          if (rRes.fired) {
            this._performRanged();
          } else if (rRes.reason === 'no_energy') {
            this.onToast?.('Energy habis! Tekan [R] pakai Ammo Pack atau serang Dagger!');
          }
        } else if (rightAction === 'dash_thrust') {
          const dRes = p.triggerDashThrust();
          if (dRes.ok) {
            this._performCombatMove('dash_thrust');
          } else if (dRes.reason === 'no_energy') {
            this.onToast?.(`Energy tidak cukup untuk Dash Thrust (${dRes.cost} EN)!`);
          }
        }
      }
    }

    // Hold Right-Click / [K] Ground Slam charge tracker for Axe & Hammer
    if (this._rangedPressHeld) {
      if (!hasGun && canWeaponGroundSlam(meleeId) && p.onGround && this.input.isHeld('ranged') && !inAirSlam) {
        this._rangedHoldTime += dt;
        this._activeCombatMove = 'ground_slam_charge';
        this._meleeAnimDuration = 0.24;
        this._meleeAnimTimer = Math.max(0.02, 0.24 - Math.min(0.22, this._rangedHoldTime));
        p.vx *= 0.84;

        if (this._rangedHoldTime >= 0.22) {
          this._rangedPressHeld = false;
          this._rangedHoldTime = 0;
          const gRes = p.triggerGroundSlam();
          if (gRes.ok) {
            this._triggerGroundSlamImpact();
          } else {
            this._activeCombatMove = null;
            this._meleeAnimTimer = 0;
            if (gRes.reason === 'no_energy') {
              this.onToast?.(`Energy tidak cukup untuk Ground Slam (${gRes.cost} EN)!`);
            }
          }
        }
      } else {
        this._rangedPressHeld = false;
        this._rangedHoldTime = 0;
        if (this._activeCombatMove === 'ground_slam_charge') {
          this._activeCombatMove = null;
          this._meleeAnimTimer = 0;
        }
      }
    }

    if (this.input.isJustPressed('interact')) {
      this._handleInteract();
    }
  }

  private _startAirSlam() {
    this._airSlamState = 'windup';
    this._airSlamTimer = 0.11;
    this._airSlamHitIds.clear();
    this._activeCombatMove = 'air_slam_windup';
    this._meleeAnimDuration = 0.11;
    this._meleeAnimTimer = 0.11;
    this._pendingComboStrikes = [];
    this.player.vy = -20;
    this._scaleX = 0.84;
    this._scaleY = 1.22;
    this.sound.play('menu_select');
  }

  private _checkAirSlamDiveHits() {
    const p = this.player;
    const weaponId = p.state.meleeWeapon.defId;
    const profile = getWeaponMoveProfile(weaponId);
    const dmgType = WEAPONS[weaponId]?.damageType ?? 'impact';
    const diveDmg = Math.max(1, Math.round(p.getMeleeDamage() * 0.65));

    const hx = p.x - 10;
    const hy = p.y + 4;
    const hw = p.width + 20;
    const hh = p.height + 12;

    for (const enemy of this.enemies) {
      if (!enemy.alive || this._airSlamHitIds.has(enemy.id)) continue;
      if (_aabb(hx, hy, hw, hh, enemy.x, enemy.y, enemy.width, enemy.height)) {
        this._airSlamHitIds.add(enemy.id);
        const res = damageEnemyDetailed(enemy, diveDmg, true, dmgType);
        enemy.vy = Math.max(enemy.vy, 180);
        p.onMeleeHit();
        const cx = enemy.x + enemy.width / 2;
        const cy = enemy.y + enemy.height / 2;
        this.particles.emit('hit_spark', cx, cy);
        this._spawnHitEffect(cx, cy, profile.trailColor, 14, 'impact');
        this._spawnFloatingText(cx, enemy.y - 4, `${diveDmg}`, '#FACC15');
        if (res.killed) this._onEnemyKilled(enemy);
        else this.sound.play('enemy_hit');
      }
    }
  }

  private _triggerAirSlamImpact() {
    const p = this.player;
    const weaponId = p.state.meleeWeapon.defId;
    const weaponLv = getWeaponLevel(p.state.meleeWeapon);
    const profile = getWeaponMoveProfile(weaponId);

    this._airSlamState = 'impact';
    this._airSlamTimer = 0.26;
    this._activeCombatMove = 'air_slam_impact';
    this._meleeAnimDuration = 0.26;
    this._meleeAnimTimer = 0.26;
    this._meleeAnimIsPogo = false;
    this._scaleX = 1.32;
    this._scaleY = 0.72;

    const color = weaponLv >= 3 ? '#FACC15' : weaponLv === 2 ? '#00F0FF' : profile.trailColor;
    const slamRangeW = Math.round(46 * Math.max(0.75, profile.reachScale));

    this._spawnFloatingText(p.x + 7, p.y - 12, 'SLAM!', '#FACC15', true);
    this._executeMeleeStrike({
      delay: 0,
      rangeW: slamRangeW,
      rangeH: 38,
      radius: Math.round(38 * Math.max(0.8, profile.reachScale)),
      damageRatio: 1.58,
      shape: 'slam_impact',
      color,
      comboStep: 3,
      isPogo: false,
      bidirectional: true,
      armorBreak: true,
      knockbackX: 185,
      liftVy: -165,
      shake: 4.6,
      sound: 'hammer_slam',
    });

    this.particles.emit('mana_dust', p.x + p.width / 2 - 12, p.y + p.height, -Math.PI * 0.75);
    this.particles.emit('mana_dust', p.x + p.width / 2 + 12, p.y + p.height, -Math.PI * 0.25);

    // Hammer bonus: twin seismic floor shockwaves on Aerial Slam!
    if (weaponId === 'hammer') {
      const dmgWave = Math.round(p.getMeleeDamage() * 0.6);
      const floorY = p.y + p.height - 6;
      this.projectiles.push(
        createProjectile('player', p.x - 4, floorY, Math.PI, 220, dmgWave, {
          color: '#A855F7',
          trailColor: '#00F0FF',
          life: 0.7,
          size: 5,
        }),
        createProjectile('player', p.x + p.width + 4, floorY, 0, 220, dmgWave, {
          color: '#A855F7',
          trailColor: '#00F0FF',
          life: 0.7,
          size: 5,
        })
      );
    }
  }

  /** Hold Right-Click / [K] Ground Slam Impact for Axe & Hammer */
  private _triggerGroundSlamImpact() {
    const p = this.player;
    const weaponId = p.state.meleeWeapon.defId;
    const weaponLv = getWeaponLevel(p.state.meleeWeapon);
    const profile = getWeaponMoveProfile(weaponId);

    this._activeCombatMove = 'ground_slam_impact';
    this._meleeAnimDuration = 0.36;
    this._meleeAnimTimer = 0.36;
    this._meleeAnimIsPogo = false;
    this._pendingComboStrikes = [];
    this._scaleX = 1.34;
    this._scaleY = 0.72;

    const color = weaponLv >= 3 ? '#FACC15' : weaponLv === 2 ? '#00F0FF' : profile.trailColor;
    const slamRangeW = Math.round(52 * Math.max(0.95, profile.reachScale));

    this._spawnFloatingText(p.x + 7, p.y - 14, 'GROUND SLAM!', '#FACC15', true);
    this._executeMeleeStrike({
      delay: 0,
      rangeW: slamRangeW,
      rangeH: 42,
      radius: Math.round(44 * Math.max(0.95, profile.reachScale)),
      damageRatio: 1.72,
      shape: 'slam_impact',
      color,
      comboStep: 3,
      isPogo: false,
      bidirectional: true,
      armorBreak: true,
      knockbackX: 205,
      liftVy: -180,
      shake: 5.2,
      sound: 'hammer_slam',
    });

    this.particles.emit('mana_dust', p.x + p.width / 2 - 14, p.y + p.height, -Math.PI * 0.75);
    this.particles.emit('mana_dust', p.x + p.width / 2 + 14, p.y + p.height, -Math.PI * 0.25);

    if (weaponId === 'hammer') {
      const dmgWave = Math.round(p.getMeleeDamage() * 0.72);
      const floorY = p.y + p.height - 6;
      this.projectiles.push(
        createProjectile('player', p.x - 4, floorY, Math.PI, 240, dmgWave, {
          color: '#A855F7',
          trailColor: '#00F0FF',
          life: 0.78,
          size: 5,
        }),
        createProjectile('player', p.x + p.width + 4, floorY, 0, 240, dmgWave, {
          color: '#A855F7',
          trailColor: '#00F0FF',
          life: 0.78,
          size: 5,
        })
      );
    }
  }

  /**
   * Unified conditional Stickman Combat Moveset across ALL melee weapons:
   * - standard_slash (Hit 1)
   * - spin_horizontal (Hit 2)
   * - mini_thrust (Hit 3)
   * - spin_vertical (Jump-Hit Tap ONLY)
   * - dash_thrust (Right-Click / [K] in Melee Mode)
   */
  private _performCombatMove(move: CombatMoveType) {
    const p = this.player;
    const weaponId = p.state.meleeWeapon.defId;
    const weaponLv = getWeaponLevel(p.state.meleeWeapon);
    const profile = getWeaponMoveProfile(weaponId);
    const dir = p.facingRight ? 1 : -1;

    this._pendingComboStrikes = [];
    this._activeCombatMove = move;
    this._meleeAnimIsPogo = move === 'spin_vertical';
    this._iaidoWindupTimer = 0;

    if (weaponLv >= 2) {
      this.particles.emit('hit_spark', p.x + p.width / 2 + dir * 9, p.y + 12);
    }

    const color = p.lastAttackWasCounter
      ? '#FACC15'
      : weaponLv >= 3
        ? '#FFFFFF'
        : weaponLv === 2
          ? '#00F0FF'
          : profile.trailColor;

    if (p.lastAttackWasCounter) {
      this._spawnFloatingText(p.x + 7, p.y - 12, 'COUNTER!', '#FACC15');
    }

    switch (move) {
      case 'standard_slash': {
        // Hit 1: Crisp Stickman Standard Slash (Dagger stays ultra-short ~17px)
        const dur = Math.max(0.18, 0.24 * profile.speedScale);
        this._meleeAnimDuration = dur;
        this._meleeAnimTimer = dur;
        p.vx += dir * (weaponId === 'dagger' ? 35 : 62);
        this._executeMeleeStrike({
          delay: 0,
          rangeW: Math.round(30 * profile.reachScale),
          rangeH: 28,
          radius: Math.round(25 * profile.reachScale),
          damageRatio: 1.0,
          shape: weaponId === 'needle' ? 'silk_lash' : 'crescent',
          color,
          comboStep: 1,
          isPogo: false,
          bidirectional: false,
          armorBreak: profile.heavy,
          knockbackX: profile.heavy ? 120 : 68,
          shake: profile.heavy ? 1.8 : 0,
          sound: profile.heavy ? 'axe_hit' : 'sword_slash',
        });
        break;
      }

      case 'spin_horizontal': {
        // Hit 2: Dynamic 360° Waist Spin Horizontal (front + back coverage!)
        const dur = Math.max(0.24, 0.34 * profile.speedScale);
        this._meleeAnimDuration = dur;
        this._meleeAnimTimer = dur;
        this._executeMeleeStrike({
          delay: 0,
          rangeW: Math.round(31 * profile.reachScale),
          rangeH: 26,
          radius: Math.round(28 * profile.reachScale),
          damageRatio: 1.08,
          shape: 'spin_horizontal',
          color,
          comboStep: 2,
          isPogo: false,
          bidirectional: true,
          armorBreak: profile.heavy,
          lungeVx: weaponId === 'dagger' ? 55 : 105,
          knockbackX: profile.heavy ? 130 : 82,
          shake: profile.heavy ? 2.2 : 1.0,
          sound: 'combo_spin',
        });
        break;
      }

      case 'mini_thrust': {
        // Hit 3: Coiled Step-In Mini Thrust Finisher
        const dur = Math.max(0.22, 0.3 * profile.speedScale);
        this._meleeAnimDuration = dur;
        this._meleeAnimTimer = dur;
        this._executeMeleeStrike({
          delay: 0,
          rangeW: Math.round(37 * profile.reachScale),
          rangeH: 24,
          radius: Math.round(29 * profile.reachScale),
          damageRatio: 1.18,
          shape: weaponId === 'needle' ? 'needle_thread' : 'thrust',
          color: weaponLv >= 2 ? '#FACC15' : color,
          comboStep: 3,
          isPogo: false,
          bidirectional: false,
          armorBreak: true,
          lungeVx: weaponId === 'dagger' ? 95 : 165,
          knockbackX: 138,
          shake: 2.4,
          sound: 'spear_thrust',
        });
        break;
      }

      case 'spin_vertical': {
        // Jump-Hit Tap ONLY: Acrobatic 360° Vertical Somersault Blade Wheel (+ Pogo Bounce!)
        const dur = Math.max(0.24, 0.32 * profile.speedScale);
        this._meleeAnimDuration = dur;
        this._meleeAnimTimer = dur;
        p.vy = Math.min(p.vy, -105);
        this._executeMeleeStrike({
          delay: 0,
          rangeW: Math.round(29 * profile.reachScale),
          rangeH: Math.round(36 * Math.max(0.75, profile.reachScale)),
          radius: Math.round(26 * Math.max(0.72, profile.reachScale)),
          damageRatio: 1.12,
          shape: 'vertical_spin',
          color,
          comboStep: 2,
          isPogo: true,
          bidirectional: true,
          armorBreak: profile.heavy,
          knockbackX: 90,
          shake: 1.5,
          sound: 'combo_spin',
        });
        break;
      }

      case 'dash_thrust': {
        // Right-Click / [K] in Melee Mode: High-Speed Horizontal Piercing Bullet Lunge!
        const dur = 0.28;
        this._meleeAnimDuration = dur;
        this._meleeAnimTimer = dur;
        p.vy = Math.min(0, p.vy) * 0.2;
        this._scaleX = 1.28;
        this._scaleY = 0.8;
        this._spawnFloatingText(p.x + 7, p.y - 11, 'DASH THRUST!', color, true);
        this.particles.emit('dash_afterimage', p.x + p.width / 2, p.y + p.height / 2);
        this._executeMeleeStrike({
          delay: 0,
          rangeW: Math.round(50 * profile.reachScale),
          rangeH: 26,
          radius: Math.round(38 * profile.reachScale),
          damageRatio: 1.42,
          shape: 'dash_thrust',
          color,
          comboStep: 3,
          isPogo: false,
          bidirectional: false,
          armorBreak: true,
          lungeVx: weaponId === 'dagger' ? 245 : 365,
          knockbackX: 165,
          shake: 3.0,
          sound: 'dash',
        });
        break;
      }

      case 'dual_cross_combo': {
        // Dual Sword Exclusive RMB + LMB Extra Combo: Twin Intersecting X-Scissor Cuts (2x Dual Damage!)
        const dur = 0.34;
        this._meleeAnimDuration = dur;
        this._meleeAnimTimer = dur;
        this._scaleX = 1.24;
        this._scaleY = 0.82;
        this._spawnFloatingText(p.x + 7, p.y - 14, 'DUAL X-COMBO!', '#00F0FF', true);
        this.particles.emit('dash_afterimage', p.x + p.width / 2, p.y + p.height / 2);

        // Twin Blade Strike 1 (Main Cyan Sword)
        this._executeMeleeStrike({
          delay: 0,
          rangeW: 40,
          rangeH: 32,
          radius: 30,
          damageRatio: 1.05,
          shape: 'x_cut',
          color: '#00F0FF',
          comboStep: 3,
          isPogo: false,
          bidirectional: false,
          armorBreak: true,
          lungeVx: 215,
          knockbackX: 95,
          shake: 2.4,
          sound: 'dual_slash',
        });

        // Twin Blade Strike 2 (Off-hand Crimson Sword — 2x Total Dual Damage!)
        this._pendingComboStrikes.push({
          delay: 0.07,
          rangeW: 42,
          rangeH: 32,
          radius: 32,
          damageRatio: 1.05,
          shape: 'x_cut',
          color: '#F43F5E',
          comboStep: 3,
          isPogo: false,
          bidirectional: false,
          armorBreak: true,
          knockbackX: 155,
          shake: 2.8,
          sound: 'dual_slash',
        });
        break;
      }

      default:
        break;
    }
  }

  private _executeMeleeStrike(strike: PendingComboStrike) {
    const p = this.player;
    const weaponId = p.state.meleeWeapon.defId;
    const dir = p.facingRight ? 1 : -1;

    if (strike.lungeVx !== undefined) {
      p.vx = dir * strike.lungeVx;
      if (strike.lungeVx >= 250) p.grantBriefIFrames(0.14);
    }
    if (strike.sound) {
      this.sound.play(strike.sound);
    }
    if (strike.shake) {
      this.triggerShake(strike.shake, 0.12);
    }

    const profile = getWeaponMoveProfile(weaponId);
    const activeMove = this._activeCombatMove;

    // Derive physical melee hitbox directly from the real weapon blade length & kinematic swing!
    const usePhysicalBladeBox =
      activeMove !== null &&
      activeMove !== 'air_slam_impact' &&
      strike.shape !== 'slam_impact';

    let hx: number;
    let hy: number;
    let boxW: number;
    let boxH: number;

    if (usePhysicalBladeBox && activeMove) {
      const sweep = computeWeaponSweepHitbox(
        activeMove,
        weaponId,
        p.facingRight,
        p.x + p.width / 2,
        p.y + p.height
      );
      hx = sweep.x;
      hy = sweep.y;
      boxW = sweep.w;
      boxH = sweep.h;
    } else {
      hx = strike.bidirectional
        ? p.x + p.width / 2 - strike.rangeW
        : strike.isPogo
          ? p.x - (strike.rangeW - p.width) / 2
          : p.facingRight
            ? p.x + p.width - 2
            : p.x - strike.rangeW + 2;
      boxW = strike.bidirectional ? strike.rangeW * 2 : strike.rangeW;
      hy =
        strike.shape === 'vertical_spin'
          ? p.y + p.height / 2 - strike.rangeH / 2
          : strike.isPogo
            ? p.y + p.height - 4
            : p.y + p.height - strike.rangeH;
      boxH = strike.rangeH;
    }

    // Track live moving blade segment hits across the full active swing frames (no double-hits)
    this._activeSwingHitIds.clear();
    this._activeSwingMeta =
      usePhysicalBladeBox && activeMove
        ? {
            move: activeMove,
            damageRatio: strike.damageRatio,
            armorBreak: strike.armorBreak,
            knockbackX: strike.knockbackX,
            color: strike.color,
            isPogo: strike.isPogo,
            bidirectional: strike.bidirectional,
            comboStep: strike.comboStep,
          }
        : null;

    const slashLife =
      strike.shape === 'spin_horizontal' ||
      strike.shape === 'vertical_spin' ||
      strike.shape === 'slam_impact'
        ? 0.24
        : strike.shape === 'dash_thrust'
          ? 0.22
          : 0.14;

    // Keep impact/air-break FX on slam, dash_thrust, and thrust; standard swings rely primarily
    // on the real blade-swept metallic ribbon attached directly to the live weapon edge!
    if (
      strike.shape === 'slam_impact' ||
      strike.shape === 'dash_thrust' ||
      strike.shape === 'thrust' ||
      strike.shape === 'needle_thread' ||
      strike.shape === 'spin_horizontal' ||
      strike.shape === 'vertical_spin' ||
      strike.shape === 'x_cut'
    ) {
      this._slashes.push({
        x:
          strike.bidirectional || strike.shape === 'vertical_spin'
            ? p.x + p.width / 2
            : strike.isPogo
              ? p.x + p.width / 2
              : p.x +
                p.width / 2 +
                dir * (strike.shape === 'thrust' || strike.shape === 'dash_thrust' ? 10 : 6),
        y:
          strike.shape === 'slam_impact'
            ? p.y + p.height - 2
            : strike.shape === 'vertical_spin'
              ? p.y + p.height * 0.5
              : strike.isPogo
                ? p.y + p.height
                : p.y + p.height * 0.48,
        radius: Math.max(12, Math.round(profile.bladeLengthPx * 1.12)),
        isPogo: strike.isPogo && strike.shape !== 'vertical_spin',
        facingRight: p.facingRight,
        comboStep: strike.comboStep,
        shape: strike.shape,
        bidirectional: strike.bidirectional,
        color: strike.color,
        life: slashLife,
        maxLife: slashLife,
      });
    }

    this.particles.emit(
      'slash_trail',
      hx + boxW / 2,
      hy + boxH / 2,
      strike.isPogo ? Math.PI / 2 : p.facingRight ? 0 : Math.PI
    );

    let hitSomething = false;
    const weaponDef = WEAPONS[weaponId];
    const dmgType = weaponDef?.damageType ?? 'slash';
    const pogoMult = strike.isPogo ? p.getPogoDamageMultiplier() : 1;
    const baseDmg = p.getMeleeDamage() * strike.damageRatio * pogoMult;
    const critChance = p.getMeleeCritChance();
    const isCrit = Math.random() < critChance;
    const critMult = dmgType === 'slash' ? 1.5 : 1.35;
    const finalDmg = Math.max(1, Math.round(isCrit ? baseDmg * critMult : baseDmg));

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      if (_aabb(hx, hy, boxW, boxH, enemy.x, enemy.y, enemy.width, enemy.height)) {
        this._activeSwingHitIds.add(enemy.id);
        hitSomething = true;
        const dmgRes = damageEnemyDetailed(enemy, finalDmg, strike.armorBreak, dmgType);
        const pushDir =
          strike.bidirectional && enemy.x + enemy.width / 2 < p.x + p.width / 2 ? -1 : dir;
        enemy.vx = pushDir * strike.knockbackX;
        if (strike.liftVy !== undefined && enemy.behavior !== 'flying_ranged') {
          enemy.vy = Math.min(enemy.vy, strike.liftVy);
        }
        p.onMeleeHit();
        // Contact sparks directly on the side of the enemy facing the physical blade!
        const hitX =
          pushDir > 0 ? enemy.x + 2 : enemy.x + enemy.width - 2;
        const hitY = enemy.y + enemy.height * 0.48;
        this.particles.emit('hit_spark', hitX, hitY);
        this._spawnHitEffect(hitX, hitY, isCrit ? '#FACC15' : strike.color, isCrit ? 18 : 13, dmgType);
        this._spawnFloatingText(
          hitX,
          enemy.y - 4,
          isCrit ? `${finalDmg}!` : `${finalDmg}`,
          isCrit ? '#FACC15' : dmgType === 'pierce' ? '#FB7185' : '#FFFFFF',
          isCrit || strike.comboStep === 3
        );
        if (dmgRes.shieldBroken) {
          this._spawnFloatingText(hitX, enemy.y - 14, 'BREAK!', '#F97316', true);
          this.triggerShake(3.2, 0.14);
        } else if (dmgRes.piercedShield) {
          this._spawnFloatingText(hitX, enemy.y - 13, 'PIERCE', '#FDA4AF', false);
        }
        if (dmgRes.killed) this._onEnemyKilled(enemy);
        else this.sound.play('enemy_hit');
      }
    }

    if (this.boss && this.boss.hp > 0) {
      const b = this.boss;
      if (_aabb(hx, hy, boxW, boxH, b.x, b.y, b.width, b.height)) {
        this._activeSwingHitIds.add('__boss__');
        hitSomething = true;
        this._bossFlashTimer = 0.09;
        const killed = damageBoss(b, finalDmg);
        p.onMeleeHit();
        const bHitX = b.x + b.width / 2;
        const bHitY = b.y + b.height / 2;
        this.particles.emit('hit_spark', bHitX, bHitY);
        this._spawnHitEffect(bHitX, bHitY, isCrit ? '#FACC15' : strike.color, 20, dmgType);
        this._spawnFloatingText(
          bHitX,
          b.y - 8,
          b.shieldActive ? `SHIELD -${finalDmg}` : isCrit ? `${finalDmg} CRIT!` : `${finalDmg}`,
          b.shieldActive ? '#00F0FF' : '#FACC15',
          isCrit
        );
        if (killed) this._onBossDefeated();
        else this.sound.play('enemy_hit');
      }
    }

    if (strike.isPogo && this.level) {
      for (const sp of this.level.spikes) {
        if (_aabb(hx, hy, boxW, boxH, sp.x, sp.y, sp.w, sp.h)) {
          hitSomething = true;
          this.particles.emit('hit_spark', hx + boxW / 2, sp.y);
          this._spawnHitEffect(hx + boxW / 2, sp.y, '#00F0FF', 12, 'pierce');
          break;
        }
      }
    }

    if (this.level) {
      for (const cry of this.level.crystals) {
        if (!cry.exploded && _aabb(hx, hy, boxW, boxH, cry.x, cry.y, cry.w, cry.h)) {
          hitSomething = true;
          this._detonateCrystal(cry);
        }
      }
    }

    if (hitSomething) {
      this.triggerHitstop(profile.heavy ? 4 : isCrit || strike.comboStep === 3 ? 3 : 2);
      if (!strike.isPogo && strike.lungeVx === undefined && p.onGround) {
        p.vx -= dir * (profile.heavy ? 36 : 24);
      }
      if (strike.isPogo && p.pogoSlash()) {
        this._scaleX = 0.82;
        this._scaleY = 1.22;
        this.sound.play('pogo_bounce');
        this._spawnFloatingText(p.x + 7, p.y - 4, 'POGO!', '#00F0FF');
      }
    }
  }

  /**
   * Continuous physical blade-edge intersection during active swing frames so
   * enemies stepping into the actual moving steel segment take realistic blade contact!
   */
  private _checkLiveBladeContacts() {
    if (!this._activeSwingMeta || !this._activeCombatMove || this._meleeAnimTimer <= 0) {
      this._activeSwingMeta = null;
      return;
    }

    const prog = 1 - this._meleeAnimTimer / Math.max(0.05, this._meleeAnimDuration);
    if (prog < 0.18 || prog > 0.82) return;

    const p = this.player;
    const weaponId = p.state.meleeWeapon.defId;
    const pose = sampleStickmanCombatPose(this._activeSwingMeta.move, prog, weaponId);
    const seg = computeWeaponBladeSegment(
      pose,
      weaponId,
      p.facingRight,
      p.x + p.width / 2,
      p.y + p.height
    );

    const meta = this._activeSwingMeta;
    const dir = p.facingRight ? 1 : -1;
    const weaponDef = WEAPONS[weaponId];
    const dmgType = weaponDef?.damageType ?? 'slash';
    const baseDmg = Math.max(1, Math.round(p.getMeleeDamage() * meta.damageRatio));

    for (const enemy of this.enemies) {
      if (!enemy.alive || this._activeSwingHitIds.has(enemy.id)) continue;
      if (
        segmentIntersectsAABB(
          seg.baseX,
          seg.baseY,
          seg.tipX,
          seg.tipY,
          enemy.x - 2,
          enemy.y - 2,
          enemy.width + 4,
          enemy.height + 4
        )
      ) {
        this._activeSwingHitIds.add(enemy.id);
        const dmgRes = damageEnemyDetailed(enemy, baseDmg, meta.armorBreak, dmgType);
        const pushDir =
          meta.bidirectional && enemy.x + enemy.width / 2 < p.x + p.width / 2 ? -1 : dir;
        enemy.vx = pushDir * meta.knockbackX;
        p.onMeleeHit();
        const cx = (seg.baseX + seg.tipX) * 0.5;
        const cy = (seg.baseY + seg.tipY) * 0.5;
        this.particles.emit('hit_spark', cx, cy);
        this._spawnHitEffect(cx, cy, meta.color, 13, dmgType);
        this._spawnFloatingText(cx, enemy.y - 4, `${baseDmg}`, '#FFFFFF', false);
        this.triggerHitstop(2);
        if (meta.isPogo && p.pogoSlash()) {
          this.sound.play('pogo_bounce');
          this._spawnFloatingText(p.x + 7, p.y - 4, 'POGO!', '#00F0FF');
        }
        if (dmgRes.killed) this._onEnemyKilled(enemy);
        else this.sound.play('enemy_hit');
      }
    }
  }

  private _performRanged() {
    const p = this.player;
    if (!p.state.rangedWeapon) return;
    const weaponId = p.state.rangedWeapon.defId;
    this._rangedAnimTimer = 0.14;
    const muzzleX = p.facingRight ? p.x + p.width + 4 : p.x - 4;
    const muzzleY = p.y + 13;
    const angle = p.facingRight ? 0 : Math.PI;
    const dmg = p.getRangedDamage();

    this.particles.emit('muzzle_flash', muzzleX, muzzleY, angle);

    switch (weaponId) {
      case 'dual_pistol': {
        this.sound.play('dual_pistol_fire');
        if (!p.onGround && p.vy > 0) p.vy = 10;
        this.projectiles.push(...createDualPistolBurst(muzzleX, muzzleY, angle, dmg));
        break;
      }
      case 'shotgun': {
        this.sound.play('shotgun_blast');
        this.triggerShake(4, 0.16);
        this.projectiles.push(...createShotgunSpread(muzzleX, muzzleY, angle, dmg));
        break;
      }
      case 'bow': {
        this.sound.play('spear_thrust');
        this.triggerShake(1.4, 0.08);
        this.projectiles.push(createBowArrow(muzzleX, muzzleY - 1, angle, dmg));
        break;
      }
      case 'rifle': {
        this.sound.play('rifle_beam');
        this.triggerShake(2, 0.1);
        this.projectiles.push(createRifleBeam(muzzleX, muzzleY, angle, dmg));
        break;
      }
      case 'pistol':
      default: {
        this.sound.play('pistol_fire');
        this.projectiles.push(
          createProjectile('player', muzzleX, muzzleY, angle, 380, dmg, {
            kind: 'bullet',
            color: '#F97316',
            trailColor: '#FACC15',
            size: 3,
          })
        );
        break;
      }
    }
  }

  // ── Physics & Platform Collision ────────────────────────
  private _moveAndCollidePlayer(dt: number) {
    if (!this.level) return;
    const p = this.player;
    const platforms = this.level.platforms;

    p.x += p.vx * dt;
    p.onLeaveWall();

    for (const plat of platforms) {
      if (plat.oneWay) continue;
      if (_aabb(p.x, p.y, p.width, p.height, plat.x, plat.y, plat.w, plat.h)) {
        if (p.vx > 0) {
          p.x = plat.x - p.width;
          if (plat.kind === 'wall') p.onTouchWall(1);
        } else if (p.vx < 0) {
          p.x = plat.x + plat.w;
          if (plat.kind === 'wall') p.onTouchWall(-1);
        }
        p.vx = 0;
      }
    }

    // Closed Quick-Decrypt Gate blocks passage until unlocked
    for (const item of this.interactables) {
      if (item.data.kind === 'gate' && item.data.gateType === 'quick_decrypt' && !item.data.isOpen) {
        if (_aabb(p.x, p.y, p.width, p.height, item.x, item.y, item.width, item.height)) {
          if (p.vx > 0) p.x = item.x - p.width;
          else if (p.vx < 0) p.x = item.x + item.width;
          p.vx = 0;
        }
      }
    }

    // Lock player inside Boss Arena during active Boss fight
    if (this.boss && this.boss.hp > 0 && this.level.bossSpawn) {
      if (p.x < this.level.bossSpawn.arenaMinX) {
        p.x = this.level.bossSpawn.arenaMinX;
        p.vx = 0;
      }
    }

    const prevBottom = p.y + p.height;
    const wasOnGround = p.onGround;
    p.y += p.vy * dt;
    let landed = false;

    for (const plat of platforms) {
      if (plat.oneWay) {
        if (
          this._dropThroughTimer <= 0 &&
          p.vy >= 0 &&
          prevBottom <= plat.y + 5 &&
          _aabb(p.x, p.y, p.width, p.height, plat.x, plat.y, plat.w, plat.h)
        ) {
          p.y = plat.y - p.height;
          p.vy = 0;
          landed = true;
        }
        continue;
      }

      if (_aabb(p.x, p.y, p.width, p.height, plat.x, plat.y, plat.w, plat.h)) {
        if (p.vy > 0) {
          p.y = plat.y - p.height;
          p.vy = 0;
          landed = true;
        } else if (p.vy < 0) {
          p.y = plat.y + plat.h;
          p.vy = 0;
        }
      }
    }

    // Moving Platforms (one-way top riding + inherits platform motion)
    for (const mp of this.level.movingPlatforms) {
      if (
        this._dropThroughTimer <= 0 &&
        p.vy >= 0 &&
        prevBottom <= mp.y + 8 &&
        _aabb(p.x, p.y, p.width, p.height, mp.x, mp.y, mp.w, mp.h)
      ) {
        p.y = mp.y - p.height;
        p.vy = 0;
        p.x += mp.vx * dt;
        landed = true;
      }
    }

    // Crumbling Platforms (shake -> collapse on step)
    for (const cp of this.level.crumblingPlatforms) {
      if (cp.state === 'broken') continue;
      if (
        this._dropThroughTimer <= 0 &&
        p.vy >= 0 &&
        prevBottom <= cp.y + 6 &&
        _aabb(p.x, p.y, p.width, p.height, cp.x, cp.y, cp.w, cp.h)
      ) {
        p.y = cp.y - p.height;
        p.vy = 0;
        landed = true;
        if (cp.state === 'solid') {
          cp.state = 'shaking';
          cp.timer = 0.65;
        }
      }
    }

    // Active Laser Hazards
    if (this._laserCooldown <= 0 && this._manaShieldTimer <= 0 && !p.isInvincible) {
      for (const lz of this.level.lasers) {
        const phase = (this._animTime + lz.offset) % lz.period;
        if (phase < lz.activeWindow && _aabb(p.x, p.y, p.width, p.height, lz.x, lz.y, lz.w, lz.h)) {
          this._laserCooldown = 0.7;
          p.vy = -180;
          this._damagePlayer(lz.damage);
          break;
        }
      }
    }

    if (landed) {
      if (this._airSlamState === 'dive' || this._airSlamState === 'windup') {
        p.onLand();
        this._triggerAirSlamImpact();
      } else if (!wasOnGround) {
        p.onLand();
        this._scaleX = 1.22;
        this._scaleY = 0.8;
        this.particles.emit('mana_dust', p.x + p.width / 2, p.y + p.height, -Math.PI / 2);
      } else {
        p.onGround = true;
      }
    } else if (wasOnGround) {
      p.onLeaveGround();
    }

    // Mana Uplift Bounce Pads
    if (this._bounceCooldown <= 0) {
      for (const pad of this.level.bouncePads) {
        if (_aabb(p.x, p.y, p.width, p.height, pad.x, pad.y, pad.w, pad.h)) {
          p.vy = pad.boostVy;
          p.onGround = false;
          this._bounceCooldown = 0.25;
          this._scaleX = 0.72;
          this._scaleY = 1.32;
          this.sound.play('double_jump');
          this.particles.emit('pylon_repair', pad.x + pad.w / 2, pad.y);
          this._spawnFloatingText(pad.x + pad.w / 2, pad.y - 8, 'UPLIFT!', '#00F0FF');
          break;
        }
      }
    }

    if (this._spikeIFrame <= 0 && this._manaShieldTimer <= 0) {
      for (const sp of this.level.spikes) {
        if (_aabb(p.x, p.y, p.width, p.height, sp.x, sp.y, sp.w, sp.h)) {
          this._spikeIFrame = 0.8;
          p.vy = -210;
          this._damagePlayer(sp.damage);
          break;
        }
      }
    }

    if (p.y > this.level.worldHeight + 40) {
      p.x = this.level.playerSpawn.x;
      p.y = this.level.playerSpawn.y;
      p.vy = 0;
      this._damagePlayer(15);
    }
  }

  private _damagePlayer(amount: number) {
    if (this._manaShieldTimer > 0) return;
    const p = this.player;
    const res = p.resolveIncomingHit(amount);
    if (res.outcome === 'ignored') return;

    if (res.outcome === 'parry') {
      this._parryFlashTimer = 0.26;
      this._screenFlashColor = 'rgba(250, 204, 21, 0.28)';
      this._screenFlashTimer = 0.18;
      this._scaleX = 1.15;
      this._scaleY = 0.9;
      this.sound.play('parry_flash');
      this.triggerHitstop(5);
      this.triggerShake(3.5, 0.14);
      const px = p.x + (p.facingRight ? 16 : -2);
      const py = p.y + 12;
      this.particles.emit('hit_spark', px, py);
      this._spawnHitEffect(px, py, '#FACC15', 22, 'parry');
      this._spawnFloatingText(p.x + 7, p.y - 10, 'PARRY! +22 EN', '#FACC15', true);
      for (const e of this.enemies) {
        if (!e.alive) continue;
        if (Math.hypot(e.x - p.x, e.y - p.y) < 52) {
          e.vx = (e.x >= p.x ? 1 : -1) * 195;
          e.vy = -90;
        }
      }
      return;
    }

    if (res.outcome === 'blocked') {
      this._scaleX = 0.88;
      this._scaleY = 1.1;
      this.sound.play('block_clang');
      this.triggerShake(1.8, 0.08);
      const bx = p.x + (p.facingRight ? 15 : -1);
      const by = p.y + 12;
      this.particles.emit('hit_spark', bx, by);
      this._spawnHitEffect(bx, by, '#00F0FF', 15, 'impact');

      // Ironbell Bastion (vanguard) passive: Block shockwave damages & knocks back nearby foes
      if (p.state.armorId === 'vanguard') {
        this._spawnFloatingText(p.x + 7, p.y - 14, 'BELL SHOCKWAVE!', '#FACC15', true);
        for (const e of this.enemies) {
          if (!e.alive) continue;
          if (Math.hypot(e.x - p.x, e.y - p.y) < 68) {
            const shock = damageEnemyDetailed(e, 14, true, 'impact');
            e.vx = (e.x >= p.x ? 1 : -1) * 175;
            e.vy = -75;
            this._spawnHitEffect(e.x + e.width / 2, e.y + e.height / 2, '#FACC15', 14, 'impact');
            if (shock.killed) this._onEnemyKilled(e);
          }
        }
      } else {
        this._spawnFloatingText(
          p.x + 7,
          p.y - 8,
          res.finalDamage > 0 ? `GUARD -${res.finalDamage}` : 'BLOCKED!',
          '#00F0FF'
        );
      }
      if (p.state.hp <= 0) {
        this.sound.play('game_over');
        this.onGameOver?.('Slayer gugur di medan tempur.');
      }
      return;
    }

    this._screenFlashColor = 'rgba(239, 68, 68, 0.30)';
    this._screenFlashTimer = 0.2;
    this.sound.play('player_hit');
    this.triggerShake(4, 0.18);
    if (p.state.armorId === 'vanguard') {
      p.vx *= 0.5;
    }
    this._spawnFloatingText(p.x + 7, p.y - 6, `-${res.finalDamage}`, '#EF4444', true);
    if (p.state.hp <= 0) {
      this.sound.play('game_over');
      this.onGameOver?.('Slayer gugur di medan tempur.');
    }
  }

  // ── Enemies, Waves & Turrets ────────────────────────────
  private _queueWave(wave: WaveConfig) {
    let offset = 0;
    for (const group of wave.enemies) {
      for (let i = 0; i < group.count; i++) {
        this._pendingSpawns.push({ enemyId: group.id, delay: offset });
        offset += wave.spawnDelay;
      }
    }
  }

  private _processPendingSpawns(dt: number) {
    if (!this.level || this._pendingSpawns.length === 0) return;
    const portals = this.level.spawnPortals;
    if (portals.length === 0) return;

    for (let i = this._pendingSpawns.length - 1; i >= 0; i--) {
      this._pendingSpawns[i].delay -= dt;
      if (this._pendingSpawns[i].delay <= 0) {
        const item = this._pendingSpawns.splice(i, 1)[0];
        const portal = portals[Math.floor(Math.random() * portals.length)];
        const isFlying = item.enemyId === 'rift_drone' || item.enemyId === 'mana_wisp';
        const enemy = createEnemy(item.enemyId, portal.x, isFlying ? portal.y - 70 : portal.y, {
          targetingPylon: this.mode.state.mode === 'defense',
        });
        this.enemies.push(enemy);
        this.particles.emit('mana_dust', portal.x, portal.y);
      }
    }
  }

  private _updateEnemies(dt: number) {
    if (!this.level) return;
    const p = this.player;
    const pylonPos = this.level.pylonPos;

    const activeBarricades = this.interactables.filter(
      (i) => i.data.kind === 'barricade' && i.data.isDeployed
    );

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (!e.alive) {
        this.enemies.splice(i, 1);
        continue;
      }

      updateEnemyAI(e, dt, p.x + p.width / 2, p.y + p.height / 2, pylonPos?.x, pylonPos?.y);

      let speedFactor = 1;
      const def = ENEMIES[e.defId];
      if (def && !def.ignoresBarricade) {
        for (const bar of activeBarricades) {
          if (Math.abs(e.x - bar.x) < 26) {
            speedFactor = 0.25;
            break;
          }
        }
      }

      e.x += e.vx * speedFactor * dt;

      if (e.behavior !== 'flying_ranged' && e.behavior !== 'suicide') {
        e.vy += 800 * dt;
        e.y += e.vy * dt;
        for (const plat of this.level.platforms) {
          if (plat.oneWay && e.vy < 0) continue;
          if (
            plat.kind !== 'wall' &&
            _aabb(e.x, e.y, e.width, e.height, plat.x, plat.y, plat.w, plat.h)
          ) {
            if (e.vy > 0) {
              e.y = plat.y - e.height;
              e.vy = 0;
            }
          }
        }
      } else {
        e.y += e.vy * dt + Math.sin(this._animTime * 5 + i) * 8 * dt;
      }

      e.x = Math.max(4, Math.min(this.level.worldWidth - e.width - 4, e.x));

      if (e.behavior === 'flying_ranged' && e.attackTimer <= 0) {
        const tx = e.targetingPylon && pylonPos ? pylonPos.x : p.x + p.width / 2;
        const ty = e.targetingPylon && pylonPos ? pylonPos.y : p.y + p.height / 2;
        const angle = Math.atan2(ty - (e.y + 6), tx - (e.x + 6));
        this.projectiles.push(createEnemyOrb(e.x + 6, e.y + 6, angle, e.damage));
        e.attackTimer = 2.4;
      }

      if (_aabb(e.x, e.y, e.width, e.height, p.x, p.y, p.width, p.height)) {
        if (!p.isInvincible && this._manaShieldTimer <= 0) {
          this._damagePlayer(e.damage);
        }
      }

      if (
        this.mode.state.mode === 'defense' &&
        pylonPos &&
        Math.abs(e.x + e.width / 2 - pylonPos.x) < 22 &&
        Math.abs(e.y + e.height / 2 - pylonPos.y) < 32 &&
        this._pylonDamageCooldown <= 0
      ) {
        this.mode.damagePylon(e.damage);
        this.sound.play('pylon_hit');
        this._spawnFloatingText(pylonPos.x, pylonPos.y - 26, `-${e.damage} PYLON`, '#EF4444');
        this._pylonDamageCooldown = 0.85;
      }
    }
  }

  private _updateBoss(dt: number) {
    if (!this.level?.bossSpawn) return;
    const bs = this.level.bossSpawn;
    const p = this.player;

    if (!this._bossTriggered && p.x >= bs.triggerX) {
      this._bossTriggered = true;
      this.boss = createBoss(bs.id, bs.x, bs.y);
      this.sound.play('boss_roar');
      this.triggerShake(5, 0.4);
      this.onToast?.(`BOSS BANGKIT: ${this.boss.def.name} (${this.boss.def.title})!`);
    }

    if (!this.boss || this.boss.hp <= 0) return;

    const b = this.boss;
    updateBoss(
      b,
      dt,
      p.x + p.width / 2,
      p.y + p.height / 2,
      (attack) => this._executeBossAttack(b, attack),
      (enemyId, count) => {
        for (let i = 0; i < count; i++) {
          const sx = bs.arenaMinX + 80 + i * 280;
          this.enemies.push(createEnemy(enemyId, sx, 360, { targetingPylon: false }));
          this.particles.emit('mana_dust', sx, 360);
        }
      }
    );

    // Apply horizontal dash lunge velocity & keep inside arena
    b.x += b.vx * dt;
    b.vx *= Math.pow(0.05, dt);
    b.x = Math.max(bs.arenaMinX + 20, Math.min(this.level.worldWidth - b.width - 50, b.x));

    // Contact damage
    if (
      this._bossContactCooldown <= 0 &&
      !p.isInvincible &&
      this._manaShieldTimer <= 0 &&
      _aabb(b.x, b.y, b.width, b.height, p.x, p.y, p.width, p.height)
    ) {
      this._bossContactCooldown = 0.85;
      this._damagePlayer(b.def.contactDamage);
    }
  }

  private _executeBossAttack(b: BossInstance, attack: string) {
    const p = this.player;
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    const angle = Math.atan2(p.y + p.height / 2 - cy, p.x + p.width / 2 - cx);

    if (attack === 'dash_cleave' || attack === 'teleport_slash') {
      if (attack === 'teleport_slash') {
        b.x = Math.max(
          (this.level?.bossSpawn?.arenaMinX ?? 3650) + 30,
          p.x + (p.facingRight ? -75 : 55)
        );
        this.particles.emit('enemy_death', b.x + b.width / 2, cy);
      }
      b.vx = (p.x > b.x ? 1 : -1) * 320;
      this.sound.play('axe_hit');
    } else if (
      attack === 'slam_attack' ||
      attack === 'ground_pound' ||
      attack === 'piston_slam' ||
      attack === 'rift_shockwave'
    ) {
      this.triggerShake(4, 0.25);
      this.sound.play('boss_roar');
      const floorY = b.y + b.height - 6;
      this.projectiles.push(
        createProjectile('boss', cx - 10, floorY, Math.PI, 210, 16, {
          color: '#EF4444',
          trailColor: '#F97316',
          life: 2.5,
          size: 6,
        }),
        createProjectile('boss', cx + 10, floorY, 0, 210, 16, {
          color: '#EF4444',
          trailColor: '#F97316',
          life: 2.5,
          size: 6,
        })
      );
    } else if (attack === 'mana_rain') {
      for (let i = 0; i < 5; i++) {
        const rx = (this.level?.bossSpawn?.arenaMinX ?? 3650) + 80 + Math.random() * 880;
        this.projectiles.push(
          createProjectile('boss', rx, 110, Math.PI / 2, 165, 14, {
            color: '#A855F7',
            trailColor: '#00F0FF',
            life: 2.6,
            size: 5,
          })
        );
      }
    } else {
      // boulder_throw / mana_orb_barrage / flame_sweep / mana_beam_tracking
      const count = attack === 'mana_orb_barrage' ? 5 : 3;
      const spread = 0.55;
      for (let i = 0; i < count; i++) {
        const a = angle - spread / 2 + (spread / Math.max(1, count - 1)) * i;
        this.projectiles.push(
          createProjectile('boss', cx, cy, a, 165, 14, {
            color: '#A855F7',
            trailColor: '#00F0FF',
            life: 3.2,
            size: 5,
          })
        );
      }
    }
  }

  private _onBossDefeated() {
    if (!this.boss) return;
    const b = this.boss;
    this.sound.play('boss_roar');
    this.triggerShake(6, 0.45);
    this.particles.emit('explosion', b.x + b.width / 2, b.y + b.height / 2);
    this._kills += 5;

    const drops = b.def.drops;
    if (drops) {
      // Pick random weapon from dropPool (prioritizing unowned weapons first so every clear feels fresh!)
      let chosenWeaponId = drops.weaponId;
      let chosenTier = drops.weaponTier;
      let chosenLevel = 1;

      if (drops.dropPool && drops.dropPool.length > 0) {
        const ownedIds = new Set(this.player.state.weaponInventory.map((w) => w.defId));
        const unownedPool = drops.dropPool.filter((entry) => !ownedIds.has(entry.weaponId));
        const activePool = unownedPool.length > 0 ? unownedPool : drops.dropPool;
        const picked = activePool[Math.floor(Math.random() * activePool.length)];
        chosenWeaponId = picked.weaponId;
        chosenTier = picked.weaponTier;
        chosenLevel = picked.level ?? 1;
      }

      this._groundDrops.push({
        id: `drop_${this._dropIdCounter++}`,
        kind: 'boss_relic',
        x: b.x + b.width / 2 - 8,
        y: b.y + b.height - 20,
        vy: -140,
        label: 'BOSS RANDOM RELIC!',
        shards: drops.shards,
        ammoPacks: drops.ammoPacks,
        weaponId: chosenWeaponId,
        weaponTier: chosenTier,
        weaponLevel: chosenLevel,
        secondaryWeaponId: drops.secondaryWeaponId,
        secondaryWeaponTier: drops.secondaryWeaponTier,
        armorId: drops.armorId,
        life: 999,
      });
      this.onToast?.(`${b.def.name} KALAH! Ambil Random Boss Relic Drop lalu masuk Exit Gate!`);
    } else {
      this.player.state.shards += 150;
      this.onToast?.(`${b.def.name} DIKALAHKAN! +150 Shards! Masuk Exit Gate di kanan!`);
    }
  }

  private _updateStageMechanisms(dt: number) {
    if (!this.level) return;

    // Moving Platforms
    for (const mp of this.level.movingPlatforms) {
      const tx = mp.dir === 1 ? mp.endX : mp.startX;
      const ty = mp.dir === 1 ? mp.endY : mp.startY;
      const dx = tx - mp.x;
      const dy = ty - mp.y;
      const dist = Math.hypot(dx, dy);
      if (dist < mp.speed * dt + 1) {
        mp.x = tx;
        mp.y = ty;
        mp.vx = 0;
        mp.vy = 0;
        mp.dir = mp.dir === 1 ? -1 : 1;
      } else {
        mp.vx = (dx / dist) * mp.speed;
        mp.vy = (dy / dist) * mp.speed;
        mp.x += mp.vx * dt;
        mp.y += mp.vy * dt;
      }
    }

    // Crumbling Platforms
    for (const cp of this.level.crumblingPlatforms) {
      if (cp.state === 'shaking') {
        cp.timer -= dt;
        if (cp.timer <= 0) {
          cp.state = 'broken';
          cp.timer = 2.8;
          this.particles.emit('enemy_death', cp.x + cp.w / 2, cp.y + 4);
        }
      } else if (cp.state === 'broken') {
        cp.timer -= dt;
        if (cp.timer <= 0) {
          cp.state = 'solid';
          this.particles.emit('mana_dust', cp.x + cp.w / 2, cp.y);
        }
      }
    }
  }

  private _detonateCrystal(cry: BuiltLevel['crystals'][number]) {
    if (cry.exploded) return;
    cry.exploded = true;
    this.sound.play('shotgun_blast');
    this.triggerShake(5, 0.25);
    const cx = cry.x + cry.w / 2;
    const cy = cry.y + cry.h / 2;
    this.particles.emit('explosion', cx, cy);
    this._spawnFloatingText(cx, cy - 12, 'CRYSTAL BLAST!', '#A855F7');

    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (Math.hypot(e.x + e.width / 2 - cx, e.y + e.height / 2 - cy) < 110) {
        const killed = damageEnemy(e, 60, true);
        this._spawnFloatingText(e.x + e.width / 2, e.y - 6, '60!', '#FACC15');
        if (killed) this._onEnemyKilled(e);
      }
    }
  }

  private _updateGroundDrops(dt: number) {
    if (!this.level) return;
    const p = this.player;

    for (let i = this._groundDrops.length - 1; i >= 0; i--) {
      const d = this._groundDrops[i];
      d.life -= dt;
      if (d.life <= 0) {
        this._groundDrops.splice(i, 1);
        continue;
      }

      d.vy = Math.min(350, d.vy + 750 * dt);
      d.y += d.vy * dt;
      for (const plat of this.level.platforms) {
        if (plat.kind === 'wall') continue;
        if (_aabb(d.x, d.y, 14, 14, plat.x, plat.y, plat.w, plat.h) && d.vy > 0) {
          d.y = plat.y - 14;
          d.vy = 0;
        }
      }

      if (_aabb(p.x, p.y, p.width, p.height, d.x - 4, d.y - 4, 22, 22)) {
        if (d.kind === 'energy_orb') {
          p.state.energy = Math.min(p.state.maxEnergy, p.state.energy + (d.energyAmount ?? 20));
          this.sound.play('player_heal');
          this._spawnFloatingText(p.x + 7, p.y - 8, `+${d.energyAmount ?? 20} EN`, '#00F0FF');
        } else if (d.kind === 'ammo_pack') {
          p.state.ammoPacks = Math.min(p.state.maxAmmoPacks, p.state.ammoPacks + 1);
          this.sound.play('pylon_repair');
          this._spawnFloatingText(p.x + 7, p.y - 10, '+1 AMMO PACK', '#FACC15');
          this.saveGear();
        } else if (d.kind === 'boss_relic') {
          this.sound.play('chest_open');
          this.particles.emit('chest_open', d.x + 7, d.y + 7);
          const got: string[] = [];
          if (d.shards) {
            p.state.shards += d.shards;
            got.push(`+${d.shards} Shards`);
          }
          if (d.ammoPacks) {
            p.state.ammoPacks = Math.min(p.state.maxAmmoPacks, p.state.ammoPacks + d.ammoPacks);
            got.push(`+${d.ammoPacks} Ammo Pack`);
          }
          if (d.weaponId) {
            const inst: WeaponInstance = {
              defId: d.weaponId,
              tier: d.weaponTier ?? 'rare',
              level: d.weaponLevel ?? 1,
            };
            const res = p.addOrUpgradeWeapon(inst);
            p.equipWeapon(res.weapon);
            const name = WEAPONS[d.weaponId]?.name ?? d.weaponId;
            got.push(
              res.action === 'upgraded'
                ? `${name} UP Lv.${res.weapon.level}!`
                : `${name} (Lv.${res.weapon.level ?? 1})`
            );
          }
          if (d.secondaryWeaponId) {
            const inst2: WeaponInstance = {
              defId: d.secondaryWeaponId,
              tier: d.secondaryWeaponTier ?? 'rare',
              level: 1,
            };
            const res2 = p.addOrUpgradeWeapon(inst2);
            p.equipWeapon(res2.weapon);
            got.push(WEAPONS[d.secondaryWeaponId]?.name ?? d.secondaryWeaponId);
          }
          if (d.armorId) {
            if (!p.state.armorInventory.includes(d.armorId)) {
              p.state.armorInventory.push(d.armorId);
            }
            p.equipArmor(d.armorId);
            got.push(ARMORS[d.armorId]?.name ?? d.armorId);
          }
          this.saveGear();
          this.onToast?.(`BOSS RELIC: ${got.join(' · ')}`);
        }
        this._groundDrops.splice(i, 1);
      }
    }
  }

  public saveGear() {
    try {
      const gear = this.player.exportSavedGear();
      localStorage.setItem(this._gearStorageKey, JSON.stringify(gear));
      this.onGearChange?.(gear);
    } catch {
      // ignore quota errors
    }
  }

  private _loadSavedGear(): Partial<PlayerState> | null {
    try {
      const raw = localStorage.getItem(this._gearStorageKey);
      return raw ? (JSON.parse(raw) as Partial<PlayerState>) : null;
    } catch {
      return null;
    }
  }

  private _updateTurrets(dt: number) {
    for (let i = this._turrets.length - 1; i >= 0; i--) {
      const t = this._turrets[i];
      t.life -= dt;
      t.fireTimer -= dt;
      if (t.life <= 0) {
        this._turrets.splice(i, 1);
        continue;
      }
      if (t.fireTimer <= 0 && this.enemies.length > 0) {
        let nearest = this.enemies[0];
        let bestDist = Infinity;
        for (const e of this.enemies) {
          const d = Math.hypot(e.x - t.x, e.y - t.y);
          if (d < bestDist) {
            bestDist = d;
            nearest = e;
          }
        }
        const angle = Math.atan2(nearest.y + nearest.height / 2 - t.y, nearest.x - t.x);
        this.projectiles.push(
          createProjectile('player', t.x, t.y, angle, 320, 14, {
            color: '#00F0FF',
            trailColor: '#22C55E',
            size: 3,
          })
        );
        t.fireTimer = 0.55;
      }
    }
  }

  private _updateProjectiles(dt: number) {
    if (!this.level) return;

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      if (!updateProjectile(proj, dt)) {
        this.projectiles.splice(i, 1);
        continue;
      }

      if (Math.random() < 0.6) {
        this.particles.emit('mana_dust', proj.x, proj.y);
      }

      let hitWall = false;
      for (const plat of this.level.platforms) {
        if (plat.oneWay) continue;
        if (_aabb(proj.x, proj.y, proj.width, proj.height, plat.x, plat.y, plat.w, plat.h)) {
          hitWall = true;
          break;
        }
      }
      if (hitWall) {
        this.particles.emit('hit_spark', proj.x, proj.y);
        this.projectiles.splice(i, 1);
        continue;
      }

      if (proj.source === 'player') {
        const rDef = this.player.state.rangedWeapon
          ? WEAPONS[this.player.state.rangedWeapon.defId]
          : null;
        const rDmgType = rDef?.damageType ?? 'pierce';
        for (const e of this.enemies) {
          if (!e.alive || proj.hitTargets.has(e.id)) continue;
          if (_aabb(proj.x, proj.y, proj.width, proj.height, e.x, e.y, e.width, e.height)) {
            proj.hitTargets.add(e.id);
            const isCrit = Math.random() < this.player.getRangedCritChance();
            const rDmg = isCrit ? Math.round(proj.damage * 1.4) : proj.damage;
            const dmgRes = damageEnemyDetailed(e, rDmg, false, rDmgType);
            this.particles.emit('hit_spark', proj.x, proj.y);
            this._spawnHitEffect(proj.x, proj.y, isCrit ? '#FACC15' : proj.color, isCrit ? 15 : 10, rDmgType);
            this._spawnFloatingText(
              e.x + e.width / 2,
              e.y - 4,
              isCrit ? `${rDmg}!` : `${rDmg}`,
              isCrit ? '#FACC15' : '#FFFFFF',
              isCrit
            );
            if (dmgRes.shieldBroken) {
              this._spawnFloatingText(e.x + e.width / 2, e.y - 13, 'BREAK!', '#F97316', true);
            } else if (dmgRes.piercedShield) {
              this._spawnFloatingText(e.x + e.width / 2, e.y - 13, 'PIERCE', '#FDA4AF', false);
            }
            if (dmgRes.killed) this._onEnemyKilled(e);
            else this.sound.play('enemy_hit');

            if (!proj.piercing) {
              proj.alive = false;
              break;
            }
          }
        }
        if (proj.alive && this.boss && this.boss.hp > 0 && !proj.hitTargets.has('boss')) {
          const b = this.boss;
          if (_aabb(proj.x, proj.y, proj.width, proj.height, b.x, b.y, b.width, b.height)) {
            proj.hitTargets.add('boss');
            this._bossFlashTimer = 0.08;
            const killed = damageBoss(b, proj.damage);
            this.particles.emit('hit_spark', proj.x, proj.y);
            this._spawnFloatingText(b.x + b.width / 2, b.y - 8, `${proj.damage}`, '#FACC15');
            if (killed) this._onBossDefeated();
            else this.sound.play('enemy_hit');
            if (!proj.piercing) proj.alive = false;
          }
        }
        if (proj.alive) {
          for (const cry of this.level.crystals) {
            if (!cry.exploded && _aabb(proj.x, proj.y, proj.width, proj.height, cry.x, cry.y, cry.w, cry.h)) {
              this._detonateCrystal(cry);
              if (!proj.piercing) proj.alive = false;
              break;
            }
          }
        }
      } else {
        const p = this.player;
        if (_aabb(proj.x, proj.y, proj.width, proj.height, p.x, p.y, p.width, p.height)) {
          if (p.isParryWindow && this._manaShieldTimer <= 0) {
            // Perfect Parry reflects enemy projectiles back with 2x power!
            this._damagePlayer(proj.damage);
            proj.source = 'player';
            proj.vx = -proj.vx * 1.65;
            proj.vy = -proj.vy * 1.4;
            proj.damage = Math.round(proj.damage * 2);
            proj.color = '#FACC15';
            proj.trailColor = '#FFFFFF';
            proj.hitTargets.clear();
            proj.life = Math.max(proj.life, 1.5);
          } else {
            this._damagePlayer(proj.damage);
            proj.alive = false;
          }
        } else if (this.mode.state.mode === 'defense' && this.level.pylonPos) {
          const py = this.level.pylonPos;
          if (Math.abs(proj.x - py.x) < 14 && Math.abs(proj.y - py.y) < 24) {
            this.mode.damagePylon(proj.damage);
            this.sound.play('pylon_hit');
            proj.alive = false;
          }
        }
      }

      if (!proj.alive) this.projectiles.splice(i, 1);
    }
  }

  private _onEnemyKilled(enemy: EnemyInstance) {
    this._kills++;
    this.sound.play('enemy_die');
    this.particles.emit('enemy_death', enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
    this.player.onKill();
    const def = ENEMIES[enemy.defId];
    const baseShards = def?.shardDrop ?? 5;
    const mult = this.player.getShardMultiplier() * (this.player.isAdrenalineActive ? 2 : 1);
    const earned = Math.round(baseShards * mult);
    this.player.state.shards += earned;
    this._spawnFloatingText(enemy.x + enemy.width / 2, enemy.y - 10, `+${earned} SHARDS`, '#00F0FF');

    // Drop Energy / Reserve Ammo Packs from slain enemies
    const roll = Math.random();
    if (roll < 0.16) {
      this._groundDrops.push({
        id: `drop_${this._dropIdCounter++}`,
        kind: 'ammo_pack',
        x: enemy.x + enemy.width / 2 - 5,
        y: enemy.y,
        vy: -130,
        label: 'AMMO',
        ammoPacks: 1,
        life: 16,
      });
    } else if (roll < 0.45) {
      this._groundDrops.push({
        id: `drop_${this._dropIdCounter++}`,
        kind: 'energy_orb',
        x: enemy.x + enemy.width / 2 - 4,
        y: enemy.y,
        vy: -120,
        label: 'EN',
        energyAmount: 20,
        life: 12,
      });
    }
  }

  // ── Interactables ───────────────────────────────────────
  private _updateInteractables(dt: number) {
    const p = this.player;
    for (const item of this.interactables) {
      updateInteractable(item, dt);
      checkInteractRange(item, p.x, p.y, p.width, p.height, 14);
    }
  }

  private _handleInteract() {
    for (const item of this.interactables) {
      if (!item.inRange) continue;

      if (item.data.kind === 'chest' && !item.data.opened) {
        this.pauseForModal();
        this.onPuzzleTrigger?.({
          trigger: 'chest',
          questionsRequired: item.data.chest.questionsRequired,
          title: `ENCRYPTED ${item.data.chest.tier.toUpperCase()} CHEST`,
          interactableId: item.id,
        });
        return;
      }

      if (item.data.kind === 'generic' && item.data.subType === 'puzzle_shrine' && !item.used) {
        this.pauseForModal();
        this.onPuzzleTrigger?.({
          trigger: 'shrine',
          questionsRequired: 3,
          title: 'ANCIENT PUZZLE SHRINE (3 SOAL)',
          interactableId: item.id,
        });
        return;
      }

      if (item.data.kind === 'terminal' && item.data.cooldownTimer <= 0) {
        this.pauseForModal();
        this.onPuzzleTrigger?.({
          trigger: 'terminal',
          questionsRequired: 1,
          title:
            item.data.terminalType === 'emergency'
              ? 'EMERGENCY SHIELD TERMINAL'
              : 'PYLON REPAIR TERMINAL',
          interactableId: item.id,
        });
        return;
      }

      if (item.data.kind === 'barricade') {
        if (!item.data.isDeployed && item.data.cooldownTimer <= 0) {
          item.data.isDeployed = true;
          item.data.activeTimer = 15;
          this.sound.play('barricade_activate');
          this._spawnFloatingText(item.x + 10, item.y - 8, 'BARRICADE UP!', '#00F0FF');
          this.onToast?.('Barricade aktif 15 detik — memperlambat musuh darat!');
        }
        return;
      }

      if (item.data.kind === 'generic' && item.data.subType === 'runic_pillar') {
        if (this.boss && this.boss.shieldActive) {
          this.pauseForModal();
          this.onPuzzleTrigger?.({
            trigger: 'pillar',
            questionsRequired: 1,
            title: 'RUNIC PILLAR — SHATTER BOSS SHIELD',
            interactableId: item.id,
          });
        } else {
          this.onToast?.('Runic Pillar aktif saat Boss menyalakan Perisai Mana.');
        }
        return;
      }

      if (item.data.kind === 'gate' && item.data.gateType === 'quick_decrypt' && !item.data.isOpen) {
        this.pauseForModal();
        this.onPuzzleTrigger?.({
          trigger: 'gate',
          questionsRequired: 1,
          title: 'ENCRYPTED LOGIC BARRIER GATE',
          interactableId: item.id,
        });
        return;
      }

      if (item.data.kind === 'gate' && item.data.gateType === 'exit') {
        if (this.boss && this.boss.hp > 0) {
          this.onToast?.(`Kalahkan ${this.boss.def.name} terlebih dahulu!`);
          return;
        }
        this.mode.completeTraverse();
        return;
      }
    }
  }

  resolvePuzzle(interactableId: string, success: boolean) {
    const item = this.interactables.find((i) => i.id === interactableId);
    if (!item) return;

    if (!success) {
      this.sound.play('puzzle_wrong');
      if (item.data.kind === 'chest') {
        const penalty = Math.max(5, Math.round(this.player.state.maxHp * 0.1));
        this._damagePlayer(penalty);
        this.onToast?.(`Mana Feedback! -${penalty} HP. Coba dekripsi lagi.`);
      } else if (item.data.kind === 'terminal') {
        item.data.cooldownTimer = 10;
        this.onToast?.('Dekripsi gagal! Terminal cooldown 10 detik.');
      } else {
        this.onToast?.('Segel Kuil menolak jawaban. Coba tantangan ulang!');
      }
      return;
    }

    this.sound.play('puzzle_correct');

    if (item.data.kind === 'chest') {
      item.data.opened = true;
      item.used = true;
      this.sound.play('chest_open');
      this.particles.emit('chest_open', item.x + 16, item.y + 8);

      const loot = item.data.chest.loot;
      this.player.state.shards += loot.shards;
      const unlockedNames: string[] = [`+${loot.shards} Shards`];

      if (loot.energyRestore) {
        this.player.state.energy = Math.min(
          this.player.state.maxEnergy,
          this.player.state.energy + loot.energyRestore
        );
        unlockedNames.push(`+${loot.energyRestore} Energy`);
      }
      if (loot.ammoPacks) {
        this.player.state.ammoPacks = Math.min(
          this.player.state.maxAmmoPacks,
          this.player.state.ammoPacks + loot.ammoPacks
        );
        unlockedNames.push(`+${loot.ammoPacks} Ammo Pack`);
      }
      if (loot.nanoVials) {
        this.player.state.nanoVials = Math.min(
          this.player.state.maxNanoVials,
          this.player.state.nanoVials + loot.nanoVials
        );
        unlockedNames.push(`+${loot.nanoVials} Nano-Vial`);
      }
      if (loot.upgradeWeaponId) {
        const upRes = this.player.upgradeWeaponLevel(loot.upgradeWeaponId);
        if (upRes.upgraded && upRes.weapon) {
          unlockedNames.push(
            `UPGRADE ${WEAPONS[loot.upgradeWeaponId]?.name} -> Lv.${upRes.weapon.level} (GLOW!)`
          );
        }
      }
      if (loot.weaponId) {
        const inst: WeaponInstance = {
          defId: loot.weaponId,
          tier: loot.weaponTier ?? 'common',
          level: loot.weaponLevel ?? 1,
        };
        const res = this.player.addOrUpgradeWeapon(inst);
        this.player.equipWeapon(res.weapon);
        const wName = WEAPONS[loot.weaponId]?.name ?? loot.weaponId;
        unlockedNames.push(
          res.action === 'upgraded'
            ? `${wName} UPGRADE Lv.${res.weapon.level}!`
            : `${wName} (Lv.${res.weapon.level ?? 1})`
        );
      }
      if (loot.armorId) {
        if (!this.player.state.armorInventory.includes(loot.armorId)) {
          this.player.state.armorInventory.push(loot.armorId);
        }
        this.player.equipArmor(loot.armorId);
        unlockedNames.push(ARMORS[loot.armorId]?.name ?? loot.armorId);
      }

      this.saveGear();
      this.onToast?.(`Chest Terbuka: ${unlockedNames.join(' · ')}`);
    }

    if (item.data.kind === 'generic' && item.data.subType === 'puzzle_shrine') {
      item.used = true;
      this.sound.play('chest_open');
      this.particles.emit('chest_open', item.x + 16, item.y + 12);
      this.player.state.shards += 120;
      this.player.state.nanoVials = this.player.state.maxNanoVials;
      this.player.state.hp = this.player.state.maxHp;
      if (!this.player.state.armorInventory.includes('aether_praetor')) {
        this.player.state.armorInventory.push('aether_praetor');
      }
      this.player.equipArmor('aether_praetor');
      this.saveGear();
      this.onToast?.('SHRINE CLEARED! +120 Shards, Full Vials & Aether-Forge Praetor Armor!');
    }

    if (item.data.kind === 'generic' && item.data.subType === 'runic_pillar') {
      if (this.boss) {
        breakShieldViaRunicPillar(this.boss);
        this.sound.play('boss_stun');
        this.triggerShake(5, 0.3);
        this.particles.emit('explosion', this.boss.x + this.boss.width / 2, this.boss.y + 20);
        this.onToast?.(`PERISAI ${this.boss.def.name} HANCUR! Boss Stun 4 detik!`);
      }
    }

    if (item.data.kind === 'gate' && item.data.gateType === 'quick_decrypt') {
      item.data.isOpen = true;
      item.used = true;
      this.sound.play('gate_open');
      this.player.state.shards += 30;
      this.particles.emit('chest_open', item.x + 4, item.y + 24);
      this.onToast?.('Gerbang Dekripsi terbuka! +30 Shards!');
    }

    if (item.data.kind === 'terminal') {
      item.data.cooldownTimer = 25;
      if (item.data.terminalType === 'emergency') {
        this._manaShieldTimer = 4;
        this.particles.emit('explosion', this.player.x + 7, this.player.y + 14);
        for (const e of this.enemies) {
          if (Math.hypot(e.x - this.player.x, e.y - this.player.y) < 180) {
            if (damageEnemy(e, 40, true)) this._onEnemyKilled(e);
          }
        }
        this.onToast?.('Mana Shield aktif 4s + Gelombang Kejut menghancurkan musuh sekitar!');
      } else {
        this.mode.repairPylon(100);
        this.sound.play('pylon_repair');
        this.sound.play('turret_spawn');
        if (this.level?.pylonPos) {
          this.particles.emit('pylon_repair', this.level.pylonPos.x, this.level.pylonPos.y);
          this._turrets.push({
            x: this.level.pylonPos.x,
            y: this.level.pylonPos.y - 36,
            life: 15,
            fireTimer: 0.2,
          });
        }
        this.onToast?.('Pylon +100 HP & Mana Turret otomatis aktif 15 detik!');
      }
    }

    this._emitHud();
  }

  private _updateVisuals(dt: number) {
    for (let i = this._slashes.length - 1; i >= 0; i--) {
      this._slashes[i].life -= dt;
      if (this._slashes[i].life <= 0) this._slashes.splice(i, 1);
    }
    for (let i = this._hitEffects.length - 1; i >= 0; i--) {
      this._hitEffects[i].life -= dt;
      if (this._hitEffects[i].life <= 0) this._hitEffects.splice(i, 1);
    }
    for (let i = this._floatingTexts.length - 1; i >= 0; i--) {
      const f = this._floatingTexts[i];
      f.y += f.vy * dt;
      f.vy *= Math.pow(0.25, dt);
      f.life -= dt;
      if (f.life <= 0) this._floatingTexts.splice(i, 1);
    }
    for (let i = this._ghostTrails.length - 1; i >= 0; i--) {
      this._ghostTrails[i].life -= dt;
      if (this._ghostTrails[i].life <= 0) this._ghostTrails.splice(i, 1);
    }
  }

  private _spawnHitEffect(
    x: number,
    y: number,
    color: string,
    radius: number,
    kind: HitEffect['kind']
  ) {
    const dur = kind === 'parry' ? 0.24 : 0.16;
    this._hitEffects.push({ x, y, color, radius, life: dur, maxLife: dur, kind });
  }

  private _spawnFloatingText(x: number, y: number, text: string, color: string, isCrit = false) {
    this._floatingTexts.push({
      x,
      y,
      vy: isCrit ? -38 : -28,
      text,
      color,
      life: isCrit ? 0.78 : 0.65,
      maxLife: isCrit ? 0.78 : 0.65,
      isCrit,
    });
  }

  private _updateCamera(dt: number) {
    if (!this.level) return;
    const lookAhead = this.player.facingRight ? 36 : -36;
    const targetX = this.player.x + this.player.width / 2 + lookAhead - GAME_WIDTH / 2;
    const targetY = this.player.y + this.player.height / 2 - GAME_HEIGHT * 0.58;

    const maxX = Math.max(0, this.level.worldWidth - GAME_WIDTH);
    const maxY = Math.max(0, this.level.worldHeight - GAME_HEIGHT);

    const clampedX = Math.max(0, Math.min(maxX, targetX));
    const clampedY = Math.max(0, Math.min(maxY, targetY));

    const lerp = Math.min(1, dt * 8);
    this.camera.x += (clampedX - this.camera.x) * lerp;
    this.camera.y += (clampedY - this.camera.y) * lerp;
  }

  // ── Render Pipeline ─────────────────────────────────────
  private _render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.parallax.render(ctx, this.camera.x, this.camera.y, this._animTime);

    ctx.save();
    const cx = -Math.round(this.camera.x + this.camera.shakeX);
    const cy = -Math.round(this.camera.y + this.camera.shakeY);
    ctx.translate(cx, cy);

    if (this.level) {
      this._renderDecorProps(ctx);
      this._renderTorches(ctx);
      this._renderPlatforms(ctx, this.level.platforms);
      this._renderMovingAndCrumbling(ctx);
      this._renderLasers(ctx);
      this._renderCrystals(ctx);
      this._renderBouncePads(ctx);
      this._renderSpikes(ctx);
      this._renderPortals(ctx);
      this._renderInteractables(ctx);
      this._renderGroundDrops(ctx);
      this._renderTurrets(ctx);
      this._renderEnemies(ctx);
      this._renderBoss(ctx);
      this._renderGhostTrails(ctx);
      this._renderPlayer(ctx);
      this._renderSlashes(ctx);
      this._renderHitEffects(ctx);
      this._renderProjectiles(ctx);
      this.particles.render(ctx);
      this._renderFloatingTexts(ctx);
    }

    ctx.restore();

    this._renderForeground(ctx);

    if (this.player.isAdrenalineActive) {
      ctx.strokeStyle = 'rgba(249, 115, 22, 0.55)';
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, GAME_WIDTH - 4, GAME_HEIGHT - 4);
    }
  }

  private _renderDecorProps(ctx: CanvasRenderingContext2D) {
    if (!this.level) return;
    const t = this._animTime;
    const minVisX = this.camera.x - 90;
    const maxVisX = this.camera.x + GAME_WIDTH + 90;

    for (let i = 0; i < this.level.decorProps.length; i++) {
      const prop = this.level.decorProps[i];
      if (prop.x < minVisX || prop.x > maxVisX) continue;
      const sc = prop.scale ?? 1;

      ctx.save();
      ctx.translate(Math.round(prop.x), Math.round(prop.y));

      if (prop.type === 'arch') {
        const w = Math.round(48 * sc);
        const h = Math.round(74 * sc);
        ctx.fillStyle = prop.color ?? '#2D3446';
        // Twin gothic pillars
        ctx.fillRect(-w / 2, -h, 8, h);
        ctx.fillRect(w / 2 - 8, -h, 8, h);
        // Pointed arch crown
        ctx.beginPath();
        ctx.moveTo(-w / 2, -h);
        ctx.lineTo(0, -h - 22 * sc);
        ctx.lineTo(w / 2, -h);
        ctx.lineTo(w / 2 - 8, -h + 8);
        ctx.lineTo(0, -h - 10 * sc);
        ctx.lineTo(-w / 2 + 8, -h + 8);
        ctx.closePath();
        ctx.fill();
        // Highlight inner bevel
        ctx.fillStyle = 'rgba(255,255,255,0.07)';
        ctx.fillRect(-w / 2 + 1, -h, 2, h);
        ctx.fillRect(w / 2 - 3, -h, 2, h);
      } else if (prop.type === 'bell') {
        const sway = Math.sin(t * 1.4 + i * 1.7) * 0.06;
        ctx.rotate(sway);
        // Chain up
        ctx.fillStyle = '#334155';
        ctx.fillRect(-1, -48 * sc, 2, 48 * sc);
        // Bell dome
        const bw = Math.round(20 * sc);
        const bh = Math.round(22 * sc);
        ctx.fillStyle = prop.color ?? '#D97706';
        ctx.fillRect(-bw / 2 + 3, 0, bw - 6, 4);
        ctx.fillRect(-bw / 2 + 1, 4, bw - 2, bh - 8);
        ctx.fillRect(-bw / 2 - 2, bh - 4, bw + 4, 4);
        // Specular highlight + clapper
        ctx.fillStyle = 'rgba(255,255,255,0.28)';
        ctx.fillRect(-bw / 2 + 3, 4, 2, bh - 8);
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(-2, bh, 4, 4);
      } else if (prop.type === 'banner') {
        const flutter = Math.sin(t * 4.2 + i) * 2.5;
        ctx.fillStyle = '#475569';
        ctx.fillRect(-1, -44, 2, 44);
        ctx.fillRect(-10, -44, 20, 2);
        ctx.fillStyle = prop.color ?? '#E11D48';
        ctx.beginPath();
        ctx.moveTo(-8, -42);
        ctx.lineTo(8, -42);
        ctx.lineTo(7 + flutter, -12);
        ctx.lineTo(flutter * 0.8, -18);
        ctx.lineTo(-7 + flutter, -12);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(250, 204, 21, 0.55)';
        ctx.fillRect(-1, -38, 2, 16);
      } else if (prop.type === 'lantern') {
        const glow = 0.2 + 0.08 * Math.sin(t * 7 + i);
        const col = prop.color ?? '#4ADE80';
        ctx.fillStyle = '#334155';
        ctx.fillRect(-1, 0, 2, 32);
        ctx.fillRect(-5, 0, 10, 2);
        ctx.fillStyle = col;
        ctx.globalAlpha = glow;
        ctx.beginPath();
        ctx.arc(0, 6, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(-3, 2, 6, 8);
        ctx.fillStyle = col;
        ctx.fillRect(-2, 4, 4, 5);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-1, 5, 2, 2);
      } else if (prop.type === 'silk_web') {
        const col = prop.color ?? '#E2E8F0';
        ctx.strokeStyle = col;
        ctx.globalAlpha = 0.24;
        ctx.lineWidth = 1;
        const r = 34 * sc;
        for (let a = 0; a < 5; a++) {
          const ang = -Math.PI + (a / 4) * Math.PI;
          ctx.beginPath();
          ctx.moveTo(0, -r * 0.9);
          ctx.lineTo(Math.cos(ang) * r, -r * 0.9 + Math.sin(ang) * r + r * 0.9);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(-r * 0.8, -r * 0.35);
        ctx.quadraticCurveTo(0, -r * 0.1, r * 0.8, -r * 0.35);
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (prop.type === 'obelisk') {
        const pulse = 0.55 + 0.45 * Math.sin(t * 3.2 + i);
        ctx.fillStyle = '#1E293B';
        ctx.beginPath();
        ctx.moveTo(-7, 0);
        ctx.lineTo(-5, -36);
        ctx.lineTo(0, -44);
        ctx.lineTo(5, -36);
        ctx.lineTo(7, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = prop.color ?? '#38BDF8';
        ctx.globalAlpha = pulse;
        ctx.fillRect(-1, -34, 2, 22);
        ctx.fillRect(-3, -24, 6, 2);
        ctx.globalAlpha = 1;
      }

      ctx.restore();
    }
  }

  private _renderForeground(ctx: CanvasRenderingContext2D) {
    if (!this.level) return;
    const theme = this.level.parallaxTheme;
    const fgShift = -(this.camera.x * 1.22);
    const spacing = 290;
    const startIdx = Math.floor(-fgShift / spacing) - 1;
    const endIdx = startIdx + Math.ceil(GAME_WIDTH / spacing) + 3;

    ctx.save();
    for (let idx = startIdx; idx <= endIdx; idx++) {
      const fx = Math.round(idx * spacing + fgShift);
      // Dark foreground silhouetted pillars / hanging vines at viewport edges
      ctx.fillStyle =
        theme === 'ruins'
          ? 'rgba(5, 11, 10, 0.58)'
          : theme === 'foundry'
            ? 'rgba(14, 7, 6, 0.55)'
            : 'rgba(10, 4, 18, 0.56)';
      ctx.fillRect(fx, 0, 14, 46);
      ctx.fillRect(fx + 3, 46, 8, 16);
      // Hanging foreground moss / chain / silk strand
      const sway = Math.sin(this._animTime * 2.1 + idx) * 2;
      ctx.fillRect(fx + 6 + sway * 0.4, 62, 2, 24);
      // Subtle bottom foreground rock silhouette
      ctx.fillRect(fx + 120, GAME_HEIGHT - 14, 34, 14);
      ctx.fillRect(fx + 126, GAME_HEIGHT - 20, 20, 6);
    }

    // Subtle Silksong radial atmospheric vignette
    const vig = ctx.createRadialGradient(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_HEIGHT * 0.42,
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH * 0.68
    );
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(4, 6, 12, 0.46)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Damage / Parry screen-edge flash
    if (this._screenFlashTimer > 0) {
      ctx.globalAlpha = Math.min(1, this._screenFlashTimer / 0.2);
      ctx.strokeStyle = this._screenFlashColor;
      ctx.lineWidth = 10;
      ctx.strokeRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  private _renderTorches(ctx: CanvasRenderingContext2D) {
    if (!this.level) return;
    for (let i = 0; i < this.level.torches.length; i++) {
      const t = this.level.torches[i];
      const flicker = Math.sin(this._animTime * 14 + i * 2) * 2;
      ctx.fillStyle = '#332C28';
      ctx.fillRect(t.x - 1, t.y, 3, 24);
      ctx.fillStyle = t.color;
      ctx.globalAlpha = 0.16;
      ctx.beginPath();
      ctx.arc(t.x, t.y - 3, 18 + flicker, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillRect(t.x - 2, t.y - 5 - Math.abs(flicker), 5, 5 + Math.abs(flicker));
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(t.x - 1, t.y - 3, 2, 3);
    }
  }

  private _renderBouncePads(ctx: CanvasRenderingContext2D) {
    if (!this.level) return;
    const pulse = 0.5 + 0.5 * Math.sin(this._animTime * 7);
    for (const pad of this.level.bouncePads) {
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(pad.x, pad.y + 3, pad.w, pad.h - 3);
      ctx.fillStyle = '#00F0FF';
      ctx.fillRect(pad.x + 2, pad.y, pad.w - 4, 3);
      ctx.fillStyle = `rgba(0, 240, 255, ${0.2 + pulse * 0.35})`;
      ctx.fillRect(pad.x + 4, pad.y - 10 - pulse * 6, pad.w - 8, 10 + pulse * 6);
    }
  }

  private _renderPlatforms(ctx: CanvasRenderingContext2D, platforms: Platform[]) {
    const theme = this.level?.parallaxTheme ?? 'ruins';
    const bodyCol = theme === 'ruins' ? '#162022' : theme === 'foundry' ? '#201818' : '#1A1328';
    const topCapCol = theme === 'ruins' ? '#2D5A47' : theme === 'foundry' ? '#57362A' : '#4C2A6A';
    const trimCol = theme === 'ruins' ? '#4ADE80' : theme === 'foundry' ? '#F97316' : '#F43F5E';
    const brickLineCol = theme === 'ruins' ? '#0D1416' : theme === 'foundry' ? '#140E0E' : '#100A1B';

    for (const plat of platforms) {
      if (plat.kind === 'wall') {
        ctx.fillStyle = bodyCol;
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        ctx.fillStyle = topCapCol;
        ctx.fillRect(plat.x, plat.y, 2, plat.h);
        ctx.fillRect(plat.x + plat.w - 2, plat.y, 2, plat.h);
        ctx.fillStyle = brickLineCol;
        for (let wy = plat.y + 14; wy < plat.y + plat.h; wy += 16) {
          ctx.fillRect(plat.x + 2, wy, plat.w - 4, 1);
        }
      } else if (plat.oneWay) {
        ctx.fillStyle = topCapCol;
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        ctx.fillStyle = trimCol;
        ctx.fillRect(plat.x, plat.y, plat.w, 2);
        // Decorative underside struts
        ctx.fillStyle = brickLineCol;
        for (let sx = plat.x + 12; sx < plat.x + plat.w - 8; sx += 24) {
          ctx.fillRect(sx, plat.y + 3, 3, plat.h - 3);
        }
      } else {
        ctx.fillStyle = bodyCol;
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        // Stone / Forge / Obsidian top cap
        ctx.fillStyle = topCapCol;
        ctx.fillRect(plat.x, plat.y, plat.w, 5);
        ctx.fillStyle = trimCol;
        ctx.globalAlpha = 0.65;
        ctx.fillRect(plat.x, plat.y, plat.w, 1);
        ctx.globalAlpha = 1;
        // Carved stone brick joints
        ctx.fillStyle = brickLineCol;
        for (let bx = plat.x; bx < plat.x + plat.w; bx += 20) {
          ctx.fillRect(bx, plat.y + 5, 1, Math.min(14, plat.h - 5));
        }
        if (plat.h > 20) {
          ctx.fillRect(plat.x, plat.y + 18, plat.w, 1);
        }
        // Biome top edge details (hanging moss tufts / ember rivets / crimson runes)
        if (theme === 'ruins') {
          ctx.fillStyle = '#34D399';
          for (let mx = plat.x + 8; mx < plat.x + plat.w - 8; mx += 28) {
            ctx.fillRect(mx, plat.y + 4, 5, 3);
            ctx.fillRect(mx + 2, plat.y + 7, 2, 3);
          }
        } else if (theme === 'foundry') {
          ctx.fillStyle = '#F59E0B';
          for (let rx = plat.x + 10; rx < plat.x + plat.w - 10; rx += 32) {
            ctx.fillRect(rx, plat.y + 2, 2, 2);
          }
        } else {
          ctx.fillStyle = '#E879F9';
          for (let kx = plat.x + 14; kx < plat.x + plat.w - 14; kx += 36) {
            ctx.fillRect(kx, plat.y + 7, 4, 1);
          }
        }
      }
    }
  }

  private _renderSpikes(ctx: CanvasRenderingContext2D) {
    if (!this.level) return;
    for (const sp of this.level.spikes) {
      ctx.fillStyle = '#EF4444';
      for (let sx = sp.x; sx < sp.x + sp.w; sx += 8) {
        ctx.beginPath();
        ctx.moveTo(sx, sp.y + sp.h);
        ctx.lineTo(sx + 4, sp.y);
        ctx.lineTo(sx + 8, sp.y + sp.h);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  private _renderPortals(ctx: CanvasRenderingContext2D) {
    if (!this.level) return;
    const pulse = 0.5 + 0.35 * Math.sin(this._animTime * 6);
    for (const pt of this.level.spawnPortals) {
      ctx.fillStyle = `rgba(168, 85, 247, ${pulse})`;
      ctx.fillRect(pt.x - 7, pt.y - 28, 14, 30);
      ctx.fillStyle = '#00F0FF';
      ctx.fillRect(pt.x - 2, pt.y - 23, 4, 20);
    }
  }

  private _renderInteractables(ctx: CanvasRenderingContext2D) {
    const bob = Math.sin(this._animTime * 4) * 1.5;
    for (const item of this.interactables) {
      if (item.data.kind === 'chest') {
        const pal =
          item.type === 'chest_epic'
            ? ENEMY_PALETTES.chest_epic
            : item.type === 'chest_rare'
              ? ENEMY_PALETTES.chest_rare
              : ENEMY_PALETTES.chest_common;
        if (!item.data.opened) {
          ctx.fillStyle = 'rgba(250, 204, 21, 0.14)';
          ctx.beginPath();
          ctx.arc(item.x + 16, item.y + 12, 18 + bob, 0, Math.PI * 2);
          ctx.fill();
        }
        const frame = this.sprites.render(`chest_${item.type}`, CHEST_SPRITE, pal, 2);
        this.sprites.draw(ctx, frame, item.x + 16, item.y + 24, false);
        if (item.data.opened) {
          ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
          ctx.fillRect(item.x, item.y, item.width, item.height);
        }
      } else if (item.data.kind === 'generic' && item.data.subType === 'puzzle_shrine') {
        ctx.fillStyle = '#2B2F3A';
        ctx.fillRect(item.x + 4, item.y + 8, 24, 32);
        ctx.fillStyle = item.used ? '#22C55E' : '#A855F7';
        ctx.fillRect(item.x + 11, item.y + 12 + bob, 10, 14);
        ctx.strokeStyle = '#00F0FF';
        ctx.strokeRect(item.x + 2, item.y + 6, 28, 34);
      } else if (item.data.kind === 'pylon') {
        const frame = this.sprites.render('pylon', PYLON_SPRITE, ENEMY_PALETTES.pylon, 2);
        this.sprites.draw(ctx, frame, item.x + 12, item.y + 48, false);
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.55)';
        ctx.strokeRect(item.x - 2, item.y, item.width + 4, item.height);
      } else if (item.data.kind === 'terminal') {
        const ready = item.data.cooldownTimer <= 0;
        ctx.fillStyle = '#2B2F3A';
        ctx.fillRect(item.x, item.y, item.width, item.height);
        ctx.fillStyle = ready ? '#22C55E' : '#EF4444';
        ctx.fillRect(item.x + 3, item.y + 4, item.width - 6, 8);
      } else if (item.data.kind === 'barricade') {
        ctx.fillStyle = item.data.isDeployed ? '#00F0FF' : '#4A3F35';
        ctx.fillRect(item.x, item.y, item.width, item.height);
        if (item.data.isDeployed) {
          ctx.fillStyle = 'rgba(0, 240, 255, 0.25)';
          ctx.fillRect(item.x - 10, item.y - 12, item.width + 20, item.height + 12);
        }
      } else if (item.data.kind === 'generic' && item.data.subType === 'runic_pillar') {
        const active = Boolean(this.boss && this.boss.shieldActive);
        ctx.fillStyle = '#2B2F3A';
        ctx.fillRect(item.x + 2, item.y + 4, 12, 36);
        ctx.fillStyle = active ? '#00F0FF' : '#475569';
        ctx.fillRect(item.x + 5, item.y + 8 + bob, 6, 18);
        if (active) {
          ctx.strokeStyle = '#FACC15';
          ctx.strokeRect(item.x, item.y + 2, 16, 38);
        }
      } else if (item.data.kind === 'gate' && item.data.gateType === 'quick_decrypt') {
        if (!item.data.isOpen) {
          ctx.fillStyle = 'rgba(0, 240, 255, 0.25)';
          ctx.fillRect(item.x, item.y, item.width, item.height);
          ctx.strokeStyle = '#00F0FF';
          ctx.strokeRect(item.x, item.y, item.width, item.height);
        } else {
          ctx.fillStyle = 'rgba(34, 197, 94, 0.35)';
          ctx.fillRect(item.x, item.y, item.width, 6);
        }
      } else if (item.data.kind === 'gate' && item.data.gateType === 'exit') {
        ctx.fillStyle = '#161B29';
        ctx.fillRect(item.x, item.y, item.width, item.height);
        ctx.strokeStyle = '#FACC15';
        ctx.lineWidth = 2;
        ctx.strokeRect(item.x, item.y, item.width, item.height);
        ctx.fillStyle = 'rgba(250, 204, 21, 0.28)';
        ctx.fillRect(item.x + 4, item.y + 4, item.width - 8, item.height - 4);
      }

      if (item.inRange && !item.used) {
        ctx.fillStyle = '#0B0D14';
        ctx.fillRect(item.x + item.width / 2 - 14, item.y - 16, 28, 11);
        ctx.strokeStyle = '#FACC15';
        ctx.lineWidth = 1;
        ctx.strokeRect(item.x + item.width / 2 - 14, item.y - 16, 28, 11);
        ctx.fillStyle = '#FACC15';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('[E]', item.x + item.width / 2, item.y - 8);
      }
    }
  }

  private _renderTurrets(ctx: CanvasRenderingContext2D) {
    for (const t of this._turrets) {
      ctx.fillStyle = '#00F0FF';
      ctx.fillRect(Math.round(t.x - 4), Math.round(t.y - 4), 8, 8);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(Math.round(t.x - 2), Math.round(t.y - 2), 4, 4);
    }
  }

  private _renderMovingAndCrumbling(ctx: CanvasRenderingContext2D) {
    if (!this.level) return;

    for (const mp of this.level.movingPlatforms) {
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(Math.round(mp.x), Math.round(mp.y), mp.w, mp.h);
      ctx.fillStyle = '#00F0FF';
      ctx.fillRect(Math.round(mp.x), Math.round(mp.y), mp.w, 2);
      ctx.fillStyle = '#F97316';
      ctx.fillRect(Math.round(mp.x + 4), Math.round(mp.y + 4), 4, 3);
      ctx.fillRect(Math.round(mp.x + mp.w - 8), Math.round(mp.y + 4), 4, 3);
    }

    for (const cp of this.level.crumblingPlatforms) {
      if (cp.state === 'broken') {
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.3)';
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(cp.x, cp.y, cp.w, cp.h);
        ctx.setLineDash([]);
        continue;
      }
      const jitterX = cp.state === 'shaking' ? (Math.random() - 0.5) * 3 : 0;
      ctx.fillStyle = cp.state === 'shaking' ? '#EF4444' : '#57534E';
      ctx.fillRect(Math.round(cp.x + jitterX), cp.y, cp.w, cp.h);
      ctx.fillStyle = '#0B0D14';
      for (let cx = cp.x + 10; cx < cp.x + cp.w - 6; cx += 14) {
        ctx.fillRect(Math.round(cx + jitterX), cp.y + 1, 2, 7);
      }
    }
  }

  private _renderLasers(ctx: CanvasRenderingContext2D) {
    if (!this.level) return;
    for (const lz of this.level.lasers) {
      const phase = (this._animTime + lz.offset) % lz.period;
      const active = phase < lz.activeWindow;
      const telegraph = !active && phase > lz.period - 0.45;

      // Emitter housing
      ctx.fillStyle = '#334155';
      ctx.fillRect(lz.x - 2, lz.y - 4, lz.w + 4, 4);
      ctx.fillRect(lz.x - 2, lz.y + lz.h, lz.w + 4, 4);

      if (active) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.45)';
        ctx.fillRect(lz.x - 2, lz.y, lz.w + 4, lz.h);
        ctx.fillStyle = '#EF4444';
        ctx.fillRect(lz.x + 1, lz.y, lz.w - 2, lz.h);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(lz.x + 3, lz.y, 2, lz.h);
      } else if (telegraph) {
        ctx.fillStyle = 'rgba(249, 115, 22, 0.45)';
        ctx.fillRect(lz.x + 3, lz.y, 2, lz.h);
      }
    }
  }

  private _renderCrystals(ctx: CanvasRenderingContext2D) {
    if (!this.level) return;
    const pulse = 0.5 + 0.5 * Math.sin(this._animTime * 8);
    for (const cry of this.level.crystals) {
      if (cry.exploded) continue;
      ctx.fillStyle = `rgba(168, 85, 247, ${0.2 + pulse * 0.25})`;
      ctx.beginPath();
      ctx.arc(cry.x + cry.w / 2, cry.y + cry.h / 2, 13 + pulse * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#A855F7';
      ctx.beginPath();
      ctx.moveTo(cry.x + cry.w / 2, cry.y);
      ctx.lineTo(cry.x + cry.w, cry.y + cry.h * 0.65);
      ctx.lineTo(cry.x + cry.w / 2, cry.y + cry.h);
      ctx.lineTo(cry.x, cry.y + cry.h * 0.65);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#00F0FF';
      ctx.fillRect(cry.x + cry.w / 2 - 1, cry.y + 5, 2, 10);
    }
  }

  private _renderGroundDrops(ctx: CanvasRenderingContext2D) {
    const bob = Math.sin(this._animTime * 6) * 2;
    for (const d of this._groundDrops) {
      const y = Math.round(d.y + bob);
      if (d.kind === 'boss_relic') {
        ctx.fillStyle = 'rgba(250, 204, 21, 0.28)';
        ctx.beginPath();
        ctx.arc(d.x + 7, y + 7, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FACC15';
        ctx.fillRect(Math.round(d.x), y, 14, 14);
        ctx.fillStyle = '#00F0FF';
        ctx.fillRect(Math.round(d.x + 4), y + 4, 6, 6);
        ctx.font = 'bold 7px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FACC15';
        ctx.fillText('BOSS DROP', Math.round(d.x + 7), y - 5);
      } else if (d.kind === 'ammo_pack') {
        ctx.fillStyle = '#0B0D14';
        ctx.fillRect(Math.round(d.x - 1), y - 1, 12, 10);
        ctx.fillStyle = '#FACC15';
        ctx.fillRect(Math.round(d.x), y, 10, 8);
        ctx.fillStyle = '#00F0FF';
        ctx.fillRect(Math.round(d.x + 2), y + 2, 6, 4);
      } else {
        ctx.fillStyle = '#00F0FF';
        ctx.fillRect(Math.round(d.x), y, 6, 6);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(Math.round(d.x + 2), y + 2, 2, 2);
      }
    }
  }

  private _renderEnemies(ctx: CanvasRenderingContext2D) {
    const walkToggle = Math.floor(this._animTime * 8) % 2 === 1;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const flash = e.hitFlashTimer > 0;
      const pal = ENEMY_PALETTES[e.defId] ?? ENEMY_PALETTES.mana_husk;
      const moving = Math.abs(e.vx) > 5;
      const mat = getEnemyMatrix(e.defId, moving && walkToggle);
      const scale = e.defId === 'rift_brute' ? 1.45 : e.defId === 'corrupted_sentinel' ? 1.15 : 1;

      const frame = this.sprites.render(
        `enemy_${e.defId}_${moving && walkToggle ? 'w' : 'i'}`,
        mat,
        pal,
        1,
        flash
      );
      this.sprites.draw(
        ctx,
        frame,
        e.x + e.width / 2,
        e.y + e.height,
        !e.facingRight,
        scale,
        scale
      );

      if (e.shieldHp > 0) {
        ctx.fillStyle = '#F97316';
        const sx = e.facingRight ? e.x + e.width + 1 : e.x - 3;
        ctx.fillRect(Math.round(sx), Math.round(e.y + 2), 2, e.height - 4);
      }

      if (e.hp < e.maxHp) {
        ctx.fillStyle = '#0B0D14';
        ctx.fillRect(Math.round(e.x), Math.round(e.y - 5), e.width, 3);
        ctx.fillStyle = '#EF4444';
        ctx.fillRect(
          Math.round(e.x),
          Math.round(e.y - 5),
          Math.round((e.hp / e.maxHp) * e.width),
          3
        );
      }
    }
  }

  private _renderBoss(ctx: CanvasRenderingContext2D) {
    if (!this.boss || this.boss.hp <= 0) return;
    const b = this.boss;
    const flash = this._bossFlashTimer > 0;
    const isStunned = b.stunTimer > 0;
    const isTelegraph = b.attackState === 'telegraph';

    drawBossSprite(
      ctx,
      b.def.id,
      b.x,
      b.y,
      b.width,
      b.height,
      b.facingRight,
      flash,
      isStunned,
      isTelegraph,
      this._animTime
    );

    if (b.shieldActive) {
      ctx.save();
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(b.x + b.width / 2, b.y + b.height / 2, b.width * 0.72, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (isStunned) {
      ctx.fillStyle = '#00F0FF';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('STUNNED!', b.x + b.width / 2, b.y - 8);
    }
  }

  private _renderGhostTrails(ctx: CanvasRenderingContext2D) {
    for (const g of this._ghostTrails) {
      const alpha = Math.max(0, (g.life / g.maxLife) * 0.45);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = g.color;
      ctx.fillRect(Math.round(g.x - 5), Math.round(g.y - 26), 10, 14);
      ctx.fillRect(Math.round(g.x - 4), Math.round(g.y - 12), 8, 10);
      ctx.restore();
    }
  }

  private _renderPlayer(ctx: CanvasRenderingContext2D) {
    const p = this.player;
    const armor = ARMORS[p.state.armorId] ?? ARMORS.recruit_mk1;

    const combatMoveProgress =
      this._activeCombatMove === 'air_slam_dive'
        ? 0.5
        : this._activeCombatMove && this._meleeAnimDuration > 0
          ? 1 - this._meleeAnimTimer / Math.max(0.05, this._meleeAnimDuration)
          : 0;

    drawComplexSlayerAvatar(ctx, this.sprites, {
      armorId: armor.id,
      palette: armor.palette,
      x: p.x,
      y: p.y,
      width: p.width,
      height: p.height,
      facingRight: p.facingRight,
      vx: p.vx,
      vy: p.vy,
      onGround: p.onGround,
      isWallSliding: p.isWallSliding,
      isDashing: p.isDashing,
      isInvincible: p.isInvincible,
      isBlocking: p.isBlocking,
      parryFlash: this._parryFlashTimer / 0.26,
      counterReady: p.counterReady,
      meleeTimer: this._meleeAnimTimer,
      meleeDuration: this._meleeAnimDuration,
      meleeCombo: p.meleeCombo,
      isPogo: this._meleeAnimIsPogo,
      rangedTimer: this._rangedAnimTimer,
      doubleJumpFlip: this._doubleJumpFlipTimer / 0.28,
      spinAttack: this._spinAttackTimer / Math.max(0.05, this._spinAttackDuration),
      spinMode: this._spinMode,
      walkPhase: this._walkCycle,
      animTime: this._animTime,
      scaleX: this._scaleX,
      scaleY: this._scaleY,
      meleeWeaponId: p.state.meleeWeapon.defId,
      meleeWeaponLevel: getWeaponLevel(p.state.meleeWeapon),
      rangedWeaponId: p.state.rangedWeapon?.defId ?? null,
      rangedWeaponLevel: p.state.rangedWeapon ? getWeaponLevel(p.state.rangedWeapon) : 1,
      hasOffhandShield: p.hasFullEnergyShield,
      iaidoWindup: this._iaidoWindupTimer > 0,
      scarfPoints: this._scarfPoints,
      combatMove: this._activeCombatMove,
      combatMoveProgress,
    });

    if (this._manaShieldTimer > 0) {
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x + p.width / 2, p.y + p.height / 2, 18, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private _renderSlashes(ctx: CanvasRenderingContext2D) {
    for (const s of this._slashes) {
      const progress = 1 - s.life / s.maxLife;
      const alpha = Math.max(0, 1 - progress * 0.72);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(Math.round(s.x), Math.round(s.y));
      if (s.isPogo) {
        ctx.rotate(Math.PI / 2);
      } else if (!s.facingRight) {
        ctx.scale(-1, 1);
      }

      if (s.shape === 'needle_thread') {
        // Silksong piercing needle beam + sinusoidal woven silk filament
        const len = s.radius * (0.85 + progress * 0.85);
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.moveTo(-6, -2.5);
        ctx.lineTo(len + 6, 0);
        ctx.lineTo(-6, 2.5);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(-4, 0);
        ctx.lineTo(len + 9, 0);
        ctx.stroke();

        // Woven silk filament wave around needle line
        ctx.strokeStyle = '#FDA4AF';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = -4; x <= len + 2; x += 4) {
          const wy = Math.sin(x * 0.35 + progress * 10) * (3.2 * (1 - progress * 0.4));
          if (x === -4) ctx.moveTo(x, wy);
          else ctx.lineTo(x, wy);
        }
        ctx.stroke();
        ctx.restore();
        continue;
      }

      if (s.shape === 'silk_lash' && !s.isPogo) {
        // Silksong signature sweeping crimson & ivory double-layered crescent + trailing silk ribbon
        const reverse = s.comboStep === 2;
        const angStart = reverse ? Math.PI * 0.62 : -Math.PI * 0.62;
        const angSpan = reverse ? -Math.PI * 1.32 : Math.PI * 1.32;
        const curEnd = angStart + angSpan * Math.min(1, progress * 1.8);
        const a0 = Math.min(angStart, curEnd);
        const a1 = Math.max(angStart, curEnd);

        const outerR = s.radius + 5;
        const innerR = s.radius - 4;
        const segs = 12;

        ctx.fillStyle = s.color;
        ctx.beginPath();
        for (let i = 0; i <= segs; i++) {
          const t = i / segs;
          const ang = a0 + (a1 - a0) * t;
          const r = outerR * (0.95 + 0.08 * Math.sin(t * Math.PI));
          if (i === 0) ctx.moveTo(Math.cos(ang) * r, Math.sin(ang) * r);
          else ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
        }
        for (let i = segs; i >= 0; i--) {
          const t = i / segs;
          const ang = a0 + (a1 - a0) * t;
          const r = outerR - (outerR - innerR) * Math.sin(t * Math.PI);
          ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
        }
        ctx.closePath();
        ctx.fill();

        // Crisp ivory-white leading edge
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.9;
        ctx.beginPath();
        ctx.arc(0, 0, outerR, a0 + (a1 - a0) * 0.1, a1 - (a1 - a0) * 0.08);
        ctx.stroke();

        // Trailing delicate silk thread ribbon
        ctx.strokeStyle = '#FDA4AF';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, innerR - 3, a0, a1);
        ctx.stroke();

        ctx.restore();
        continue;
      }

      if (s.shape === 'spin_horizontal') {
        // Dynamic 360° perspective-tilted horizontal waist ribbon slash (front + back!)
        const rx = s.radius * (0.95 + progress * 0.22);
        const ry = Math.max(6, s.radius * 0.28);
        const rot = progress * Math.PI * 1.9;
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.ellipse(0, 1, rx, ry, 0, rot - Math.PI * 0.85, rot + Math.PI * 0.65);
        ctx.stroke();

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx + 2, ry * 0.85, 0, rot - Math.PI * 0.45, rot + Math.PI * 0.55);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255,255,255,0.45)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, 2, rx * 0.78, ry * 0.72, 0, rot + Math.PI * 0.2, rot + Math.PI * 1.4);
        ctx.stroke();
        ctx.restore();
        continue;
      }

      if (s.shape === 'dash_thrust') {
        // High-velocity stickman bullet-lance thrust + twin sonic shock cones!
        const len = s.radius * (0.85 + progress * 0.75);
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.moveTo(-14, -4.5);
        ctx.lineTo(len + 10, 0);
        ctx.lineTo(-14, 4.5);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.lineTo(len + 14, 0);
        ctx.stroke();

        // Sonic air-break rings around lance
        for (let r = 0; r < 2; r++) {
          const ringX = len * (0.28 + r * 0.34);
          const ringH = (8 - r * 2.5) * (1 + progress * 0.55);
          ctx.strokeStyle = r === 0 ? '#FFFFFF' : s.color;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.ellipse(ringX, 0, 2.5, ringH, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
        continue;
      }

      if (s.shape === 'slam_impact') {
        // Ground-crushing twin shockwave pillars + expanding floor ring!
        const spread = s.radius * (0.45 + progress * 0.9);
        const h = s.radius * 0.8 * (1 - progress * 0.55);
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.moveTo(-spread, 2);
        ctx.quadraticCurveTo(-spread * 0.45, -h, 0, -h * 0.35);
        ctx.quadraticCurveTo(spread * 0.45, -h, spread, 2);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, spread, Math.max(3, 7 * (1 - progress * 0.4)), 0, Math.PI, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        continue;
      }

      if (s.shape === 'thrust' && !s.isPogo) {
        // Crisp step-in mini-thrust cone + speed lines
        const len = s.radius * (0.75 + progress * 0.78);
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.moveTo(-6, -3.2);
        ctx.lineTo(len + 4, 0);
        ctx.lineTo(-6, 3.2);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.7;
        ctx.beginPath();
        ctx.moveTo(-4, 0);
        ctx.lineTo(len + 7, 0);
        ctx.stroke();
        ctx.restore();
        continue;
      }

      if (s.shape === 'vertical_spin' && !s.isPogo) {
        // Upright vertical somersault blade-wheel slash!
        ctx.rotate(progress * Math.PI * 2.4);
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 3.0;
        ctx.beginPath();
        ctx.arc(0, 0, s.radius, -Math.PI * 0.65, Math.PI * 0.72);
        ctx.stroke();

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(0, 0, s.radius - 2, -Math.PI * 0.45, Math.PI * 0.55);
        ctx.stroke();

        ctx.strokeStyle = '#00F0FF';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, s.radius - 6, Math.PI * 0.4, Math.PI * 1.55);
        ctx.stroke();
        ctx.restore();
        continue;
      }

      if (s.shape === 'vertical_chop' && !s.isPogo) {
        // Tall overhead vertical cleave shockwave streak!
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.moveTo(4, -s.radius * 0.9);
        ctx.lineTo(s.radius * 0.65, 2);
        ctx.lineTo(8, s.radius * 0.55);
        ctx.lineTo(0, -s.radius * 0.35);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(4, -s.radius * 0.85);
        ctx.lineTo(s.radius * 0.6, s.radius * 0.45);
        ctx.stroke();
        ctx.restore();
        continue;
      }

      if (s.shape === 'x_cut' && !s.isPogo) {
        // Intersecting razor X-flash arcs!
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(-6, -s.radius * 0.6);
        ctx.lineTo(s.radius * 0.9, s.radius * 0.5);
        ctx.moveTo(-6, s.radius * 0.6);
        ctx.lineTo(s.radius * 0.9, -s.radius * 0.5);
        ctx.stroke();

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-2, -s.radius * 0.45);
        ctx.lineTo(s.radius * 0.8, s.radius * 0.4);
        ctx.moveTo(-2, s.radius * 0.45);
        ctx.lineTo(s.radius * 0.8, -s.radius * 0.4);
        ctx.stroke();
        ctx.restore();
        continue;
      }

      if (s.shape === 'tornado' && !s.isPogo) {
        // Full 360° swirling whirlwind tornado rings!
        ctx.rotate(-progress * Math.PI * 1.8);
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.arc(0, 0, s.radius, 0.15, Math.PI * 1.45);
        ctx.stroke();

        ctx.strokeStyle = '#FACC15';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(0, 0, s.radius - 5, Math.PI + 0.15, Math.PI * 2.45);
        ctx.stroke();

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(0, 0, s.radius + 2, 0.4, Math.PI * 1.15);
        ctx.stroke();
        ctx.restore();
        continue;
      }

      const reverse = s.comboStep >= 2;
      const angStart = reverse ? Math.PI * 0.58 : -Math.PI * 0.55;
      const angSpan = reverse ? -Math.PI * 1.25 : Math.PI * 1.08;
      const curEnd = angStart + angSpan * Math.min(1, progress * 1.65);
      const a0 = Math.min(angStart, curEnd);
      const a1 = Math.max(angStart, curEnd);

      const outerR = s.radius + (s.comboStep === 3 ? 6 : 3);
      const innerR = s.radius - (s.comboStep === 3 ? 7 : 5);
      const segments = 10;

      ctx.fillStyle = s.color;
      ctx.beginPath();
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const ang = a0 + (a1 - a0) * t;
        const r = outerR * (0.94 + 0.08 * Math.sin(t * Math.PI));
        const px = Math.cos(ang) * r;
        const py = Math.sin(ang) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      for (let i = segments; i >= 0; i--) {
        const t = i / segments;
        const ang = a0 + (a1 - a0) * t;
        const taper = Math.sin(t * Math.PI);
        const r = outerR - (outerR - innerR) * taper;
        ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
      }
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = s.comboStep === 3 ? 2.1 : 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, outerR - 1, a0 + (a1 - a0) * 0.15, a1 - (a1 - a0) * 0.15);
      ctx.stroke();

      ctx.restore();
    }
  }

  private _renderHitEffects(ctx: CanvasRenderingContext2D) {
    for (const h of this._hitEffects) {
      const p = 1 - h.life / h.maxLife;
      const alpha = Math.max(0, 1 - p);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(Math.round(h.x), Math.round(h.y));

      // Expanding Silksong impact ring
      ctx.strokeStyle = h.color;
      ctx.lineWidth = h.kind === 'impact' || h.kind === 'parry' ? 2.2 : 1.4;
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(2, h.radius * (0.35 + p * 0.95)), 0, Math.PI * 2);
      ctx.stroke();

      // Sharp white diamond cross-flash
      const arm = h.radius * (0.75 + p * 0.65);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = h.kind === 'parry' ? 2.2 : 1.4;
      ctx.beginPath();
      if (h.kind === 'pierce') {
        ctx.moveTo(-arm * 1.2, 0);
        ctx.lineTo(arm * 1.2, 0);
        ctx.moveTo(0, -arm * 0.45);
        ctx.lineTo(0, arm * 0.45);
      } else {
        ctx.moveTo(-arm, -arm * 0.35);
        ctx.lineTo(arm, arm * 0.35);
        ctx.moveTo(-arm * 0.35, arm);
        ctx.lineTo(arm * 0.35, -arm);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  private _renderProjectiles(ctx: CanvasRenderingContext2D) {
    for (const proj of this.projectiles) {
      if (proj.kind === 'arrow') {
        const ang = Math.atan2(proj.vy, proj.vx);
        ctx.save();
        ctx.translate(Math.round(proj.x), Math.round(proj.y));
        ctx.rotate(ang);
        // Trailing silk-energy wake
        ctx.strokeStyle = proj.trailColor;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.65;
        ctx.beginPath();
        ctx.moveTo(-14, 0);
        ctx.lineTo(-4, 0);
        ctx.stroke();
        ctx.globalAlpha = 1;
        // Arrow fletching
        ctx.fillStyle = '#00F0FF';
        ctx.fillRect(-7, -2, 3, 1);
        ctx.fillRect(-7, 1, 3, 1);
        // Arrow shaft
        ctx.fillStyle = '#E2E8F0';
        ctx.fillRect(-6, 0, 10, 1);
        // Glowing broadhead tip
        ctx.fillStyle = proj.color;
        ctx.fillRect(3, -1, 3, 3);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(5, 0, 3, 1);
        ctx.restore();
        continue;
      }

      if (proj.kind === 'beam') {
        const ang = Math.atan2(proj.vy, proj.vx);
        ctx.save();
        ctx.translate(Math.round(proj.x), Math.round(proj.y));
        ctx.rotate(ang);
        ctx.fillStyle = proj.trailColor;
        ctx.fillRect(-14, -2, 18, 4);
        ctx.fillStyle = proj.color;
        ctx.fillRect(-10, -1, 16, 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-4, -1, 10, 1);
        ctx.restore();
        continue;
      }

      ctx.fillStyle = proj.trailColor;
      ctx.fillRect(
        Math.round(proj.x - proj.vx * 0.015 - 1),
        Math.round(proj.y - proj.vy * 0.015 - 1),
        proj.width,
        proj.height
      );
      ctx.fillStyle = proj.color;
      ctx.fillRect(
        Math.round(proj.x - proj.width / 2),
        Math.round(proj.y - proj.height / 2),
        proj.width,
        proj.height
      );
    }
  }

  private _renderFloatingTexts(ctx: CanvasRenderingContext2D) {
    ctx.textAlign = 'center';
    for (const f of this._floatingTexts) {
      const lifeRatio = Math.max(0, f.life / f.maxLife);
      ctx.globalAlpha = Math.min(1, lifeRatio * 1.4);
      ctx.font = f.isCrit ? 'bold 10px monospace' : 'bold 8px monospace';
      const fx = Math.round(f.x);
      const fy = Math.round(f.y);
      ctx.fillStyle = '#070910';
      ctx.fillText(f.text, fx - 1, fy);
      ctx.fillText(f.text, fx + 1, fy);
      ctx.fillText(f.text, fx, fy - 1);
      ctx.fillText(f.text, fx, fy + 1);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, fx, fy);
    }
    ctx.globalAlpha = 1;
  }

  private _getInteractPrompt(): string | null {
    for (const item of this.interactables) {
      if (!item.inRange || item.used) continue;
      if (item.data.kind === 'chest') return '[E] Buka Encrypted Chest (Puzzle)';
      if (item.data.kind === 'generic' && item.data.subType === 'puzzle_shrine') {
        return '[E] Tantang Ancient Puzzle Shrine (3 Soal)';
      }
      if (item.data.kind === 'generic' && item.data.subType === 'runic_pillar') {
        return this.boss?.shieldActive
          ? '[E] Runic Pillar — Hancurkan Perisai Boss!'
          : 'Runic Pillar (Aktif saat Perisai Boss menyala)';
      }
      if (item.data.kind === 'gate' && item.data.gateType === 'quick_decrypt') {
        return '[E] Dekripsi Gerbang Penghalang (Puzzle)';
      }
      if (item.data.kind === 'terminal') {
        if (item.data.cooldownTimer > 0) {
          return `Terminal Cooldown (${Math.ceil(item.data.cooldownTimer)}s)`;
        }
        return item.data.terminalType === 'emergency'
          ? '[E] Aktivasi Emergency Shield (Puzzle)'
          : '[E] Repair Pylon & Turret (Puzzle)';
      }
      if (item.data.kind === 'barricade') {
        if (item.data.isDeployed) return `Barricade Aktif (${Math.ceil(item.data.activeTimer)}s)`;
        if (item.data.cooldownTimer > 0) return `Barricade Cooldown (${Math.ceil(item.data.cooldownTimer)}s)`;
        return '[E] Aktifkan Barricade Node';
      }
      if (item.data.kind === 'gate' && item.data.gateType === 'exit') {
        return this.boss && this.boss.hp > 0
          ? `Terkunci — Kalahkan ${this.boss.def.name} dulu!`
          : '[E] Masuk Checkpoint Gate (Selesai Stage)';
      }
    }
    return null;
  }

  private _emitHud() {
    const area = this.level?.areas.find((a) => a.id === this._currentAreaId);
    const progressPct = this.level
      ? Math.min(100, Math.max(0, Math.round((this.player.x / this.level.worldWidth) * 100)))
      : 0;

    this.onHudUpdate?.({
      mode: this.mode.state.mode,
      stageNumber: this.level?.stageNumber ?? 1,
      themeTopic: this.level?.themeTopic ?? 'Berpikir Komputasional',
      segmentName: this.mode.state.segment.name,
      areaName: area?.name ?? this.mode.state.segment.name,
      areaSubtitle: area?.subtitle ?? '',
      progressPct,
      hp: this.player.state.hp,
      maxHp: this.player.state.maxHp,
      energy: Math.round(this.player.state.energy),
      maxEnergy: this.player.state.maxEnergy,
      ammoPacks: this.player.state.ammoPacks,
      maxAmmoPacks: this.player.state.maxAmmoPacks,
      nanoVials: this.player.state.nanoVials,
      maxNanoVials: this.player.state.maxNanoVials,
      shards: this.player.state.shards,
      meleeWeapon: this.player.state.meleeWeapon,
      rangedWeapon: this.player.state.rangedWeapon,
      armorId: this.player.state.armorId,
      styleRank: this.player.state.styleRank,
      stylePoints: Math.round(this.player.state.stylePoints),
      adrenaline: Math.round(this.player.state.adrenaline),
      adrenalineActive: this.player.isAdrenalineActive,
      timer: this.mode.state.timer,
      pylonHp: this.mode.state.pylonHp,
      pylonMaxHp: this.mode.state.pylonMaxHp,
      currentWave: this.mode.state.currentWave,
      totalWaves: this.mode.state.totalWaves,
      enemiesRemaining: this.enemies.length + this._pendingSpawns.length,
      kills: this._kills,
      interactPrompt: this._getInteractPrompt(),
      manaShieldTimer: this._manaShieldTimer,
      turretTimer: this._turrets[0]?.life ?? 0,
      isBlocking: this.player.isBlocking,
      hasFullShield: this.player.hasFullEnergyShield,
      meleeCombo: this.player.meleeCombo,
      counterReady: this.player.counterReady,
      activeMove: this._activeCombatMove,
      isMeleeMode: this.player.isMeleeOnlyMode,
      dashThrustReady: this.player.dashThrustCooldown <= 0,
      ...(() => {
        const meleeId = this.player.state.meleeWeapon.defId;
        const rangedDef = this.player.state.rangedWeapon
          ? WEAPONS[this.player.state.rangedWeapon.defId]
          : undefined;
        const armor = ARMORS[this.player.state.armorId];
        const skill = getRightClickSkillMeta(
          meleeId,
          this.player.state.rangedWeapon !== null,
          rangedDef?.energyCost ?? 8
        );
        const scaledCost =
          skill.energyCost > 0
            ? Math.round(skill.energyCost * (armor?.energyCostMult ?? 1))
            : 0;
        return {
          rightSkillKind: skill.kind,
          rightSkillLabel: skill.label,
          rightSkillShortLabel: skill.shortLabel,
          rightSkillInputHint: skill.inputHint,
          rightSkillCost: scaledCost,
          canAirSlam: canWeaponAirSlam(meleeId),
        };
      })(),
      boss:
        this.boss && this.boss.hp > 0
          ? {
              name: this.boss.def.name,
              title: this.boss.def.title,
              hp: this.boss.hp,
              maxHp: this.boss.maxHp,
              shieldActive: this.boss.shieldActive,
              shieldHp: this.boss.shieldHp,
              shieldMaxHp: this.boss.shieldMaxHp,
              stunned: this.boss.stunTimer > 0,
            }
          : undefined,
      minimap:
        this.level && this.mode.state.mode === 'traverse'
          ? {
              worldWidth: this.level.worldWidth,
              playerX: this.player.x + this.player.width / 2,
              areas: this.level.areas.map((a) => ({
                name: a.name,
                startX: a.startX,
                endX: a.endX,
              })),
              markers: [
                ...this.interactables
                  .map((it): { x: number; kind: 'chest' | 'chest_open' | 'shrine' | 'boss' | 'exit' } | null => {
                    if (it.data.kind === 'chest') {
                      return { x: it.x, kind: it.data.opened ? 'chest_open' : 'chest' };
                    }
                    if (it.data.kind === 'generic' && it.data.subType === 'puzzle_shrine') {
                      return { x: it.x, kind: 'shrine' };
                    }
                    if (it.data.kind === 'gate' && it.data.gateType === 'exit') {
                      return { x: it.x, kind: 'exit' };
                    }
                    return null;
                  })
                  .filter((m): m is NonNullable<typeof m> => m !== null),
                ...(this.level.bossSpawn
                  ? [{ x: this.level.bossSpawn.x, kind: 'boss' as const }]
                  : []),
              ],
            }
          : undefined,
    });
  }

  triggerHitstop(frames = 3) {
    this._hitstopFrames = Math.max(this._hitstopFrames, frames);
  }

  triggerShake(intensity = 3, duration = 0.15) {
    this.camera.shakeIntensity = intensity;
    this.camera.shakeDuration = duration;
  }

  private _updateShake(dt: number) {
    if (this.camera.shakeDuration > 0) {
      this.camera.shakeDuration -= dt;
      const i = this.camera.shakeIntensity;
      this.camera.shakeX = (Math.random() * 2 - 1) * i;
      this.camera.shakeY = (Math.random() * 2 - 1) * i;
    } else {
      this.camera.shakeX = 0;
      this.camera.shakeY = 0;
    }
  }

  pause() {
    this.paused = true;
    this.input.setEnabled(false);
    this.onPause?.();
  }

  resume() {
    this.paused = false;
    this.input.setEnabled(true);
    this._lastTime = performance.now();
    this._accumulator = 0;
  }

  pauseForModal() {
    this.paused = true;
    this.input.setEnabled(false);
  }

  resumeFromModal() {
    this.paused = false;
    this.input.setEnabled(true);
    this._lastTime = performance.now();
    this._accumulator = 0;
  }
}

function _aabb(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}
