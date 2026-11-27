// ============================================================
// RIFTBOUND: SLAYER CORPS — Weapon Definitions (11 Weapons)
// Loadout Rule:
//   - Ranged Guns pair ONLY with 1-Hand Light Melee (Dagger / Sword).
//   - Heavy/Special Melee (Spear, Katana, Axe, Hammer, Dual Sword)
//     use both hands (Weapon + Off-hand Energy Shield / Sheath / Twin Blade)
//     so Ranged is disabled while wielding them.
// ============================================================

import type { MeleeWeaponId, WeaponDef, WeaponId, WeaponInstance } from '../types';

export const WEAPON_LEVEL_DMG_MULT: Record<number, number> = {
  1: 1.0,
  2: 1.24,
  3: 1.5,
};

export const WEAPON_UPGRADE_COST: Record<number, number> = {
  1: 40, // Lv.1 -> Lv.2 (Glowing Aura)
  2: 80, // Lv.2 -> Lv.3 (Overcharged Aura)
};

export const LIGHT_MELEE_IDS: readonly MeleeWeaponId[] = ['dagger', 'sword'];

export function isLightRangedCompatibleMelee(id: WeaponId): boolean {
  return id === 'dagger' || id === 'sword';
}

export function getWeaponLevel(inst: WeaponInstance): number {
  return Math.max(1, Math.min(3, inst.level ?? 1));
}

