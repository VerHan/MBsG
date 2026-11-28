// ============================================================
// RIFTBOUND: SLAYER CORPS — Procedural Stage, NPC & Chest Algorithm
// Generates unique per-player / per-run stage layouts from a seed:
//   - 6 shuffled modular room archetypes (parameterized heights/hazards)
//   - EXACTLY 30 chests per stage (30 unique Informatics questions/stage)
//   - STRICTLY 1 Rare Weapon Chest per stage (hidden in randomized chunk)
//   - 29 Supply Chests containing ONLY HP, Energy, Nano-Vials, Reload Packs & Shards
//   - Procedural NPC/Enemy squad formations escalating per stage (20 -> 32 -> 46)
//   - Tactical respawn configuration scaling per stage
// ============================================================

import type { BossId, ChestDef, EnemyId, WeaponId } from '../types';
import { createEnemy, type EnemyInstance } from '../entities/Enemy';
import {
  createChest,
  createExitGate,
  createRunicPillar,
  type InteractableInstance,
} from '../entities/Interactables';
import type {
  AreaZone,
  BouncePad,
  BuiltLevel,
  CrumblingPlatform,
  ExplosiveCrystal,
  LaserHazard,
  MovingPlatform,
  Platform,
  SpikeHazard,
  StageDecorProp,
  TorchProp,
} from './LevelBuilder';
import { STAGE_METADATA } from './LevelBuilder';

export type RoomArchetype =
  | 'tiered_catwalk'
  | 'chasm_ferry'
  | 'twin_towers'
  | 'gauntlet_corridor'
  | 'split_sanctuary'
  | 'ascending_terrace';

export type EnemyFormationPattern =
  | 'vanguard_screen'
  | 'aerial_crossfire'
  | 'ambush_flank'
  | 'hopper_pack'
  | 'lancer_phalanx'
  | 'mixed_swarm';

export interface SeededRng {
  seed: number;
  next(): number;
  int(min: number, max: number): number;
  range(min: number, max: number): number;
  chance(prob: number): boolean;
  pick<T>(items: readonly T[]): T;
  shuffle<T>(items: readonly T[]): T[];
}

export function hashSeed(input: string | number): number {
  if (typeof input === 'number' && Number.isFinite(input)) {
    return (Math.imul(Math.floor(input) ^ 0x9e3779b9, 0x85ebca6b) >>> 0) || 1;
  }
  const str = String(input);
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h || 1337;
}

export function createSeededRng(seedInput: string | number): SeededRng {
  let state = hashSeed(seedInput);
  const initialSeed = state;

  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    seed: initialSeed,
    next,
    int(min: number, max: number): number {
      if (max <= min) return min;
      return min + Math.floor(next() * (max - min + 1));
    },
    range(min: number, max: number): number {
      return min + next() * (max - min);
    },
    chance(prob: number): boolean {
      return next() < prob;
    },
    pick<T>(items: readonly T[]): T {
      return items[Math.floor(next() * items.length)];
    },
    shuffle<T>(items: readonly T[]): T[] {
      const out = [...items];
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
  };
}

interface ChestAnchor {
  x: number;
  y: number;
  minX: number;
  maxX: number;
  chunkIndex: number;
  elevated: boolean;
}

interface EnemySpawnSlot {
  x: number;
  y: number;
  patrolLeft: number;
  patrolRight: number;
  aerial: boolean;
  turretSpot?: boolean;
}

interface StageConfig {
  bossId: BossId;
  bossName: string;
  torchColor: string;
  accentColor: string;
  archColor: string;
  rareWeapons: readonly WeaponId[];
  weaponTier: 'rare' | 'epic';
  weaponLevel: number;
  initialEnemyCount: number;
  maxActiveEnemies: number;
  respawnInterval: number;
  groundPool: readonly EnemyId[];
  heavyPool: readonly EnemyId[];
  aerialPool: readonly EnemyId[];
  turretPool: readonly EnemyId[];
  formations: readonly EnemyFormationPattern[];
}

