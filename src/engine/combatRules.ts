// ============================================================
// RIFTBOUND: SLAYER CORPS — Combat Rules & Stickman Pose Rig
// Pure, deterministic combat state rules & keyframed stickman
// skeleton kinematics (Anticipation -> Snap -> Follow-Through).
// ============================================================

import type { MeleeWeaponId, WeaponId, WeaponInstance } from '../types';
import { WEAPONS, getWeaponLevel, isLightRangedCompatibleMelee } from '../data/weapons';

export type CombatMoveType =
  | 'standard_slash'
  | 'spin_horizontal'
  | 'mini_thrust'
  | 'spin_vertical'
  | 'air_slam_windup'
  | 'air_slam_dive'
  | 'air_slam_impact'
  | 'dash_thrust';

export type ResolvedAction = CombatMoveType | 'ranged_fire';

export interface MoveResolveContext {
  onGround: boolean;
  isHold: boolean;
  isRightClick: boolean;
  hasGun: boolean;
  comboStep: number; // 1, 2, or 3
}

/**
 * Resolve which combat action executes given player groundedness, input button,
 * hold state, and loadout mode (Melee-only vs Gun+Short-Dagger).
 */
export function resolveCombatAction(ctx: MoveResolveContext): ResolvedAction {
  if (ctx.isRightClick) {
    return ctx.hasGun ? 'ranged_fire' : 'dash_thrust';
  }

  if (!ctx.onGround) {
    return ctx.isHold ? 'air_slam_windup' : 'spin_vertical';
  }

  if (ctx.comboStep === 2) return 'spin_horizontal';
  if (ctx.comboStep === 3) return 'mini_thrust';
  return 'standard_slash';
}

export interface LoadoutStateSlice {
  meleeWeapon: WeaponInstance;
  rangedWeapon: WeaponInstance | null;
  weaponInventory: WeaponInstance[];
}

/**
 * Pure loadout constraint enforcer:
 * - Pure Melee weapons (all melee except short Dagger) CANNOT carry a Gun.
 * - Equipping any Gun automatically locks Melee to the short Combat Dagger.
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
      return {
        meleeWeapon: normalized,
        rangedWeapon: null,
        weaponInventory: nextInv,
        notice: hadGun
          ? `Mode Melee (${def.name}): Gun dilepas — Klik Kanan / [K] menjadi Dash Thrust!`
          : undefined,
      };
    }
    return {
      meleeWeapon: normalized,
      rangedWeapon: current.rangedWeapon,
      weaponInventory: nextInv,
    };
  }

  // Equipping a Gun forces Melee to the short Combat Dagger
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
      ? `Mode Gun (${def.name}): Melee dikunci ke Combat Dagger jarak dekat.`
      : undefined,
  };
}

/** Per-weapon tuning for the unified conditional moveset */
export interface WeaponMoveProfile {
  reachScale: number;
  speedScale: number;
  trailColor: string;
  accentColor: string;
  heavy: boolean;
}

