// ============================================================
// RIFTBOUND: SLAYER CORPS — Stage Definitions (3 Stages MVP)
// Each stage = array of Segments with different GameModes.
// ============================================================

import type { StageDef } from '../types';

export const STAGES: StageDef[] = [
  // ═══════════════════════════════════════════════════════════
  // STAGE 1 — THE FALLEN PERIMETER (Outskirts Ruins)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'stage_1',
    name: 'The Fallen Perimeter',
    subtitle: 'Outskirts Ruins — Rain of Ash',
    parallaxTheme: 'ruins',
    segments: [
      // ── Segment A: TRAVERSE (Tutorial) ──
      {
        id: 's1_a',
        mode: 'traverse',
        name: 'Ruined Gateway',
        width: 3200,
        chests: [
          {
            tier: 'common',
            questionsRequired: 1,
            loot: { weaponId: 'dual_sword', weaponTier: 'common', shards: 20 },
          },
          {
            tier: 'common',
            questionsRequired: 1,
            loot: { weaponId: 'pistol', weaponTier: 'common', shards: 15 },
          },
        ],
        hasMerchant: false,
        hasPuzzleShrine: false,
      },

      // ── Segment B: SURVIVAL TIMER (60s intro) ──
      {
        id: 's1_b',
        mode: 'survival',
        name: 'Beacon Activation',
        survivalDuration: 60,
        survivalWaves: [
          { enemies: [{ id: 'mana_husk', count: 3 }], spawnDelay: 2 },
          { enemies: [{ id: 'mana_husk', count: 2 }, { id: 'rift_drone', count: 1 }], spawnDelay: 2 },
          { enemies: [{ id: 'mana_husk', count: 3 }, { id: 'rift_drone', count: 2 }], spawnDelay: 1.5 },
          { enemies: [{ id: 'mana_husk', count: 4 }, { id: 'rift_drone', count: 2 }], spawnDelay: 1 },
        ],
      },

      // ── Segment C: TRAVERSE (Exploration + Merchant) ──
      {
        id: 's1_c',
        mode: 'traverse',
        name: 'Perimeter Watch',
        width: 2800,
        chests: [
          {
            tier: 'rare',
            questionsRequired: 1,
            loot: { armorId: 'vanguard', shards: 30 },
          },
          {
            tier: 'common',
            questionsRequired: 1,
            loot: { shards: 45 },
          },
        ],
        hasMerchant: true,
        hasPuzzleShrine: false,
      },

      // ── Segment D: BOSS — Mana Colossus ──
      {
        id: 's1_d',
        mode: 'boss',
        name: 'Colossus Chamber',
        bossId: 'mana_colossus',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // STAGE 2 — THE SUNKEN FOUNDRY (Ancient Tech Facility)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'stage_2',
    name: 'The Sunken Foundry',
    subtitle: 'Ancient Tech Facility — Mana Crystals',
    parallaxTheme: 'foundry',
    segments: [
      // ── Segment A: TRAVERSE (Vertical Platforming) ──
      {
        id: 's2_a',
        mode: 'traverse',
        name: 'Crystal Corridors',
        width: 3600,
        chests: [
          {
            tier: 'common',
            questionsRequired: 1,
            loot: { weaponId: 'axe', weaponTier: 'common', shards: 20 },
          },
          {
            tier: 'rare',
            questionsRequired: 1,
            loot: { weaponId: 'dual_pistol', weaponTier: 'rare', shards: 25 },
          },
        ],
        hasMerchant: false,
        hasPuzzleShrine: false,
      },

      // ── Segment B: HOLD THE FORT (3 Waves) ──
      {
        id: 's2_b',
        mode: 'defense',
        name: 'Pylon Chamber Alpha',
        pylonHp: 500,
        repairTerminalCount: 2,
        barricadeNodeCount: 2,
        defenseWaves: [
          {
            enemies: [
              { id: 'mana_husk', count: 4 },
              { id: 'rift_drone', count: 2 },
            ],
            spawnDelay: 2,
          },
          {
            enemies: [
              { id: 'corrupted_sentinel', count: 2 },
              { id: 'mana_stalker', count: 2 },
              { id: 'rift_drone', count: 2 },
            ],
            spawnDelay: 1.5,
          },
          {
            enemies: [
              { id: 'corrupted_sentinel', count: 3 },
              { id: 'mana_stalker', count: 3 },
              { id: 'rift_drone', count: 3 },
            ],
            spawnDelay: 1,
          },
        ],
      },

      // ── Segment C: TRAVERSE (Puzzle Shrine + Merchant) ──
      {
        id: 's2_c',
        mode: 'traverse',
        name: 'Foundry Depths',
        width: 2400,
        chests: [
          {
            tier: 'rare',
            questionsRequired: 1,
            loot: { armorId: 'rift_stalker', shards: 35 },
          },
          {
            tier: 'rare',
            questionsRequired: 1,
            loot: { weaponId: 'shotgun', weaponTier: 'rare', shards: 40 },
          },
        ],
        hasMerchant: true,
        hasPuzzleShrine: true,
      },

      // ── Segment D: SURVIVAL TIMER (90s) ──
      {
        id: 's2_d',
        mode: 'survival',
        name: 'Mana Surge Chamber',
        survivalDuration: 90,
        survivalWaves: [
          { enemies: [{ id: 'mana_husk', count: 4 }, { id: 'rift_drone', count: 2 }], spawnDelay: 2 },
          { enemies: [{ id: 'corrupted_sentinel', count: 2 }, { id: 'mana_stalker', count: 2 }], spawnDelay: 1.5 },
          { enemies: [{ id: 'void_spitter', count: 2 }, { id: 'mana_stalker', count: 3 }], spawnDelay: 1.5 },
          { enemies: [{ id: 'corrupted_sentinel', count: 3 }, { id: 'rift_drone', count: 3 }, { id: 'mana_stalker', count: 2 }], spawnDelay: 1 },
          { enemies: [{ id: 'corrupted_sentinel', count: 4 }, { id: 'mana_stalker', count: 4 }], spawnDelay: 1 },
        ],
      },

      // ── Segment E: BOSS — Forge Titan ──
      {
        id: 's2_e',
        mode: 'boss',
        name: 'Titan Crucible',
        bossId: 'forge_titan',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // STAGE 3 — THE RIFT SCAR (Zero-Point Chasm)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'stage_3',
    name: 'The Rift Scar',
    subtitle: 'Zero-Point Chasm — Where Reality Breaks',
    parallaxTheme: 'rift_scar',
    segments: [
      // ── Segment A: TRAVERSE (Floating Ruins) ──
      {
        id: 's3_a',
        mode: 'traverse',
        name: 'Shattered Expanse',
        width: 3000,
        chests: [
          {
            tier: 'rare',
            questionsRequired: 1,
            loot: { weaponId: 'rifle', weaponTier: 'rare', shards: 30 },
          },
          {
            tier: 'rare',
            questionsRequired: 1,
            loot: { weaponId: 'dual_pistol', weaponTier: 'epic', shards: 50 },
          },
          {
            tier: 'common',
            questionsRequired: 1,
            loot: { shards: 60 },
          },
        ],
        hasMerchant: false,
        hasPuzzleShrine: false,
      },

      // ── Segment B: HOLD THE FORT (5 Waves — Hardest) ──
      {
        id: 's3_b',
        mode: 'defense',
        name: 'Pylon Chamber Omega',
        pylonHp: 400, // lower = more tense
        repairTerminalCount: 3,
        barricadeNodeCount: 2,
        defenseWaves: [
          {
            enemies: [
              { id: 'mana_husk', count: 5 },
              { id: 'rift_drone', count: 3 },
            ],
            spawnDelay: 2,
          },
          {
            enemies: [
              { id: 'corrupted_sentinel', count: 3 },
              { id: 'mana_stalker', count: 3 },
            ],
            spawnDelay: 1.5,
          },
          {
            enemies: [
              { id: 'rift_brute', count: 1 },
              { id: 'mana_wisp', count: 4 },
              { id: 'rift_drone', count: 3 },
            ],
            spawnDelay: 1.5,
          },
          {
            enemies: [
              { id: 'rift_brute', count: 2 },
              { id: 'corrupted_sentinel', count: 3 },
              { id: 'mana_wisp', count: 3 },
            ],
            spawnDelay: 1,
          },
          {
            enemies: [
              { id: 'rift_brute', count: 2 },
              { id: 'mana_stalker', count: 4 },
              { id: 'mana_wisp', count: 5 },
              { id: 'rift_drone', count: 4 },
            ],
            spawnDelay: 0.8,
          },
        ],
      },

      // ── Segment C: GAUNTLET RUN ──
      {
        id: 's3_c',
        mode: 'gauntlet',
        name: 'Rift Corridor',
        gauntletDuration: 45,
        scrollSpeed: 180, // px/s
        quickDecryptGateCount: 2,
      },

      // ── Segment D: TRAVERSE (Final Merchant + Epic Chest) ──
      {
        id: 's3_d',
        mode: 'traverse',
        name: 'Warden\'s Antechamber',
        width: 2000,
        chests: [
          {
            tier: 'epic',
            questionsRequired: 2,
            loot: {
              weaponId: 'shotgun',
              weaponTier: 'epic',
              armorId: 'aether_praetor',
              shards: 100,
            },
          },
        ],
        hasMerchant: true,
        hasPuzzleShrine: false,
      },

      // ── Segment E: BOSS — Aetherion ──
      {
        id: 's3_e',
        mode: 'boss',
        name: 'The Rift Heart',
        bossId: 'aetherion',
      },
    ],
  },
];

/** Boss definitions (referenced by bossId in segments) */
export { BOSSES } from './bosses';