const STAGE_CONFIGS: Record<1 | 2 | 3, StageConfig> = {
  1: {
    bossId: 'mana_colossus',
    bossName: 'Mana Colossus',
    torchColor: '#F97316',
    accentColor: '#DC2626',
    archColor: '#44403C',
    rareWeapons: ['sword', 'spear', 'pistol', 'bow'],
    weaponTier: 'rare',
    weaponLevel: 1,
    initialEnemyCount: 20,
    maxActiveEnemies: 24,
    respawnInterval: 22,
    groundPool: ['mana_husk', 'mana_husk', 'void_hopper', 'mana_husk'],
    heavyPool: ['void_hopper', 'corrupted_sentinel'],
    aerialPool: ['rift_drone', 'rift_drone'],
    turretPool: ['void_spitter'],
    formations: ['vanguard_screen', 'hopper_pack', 'aerial_crossfire', 'ambush_flank'],
  },
  2: {
    bossId: 'forge_titan',
    bossName: 'Forge Titan',
    torchColor: '#00F0FF',
    accentColor: '#38BDF8',
    archColor: '#334155',
    rareWeapons: ['katana', 'axe', 'shotgun', 'dual_pistol'],
    weaponTier: 'rare',
    weaponLevel: 1,
    initialEnemyCount: 32,
    maxActiveEnemies: 36,
    respawnInterval: 17,
    groundPool: ['mana_husk', 'corrupted_sentinel', 'mana_stalker', 'void_hopper', 'rift_lancer'],
    heavyPool: ['rift_lancer', 'corrupted_sentinel', 'void_hopper'],
    aerialPool: ['rift_drone', 'pulse_acolyte', 'pulse_acolyte'],
    turretPool: ['void_spitter'],
    formations: ['vanguard_screen', 'aerial_crossfire', 'ambush_flank', 'hopper_pack', 'lancer_phalanx'],
  },
  3: {
    bossId: 'aetherion',
    bossName: 'Aetherion',
    torchColor: '#A855F7',
    accentColor: '#F43F5E',
    archColor: '#3B1E4E',
    rareWeapons: ['dual_sword', 'hammer', 'rifle', 'katana'],
    weaponTier: 'epic',
    weaponLevel: 2,
    initialEnemyCount: 46,
    maxActiveEnemies: 50,
    respawnInterval: 13,
    groundPool: ['mana_stalker', 'corrupted_sentinel', 'void_hopper', 'rift_lancer', 'rift_brute'],
    heavyPool: ['rift_brute', 'rift_lancer', 'void_hopper'],
    aerialPool: ['pulse_acolyte', 'rift_drone', 'mana_wisp'],
    turretPool: ['void_spitter'],
    formations: ['lancer_phalanx', 'aerial_crossfire', 'hopper_pack', 'ambush_flank', 'mixed_swarm'],
  },
};

const ALL_ARCHETYPES: readonly RoomArchetype[] = [
  'tiered_catwalk',
  'chasm_ferry',
  'twin_towers',
  'gauntlet_corridor',
  'split_sanctuary',
  'ascending_terrace',
];

const ARCHETYPE_TITLES: Record<RoomArchetype, { name: string; subtitle: string }> = {
  tiered_catwalk: { name: 'CATWALK SECTOR', subtitle: 'Jalur bertingkat · Crystal & Chest tersembunyi di atas' },
  chasm_ferry: { name: 'CHASM FERRYWAY', subtitle: 'Ferry bergerak & jembatan rapuh di atas jurang' },
  twin_towers: { name: 'TWIN WALL-TOWER', subtitle: 'Menara wall-jump ganda & celah harta karun' },
  gauntlet_corridor: { name: 'GAUNTLET CORRIDOR', subtitle: 'Koridor tempur padat dengan perangkap laser & duri' },
  split_sanctuary: { name: 'SPLIT SANCTUARY', subtitle: 'Pilih rute atas berkecepatan tinggi atau bawah penuh musuh' },
  ascending_terrace: { name: 'ASCENDING TERRACE', subtitle: 'Teras bertingkat & lift vertikal menuju dek langit' },
};

const CHEST_COUNT_PER_STAGE = 30;
const CHUNK_COUNT = 6;
const CHESTS_PER_CHUNK = 5; // 6 * 5 = 30 chests exactly
const START_WIDTH = 420;
const CHUNK_WIDTH = 920;
const BOSS_WIDTH = 1260;
const WORLD_HEIGHT = 540;
const GROUND_Y = 400;

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

function _buildSupplyLoot(rng: SeededRng, stageNumber: 1 | 2 | 3, slotIndex: number): ChestDef['loot'] {
  const shardBase = 16 + stageNumber * 6 + rng.int(0, 12);
  const roll = slotIndex % 4;

  if (roll === 0) {
    // HP + Energy Restorative Chest
    return {
      hpRestore: 26 + stageNumber * 6,
      energyRestore: 38 + stageNumber * 6,
      shards: shardBase,
    };
  }
  if (roll === 1) {
    // Energy + Reload/Ammo Pack Chest
    return {
      energyRestore: 52 + stageNumber * 8,
      ammoPacks: 1,
      shards: shardBase + 4,
    };
  }
  if (roll === 2) {
    // Nano-Vial + HP Medkit Chest
    return {
      hpRestore: 22 + stageNumber * 4,
      nanoVials: 1,
      shards: shardBase,
    };
  }
  // Tactical Supply Bundle (HP + Energy + Reload Pack)
  return {
    hpRestore: 20 + stageNumber * 4,
    energyRestore: 40 + stageNumber * 5,
    ammoPacks: 1,
    shards: shardBase + 6,
  };
}

