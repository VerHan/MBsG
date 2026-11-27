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
  StyleRank,
  WaveConfig,
  WeaponInstance,
} from '../types';
import { ARMORS } from '../data/armors';
import { ENEMIES } from '../data/enemies';
import { WEAPONS } from '../data/weapons';
import { InputManager } from './InputManager';
import { ModeManager } from './ModeManager';
import { ParallaxRenderer } from './ParallaxRenderer';
import { ParticleSystem } from './ParticleSystem';
import {
  CHEST_SPRITE,
  ENEMY_PALETTES,
  MANA_HUSK_SPRITE,
  MANA_HUSK_WALK,
  MC_ATTACK,
  MC_FALL,
  MC_IDLE,
  MC_JUMP_UP,
  MC_RUN_1,
  MC_RUN_2,
  MC_RUN_3,
  MC_RUN_4,
  MC_WALL_SLIDE,
  PYLON_SPRITE,
  PixelSpriteRenderer,
  RIFT_DRONE_SPRITE,
  drawWeaponInHand,
} from './PixelSpriteRenderer';
import { SoundManager } from './SoundManager';
import {
  buildPlayableLevel,
  type BuiltLevel,
  type Platform,
  type PlayableModeKey,
} from './LevelBuilder';
import { Player } from '../entities/Player';
import {
  breakShieldViaRunicPillar,
  createBoss,
  damageBoss,
  updateBoss,
  type BossInstance,
} from '../entities/Boss';
import { createEnemy, damageEnemy, updateEnemyAI, type EnemyInstance } from '../entities/Enemy';
import {
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
  color: string;
  life: number;
  maxLife: number;
}

interface FloatingText {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

interface ManaTurret {
  x: number;
  y: number;
  life: number;
  fireTimer: number;
}

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
  nanoVials: number;
  maxNanoVials: number;
  shards: number;
  meleeWeapon: WeaponInstance;
  rangedWeapon: WeaponInstance;
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
  private _meleeAnimIsPogo = false;
  private _lastRunStep = -1;
  private _rangedAnimTimer = 0;
  private _scarfPoints: Array<{ x: number; y: number }> = [];
  private _currentAreaId = '';
  private _slashes: SlashVisual[] = [];
  private _floatingTexts: FloatingText[] = [];
  private _turrets: ManaTurret[] = [];
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

