// ============================================================
// RIFTBOUND: SLAYER CORPS — Multi-Stage Level Builder
// Stage 1, 2, 3 delegate to ProceduralStageGenerator (seeded per player/run):
//   - 6 shuffled modular room archetypes + safe start + boss sanctum
//   - EXACTLY 30 chests per stage (1 Rare Weapon + 29 HP/Energy/Item chests)
//   - Escalating enemy counts + tactical off-screen respawn
// Standalone arenas: Survival Courtyard & Hold The Fort
// ============================================================

import type { BossId, SegmentConfig } from '../types';
import type { EnemyInstance } from '../entities/Enemy';
import type { InteractableInstance } from '../entities/Interactables';
import {
  createBarricadeNode,
  createPylon,
  createTerminal,
} from '../entities/Interactables';
import { generateProceduralStage } from './ProceduralStageGenerator';

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

export interface StageDecorProp {
  type: 'arch' | 'bell' | 'banner' | 'lantern' | 'silk_web' | 'obelisk';
  x: number;
  y: number;
  scale?: number;
  color?: string;
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
  decorProps: StageDecorProp[];
  areas: AreaZone[];
  enemies: EnemyInstance[];
  interactables: InteractableInstance[];
  spawnPortals: SpawnPortal[];
  pylonPos?: { x: number; y: number };
  bossSpawn?: BossSpawnConfig;
  stageSeed?: number;
  layoutPatternName?: string;
  respawnInterval?: number;
  maxActiveEnemies?: number;
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
      { enemies: [{ id: 'mana_husk', count: 4 }, { id: 'void_hopper', count: 1 }], spawnDelay: 0.9 },
      { enemies: [{ id: 'mana_husk', count: 3 }, { id: 'rift_drone', count: 2 }, { id: 'void_hopper', count: 1 }], spawnDelay: 0.9 },
      { enemies: [{ id: 'mana_stalker', count: 3 }, { id: 'pulse_acolyte', count: 2 }], spawnDelay: 0.8 },
      { enemies: [{ id: 'corrupted_sentinel', count: 1 }, { id: 'rift_lancer', count: 2 }, { id: 'mana_stalker', count: 2 }], spawnDelay: 0.8 },
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
          { id: 'void_hopper', count: 2 },
          { id: 'rift_drone', count: 2 },
        ],
        spawnDelay: 1.3,
      },
      {
        enemies: [
          { id: 'corrupted_sentinel', count: 2 },
          { id: 'rift_lancer', count: 2 },
          { id: 'pulse_acolyte', count: 2 },
        ],
        spawnDelay: 1.1,
      },
      {
        enemies: [
          { id: 'rift_brute', count: 1 },
          { id: 'corrupted_sentinel', count: 2 },
          { id: 'rift_lancer', count: 2 },
          { id: 'mana_husk', count: 4 },
        ],
        spawnDelay: 1.0,
      },
    ],
  },
};

export function buildPlayableLevel(
  modeKey: PlayableModeKey,
  seed?: number | string
): BuiltLevel {
  if (modeKey === 'survival') return _buildSurvivalArena();
  if (modeKey === 'defense') return _buildDefenseArena();
  if (modeKey === 'stage_2') return generateProceduralStage(2, seed);
  if (modeKey === 'stage_3') return generateProceduralStage(3, seed);
  return generateProceduralStage(1, seed);
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
    decorProps: [
      { type: 'arch', x: 200, y: 316, scale: 1.1, color: '#44403C' },
      { type: 'bell', x: 550, y: 240, scale: 1.25, color: '#F97316' },
      { type: 'arch', x: 900, y: 316, scale: 1.1, color: '#44403C' },
      { type: 'banner', x: 350, y: 316, color: '#DC2626' },
      { type: 'banner', x: 750, y: 316, color: '#DC2626' },
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
    decorProps: [
      { type: 'obelisk', x: 140, y: 316, color: '#C084FC' },
      { type: 'arch', x: 580, y: 316, scale: 1.3, color: '#3B1E4E' },
      { type: 'bell', x: 580, y: 230, scale: 1.2, color: '#FACC15' },
      { type: 'obelisk', x: 1020, y: 316, color: '#C084FC' },
      { type: 'silk_web', x: 420, y: 316, scale: 1.0, color: '#F43F5E' },
      { type: 'silk_web', x: 740, y: 316, scale: 1.0, color: '#F43F5E' },
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
