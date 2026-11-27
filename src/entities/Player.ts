// ============================================================
// RIFTBOUND: SLAYER CORPS — Player Entity
// Silksong-inspired movement + DOOM aggressive dual-weapon combat
// ============================================================

import type { ArmorId, PlayerState, StyleRank, WeaponInstance } from '../types';
import { WEAPONS } from '../data/weapons';
import { ARMORS } from '../data/armors';
import { TIER_DAMAGE_MULT } from '../types';

// ── Physics Constants ───────────────────────────────────────
const GRAVITY = 900;         // px/s²
const MOVE_SPEED = 160;      // px/s
const JUMP_VELOCITY = -320;  // px/s (negative = upward)
const JUMP_HOLD_GRAVITY = 450; // reduced gravity while holding jump (variable jump)
const DOUBLE_JUMP_VEL = -280;
const DASH_SPEED = 400;      // px/s
const DASH_DURATION = 0.15;  // seconds
const DASH_COOLDOWN = 0.5;   // seconds
const WALL_SLIDE_SPEED = 60; // max fall speed on wall
const WALL_JUMP_VEL_X = 200;
const WALL_JUMP_VEL_Y = -300;
const POGO_BOUNCE_VEL = -350;
const MAX_FALL_SPEED = 500;
const COYOTE_TIME = 0.08;   // seconds of grace after leaving platform
const JUMP_BUFFER = 0.1;    // seconds of pre-jump input buffer

// ── Style Rank Thresholds ───────────────────────────────────
const STYLE_THRESHOLDS: { rank: StyleRank; points: number }[] = [
  { rank: 'D',   points: 0 },
  { rank: 'C',   points: 50 },
  { rank: 'B',   points: 120 },
  { rank: 'A',   points: 220 },
  { rank: 'S',   points: 350 },
  { rank: 'SS',  points: 500 },
  { rank: 'SSS', points: 700 },
];

const STYLE_DECAY_RATE = 15;      // points/second passive decay
const STYLE_HIT_PENALTY = 80;     // points lost when taking damage
const STYLE_KILL_BONUS = 30;      // points per kill
const STYLE_COMBO_BONUS = 5;      // points per hit (varies by weapon)
const STYLE_VARIETY_MULT = 1.5;   // multiplier for using different attack types

export class Player {
  // ── Position & Physics ──────────────────────────────────
  public x = 100;
  public y = 200;
  public vx = 0;
  public vy = 0;
  public width = 14;      // collision box (smaller than sprite)
  public height = 28;
  public facingRight = true;
  public onGround = false;
  public onWall = false;
  public wallDir = 0;     // -1 = wall on left, 1 = wall on right

  // ── Movement State ──────────────────────────────────────
  private _canDoubleJump = true;
  private _dashTimer = 0;
  private _dashCooldown = 0;
  private _isDashing = false;
  private _dashDirX = 0;
  private _coyoteTimer = 0;
  private _jumpBufferTimer = 0;
  private _isWallSliding = false;
  private _isJumpHeld = false;

  // ── Combat State ────────────────────────────────────────
  private _meleeTimer = 0;    // cooldown remaining
  private _rangedTimer = 0;
  public meleeCombo = 0;      // 0, 1, 2 for 3-hit combo
  private _comboResetTimer = 0;
  private _iFrames = 0;       // invincibility frames remaining (seconds)
  private _lastAttackType: 'melee' | 'ranged' | 'pogo' | 'dash_attack' | null = null;

  // ── Adrenaline ──────────────────────────────────────────
  private _adrenalineBurstTimer = 0;
  private _adrenalineActive = false;

  // ── Player Stats (mutable) ──────────────────────────────
  public state: PlayerState;

  constructor(initialState?: Partial<PlayerState>) {
    this.state = {
      hp: 100,
      maxHp: 100,
      energy: 100,
      maxEnergy: 100,
      shards: 0,
      nanoVials: 3,
      maxNanoVials: 5,
      meleeWeapon: { defId: 'sword', tier: 'common' },
      rangedWeapon: { defId: 'pistol', tier: 'common' },
      armorId: 'recruit_mk1',
      styleRank: 'D',
      stylePoints: 0,
      adrenaline: 0,
      weaponInventory: [
        { defId: 'sword', tier: 'common' },
        { defId: 'pistol', tier: 'common' },
      ],
      armorInventory: ['recruit_mk1'],
      ...initialState,
    };

    // Apply armor bonuses
    this._applyArmor();
  }

