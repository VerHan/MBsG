// ============================================================
// RIFTBOUND: SLAYER CORPS — Enemy Bestiary Definitions
// ============================================================

import type { EnemyDef } from '../types';

export const ENEMIES: Record<string, EnemyDef> = {
  mana_husk: {
    id: 'mana_husk',
    name: 'Mana Husk',
    hp: 30,
    damage: 8,
    behavior: 'patrol',
    speed: 60,  // pixels/sec
    targetsPylon: true,
    ignoresBarricade: false,
    weakness: 'All weapons — basic fodder enemy.',
    shardDrop: 5,
  },

  rift_drone: {
    id: 'rift_drone',
    name: 'Rift Drone',
    hp: 20,
    damage: 10,
    behavior: 'flying_ranged',
    speed: 40,
    targetsPylon: true,
    ignoresBarricade: true, // flies over barricades
    weakness: 'Ranged weapons — stays airborne and hard to melee.',
    shardDrop: 8,
  },

  corrupted_sentinel: {
    id: 'corrupted_sentinel',
    name: 'Corrupted Sentinel',
    hp: 60,
    damage: 15,
    behavior: 'chase',
    speed: 50,
    targetsPylon: true,
    ignoresBarricade: false,
    weakness: 'Axe (Armor Break bypasses shield). Shotgun staggers through shield.',
    shardDrop: 15,
  },

  void_spitter: {
    id: 'void_spitter',
    name: 'Void Spitter',
    hp: 25,
    damage: 12,
    behavior: 'turret',
    speed: 0, // stationary
    targetsPylon: false, // turrets attack player only
    ignoresBarricade: false,
    weakness: 'Pogo-slash from above bypasses frontal fire. Melee rush after dodge.',
    shardDrop: 10,
  },

  mana_stalker: {
    id: 'mana_stalker',
    name: 'Mana Stalker',
    hp: 40,
    damage: 12,
    behavior: 'agile',
    speed: 100,
    targetsPylon: true,
    ignoresBarricade: false,
    weakness: 'Timing-based — wait for dash attack to dodge, then shotgun punish.',
    shardDrop: 12,
  },

  rift_brute: {
    id: 'rift_brute',
    name: 'Rift Brute',
    hp: 80,
    damage: 20,
    behavior: 'heavy',
    speed: 35,
    targetsPylon: true,
    ignoresBarricade: false, // but high HP — takes long to stop
    weakness: 'Dash-dodge AoE slam, then sustained DPS. Axe knockback helps.',
    shardDrop: 25,
  },

  mana_wisp: {
    id: 'mana_wisp',
    name: 'Mana Wisp',
    hp: 10,
    damage: 25, // AoE explosion
    behavior: 'suicide',
    speed: 70,
    targetsPylon: true, // flies toward pylon if in defense mode
    ignoresBarricade: true, // flies over
    weakness: 'Kill from range before it reaches you or the Pylon. 1-shot from any weapon.',
    shardDrop: 3,
  },
};

/** Enemies available per stage (for spawn validation) */
export const STAGE_ENEMY_POOL: Record<string, string[]> = {
  stage_1: ['mana_husk', 'rift_drone'],
  stage_2: ['mana_husk', 'rift_drone', 'corrupted_sentinel', 'void_spitter', 'mana_stalker'],
  stage_3: ['mana_husk', 'rift_drone', 'corrupted_sentinel', 'void_spitter', 'mana_stalker', 'rift_brute', 'mana_wisp'],
};
