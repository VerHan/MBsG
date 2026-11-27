// ============================================================
// RIFTBOUND: SLAYER CORPS — Boss Definitions (3 Bosses)
// ============================================================

import type { BossDef } from '../types';

export const BOSSES: Record<string, BossDef> = {
  // ═══════════════════════════════════════════════════════════
  // STAGE 1 BOSS — MANA COLOSSUS
  // A golem of rubble animated by concentrated Mana
  // ═══════════════════════════════════════════════════════════
  mana_colossus: {
    id: 'mana_colossus',
    name: 'Mana Colossus',
    title: 'The Awakened Rubble',
    maxHp: 400,
    contactDamage: 15,
    hasRunicPillar: true,
    phases: [
      {
        hpThreshold: 1.0, // Phase 1: 100% → 50%
        attacks: ['slam_attack', 'boulder_throw'],
        // slam_attack: AoE vertical shockwave at MC position
        // boulder_throw: lobs slow projectile in arc toward MC
      },
      {
        hpThreshold: 0.5, // Phase 2: 50% → 0%
        attacks: ['slam_attack', 'boulder_throw', 'ground_pound'],
        // ground_pound: jumps and lands — full-screen shockwave (must jump)
        spawnMinions: ['mana_husk'],
        minionCount: 2,
        minionInterval: 20,
        hasShield: true,
        shieldHp: 100,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // STAGE 2 BOSS — FORGE TITAN
  // Ancient forge machine fused with Mana crystals
  // ═══════════════════════════════════════════════════════════
  forge_titan: {
    id: 'forge_titan',
    name: 'Forge Titan',
    title: 'The Molten Engine',
    maxHp: 650,
    contactDamage: 20,
    hasRunicPillar: true,
    phases: [
      {
        hpThreshold: 1.0, // Phase 1: 100% → 60%
        attacks: ['flame_sweep', 'piston_slam'],
        // flame_sweep: horizontal beam across arena floor
        // piston_slam: destroys a platform temporarily (reforms after 5s)
      },
      {
        hpThreshold: 0.6, // Phase 2: 60% → 25%
        attacks: ['flame_sweep', 'piston_slam', 'mana_beam_tracking'],
        // mana_beam_tracking: vertical beam that slowly follows MC
        spawnMinions: ['corrupted_sentinel'],
        minionCount: 3,
        minionInterval: 25,
        hasShield: true,
        shieldHp: 150,
      },
      {
        hpThreshold: 0.25, // Phase 3: 25% → 0% (Enrage)
        attacks: ['flame_sweep', 'piston_slam', 'mana_beam_tracking'],
        // All attacks 40% faster. Core exposed permanently.
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // STAGE 3 BOSS — AETHERION, THE CORRUPTED WARDEN
  // Ancient Being guardian mutated by Rift overflow
  // ═══════════════════════════════════════════════════════════
  aetherion: {
    id: 'aetherion',
    name: 'Aetherion',
    title: 'The Corrupted Warden',
    maxHp: 900,
    contactDamage: 25,
    hasRunicPillar: true,
    phases: [
      {
        hpThreshold: 1.0, // Phase 1: 100% → 70%
        attacks: ['dash_cleave', 'mana_orb_barrage'],
        // dash_cleave: fast horizontal lunge across arena
        // mana_orb_barrage: fires 5 orbs in spread pattern
      },
      {
        hpThreshold: 0.7, // Phase 2: 70% → 40%
        attacks: ['dash_cleave', 'rift_shockwave', 'teleport_slash'],
        // rift_shockwave: ground wave (must jump)
        // teleport_slash: vanishes → reappears behind MC → slash
        // Arena platforms start breaking
      },
      {
        hpThreshold: 0.4, // Phase 3: 40% → 0%
        attacks: ['dash_cleave', 'rift_shockwave', 'teleport_slash', 'mana_rain'],
        // mana_rain: random projectiles fall from sky
        spawnMinions: ['mana_stalker'],
        minionCount: 2,
        minionInterval: 20,
        hasShield: true,
        shieldHp: 200,
      },
    ],
  },
};