  // ── Armor Application ───────────────────────────────────
  private _applyArmor() {
    const armor = ARMORS[this.state.armorId];
    if (!armor) return;
    this.state.maxHp = 100 + armor.hpBonus;
    // Don't reduce current HP when switching armor
    this.state.hp = Math.min(this.state.hp, this.state.maxHp);
  }

  equipArmor(armorId: ArmorId) {
    if (!this.state.armorInventory.includes(armorId)) return;
    this.state.armorId = armorId;
    this._applyArmor();
  }

  equipWeapon(weapon: WeaponInstance) {
    const def = WEAPONS[weapon.defId];
    if (!def) return;
    if (def.slot === 'melee') {
      this.state.meleeWeapon = weapon;
    } else {
      this.state.rangedWeapon = weapon;
    }
  }

  // ── Core Update (called at 60fps fixed timestep) ────────
  update(dt: number) {
    this._updateTimers(dt);
    this._updateStyleDecay(dt);
    this._updateAdrenaline(dt);
  }

  private _updateTimers(dt: number) {
    if (this._meleeTimer > 0) this._meleeTimer -= dt;
    if (this._rangedTimer > 0) this._rangedTimer -= dt;
    if (this._dashCooldown > 0) this._dashCooldown -= dt;
    if (this._iFrames > 0) this._iFrames -= dt;
    if (this._coyoteTimer > 0) this._coyoteTimer -= dt;
    if (this._jumpBufferTimer > 0) this._jumpBufferTimer -= dt;
    if (this._comboResetTimer > 0) {
      this._comboResetTimer -= dt;
      if (this._comboResetTimer <= 0) this.meleeCombo = 0;
    }
  }

  // ── Movement Actions ────────────────────────────────────
  moveHorizontal(dir: number) {
    if (this._isDashing) return;
    const armor = ARMORS[this.state.armorId];
    const speed = MOVE_SPEED * (armor?.speedMult ?? 1);
    const adrMult = this._adrenalineActive ? 1.3 : 1;
    this.vx = dir * speed * adrMult;
    if (dir !== 0) this.facingRight = dir > 0;
  }

  jump() {
    // Coyote time or on ground
    if (this.onGround || this._coyoteTimer > 0) {
      this.vy = JUMP_VELOCITY;
      this.onGround = false;
      this._coyoteTimer = 0;
      this._isJumpHeld = true;
      this._canDoubleJump = true;
      return true;
    }
    // Wall jump
    if (this._isWallSliding) {
      this.vx = -this.wallDir * WALL_JUMP_VEL_X;
      this.vy = WALL_JUMP_VEL_Y;
      this.facingRight = this.wallDir < 0;
      this._isWallSliding = false;
      this._canDoubleJump = true;
      return true;
    }
    // Double jump
    if (this._canDoubleJump) {
      this.vy = DOUBLE_JUMP_VEL;
      this._canDoubleJump = false;
      this._isJumpHeld = true;
      return true;
    }
    // Buffer jump
    this._jumpBufferTimer = JUMP_BUFFER;
    return false;
  }

  releaseJump() {
    this._isJumpHeld = false;
  }

  dash() {
    if (this._dashCooldown > 0) return false;
    const armor = ARMORS[this.state.armorId];
    this._isDashing = true;
    this._dashTimer = DASH_DURATION;
    this._dashCooldown = DASH_COOLDOWN * (armor?.dashCdMult ?? 1);
    this._dashDirX = this.facingRight ? 1 : -1;
    this._iFrames = DASH_DURATION; // i-frames during dash
    this.vy = 0; // cancel vertical velocity during dash
    return true;
  }