  loadPlayableMode(modeKey: PlayableModeKey, keepGear = false) {
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
    this._floatingTexts = [];
    this._turrets = [];
    this._pendingSpawns = [];
    this._manaShieldTimer = 0;
    this._kills = 0;
    this._currentAreaId = '';
    this._lastStyleRank = 'D';
    this._scaleX = 1;
    this._scaleY = 1;

    if (!keepGear) {
      this.player = new Player();
    }

    this.player.x = built.playerSpawn.x;
    this.player.y = built.playerSpawn.y;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.state.hp = this.player.state.maxHp;
    this.player.state.energy = this.player.state.maxEnergy;
    this.player.state.styleRank = 'D';
    this.player.state.stylePoints = 0;

    this._scarfPoints = Array.from({ length: 6 }, () => ({
      x: this.player.x + 7,
      y: this.player.y + 10,
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
    if (this._pylonDamageCooldown > 0) this._pylonDamageCooldown -= dt;
    if (this._bossContactCooldown > 0) this._bossContactCooldown -= dt;
    if (this._bossFlashTimer > 0) this._bossFlashTimer -= dt;
    if (this._meleeAnimTimer > 0) this._meleeAnimTimer = Math.max(0, this._meleeAnimTimer - dt);
    if (this._rangedAnimTimer > 0) this._rangedAnimTimer = Math.max(0, this._rangedAnimTimer - dt);

    // Smooth squash & stretch recovery
    this._scaleX += (1 - this._scaleX) * Math.min(1, dt * 14);
    this._scaleY += (1 - this._scaleY) * Math.min(1, dt * 14);

    this._handlePlayerInput(dt);
    this.player.update(dt);
    this.player.applyGravity(dt);
    this._moveAndCollidePlayer(dt);
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
    const anchorX = this.player.x + this.player.width / 2 + (this.player.facingRight ? -3 : 3);
    const anchorY = this.player.y + 10;
    this._scarfPoints[0].x = anchorX;
    this._scarfPoints[0].y = anchorY;

    const windX = this.player.facingRight ? -4 : 4;
    for (let i = 1; i < this._scarfPoints.length; i++) {
      const prev = this._scarfPoints[i - 1];
      const curr = this._scarfPoints[i];
      const wave = Math.sin(this._animTime * 10 + i * 0.9) * 1.1;
      const targetX = prev.x + windX * 0.65;
      const targetY = prev.y + 1.2 + wave;
      curr.x += (targetX - curr.x) * Math.min(1, dt * 18);
      curr.y += (targetY - curr.y) * Math.min(1, dt * 18);
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
  private _handlePlayerInput(_dt: number) {
    const p = this.player;

    let moveDir = 0;
    if (this.input.isHeld('move_left')) moveDir -= 1;
    if (this.input.isHeld('move_right')) moveDir += 1;
    p.moveHorizontal(moveDir);

    if (this.input.isJustPressed('drop_down') && p.onGround) {
      this._dropThroughTimer = 0.22;
    }

    if (this.input.isJustPressed('jump')) {
      const wasOnGround = p.onGround;
      const jumped = p.jump();
      if (jumped) {
        this._scaleX = 0.78;
        this._scaleY = 1.24;
        this.sound.play(wasOnGround ? 'jump' : 'double_jump');
        this.particles.emit('mana_dust', p.x + p.width / 2, p.y + p.height, -Math.PI / 2);
      }
    }
    if (this.input.isJustReleased('jump')) {
      p.releaseJump();
    }

    if (this.input.isJustPressed('dash')) {
      if (p.dash()) {
        this._scaleX = 1.28;
        this._scaleY = 0.78;
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

    if (this.input.isJustPressed('adrenaline')) {
      if (p.activateAdrenaline()) {
        this.sound.play('adrenaline_burst');
        this.triggerShake(4, 0.25);
        this._spawnFloatingText(p.x + 7, p.y - 14, 'ADRENALINE!', '#F97316');
      }
    }

    if (this.input.isJustPressed('melee')) {
      if (p.meleeAttack()) {
        this._performMelee();
      }
    }

    if (this.input.isJustPressed('ranged')) {
      if (p.rangedAttack()) {
        this._performRanged();
      }
    }

    if (this.input.isJustPressed('interact')) {
      this._handleInteract();
    }
  }

  private _performMelee() {
    const p = this.player;
    const weaponId = p.state.meleeWeapon.defId;
    const isPogo = !p.onGround && this.input.isHeld('drop_down');
    this._meleeAnimTimer = 0.16;
    this._meleeAnimIsPogo = isPogo;
    this._scaleX = 1.12;
    this._scaleY = 0.92;

    if (weaponId === 'dual_sword') this.sound.play('dual_slash');
    else if (weaponId === 'axe') this.sound.play('axe_hit');
    else this.sound.play('sword_slash');

    const radius = weaponId === 'axe' ? 30 : 24;
    const rangeW = weaponId === 'axe' ? 34 : 28;
    const rangeH = isPogo ? 28 : 26;
    const hx = isPogo
      ? p.x - (rangeW - p.width) / 2
      : p.facingRight
        ? p.x + p.width - 2
        : p.x - rangeW + 2;
    const hy = isPogo ? p.y + p.height - 4 : p.y + 2;

    const color =
      weaponId === 'axe' ? '#EF4444' : weaponId === 'dual_sword' ? '#00F0FF' : '#F97316';

    this._slashes.push({
      x: isPogo ? p.x + p.width / 2 : p.x + p.width / 2 + (p.facingRight ? 6 : -6),
      y: isPogo ? p.y + p.height : p.y + p.height * 0.45,
      radius,
      isPogo,
      facingRight: p.facingRight,
      comboStep: p.meleeCombo,
      color,
      life: 0.15,
      maxLife: 0.15,
    });

    this.particles.emit(
      'slash_trail',
      hx + rangeW / 2,
      hy + rangeH / 2,
      isPogo ? Math.PI / 2 : p.facingRight ? 0 : Math.PI
    );

    let hitSomething = false;
    const isArmorBreak = weaponId === 'axe';
    const baseDmg = p.getMeleeDamage();
    const isCrit = weaponId === 'dual_sword' && Math.random() < 0.15;
    const finalDmg = isCrit ? Math.round(baseDmg * 1.5) : baseDmg;

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      if (_aabb(hx, hy, rangeW, rangeH, enemy.x, enemy.y, enemy.width, enemy.height)) {
        hitSomething = true;
        const killed = damageEnemy(enemy, finalDmg, isArmorBreak);
        enemy.vx = (p.facingRight ? 1 : -1) * (isArmorBreak ? 140 : 65);
        p.onMeleeHit();
        this.particles.emit('hit_spark', enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
        this._spawnFloatingText(
          enemy.x + enemy.width / 2,
          enemy.y - 4,
          isCrit ? `${finalDmg}!` : `${finalDmg}`,
          isCrit ? '#FACC15' : '#FFFFFF'
        );
        if (killed) this._onEnemyKilled(enemy);
        else this.sound.play('enemy_hit');
      }
    }

    if (this.boss && this.boss.hp > 0) {
      const b = this.boss;
      if (_aabb(hx, hy, rangeW, rangeH, b.x, b.y, b.width, b.height)) {
        hitSomething = true;
        this._bossFlashTimer = 0.09;
        const killed = damageBoss(b, finalDmg);
        p.onMeleeHit();
        this.particles.emit('hit_spark', b.x + b.width / 2, b.y + b.height / 2);
        this._spawnFloatingText(
          b.x + b.width / 2,
          b.y - 8,
          b.shieldActive ? `SHIELD -${finalDmg}` : `${finalDmg}`,
          b.shieldActive ? '#00F0FF' : '#FACC15'
        );
        if (killed) this._onBossDefeated();
        else this.sound.play('enemy_hit');
      }
    }

    if (isPogo && this.level) {
      for (const sp of this.level.spikes) {
        if (_aabb(hx, hy, rangeW, rangeH, sp.x, sp.y, sp.w, sp.h)) {
          hitSomething = true;
          this.particles.emit('hit_spark', hx + rangeW / 2, sp.y);
          break;
        }
      }
    }

    if (hitSomething) {
      this.triggerHitstop(weaponId === 'axe' ? 4 : 2);
      if (isPogo && p.pogoSlash()) {
        this._scaleX = 0.82;
        this._scaleY = 1.22;
        this.sound.play('pogo_bounce');
        this._spawnFloatingText(p.x + 7, p.y - 4, 'POGO!', '#00F0FF');
      }
    }
  }

  private _performRanged() {
    const p = this.player;
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
          prevBottom <= plat.y + 4 &&
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

    if (landed) {
      if (!wasOnGround) {
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
    const dead = this.player.takeDamage(amount);
    this.sound.play('player_hit');
    this.triggerShake(4, 0.18);
    this._spawnFloatingText(this.player.x + 7, this.player.y - 6, `-${amount}`, '#EF4444');
    if (dead) {
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
    this.sound.play('boss_roar');
    this.triggerShake(6, 0.45);
    this.particles.emit(
      'explosion',
      this.boss.x + this.boss.width / 2,
      this.boss.y + this.boss.height / 2
    );
    this._kills += 5;
    this.player.state.shards += 150;
    this.onToast?.(
      `${this.boss.def.name} DIKALAHKAN! +150 Shards! Masuk Exit Gate di kanan!`
    );
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
        for (const e of this.enemies) {
          if (!e.alive || proj.hitTargets.has(e.id)) continue;
          if (_aabb(proj.x, proj.y, proj.width, proj.height, e.x, e.y, e.width, e.height)) {
            proj.hitTargets.add(e.id);
            const killed = damageEnemy(e, proj.damage, false);
            this.particles.emit('hit_spark', proj.x, proj.y);
            this._spawnFloatingText(e.x + e.width / 2, e.y - 4, `${proj.damage}`, '#FACC15');
            if (killed) this._onEnemyKilled(e);
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
      } else {
        const p = this.player;
        if (_aabb(proj.x, proj.y, proj.width, proj.height, p.x, p.y, p.width, p.height)) {
          this._damagePlayer(proj.damage);
          proj.alive = false;
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

      if (loot.weaponId) {
        const inst: WeaponInstance = {
          defId: loot.weaponId,
          tier: loot.weaponTier ?? 'common',
        };
        this.player.state.weaponInventory.push(inst);
        this.player.equipWeapon(inst);
        unlockedNames.push(WEAPONS[loot.weaponId]?.name ?? loot.weaponId);
      }
      if (loot.armorId) {
        if (!this.player.state.armorInventory.includes(loot.armorId)) {
          this.player.state.armorInventory.push(loot.armorId);
        }
        this.player.equipArmor(loot.armorId);
        unlockedNames.push(ARMORS[loot.armorId]?.name ?? loot.armorId);
      }

      this.onToast?.(`Chest Terbuka: ${unlockedNames.join(' & ')} (otomatis terpasang!)`);
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
    for (let i = this._floatingTexts.length - 1; i >= 0; i--) {
      const f = this._floatingTexts[i];
      f.y += f.vy * dt;
      f.life -= dt;
      if (f.life <= 0) this._floatingTexts.splice(i, 1);
    }
  }

  private _spawnFloatingText(x: number, y: number, text: string, color: string) {
    this._floatingTexts.push({ x, y, vy: -28, text, color, life: 0.65, maxLife: 0.65 });
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
      this._renderTorches(ctx);
      this._renderPlatforms(ctx, this.level.platforms);
      this._renderBouncePads(ctx);
      this._renderSpikes(ctx);
      this._renderPortals(ctx);
      this._renderInteractables(ctx);
      this._renderTurrets(ctx);
      this._renderEnemies(ctx);
      this._renderBoss(ctx);
      this._renderScarf(ctx);
      this._renderPlayer(ctx);
      this._renderSlashes(ctx);
      this._renderProjectiles(ctx);
      this.particles.render(ctx);
      this._renderFloatingTexts(ctx);
    }

    ctx.restore();

    if (this.player.isAdrenalineActive) {
      ctx.strokeStyle = 'rgba(249, 115, 22, 0.55)';
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, GAME_WIDTH - 4, GAME_HEIGHT - 4);
    }
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
    for (const plat of platforms) {
      if (plat.kind === 'wall') {
        ctx.fillStyle = '#232733';
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        ctx.fillStyle = '#4A3F35';
        ctx.fillRect(plat.x, plat.y, 2, plat.h);
        ctx.fillRect(plat.x + plat.w - 2, plat.y, 2, plat.h);
      } else if (plat.oneWay) {
        ctx.fillStyle = '#4A3F35';
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        ctx.fillStyle = '#00F0FF';
        ctx.fillRect(plat.x, plat.y, plat.w, 2);
      } else {
        ctx.fillStyle = '#191D28';
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        ctx.fillStyle = '#2E3446';
        ctx.fillRect(plat.x, plat.y, plat.w, 4);
        ctx.fillStyle = '#4A3F35';
        for (let bx = plat.x; bx < plat.x + plat.w; bx += 18) {
          ctx.fillRect(bx, plat.y + 4, 1, Math.min(12, plat.h - 4));
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

  private _renderEnemies(ctx: CanvasRenderingContext2D) {
    const walkToggle = Math.floor(this._animTime * 8) % 2 === 1;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const flash = e.hitFlashTimer > 0;
      const scale = e.defId === 'rift_brute' ? 1.5 : 1;

      if (e.defId === 'rift_drone') {
        const frame = this.sprites.render(
          'enemy_drone',
          RIFT_DRONE_SPRITE,
          ENEMY_PALETTES.rift_drone,
          1,
          flash
        );
        this.sprites.draw(ctx, frame, e.x + e.width / 2, e.y + e.height, !e.facingRight);
      } else {
        const pal = ENEMY_PALETTES[e.defId] ?? ENEMY_PALETTES.mana_husk;
        const moving = Math.abs(e.vx) > 5;
        const mat = moving && walkToggle ? MANA_HUSK_WALK : MANA_HUSK_SPRITE;
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
      }

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

    ctx.save();
    // Boss silhouette / armored colossus body
    ctx.fillStyle = flash
      ? '#FFFFFF'
      : b.def.id === 'aetherion'
        ? '#1E1B4B'
        : b.def.id === 'forge_titan'
          ? '#451A03'
          : '#2B2F3A';
    ctx.fillRect(Math.round(b.x), Math.round(b.y), b.width, b.height);

    // Armored rim & glowing core
    ctx.strokeStyle = isTelegraph ? '#EF4444' : isStunned ? '#00F0FF' : '#A855F7';
    ctx.lineWidth = 2;
    ctx.strokeRect(Math.round(b.x), Math.round(b.y), b.width, b.height);

    // Visor eyes facing player
    const eyeX = b.facingRight ? b.x + b.width - 14 : b.x + 4;
    ctx.fillStyle = isStunned ? '#00F0FF' : '#F97316';
    ctx.fillRect(Math.round(eyeX), Math.round(b.y + 8), 10, 4);

    // Core
    ctx.fillStyle = flash ? '#FFFFFF' : '#A855F7';
    ctx.fillRect(Math.round(b.x + b.width / 2 - 6), Math.round(b.y + 18), 12, 12);

    // Mana Shield bubble
    if (b.shieldActive) {
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(b.x + b.width / 2, b.y + b.height / 2, b.width * 0.72, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (isStunned) {
      ctx.fillStyle = '#00F0FF';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('STUNNED!', b.x + b.width / 2, b.y - 6);
    }
    ctx.restore();
  }

  private _renderScarf(ctx: CanvasRenderingContext2D) {
    if (this._scarfPoints.length < 2) return;
    const armor = ARMORS[this.player.state.armorId] ?? ARMORS.recruit_mk1;
    ctx.save();
    ctx.strokeStyle = armor.palette.glow;
    ctx.lineCap = 'square';
    for (let i = 0; i < this._scarfPoints.length - 1; i++) {
      ctx.lineWidth = Math.max(1, 3 - Math.floor(i / 2));
      ctx.beginPath();
      ctx.moveTo(Math.round(this._scarfPoints[i].x), Math.round(this._scarfPoints[i].y));
      ctx.lineTo(Math.round(this._scarfPoints[i + 1].x), Math.round(this._scarfPoints[i + 1].y));
      ctx.stroke();
    }
    ctx.restore();
  }

  private _renderPlayer(ctx: CanvasRenderingContext2D) {
    const p = this.player;
    const armor = ARMORS[p.state.armorId] ?? ARMORS.recruit_mk1;
    const moving = Math.abs(p.vx) > 10 && p.onGround;
    const runPhase = Math.floor(this._animTime * 13) % 4;

    let mat = MC_IDLE;
    let poseKey = 'idle';
    let sy = this._scaleY;
    let handBobY = 0;

    if (this._meleeAnimTimer > 0 && p.onGround) {
      mat = MC_ATTACK;
      poseKey = 'attack';
      handBobY = 1;
    } else if (p.isWallSliding) {
      mat = MC_WALL_SLIDE;
      poseKey = 'wall';
    } else if (!p.onGround) {
      if (p.vy < 20) {
        mat = MC_JUMP_UP;
        poseKey = 'jump_up';
        handBobY = -1;
      } else {
        mat = MC_FALL;
        poseKey = 'fall';
      }
    } else if (moving) {
      const runFrames = [MC_RUN_1, MC_RUN_2, MC_RUN_3, MC_RUN_4];
      mat = runFrames[runPhase];
      poseKey = `run_${runPhase}`;
      handBobY = runPhase === 0 || runPhase === 2 ? 1 : 0;
      if ((runPhase === 0 || runPhase === 2) && this._lastRunStep !== runPhase) {
        this._lastRunStep = runPhase;
        this.particles.emit('mana_dust', p.x + p.width / 2, p.y + p.height, -Math.PI / 2);
      }
    } else {
      this._lastRunStep = -1;
      sy *= 1 + Math.sin(this._animTime * 4) * 0.025;
      handBobY = Math.sin(this._animTime * 4) > 0.5 ? 1 : 0;
    }

    if (p.isInvincible && !p.isDashing && Math.floor(this._animTime * 20) % 2 === 0) {
      ctx.globalAlpha = 0.45;
    }

    const frame = this.sprites.render(`mc_${armor.id}_${poseKey}`, mat, armor.palette, 1);
    this.sprites.draw(
      ctx,
      frame,
      p.x + p.width / 2,
      p.y + p.height,
      !p.facingRight,
      this._scaleX,
      sy
    );

    // Draw right-hand armored forearm & active weapon in front of torso
    const shoulderX = p.x + p.width / 2 + (p.facingRight ? 2 : -2);
    const shoulderY = p.y + 14 + handBobY;
    if (this._meleeAnimTimer > 0) {
      const prog = 1 - this._meleeAnimTimer / 0.16;
      drawWeaponInHand(
        ctx,
        p.state.meleeWeapon.defId,
        shoulderX,
        shoulderY,
        p.facingRight,
        armor.palette,
        prog,
        p.meleeCombo,
        this._meleeAnimIsPogo
      );
    } else {
      const recoil = this._rangedAnimTimer > 0 ? 3 : 0;
      const showWeapon =
        this._rangedAnimTimer > 0 ? p.state.rangedWeapon.defId : p.state.meleeWeapon.defId;
      drawWeaponInHand(
        ctx,
        showWeapon,
        shoulderX,
        shoulderY,
        p.facingRight,
        armor.palette,
        0,
        p.meleeCombo,
        false,
        recoil
      );
    }

    ctx.globalAlpha = 1;

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
      const alpha = Math.max(0, 1 - progress * 0.75);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(Math.round(s.x), Math.round(s.y));
      if (s.isPogo) {
        ctx.rotate(Math.PI / 2);
      } else if (!s.facingRight) {
        ctx.scale(-1, 1);
      }

      const reverse = s.comboStep % 2 === 1;
      const angStart = reverse ? Math.PI * 0.52 : -Math.PI * 0.55;
      const angSpan = reverse ? -Math.PI * 1.05 : Math.PI * 1.08;
      const curEnd = angStart + angSpan * Math.min(1, progress * 1.65);
      const a0 = Math.min(angStart, curEnd);
      const a1 = Math.max(angStart, curEnd);

      // Bold tapered crescent blade polygon
      const outerR = s.radius + 3;
      const innerR = s.radius - 5;
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
        // Taper sharply at both tips (t=0 and t=1)
        const taper = Math.sin(t * Math.PI);
        const r = outerR - (outerR - innerR) * taper;
        ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
      }
      ctx.closePath();
      ctx.fill();

      // Razor white leading crescent highlight
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, outerR - 1, a0 + (a1 - a0) * 0.15, a1 - (a1 - a0) * 0.15);
      ctx.stroke();

      ctx.restore();
    }
  }

  private _renderProjectiles(ctx: CanvasRenderingContext2D) {
    for (const proj of this.projectiles) {
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
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    for (const f of this._floatingTexts) {
      ctx.globalAlpha = Math.max(0, f.life / f.maxLife);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, Math.round(f.x), Math.round(f.y));
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