export const WEAPONS: Record<string, WeaponDef> = {
  // ── 1-HANDED LIGHT MELEE (Bisa Dipakai Bersama Ranged Gun) ─
  dagger: {
    id: 'dagger',
    name: 'Slayer Combat Dagger',
    slot: 'melee',
    baseDamage: 11,
    hitsPerAttack: 1,
    attackSpeed: 'very_fast',
    attackCooldown: 16,
    energyCost: 0,
    specialTrait: '1-Tangan (Bisa +Gun) · Slash -> Cross Hit -> 3x Thrust Dash! +5 EN/hit.',
    description:
      'Belati ringan jarak dekat. Jangkauan pendek, namun sangat lincah dengan dash 3 tusukan beruntun.',
  },

  sword: {
    id: 'sword',
    name: 'Rift Cleaver',
    slot: 'melee',
    baseDamage: 18,
    hitsPerAttack: 1,
    attackSpeed: 'fast',
    attackCooldown: 22,
    energyCost: 0,
    specialTrait: '1-Tangan (Bisa +Gun) · Slash -> Muter Samping 2-Hit -> Spin Vertikal!',
    description:
      'Pedang duelist seimbang yang tetap bisa dipasangkan dengan senjata Ranged.',
  },

  // ── 2-HANDED / SPECIAL MELEE (Tanpa Gun — Pakai Energy Shield / Sarung / Twin) ─
  spear: {
    id: 'spear',
    name: 'Volt Rift Spear',
    slot: 'melee',
    baseDamage: 19,
    hitsPerAttack: 1,
    attackSpeed: 'normal',
    attackCooldown: 25,
    energyCost: 0,
    specialTrait: '2-Tangan (+Shield, No Gun) · Long Thrust -> Vault Spin -> 3x Drill Thrust.',
    description:
      'Tombak jangkauan paling jauh dengan off-hand Energy Shield penuh, tanpa pistol.',
  },

  katana: {
    id: 'katana',
    name: 'Crimson Rift Katana',
    slot: 'melee',
    baseDamage: 23,
    hitsPerAttack: 1,
    attackSpeed: 'fast',
    attackCooldown: 24,
    energyCost: 0,
    specialTrait: '2-Tangan Iaido (Sarung + Shield, No Gun) · Iai Draw -> Cross -> Flash Dash.',
    description:
      'Katana dengan teknik Iaijutsu: bilah tersimpan di sarung lalu menebas kilat menembus musuh.',
  },

  axe: {
    id: 'axe',
    name: 'Ruinbreaker Axe',
    slot: 'melee',
    baseDamage: 29,
    hitsPerAttack: 1,
    attackSpeed: 'slow',
    attackCooldown: 34,
    energyCost: 0,
    specialTrait: '2-Tangan (+Shield, No Gun) · Heavy Cleave -> Spin Tornado -> 3x Vertical Slam.',
    description:
      'Kapak berat pemecah perisai dengan putaran tornado lambat-berat dan 3 hantaman vertikal.',
  },

  hammer: {
    id: 'hammer',
    name: 'Grav-Crusher Hammer',
    slot: 'melee',
    baseDamage: 34,
    hitsPerAttack: 1,
    attackSpeed: 'slow',
    attackCooldown: 36,
    energyCost: 0,
    specialTrait: '2-Tangan (+Shield, No Gun) · Bash -> Vertical Spin -> Seismic Shock Slam!',
    description:
      'Palu gravitasi raksasa: lambat namun menghasilkan gelombang kejut tanah kiri-kanan.',
  },

  dual_sword: {
    id: 'dual_sword',
    name: 'Phantom Fangs',
    slot: 'melee',
    baseDamage: 15,
    hitsPerAttack: 2,
    attackSpeed: 'fast',
    attackCooldown: 20,
    energyCost: 0,
    specialTrait: '2-Tangan Kembar (No Gun) · Cross Hit -> Spin Cross 2x -> Whirlwind 3x.',
    description:
      'Sepasang pedang cyber asimetris — damage beruntun tinggi namun tanpa perisai penuh & tanpa gun.',
  },

  // ── RANGED WEAPONS (Hanya Aktif Bersama Dagger / Sword) ──
  pistol: {
    id: 'pistol',
    name: 'Void Repeater',
    slot: 'ranged',
    baseDamage: 18,
    hitsPerAttack: 1,
    attackSpeed: 'fast',
    attackCooldown: 16,
    energyCost: 8,
    specialTrait: 'Pasangan Dagger/Sword. Tembakan presisi jarak jauh (8 EN).',
    description: 'Pistol energi ringan untuk menembak musuh terbang.',
  },

  dual_pistol: {
    id: 'dual_pistol',
    name: 'Storm Heralds',
    slot: 'ranged',
    baseDamage: 12,
    hitsPerAttack: 2,
    attackSpeed: 'very_fast',
    attackCooldown: 13,
    energyCost: 8,
    specialTrait: 'Pasangan Dagger/Sword. Air-hover sebentar saat menembak (8 EN).',
    description: 'Sepasang pistol energi dengan tembakan ganda beruntun.',
  },

  shotgun: {
    id: 'shotgun',
    name: 'Mana Breacher',
    slot: 'ranged',
    baseDamage: 13,
    hitsPerAttack: 5,
    attackSpeed: 'slow',
    attackCooldown: 40,
    energyCost: 24,
    specialTrait: 'Pasangan Dagger/Sword. 5 proyektil sebar jarak dekat (24 EN).',
    description: 'Senjata jarak dekat penghancur kerumunan musuh.',
  },

  rifle: {
    id: 'rifle',
    name: 'Aether Lance',
    slot: 'ranged',
    baseDamage: 38,
    hitsPerAttack: 1,
    attackSpeed: 'normal',
    attackCooldown: 30,
    energyCost: 18,
    specialTrait: 'Pasangan Dagger/Sword. Sinar piercing menembus barisan musuh (18 EN).',
    description: 'Senapan energi Ancient Tech berdaya tembus tinggi.',
  },
};

export const MELEE_WEAPON_IDS = [
  'dagger',
  'sword',
  'spear',
  'katana',
  'axe',
  'hammer',
  'dual_sword',
] as const;
export const RANGED_WEAPON_IDS = ['pistol', 'dual_pistol', 'shotgun', 'rifle'] as const;

export const DEFAULT_MELEE = 'dagger';
export const DEFAULT_RANGED = 'pistol';