  // ── Combat Actions ──────────────────────────────────────
  meleeAttack(): boolean {
    if (this._meleeTimer > 0) return false;
    const def = WEAPONS[this.state.meleeWeapon.defId];
    if (!def) return false;

    const adrMult = this._adrenalineActive ? 0.7 : 1; // faster attacks
    this._meleeTimer = (def.attackCooldown / 60) * adrMult;
    this._comboResetTimer = 0.4;
    this.meleeCombo = (this.meleeCombo + 1) % 3;

    // Style variety bonus
    const variety = this._lastAttackType !== 'melee' ? STYLE_VARIETY_MULT : 1;
    this.addStylePoints(STYLE_COMBO_BONUS * variety);
    this._lastAttackType = 'melee';

    return true;
  }

  rangedAttack(): boolean {
    if (this._rangedTimer > 0) return false;
    const def = WEAPONS[this.state.rangedWeapon.defId];
    if (!def) return false;

    const armor = ARMORS[this.state.armorId];
    const energyCost = def.energyCost * (armor?.energyCostMult ?? 1);
    if (this.state.energy < energyCost) return false;

    this.state.energy -= energyCost;
    const adrMult = this._adrenalineActive ? 0.7 : 1;
    this._rangedTimer = (def.attackCooldown / 60) * adrMult;

    const variety = this._lastAttackType !== 'ranged' ? STYLE_VARIETY_MULT : 1;
    this.addStylePoints(STYLE_COMBO_BONUS * variety);
    this._lastAttackType = 'ranged';

    return true;
  }

  pogoSlash(): boolean {
    if (this.onGround) return false;
    // Pogo bounces MC upward
    this.vy = POGO_BOUNCE_VEL;
    const variety = this._lastAttackType !== 'pogo' ? STYLE_VARIETY_MULT : 1;
    this.addStylePoints(STYLE_COMBO_BONUS * 2 * variety);
    this._lastAttackType = 'pogo';
    return true;
  }

  /** Called when melee hit connects — restores energy */
  onMeleeHit() {
    const def = WEAPONS[this.state.meleeWeapon.defId];
    const restoreMap: Record<string, number> = {
      sword: 8,
      dual_sword: 5,
      axe: 12,
    };
    const restore = restoreMap[def?.id ?? 'sword'] ?? 8;
    this.state.energy = Math.min(this.state.maxEnergy, this.state.energy + restore);
  }

  /** Calculate damage for current weapon */
  getMeleeDamage(): number {
    const def = WEAPONS[this.state.meleeWeapon.defId];
    if (!def) return 0;
    const tierMult = TIER_DAMAGE_MULT[this.state.meleeWeapon.tier];
    const adrMult = this._adrenalineActive ? 1.5 : 1;
    const armorMult = this.state.armorId === 'aether_praetor' ? 1.15 : 1;
    return Math.round(def.baseDamage * def.hitsPerAttack * tierMult * adrMult * armorMult);
  }

  getRangedDamage(): number {
    const def = WEAPONS[this.state.rangedWeapon.defId];
    if (!def) return 0;
    const tierMult = TIER_DAMAGE_MULT[this.state.rangedWeapon.tier];
    const adrMult = this._adrenalineActive ? 1.5 : 1;
    const armorMult = this.state.armorId === 'aether_praetor' ? 1.15 : 1;
    return Math.round(def.baseDamage * tierMult * adrMult * armorMult);
  }

  // ── Damage & Healing ────────────────────────────────────
  takeDamage(amount: number): boolean {
    if (this._iFrames > 0) return false;
    const armor = ARMORS[this.state.armorId];
    const defReduction = 1 - (armor?.defPercent ?? 0) / 100;
    const finalDmg = Math.max(1, Math.round(amount * defReduction));
    this.state.hp = Math.max(0, this.state.hp - finalDmg);
    this._iFrames = 1.0; // 1 second invincibility
    // Style penalty
    this.addStylePoints(-STYLE_HIT_PENALTY);
    return this.state.hp <= 0;
  }

  heal(): boolean {
    if (this.state.nanoVials <= 0) return false;
    if (this.state.hp >= this.state.maxHp) return false;
    this.state.nanoVials--;
    this.state.hp = Math.min(this.state.maxHp, this.state.hp + 35);
    return true;
  }

