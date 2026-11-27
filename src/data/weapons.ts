// ============================================================
// RIFTBOUND: SLAYER CORPS — Weapon Definitions (7 Weapons)
// ============================================================

import type { WeaponDef } from '../types';

export const WEAPONS: Record<string, WeaponDef> = {
  // ── MELEE WEAPONS (Slot 1) ────────────────────────────────
  sword: {
    id: 'sword',
    name: 'Rift Cleaver',
    slot: 'melee',
    baseDamage: 20,
    hitsPerAttack: 1,
    attackSpeed: 'fast',
    attackCooldown: 18, // frames @ 60fps = 0.3s
    energyCost: 0,
    specialTrait: 'Pogo-slash friendly. Melee hit restores +8 Energy.',
    description:
      'Standard-issue Slayer blade. Balanced 3-hit combo with good pogo-slash reach.',
  },

  dual_sword: {
    id: 'dual_sword',
    name: 'Phantom Fangs',
    slot: 'melee',
    baseDamage: 12,
    hitsPerAttack: 2,
    attackSpeed: 'very_fast',
    attackCooldown: 10, // frames @ 60fps = 0.17s
    energyCost: 0,
    specialTrait: '+15% Crit Chance. Dash cooldown reduced by 20%. Melee hit restores +5 Energy per blade.',
    description:
      'Twin blades for those who prefer speed over power. Flurry slash unleashes a storm of cuts.',
  },

  axe: {
    id: 'axe',
    name: 'Ruinbreaker',
    slot: 'melee',
    baseDamage: 42,
    hitsPerAttack: 1,
    attackSpeed: 'slow',
    attackCooldown: 36, // frames @ 60fps = 0.6s
    energyCost: 0,
    specialTrait: 'Armor Break (destroys enemy shields in 1 hit). Heavy knockback. Melee hit restores +12 Energy.',
    description:
      'Massive salvaged axe. Slow but devastating — cracks Sentinel shields like glass.',
  },

  // ── RANGED WEAPONS (Slot 2) ───────────────────────────────
  pistol: {
    id: 'pistol',
    name: 'Void Repeater',
    slot: 'ranged',
    baseDamage: 18,
    hitsPerAttack: 1,
    attackSpeed: 'fast',
    attackCooldown: 15, // frames
    energyCost: 8,
    specialTrait: 'Instant reload. Stable long-range precision.',
    description:
      'Reliable sidearm. No reload downtime — just point and fire.',
  },

  dual_pistol: {
    id: 'dual_pistol',
    name: 'Storm Heralds',
    slot: 'ranged',
    baseDamage: 11,
    hitsPerAttack: 2,
    attackSpeed: 'very_fast',
    attackCooldown: 12, // frames
    energyCost: 6, // per shot (fires 2)
    specialTrait: 'Air-hover: MC floats briefly while firing in mid-air. Rapid burst fire.',
    description:
      'Dual energy pistols. Firing mid-air suspends you momentarily — perfect for aerial crowd control.',
  },

  shotgun: {
    id: 'shotgun',
    name: 'Mana Breacher',
    slot: 'ranged',
    baseDamage: 12,
    hitsPerAttack: 5, // 5 pellets spread
    attackSpeed: 'slow',
    attackCooldown: 40, // frames
    energyCost: 25,
    specialTrait: 'Massive close-range damage (5 spread pellets). Strong knockback on enemies. Screen shake on fire.',
    description:
      'Point-blank devastation. 5 Mana pellets fan out — lethal up close, useless at range.',
  },

  rifle: {
    id: 'rifle',
    name: 'Aether Lance',
    slot: 'ranged',
    baseDamage: 35,
    hitsPerAttack: 1,
    attackSpeed: 'normal',
    attackCooldown: 30, // frames
    energyCost: 18,
    specialTrait: 'Piercing beam — passes through all enemies in a straight line.',
    description:
      'Concentrated Mana beam that punches through every target in its path. Line them up.',
  },
};

/** Convenience arrays for each slot */
export const MELEE_WEAPON_IDS = ['sword', 'dual_sword', 'axe'] as const;
export const RANGED_WEAPON_IDS = ['pistol', 'dual_pistol', 'shotgun', 'rifle'] as const;

/** Starter loadout */
export const DEFAULT_MELEE = 'sword';
export const DEFAULT_RANGED = 'pistol';
