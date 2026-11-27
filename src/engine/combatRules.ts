// ============================================================
// RIFTBOUND: SLAYER CORPS — Combat Rules & Realistic Kinematics
// Pure, deterministic combat state rules, visible ranged + quick-draw
// dagger display rules, 2-bone stickman IK grip, wrist-whip weapon
// physics, and blade-driven physical sweep collision geometry.
// ============================================================

import type { MeleeWeaponId, RangedWeaponId, WeaponId, WeaponInstance } from '../types';
import { WEAPONS, getWeaponLevel, isLightRangedCompatibleMelee } from '../data/weapons';

export type CombatMoveType =
  | 'standard_slash'
  | 'spin_horizontal'
  | 'mini_thrust'
  | 'spin_vertical'
  | 'air_slam_windup'
  | 'air_slam_dive'
  | 'air_slam_impact'
  | 'dash_thrust'
  | 'ground_slam_charge'
  | 'ground_slam_impact'
  | 'dual_cross_combo';

export type ResolvedAction = CombatMoveType | 'ranged_fire' | 'none';

export const DASH_THRUST_ENERGY_COST = 18;
export const GROUND_SLAM_ENERGY_COST = 22;
export const DUAL_CROSS_COMBO_ENERGY_COST = 20;

export function canWeaponAirSlam(weaponId: WeaponId): boolean {
  return weaponId !== 'dagger';
}

export function canWeaponDashThrust(weaponId: WeaponId): boolean {
  return weaponId === 'sword' || weaponId === 'katana' || weaponId === 'spear';
}

export function canWeaponGroundSlam(weaponId: WeaponId): boolean {
  return weaponId === 'axe' || weaponId === 'hammer';
}

export function canWeaponDualCombo(weaponId: WeaponId): boolean {
  return weaponId === 'dual_sword';
}

export type RightClickSkillKind =
  | 'ranged'
  | 'dash_thrust'
  | 'ground_slam'
  | 'dual_combo'
  | 'none';

export interface RightClickSkillMeta {
  kind: RightClickSkillKind;
  label: string;
  shortLabel: string;
  inputHint: string;
  energyCost: number;
}

export function getRightClickSkillMeta(
  weaponId: WeaponId,
  hasGun: boolean,
  rangedEnergyCost = 8
): RightClickSkillMeta {
  if (hasGun) {
    return {
      kind: 'ranged',
      label: 'Tembak Range',
      shortLabel: 'GUN',
      inputHint: 'RMB/K',
      energyCost: rangedEnergyCost,
    };
  }
  if (canWeaponDashThrust(weaponId)) {
    return {
      kind: 'dash_thrust',
      label: 'Dash Thrust',
      shortLabel: 'THRUST',
      inputHint: 'RMB/K',
      energyCost: DASH_THRUST_ENERGY_COST,
    };
  }
  if (canWeaponGroundSlam(weaponId)) {
    return {
      kind: 'ground_slam',
      label: 'Ground Slam',
      shortLabel: 'G-SLAM',
      inputHint: 'HOLD RMB/K',
      energyCost: GROUND_SLAM_ENERGY_COST,
    };
  }
  if (canWeaponDualCombo(weaponId)) {
    return {
      kind: 'dual_combo',
      label: 'Dual X-Combo (2x DMG)',
      shortLabel: 'DUAL X',
      inputHint: 'RMB+LMB',
      energyCost: DUAL_CROSS_COMBO_ENERGY_COST,
    };
  }
  return {
    kind: 'none',
    label: 'Kombo Melee Murni',
    shortLabel: 'MELEE',
    inputHint: 'LMB/J',
    energyCost: 0,
  };
}

export interface MoveResolveContext {
  onGround: boolean;
  isHold: boolean;
  isRightClick: boolean;
  hasGun: boolean;
  comboStep: number; // 1, 2, or 3
  weaponId?: WeaponId;
  /** True when RMB + LMB (or K + J) are chorded/chained together */
  isDualChord?: boolean;
}

/**
 * Resolve which combat action executes given player groundedness, input button,
 * hold state, weapon capabilities, and loadout mode (Melee-only vs Ranged+Short-Dagger).
 */
export function resolveCombatAction(ctx: MoveResolveContext): ResolvedAction {
  const wId: WeaponId = ctx.weaponId ?? 'sword';

  // Dual Sword exclusive RMB + LMB extra combo (2x Dual Damage, Energy Cost)
  if (ctx.isDualChord && !ctx.hasGun && canWeaponDualCombo(wId)) {
    return 'dual_cross_combo';
  }

  if (ctx.isRightClick) {
    if (ctx.hasGun) return 'ranged_fire';
    if (canWeaponDashThrust(wId)) return 'dash_thrust';
    if (canWeaponGroundSlam(wId)) {
      if (!ctx.onGround) return 'none';
      return ctx.isHold ? 'ground_slam_impact' : 'ground_slam_charge';
    }
    return 'none';
  }

  if (!ctx.onGround) {
    if (ctx.isHold && canWeaponAirSlam(wId)) {
      return 'air_slam_windup';
    }
    return 'spin_vertical';
  }

  if (ctx.comboStep === 2) return 'spin_horizontal';
  if (ctx.comboStep === 3) return 'mini_thrust';
  return 'standard_slash';
}

export interface DisplayedWeaponState {
  /** Weapon actively visible in the Slayer's hands */
  weaponId: WeaponId;
  /** Visual stance mode */
  mode: 'ranged_primary' | 'melee_quickdraw' | 'melee_primary';
  /** Whether the Short Combat Dagger is visibly sheathed at the waist */
  showHolsteredDagger: boolean;
  /** Whether the equipped Ranged weapon is temporarily slung on back during quick-draw dagger hit */
  showHolsteredRangedOnBack: boolean;
}

/**
 * Determine which weapon is visibly held in hand at any moment:
 * - In Ranged Mode (Pistol / Dual Pistol / Shotgun / Bow / Rifle):
 *   the Ranged weapon is displayed during idle, run, jump, block, and shooting.
 *   The Short Combat Dagger only flashes out into the hand while actively melee-striking!
 * - In Melee-Only Mode: the equipped Melee weapon is always displayed.
 */
export function resolveDisplayedWeapon(params: {
  meleeWeaponId: WeaponId;
  rangedWeaponId: WeaponId | null;
  isMeleeAttacking: boolean;
}): DisplayedWeaponState {
  if (params.rangedWeaponId !== null) {
    if (params.isMeleeAttacking) {
      return {
        weaponId: params.meleeWeaponId,
        mode: 'melee_quickdraw',
        showHolsteredDagger: false,
        showHolsteredRangedOnBack: true,
      };
    }
    return {
      weaponId: params.rangedWeaponId,
      mode: 'ranged_primary',
      showHolsteredDagger: true,
      showHolsteredRangedOnBack: false,
    };
  }

  return {
    weaponId: params.meleeWeaponId,
    mode: 'melee_primary',
    showHolsteredDagger: false,
    showHolsteredRangedOnBack: false,
  };
}

