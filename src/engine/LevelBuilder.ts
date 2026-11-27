// ============================================================
// RIFTBOUND: SLAYER CORPS — Multi-Stage Level Builder
// Rich mechanisms per Stage:
//   - Moving Platforms (horizontal ferries + vertical lifts)
//   - Crumbling Platforms (shake -> collapse -> reform)
//   - Timed Laser Beams
//   - Explosive Mana Crystals (shoot/slash to detonate AoE!)
//   - Bounce Pads + Twin Wall-Jump Towers
// Tiered Chests:
//   - Common (1 soal): Energy Cell + Reserve Ammo Pack + Vial
//   - Rare (2 soal beruntun): Upgraded Weapons (Sword/Axe/Shotgun/etc.)
//   - Epic (3 soal beruntun): Endgame Armors & Dual Sword / Rifle
// ============================================================

import type { BossId, SegmentConfig } from '../types';
import type { EnemyInstance } from '../entities/Enemy';
import { createEnemy } from '../entities/Enemy';
import type { InteractableInstance } from '../entities/Interactables';
import {
  createBarricadeNode,
  createChest,
  createExitGate,
  createPuzzleShrine,
  createPylon,
  createQuickDecryptGate,
  createRunicPillar,
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

export interface MovingPlatform {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  speed: number;
  vx: number;
  vy: number;
  dir: 1 | -1;
}

export interface CrumblingPlatform {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  state: 'solid' | 'shaking' | 'broken';
  timer: number;
}

export interface LaserHazard {
  x: number;
  y: number;
  w: number;
  h: number;
  period: number;
  activeWindow: number;
  offset: number;
  damage: number;
}

export interface ExplosiveCrystal {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  exploded: boolean;
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

export interface BossSpawnConfig {
  id: BossId;
  x: number;
  y: number;
  triggerX: number;
  arenaMinX: number;
}

export interface BuiltLevel {
  stageNumber: 1 | 2 | 3;
  themeTopic: string;
  parallaxTheme: 'ruins' | 'foundry' | 'rift_scar';
  segment: SegmentConfig;
  worldWidth: number;
  worldHeight: number;
  playerSpawn: { x: number; y: number };
  platforms: Platform[];
  movingPlatforms: MovingPlatform[];
  crumblingPlatforms: CrumblingPlatform[];
  lasers: LaserHazard[];
  crystals: ExplosiveCrystal[];
  spikes: SpikeHazard[];
  bouncePads: BouncePad[];
  torches: TorchProp[];
  areas: AreaZone[];
  enemies: EnemyInstance[];
  interactables: InteractableInstance[];
  spawnPortals: SpawnPortal[];
  pylonPos?: { x: number; y: number };
  bossSpawn?: BossSpawnConfig;
}

export type PlayableModeKey = 'stage_1' | 'stage_2' | 'stage_3' | 'survival' | 'defense';

export const STAGE_METADATA: Record<
  1 | 2 | 3,
  { title: string; subtitle: string; themeTopic: string; parallaxTheme: 'ruins' | 'foundry' | 'rift_scar' }
> = {
  1: {
    title: 'STAGE 1: THE FALLEN PERIMETER',
    subtitle: 'Outskirts Ruins — Boss: Mana Colossus',
    themeTopic: 'Berpikir Komputasional',
    parallaxTheme: 'ruins',
  },
  2: {
    title: 'STAGE 2: THE SUNKEN FOUNDRY',
    subtitle: 'Ancient Tech Facility — Boss: Forge Titan',
    themeTopic: 'Gerbang Logika',
    parallaxTheme: 'foundry',
  },
  3: {
    title: 'STAGE 3: THE RIFT SCAR',
    subtitle: 'Zero-Point Chasm — Boss: Aetherion',
    themeTopic: 'Sistem Biner',
    parallaxTheme: 'rift_scar',
  },
};

export const DEMO_SEGMENTS: Record<'survival' | 'defense', SegmentConfig> = {
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

function _mkMoving(
  id: string,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  w: number,
  speed: number
): MovingPlatform {
  return { id, x: startX, y: startY, w, h: 10, startX, startY, endX, endY, speed, vx: 0, vy: 0, dir: 1 };
}

function _mkCrumble(id: string, x: number, y: number, w: number): CrumblingPlatform {
  return { id, x, y, w, h: 10, state: 'solid', timer: 0 };
}

export function buildPlayableLevel(modeKey: PlayableModeKey): BuiltLevel {
  if (modeKey === 'survival') return _buildSurvivalArena();
  if (modeKey === 'defense') return _buildDefenseArena();
  if (modeKey === 'stage_2') return _buildStage2();
  if (modeKey === 'stage_3') return _buildStage3();
  return _buildStage1();
}

// ═══════════════════════════════════════════════════════════
// STAGE 1 — THE FALLEN PERIMETER (Berpikir Komputasional)
// ═══════════════════════════════════════════════════════════
function _buildStage1(): BuiltLevel {
  const worldW = 4800;
  const worldH = 540;
  const meta = STAGE_METADATA[1];

  const areas: AreaZone[] = [
    { id: 's1_a1', name: 'AREA 1: ASHFALL OUTSKIRTS', subtitle: `Tema: ${meta.themeTopic} · Mulai dengan Dagger!`, startX: 0, endX: 1150 },
    { id: 's1_a2', name: 'AREA 2: THE TWIN CHASM', subtitle: 'Moving Ferry, Crumbling Bridge & Wall-Jump Tower', startX: 1150, endX: 2350 },
    { id: 's1_a3', name: 'AREA 3: PERIMETER COURTYARD', subtitle: 'Crystal Traps, Armory Chest & Puzzle Shrine', startX: 2350, endX: 3650 },
    { id: 's1_a4', name: 'AREA 4: COLOSSUS SANCTUM', subtitle: 'Boss Arena — Mana Colossus (Drop Sword & Armor!)', startX: 3650, endX: worldW },
  ];

  const platforms: Platform[] = [
    { x: -16, y: 0, w: 16, h: worldH, kind: 'wall' },
    { x: worldW, y: 0, w: 16, h: worldH, kind: 'wall' },

    // Area 1
    { x: 0, y: 400, w: 500, h: 140, kind: 'stone' },
    { x: 500, y: 400, w: 130, h: 10, oneWay: true, kind: 'metal' },
    { x: 460, y: 496, w: 460, h: 44, kind: 'stone' },
    { x: 630, y: 400, w: 520, h: 140, kind: 'stone' },
    { x: 200, y: 340, w: 105, h: 10, oneWay: true, kind: 'metal' },
    { x: 350, y: 280, w: 130, h: 10, oneWay: true, kind: 'metal' },
    { x: 530, y: 235, w: 160, h: 12, kind: 'stone' },
    { x: 840, y: 315, w: 130, h: 10, oneWay: true, kind: 'metal' },

    // Area 2 — Chasm + Moving Ferry + Wall-Jump Tower
    { x: 1150, y: 400, w: 160, h: 140, kind: 'stone' },
    { x: 1310, y: 472, w: 320, h: 68, kind: 'stone' },
    { x: 1630, y: 400, w: 720, h: 140, kind: 'stone' },
    { x: 1710, y: 195, w: 22, h: 205, kind: 'wall' },
    { x: 1815, y: 125, w: 22, h: 205, kind: 'wall' },
    { x: 1837, y: 170, w: 250, h: 14, kind: 'metal' },
    { x: 2130, y: 290, w: 150, h: 10, oneWay: true, kind: 'metal' },

    // Area 3 — Crumbling bridges + Vertical Lift + Shrine
    { x: 2350, y: 410, w: 450, h: 130, kind: 'stone' },
    { x: 2800, y: 465, w: 280, h: 75, kind: 'stone' },
    { x: 3080, y: 410, w: 570, h: 130, kind: 'stone' },
    { x: 2450, y: 330, w: 150, h: 10, oneWay: true, kind: 'metal' },
    { x: 2660, y: 265, w: 170, h: 10, oneWay: true, kind: 'metal' },
    { x: 2900, y: 215, w: 210, h: 12, kind: 'stone' },
    { x: 3390, y: 245, w: 160, h: 10, oneWay: true, kind: 'metal' },

    // Area 4 — Boss Arena
    { x: 3650, y: 400, w: 1150, h: 140, kind: 'stone' },
    { x: 3820, y: 315, w: 130, h: 10, oneWay: true, kind: 'metal' },
    { x: 4280, y: 315, w: 130, h: 10, oneWay: true, kind: 'metal' },
    { x: 4050, y: 245, w: 150, h: 10, oneWay: true, kind: 'metal' },
  ];

  const movingPlatforms: MovingPlatform[] = [
    _mkMoving('s1_mp1', 1340, 360, 1540, 360, 72, 65), // Horizontal ferry over chasm
    _mkMoving('s1_mp2', 3220, 360, 3220, 240, 68, 55), // Vertical lift in Area 3
  ];

  const crumblingPlatforms: CrumblingPlatform[] = [
    _mkCrumble('s1_cp1', 2840, 390, 64),
    _mkCrumble('s1_cp2', 2945, 375, 64),
  ];

  const crystals: ExplosiveCrystal[] = [
    { id: 's1_c1', x: 760, y: 376, w: 14, h: 24, exploded: false },
    { id: 's1_c2', x: 2560, y: 386, w: 14, h: 24, exploded: false },
    { id: 's1_c3', x: 3310, y: 386, w: 14, h: 24, exploded: false },
  ];

  const spikes: SpikeHazard[] = [
    { x: 1325, y: 460, w: 290, h: 12, damage: 15 },
    { x: 2815, y: 453, w: 250, h: 12, damage: 15 },
  ];

  const bouncePads: BouncePad[] = [
    { x: 1020, y: 392, w: 28, h: 8, boostVy: -420 },
    { x: 2290, y: 392, w: 28, h: 8, boostVy: -420 },
    { x: 3580, y: 402, w: 28, h: 8, boostVy: -400 },
  ];

  const torches: TorchProp[] = [
    { x: 90, y: 376, color: '#F97316' },
    { x: 750, y: 472, color: '#A855F7' },
    { x: 1870, y: 146, color: '#00F0FF' },
    { x: 2990, y: 191, color: '#A855F7' },
    { x: 3760, y: 376, color: '#EF4444' },
    { x: 4660, y: 376, color: '#FACC15' },
  ];

  const enemies: EnemyInstance[] = [
    createEnemy('mana_husk', 290, 380, { patrolLeft: 180, patrolRight: 460, targetingPylon: false }),
    createEnemy('mana_husk', 690, 476, { patrolLeft: 490, patrolRight: 880, targetingPylon: false }),
    createEnemy('rift_drone', 580, 180, { targetingPylon: false }),
    createEnemy('mana_husk', 890, 380, { patrolLeft: 740, patrolRight: 1080, targetingPylon: false }),
    createEnemy('rift_drone', 1460, 260, { targetingPylon: false }),
    createEnemy('mana_stalker', 1940, 382, { patrolLeft: 1860, patrolRight: 2150, targetingPylon: false }),
    createEnemy('mana_husk', 2530, 390, { patrolLeft: 2400, patrolRight: 2770, targetingPylon: false }),
    createEnemy('rift_drone', 2860, 175, { targetingPylon: false }),
    createEnemy('mana_stalker', 3280, 392, { patrolLeft: 3120, patrolRight: 3550, targetingPylon: false }),
  ];

  const interactables: InteractableInstance[] = [
    // Standard Supply Chest (1 soal -> Energy + Ammo Pack + Vial + Shards)
    createChest(790, 472, {
      tier: 'common',
      questionsRequired: 1,
      loot: { energyRestore: 65, ammoPacks: 1, nanoVials: 1, shards: 25 },
    }),
    // Standard Supply Chest (1 soal -> Energy + Ammo Pack + Shards)
    createChest(2180, 266, {
      tier: 'common',
      questionsRequired: 1,
      loot: { energyRestore: 70, ammoPacks: 1, shards: 30 },
    }),
    // Rare Armory Chest (2 soal beruntun -> Sword + Dual Pistol + Ammo)
    createChest(1940, 146, {
      tier: 'rare',
      questionsRequired: 2,
      loot: { weaponId: 'sword', weaponTier: 'rare', ammoPacks: 1, shards: 50 },
    }),
    // Epic Relic Chest (3 soal beruntun -> Dual Pistol + Vanguard Armor!)
    createChest(3460, 221, {
      tier: 'epic',
      questionsRequired: 3,
      loot: { weaponId: 'dual_pistol', weaponTier: 'rare', armorId: 'vanguard', ammoPacks: 2, shards: 90 },
    }),
    createPuzzleShrine(2990, 175),
    createTerminal(2490, 306, 'emergency'),
    createRunicPillar(3730, 360),
    createExitGate(4710, 352),
  ];

  return {
    stageNumber: 1,
    themeTopic: meta.themeTopic,
    parallaxTheme: meta.parallaxTheme,
    segment: { id: 'stage_1_full', mode: 'traverse', name: meta.title, width: worldW },
    worldWidth: worldW,
    worldHeight: worldH,
    playerSpawn: { x: 48, y: 360 },
    platforms,
    movingPlatforms,
    crumblingPlatforms,
    lasers: [],
    crystals,
    spikes,
    bouncePads,
    torches,
    areas,
    enemies,
    interactables,
    spawnPortals: [],
    bossSpawn: { id: 'mana_colossus', x: 4380, y: 344, triggerX: 3690, arenaMinX: 3650 },
  };
}

// ═══════════════════════════════════════════════════════════
// STAGE 2 — THE SUNKEN FOUNDRY (Gerbang Logika)
// ═══════════════════════════════════════════════════════════
function _buildStage2(): BuiltLevel {
  const worldW = 4800;
  const worldH = 540;
  const meta = STAGE_METADATA[2];

  const areas: AreaZone[] = [
    { id: 's2_a1', name: 'AREA 1: FOUNDRY ENTRY', subtitle: `Tema: ${meta.themeTopic} · Laser & Moving Lift`, startX: 0, endX: 1150 },
    { id: 's2_a2', name: 'AREA 2: SMELTER SHAFTS', subtitle: 'Sentinel Guard, Crumbling Catwalks & Crystal Traps', startX: 1150, endX: 2350 },
    { id: 's2_a3', name: 'AREA 3: RELAY CONDUIT', subtitle: 'Logic Gate Barrier & Ancient Shrine', startX: 2350, endX: 3650 },
    { id: 's2_a4', name: 'AREA 4: TITAN CRUCIBLE', subtitle: 'Boss Arena — Forge Titan (Drop Epic Axe & Shotgun!)', startX: 3650, endX: worldW },
  ];

  const platforms: Platform[] = [
    { x: -16, y: 0, w: 16, h: worldH, kind: 'wall' },
    { x: worldW, y: 0, w: 16, h: worldH, kind: 'wall' },

    // Area 1
    { x: 0, y: 410, w: 620, h: 130, kind: 'stone' },
    { x: 620, y: 465, w: 200, h: 75, kind: 'stone' },
    { x: 820, y: 410, w: 330, h: 130, kind: 'stone' },
    { x: 240, y: 330, w: 130, h: 10, oneWay: true, kind: 'metal' },
    { x: 640, y: 215, w: 160, h: 12, kind: 'stone' },
    { x: 880, y: 295, w: 150, h: 10, oneWay: true, kind: 'metal' },

    // Area 2
    { x: 1150, y: 410, w: 480, h: 130, kind: 'stone' },
    { x: 1630, y: 360, w: 180, h: 180, kind: 'stone' },
    { x: 1810, y: 410, w: 540, h: 130, kind: 'stone' },
    { x: 1260, y: 170, w: 22, h: 190, kind: 'wall' },
    { x: 1365, y: 120, w: 22, h: 200, kind: 'wall' },
    { x: 1387, y: 165, w: 230, h: 14, kind: 'metal' },
    { x: 2080, y: 245, w: 160, h: 12, kind: 'stone' },

    // Area 3
    { x: 2350, y: 410, w: 1300, h: 130, kind: 'stone' },
    { x: 2560, y: 325, w: 160, h: 10, oneWay: true, kind: 'metal' },
    { x: 2990, y: 200, w: 220, h: 12, kind: 'stone' },
    { x: 3320, y: 295, w: 180, h: 10, oneWay: true, kind: 'metal' },

    // Area 4 — Forge Titan Boss Arena
    { x: 3650, y: 400, w: 1150, h: 140, kind: 'stone' },
    { x: 3820, y: 310, w: 140, h: 10, oneWay: true, kind: 'metal' },
    { x: 4070, y: 245, w: 150, h: 10, oneWay: true, kind: 'metal' },
    { x: 4310, y: 310, w: 140, h: 10, oneWay: true, kind: 'metal' },
  ];

  const movingPlatforms: MovingPlatform[] = [
    _mkMoving('s2_mp1', 420, 315, 420, 215, 70, 60),
    _mkMoving('s2_mp2', 1860, 315, 2020, 315, 76, 75),
  ];

  const crumblingPlatforms: CrumblingPlatform[] = [
    _mkCrumble('s2_cp1', 2765, 260, 72),
    _mkCrumble('s2_cp2', 2875, 240, 72),
  ];

  const lasers: LaserHazard[] = [
    { x: 970, y: 325, w: 8, h: 85, period: 3.2, activeWindow: 1.4, offset: 0, damage: 16 },
    { x: 2020, y: 330, w: 8, h: 80, period: 3.0, activeWindow: 1.3, offset: 1.2, damage: 18 },
    { x: 3230, y: 320, w: 8, h: 90, period: 2.8, activeWindow: 1.3, offset: 0.6, damage: 18 },
  ];

  const crystals: ExplosiveCrystal[] = [
    { id: 's2_c1', x: 410, y: 386, w: 14, h: 24, exploded: false },
    { id: 's2_c2', x: 1960, y: 386, w: 14, h: 24, exploded: false },
    { id: 's2_c3', x: 3200, y: 386, w: 14, h: 24, exploded: false },
  ];

  const spikes: SpikeHazard[] = [
    { x: 635, y: 453, w: 170, h: 12, damage: 15 },
    { x: 2800, y: 398, w: 150, h: 12, damage: 18 },
  ];

  const bouncePads: BouncePad[] = [
    { x: 1050, y: 402, w: 28, h: 8, boostVy: -420 },
    { x: 2280, y: 402, w: 28, h: 8, boostVy: -420 },
    { x: 3560, y: 402, w: 28, h: 8, boostVy: -410 },
  ];

  const torches: TorchProp[] = [
    { x: 120, y: 386, color: '#A855F7' },
    { x: 700, y: 191, color: '#00F0FF' },
    { x: 1500, y: 141, color: '#F97316' },
    { x: 3090, y: 176, color: '#A855F7' },
    { x: 3780, y: 376, color: '#EF4444' },
    { x: 4670, y: 376, color: '#FACC15' },
  ];

  const enemies: EnemyInstance[] = [
    createEnemy('corrupted_sentinel', 350, 388, { patrolLeft: 200, patrolRight: 570, targetingPylon: false }),
    createEnemy('rift_drone', 720, 150, { targetingPylon: false }),
    createEnemy('mana_stalker', 940, 392, { patrolLeft: 840, patrolRight: 1120, targetingPylon: false }),
    createEnemy('void_spitter', 1710, 346, { targetingPylon: false }),
    createEnemy('corrupted_sentinel', 1940, 388, { patrolLeft: 1830, patrolRight: 2240, targetingPylon: false }),
    createEnemy('mana_stalker', 2520, 392, { patrolLeft: 2390, patrolRight: 2600, targetingPylon: false }),
    createEnemy('rift_drone', 2920, 195, { targetingPylon: false }),
    createEnemy('corrupted_sentinel', 3250, 388, { patrolLeft: 3020, patrolRight: 3520, targetingPylon: false }),
  ];

  const interactables: InteractableInstance[] = [
    // Supply Chest (1 soal -> Energy + Ammo)
    createChest(710, 191, {
      tier: 'common',
      questionsRequired: 1,
      loot: { energyRestore: 75, ammoPacks: 1, nanoVials: 1, shards: 35 },
    }),
    // Rare Armory Chest (2 soal -> Axe + Ammo)
    createChest(1480, 141, {
      tier: 'rare',
      questionsRequired: 2,
      loot: { weaponId: 'axe', weaponTier: 'rare', ammoPacks: 1, shards: 60 },
    }),
    // Rare Armory Chest (2 soal -> Shotgun + Ammo)
    createChest(2140, 221, {
      tier: 'rare',
      questionsRequired: 2,
      loot: { weaponId: 'shotgun', weaponTier: 'rare', ammoPacks: 1, shards: 65 },
    }),
    // Epic Relic Chest (3 soal -> Rift-Stalker Armor + Epic Dual Pistol)
    createChest(3380, 271, {
      tier: 'epic',
      questionsRequired: 3,
      loot: { weaponId: 'dual_pistol', weaponTier: 'epic', armorId: 'rift_stalker', ammoPacks: 2, shards: 120 },
    }),
    createQuickDecryptGate(2630, 362),
    createPuzzleShrine(3080, 160),
    createTerminal(2610, 301, 'emergency'),
    createRunicPillar(3730, 360),
    createExitGate(4710, 352),
  ];

  return {
    stageNumber: 2,
    themeTopic: meta.themeTopic,
    parallaxTheme: meta.parallaxTheme,
    segment: { id: 'stage_2_full', mode: 'traverse', name: meta.title, width: worldW },
    worldWidth: worldW,
    worldHeight: worldH,
    playerSpawn: { x: 48, y: 370 },
    platforms,
    movingPlatforms,
    crumblingPlatforms,
    lasers,
    crystals,
    spikes,
    bouncePads,
    torches,
    areas,
    enemies,
    interactables,
    spawnPortals: [],
    bossSpawn: { id: 'forge_titan', x: 4380, y: 336, triggerX: 3690, arenaMinX: 3650 },
  };
}

// ═══════════════════════════════════════════════════════════
// STAGE 3 — THE RIFT SCAR (Sistem Biner)
// ═══════════════════════════════════════════════════════════
function _buildStage3(): BuiltLevel {
  const worldW = 4800;
  const worldH = 540;
  const meta = STAGE_METADATA[3];

  const areas: AreaZone[] = [
    { id: 's3_a1', name: 'AREA 1: SHATTERED EXPANSE', subtitle: `Tema: ${meta.themeTopic} · Floating Bridges`, startX: 0, endX: 1150 },
    { id: 's3_a2', name: 'AREA 2: ZERO-POINT GAUNTLET', subtitle: 'Rift Lasers, Moving Sky-Ferries & Brute Guard', startX: 1150, endX: 2400 },
    { id: 's3_a3', name: 'AREA 3: ANTECHAMBER OF SEALS', subtitle: 'Endgame Relic Chest & Shrine', startX: 2400, endX: 3650 },
    { id: 's3_a4', name: 'AREA 4: THE RIFT HEART', subtitle: 'Final Boss — Aetherion (Drop Dual Sword & Praetor!)', startX: 3650, endX: worldW },
  ];

  const platforms: Platform[] = [
    { x: -16, y: 0, w: 16, h: worldH, kind: 'wall' },
    { x: worldW, y: 0, w: 16, h: worldH, kind: 'wall' },

    // Area 1
    { x: 0, y: 400, w: 380, h: 140, kind: 'stone' },
    { x: 800, y: 245, w: 160, h: 12, oneWay: true, kind: 'metal' },
    { x: 840, y: 400, w: 310, h: 140, kind: 'stone' },

    // Area 2
    { x: 1150, y: 400, w: 320, h: 140, kind: 'stone' },
    { x: 1470, y: 470, w: 280, h: 70, kind: 'stone' },
    { x: 1750, y: 400, w: 650, h: 140, kind: 'stone' },
    { x: 1860, y: 180, w: 22, h: 190, kind: 'wall' },
    { x: 1965, y: 125, w: 22, h: 195, kind: 'wall' },
    { x: 1987, y: 170, w: 230, h: 14, kind: 'metal' },
    { x: 2150, y: 300, w: 160, h: 10, oneWay: true, kind: 'metal' },

    // Area 3
    { x: 2400, y: 400, w: 1250, h: 140, kind: 'stone' },
    { x: 2560, y: 320, w: 150, h: 10, oneWay: true, kind: 'metal' },
    { x: 3000, y: 195, w: 220, h: 12, kind: 'stone' },
    { x: 3310, y: 280, w: 210, h: 14, kind: 'metal' },

    // Area 4
    { x: 3650, y: 400, w: 1150, h: 140, kind: 'stone' },
    { x: 3820, y: 310, w: 140, h: 10, oneWay: true, kind: 'metal' },
    { x: 4065, y: 240, w: 160, h: 10, oneWay: true, kind: 'metal' },
    { x: 4320, y: 310, w: 140, h: 10, oneWay: true, kind: 'metal' },
  ];

  const movingPlatforms: MovingPlatform[] = [
    _mkMoving('s3_mp1', 420, 360, 620, 310, 76, 80),
    _mkMoving('s3_mp2', 1490, 345, 1660, 345, 76, 85),
    _mkMoving('s3_mp3', 2800, 290, 2800, 200, 72, 65),
  ];

  const crumblingPlatforms: CrumblingPlatform[] = [
    _mkCrumble('s3_cp1', 670, 295, 75),
    _mkCrumble('s3_cp2', 2740, 250, 64),
  ];

  const lasers: LaserHazard[] = [
    { x: 1020, y: 310, w: 8, h: 90, period: 2.6, activeWindow: 1.2, offset: 0, damage: 20 },
    { x: 2280, y: 310, w: 8, h: 90, period: 2.6, activeWindow: 1.2, offset: 1.1, damage: 20 },
    { x: 3250, y: 310, w: 8, h: 90, period: 2.4, activeWindow: 1.2, offset: 0.4, damage: 22 },
  ];

  const crystals: ExplosiveCrystal[] = [
    { id: 's3_c1', x: 1320, y: 376, w: 14, h: 24, exploded: false },
    { id: 's3_c2', x: 2820, y: 376, w: 14, h: 24, exploded: false },
    { id: 's3_c3', x: 3200, y: 376, w: 14, h: 24, exploded: false },
  ];

  const spikes: SpikeHazard[] = [
    { x: 1480, y: 458, w: 260, h: 12, damage: 20 },
  ];

  const bouncePads: BouncePad[] = [
    { x: 1080, y: 392, w: 28, h: 8, boostVy: -430 },
    { x: 2330, y: 392, w: 28, h: 8, boostVy: -430 },
    { x: 3560, y: 392, w: 28, h: 8, boostVy: -420 },
  ];

  const torches: TorchProp[] = [
    { x: 110, y: 376, color: '#00F0FF' },
    { x: 920, y: 376, color: '#A855F7' },
    { x: 2050, y: 146, color: '#00F0FF' },
    { x: 3100, y: 171, color: '#FACC15' },
    { x: 3770, y: 376, color: '#A855F7' },
    { x: 4670, y: 376, color: '#FACC15' },
  ];

  const enemies: EnemyInstance[] = [
    createEnemy('mana_stalker', 260, 382, { patrolLeft: 160, patrolRight: 350, targetingPylon: false }),
    createEnemy('rift_drone', 520, 230, { targetingPylon: false }),
    createEnemy('mana_wisp', 940, 280, { targetingPylon: false }),
    createEnemy('rift_brute', 1270, 372, { patrolLeft: 1170, patrolRight: 1430, targetingPylon: false }),
    createEnemy('corrupted_sentinel', 1940, 378, { patrolLeft: 1790, patrolRight: 2320, targetingPylon: false }),
    createEnemy('rift_drone', 2140, 190, { targetingPylon: false }),
    createEnemy('rift_brute', 2740, 372, { patrolLeft: 2540, patrolRight: 3000, targetingPylon: false }),
    createEnemy('mana_stalker', 3220, 382, { patrolLeft: 3050, patrolRight: 3520, targetingPylon: false }),
  ];

  const interactables: InteractableInstance[] = [
    // Supply Chest (1 soal -> Energy + Ammo)
    createChest(860, 221, {
      tier: 'common',
      questionsRequired: 1,
      loot: { energyRestore: 80, ammoPacks: 1, nanoVials: 1, shards: 45 },
    }),
    // Rare Armory Chest (2 soal -> Rifle + Ammo)
    createChest(2080, 146, {
      tier: 'rare',
      questionsRequired: 2,
      loot: { weaponId: 'rifle', weaponTier: 'rare', ammoPacks: 2, shards: 75 },
    }),
    // Supply Chest (1 soal -> Energy + Ammo)
    createChest(2210, 276, {
      tier: 'common',
      questionsRequired: 1,
      loot: { energyRestore: 90, ammoPacks: 2, shards: 50 },
    }),
    // Epic Relic Chest (3 soal -> Dual Sword Epic + Aether-Forge Praetor!)
    createChest(3400, 256, {
      tier: 'epic',
      questionsRequired: 3,
      loot: { weaponId: 'dual_sword', weaponTier: 'epic', armorId: 'aether_praetor', ammoPacks: 2, shards: 150 },
    }),
    createQuickDecryptGate(2640, 352),
    createPuzzleShrine(3090, 155),
    createTerminal(2610, 296, 'emergency'),
    createRunicPillar(3730, 360),
    createExitGate(4710, 352),
  ];

  return {
    stageNumber: 3,
    themeTopic: meta.themeTopic,
    parallaxTheme: meta.parallaxTheme,
    segment: { id: 'stage_3_full', mode: 'traverse', name: meta.title, width: worldW },
    worldWidth: worldW,
    worldHeight: worldH,
    playerSpawn: { x: 48, y: 360 },
    platforms,
    movingPlatforms,
    crumblingPlatforms,
    lasers,
    crystals,
    spikes,
    bouncePads,
    torches,
    areas,
    enemies,
    interactables,
    spawnPortals: [],
    bossSpawn: { id: 'aetherion', x: 4380, y: 352, triggerX: 3690, arenaMinX: 3650 },
  };
}

// ── STANDALONE SURVIVAL COURTYARD ───────────────────────────
function _buildSurvivalArena(): BuiltLevel {
  const seg = DEMO_SEGMENTS.survival;
  const worldW = 1100;
  const worldH = 360;

  return {
    stageNumber: 1,
    themeTopic: 'Berpikir Komputasional',
    parallaxTheme: 'foundry',
    segment: seg,
    worldWidth: worldW,
    worldHeight: worldH,
    playerSpawn: { x: 540, y: 280 },
    platforms: [
      { x: 0, y: 316, w: worldW, h: 44, kind: 'stone' },
      { x: -16, y: 0, w: 16, h: worldH, kind: 'wall' },
      { x: worldW, y: 0, w: 16, h: worldH, kind: 'wall' },
      { x: 90, y: 245, w: 160, h: 10, oneWay: true, kind: 'metal' },
      { x: 850, y: 245, w: 160, h: 10, oneWay: true, kind: 'metal' },
      { x: 300, y: 225, w: 150, h: 10, oneWay: true, kind: 'metal' },
      { x: 650, y: 225, w: 150, h: 10, oneWay: true, kind: 'metal' },
      { x: 460, y: 155, w: 180, h: 12, kind: 'stone' },
      { x: 420, y: 160, w: 16, h: 90, kind: 'wall' },
      { x: 664, y: 160, w: 16, h: 90, kind: 'wall' },
    ],
    movingPlatforms: [],
    crumblingPlatforms: [],
    lasers: [],
    crystals: [
      { id: 'surv_c1', x: 260, y: 292, w: 14, h: 24, exploded: false },
      { id: 'surv_c2', x: 830, y: 292, w: 14, h: 24, exploded: false },
    ],
    spikes: [],
    bouncePads: [
      { x: 205, y: 308, w: 28, h: 8, boostVy: -380 },
      { x: 865, y: 308, w: 28, h: 8, boostVy: -380 },
    ],
    torches: [
      { x: 150, y: 292, color: '#EF4444' },
      { x: 550, y: 131, color: '#00F0FF' },
      { x: 950, y: 292, color: '#EF4444' },
    ],
    areas: [
      {
        id: 'survival_arena',
        name: 'SURVIVAL COURTYARD',
        subtitle: 'Bertahan 45s & gunakan Explosive Crystal + Terminal!',
        startX: 0,
        endX: worldW,
      },
    ],
    enemies: [],
    interactables: [
      createTerminal(150, 221, 'emergency'),
      createTerminal(930, 221, 'emergency'),
    ],
    spawnPortals: [
      { x: 40, y: 288 },
      { x: 550, y: 125 },
      { x: worldW - 44, y: 288 },
    ],
  };
}

// ── STANDALONE HOLD THE FORT ARENA ──────────────────────────
function _buildDefenseArena(): BuiltLevel {
  const seg = DEMO_SEGMENTS.defense;
  const worldW = 1160;
  const worldH = 360;
  const pylonX = 568;
  const pylonY = 268;

  return {
    stageNumber: 2,
    themeTopic: 'Gerbang Logika',
    parallaxTheme: 'rift_scar',
    segment: seg,
    worldWidth: worldW,
    worldHeight: worldH,
    playerSpawn: { x: 615, y: 280 },
    platforms: [
      { x: 0, y: 316, w: worldW, h: 44, kind: 'stone' },
      { x: -16, y: 0, w: 16, h: worldH, kind: 'wall' },
      { x: worldW, y: 0, w: 16, h: worldH, kind: 'wall' },
      { x: 170, y: 240, w: 180, h: 10, oneWay: true, kind: 'metal' },
      { x: 810, y: 240, w: 180, h: 10, oneWay: true, kind: 'metal' },
      { x: 430, y: 205, w: 300, h: 10, oneWay: true, kind: 'metal' },
    ],
    movingPlatforms: [],
    crumblingPlatforms: [],
    lasers: [],
    crystals: [
      { id: 'def_c1', x: 240, y: 292, w: 14, h: 24, exploded: false },
      { id: 'def_c2', x: 910, y: 292, w: 14, h: 24, exploded: false },
    ],
    spikes: [],
    bouncePads: [
      { x: 375, y: 308, w: 28, h: 8, boostVy: -360 },
      { x: 755, y: 308, w: 28, h: 8, boostVy: -360 },
    ],
    torches: [
      { x: 300, y: 292, color: '#00F0FF' },
      { x: 860, y: 292, color: '#00F0FF' },
    ],
    areas: [
      {
        id: 'defense_courtyard',
        name: 'PYLON CITADEL COURTYARD',
        subtitle: 'Jaga kiri & kanan — gunakan Bounce Vent & Barricade!',
        startX: 0,
        endX: worldW,
      },
    ],
    enemies: [],
    interactables: [
      createPylon(pylonX, pylonY, seg.pylonHp ?? 450),
      createTerminal(470, 181, 'repair'),
      createTerminal(674, 181, 'repair'),
      createBarricadeNode(320, 284),
      createBarricadeNode(820, 284),
    ],
    spawnPortals: [
      { x: 34, y: 288 },
      { x: worldW - 42, y: 288 },
    ],
    pylonPos: { x: pylonX + 12, y: pylonY + 24 },
  };
}
