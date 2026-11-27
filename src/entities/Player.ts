// ============================================================
// RIFTBOUND: SLAYER CORPS — Player Entity
// Silksong-inspired acceleration, apex hang, variable jump cut,
// wall-jump momentum lock, Dagger starter + stored Ammo Packs.
// ============================================================

import type { ArmorId, PlayerState, StyleRank, WeaponInstance } from '../types';
import { WEAPONS } from '../data/weapons';
import { ARMORS } from '../data/armors';
import { TIER_DAMAGE_MULT } from '../types';

// ── Physics Constants ───────────────────────────────────────
const GRAVITY = 880;
const APEX_GRAVITY = 420;      // lighter gravity near jump apex (|vy| < 50)
const JUMP_HOLD_GRAVITY = 480;
const MOVE_SPEED = 165;
const GROUND_ACCEL = 1500;
const GROUND_DECEL = 1800;
const AIR_ACCEL = 1100;
const AIR_DECEL = 600;
const JUMP_VELOCITY = -335;
const DOUBLE_JUMP_VEL = -295;
const DASH_SPEED = 415;
const DASH_DURATION = 0.15;
const DASH_COOLDOWN = 0.48;
const WALL_SLIDE_SPEED = 55;
const WALL_JUMP_VEL_X = 210;
const WALL_JUMP_VEL_Y = -315;
const POGO_BOUNCE_VEL = -355;
const MAX_FALL_SPEED = 480;
const COYOTE_TIME = 0.10;
const JUMP_BUFFER = 0.11;

const STYLE_THRESHOLDS: { rank: StyleRank; points: number }[] = [
  { rank: 'D',   points: 0 },
  { rank: 'C',   points: 50 },
  { rank: 'B',   points: 120 },
  { rank: 'A',   points: 220 },
  { rank: 'S',   points: 350 },
  { rank: 'SS',  points: 500 },
  { rank: 'SSS', points: 700 },
];

const STYLE_DECAY_RATE = 14;
const STYLE_HIT_PENALTY = 75;
const STYLE_KILL_BONUS = 30;
const STYLE_COMBO_BONUS = 5;
const STYLE_VARIETY_MULT = 1.5;

export class Player {
  public x = 100;
  public y = 200;
  public vx = 0;
  public vy = 0;
  public width = 14;
  public height = 28;
  public facingRight = true;
  public onGround = false;
  public onWall = false;
  public wallDir = 0;

  private _canDoubleJump = true;
  private _dashTimer = 0;
  private _dashCooldown = 0;
  private _isDashing = false;
  private _dashDirX = 0;
  private _coyoteTimer = 0;
  private _jumpBufferTimer = 0;
  private _wallJumpLockTimer = 0;
  private _isWallSliding = false;
  private _isJumpHeld = false;

  private _meleeTimer = 0;
  private _rangedTimer = 0;
  public meleeCombo = 0;
  private _comboResetTimer = 0;
  private _iFrames = 0;
  private _lastAttackType: 'melee' | 'ranged' | 'pogo' | 'dash_attack' | null = null;

  private _adrenalineBurstTimer = 0;
  private _adrenalineActive = false;

  public state: PlayerState;

  constructor(initialState?: Partial<PlayerState>) {
    this.state = {
      hp: 100,
      maxHp: 100,
      energy: 100,
      maxEnergy: 100,
      ammoPacks: 2,
      maxAmmoPacks: 6,
      shards: 0,
      nanoVials: 3,
      maxNanoVials: 5,
      meleeWeapon: { defId: 'dagger', tier: 'common' },
      rangedWeapon: { defId: 'pistol', tier: 'common' },
      armorId: 'recruit_mk1',
      styleRank: 'D',
      stylePoints: 0,
      adrenaline: 0,
      weaponInventory: [
        { defId: 'dagger', tier: 'common' },
        { defId: 'pistol', tier: 'common' },
      ],
      armorInventory: ['recruit_mk1'],
      ...initialState,
    };

    this._applyArmor();
  }