  onKill() {
    this.addStylePoints(STYLE_KILL_BONUS);
    // Aether-Forge Praetor passive: +1 HP per kill
    if (this.state.armorId === 'aether_praetor') {
      this.state.hp = Math.min(this.state.maxHp, this.state.hp + 1);
    }
    // Adrenaline gain on kill
    if (!this._adrenalineActive) {
      this.state.adrenaline = Math.min(100, this.state.adrenaline + 8);
    }
  }

  // ── Style Rank System ───────────────────────────────────
  addStylePoints(points: number) {
    this.state.stylePoints = Math.max(0, this.state.stylePoints + points);
    this._updateStyleRank();
  }

  private _updateStyleDecay(dt: number) {
    if (this.state.stylePoints > 0) {
      this.state.stylePoints = Math.max(0, this.state.stylePoints - STYLE_DECAY_RATE * dt);
      this._updateStyleRank();
    }
  }

  private _updateStyleRank() {
    let newRank: StyleRank = 'D';
    for (const t of STYLE_THRESHOLDS) {
      if (this.state.stylePoints >= t.points) newRank = t.rank;
    }
    this.state.styleRank = newRank;
  }

  /** Shard multiplier based on current style rank */
  getShardMultiplier(): number {
    const mult: Record<StyleRank, number> = {
      D: 1, C: 1.2, B: 1.5, A: 1.8, S: 2.2, SS: 2.6, SSS: 3,
    };
    return mult[this.state.styleRank];
  }

  // ── Adrenaline Burst ────────────────────────────────────
  activateAdrenaline(): boolean {
    if (this.state.adrenaline < 100) return false;
    this._adrenalineActive = true;
    this._adrenalineBurstTimer = 8; // 8 seconds
    this.state.adrenaline = 0;
    return true;
  }

  private _updateAdrenaline(dt: number) {
    if (this._adrenalineActive) {
      this._adrenalineBurstTimer -= dt;
      if (this._adrenalineBurstTimer <= 0) {
        this._adrenalineActive = false;
      }
    }
  }

  get isAdrenalineActive() {
    return this._adrenalineActive;
  }

  get adrenalineBurstTimeLeft() {
    return this._adrenalineBurstTimer;
  }

  get isDashing() {
    return this._isDashing;
  }

  get isInvincible() {
    return this._iFrames > 0;
  }

  get isWallSliding() {
    return this._isWallSliding;
  }

  // ── Physics Integration (called by GameEngine) ──────────
  applyGravity(dt: number) {
    if (this._isDashing) {
      this._dashTimer -= dt;
      if (this._dashTimer <= 0) {
        this._isDashing = false;
      } else {
        this.vx = this._dashDirX * DASH_SPEED;
        return;
      }
    }

    // Variable jump: reduced gravity while holding jump + moving up
    const grav = this._isJumpHeld && this.vy < 0 ? JUMP_HOLD_GRAVITY : GRAVITY;
    this.vy += grav * dt;

    // Wall slide: cap fall speed
    if (this._isWallSliding && this.vy > 0) {
      this.vy = Math.min(this.vy, WALL_SLIDE_SPEED);
    }

    // Terminal velocity
    this.vy = Math.min(this.vy, MAX_FALL_SPEED);
  }

  /** Called when MC lands on ground */
  onLand() {
    this.onGround = true;
    this._canDoubleJump = true;
    this._coyoteTimer = 0;

    // Check jump buffer
    if (this._jumpBufferTimer > 0) {
      this._jumpBufferTimer = 0;
      this.jump();
    }
  }

  /** Called when MC leaves ground (without jumping) */
  onLeaveGround() {
    this.onGround = false;
    this._coyoteTimer = COYOTE_TIME;
  }

  /** Called when MC touches a wall */
  onTouchWall(dir: number) {
    this.onWall = true;
    this.wallDir = dir;
    this._isWallSliding = !this.onGround && this.vy > 0;
    if (this._isWallSliding) {
      this._canDoubleJump = true; // reset double jump on wall
    }
  }

  onLeaveWall() {
    this.onWall = false;
    this._isWallSliding = false;
  }
}
