// ============================================================
// RIFTBOUND: SLAYER CORPS — Player Entity
// Balanced Energy Economy (NO passive OP regen; earn EN via hits,
// parries, drops, or [R] Ammo Packs) + 1H Gun vs 2H+Shield rules.
// ============================================================

import type {
  ArmorId,
  PlayerState,
  SavedGearState,
  StyleRank,
  WeaponId,
  WeaponInstance,
} from '../types';
import {
  WEAPONS,
  WEAPON_LEVEL_DMG_MULT,
  WEAPON_UPGRADE_COST,
  getWeaponLevel,
  isLightRangedCompatibleMelee,
} from '../data/weapons';
import { ARMORS } from '../data/armors';
import { TIER_DAMAGE_MULT } from '../types';
import { applyLoadoutEquipRule } from '../engine/combatRules';

const GRAVITY = 880;
const APEX_GRAVITY = 420;
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
const DASH_COOLDOWN = 0.5;
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
const STYLE_COMBO_BONUS = 6;
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
  private _dashThrustCooldown = 0;
  /** Current step inside 3-hit melee combo: 0 (none), 1, 2, 3 */
  public meleeCombo = 0;
  private _comboResetTimer = 0;
  private _iFrames = 0;
  private _lastAttackType: 'melee' | 'ranged' | 'pogo' | 'dash_attack' | 'parry' | 'slam' | null = null;

  private _isBlocking = false;
  private _parryWindowTimer = 0;
  private _counterWindowTimer = 0;
  public lastAttackWasCounter = false;

  private _adrenalineBurstTimer = 0;
  private _adrenalineActive = false;
  private _regenTimer = 0;

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
      meleeWeapon: { defId: 'needle', tier: 'common', level: 1 },
      rangedWeapon: null,
      armorId: 'recruit_mk1',
      styleRank: 'D',
      stylePoints: 0,
      adrenaline: 0,
      weaponInventory: [
        { defId: 'needle', tier: 'common', level: 1 },
        { defId: 'dagger', tier: 'common', level: 1 },
        { defId: 'pistol', tier: 'common', level: 1 },
      ],
      armorInventory: ['recruit_mk1'],
      ...initialState,
    };

    this.state.meleeWeapon = { level: 1, ...this.state.meleeWeapon };
    if (this.state.rangedWeapon) {
      this.state.rangedWeapon = { level: 1, ...this.state.rangedWeapon };
    }
    if (!isLightRangedCompatibleMelee(this.state.meleeWeapon.defId)) {
      // Enforce 2H loadout consistency cleanly on restore
      this.state.rangedWeapon = null;
    }
    this.state.weaponInventory = this.state.weaponInventory.map((w) => ({
      level: 1,
      ...w,
    }));

    this._applyArmor();
  }

  private _applyArmor() {
    const armor = ARMORS[this.state.armorId];
    if (!armor) return;
    this.state.maxHp = 100 + armor.hpBonus;
    this.state.hp = Math.min(this.state.hp, this.state.maxHp);
  }

  /** Heavy 2H+Shield mode grants full off-hand Energy Shield (unless dual_sword or light 1H sidearm). */
  get hasFullEnergyShield(): boolean {
    return (
      !isLightRangedCompatibleMelee(this.state.meleeWeapon.defId) &&
      this.state.meleeWeapon.defId !== 'dual_sword'
    );
  }

  exportSavedGear(): SavedGearState {
    return {
      ammoPacks: this.state.ammoPacks,
      nanoVials: this.state.nanoVials,
      shards: this.state.shards,
      meleeWeapon: { ...this.state.meleeWeapon },
      rangedWeapon: this.state.rangedWeapon ? { ...this.state.rangedWeapon } : null,
      armorId: this.state.armorId,
      weaponInventory: this.state.weaponInventory.map((w) => ({ ...w })),
      armorInventory: [...this.state.armorInventory],
    };
  }

  equipArmor(armorId: ArmorId) {
    if (!this.state.armorInventory.includes(armorId)) return;
    this.state.armorId = armorId;
    this._applyArmor();
  }

  /**
   * Equip Melee or Gun following strict loadout rule:
   * - Pure Melee weapons CANNOT equip a Gun (Right-Click / [K] = Dash Thrust).
   * - Equipping any Gun automatically locks Melee to the short Combat Dagger.
   */
  equipWeapon(weapon: WeaponInstance): { notice?: string } {
    const res = applyLoadoutEquipRule(
      {
        meleeWeapon: this.state.meleeWeapon,
        rangedWeapon: this.state.rangedWeapon,
        weaponInventory: this.state.weaponInventory,
      },
      weapon
    );
    this.state.meleeWeapon = res.meleeWeapon;
    this.state.rangedWeapon = res.rangedWeapon;
    this.state.weaponInventory = res.weaponInventory;
    return res.notice ? { notice: res.notice } : {};
  }

  unequipRanged() {
    this.state.rangedWeapon = null;
  }

  get isMeleeOnlyMode(): boolean {
    return this.state.rangedWeapon === null;
  }

  get dashThrustCooldown(): number {
    return this._dashThrustCooldown;
  }

  addOrUpgradeWeapon(incoming: WeaponInstance): {
    action: 'added' | 'upgraded' | 'maxed';
    weapon: WeaponInstance;
  } {
    const tierOrder = { common: 0, rare: 1, epic: 2 };
    const idx = this.state.weaponInventory.findIndex((w) => w.defId === incoming.defId);

    if (idx < 0) {
      const created: WeaponInstance = {
        defId: incoming.defId,
        tier: incoming.tier,
        level: getWeaponLevel(incoming),
      };
      this.state.weaponInventory.push(created);
      return { action: 'added', weapon: created };
    }

    const prev = this.state.weaponInventory[idx];
    const prevLv = getWeaponLevel(prev);
    const nextLv = Math.min(3, Math.max(prevLv, getWeaponLevel(incoming)) + 1);
    const bestTier =
      tierOrder[incoming.tier] > tierOrder[prev.tier] ? incoming.tier : prev.tier;

    const updated: WeaponInstance = {
      defId: incoming.defId,
      tier: bestTier,
      level: nextLv,
    };
    this.state.weaponInventory[idx] = updated;
    this._syncEquippedCopy(updated);

    return {
      action: nextLv > prevLv || bestTier !== prev.tier ? 'upgraded' : 'maxed',
      weapon: updated,
    };
  }

  upgradeWeaponLevel(weaponId: WeaponId): { upgraded: boolean; weapon: WeaponInstance | null } {
    const idx = this.state.weaponInventory.findIndex((w) => w.defId === weaponId);
    if (idx < 0) return { upgraded: false, weapon: null };
    const prev = this.state.weaponInventory[idx];
    const prevLv = getWeaponLevel(prev);
    if (prevLv >= 3) return { upgraded: false, weapon: prev };

    const updated: WeaponInstance = {
      ...prev,
      level: prevLv + 1,
      tier: prevLv + 1 >= 2 && prev.tier === 'common' ? 'rare' : prev.tier,
    };
    this.state.weaponInventory[idx] = updated;
    this._syncEquippedCopy(updated);
    return { upgraded: true, weapon: updated };
  }

  upgradeWeaponWithShards(weaponId: WeaponId): {
    ok: boolean;
    reason?: string;
    weapon?: WeaponInstance;
  } {
    const idx = this.state.weaponInventory.findIndex((w) => w.defId === weaponId);
    if (idx < 0) return { ok: false, reason: 'Senjata belum dimiliki.' };

    const prev = this.state.weaponInventory[idx];
    const curLv = getWeaponLevel(prev);
    if (curLv >= 3) return { ok: false, reason: 'Sudah mencapai Level MAX (Lv.3)!' };

    const cost = WEAPON_UPGRADE_COST[curLv] ?? 80;
    if (this.state.shards < cost) {
      return { ok: false, reason: `Shards kurang! Butuh ${cost} Shards.` };
    }

    this.state.shards -= cost;
    const nextLv = curLv + 1;
    const updated: WeaponInstance = {
      ...prev,
      level: nextLv,
      tier:
        nextLv === 3 && prev.tier !== 'epic'
          ? 'epic'
          : nextLv === 2 && prev.tier === 'common'
            ? 'rare'
            : prev.tier,
    };
    this.state.weaponInventory[idx] = updated;
    this._syncEquippedCopy(updated);
    return { ok: true, weapon: updated };
  }

  private _syncEquippedCopy(updated: WeaponInstance) {
    if (this.state.meleeWeapon.defId === updated.defId) {
      this.state.meleeWeapon = { ...updated };
    }
    if (this.state.rangedWeapon && this.state.rangedWeapon.defId === updated.defId) {
      this.state.rangedWeapon = { ...updated };
    }
  }

  update(dt: number) {
    this._updateTimers(dt);
    this._updateStyleDecay(dt);
    this._updateAdrenaline(dt);
    const armor = ARMORS[this.state.armorId];
    if (armor?.regenInterval && this.onGround && this.state.hp > 0 && this.state.hp < this.state.maxHp) {
      this._regenTimer += dt;
      if (this._regenTimer >= armor.regenInterval) {
        this._regenTimer = 0;
        this.state.hp = Math.min(this.state.maxHp, this.state.hp + 1);
      }
    } else {
      this._regenTimer = 0;
    }
    // No passive infinite Energy trickle — Energy comes from Melee hits, Parries, Orbs & Ammo Packs!
  }

  private _updateTimers(dt: number) {
    if (this._meleeTimer > 0) this._meleeTimer -= dt;
    if (this._rangedTimer > 0) this._rangedTimer -= dt;
    if (this._dashThrustCooldown > 0) {
      this._dashThrustCooldown = Math.max(0, this._dashThrustCooldown - dt);
    }
    if (this._dashCooldown > 0) this._dashCooldown -= dt;
    if (this._iFrames > 0) this._iFrames -= dt;
    if (this._coyoteTimer > 0) this._coyoteTimer -= dt;
    if (this._jumpBufferTimer > 0) this._jumpBufferTimer -= dt;
    if (this._wallJumpLockTimer > 0) this._wallJumpLockTimer -= dt;
    if (this._parryWindowTimer > 0) this._parryWindowTimer = Math.max(0, this._parryWindowTimer - dt);
    if (this._counterWindowTimer > 0) {
      this._counterWindowTimer = Math.max(0, this._counterWindowTimer - dt);
    }
    if (this._comboResetTimer > 0) {
      this._comboResetTimer -= dt;
      if (this._comboResetTimer <= 0) this.meleeCombo = 0;
    }
  }

  // ── Guard / Block & Parry ───────────────────────────────
  setBlocking(active: boolean) {
    if (active && !this._isBlocking && !this._isDashing) {
      const armor = ARMORS[this.state.armorId];
      const parryBonus = armor?.parryBonus ?? 0;
      this._isBlocking = true;
      this._parryWindowTimer = (this.hasFullEnergyShield ? 0.25 : 0.2) + parryBonus;
    } else if (!active && this._isBlocking) {
      this._isBlocking = false;
      this._parryWindowTimer = 0;
    }
  }

  get isBlocking() {
    return this._isBlocking;
  }

  get isParryWindow() {
    return this._isBlocking && this._parryWindowTimer > 0;
  }

  get counterReady() {
    return this._counterWindowTimer > 0;
  }

  resolveIncomingHit(amount: number): {
    outcome: 'ignored' | 'parry' | 'blocked' | 'hit';
    finalDamage: number;
  } {
    if (this._iFrames > 0) {
      return { outcome: 'ignored', finalDamage: 0 };
    }

    if (this._isBlocking) {
      if (this._parryWindowTimer > 0) {
        this._parryWindowTimer = 0;
        this._counterWindowTimer = 0.85;
        this.state.energy = Math.min(this.state.maxEnergy, this.state.energy + 12);
        this.addStylePoints(28);
        this._lastAttackType = 'parry';
        this._iFrames = 0.3;
        return { outcome: 'parry', finalDamage: 0 };
      }

      const shieldCost = this.hasFullEnergyShield ? 6 : 9;
      if (this.state.energy >= shieldCost) {
        this.state.energy -= shieldCost;
        this._counterWindowTimer = 0.65;
        this.addStylePoints(8);
        this._iFrames = 0.22;
        if (this.hasFullEnergyShield) {
          return { outcome: 'blocked', finalDamage: 0 };
        }
        // Light 1H/Dual guard lets 25% chip through
        const lightChip = Math.max(1, Math.round(amount * 0.25));
        this.state.hp = Math.max(0, this.state.hp - lightChip);
        return { outcome: 'blocked', finalDamage: lightChip };
      }

      const guardChip = Math.max(1, Math.round(amount * 0.45));
      this.state.hp = Math.max(0, this.state.hp - guardChip);
      this._counterWindowTimer = 0.35;
      this._iFrames = 0.45;
      return { outcome: 'blocked', finalDamage: guardChip };
    }

    const armor = ARMORS[this.state.armorId];
    const defReduction = 1 - (armor?.defPercent ?? 0) / 100;
    const finalDmg = Math.max(1, Math.round(amount * defReduction));
    this.state.hp = Math.max(0, this.state.hp - finalDmg);
    this._iFrames = 1.0;
    this.addStylePoints(-STYLE_HIT_PENALTY);
    return { outcome: 'hit', finalDamage: finalDmg };
  }

  // ── Smooth Weighted Horizontal Movement ─────────────────
  moveHorizontal(dir: number, dt = 1 / 60) {
    if (this._isDashing || this._wallJumpLockTimer > 0) return;
    const armor = ARMORS[this.state.armorId];
    const blockMult = this._isBlocking ? 0.45 : 1;
    const maxSpeed =
      MOVE_SPEED * (armor?.speedMult ?? 1) * (this._adrenalineActive ? 1.3 : 1) * blockMult;
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

  jump(): 'ground' | 'wall' | 'double' | null {
    this.setBlocking(false);
    if (this.onGround || this._coyoteTimer > 0) {
      this.vy = JUMP_VELOCITY;
      this.onGround = false;
      this._coyoteTimer = 0;
      this._isJumpHeld = true;
      this._canDoubleJump = true;
      return 'ground';
    }
    if (this._isWallSliding) {
      this.vx = -this.wallDir * WALL_JUMP_VEL_X;
      this.vy = WALL_JUMP_VEL_Y;
      this.facingRight = this.wallDir < 0;
      this._wallJumpLockTimer = 0.13;
      this._isWallSliding = false;
      this._canDoubleJump = true;
      return 'wall';
    }
    if (this._canDoubleJump) {
      this.vy = DOUBLE_JUMP_VEL;
      this._canDoubleJump = false;
      this._isJumpHeld = true;
      return 'double';
    }
    this._jumpBufferTimer = JUMP_BUFFER;
    return null;
  }

  releaseJump() {
    this._isJumpHeld = false;
    if (this.vy < -80) {
      this.vy *= 0.48;
    }
  }

  dash() {
    if (this._dashCooldown > 0) return false;
    this.setBlocking(false);
    const armor = ARMORS[this.state.armorId];
    this._isDashing = true;
    this._dashTimer = DASH_DURATION;
    this._dashCooldown = DASH_COOLDOWN * (armor?.dashCdMult ?? 1);
    this._dashDirX = this.facingRight ? 1 : -1;
    this._iFrames = DASH_DURATION;
    this.vy = 0;
    return true;
  }

  grantBriefIFrames(seconds: number) {
    this._iFrames = Math.max(this._iFrames, seconds);
  }

  meleeAttack(): boolean {
    if (this._meleeTimer > 0) return false;
    const def = WEAPONS[this.state.meleeWeapon.defId];
    if (!def) return false;

    this.setBlocking(false);
    this.lastAttackWasCounter = this._counterWindowTimer > 0;
    this._counterWindowTimer = 0;

    this.meleeCombo = (this.meleeCombo % 3) + 1;
    const armor = ARMORS[this.state.armorId];
    const armorSpeedMult = armor?.attackSpeedMult ?? 1;
    const adrMult = this._adrenalineActive ? 0.72 : 1;
    const lv = getWeaponLevel(this.state.meleeWeapon);
    const lvSpeedMult = lv === 3 ? 0.86 : lv === 2 ? 0.93 : 1;
    // Deliberate, readable combo pacing so Hit 1 / 2 / 3 are visually distinct
    const comboCooldownMult = this.meleeCombo === 3 ? 1.35 : this.meleeCombo === 2 ? 1.15 : 0.96;
    this._meleeTimer =
      (def.attackCooldown / 60) * adrMult * lvSpeedMult * armorSpeedMult * comboCooldownMult;
    this._comboResetTimer = 1.0;

    const variety = this._lastAttackType !== 'melee' ? STYLE_VARIETY_MULT : 1;
    const comboBonus = this.meleeCombo === 3 ? 10 : this.meleeCombo === 2 ? 7 : STYLE_COMBO_BONUS;
    this.addStylePoints(comboBonus * variety + (this.lastAttackWasCounter ? 10 : 0));
    this._lastAttackType = 'melee';
    return true;
  }

  /** Right-Click / [K] special lunge in Melee-Only mode */
  triggerDashThrust(): boolean {
    if (this._dashThrustCooldown > 0) return false;
    this.setBlocking(false);
    const armor = ARMORS[this.state.armorId];
    const adrMult = this._adrenalineActive ? 0.72 : 1;
    this._dashThrustCooldown = 0.52 * (armor?.dashCdMult ?? 1) * adrMult;
    this._meleeTimer = Math.max(this._meleeTimer, 0.22);
    this._iFrames = Math.max(this._iFrames, 0.16);
    const variety = this._lastAttackType !== 'dash_attack' ? STYLE_VARIETY_MULT : 1;
    this.addStylePoints(14 * variety);
    this._lastAttackType = 'dash_attack';
    return true;
  }

  /** Jump-Hit Tap (Spin Vertical) — allowed anytime airborne off melee cooldown */
  triggerAirSpin(): boolean {
    if (this._meleeTimer > 0) return false;
    const def = WEAPONS[this.state.meleeWeapon.defId];
    if (!def) return false;
    this.setBlocking(false);
    const adrMult = this._adrenalineActive ? 0.72 : 1;
    this._meleeTimer = Math.max(0.24, (def.attackCooldown / 60) * 1.1) * adrMult;
    const variety = this._lastAttackType !== 'pogo' ? STYLE_VARIETY_MULT : 1;
    this.addStylePoints(10 * variety);
    this._lastAttackType = 'pogo';
    return true;
  }

  /** Jump-Hit Hold (Aerial Slam) */
  triggerAerialSlam(): boolean {
    this.setBlocking(false);
    this._meleeTimer = 0.28;
    const variety = this._lastAttackType !== 'slam' ? STYLE_VARIETY_MULT : 1;
    this.addStylePoints(16 * variety);
    this._lastAttackType = 'slam';
    return true;
  }

  rangedAttack(): { fired: boolean; reason?: 'no_gun' | 'cooldown' | 'no_energy' } {
    if (!this.state.rangedWeapon) {
      return { fired: false, reason: 'no_gun' };
    }
    if (this._rangedTimer > 0) return { fired: false, reason: 'cooldown' };
    this.setBlocking(false);
    const def = WEAPONS[this.state.rangedWeapon.defId];
    if (!def) return { fired: false, reason: 'no_gun' };

    const armor = ARMORS[this.state.armorId];
    const energyCost = def.energyCost * (armor?.energyCostMult ?? 1);
    if (this.state.energy < energyCost) {
      return { fired: false, reason: 'no_energy' };
    }

    this.state.energy -= energyCost;
    const adrMult = this._adrenalineActive ? 0.7 : 1;
    const lv = getWeaponLevel(this.state.rangedWeapon);
    const lvSpeedMult = lv === 3 ? 0.85 : lv === 2 ? 0.92 : 1;
    const armorSpeedMult = armor?.attackSpeedMult ?? 1;
    this._rangedTimer = (def.attackCooldown / 60) * adrMult * lvSpeedMult * armorSpeedMult;

    const variety = this._lastAttackType !== 'ranged' ? STYLE_VARIETY_MULT : 1;
    this.addStylePoints(STYLE_COMBO_BONUS * variety);
    this._lastAttackType = 'ranged';
    return { fired: true };
  }

  useAmmoPack(): boolean {
    if (this.state.ammoPacks <= 0) return false;
    if (this.state.energy >= this.state.maxEnergy) return false;
    this.state.ammoPacks--;
    this.state.energy = Math.min(this.state.maxEnergy, this.state.energy + 60);
    return true;
  }

  pogoSlash(): boolean {
    if (this.onGround) return false;
    // Silksong Crimson Silk-Needle grants an extra crisp pogo bounce!
    const isNeedle = this.state.meleeWeapon.defId === 'needle';
    this.vy = isNeedle ? POGO_BOUNCE_VEL * 1.1 : POGO_BOUNCE_VEL;
    this._canDoubleJump = true;
    const variety = this._lastAttackType !== 'pogo' ? STYLE_VARIETY_MULT : 1;
    this.addStylePoints(STYLE_COMBO_BONUS * 2 * variety);
    this._lastAttackType = 'pogo';
    return true;
  }

  onMeleeHit() {
    // Tactical Energy gain on hit (4-7 EN) + Recruit Cloak +15% bonus
    const def = WEAPONS[this.state.meleeWeapon.defId];
    const restoreMap: Record<string, number> = {
      needle: 5,
      dagger: 6,
      sword: 5,
      spear: 4,
      katana: 5,
      axe: 6,
      hammer: 6,
      dual_sword: 4,
    };
    const base = restoreMap[def?.id ?? 'needle'] ?? 5;
    const lvBonus = getWeaponLevel(this.state.meleeWeapon) >= 3 ? 1 : 0;
    const armorBonus = this.state.armorId === 'recruit_mk1' ? 1 : 0;
    this.state.energy = Math.min(this.state.maxEnergy, this.state.energy + base + lvBonus + armorBonus);
  }

  getMeleeCritChance(): number {
    const def = WEAPONS[this.state.meleeWeapon.defId];
    const armor = ARMORS[this.state.armorId];
    return Math.min(0.65, (def?.critChance ?? 0.1) + (armor?.critBonus ?? 0));
  }

  getRangedCritChance(): number {
    if (!this.state.rangedWeapon) return 0.08;
    const def = WEAPONS[this.state.rangedWeapon.defId];
    const armor = ARMORS[this.state.armorId];
    return Math.min(0.6, (def?.critChance ?? 0.1) + (armor?.critBonus ?? 0));
  }

  getPogoDamageMultiplier(): number {
    const armor = ARMORS[this.state.armorId];
    const needleBonus = this.state.meleeWeapon.defId === 'needle' ? 0.15 : 0;
    return 1 + (armor?.pogoBonus ?? 0) + needleBonus;
  }

  getMeleeDamage(): number {
    const def = WEAPONS[this.state.meleeWeapon.defId];
    if (!def) return 0;
    const tierMult = TIER_DAMAGE_MULT[this.state.meleeWeapon.tier];
    const levelMult = WEAPON_LEVEL_DMG_MULT[getWeaponLevel(this.state.meleeWeapon)] ?? 1;
    const adrMult = this._adrenalineActive ? 1.5 : 1;
    const armorMult = this.state.armorId === 'aether_praetor' ? 1.15 : 1;
    const comboMult = this.meleeCombo === 3 ? 1.4 : this.meleeCombo === 2 ? 1.18 : 1.0;
    const counterMult = this.lastAttackWasCounter ? 1.25 : 1;
    return Math.round(
      def.baseDamage *
        def.hitsPerAttack *
        tierMult *
        levelMult *
        adrMult *
        armorMult *
        comboMult *
        counterMult
    );
  }

  getRangedDamage(): number {
    if (!this.state.rangedWeapon) return 0;
    const def = WEAPONS[this.state.rangedWeapon.defId];
    if (!def) return 0;
    const tierMult = TIER_DAMAGE_MULT[this.state.rangedWeapon.tier];
    const levelMult = WEAPON_LEVEL_DMG_MULT[getWeaponLevel(this.state.rangedWeapon)] ?? 1;
    const adrMult = this._adrenalineActive ? 1.5 : 1;
    const armorMult = this.state.armorId === 'aether_praetor' ? 1.15 : 1;
    return Math.round(def.baseDamage * tierMult * levelMult * adrMult * armorMult);
  }

  takeDamage(amount: number): boolean {
    const res = this.resolveIncomingHit(amount);
    if (res.outcome === 'ignored' || res.outcome === 'parry') return false;
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
      this.state.hp = Math.min(this.state.maxHp, this.state.hp + 2);
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
