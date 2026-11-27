// ============================================================
// RIFTBOUND: SLAYER CORPS — Weapon Definitions (8 Weapons)
// Melee Progression: Dagger -> Sword -> Axe -> Dual Sword
// Ranged: Pistol, Dual Pistol, Shotgun, Rifle
// ============================================================

import type { WeaponDef } from '../types';

export const WEAPONS: Record<string, WeaponDef> = {
  // ── MELEE WEAPONS (Slot 1) ────────────────────────────────
  dagger: {
    id: 'dagger',
    name: 'Slayer Combat Dagger',
    slot: 'melee',
    baseDamage: 14,
    hitsPerAttack: 1,
    attackSpeed: 'very_fast',
    attackCooldown: 11, // 0.18s super snappy starter
    energyCost: 0,
    specialTrait: 'Jarak dekat sangat cepat. Setiap hit memulihkan +11 Energy Ammo.',
    description:
      'Belati standar rekrutan Slayer Corps. Jangkauan pendek, tetapi sangat lincah untuk mengisi Energy Cell.',
  },

  sword: {
    id: 'sword',
    name: 'Rift Cleaver',
    slot: 'melee',
    baseDamage: 22,
    hitsPerAttack: 1,
    attackSpeed: 'fast',
    attackCooldown: 17,
    energyCost: 0,
    specialTrait: 'Jangkauan seimbang 3-hit combo, nyaman untuk Pogo-Slash. +10 Energy/hit.',
    description:
      'Pedang tempur Slayer jarak menengah dengan tebasan seimbang.',
  },

  axe: {
    id: 'axe',
    name: 'Ruinbreaker Axe',
    slot: 'melee',
    baseDamage: 44,
    hitsPerAttack: 1,
    attackSpeed: 'slow',
    attackCooldown: 34,
    energyCost: 0,
    specialTrait: 'Armor Break (hancurkan perisai musuh 1 hit) + knockback besar. +14 Energy/hit.',
    description:
      'Kapak berat peninggalan pabrik kuno — menghancurkan perisai Sentinel seketika.',
  },

  dual_sword: {
    id: 'dual_sword',
    name: 'Phantom Fangs',
    slot: 'melee',
    baseDamage: 15,
    hitsPerAttack: 2,
    attackSpeed: 'very_fast',
    attackCooldown: 10,
    energyCost: 0,
    specialTrait: 'Tier Tertinggi: 2x tebasan kilat, +20% Crit Chance, +8 Energy/hit.',
    description:
      'Pedang kembar puncak arsenal Slayer — badai tebasan beruntun berkecepatan tinggi.',
  },

  // ── RANGED WEAPONS (Slot 2 — Energy Cell & Ammo Packs) ────
  pistol: {
    id: 'pistol',
    name: 'Void Repeater',
    slot: 'ranged',
    baseDamage: 18,
    hitsPerAttack: 1,
    attackSpeed: 'fast',
    attackCooldown: 15,
    energyCost: 7,
    specialTrait: 'Tembakan presisi jarak jauh hemat Energy.',
    description: 'Pistol energi ringan untuk menembak musuh terbang.',
  },

  dual_pistol: {
    id: 'dual_pistol',
    name: 'Storm Heralds',
    slot: 'ranged',
    baseDamage: 12,
    hitsPerAttack: 2,
    attackSpeed: 'very_fast',
    attackCooldown: 12,
    energyCost: 6,
    specialTrait: 'Air-hover sebentar saat menembak di udara.',
    description: 'Sepasang pistol energi dengan tembakan ganda beruntun.',
  },

  shotgun: {
    id: 'shotgun',
    name: 'Mana Breacher',
    slot: 'ranged',
    baseDamage: 13,
    hitsPerAttack: 5,
    attackSpeed: 'slow',
    attackCooldown: 38,
    energyCost: 22,
    specialTrait: '5 proyektil menyebar jarak dekat + knockback & screen shake.',
    description: 'Senjata jarak dekat penghancur kerumunan musuh.',
  },

  rifle: {
    id: 'rifle',
    name: 'Aether Lance',
    slot: 'ranged',
    baseDamage: 38,
    hitsPerAttack: 1,
    attackSpeed: 'normal',
    attackCooldown: 28,
    energyCost: 16,
    specialTrait: 'Sinar piercing menembus seluruh musuh dalam satu garis.',
    description: 'Senapan energi Ancient Tech berdaya tembus tinggi.',
  },
};

export const MELEE_WEAPON_IDS = ['dagger', 'sword', 'axe', 'dual_sword'] as const;
export const RANGED_WEAPON_IDS = ['pistol', 'dual_pistol', 'shotgun', 'rifle'] as const;

export const DEFAULT_MELEE = 'dagger';
export const DEFAULT_RANGED = 'pistol';
