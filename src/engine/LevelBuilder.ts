// ============================================================
// RIFTBOUND: SLAYER CORPS — Multi-Area Level Builder
// Builds expansive, interconnected multi-area stages:
//   1. TRAVERSE (3800x540, 4 distinct areas, vertical shafts,
//      underground tunnels, bounce vents, 4 chests + shrine)
//   2. SURVIVAL TIMER (1100x360, multi-tier courtyard + 2 terminals)
//   3. HOLD THE FORT (1160x360, Pylon courtyard + 2 flanks)
// ============================================================

import type { SegmentConfig } from '../types';
import type { EnemyInstance } from '../entities/Enemy';
import { createEnemy } from '../entities/Enemy';
import type { InteractableInstance } from '../entities/Interactables';
import {
  createBarricadeNode,
  createChest,
  createExitGate,
  createPuzzleShrine,
  createPylon,
  createTerminal,
} from '../entities/Interactables';

export interface Platform {
  x: number;
  y: number;
  w: number;
  h: number;
  oneWay?: boolean;
  kind?: 'stone' | 'metal' | 'wall';
}

export interface SpikeHazard {
  x: number;
  y: number;
  w: number;
  h: number;
  damage: number;
}

export interface BouncePad {
  x: number;
  y: number;
  w: number;
  h: number;
  boostVy: number;
}

export interface TorchProp {
  x: number;
  y: number;
  color: string;
}

export interface AreaZone {
  id: string;
  name: string;
  subtitle: string;
  startX: number;
  endX: number;
}

export interface SpawnPortal {
  x: number;
  y: number;
}

export interface BuiltLevel {
  segment: SegmentConfig;
  worldWidth: number;
  worldHeight: number;
  playerSpawn: { x: number; y: number };
  platforms: Platform[];
  spikes: SpikeHazard[];
  bouncePads: BouncePad[];
  torches: TorchProp[];
  areas: AreaZone[];
  enemies: EnemyInstance[];
  interactables: InteractableInstance[];
  spawnPortals: SpawnPortal[];
  pylonPos?: { x: number; y: number };
}

export const DEMO_SEGMENTS: Record<'traverse' | 'survival' | 'defense', SegmentConfig> = {
  traverse: {
    id: 'demo_traverse',
    mode: 'traverse',
    name: 'Sector 01–04 // Outskirts to Rift Sanctum',
    width: 3800,
    chests: [
      {
        tier: 'common',
        questionsRequired: 1,
        loot: { weaponId: 'dual_sword', weaponTier: 'rare', shards: 25 },
      },
      {
        tier: 'rare',
        questionsRequired: 1,
        loot: { weaponId: 'dual_pistol', weaponTier: 'rare', armorId: 'vanguard', shards: 40 },
      },
      {
        tier: 'rare',
        questionsRequired: 1,
        loot: { weaponId: 'axe', weaponTier: 'rare', shards: 45 },
      },
      {
        tier: 'epic',
        questionsRequired: 2,
        loot: { weaponId: 'rifle', weaponTier: 'epic', armorId: 'rift_stalker', shards: 80 },
      },
    ],
  },
  survival: {
    id: 'demo_survival',
    mode: 'survival',
    name: 'Foundry Courtyard — Survival 45s',
    survivalDuration: 45,
    survivalWaves: [
      { enemies: [{ id: 'mana_husk', count: 4 }], spawnDelay: 0.9 },
      { enemies: [{ id: 'mana_husk', count: 3 }, { id: 'rift_drone', count: 2 }], spawnDelay: 0.9 },
      { enemies: [{ id: 'mana_stalker', count: 3 }, { id: 'rift_drone', count: 2 }], spawnDelay: 0.8 },
      { enemies: [{ id: 'corrupted_sentinel', count: 1 }, { id: 'mana_stalker', count: 3 }], spawnDelay: 0.8 },
    ],
  },
  defense: {
    id: 'demo_defense',
    mode: 'defense',
    name: 'Twin-Flank Pylon Courtyard',
    pylonHp: 450,
    repairTerminalCount: 2,
    barricadeNodeCount: 2,
    defenseWaves: [
      {
        enemies: [
          { id: 'mana_husk', count: 4 },
          { id: 'rift_drone', count: 2 },
        ],
        spawnDelay: 1.3,
      },
      {
        enemies: [
          { id: 'corrupted_sentinel', count: 2 },
          { id: 'mana_stalker', count: 2 },
          { id: 'rift_drone', count: 2 },
        ],
        spawnDelay: 1.1,
      },
      {
        enemies: [
          { id: 'rift_brute', count: 1 },
          { id: 'corrupted_sentinel', count: 2 },
          { id: 'mana_husk', count: 4 },
        ],
        spawnDelay: 1.0,
      },
    ],
  },
};