export interface LoadoutStateSlice {
  meleeWeapon: WeaponInstance;
  rangedWeapon: WeaponInstance | null;
  weaponInventory: WeaponInstance[];
}

/**
 * Pure loadout constraint enforcer:
 * - Pure Melee weapons (all melee except short Dagger) CANNOT carry a Ranged weapon.
 * - Equipping any Ranged weapon (Pistol, Dual Pistol, Shotgun, Bow, Rifle)
 *   automatically locks Melee to the short Combat Dagger.
 */
export function applyLoadoutEquipRule(
  current: LoadoutStateSlice,
  incoming: WeaponInstance
): {
  meleeWeapon: WeaponInstance;
  rangedWeapon: WeaponInstance | null;
  weaponInventory: WeaponInstance[];
  notice?: string;
} {
  const def = WEAPONS[incoming.defId];
  if (!def) {
    return {
      meleeWeapon: current.meleeWeapon,
      rangedWeapon: current.rangedWeapon,
      weaponInventory: current.weaponInventory,
    };
  }

  const normalized: WeaponInstance = {
    defId: incoming.defId,
    tier: incoming.tier,
    level: getWeaponLevel(incoming),
  };

  const nextInv = [...current.weaponInventory];
  if (!nextInv.some((w) => w.defId === normalized.defId)) {
    nextInv.push(normalized);
  }

  if (def.slot === 'melee') {
    if (!isLightRangedCompatibleMelee(normalized.defId)) {
      const hadGun = current.rangedWeapon !== null;
      const rSkill = getRightClickSkillMeta(normalized.defId, false);
      const skillHint =
        rSkill.kind === 'none'
          ? 'Mode Melee Murni aktif.'
          : `${rSkill.inputHint} menjadi ${rSkill.label} (${rSkill.energyCost} EN)!`;
      return {
        meleeWeapon: normalized,
        rangedWeapon: null,
        weaponInventory: nextInv,
        notice: hadGun
          ? `Mode Melee (${def.name}): Senjata Range dilepas — ${skillHint}`
          : undefined,
      };
    }
    return {
      meleeWeapon: normalized,
      rangedWeapon: current.rangedWeapon,
      weaponInventory: nextInv,
    };
  }

  // Equipping any Ranged weapon forces Melee to the short Combat Dagger
  let daggerInst = nextInv.find((w) => w.defId === 'dagger');
  if (!daggerInst) {
    daggerInst = { defId: 'dagger', tier: 'common', level: 1 };
    nextInv.push(daggerInst);
  }
  const switchedMelee = current.meleeWeapon.defId !== 'dagger';
  return {
    meleeWeapon: { ...daggerInst, level: getWeaponLevel(daggerInst) },
    rangedWeapon: normalized,
    weaponInventory: nextInv,
    notice: switchedMelee
      ? `Mode Range (${def.name}): Tampil di tangan, Short Dagger keluar otomatis saat hit melee!`
      : undefined,
  };
}

export type WeaponGripStyle = 'one_hand' | 'two_hand' | 'dual' | 'polearm';

/** Per-weapon physical dimensions, handling weight, and move tuning */
export interface WeaponMoveProfile {
  reachScale: number;
  speedScale: number;
  trailColor: string;
  accentColor: string;
  heavy: boolean;
  /** Physical blade/head tip distance from hand grip in logical pixels */
  bladeLengthPx: number;
  /** Distance from hand grip where the sharp edge / head starts */
  bladeBaseOffsetPx: number;
  /** Physical width/thickness of the cutting edge or weapon head */
  bladeWidthPx: number;
  /** How the Slayer physically grips the weapon */
  gripStyle: WeaponGripStyle;
  /** Handle offset where off-hand physically grips on two-handed / polearm weapons */
  offhandGripOffset: number;
  /** Wrist whip inertia (higher = heavier windup drag & snap follow-through) */
  weightLag: number;
}

export const WEAPON_MOVE_PROFILES: Record<MeleeWeaponId, WeaponMoveProfile> = {
  dagger: {
    reachScale: 0.56,
    speedScale: 0.82,
    trailColor: '#00F0FF',
    accentColor: '#F8FAFC',
    heavy: false,
    bladeLengthPx: 6.5,
    bladeBaseOffsetPx: 1.5,
    bladeWidthPx: 2.4,
    gripStyle: 'one_hand',
    offhandGripOffset: 0,
    weightLag: 0.14,
  },
  needle: {
    reachScale: 1.08,
    speedScale: 0.92,
    trailColor: '#F43F5E',
    accentColor: '#FFF1F2',
    heavy: false,
    bladeLengthPx: 22,
    bladeBaseOffsetPx: 2,
    bladeWidthPx: 2.6,
    gripStyle: 'one_hand',
    offhandGripOffset: 0,
    weightLag: 0.2,
  },
  sword: {
    reachScale: 1.0,
    speedScale: 1.0,
    trailColor: '#F97316',
    accentColor: '#FEF3C7',
    heavy: false,
    bladeLengthPx: 18.5,
    bladeBaseOffsetPx: 2,
    bladeWidthPx: 3.4,
    gripStyle: 'two_hand',
    offhandGripOffset: -2.4,
    weightLag: 0.34,
  },
  spear: {
    reachScale: 1.3,
    speedScale: 1.04,
    trailColor: '#00F0FF',
    accentColor: '#E0F2FE',
    heavy: false,
    bladeLengthPx: 24,
    bladeBaseOffsetPx: 11,
    bladeWidthPx: 3.6,
    gripStyle: 'polearm',
    offhandGripOffset: -5.2,
    weightLag: 0.26,
  },
  katana: {
    reachScale: 1.14,
    speedScale: 0.94,
    trailColor: '#EF4444',
    accentColor: '#FEE2E2',
    heavy: false,
    bladeLengthPx: 19.5,
    bladeBaseOffsetPx: 2,
    bladeWidthPx: 2.8,
    gripStyle: 'two_hand',
    offhandGripOffset: -2.6,
    weightLag: 0.3,
  },
  dual_sword: {
    reachScale: 0.96,
    speedScale: 0.88,
    trailColor: '#A855F7',
    accentColor: '#00F0FF',
    heavy: false,
    bladeLengthPx: 16,
    bladeBaseOffsetPx: 2,
    bladeWidthPx: 3.2,
    gripStyle: 'dual',
    offhandGripOffset: 0,
    weightLag: 0.22,
  },
  axe: {
    reachScale: 1.12,
    speedScale: 1.22,
    trailColor: '#F97316',
    accentColor: '#FACC15',
    heavy: true,
    bladeLengthPx: 17,
    bladeBaseOffsetPx: 8,
    bladeWidthPx: 8.5,
    gripStyle: 'two_hand',
    offhandGripOffset: 4.2,
    weightLag: 0.54,
  },
  hammer: {
    reachScale: 1.06,
    speedScale: 1.28,
    trailColor: '#A855F7',
    accentColor: '#FACC15',
    heavy: true,
    bladeLengthPx: 17.5,
    bladeBaseOffsetPx: 7.5,
    bladeWidthPx: 10.5,
    gripStyle: 'two_hand',
    offhandGripOffset: 3.8,
    weightLag: 0.62,
  },
};