  private _applyArmor() {
    const armor = ARMORS[this.state.armorId];
    if (!armor) return;
    this.state.maxHp = 100 + armor.hpBonus;
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

  addWeaponToInventory(weapon: WeaponInstance) {
    const tierOrder = { common: 0, rare: 1, epic: 2 };
    const existingIdx = this.state.weaponInventory.findIndex((w) => w.defId === weapon.defId);
    if (existingIdx >= 0) {
      if (tierOrder[weapon.tier] > tierOrder[this.state.weaponInventory[existingIdx].tier]) {
        this.state.weaponInventory[existingIdx] = weapon;
      }
    } else {
      this.state.weaponInventory.push(weapon);
    }
  }

  update(dt: number) {
    this._updateTimers(dt);
    this._updateStyleDecay(dt);
    this._updateAdrenaline(dt);
    // Gentle passive Energy Cell trickle (+2/s)
    this.state.energy = Math.min(this.state.maxEnergy, this.state.energy + 2 * dt);
  }

  private _updateTimers(dt: number) {
    if (this._meleeTimer > 0) this._meleeTimer -= dt;
    if (this._rangedTimer > 0) this._rangedTimer -= dt;
    if (this._dashCooldown > 0) this._dashCooldown -= dt;
    if (this._iFrames > 0) this._iFrames -= dt;
    if (this._coyoteTimer > 0) this._coyoteTimer -= dt;
    if (this._jumpBufferTimer > 0) this._jumpBufferTimer -= dt;
    if (this._wallJumpLockTimer > 0) this._wallJumpLockTimer -= dt;
    if (this._comboResetTimer > 0) {
      this._comboResetTimer -= dt;
      if (this._comboResetTimer <= 0) this.meleeCombo = 0;
    }
  }

  // ── Smooth Weighted Horizontal Movement ─────────────────
  moveHorizontal(dir: number, dt = 1 / 60) {
    if (this._isDashing || this._wallJumpLockTimer > 0) return;
    const armor = ARMORS[this.state.armorId];
    const maxSpeed = MOVE_SPEED * (armor?.speedMult ?? 1) * (this._adrenalineActive ? 1.3 : 1);
    const targetVx = dir * maxSpeed;

    const accel = this.onGround
      ? dir !== 0
        ? GROUND_ACCEL
        : GROUND_DECEL
      : dir !== 0
        ? AIR_ACCEL
        : AIR_DECEL;

    if (this.vx < targetVx) {
      this.vx = Math.min(targetVx, this.vx + accel * dt);
    } else if (this.vx > targetVx) {
      this.vx = Math.max(targetVx, this.vx - accel * dt);
    }

    if (dir !== 0) this.facingRight = dir > 0;
  }

  jump() {
    if (this.onGround || this._coyoteTimer > 0) {
      this.vy = JUMP_VELOCITY;
      this.onGround = false;
      this._coyoteTimer = 0;
      this._isJumpHeld = true;
      this._canDoubleJump = true;
      return true;
    }
    if (this._isWallSliding) {
      this.vx = -this.wallDir * WALL_JUMP_VEL_X;
      this.vy = WALL_JUMP_VEL_Y;
      this.facingRight = this.wallDir < 0;
      this._wallJumpLockTimer = 0.13;
      this._isWallSliding = false;
      this._canDoubleJump = true;
      return true;
    }
    if (this._canDoubleJump) {
      this.vy = DOUBLE_JUMP_VEL;
      this._canDoubleJump = false;
      this._isJumpHeld = true;
      return true;
    }
    this._jumpBufferTimer = JUMP_BUFFER;
    return false;
  }

  releaseJump() {
    this._isJumpHeld = false;
    // Snappy variable jump cut when releasing early
    if (this.vy < -80) {
      this.vy *= 0.48;
    }
  }

  dash() {
    if (this._dashCooldown > 0) return false;
    const armor = ARMORS[this.state.armorId];
    this._isDashing = true;
    this._dashTimer = DASH_DURATION;
    this._dashCooldown = DASH_COOLDOWN * (armor?.dashCdMult ?? 1);
    this._dashDirX = this.facingRight ? 1 : -1;
    this._iFrames = DASH_DURATION;
    this.vy = 0;
    return true;
  }

  meleeAttack(): boolean {
    if (this._meleeTimer > 0) return false;
    const def = WEAPONS[this.state.meleeWeapon.defId];
    if (!def) return false;

    const adrMult = this._adrenalineActive ? 0.7 : 1;
    this._meleeTimer = (def.attackCooldown / 60) * adrMult;
    this._comboResetTimer = 0.45;
    this.meleeCombo = (this.meleeCombo + 1) % 3;

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

  /** Consume a stored Ammo Pack to refill +60 Energy Cell */
  useAmmoPack(): boolean {
    if (this.state.ammoPacks <= 0) return false;
    if (this.state.energy >= this.state.maxEnergy) return false;
    this.state.ammoPacks--;
    this.state.energy = Math.min(this.state.maxEnergy, this.state.energy + 60);
    return true;
  }

  pogoSlash(): boolean {
    if (this.onGround) return false;
    this.vy = POGO_BOUNCE_VEL;
    this._canDoubleJump = true;
    const variety = this._lastAttackType !== 'pogo' ? STYLE_VARIETY_MULT : 1;
    this.addStylePoints(STYLE_COMBO_BONUS * 2 * variety);
    this._lastAttackType = 'pogo';
    return true;
  }

  onMeleeHit() {
    const def = WEAPONS[this.state.meleeWeapon.defId];
    const restoreMap: Record<string, number> = {
      dagger: 11,
      sword: 10,
      axe: 14,
      dual_sword: 8,
    };
    const restore = restoreMap[def?.id ?? 'dagger'] ?? 10;
    this.state.energy = Math.min(this.state.maxEnergy, this.state.energy + restore);
  }

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

  takeDamage(amount: number): boolean {
    if (this._iFrames > 0) return false;
    const armor = ARMORS[this.state.armorId];
    const defReduction = 1 - (armor?.defPercent ?? 0) / 100;
    const finalDmg = Math.max(1, Math.round(amount * defReduction));
    this.state.hp = Math.max(0, this.state.hp - finalDmg);
    this._iFrames = 1.0;
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
    if (this.state.armorId === 'aether_praetor') {
      this.state.hp = Math.min(this.state.maxHp, this.state.hp + 1);
    }
    if (!this._adrenalineActive) {
      this.state.adrenaline = Math.min(100, this.state.adrenaline + 8);
    }
  }

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

  getShardMultiplier(): number {
    const mult: Record<StyleRank, number> = {
      D: 1, C: 1.2, B: 1.5, A: 1.8, S: 2.2, SS: 2.6, SSS: 3,
    };
    return mult[this.state.styleRank];
  }

  activateAdrenaline(): boolean {
    if (this.state.adrenaline < 100) return false;
    this._adrenalineActive = true;
    this._adrenalineBurstTimer = 8;
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

    const nearApex = !this.onGround && Math.abs(this.vy) < 48;
    const grav = nearApex
      ? APEX_GRAVITY
      : this._isJumpHeld && this.vy < 0
        ? JUMP_HOLD_GRAVITY
        : GRAVITY;
    this.vy += grav * dt;

    if (this._isWallSliding && this.vy > 0) {
      this.vy = Math.min(this.vy, WALL_SLIDE_SPEED);
    }

    this.vy = Math.min(this.vy, MAX_FALL_SPEED);
  }

  onLand() {
    this.onGround = true;
    this._canDoubleJump = true;
    this._coyoteTimer = 0;

    if (this._jumpBufferTimer > 0) {
      this._jumpBufferTimer = 0;
      this.jump();
    }
  }

  onLeaveGround() {
    this.onGround = false;
    this._coyoteTimer = COYOTE_TIME;
  }

  onTouchWall(dir: number) {
    this.onWall = true;
    this.wallDir = dir;
    this._isWallSliding = !this.onGround && this.vy > 0;
    if (this._isWallSliding) {
      this._canDoubleJump = true;
    }
  }

  onLeaveWall() {
    this.onWall = false;
    this._isWallSliding = false;
  }
}