export function buildDemoLevel(modeKey: 'traverse' | 'survival' | 'defense'): BuiltLevel {
  if (modeKey === 'survival') return _buildSurvivalArena();
  if (modeKey === 'defense') return _buildDefenseArena();
  return _buildTraverseWorld();
}

// ── 1. EXPANSIVE 4-AREA TRAVERSE WORLD (3800 x 540) ─────────
function _buildTraverseWorld(): BuiltLevel {
  const seg = DEMO_SEGMENTS.traverse;
  const worldW = 3800;
  const worldH = 540;

  const areas: AreaZone[] = [
    {
      id: 'area_1',
      name: 'AREA 1: THE ASHFALL OUTSKIRTS',
      subtitle: 'Reruntuhan Gerbang Luar & Ruang Bawah Tanah',
      startX: 0,
      endX: 950,
    },
    {
      id: 'area_2',
      name: 'AREA 2: THE TWIN CHASM',
      subtitle: 'Menara Wall-Jump & Jurang Duri Pogo',
      startX: 950,
      endX: 1950,
    },
    {
      id: 'area_3',
      name: 'AREA 3: SUNKEN FOUNDRY CATWALKS',
      subtitle: 'Jembatan Besi & Kuil Puzzle Kuno',
      startX: 1950,
      endX: 2950,
    },
    {
      id: 'area_4',
      name: 'AREA 4: THE RIFT SANCTUM',
      subtitle: 'Puing Melayang Menuju Checkpoint Gate',
      startX: 2950,
      endX: 3800,
    },
  ];

  const platforms: Platform[] = [
    // World boundary walls
    { x: -16, y: 0, w: 16, h: worldH, kind: 'wall' },
    { x: worldW, y: 0, w: 16, h: worldH, kind: 'wall' },

    // ── AREA 1: ASHFALL OUTSKIRTS (0 - 950) ──
    { x: 0, y: 400, w: 460, h: 140, kind: 'stone' },
    // Crypt drop-down grate (press S to enter lower tunnel!)
    { x: 460, y: 400, w: 120, h: 10, oneWay: true, kind: 'metal' },
    { x: 420, y: 496, w: 420, h: 44, kind: 'stone' }, // lower crypt floor
    { x: 580, y: 400, w: 370, h: 140, kind: 'stone' },
    // Upper lookout balcony & bridge
    { x: 190, y: 340, w: 95, h: 10, oneWay: true, kind: 'metal' },
    { x: 320, y: 285, w: 120, h: 10, oneWay: true, kind: 'metal' },
    { x: 480, y: 240, w: 150, h: 12, kind: 'stone' },
    { x: 740, y: 320, w: 110, h: 10, oneWay: true, kind: 'metal' },

    // ── AREA 2: THE TWIN CHASM & WALL-JUMP SHAFT (950 - 1950) ──
    // Spike chasm floor + floating stepping stones
    { x: 950, y: 400, w: 160, h: 140, kind: 'stone' },
    { x: 1110, y: 470, w: 280, h: 70, kind: 'stone' }, // chasm floor
    { x: 1185, y: 375, w: 70, h: 10, oneWay: true, kind: 'metal' },
    { x: 1390, y: 400, w: 560, h: 140, kind: 'stone' },
    // Twin vertical shaft walls for wall-jump climb!
    { x: 1480, y: 200, w: 22, h: 200, kind: 'wall' },
    { x: 1580, y: 130, w: 22, h: 200, kind: 'wall' },
    // High sky-balcony (Chest 2: Dual Pistol + Vanguard Armor)
    { x: 1602, y: 170, w: 220, h: 14, kind: 'metal' },
    { x: 1680, y: 295, w: 130, h: 10, oneWay: true, kind: 'metal' },

    // ── AREA 3: SUNKEN FOUNDRY CATWALKS (1950 - 2950) ──
    { x: 1950, y: 410, w: 460, h: 130, kind: 'stone' },
    { x: 2410, y: 460, w: 140, h: 80, kind: 'stone' }, // sunken pit
    { x: 2550, y: 410, w: 400, h: 130, kind: 'stone' },
    // Multi-tiered catwalks
    { x: 2040, y: 335, w: 140, h: 10, oneWay: true, kind: 'metal' },
    { x: 2220, y: 270, w: 160, h: 10, oneWay: true, kind: 'metal' },
    { x: 2420, y: 220, w: 180, h: 12, kind: 'stone' }, // Upper shrine platform!
    { x: 2660, y: 310, w: 140, h: 10, oneWay: true, kind: 'metal' },
    { x: 2780, y: 245, w: 130, h: 10, oneWay: true, kind: 'metal' },

    // ── AREA 4: THE RIFT SANCTUM (2950 - 3800) ──
    { x: 2950, y: 410, w: 190, h: 130, kind: 'stone' },
    // Floating obsidian islands over void
    { x: 3180, y: 365, w: 100, h: 16, kind: 'stone' },
    { x: 3315, y: 305, w: 110, h: 16, kind: 'stone' },
    { x: 3190, y: 225, w: 110, h: 10, oneWay: true, kind: 'metal' },
    { x: 3340, y: 170, w: 140, h: 14, kind: 'metal' }, // Epic Chest ledge
    // Final Gate Platform
    { x: 3470, y: 350, w: 330, h: 190, kind: 'stone' },
  ];

  const spikes: SpikeHazard[] = [
    // Chasm spikes in Area 2 (ideal for Pogo-Slash across!)
    { x: 1120, y: 458, w: 260, h: 12, damage: 15 },
    // Sunken pit spikes in Area 3
    { x: 2420, y: 448, w: 120, h: 12, damage: 15 },
  ];

  const bouncePads: BouncePad[] = [
    // Mana Uplift vents for fast vertical movement
    { x: 870, y: 392, w: 28, h: 8, boostVy: -420 },
    { x: 1990, y: 402, w: 28, h: 8, boostVy: -410 },
    { x: 3090, y: 402, w: 28, h: 8, boostVy: -430 },
  ];

  const torches: TorchProp[] = [
    { x: 90, y: 376, color: '#F97316' },
    { x: 520, y: 216, color: '#00F0FF' },
    { x: 640, y: 472, color: '#A855F7' },
    { x: 1020, y: 376, color: '#F97316' },
    { x: 1640, y: 146, color: '#00F0FF' },
    { x: 2100, y: 386, color: '#F97316' },
    { x: 2500, y: 196, color: '#A855F7' },
    { x: 3000, y: 386, color: '#00F0FF' },
    { x: 3610, y: 326, color: '#FACC15' },
  ];

  const enemies: EnemyInstance[] = [
    // Area 1
    createEnemy('mana_husk', 280, 380, { patrolLeft: 180, patrolRight: 430, targetingPylon: false }),
    createEnemy('mana_husk', 650, 476, { patrolLeft: 460, patrolRight: 800, targetingPylon: false }),
    createEnemy('rift_drone', 550, 200, { targetingPylon: false }),
    createEnemy('mana_husk', 720, 380, { patrolLeft: 620, patrolRight: 850, targetingPylon: false }),

    // Area 2
    createEnemy('rift_drone', 1240, 290, { targetingPylon: false }),
    createEnemy('mana_stalker', 1430, 382, { patrolLeft: 1400, patrolRight: 1620, targetingPylon: false }),
    createEnemy('mana_husk', 1730, 380, { patrolLeft: 1640, patrolRight: 1920, targetingPylon: false }),

    // Area 3
    createEnemy('corrupted_sentinel', 2160, 388, { patrolLeft: 2040, patrolRight: 2360, targetingPylon: false }),
    createEnemy('rift_drone', 2350, 180, { targetingPylon: false }),
    createEnemy('mana_stalker', 2680, 392, { patrolLeft: 2580, patrolRight: 2900, targetingPylon: false }),
    createEnemy('mana_husk', 2740, 290, { patrolLeft: 2660, patrolRight: 2790, targetingPylon: false }),

    // Area 4
    createEnemy('rift_drone', 3240, 250, { targetingPylon: false }),
    createEnemy('rift_brute', 3540, 322, { patrolLeft: 3480, patrolRight: 3680, targetingPylon: false }),
    createEnemy('mana_stalker', 3620, 332, { patrolLeft: 3490, patrolRight: 3700, targetingPylon: false }),
  ];

  const interactables: InteractableInstance[] = [
    // Chest 1 in lower crypt (Area 1)
    createChest(740, 472, seg.chests![0]),
    // Chest 2 atop wall-jump balcony (Area 2)
    createChest(1750, 146, seg.chests![1]),
    // Chest 3 on Area 3 foundry ground
    createChest(2840, 386, seg.chests![2]),
    // Ancient Puzzle Shrine atop Area 3 catwalk
    createPuzzleShrine(2495, 180),
    // Chest 4 Epic on high Sanctum platform (Area 4)
    createChest(3410, 146, seg.chests![3]),
    // Final Checkpoint Exit Gate
    createExitGate(3720, 302),
  ];

  return {
    segment: seg,
    worldWidth: worldW,
    worldHeight: worldH,
    playerSpawn: { x: 48, y: 360 },
    platforms,
    spikes,
    bouncePads,
    torches,
    areas,
    enemies,
    interactables,
    spawnPortals: [],
  };
}

