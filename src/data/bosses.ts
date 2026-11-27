// ============================================================
// RIFTBOUND: SLAYER CORPS — Boss Definitions & Boss Drop Tables
// ============================================================

import type { BossDef } from '../types';

export const BOSSES: Record<string, BossDef> = {
  mana_colossus: {
    id: 'mana_colossus',
    name: 'Mana Colossus',
    title: 'The Awakened Rubble',
    maxHp: 420,
    contactDamage: 15,
    hasRunicPillar: true,
    drops: {
      weaponId: 'sword',
      weaponTier: 'rare',
      armorId: 'vanguard',
      shards: 150,
      ammoPacks: 2,
    },
    phases: [
      {
        hpThreshold: 1.0,
        attacks: ['slam_attack', 'boulder_throw'],
      },
      {
        hpThreshold: 0.5,
        attacks: ['slam_attack', 'boulder_throw', 'ground_pound'],
        spawnMinions: ['mana_husk'],
        minionCount: 2,
        minionInterval: 20,
        hasShield: true,
        shieldHp: 110,
      },
    ],
  },

  forge_titan: {
    id: 'forge_titan',
    name: 'Forge Titan',
    title: 'The Molten Engine',
    maxHp: 680,
    contactDamage: 20,
    hasRunicPillar: true,
    drops: {
      weaponId: 'axe',
      weaponTier: 'epic',
      secondaryWeaponId: 'shotgun',
      secondaryWeaponTier: 'rare',
      armorId: 'rift_stalker',
      shards: 250,
      ammoPacks: 2,
    },
    phases: [
      {
        hpThreshold: 1.0,
        attacks: ['flame_sweep', 'piston_slam'],
      },
      {
        hpThreshold: 0.6,
        attacks: ['flame_sweep', 'piston_slam', 'mana_beam_tracking'],
        spawnMinions: ['corrupted_sentinel'],
        minionCount: 2,
        minionInterval: 24,
        hasShield: true,
        shieldHp: 150,
      },
      {
        hpThreshold: 0.25,
        attacks: ['flame_sweep', 'piston_slam', 'mana_beam_tracking'],
      },
    ],
  },

  aetherion: {
    id: 'aetherion',
    name: 'Aetherion',
    title: 'The Corrupted Warden',
    maxHp: 940,
    contactDamage: 25,
    hasRunicPillar: true,
    drops: {
      weaponId: 'dual_sword',
      weaponTier: 'epic',
      secondaryWeaponId: 'rifle',
      secondaryWeaponTier: 'epic',
      armorId: 'aether_praetor',
      shards: 500,
      ammoPacks: 3,
    },
    phases: [
      {
        hpThreshold: 1.0,
        attacks: ['dash_cleave', 'mana_orb_barrage'],
      },
      {
        hpThreshold: 0.7,
        attacks: ['dash_cleave', 'rift_shockwave', 'teleport_slash'],
      },
      {
        hpThreshold: 0.4,
        attacks: ['dash_cleave', 'rift_shockwave', 'teleport_slash', 'mana_rain'],
        spawnMinions: ['mana_stalker'],
        minionCount: 2,
        minionInterval: 20,
        hasShield: true,
        shieldHp: 200,
      },
    ],
  },
};