export function getWeaponMoveProfile(id: WeaponId): WeaponMoveProfile {
  return (
    WEAPON_MOVE_PROFILES[id as MeleeWeaponId] ?? {
      reachScale: 1.0,
      speedScale: 1.0,
      trailColor: '#F97316',
      accentColor: '#FFFFFF',
      heavy: false,
      bladeLengthPx: 16,
      bladeBaseOffsetPx: 2,
      bladeWidthPx: 3.2,
      gripStyle: 'one_hand',
      offhandGripOffset: 0,
      weightLag: 0.28,
    }
  );
}

// ── Stickman-Inspired Dynamic Kinematic Pose Rig ─────────────

export interface Vec2 {
  x: number;
  y: number;
}

export interface StickmanCombatPose {
  /** Whole-body forward/back lean in radians */
  torsoTilt: number;
  headTilt: number;
  /** Local body offset (x = forward, y = down) */
  bodyOffsetX: number;
  crouchY: number;
  /** Whole-body airborne somersault angle (spin_vertical) */
  bodyRotation: number;
  /** Weapon-side arm 2-bone joints relative to shoulder */
  elbow: Vec2;
  hand: Vec2;
  /** Weapon orientation angle in radians */
  weaponAngle: number;
  /** Weapon draws behind torso during back-half of horizontal spin */
  weaponBehindTorso: boolean;
  /** Off-hand arm 2-bone joints relative to off-shoulder */
  offElbow: Vec2;
  offHand: Vec2;
  /** Optional explicit off-hand weapon angle (used for Dual Sword twin-blade choreography) */
  offWeaponAngle?: number;
  /** True when off-hand is physically gripping the weapon handle/shaft */
  offHandOnWeapon: boolean;
  /** Leg joint targets (hip is at y = -11 + crouchY) */
  frontKnee: Vec2;
  frontFoot: Vec2;
  backKnee: Vec2;
  backFoot: Vec2;
  /** Subtle dynamic stretch */
  squashX: number;
  squashY: number;
}