// ── 2. MULTI-TIER SURVIVAL COURTYARD (1100 x 360) ───────────
function _buildSurvivalArena(): BuiltLevel {
  const seg = DEMO_SEGMENTS.survival;
  const worldW = 1100;
  const worldH = 360;

  const platforms: Platform[] = [
    { x: 0, y: 316, w: worldW, h: 44, kind: 'stone' },
    { x: -16, y: 0, w: 16, h: worldH, kind: 'wall' },
    { x: worldW, y: 0, w: 16, h: worldH, kind: 'wall' },
    // Multi-level flanking bridges & towers
    { x: 90, y: 245, w: 160, h: 10, oneWay: true, kind: 'metal' },
    { x: 850, y: 245, w: 160, h: 10, oneWay: true, kind: 'metal' },
    { x: 300, y: 225, w: 150, h: 10, oneWay: true, kind: 'metal' },
    { x: 650, y: 225, w: 150, h: 10, oneWay: true, kind: 'metal' },
    { x: 460, y: 155, w: 180, h: 12, kind: 'stone' },
    // Wall-jump center pillars
    { x: 420, y: 160, w: 16, h: 90, kind: 'wall' },
    { x: 664, y: 160, w: 16, h: 90, kind: 'wall' },
  ];

  const bouncePads: BouncePad[] = [
    { x: 205, y: 308, w: 28, h: 8, boostVy: -380 },
    { x: 865, y: 308, w: 28, h: 8, boostVy: -380 },
  ];

  const torches: TorchProp[] = [
    { x: 150, y: 292, color: '#EF4444' },
    { x: 550, y: 131, color: '#00F0FF' },
    { x: 950, y: 292, color: '#EF4444' },
  ];

  const interactables: InteractableInstance[] = [
    createTerminal(150, 221, 'emergency'),
    createTerminal(930, 221, 'emergency'),
  ];

  return {
    segment: seg,
    worldWidth: worldW,
    worldHeight: worldH,
    playerSpawn: { x: 540, y: 280 },
    platforms,
    spikes: [],
    bouncePads,
    torches,
    areas: [
      {
        id: 'survival_arena',
        name: 'SURVIVAL COURTYARD',
        subtitle: 'Bergerak bebas melintasi 2 menara & aktifkan Emergency Shield!',
        startX: 0,
        endX: worldW,
      },
    ],
    enemies: [],
    interactables,
    spawnPortals: [
      { x: 40, y: 288 },
      { x: 550, y: 125 },
      { x: worldW - 44, y: 288 },
    ],
  };
}