function _pickEnemyForFormation(
  formation: EnemyFormationPattern,
  slot: EnemySpawnSlot,
  slotIdx: number,
  cfg: StageConfig,
  rng: SeededRng
): EnemyId {
  if (slot.aerial) {
    return rng.pick(cfg.aerialPool);
  }
  if (slot.turretSpot && rng.chance(0.55)) {
    return rng.pick(cfg.turretPool);
  }

  switch (formation) {
    case 'hopper_pack':
      return slotIdx % 2 === 0 ? 'void_hopper' : rng.pick(cfg.groundPool);
    case 'lancer_phalanx':
      return slotIdx % 2 === 0
        ? (cfg.heavyPool.includes('rift_lancer') ? 'rift_lancer' : rng.pick(cfg.heavyPool))
        : rng.pick(cfg.groundPool);
    case 'vanguard_screen':
      return slotIdx === 0 ? rng.pick(cfg.heavyPool) : rng.pick(cfg.groundPool);
    case 'aerial_crossfire':
      return slotIdx % 3 === 0 ? rng.pick(cfg.turretPool) : rng.pick(cfg.groundPool);
    case 'ambush_flank':
      return slotIdx % 2 === 1 ? rng.pick(cfg.heavyPool) : rng.pick(cfg.groundPool);
    case 'mixed_swarm':
    default:
      return rng.chance(0.35) ? rng.pick(cfg.heavyPool) : rng.pick(cfg.groundPool);
  }
}