export interface RangedAimPose {
  mainElbow: Vec2;
  mainHand: Vec2;
  mainWeaponAngle: number;
  offElbow: Vec2;
  offHand: Vec2;
  offWeaponAngle: number;
  /** Draw tension (0..1) for recurve bowstring flex */
  bowDraw: number;
  /** True if weapon is braced two-handed (shotgun, rifle, bow) */
  twoHanded: boolean;
  /** True if off-hand holds a second pistol (dual_pistol) */
  hasOffhandGun: boolean;
  /** Recoil kickback offset in local X */
  recoilX: number;
  /** Subtle muzzle pitch kick */
  recoilTilt: number;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeOutExpo(t: number): number {
  const c = clamp01(t);
  return c === 1 ? 1 : 1 - Math.pow(2, -9 * c);
}

function easeInOutQuad(t: number): number {
  const c = clamp01(t);
  return c < 0.5 ? 2 * c * c : 1 - Math.pow(-2 * c + 2, 2) / 2;
}

/**
 * Analytical 2-bone inverse kinematics solver for realistic elbow bend.
 * Keeps upper-arm (l1) and forearm (l2) physically connected from shoulder to target hand.
 */
export function solveTwoBoneElbow(
  targetX: number,
  targetY: number,
  l1 = 5.4,
  l2 = 5.2,
  bendSign = 1
): Vec2 {
  const distSq = targetX * targetX + targetY * targetY;
  const dist = Math.max(0.5, Math.min(l1 + l2 - 0.1, Math.sqrt(distSq)));
  const baseAng = Math.atan2(targetY, targetX);
  const cosA = Math.max(
    -1,
    Math.min(1, (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist))
  );
  const bendAng = Math.acos(cosA) * bendSign;
  const upperAng = baseAng + bendAng;
  return {
    x: Math.cos(upperAng) * l1,
    y: Math.sin(upperAng) * l1,
  };
}

/**
 * Sample realistic weapon-specific ranged aiming & recoil stance for all 5 Ranged weapons:
 * Pistol, Dual Pistol, Shotgun, Silkstring Recurve Bow, and Rifle.
 */
export function sampleRangedAimPose(
  rangedId: RangedWeaponId,
  recoilProgress: number
): RangedAimPose {
  const rec = clamp01(recoilProgress);
  // Crisp kick curve: peaks immediately after fire, settles smoothly
  const kick = Math.sin(rec * Math.PI);

  switch (rangedId) {
    case 'pistol': {
      const mainHand = { x: 8.6 - kick * 2.2, y: -0.6 - kick * 1.4 };
      return {
        mainElbow: solveTwoBoneElbow(mainHand.x, mainHand.y, 5.2, 5.0, 1),
        mainHand,
        mainWeaponAngle: -kick * 0.24,
        offElbow: { x: -2.2, y: 3.4 },
        offHand: { x: 1.8, y: 4.2 },
        offWeaponAngle: 0,
        bowDraw: 0,
        twoHanded: false,
        hasOffhandGun: false,
        recoilX: -kick * 2.0,
        recoilTilt: -kick * 0.08,
      };
    }

    case 'dual_pistol': {
      // Alternating left/right recoil on twin pistols with crisp vertical separation
      const kickMain = kick;
      const kickOff = Math.sin(clamp01(rec * 1.3 - 0.15) * Math.PI);
      const mainHand = { x: 9.4 - kickMain * 2.2, y: -2.4 - kickMain * 1.2 };
      const offHand = { x: 6.2 - kickOff * 2.0, y: 3.2 - kickOff * 1.0 };
      return {
        mainElbow: solveTwoBoneElbow(mainHand.x, mainHand.y, 5.2, 5.0, 1),
        mainHand,
        mainWeaponAngle: -kickMain * 0.22,
        offElbow: solveTwoBoneElbow(offHand.x + 2, offHand.y, 5.0, 4.8, 1),
        offHand,
        offWeaponAngle: -kickOff * 0.2,
        bowDraw: 0,
        twoHanded: false,
        hasOffhandGun: true,
        recoilX: -kick * 1.8,
        recoilTilt: -kick * 0.07,
      };
    }

    case 'shotgun': {
      // Sturdy two-handed pump-action hold: right hand on grip, left hand forward on pump forend!
      const mainHand = { x: 4.5 - kick * 2.8, y: 1.6 - kick * 1.2 };
      const offHand = { x: 11.2 - kick * 2.4, y: 1.0 - kick * 2.0 };
      return {
        mainElbow: solveTwoBoneElbow(mainHand.x, mainHand.y, 5.0, 4.8, 1),
        mainHand,
        mainWeaponAngle: -kick * 0.3,
        offElbow: solveTwoBoneElbow(offHand.x + 2, offHand.y, 5.4, 5.4, 1),
        offHand,
        offWeaponAngle: -kick * 0.3,
        bowDraw: 0,
        twoHanded: true,
        hasOffhandGun: false,
        recoilX: -kick * 3.0,
        recoilTilt: -kick * 0.14,
      };
    }

    case 'bow': {
      // Archer stance! Front (off) hand holds the recurve bow extended forward,
      // rear (main) hand draws the glowing silkstring back toward the visor/cheek and releases!
      const drawTension = rec > 0 ? Math.max(0, 1 - rec * 2.2) : 0.65;
      const offHand = { x: 9.8, y: -0.8 };
      const mainHand = { x: 4.2 - drawTension * 5.2 + kick * 1.5, y: -1.4 };
      return {
        mainElbow: solveTwoBoneElbow(mainHand.x, mainHand.y, 5.0, 4.8, -1),
        mainHand,
        mainWeaponAngle: 0,
        offElbow: solveTwoBoneElbow(offHand.x + 2, offHand.y, 5.6, 5.4, 1),
        offHand,
        offWeaponAngle: 0,
        bowDraw: drawTension,
        twoHanded: true,
        hasOffhandGun: false,
        recoilX: -kick * 1.4,
        recoilTilt: -kick * 0.05,
      };
    }

    case 'rifle':
    default: {
      // Precision rail-rifle shouldered two-handed marksman stance
      const mainHand = { x: 4.4 - kick * 2.2, y: 0.8 - kick * 0.6 };
      const offHand = { x: 12.2 - kick * 2.0, y: 0.4 - kick * 0.8 };
      return {
        mainElbow: solveTwoBoneElbow(mainHand.x, mainHand.y, 5.0, 4.8, 1),
        mainHand,
        mainWeaponAngle: -kick * 0.16,
        offElbow: solveTwoBoneElbow(offHand.x + 2, offHand.y, 5.8, 5.8, 1),
        offHand,
        offWeaponAngle: -kick * 0.16,
        bowDraw: 0,
        twoHanded: true,
        hasOffhandGun: false,
        recoilX: -kick * 2.4,
        recoilTilt: -kick * 0.09,
      };
    }
  }
}

/**
 * Sample a dynamic, weapon-aware stickman combat pose for any of the 6 core moves.
 * Incorporates real wrist whip inertia (weightLag) and 2-bone analytical IK two-handed
 * handle gripping so swords, katanas, axes, hammers, and spears feel physically wielded!
 */
export function sampleStickmanCombatPose(
  move: CombatMoveType,
  rawProgress: number,
  weaponId: WeaponId = 'sword'
): StickmanCombatPose {
  const p = clamp01(rawProgress);
  const profile = getWeaponMoveProfile(weaponId);
  const wLag = profile.weightLag;
  const isTwoHand = profile.gripStyle === 'two_hand' || profile.gripStyle === 'polearm';

  const attachOffhandToWeapon = (
    pose: StickmanCombatPose,
    shoulderDeltaX: number,
    allowTwoHand = true
  ): StickmanCombatPose => {
    if (!isTwoHand || !allowTwoHand) return pose;
    // Compute exact off-hand world position gripping the weapon shaft/pommel
    const gripOffset = profile.offhandGripOffset;
    const gripX = pose.hand.x + Math.cos(pose.weaponAngle) * gripOffset;
    const gripY = pose.hand.y + Math.sin(pose.weaponAngle) * gripOffset;
    // Convert from main-shoulder local to off-shoulder local (+shoulderDeltaX)
    const relX = gripX + shoulderDeltaX;
    const relY = gripY;
    return {
      ...pose,
      offHand: { x: relX, y: relY },
      offElbow: solveTwoBoneElbow(relX, relY, 5.2, 5.0, 1),
      offHandOnWeapon: true,
    };
  };

  switch (move) {
    // ── 1. SLASH STANDAR (Windup high -> Whip snap -> Low follow-through) ──
    case 'standard_slash': {
      let armAngle: number;
      let wristOffset: number;
      let torsoTilt: number;
      let bodyOffsetX: number;
      let crouchY: number;
      let offAngle: number;
      let squashX = 1;
      let squashY = 1;

      if (p < 0.24) {
        // Anticipation coil: torso pulls back, wrist cocks blade backward with weight lag
        const k = easeInOutQuad(p / 0.24);
        armAngle = lerp(-0.85, -2.35, k);
        wristOffset = lerp(-0.15, -0.58 - wLag * 0.7, k);
        torsoTilt = lerp(0, -0.28 - wLag * 0.16, k);
        bodyOffsetX = lerp(0, -3.8, k);
        crouchY = lerp(0, 1.8, k);
        offAngle = lerp(0.3, -0.5, k);
        squashX = lerp(1, 0.91, k);
        squashY = lerp(1, 1.09, k);
      } else if (p < 0.6) {
        // Explosive whip snap! Wrist accelerates blade ahead of the forearm!
        const k = easeOutExpo((p - 0.24) / 0.36);
        armAngle = lerp(-2.35, 1.02, k);
        wristOffset = lerp(-0.58 - wLag * 0.7, 0.42 + wLag * 0.45, k);
        torsoTilt = lerp(-0.28, 0.46 + wLag * 0.12, k);
        bodyOffsetX = lerp(-3.8, 5.8, k);
        crouchY = lerp(1.8, 3.0, k);
        offAngle = lerp(-0.5, 2.35, k);
        squashX = lerp(1.17, 1.04, k);
        squashY = lerp(0.87, 0.96, k);
      } else {
        // Weighty follow-through settle & recoil
        const k = easeInOutQuad((p - 0.6) / 0.4);
        armAngle = lerp(1.02, 0.48, k);
        wristOffset = lerp(0.42 + wLag * 0.45, 0.14, k);
        torsoTilt = lerp(0.46, 0.14, k);
        bodyOffsetX = lerp(5.8, 1.4, k);
        crouchY = lerp(3.0, 0.8, k);
        offAngle = lerp(2.35, 1.5, k);
      }

      const armReach = profile.heavy ? 8.8 : 9.6;
      const hand = {
        x: Math.cos(armAngle) * armReach,
        y: Math.sin(armAngle) * armReach,
      };
      const elbow = solveTwoBoneElbow(hand.x, hand.y, 5.4, 5.2, -1);

      return attachOffhandToWeapon(
        {
          torsoTilt,
          headTilt: -torsoTilt * 0.4,
          bodyOffsetX,
          crouchY,
          bodyRotation: 0,
          elbow,
          hand,
          weaponAngle: armAngle + wristOffset,
          weaponBehindTorso: false,
          offElbow: { x: Math.cos(offAngle) * 4.5, y: Math.sin(offAngle) * 4.5 },
          offHand: { x: Math.cos(offAngle) * 8.5, y: Math.sin(offAngle) * 8.5 },
          offHandOnWeapon: false,
          frontKnee: { x: 6 + bodyOffsetX * 0.35, y: -5.5 + crouchY },
          frontFoot: { x: 8 + bodyOffsetX * 0.4, y: -1 },
          backKnee: { x: -4.5, y: -5 + crouchY },
          backFoot: { x: -7.5, y: -1 },
          squashX,
          squashY,
        },
        3,
        true
      );
    }

    // ── 2. SPIN HORIZONTAL (Dynamic 360° Waist Whirlwind Slash) ──
    case 'spin_horizontal': {
      const phase = p < 0.14 ? lerp(-0.35, 0, p / 0.14) : easeOutExpo((p - 0.14) / 0.86);
      const orbitAngle = -0.7 + phase * Math.PI * 2.25;
      const reachX = Math.cos(orbitAngle) * 11.5;
      const depthZ = Math.sin(orbitAngle);
      const reachY = depthZ * 2.6 + 1.2;
      const torsoTilt = Math.cos(orbitAngle) * 0.34;
      const crouchY = 2.6 + Math.abs(Math.sin(orbitAngle)) * 1.2;
      const hand = { x: reachX, y: reachY };
      const weaponAngle =
        reachX >= 0 ? depthZ * (0.28 + wLag * 0.2) : Math.PI - depthZ * (0.28 + wLag * 0.2);

      return attachOffhandToWeapon(
        {
          torsoTilt,
          headTilt: -torsoTilt * 0.35,
          bodyOffsetX: Math.cos(orbitAngle) * 3.5,
          crouchY,
          bodyRotation: 0,
          elbow: solveTwoBoneElbow(hand.x, hand.y, 5.8, 5.8, -1),
          hand,
          weaponAngle,
          weaponBehindTorso: depthZ < -0.15,
          offElbow: { x: -reachX * 0.45, y: -1.5 },
          offHand: { x: -reachX * 0.82, y: -2.2 },
          offHandOnWeapon: false,
          frontKnee: { x: 6.5, y: -5 + crouchY },
          frontFoot: { x: 9, y: -1 },
          backKnee: { x: -6, y: -5 + crouchY },
          backFoot: { x: -8.5, y: -1 },
          squashX: 1.08,
          squashY: 0.93,
        },
        3,
        depthZ >= -0.15
      );
    }

    // ── 3. THRUST KECIL (Hit 3 Finisher — Coiled Step-In Piercing Stab) ──
    case 'mini_thrust': {
      let ext: number;
      let torsoTilt: number;
      let bodyOffsetX: number;
      let crouchY: number;

      if (p < 0.2) {
        const k = easeInOutQuad(p / 0.2);
        ext = lerp(2, -5.5, k);
        torsoTilt = lerp(0, -0.2, k);
        bodyOffsetX = lerp(0, -4, k);
        crouchY = lerp(0, 2.5, k);
      } else if (p < 0.62) {
        const k = easeOutExpo((p - 0.2) / 0.42);
        ext = lerp(-5.5, 13.5, k);
        torsoTilt = lerp(-0.2, 0.52, k);
        bodyOffsetX = lerp(-4, 7.5, k);
        crouchY = lerp(2.5, 3.8, k);
      } else {
        const k = easeInOutQuad((p - 0.62) / 0.38);
        ext = lerp(13.5, 6, k);
        torsoTilt = lerp(0.52, 0.16, k);
        bodyOffsetX = lerp(7.5, 2, k);
        crouchY = lerp(3.8, 1, k);
      }

      const hand = { x: ext, y: 0.4 };
      return attachOffhandToWeapon(
        {
          torsoTilt,
          headTilt: -torsoTilt * 0.45,
          bodyOffsetX,
          crouchY,
          bodyRotation: 0,
          elbow: solveTwoBoneElbow(hand.x, hand.y, 6.2, 6.2, 1),
          hand,
          weaponAngle: 0.02,
          weaponBehindTorso: false,
          offElbow: { x: -5.5, y: -1.5 },
          offHand: { x: -10.5, y: -3.5 },
          offHandOnWeapon: false,
          frontKnee: { x: 8.5, y: -4.5 + crouchY },
          frontFoot: { x: 10.5, y: -1 },
          backKnee: { x: -6.5, y: -4.5 + crouchY },
          backFoot: { x: -11.5, y: -1.8 },
          squashX: p >= 0.2 && p < 0.62 ? 1.18 : 1,
          squashY: p >= 0.2 && p < 0.62 ? 0.87 : 1,
        },
        3,
        profile.gripStyle === 'polearm' || profile.heavy
      );
    }

    // ── 4. SPIN VERTICAL (Jump Hit Tap — Acrobatic 360° Aerial Wheel) ──
    case 'spin_vertical': {
      const spinAngle = easeOutExpo(p) * Math.PI * 2;
      const hand = { x: 8.8, y: -7.2 };
      return attachOffhandToWeapon(
        {
          torsoTilt: 0.28,
          headTilt: -0.1,
          bodyOffsetX: 0,
          crouchY: 1.5,
          bodyRotation: spinAngle,
          elbow: solveTwoBoneElbow(hand.x, hand.y, 5.6, 5.6, 1),
          hand,
          weaponAngle: -0.72 + wLag * 0.18,
          weaponBehindTorso: false,
          offElbow: { x: -4.5, y: 2.5 },
          offHand: { x: -7.5, y: 4.5 },
          offHandOnWeapon: false,
          frontKnee: { x: 5.5, y: -7.5 },
          frontFoot: { x: 2.5, y: -3.5 },
          backKnee: { x: -3.5, y: -7 },
          backFoot: { x: -5.5, y: -3.5 },
          squashX: 1.04,
          squashY: 0.96,
        },
        3,
        true
      );
    }

    // ── 5A. AIR SLAM WINDUP (Jump Hit Hold — Mid-air Overhead Charge) ──
    case 'air_slam_windup': {
      const k = easeOutExpo(p);
      const hand = { x: -1.5, y: -12.5 };
      return attachOffhandToWeapon(
        {
          torsoTilt: lerp(0, -0.32, k),
          headTilt: 0.2,
          bodyOffsetX: -1.5,
          crouchY: -2,
          bodyRotation: 0,
          elbow: solveTwoBoneElbow(hand.x, hand.y, 6.2, 6.2, -1),
          hand,
          weaponAngle: -Math.PI * 0.62 - wLag * 0.25,
          weaponBehindTorso: false,
          offElbow: { x: 2.5, y: -5.5 },
          offHand: { x: 1.5, y: -11 },
          offHandOnWeapon: false,
          frontKnee: { x: 5, y: -8 },
          frontFoot: { x: 2, y: -3.5 },
          backKnee: { x: -4.5, y: -7 },
          backFoot: { x: -7.5, y: -4 },
          squashX: 0.86,
          squashY: 1.18,
        },
        3,
        true
      );
    }

    // ── 5B. AIR SLAM DIVE (Plunging Meteor Strike) ──
    case 'air_slam_dive': {
      const hand = { x: 7.5, y: 9.5 };
      return attachOffhandToWeapon(
        {
          torsoTilt: 0.48,
          headTilt: -0.2,
          bodyOffsetX: 1,
          crouchY: 1,
          bodyRotation: 0,
          elbow: solveTwoBoneElbow(hand.x, hand.y, 6.0, 6.0, -1),
          hand,
          weaponAngle: Math.PI * 0.47,
          weaponBehindTorso: false,
          offElbow: { x: -5, y: -4.5 },
          offHand: { x: -9, y: -8.5 },
          offHandOnWeapon: false,
          frontKnee: { x: 3.5, y: -8.5 },
          frontFoot: { x: 1, y: -4.5 },
          backKnee: { x: -5, y: -10 },
          backFoot: { x: -8.5, y: -7.5 },
          squashX: 0.82,
          squashY: 1.24,
        },
        3,
        true
      );
    }

    // ── 5C. AIR SLAM IMPACT (Heroic Ground Crash — Weapon Embedded in Floor) ──
    case 'air_slam_impact': {
      const k = easeOutExpo(p);
      const crouchY = lerp(6.5, 2.2, k);
      const hand = { x: 10, y: 10.5 };
      return attachOffhandToWeapon(
        {
          torsoTilt: lerp(0.58, 0.25, k),
          headTilt: -0.25,
          bodyOffsetX: 2.5,
          crouchY,
          bodyRotation: 0,
          elbow: solveTwoBoneElbow(hand.x, hand.y, 6.5, 6.5, -1),
          hand,
          weaponAngle: lerp(1.18, 0.88, k),
          weaponBehindTorso: false,
          offElbow: { x: -2.5, y: 5.5 },
          offHand: { x: -5.5, y: 11.5 },
          offHandOnWeapon: false,
          frontKnee: { x: 8, y: -4 + crouchY * 0.5 },
          frontFoot: { x: 9.5, y: -1 },
          backKnee: { x: -7, y: -2.5 + crouchY * 0.4 },
          backFoot: { x: -10, y: -1 },
          squashX: lerp(1.32, 1.0, k),
          squashY: lerp(0.74, 1.0, k),
        },
        3,
        true
      );
    }

    // ── 6. DASH THRUST (Right-Click on Sword/Katana/Spear — Explosive Horizontal Bullet Lunge) ──
    case 'dash_thrust': {
      const isCharge = p < 0.14;
      const k = isCharge ? p / 0.14 : easeOutExpo((p - 0.14) / 0.86);
      const ext = isCharge ? lerp(0, -6.5, k) : lerp(-6.5, 15.5, k);
      const torsoTilt = isCharge ? -0.22 : lerp(0.66, 0.34, k);
      const crouchY = isCharge ? 4 : lerp(3.5, 1.5, k);
      const hand = { x: ext, y: 0 };

      return attachOffhandToWeapon(
        {
          torsoTilt,
          headTilt: -torsoTilt * 0.48,
          bodyOffsetX: isCharge ? -4 : lerp(9, 2.5, k),
          crouchY,
          bodyRotation: 0,
          elbow: solveTwoBoneElbow(hand.x, hand.y, 6.8, 6.8, 1),
          hand,
          weaponAngle: 0,
          weaponBehindTorso: false,
          offElbow: { x: -6.5, y: -2.5 },
          offHand: { x: -12, y: -4.5 },
          offHandOnWeapon: false,
          frontKnee: { x: isCharge ? 5 : 9, y: -4.5 + crouchY },
          frontFoot: { x: isCharge ? 6.5 : 10, y: -1.5 },
          backKnee: { x: isCharge ? -6 : -8.5, y: -5.5 + crouchY },
          backFoot: { x: isCharge ? -9.5 : -14.5, y: -4.5 },
          squashX: isCharge ? 0.88 : lerp(1.28, 1.02, k),
          squashY: isCharge ? 1.12 : lerp(0.8, 0.98, k),
        },
        3,
        profile.gripStyle === 'polearm'
      );
    }

    // ── 7A. GROUND SLAM CHARGE (Axe / Hammer — Hold Right-Click Overhead Coil) ──
    case 'ground_slam_charge': {
      const k = easeOutExpo(p);
      const tremble = Math.sin(p * Math.PI * 8) * 0.6;
      const hand = { x: lerp(2, -3.8, k) + tremble, y: lerp(-3, -13.2, k) };
      const crouchY = lerp(0.5, 3.8, k);
      return attachOffhandToWeapon(
        {
          torsoTilt: lerp(0, -0.36, k),
          headTilt: 0.22,
          bodyOffsetX: lerp(0, -3.2, k),
          crouchY,
          bodyRotation: 0,
          elbow: solveTwoBoneElbow(hand.x, hand.y, 6.0, 5.8, -1),
          hand,
          weaponAngle: lerp(-1.1, -Math.PI * 0.76 - wLag * 0.2, k),
          weaponBehindTorso: false,
          offElbow: { x: 1.5, y: -6 },
          offHand: { x: 0, y: -11 },
          offHandOnWeapon: false,
          frontKnee: { x: 6.5, y: -4.5 + crouchY },
          frontFoot: { x: 8.5, y: -1 },
          backKnee: { x: -5.5, y: -4.5 + crouchY },
          backFoot: { x: -8.5, y: -1 },
          squashX: lerp(1, 0.9, k),
          squashY: lerp(1, 1.12, k),
        },
        3,
        true
      );
    }

    // ── 7B. GROUND SLAM IMPACT (Axe / Hammer — Explosive Two-Handed Earth-Shattering Smash) ──
    case 'ground_slam_impact': {
      let armAngle: number;
      let torsoTilt: number;
      let crouchY: number;
      let squashX = 1;
      let squashY = 1;

      if (p < 0.24) {
        // Blistering overhead crash downward into ground
        const k = easeOutExpo(p / 0.24);
        armAngle = lerp(-2.2, 0.96, k);
        torsoTilt = lerp(-0.34, 0.62, k);
        crouchY = lerp(2.5, 6.2, k);
        squashX = lerp(0.92, 1.34, k);
        squashY = lerp(1.12, 0.72, k);
      } else {
        // Weapon embedded in cracked earth, pulling back with heavy recoil
        const k = easeInOutQuad((p - 0.24) / 0.76);
        armAngle = lerp(0.96, 0.72, k);
        torsoTilt = lerp(0.62, 0.22, k);
        crouchY = lerp(6.2, 1.8, k);
        squashX = lerp(1.34, 1.0, k);
        squashY = lerp(0.72, 1.0, k);
      }

      const hand = {
        x: Math.cos(armAngle) * 11.4,
        y: Math.sin(armAngle) * 11.4 + 1.5,
      };
      return attachOffhandToWeapon(
        {
          torsoTilt,
          headTilt: -torsoTilt * 0.45,
          bodyOffsetX: lerp(4.5, 1.5, p),
          crouchY,
          bodyRotation: 0,
          elbow: solveTwoBoneElbow(hand.x, hand.y, 6.2, 6.2, -1),
          hand,
          weaponAngle: armAngle + 0.16,
          weaponBehindTorso: false,
          offElbow: { x: 2, y: 4 },
          offHand: { x: 6, y: 8 },
          offHandOnWeapon: false,
          frontKnee: { x: 8.5, y: -3.5 + crouchY * 0.45 },
          frontFoot: { x: 10.5, y: -1 },
          backKnee: { x: -6.5, y: -3 + crouchY * 0.4 },
          backFoot: { x: -9.5, y: -1 },
          squashX,
          squashY,
        },
        3,
        true
      );
    }

    // ── 8. DUAL CROSS COMBO (Dual Sword — RMB + LMB Twin X-Scissor Dual Damage!) ──
    case 'dual_cross_combo': {
      let mainArmAngle: number;
      let offArmAngle: number;
      let torsoTilt: number;
      let bodyOffsetX: number;
      let crouchY: number;
      let squashX = 1;
      let squashY = 1;

      if (p < 0.2) {
        // Deep assassin coil: right sword draws high-back, left sword draws low-back
        const k = easeInOutQuad(p / 0.2);
        mainArmAngle = lerp(-0.45, -2.35, k);
        offArmAngle = lerp(1.65, 2.45, k);
        torsoTilt = lerp(0, -0.32, k);
        bodyOffsetX = lerp(0, -4.5, k);
        crouchY = lerp(0, 3.2, k);
        squashX = lerp(1, 0.88, k);
        squashY = lerp(1, 1.14, k);
      } else if (p < 0.62) {
        // Explosive X-Scissor twin-blade cross slash! Main cuts down-forward, Off-hand rips up-forward!
        const k = easeOutExpo((p - 0.2) / 0.42);
        mainArmAngle = lerp(-2.35, 1.08, k);
        offArmAngle = lerp(2.45, -1.02, k);
        torsoTilt = lerp(-0.32, 0.56, k);
        bodyOffsetX = lerp(-4.5, 8.2, k);
        crouchY = lerp(3.2, 3.6, k);
        squashX = lerp(1.24, 1.04, k);
        squashY = lerp(0.82, 0.96, k);
      } else {
        // Stylish flared twin-blade finish
        const k = easeInOutQuad((p - 0.62) / 0.38);
        mainArmAngle = lerp(1.08, 0.62, k);
        offArmAngle = lerp(-1.02, -0.68, k);
        torsoTilt = lerp(0.56, 0.18, k);
        bodyOffsetX = lerp(8.2, 2.0, k);
        crouchY = lerp(3.6, 1.2, k);
      }

      const mainHand = {
        x: Math.cos(mainArmAngle) * 10.2,
        y: Math.sin(mainArmAngle) * 10.2,
      };
      const offHand = {
        x: Math.cos(offArmAngle) * 10.0 + 1.5,
        y: Math.sin(offArmAngle) * 10.0,
      };
      const mainWeaponAngle = mainArmAngle + (p >= 0.2 && p < 0.62 ? 0.32 : -0.15);
      const offWeaponAngle = offArmAngle + (p >= 0.2 && p < 0.62 ? -0.32 : 0.15);

      return {
        torsoTilt,
        headTilt: -torsoTilt * 0.42,
        bodyOffsetX,
        crouchY,
        bodyRotation: 0,
        elbow: solveTwoBoneElbow(mainHand.x, mainHand.y, 5.6, 5.4, -1),
        hand: mainHand,
        weaponAngle: mainWeaponAngle,
        weaponBehindTorso: false,
        offElbow: solveTwoBoneElbow(offHand.x, offHand.y, 5.4, 5.2, 1),
        offHand,
        offWeaponAngle,
        offHandOnWeapon: false,
        frontKnee: { x: 8 + bodyOffsetX * 0.25, y: -4.5 + crouchY },
        frontFoot: { x: 10 + bodyOffsetX * 0.3, y: -1 },
        backKnee: { x: -6, y: -4.5 + crouchY },
        backFoot: { x: -10.5, y: -1.4 },
        squashX,
        squashY,
      };
    }
  }
}

// ── Physical Blade Segment & Swept Hitbox Geometry ───────────

export interface WeaponBladeSegment {
  hiltX: number;
  hiltY: number;
  baseX: number;
  baseY: number;
  tipX: number;
  tipY: number;
  behindTorso: boolean;
}

/**
 * Transform the live stickman pose's hand & weapon angle into exact world/character
 * space coordinates of the physical weapon hilt, blade base, and blade tip.
 */
export function computeWeaponBladeSegment(
  pose: StickmanCombatPose,
  weaponId: WeaponId,
  facingRight: boolean,
  charCenterX: number,
  charBottomY: number
): WeaponBladeSegment {
  const profile = getWeaponMoveProfile(weaponId);
  const handShoulderX = 2 + Math.sin(pose.torsoTilt) * 5;
  const handShoulderY = -17 + pose.crouchY;

  const localHiltX = handShoulderX + pose.hand.x;
  const localHiltY = handShoulderY + pose.hand.y;
  const cosW = Math.cos(pose.weaponAngle);
  const sinW = Math.sin(pose.weaponAngle);

  const localBaseX = localHiltX + cosW * profile.bladeBaseOffsetPx;
  const localBaseY = localHiltY + sinW * profile.bladeBaseOffsetPx;
  const localTipX = localHiltX + cosW * profile.bladeLengthPx;
  const localTipY = localHiltY + sinW * profile.bladeLengthPx;

  const toWorld = (lx: number, ly: number): Vec2 => {
    let px = lx;
    let py = ly;
    // Apply bodyRotation around (0, -14) for somersault spin_vertical
    if (pose.bodyRotation !== 0) {
      const rx = px;
      const ry = py + 14;
      const c = Math.cos(pose.bodyRotation);
      const s = Math.sin(pose.bodyRotation);
      px = rx * c - ry * s;
      py = rx * s + ry * c - 14;
    }
    px += pose.bodyOffsetX;
    const dir = facingRight ? 1 : -1;
    return {
      x: charCenterX + px * dir * pose.squashX,
      y: charBottomY + py * pose.squashY,
    };
  };

  const hilt = toWorld(localHiltX, localHiltY);
  const base = toWorld(localBaseX, localBaseY);
  const tip = toWorld(localTipX, localTipY);

  return {
    hiltX: hilt.x,
    hiltY: hilt.y,
    baseX: base.x,
    baseY: base.y,
    tipX: tip.x,
    tipY: tip.y,
    behindTorso: pose.weaponBehindTorso,
  };
}

/**
 * Sample N trailing blade segments along the live weapon swing so the renderer
 * can paint a realistic blade-driven metallic & energy motion ribbon directly
 * attached to the actual steel/edge!
 */
export function sampleWeaponBladeTrail(
  move: CombatMoveType,
  progress: number,
  weaponId: WeaponId,
  facingRight: boolean,
  charCenterX: number,
  charBottomY: number,
  samples = 6
): WeaponBladeSegment[] {
  const trailSpan =
    move === 'spin_horizontal' || move === 'spin_vertical'
      ? 0.24
      : move === 'dash_thrust' || move === 'dual_cross_combo'
        ? 0.22
        : 0.16;
  const startP = Math.max(0.05, progress - trailSpan);
  if (progress <= startP + 0.01) return [];

  const result: WeaponBladeSegment[] = [];
  for (let i = 0; i < samples; i++) {
    const t = samples <= 1 ? progress : lerp(startP, progress, i / (samples - 1));
    const pose = sampleStickmanCombatPose(move, t, weaponId);
    result.push(computeWeaponBladeSegment(pose, weaponId, facingRight, charCenterX, charBottomY));
  }
  return result;
}

/**
 * Sample N trailing segments for the off-hand twin sword during Dual Sword X-Combo.
 */
export function sampleOffhandBladeTrail(
  move: CombatMoveType,
  progress: number,
  facingRight: boolean,
  charCenterX: number,
  charBottomY: number,
  samples = 6
): WeaponBladeSegment[] {
  const startP = Math.max(0.05, progress - 0.22);
  if (progress <= startP + 0.01) return [];

  const result: WeaponBladeSegment[] = [];
  for (let i = 0; i < samples; i++) {
    const t = samples <= 1 ? progress : lerp(startP, progress, i / (samples - 1));
    const pose = sampleStickmanCombatPose(move, t, 'dual_sword');
    const offShoulderX = -1 + Math.sin(pose.torsoTilt) * 4;
    const offShoulderY = -17 + pose.crouchY;
    const localHiltX = offShoulderX + pose.offHand.x;
    const localHiltY = offShoulderY + pose.offHand.y;
    const offAng =
      pose.offWeaponAngle ??
      Math.atan2(pose.offHand.y - pose.offElbow.y, pose.offHand.x - pose.offElbow.x);
    const cosW = Math.cos(offAng);
    const sinW = Math.sin(offAng);

    const toWorld = (lx: number, ly: number): Vec2 => {
      const px = lx + pose.bodyOffsetX;
      const dir = facingRight ? 1 : -1;
      return {
        x: charCenterX + px * dir * pose.squashX,
        y: charBottomY + ly * pose.squashY,
      };
    };

    const hilt = toWorld(localHiltX, localHiltY);
    const base = toWorld(localHiltX + cosW * 2, localHiltY + sinW * 2);
    const tip = toWorld(localHiltX + cosW * 15, localHiltY + sinW * 15);
    result.push({
      hiltX: hilt.x,
      hiltY: hilt.y,
      baseX: base.x,
      baseY: base.y,
      tipX: tip.x,
      tipY: tip.y,
      behindTorso: false,
    });
  }
  return result;
}

export interface SweepHitbox {
  x: number;
  y: number;
  w: number;
  h: number;
  centerX: number;
  centerY: number;
}

/**
 * Compute the physical swept melee collision AABB directly from the weapon's
 * real blade length (`bladeLengthPx`), edge width (`bladeWidthPx`), and kinematic
 * stickman motion trajectory!
 */
export function computeWeaponSweepHitbox(
  move: CombatMoveType,
  weaponId: WeaponId,
  facingRight: boolean,
  charCenterX: number,
  charBottomY: number
): SweepHitbox {
  const profile = getWeaponMoveProfile(weaponId);
  const pad = Math.max(4, profile.bladeWidthPx * 0.85);
  const dir = facingRight ? 1 : -1;

  // Sample active strike frames along the move
  const startT = move === 'spin_vertical' || move === 'air_slam_dive' ? 0.08 : 0.2;
  const endT =
    move === 'spin_horizontal' || move === 'spin_vertical'
      ? 0.88
      : move === 'dual_cross_combo'
        ? 0.72
        : 0.66;
  const steps = 7;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (let i = 0; i <= steps; i++) {
    const t = lerp(startT, endT, i / steps);
    const pose = sampleStickmanCombatPose(move, t, weaponId);
    const seg = computeWeaponBladeSegment(pose, weaponId, facingRight, charCenterX, charBottomY);
    minX = Math.min(minX, seg.baseX, seg.tipX);
    maxX = Math.max(maxX, seg.baseX, seg.tipX);
    minY = Math.min(minY, seg.baseY, seg.tipY);
    maxY = Math.max(maxY, seg.baseY, seg.tipY);
  }

  // Account for lunge forward displacement on thrusts & dual cross combo
  if (move === 'dash_thrust') {
    const lungeExtra = weaponId === 'dagger' ? 14 : 26;
    if (dir > 0) maxX += lungeExtra;
    else minX -= lungeExtra;
  } else if (move === 'dual_cross_combo') {
    if (dir > 0) maxX += 18;
    else minX -= 18;
  } else if (move === 'mini_thrust') {
    const lungeExtra = weaponId === 'dagger' ? 5 : 10;
    if (dir > 0) maxX += lungeExtra;
    else minX -= lungeExtra;
  }

  minX -= pad;
  maxX += pad;
  minY -= pad;
  maxY += pad;

  const w = Math.max(10, Math.round(maxX - minX));
  const h = Math.max(14, Math.round(maxY - minY));
  return {
    x: Math.round(minX),
    y: Math.round(minY),
    w,
    h,
    centerX: (minX + maxX) * 0.5,
    centerY: (minY + maxY) * 0.5,
  };
}

/**
 * Exact 2D line segment vs AABB intersection (Liang-Barsky) for live blade-edge hit checks.
 */
export function segmentIntersectsAABB(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number
): boolean {
  let t0 = 0;
  let t1 = 1;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const checks: [number, number][] = [
    [-dx, x1 - rx],
    [dx, rx + rw - x1],
    [-dy, y1 - ry],
    [dy, ry + rh - y1],
  ];

  for (const [p, q] of checks) {
    if (p === 0) {
      if (q < 0) return false;
    } else {
      const r = q / p;
      if (p < 0) {
        if (r > t1) return false;
        if (r > t0) t0 = r;
      } else {
        if (r < t0) return false;
        if (r < t1) t1 = r;
      }
    }
  }
  return t0 <= t1;
}
