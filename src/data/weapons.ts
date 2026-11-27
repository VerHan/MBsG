// ============================================================
// RIFTBOUND: SLAYER CORPS — Weapon Definitions (12 Weapons)
// Loadout Rule:
//   - Pilih salah satu: Mode MELEE MURNI (tanpa Gun, Klik Kanan = Dash Thrust)
//     ATAU Mode GUN + SHORT DAGGER (Gun di Klik Kanan, Dagger pendek di Klik Kiri).
//   - Setiap senjata melee memakai kombo kondisional dinamis:
//     3x Klik Kiri (Slash -> Spin Horizontal -> Thrust Kecil),
//     Jump Hit Tap (Spin Vertical), Jump Hit Hold (Slam), Klik Kanan (Dash Thrust).
// ============================================================

import type { DamageType, MeleeWeaponId, WeaponDef, WeaponId, WeaponInstance } from '../types';

export const WEAPON_LEVEL_DMG_MULT: Record<number, number> = {
  1: 1.0,
  2: 1.24,
  3: 1.5,
};

export const WEAPON_UPGRADE_COST: Record<number, number> = {
  1: 40, // Lv.1 -> Lv.2 (Glowing Aura)
  2: 80, // Lv.2 -> Lv.3 (Overcharged Aura)
};

export const DAMAGE_TYPE_LABEL: Record<DamageType, { label: string; detail: string; color: string }> = {
  pierce: {
    label: 'PIERCE',
    detail: 'Menembus 40% perisai musuh',
    color: '#00F0FF',
  },
  slash: {
    label: 'SLASH',
    detail: 'Crit +1.5x & kombo lincah',
    color: '#F43F5E',
  },
  impact: {
    label: 'IMPACT',
    detail: '1.35x DMG ke perisai & stagger berat',
    color: '#F59E0B',
  },
};

export const LIGHT_MELEE_IDS: readonly MeleeWeaponId[] = ['dagger'];

export function isLightRangedCompatibleMelee(id: WeaponId): boolean {
  return id === 'dagger';
}

export function getWeaponLevel(inst: WeaponInstance): number {
  return Math.max(1, Math.min(3, inst.level ?? 1));
}