export const WEAPON_MOVE_PROFILES: Record<MeleeWeaponId, WeaponMoveProfile> = {
  dagger: {
    reachScale: 0.56, // Ultra-short emergency close-range backup for Gun builds
    speedScale: 0.82,
    trailColor: '#00F0FF',
    accentColor: '#F8FAFC',
    heavy: false,
  },
  needle: {
    reachScale: 1.08,
    speedScale: 0.92,
    trailColor: '#F43F5E',
    accentColor: '#FFF1F2',
    heavy: false,
  },
  sword: {
    reachScale: 1.0,
    speedScale: 1.0,
    trailColor: '#F97316',
    accentColor: '#FEF3C7',
    heavy: false,
  },
  spear: {
    reachScale: 1.3,
    speedScale: 1.04,
    trailColor: '#00F0FF',
    accentColor: '#E0F2FE',
    heavy: false,
  },
  katana: {
    reachScale: 1.14,
    speedScale: 0.94,
    trailColor: '#EF4444',
    accentColor: '#FEE2E2',
    heavy: false,
  },
  dual_sword: {
    reachScale: 0.96,
    speedScale: 0.88,
    trailColor: '#A855F7',
    accentColor: '#00F0FF',
    heavy: false,
  },
  axe: {
    reachScale: 1.12,
    speedScale: 1.22,
    trailColor: '#F97316',
    accentColor: '#FACC15',
    heavy: true,
  },
  hammer: {
    reachScale: 1.06,
    speedScale: 1.28,
    trailColor: '#A855F7',
    accentColor: '#FACC15',
    heavy: true,
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
  /** Off-hand arm 2-bone joints relative to shoulder */
  offElbow: Vec2;
  offHand: Vec2;
  /** Leg joint targets (hip is at y = -11 + crouchY) */
  frontKnee: Vec2;
  frontFoot: Vec2;
  backKnee: Vec2;
  backFoot: Vec2;
  /** Subtle dynamic stretch */
  squashX: number;
  squashY: number;
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
 * Sample a dynamic stickman-animation pose for any of the 6 core combat moves.
 * All coordinates are in character-local space facing RIGHT (+X forward, -Y up, ground at y = 0).
 */
export function sampleStickmanCombatPose(
  move: CombatMoveType,
  rawProgress: number
): StickmanCombatPose {
  const p = clamp01(rawProgress);

  switch (move) {
    // ── 1. SLASH STANDAR (Windup high -> Whip snap -> Low follow-through) ──
    case 'standard_slash': {
      let armAngle: number;
      let torsoTilt: number;
      let bodyOffsetX: number;
      let crouchY: number;
      let offAngle: number;
      let squashX = 1;
      let squashY = 1;

      if (p < 0.22) {
        // Anticipation coil: torso pulls back, weapon cocked high behind head
        const k = easeInOutQuad(p / 0.22);
        armAngle = lerp(-0.8, -2.35, k);
        torsoTilt = lerp(0, -0.26, k);
        bodyOffsetX = lerp(0, -3.5, k);
        crouchY = lerp(0, 1.5, k);
        offAngle = lerp(0.3, -0.45, k);
        squashX = lerp(1, 0.92, k);
        squashY = lerp(1, 1.08, k);
      } else if (p < 0.58) {
        // Explosive stickman snap!
        const k = easeOutExpo((p - 0.22) / 0.36);
        armAngle = lerp(-2.35, 1.05, k);
        torsoTilt = lerp(-0.26, 0.44, k);
        bodyOffsetX = lerp(-3.5, 5.5, k);
        crouchY = lerp(1.5, 2.8, k);
        offAngle = lerp(-0.45, 2.3, k);
        squashX = lerp(1.16, 1.04, k);
        squashY = lerp(0.88, 0.96, k);
      } else {
        // Stylish follow-through settle
        const k = easeInOutQuad((p - 0.58) / 0.42);
        armAngle = lerp(1.05, 0.55, k);
        torsoTilt = lerp(0.44, 0.14, k);
        bodyOffsetX = lerp(5.5, 1.5, k);
        crouchY = lerp(2.8, 0.8, k);
        offAngle = lerp(2.3, 1.55, k);
      }

      const armReach = 9.5;
      const elbow = {
        x: Math.cos(armAngle - 0.28) * 5.2,
        y: Math.sin(armAngle - 0.28) * 5.2,
      };
      const hand = {
        x: Math.cos(armAngle) * armReach,
        y: Math.sin(armAngle) * armReach,
      };

      return {
        torsoTilt,
        headTilt: -torsoTilt * 0.4,
        bodyOffsetX,
        crouchY,
        bodyRotation: 0,
        elbow,
        hand,
        weaponAngle: armAngle + 0.18,
        weaponBehindTorso: false,
        offElbow: { x: Math.cos(offAngle) * 4.5, y: Math.sin(offAngle) * 4.5 },
        offHand: { x: Math.cos(offAngle) * 8.5, y: Math.sin(offAngle) * 8.5 },
        frontKnee: { x: 6 + bodyOffsetX * 0.35, y: -5.5 + crouchY },
        frontFoot: { x: 8 + bodyOffsetX * 0.4, y: -1 },
        backKnee: { x: -4.5, y: -5 + crouchY },
        backFoot: { x: -7.5, y: -1 },
        squashX,
        squashY,
      };
    }

    // ── 2. SPIN HORIZONTAL (Dynamic 360° Waist Whirlwind Slash) ──
    case 'spin_horizontal': {
      // Smooth 360° horizontal orbit around waist with martial pivot stance
      const phase = p < 0.14 ? lerp(-0.35, 0, p / 0.14) : easeOutExpo((p - 0.14) / 0.86);
      const orbitAngle = -0.7 + phase * Math.PI * 2.25;
      const reachX = Math.cos(orbitAngle) * 11.5;
      const depthZ = Math.sin(orbitAngle); // >0 front pass, <0 behind torso
      const reachY = depthZ * 2.6 + 1.2;
      const torsoTilt = Math.cos(orbitAngle) * 0.32;
      const crouchY = 2.6 + Math.abs(Math.sin(orbitAngle)) * 1.2;

      return {
        torsoTilt,
        headTilt: -torsoTilt * 0.35,
        bodyOffsetX: Math.cos(orbitAngle) * 3.5,
        crouchY,
        bodyRotation: 0,
        elbow: { x: reachX * 0.52, y: reachY - 1.2 },
        hand: { x: reachX, y: reachY },
        weaponAngle: reachX >= 0 ? depthZ * 0.25 : Math.PI - depthZ * 0.25,
        weaponBehindTorso: depthZ < -0.15,
        offElbow: { x: -reachX * 0.45, y: -1.5 },
        offHand: { x: -reachX * 0.82, y: -2.2 },
        frontKnee: { x: 6.5, y: -5 + crouchY },
        frontFoot: { x: 9, y: -1 },
        backKnee: { x: -6, y: -5 + crouchY },
        backFoot: { x: -8.5, y: -1 },
        squashX: 1.08,
        squashY: 0.93,
      };
    }

    // ── 3. THRUST KECIL (Hit 3 Finisher — Coiled Step-In Piercing Stab) ──
    case 'mini_thrust': {
      let ext: number;
      let torsoTilt: number;
      let bodyOffsetX: number;
      let crouchY: number;

      if (p < 0.2) {
        // Pull elbow back tightly at ribs
        const k = easeInOutQuad(p / 0.2);
        ext = lerp(2, -5.5, k);
        torsoTilt = lerp(0, -0.18, k);
        bodyOffsetX = lerp(0, -4, k);
        crouchY = lerp(0, 2.5, k);
      } else if (p < 0.62) {
        // High-velocity stickman fencer lunge!
        const k = easeOutExpo((p - 0.2) / 0.42);
        ext = lerp(-5.5, 13.5, k);
        torsoTilt = lerp(-0.18, 0.52, k);
        bodyOffsetX = lerp(-4, 7.5, k);
        crouchY = lerp(2.5, 3.8, k);
      } else {
        const k = easeInOutQuad((p - 0.62) / 0.38);
        ext = lerp(13.5, 6, k);
        torsoTilt = lerp(0.52, 0.16, k);
        bodyOffsetX = lerp(7.5, 2, k);
        crouchY = lerp(3.8, 1, k);
      }

      return {
        torsoTilt,
        headTilt: -torsoTilt * 0.45,
        bodyOffsetX,
        crouchY,
        bodyRotation: 0,
        elbow: { x: ext * 0.46, y: 1.2 },
        hand: { x: ext, y: 0.4 },
        weaponAngle: 0.02,
        weaponBehindTorso: false,
        offElbow: { x: -5.5, y: -1.5 },
        offHand: { x: -10.5, y: -3.5 },
        frontKnee: { x: 8.5, y: -4.5 + crouchY },
        frontFoot: { x: 10.5, y: -1 },
        backKnee: { x: -6.5, y: -4.5 + crouchY },
        backFoot: { x: -11.5, y: -1.8 },
        squashX: p >= 0.2 && p < 0.62 ? 1.18 : 1,
        squashY: p >= 0.2 && p < 0.62 ? 0.87 : 1,
      };
    }

    // ── 4. SPIN VERTICAL (Jump Hit Tap — Acrobatic 360° Aerial Wheel) ──
    case 'spin_vertical': {
      const spinAngle = easeOutExpo(p) * Math.PI * 2;
      return {
        torsoTilt: 0.28,
        headTilt: -0.1,
        bodyOffsetX: 0,
        crouchY: 1.5,
        bodyRotation: spinAngle,
        elbow: { x: 4.5, y: -4.2 },
        hand: { x: 8.8, y: -7.2 },
        weaponAngle: -0.78,
        weaponBehindTorso: false,
        offElbow: { x: -4.5, y: 2.5 },
        offHand: { x: -7.5, y: 4.5 },
        // Tight tucked somersault legs
        frontKnee: { x: 5.5, y: -7.5 },
        frontFoot: { x: 2.5, y: -3.5 },
        backKnee: { x: -3.5, y: -7 },
        backFoot: { x: -5.5, y: -3.5 },
        squashX: 1.04,
        squashY: 0.96,
      };
    }

    // ── 5A. AIR SLAM WINDUP (Jump Hit Hold — Mid-air Overhead Charge) ──
    case 'air_slam_windup': {
      const k = easeOutExpo(p);
      return {
        torsoTilt: lerp(0, -0.32, k),
        headTilt: 0.2,
        bodyOffsetX: -1.5,
        crouchY: -2,
        bodyRotation: 0,
        elbow: { x: -2.5, y: -6.5 },
        hand: { x: -1.5, y: -12.5 },
        weaponAngle: -Math.PI * 0.58,
        weaponBehindTorso: false,
        offElbow: { x: 2.5, y: -5.5 },
        offHand: { x: 1.5, y: -11 },
        frontKnee: { x: 5, y: -8 },
        frontFoot: { x: 2, y: -3.5 },
        backKnee: { x: -4.5, y: -7 },
        backFoot: { x: -7.5, y: -4 },
        squashX: 0.86,
        squashY: 1.18,
      };
    }

    // ── 5B. AIR SLAM DIVE (Plunging Meteor Strike) ──
    case 'air_slam_dive': {
      return {
        torsoTilt: 0.48,
        headTilt: -0.2,
        bodyOffsetX: 1,
        crouchY: 1,
        bodyRotation: 0,
        elbow: { x: 5, y: 2.5 },
        hand: { x: 7.5, y: 9.5 },
        weaponAngle: Math.PI * 0.47,
        weaponBehindTorso: false,
        offElbow: { x: -5, y: -4.5 },
        offHand: { x: -9, y: -8.5 },
        frontKnee: { x: 3.5, y: -8.5 },
        frontFoot: { x: 1, y: -4.5 },
        backKnee: { x: -5, y: -10 },
        backFoot: { x: -8.5, y: -7.5 },
        squashX: 0.82,
        squashY: 1.24,
      };
    }

    // ── 5C. AIR SLAM IMPACT (Heroic Superhero Ground Crash) ──
    case 'air_slam_impact': {
      const k = easeOutExpo(p);
      const crouchY = lerp(6.5, 2.2, k);
      return {
        torsoTilt: lerp(0.58, 0.25, k),
        headTilt: -0.25,
        bodyOffsetX: 2.5,
        crouchY,
        bodyRotation: 0,
        elbow: { x: 6.5, y: 4.5 },
        hand: { x: 10, y: 10.5 },
        weaponAngle: lerp(1.18, 0.88, k),
        weaponBehindTorso: false,
        offElbow: { x: -2.5, y: 5.5 },
        offHand: { x: -5.5, y: 11.5 },
        frontKnee: { x: 8, y: -4 + crouchY * 0.5 },
        frontFoot: { x: 9.5, y: -1 },
        backKnee: { x: -7, y: -2.5 + crouchY * 0.4 },
        backFoot: { x: -10, y: -1 },
        squashX: lerp(1.32, 1.0, k),
        squashY: lerp(0.74, 1.0, k),
      };
    }

    // ── 6. DASH THRUST (Right-Click in Melee Mode — Explosive Horizontal Bullet Lunge) ──
    case 'dash_thrust': {
      const isCharge = p < 0.14;
      const k = isCharge ? p / 0.14 : easeOutExpo((p - 0.14) / 0.86);
      const ext = isCharge ? lerp(0, -6.5, k) : lerp(-6.5, 15.5, k);
      const torsoTilt = isCharge ? -0.22 : lerp(0.66, 0.34, k);
      const crouchY = isCharge ? 4 : lerp(3.5, 1.5, k);

      return {
        torsoTilt,
        headTilt: -torsoTilt * 0.48,
        bodyOffsetX: isCharge ? -4 : lerp(9, 2.5, k),
        crouchY,
        bodyRotation: 0,
        elbow: { x: ext * 0.48, y: 0.5 },
        hand: { x: ext, y: 0 },
        weaponAngle: 0,
        weaponBehindTorso: false,
        offElbow: { x: -6.5, y: -2.5 },
        offHand: { x: -12, y: -4.5 },
        // Dynamic flying horizontal stickman stride
        frontKnee: { x: isCharge ? 5 : 9, y: -4.5 + crouchY },
        frontFoot: { x: isCharge ? 6.5 : 10, y: -1.5 },
        backKnee: { x: isCharge ? -6 : -8.5, y: -5.5 + crouchY },
        backFoot: { x: isCharge ? -9.5 : -14.5, y: -4.5 },
        squashX: isCharge ? 0.88 : lerp(1.28, 1.02, k),
        squashY: isCharge ? 1.12 : lerp(0.8, 0.98, k),
      };
    }
  }
}