// ── 3. TWIN-FLANK HOLD THE FORT ARENA (1160 x 360) ─────────
function _buildDefenseArena(): BuiltLevel {
  const seg = DEMO_SEGMENTS.defense;
  const worldW = 1160;
  const worldH = 360;

  const platforms: Platform[] = [
    { x: 0, y: 316, w: worldW, h: 44, kind: 'stone' },
    { x: -16, y: 0, w: 16, h: worldH, kind: 'wall' },
    { x: worldW, y: 0, w: 16, h: worldH, kind: 'wall' },
    // Elevated vantage bridges
    { x: 170, y: 240, w: 180, h: 10, oneWay: true, kind: 'metal' },
    { x: 810, y: 240, w: 180, h: 10, oneWay: true, kind: 'metal' },
    { x: 430, y: 205, w: 300, h: 10, oneWay: true, kind: 'metal' },
  ];

  const bouncePads: BouncePad[] = [
    { x: 375, y: 308, w: 28, h: 8, boostVy: -360 },
    { x: 755, y: 308, w: 28, h: 8, boostVy: -360 },
  ];

  const torches: TorchProp[] = [
    { x: 300, y: 292, color: '#00F0FF' },
    { x: 860, y: 292, color: '#00F0FF' },
  ];

  const pylonX = 568;
  const pylonY = 268;

  const interactables: InteractableInstance[] = [
    createPylon(pylonX, pylonY, seg.pylonHp ?? 450),
    createTerminal(470, 181, 'repair'),
    createTerminal(674, 181, 'repair'),
    createBarricadeNode(320, 284),
    createBarricadeNode(820, 284),
  ];

  return {
    segment: seg,
    worldWidth: worldW,
    worldHeight: worldH,
    playerSpawn: { x: 615, y: 280 },
    platforms,
    spikes: [],
    bouncePads,
    torches,
    areas: [
      {
        id: 'defense_courtyard',
        name: 'PYLON CITADEL COURTYARD',
        subtitle: 'Jaga sisi kiri & kanan — gunakan Bounce Vent & Barricade!',
        startX: 0,
        endX: worldW,
      },
    ],
    enemies: [],
    interactables,
    spawnPortals: [
      { x: 34, y: 288 },
      { x: worldW - 42, y: 288 },
    ],
    pylonPos: { x: pylonX + 12, y: pylonY + 24 },
  };
}