export function generateProceduralStage(
  stageNumber: 1 | 2 | 3,
  seedInput?: number | string
): BuiltLevel {
  const effectiveSeed =
    seedInput !== undefined ? hashSeed(seedInput) : hashSeed(`${stageNumber}_${Date.now()}_${Math.random()}`);
  const rng = createSeededRng(effectiveSeed);
  const meta = STAGE_METADATA[stageNumber];
  const cfg = STAGE_CONFIGS[stageNumber];

  const worldWidth = START_WIDTH + CHUNK_COUNT * CHUNK_WIDTH + BOSS_WIDTH;
  const bossStartX = START_WIDTH + CHUNK_COUNT * CHUNK_WIDTH;

  const platforms: Platform[] = [
    { x: -16, y: 0, w: 16, h: WORLD_HEIGHT, kind: 'wall' },
    { x: worldWidth, y: 0, w: 16, h: WORLD_HEIGHT, kind: 'wall' },
    // Start Safe Plaza
    { x: 0, y: GROUND_Y, w: START_WIDTH, h: WORLD_HEIGHT - GROUND_Y, kind: 'stone' },
    { x: 185, y: 332, w: 120, h: 10, oneWay: true, kind: 'metal' },
  ];

  const movingPlatforms: MovingPlatform[] = [];
  const crumblingPlatforms: CrumblingPlatform[] = [];
  const lasers: LaserHazard[] = [];
  const crystals: ExplosiveCrystal[] = [];
  const spikes: SpikeHazard[] = [];
  const bouncePads: BouncePad[] = [];
  const torches: TorchProp[] = [
    { x: 96, y: GROUND_Y - 24, color: cfg.torchColor },
    { x: 340, y: GROUND_Y - 24, color: cfg.torchColor },
  ];
  const decorProps: StageDecorProp[] = [
    { type: 'arch', x: 150, y: GROUND_Y, scale: 1.15, color: cfg.archColor },
    { type: 'banner', x: 260, y: GROUND_Y, color: cfg.accentColor },
  ];

  const areas: AreaZone[] = [
    {
      id: `s${stageNumber}_start`,
      name: `${meta.title}`,
      subtitle: `Tema: ${meta.themeTopic} · Seed #${(effectiveSeed % 100000).toString(16).toUpperCase()}`,
      startX: 0,
      endX: START_WIDTH,
    },
  ];

  const shuffledArchetypes = rng.shuffle(ALL_ARCHETYPES);
  const allChestAnchors: ChestAnchor[] = [];
  const chunkEnemySlots: EnemySpawnSlot[][] = [];
  const chunkFormations: EnemyFormationPattern[] = [];

  for (let c = 0; c < CHUNK_COUNT; c++) {
    const ox = START_WIDTH + c * CHUNK_WIDTH;
    const archetype = shuffledArchetypes[c];
    const formation = rng.pick(cfg.formations);
    chunkFormations.push(formation);

    const hJitter = rng.int(-16, 14);
    const titleInfo = ARCHETYPE_TITLES[archetype];
    areas.push({
      id: `s${stageNumber}_c${c}_${archetype}`,
      name: `ZONA ${c + 1}: ${titleInfo.name}`,
      subtitle: `${titleInfo.subtitle} · Pola Musuh: ${formation.replace('_', ' ').toUpperCase()}`,
      startX: ox,
      endX: ox + CHUNK_WIDTH,
    });

    const anchors: ChestAnchor[] = [];
    const eSlots: EnemySpawnSlot[] = [];

    const addAnchor = (platX: number, platW: number, platY: number, elevated: boolean) => {
      const minX = platX + 14;
      const maxX = Math.max(minX, platX + platW - 46);
      const x = Math.round(rng.range(minX, maxX));
      anchors.push({ x, y: platY - 24, minX, maxX, chunkIndex: c, elevated });
    };

    const addGroundSlot = (x: number, left: number, right: number, turretSpot = false) => {
      eSlots.push({
        x: Math.round(x),
        y: GROUND_Y - 26,
        patrolLeft: Math.round(left),
        patrolRight: Math.round(right),
        aerial: false,
        turretSpot,
      });
    };

    const addPlatformSlot = (x: number, platY: number, left: number, right: number, turretSpot = false) => {
      eSlots.push({
        x: Math.round(x),
        y: platY - 24,
        patrolLeft: Math.round(left),
        patrolRight: Math.round(right),
        aerial: false,
        turretSpot,
      });
    };

    const addAerialSlot = (x: number, y: number, left: number, right: number) => {
      eSlots.push({
        x: Math.round(x),
        y: Math.round(y),
        patrolLeft: Math.round(left),
        patrolRight: Math.round(right),
        aerial: true,
      });
    };

    // Room archetype geometry (guaranteed jumpable & soft-lock proof)
    if (archetype === 'tiered_catwalk') {
      platforms.push({ x: ox, y: GROUND_Y, w: CHUNK_WIDTH, h: WORLD_HEIGHT - GROUND_Y, kind: 'stone' });

      const p1Y = 330 + hJitter;
      const p2Y = 258 + Math.round(hJitter * 0.7);
      const p3Y = 204 + Math.round(hJitter * 0.5);
      const p4Y = 316 - Math.round(hJitter * 0.5);

      platforms.push(
        { x: ox + 70, y: p1Y, w: 170, h: 10, oneWay: true, kind: 'metal' },
        { x: ox + 285, y: p2Y, w: 200, h: 10, oneWay: true, kind: 'metal' },
        { x: ox + 525, y: p3Y, w: 170, h: 12, kind: 'stone' },
        { x: ox + 690, y: p4Y, w: 175, h: 10, oneWay: true, kind: 'metal' }
      );

      bouncePads.push({ x: ox + 495, y: GROUND_Y - 8, w: 28, h: 8, boostVy: -375 });
      crystals.push(
        { id: `s${stageNumber}_c${c}_cr1`, x: ox + 360, y: GROUND_Y - 24, w: 14, h: 24, exploded: false },
        { id: `s${stageNumber}_c${c}_cr2`, x: ox + 750, y: GROUND_Y - 24, w: 14, h: 24, exploded: false }
      );
      if (stageNumber >= 2) {
        lasers.push({ x: ox + 455, y: p2Y + 12, w: 8, h: GROUND_Y - (p2Y + 12), period: 3.1, activeWindow: 1.35, offset: c * 0.5, damage: 15 });
      }

      addAnchor(ox + 30, 170, GROUND_Y, false);
      addAnchor(ox + 70, 170, p1Y, true);
      addAnchor(ox + 285, 200, p2Y, true);
      addAnchor(ox + 525, 170, p3Y, true);
      addAnchor(ox + 690, 175, p4Y, true);
      addAnchor(ox + 640, 220, GROUND_Y, false);

      addGroundSlot(ox + 180, ox + 40, ox + 360);
      addGroundSlot(ox + 440, ox + 320, ox + 640);
      addGroundSlot(ox + 740, ox + 580, ox + 890);
      addPlatformSlot(ox + 370, p2Y, ox + 295, ox + 470, true);
      addPlatformSlot(ox + 600, p3Y, ox + 535, ox + 685, true);
      addAerialSlot(ox + 280, 175, ox + 120, ox + 460);
      addAerialSlot(ox + 700, 165, ox + 520, ox + 860);
    } else if (archetype === 'chasm_ferry') {
      // Left ledge, sunken recoverable floor with bounce pad, right ledge
      platforms.push(
        { x: ox, y: GROUND_Y, w: 220, h: WORLD_HEIGHT - GROUND_Y, kind: 'stone' },
        { x: ox + 220, y: 472, w: 360, h: WORLD_HEIGHT - 472, kind: 'stone' },
        { x: ox + 580, y: GROUND_Y, w: 340, h: WORLD_HEIGHT - GROUND_Y, kind: 'stone' }
      );

      const upperY = 262 + hJitter;
      const rightShelfY = 315 - Math.round(hJitter * 0.5);
      platforms.push(
        { x: ox + 60, y: 318 + hJitter, w: 140, h: 10, oneWay: true, kind: 'metal' },
        { x: ox + 280, y: upperY, w: 185, h: 10, oneWay: true, kind: 'metal' },
        { x: ox + 650, y: rightShelfY, w: 195, h: 10, oneWay: true, kind: 'metal' }
      );

      movingPlatforms.push(_mkMoving(`s${stageNumber}_c${c}_mp`, ox + 240, 366, ox + 485, 366, 78, 66 + stageNumber * 8));
      crumblingPlatforms.push(_mkCrumble(`s${stageNumber}_c${c}_cp`, ox + 485, upperY + 18, 76));

      // Safe bounce pad out of sunken floor so player never gets trapped
      bouncePads.push(
        { x: ox + 245, y: 464, w: 32, h: 8, boostVy: -395 },
        { x: ox + 520, y: 464, w: 32, h: 8, boostVy: -395 }
      );
      spikes.push({ x: ox + 345, y: 460, w: 96, h: 12, damage: 12 + stageNumber * 2 });
      crystals.push({ id: `s${stageNumber}_c${c}_cr1`, x: ox + 690, y: GROUND_Y - 24, w: 14, h: 24, exploded: false });

      addAnchor(ox + 25, 175, GROUND_Y, false);
      addAnchor(ox + 60, 140, 318 + hJitter, true);
      addAnchor(ox + 280, 185, upperY, true);
      addAnchor(ox + 610, 250, GROUND_Y, false);
      addAnchor(ox + 650, 195, rightShelfY, true);
      addAnchor(ox + 290, 60, 472, false);

      addGroundSlot(ox + 130, ox + 30, ox + 205);
      addGroundSlot(ox + 660, ox + 595, ox + 890);
      addGroundSlot(ox + 810, ox + 640, ox + 900);
      addPlatformSlot(ox + 365, upperY, ox + 290, ox + 455, true);
      addPlatformSlot(ox + 735, rightShelfY, ox + 660, ox + 835, true);
      addAerialSlot(ox + 380, 180, ox + 200, ox + 580);
      addAerialSlot(ox + 720, 170, ox + 560, ox + 880);
    } else if (archetype === 'twin_towers') {
      platforms.push({ x: ox, y: GROUND_Y, w: CHUNK_WIDTH, h: WORLD_HEIGHT - GROUND_Y, kind: 'stone' });

      const skyY = 190 + Math.round(hJitter * 0.5);
      const midY = 300 + hJitter;
      // Wall-jump tower walls + helper bounce vent so mobile/casual players ascend smoothly
      platforms.push(
        { x: ox + 225, y: skyY + 18, w: 20, h: 185, kind: 'wall' },
        { x: ox + 340, y: skyY - 25, w: 20, h: 195, kind: 'wall' },
        { x: ox + 360, y: skyY, w: 250, h: 12, kind: 'metal' },
        { x: ox + 55, y: midY, w: 145, h: 10, oneWay: true, kind: 'metal' },
        { x: ox + 665, y: midY - 12, w: 190, h: 10, oneWay: true, kind: 'metal' }
      );
      bouncePads.push(
        { x: ox + 272, y: GROUND_Y - 8, w: 34, h: 8, boostVy: -420 },
        { x: ox + 625, y: GROUND_Y - 8, w: 28, h: 8, boostVy: -370 }
      );
      crystals.push({ id: `s${stageNumber}_c${c}_cr1`, x: ox + 505, y: GROUND_Y - 24, w: 14, h: 24, exploded: false });
      if (stageNumber >= 2) {
        lasers.push({ x: ox + 560, y: skyY + 14, w: 8, h: GROUND_Y - (skyY + 14), period: 3.3, activeWindow: 1.4, offset: 0.7, damage: 15 });
      }

      addAnchor(ox + 40, 165, GROUND_Y, false);
      addAnchor(ox + 55, 145, midY, true);
      addAnchor(ox + 370, 230, skyY, true);
      addAnchor(ox + 420, 180, GROUND_Y, false);
      addAnchor(ox + 665, 190, midY - 12, true);
      addAnchor(ox + 700, 185, GROUND_Y, false);

      addGroundSlot(ox + 150, ox + 30, ox + 215);
      addGroundSlot(ox + 470, ox + 365, ox + 630);
      addGroundSlot(ox + 760, ox + 620, ox + 895);
      addPlatformSlot(ox + 465, skyY, ox + 370, ox + 600, true);
      addPlatformSlot(ox + 755, midY - 12, ox + 675, ox + 845);
      addAerialSlot(ox + 280, 155, ox + 120, ox + 460);
      addAerialSlot(ox + 740, 165, ox + 560, ox + 885);
    } else if (archetype === 'gauntlet_corridor') {
      platforms.push({ x: ox, y: GROUND_Y, w: CHUNK_WIDTH, h: WORLD_HEIGHT - GROUND_Y, kind: 'stone' });

      const lowY = 322 + hJitter;
      const highY = 236 + Math.round(hJitter * 0.6);
      platforms.push(
        { x: ox + 110, y: lowY, w: 165, h: 10, oneWay: true, kind: 'metal' },
        { x: ox + 375, y: highY, w: 175, h: 10, oneWay: true, kind: 'metal' },
        { x: ox + 640, y: lowY, w: 185, h: 10, oneWay: true, kind: 'metal' }
      );

      spikes.push(
        { x: ox + 295, y: GROUND_Y - 12, w: 68, h: 12, damage: 12 + stageNumber * 2 },
        { x: ox + 560, y: GROUND_Y - 12, w: 68, h: 12, damage: 12 + stageNumber * 2 }
      );
      if (stageNumber >= 2) {
        lasers.push(
          { x: ox + 325, y: 210, w: 8, h: 188, period: 2.9, activeWindow: 1.2, offset: 0.3, damage: 16 },
          { x: ox + 592, y: 210, w: 8, h: 188, period: 2.9, activeWindow: 1.2, offset: 1.6, damage: 16 }
        );
      }
      crystals.push(
        { id: `s${stageNumber}_c${c}_cr1`, x: ox + 220, y: GROUND_Y - 24, w: 14, h: 24, exploded: false },
        { id: `s${stageNumber}_c${c}_cr2`, x: ox + 465, y: GROUND_Y - 24, w: 14, h: 24, exploded: false },
        { id: `s${stageNumber}_c${c}_cr3`, x: ox + 755, y: GROUND_Y - 24, w: 14, h: 24, exploded: false }
      );

      addAnchor(ox + 30, 175, GROUND_Y, false);
      addAnchor(ox + 110, 165, lowY, true);
      addAnchor(ox + 375, 175, highY, true);
      addAnchor(ox + 390, 145, GROUND_Y, false);
      addAnchor(ox + 640, 185, lowY, true);
      addAnchor(ox + 700, 180, GROUND_Y, false);

      addGroundSlot(ox + 160, ox + 35, ox + 280);
      addGroundSlot(ox + 455, ox + 370, ox + 545);
      addGroundSlot(ox + 750, ox + 645, ox + 895);
      addPlatformSlot(ox + 190, lowY, ox + 120, ox + 265);
      addPlatformSlot(ox + 460, highY, ox + 385, ox + 540, true);
      addAerialSlot(ox + 330, 165, ox + 180, ox + 520);
      addAerialSlot(ox + 680, 165, ox + 500, ox + 860);
    } else if (archetype === 'split_sanctuary') {
      platforms.push({ x: ox, y: GROUND_Y, w: CHUNK_WIDTH, h: WORLD_HEIGHT - GROUND_Y, kind: 'stone' });

      const upperDeckY = 232 + Math.round(hJitter * 0.6);
      const midStepY = 315 + hJitter;
      platforms.push(
        { x: ox + 120, y: midStepY, w: 140, h: 10, oneWay: true, kind: 'metal' },
        { x: ox + 280, y: upperDeckY, w: 220, h: 12, kind: 'stone' },
        { x: ox + 635, y: upperDeckY + 12, w: 195, h: 12, kind: 'stone' }
      );
      crumblingPlatforms.push(_mkCrumble(`s${stageNumber}_c${c}_cp`, ox + 520, upperDeckY + 6, 95));
      bouncePads.push({ x: ox + 65, y: GROUND_Y - 8, w: 30, h: 8, boostVy: -390 });
      crystals.push({ id: `s${stageNumber}_c${c}_cr1`, x: ox + 450, y: GROUND_Y - 24, w: 14, h: 24, exploded: false });

      addAnchor(ox + 120, 140, midStepY, true);
      addAnchor(ox + 280, 220, upperDeckY, true);
      addAnchor(ox + 635, 195, upperDeckY + 12, true);
      addAnchor(ox + 220, 210, GROUND_Y, false);
      addAnchor(ox + 560, 220, GROUND_Y, false);
      addAnchor(ox + 775, 115, GROUND_Y, false);

      addGroundSlot(ox + 240, ox + 115, ox + 430);
      addGroundSlot(ox + 520, ox + 410, ox + 700);
      addGroundSlot(ox + 780, ox + 660, ox + 895);
      addPlatformSlot(ox + 390, upperDeckY, ox + 290, ox + 490, true);
      addPlatformSlot(ox + 730, upperDeckY + 12, ox + 645, ox + 820, true);
      addAerialSlot(ox + 330, 155, ox + 180, ox + 520);
      addAerialSlot(ox + 680, 155, ox + 520, ox + 860);
    } else {
      // 'ascending_terrace'
      platforms.push({ x: ox, y: GROUND_Y, w: CHUNK_WIDTH, h: WORLD_HEIGHT - GROUND_Y, kind: 'stone' });

      const t1Y = 334 + Math.round(hJitter * 0.5);
      const t2Y = 274 + Math.round(hJitter * 0.5);
      const t3Y = 212 + Math.round(hJitter * 0.5);
      platforms.push(
        { x: ox + 65, y: t1Y, w: 165, h: 10, oneWay: true, kind: 'metal' },
        { x: ox + 265, y: t2Y, w: 175, h: 10, oneWay: true, kind: 'metal' },
        { x: ox + 480, y: t3Y, w: 205, h: 12, kind: 'stone' },
        { x: ox + 715, y: t2Y + 18, w: 160, h: 10, oneWay: true, kind: 'metal' }
      );
      movingPlatforms.push(_mkMoving(`s${stageNumber}_c${c}_lift`, ox + 688, 366, ox + 688, t3Y + 18, 66, 58 + stageNumber * 6));
      crystals.push({ id: `s${stageNumber}_c${c}_cr1`, x: ox + 410, y: GROUND_Y - 24, w: 14, h: 24, exploded: false });

      addAnchor(ox + 65, 165, t1Y, true);
      addAnchor(ox + 265, 175, t2Y, true);
      addAnchor(ox + 480, 205, t3Y, true);
      addAnchor(ox + 715, 160, t2Y + 18, true);
      addAnchor(ox + 220, 210, GROUND_Y, false);
      addAnchor(ox + 510, 175, GROUND_Y, false);

      addGroundSlot(ox + 180, ox + 35, ox + 370);
      addGroundSlot(ox + 490, ox + 360, ox + 670);
      addGroundSlot(ox + 790, ox + 690, ox + 895);
      addPlatformSlot(ox + 350, t2Y, ox + 275, ox + 430);
      addPlatformSlot(ox + 580, t3Y, ox + 490, ox + 675, true);
      addAerialSlot(ox + 270, 160, ox + 120, ox + 440);
      addAerialSlot(ox + 740, 160, ox + 560, ox + 880);
    }

    // Chunk atmosphere: torches & architectural props
    torches.push(
      { x: ox + 170, y: GROUND_Y - 24, color: cfg.torchColor },
      { x: ox + 510, y: GROUND_Y - 24, color: cfg.torchColor },
      { x: ox + 810, y: GROUND_Y - 24, color: cfg.torchColor }
    );
    const propKind = rng.pick(['arch', 'obelisk', 'banner', 'bell', 'lantern'] as const);
    decorProps.push(
      { type: propKind, x: ox + 280, y: GROUND_Y, scale: 1.05, color: propKind === 'banner' ? cfg.accentColor : cfg.archColor },
      { type: rng.pick(['banner', 'lantern', 'silk_web', 'obelisk'] as const), x: ox + 710, y: GROUND_Y, color: cfg.accentColor }
    );

    // Choose EXACTLY 5 chests from this chunk's anchors
    const chosenChunkAnchors = rng.shuffle(anchors).slice(0, CHESTS_PER_CHUNK);
    allChestAnchors.push(...chosenChunkAnchors);
    chunkEnemySlots.push(eSlots);
  }

  // ── Boss Sanctum ───────────────────────────────────────────
  platforms.push(
    { x: bossStartX, y: GROUND_Y, w: BOSS_WIDTH, h: WORLD_HEIGHT - GROUND_Y, kind: 'stone' },
    { x: bossStartX + 190, y: 315, w: 140, h: 10, oneWay: true, kind: 'metal' },
    { x: bossStartX + 680, y: 315, w: 140, h: 10, oneWay: true, kind: 'metal' },
    { x: bossStartX + 435, y: 245, w: 160, h: 10, oneWay: true, kind: 'metal' }
  );
  torches.push(
    { x: bossStartX + 120, y: GROUND_Y - 24, color: '#EF4444' },
    { x: bossStartX + 540, y: GROUND_Y - 24, color: '#EF4444' },
    { x: bossStartX + 940, y: GROUND_Y - 24, color: '#EF4444' }
  );
  decorProps.push(
    { type: 'arch', x: bossStartX + 515, y: GROUND_Y, scale: 1.35, color: cfg.archColor },
    { type: 'bell', x: bossStartX + 515, y: 245, scale: 1.25, color: '#FACC15' }
  );
  areas.push({
    id: `s${stageNumber}_boss`,
    name: `BOSS SANCTUM: ${cfg.bossName.toUpperCase()}`,
    subtitle: 'Gunakan Runic Pillar untuk menghancurkan perisai Boss!',
    startX: bossStartX,
    endX: worldWidth,
  });

  // ── EXACTLY 30 CHESTS: 1 RARE WEAPON CHEST + 29 SUPPLY CHESTS ──
  // Pick 1 secret Rare Weapon Chest in chunks 2..5 (indices 10..29) so every player finds it elsewhere
  const rareChestIndex = rng.int(10, CHEST_COUNT_PER_STAGE - 1);
  const chosenStageWeapon = rng.pick(cfg.rareWeapons);
  const supplyOrder = rng.shuffle(Array.from({ length: CHEST_COUNT_PER_STAGE }, (_, i) => i));

  const interactables: InteractableInstance[] = [];
  for (let i = 0; i < CHEST_COUNT_PER_STAGE; i++) {
    const anchor = allChestAnchors[i];
    if (i === rareChestIndex) {
      interactables.push(
        createChest(anchor.x, anchor.y, {
          tier: cfg.weaponTier,
          questionsRequired: 2,
          loot: {
            weaponId: chosenStageWeapon,
            weaponTier: cfg.weaponTier,
            weaponLevel: cfg.weaponLevel,
            shards: 75 + stageNumber * 25,
            energyRestore: 50,
            hpRestore: 30,
          },
        })
      );
    } else {
      interactables.push(
        createChest(anchor.x, anchor.y, {
          tier: 'common',
          questionsRequired: 1,
          loot: _buildSupplyLoot(rng, stageNumber, supplyOrder[i]),
        })
      );
    }
  }

  // Add Boss Runic Pillar & Exit Gate
  interactables.push(
    createRunicPillar(bossStartX + 180, GROUND_Y - 40),
    createExitGate(worldWidth - 110, GROUND_Y - 56)
  );

  // ── PROCEDURAL ENEMY SQUADS (ESCALATING COUNT: 20 -> 32 -> 46) ──
  const enemies: EnemyInstance[] = [];
  const basePerChunk = Math.floor(cfg.initialEnemyCount / CHUNK_COUNT);
  const remainder = cfg.initialEnemyCount % CHUNK_COUNT;

  for (let c = 0; c < CHUNK_COUNT; c++) {
    // Late chunks get slightly denser spawns when remainder > 0
    const countForChunk = basePerChunk + (c >= CHUNK_COUNT - remainder ? 1 : 0);
    const slots = rng.shuffle(chunkEnemySlots[c]);
    const formation = chunkFormations[c];

    for (let k = 0; k < countForChunk; k++) {
      const baseSlot = slots[k % slots.length];
      const jitterX = k >= slots.length ? rng.int(-42, 42) : rng.int(-18, 18);
      const spawnX = Math.max(
        baseSlot.patrolLeft + 8,
        Math.min(baseSlot.patrolRight - 8, baseSlot.x + jitterX)
      );
      const enemyId = _pickEnemyForFormation(formation, baseSlot, k, cfg, rng);

      enemies.push(
        createEnemy(enemyId, spawnX, baseSlot.y, {
          patrolLeft: baseSlot.patrolLeft,
          patrolRight: baseSlot.patrolRight,
          canRespawn: true,
        })
      );
    }
  }

  const patternLabel = shuffledArchetypes.slice(0, 3).join(' → ');

  return {
    stageNumber,
    themeTopic: meta.themeTopic,
    parallaxTheme: meta.parallaxTheme,
    stageSeed: effectiveSeed,
    layoutPatternName: patternLabel,
    respawnInterval: cfg.respawnInterval,
    maxActiveEnemies: cfg.maxActiveEnemies,
    segment: {
      id: `stage_${stageNumber}_procedural`,
      mode: 'traverse',
      name: meta.title,
      width: worldWidth,
      bossId: cfg.bossId,
    },
    worldWidth,
    worldHeight: WORLD_HEIGHT,
    playerSpawn: { x: 56, y: 368 },
    platforms,
    movingPlatforms,
    crumblingPlatforms,
    lasers,
    crystals,
    spikes,
    bouncePads,
    torches,
    decorProps,
    areas,
    enemies,
    interactables,
    spawnPortals: [],
    bossSpawn: {
      id: cfg.bossId,
      x: bossStartX + 860,
      y: 344,
      triggerX: bossStartX + 80,
      arenaMinX: bossStartX,
    },
  };
}