export const WEAPONS: Record<string, WeaponDef> = {
  // ── MELEE WEAPONS (Mode Melee Murni — Klik Kanan: Dash Thrust) ─
  needle: {
    id: 'needle',
    name: 'Crimson Silk-Needle',
    slot: 'melee',
    damageType: 'pierce',
    baseDamage: 16,
    hitsPerAttack: 1,
    attackSpeed: 'very_fast',
    attackCooldown: 17,
    critChance: 0.16,
    reachRating: 4,
    energyCost: 0,
    specialTrait: 'Melee Murni · Kombo Sutra cepat (Slash -> Spin H -> Thrust), Spin Vertikal udara & Dash Thrust jauh.',
    description:
      'Jarum tempur panjang berbenang sutra merah. Lincah di udara, Dash Thrust menembus perisai, tanpa senjata api.',
  },

  dagger: {
    id: 'dagger',
    name: 'Short Combat Dagger',
    slot: 'melee',
    damageType: 'slash',
    baseDamage: 11,
    hitsPerAttack: 1,
    attackSpeed: 'very_fast',
    attackCooldown: 14,
    critChance: 0.22,
    reachRating: 1,
    energyCost: 0,
    specialTrait: 'Khusus Pendamping Gun · Bilah sangat pendek (jarak super dekat) +6 EN/hit.',
    description:
      'Belati tempur mini khusus pengguna Gun untuk pertahanan jarak rapat dan mengisi Energy.',
  },

  sword: {
    id: 'sword',
    name: 'Rift Cleaver',
    slot: 'melee',
    damageType: 'slash',
    baseDamage: 20,
    hitsPerAttack: 1,
    attackSpeed: 'fast',
    attackCooldown: 21,
    critChance: 0.14,
    reachRating: 3,
    energyCost: 0,
    specialTrait: 'Melee Murni · Seimbang di semua jurus: Slash lebar, Spin Horizontal 360°, Jump Slam solid.',
    description:
      'Pedang duelist seimbang dengan tebasan bersih dan Dash Thrust stabil.',
  },

  spear: {
    id: 'spear',
    name: 'Volt Rift Spear',
    slot: 'melee',
    damageType: 'pierce',
    baseDamage: 21,
    hitsPerAttack: 1,
    attackSpeed: 'normal',
    attackCooldown: 24,
    critChance: 0.12,
    reachRating: 5,
    energyCost: 0,
    specialTrait: 'Melee Murni · Jangkauan Thrust & Dash Thrust terjauh, menembus 40% perisai.',
    description:
      'Tombak jangkauan paling jauh untuk menusuk barisan musuh dengan aman.',
  },

  katana: {
    id: 'katana',
    name: 'Crimson Rift Katana',
    slot: 'melee',
    damageType: 'slash',
    baseDamage: 24,
    hitsPerAttack: 1,
    attackSpeed: 'fast',
    attackCooldown: 22,
    critChance: 0.24,
    reachRating: 4,
    energyCost: 0,
    specialTrait: 'Melee Murni · Tarikan Iaido kilat, peluang Critical tertinggi di Dash Thrust & Slash.',
    description:
      'Katana Iaijutsu berkecepatan tinggi dengan tebasan kritikal tajam.',
  },

  axe: {
    id: 'axe',
    name: 'Ruinbreaker Axe',
    slot: 'melee',
    damageType: 'impact',
    baseDamage: 30,
    hitsPerAttack: 1,
    attackSpeed: 'slow',
    attackCooldown: 31,
    critChance: 0.1,
    reachRating: 4,
    energyCost: 0,
    specialTrait: 'Melee Murni · Penghancur perisai di Spin Horizontal & Aerial Slam berdaya hancur besar.',
    description:
      'Kapak tempur berat dengan stagger tinggi dan hantaman tanah yang meremukkan perisai.',
  },

  hammer: {
    id: 'hammer',
    name: 'Grav-Crusher Hammer',
    slot: 'melee',
    damageType: 'impact',
    baseDamage: 35,
    hitsPerAttack: 1,
    attackSpeed: 'slow',
    attackCooldown: 34,
    critChance: 0.08,
    reachRating: 3,
    energyCost: 0,
    specialTrait: 'Melee Murni · Aerial Slam memicu gelombang kejut seismik kiri-kanan!',
    description:
      'Palu gravitasi raksasa: menghancurkan perisai seketika dengan Slam seismik.',
  },

  dual_sword: {
    id: 'dual_sword',
    name: 'Phantom Fangs',
    slot: 'melee',
    damageType: 'slash',
    baseDamage: 15,
    hitsPerAttack: 2,
    attackSpeed: 'fast',
    attackCooldown: 19,
    critChance: 0.22,
    reachRating: 3,
    energyCost: 0,
    specialTrait: 'Melee Murni · Pedang kembar 2x hit cepat pada Slash, Spin Vertikal & Dash Thrust.',
    description:
      'Sepasang pedang cyber asimetris untuk kombo agresif berkecepatan tinggi.',
  },

  // ── RANGED WEAPONS (Mode Gun — Melee otomatis Short Combat Dagger) ──
  pistol: {
    id: 'pistol',
    name: 'Void Repeater',
    slot: 'ranged',
    damageType: 'pierce',
    baseDamage: 18,
    hitsPerAttack: 1,
    attackSpeed: 'fast',
    attackCooldown: 16,
    critChance: 0.1,
    reachRating: 4,
    energyCost: 8,
    specialTrait: 'Mode Gun (+Short Dagger). Tembakan presisi jarak jauh (8 EN).',
    description: 'Pistol energi ringan untuk menjatuhkan musuh terbang atau memicu kristal.',
  },

  dual_pistol: {
    id: 'dual_pistol',
    name: 'Storm Heralds',
    slot: 'ranged',
    damageType: 'pierce',
    baseDamage: 12,
    hitsPerAttack: 2,
    attackSpeed: 'very_fast',
    attackCooldown: 13,
    critChance: 0.14,
    reachRating: 4,
    energyCost: 8,
    specialTrait: 'Mode Gun (+Short Dagger). Air-hover sebentar saat menembak ganda (8 EN).',
    description: 'Sepasang pistol energi dengan tembakan ganda beruntun & kontrol udara.',
  },

  shotgun: {
    id: 'shotgun',
    name: 'Mana Breacher',
    slot: 'ranged',
    damageType: 'impact',
    baseDamage: 14,
    hitsPerAttack: 5,
    attackSpeed: 'slow',
    attackCooldown: 38,
    critChance: 0.08,
    reachRating: 2,
    energyCost: 24,
    specialTrait: 'Mode Gun (+Short Dagger). 5 proyektil sebar penghancur perisai (24 EN).',
    description: 'Senjata jarak dekat penghancur kerumunan musuh dan perisai Sentinel.',
  },

  rifle: {
    id: 'rifle',
    name: 'Aether Lance',
    slot: 'ranged',
    damageType: 'pierce',
    baseDamage: 40,
    hitsPerAttack: 1,
    attackSpeed: 'normal',
    attackCooldown: 30,
    critChance: 0.18,
    reachRating: 5,
    energyCost: 18,
    specialTrait: 'Mode Gun (+Short Dagger). Sinar piercing menembus seluruh barisan musuh (18 EN).',
    description: 'Senapan energi Ancient Tech berdaya tembus tinggi untuk garis lurus.',
  },
};

export const MELEE_WEAPON_IDS = [
  'needle',
  'dagger',
  'sword',
  'spear',
  'katana',
  'axe',
  'hammer',
  'dual_sword',
] as const;
export const RANGED_WEAPON_IDS = ['pistol', 'dual_pistol', 'shotgun', 'rifle'] as const;

export const DEFAULT_MELEE = 'needle';
export const DEFAULT_RANGED = 'pistol';
