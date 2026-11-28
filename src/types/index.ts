// ============================================================
// RIFTBOUND: SLAYER CORPS — Shared TypeScript Types & Interfaces
// ============================================================

// ── GAME MODES ──────────────────────────────────────────────
export type GameMode = 'traverse' | 'survival' | 'defense' | 'gauntlet' | 'boss';

export type GameScreen =
  | 'title'
  | 'lore'
  | 'playing'
  | 'paused'
  | 'stage_clear'
  | 'game_over'
  | 'victory';

// ── WEAPONS ─────────────────────────────────────────────────
export type WeaponSlot = 'melee' | 'ranged';
export type WeaponTier = 'common' | 'rare' | 'epic';
export type DamageType = 'slash' | 'pierce' | 'impact';

export type MeleeWeaponId =
  | 'needle'
  | 'dagger'
  | 'sword'
  | 'spear'
  | 'katana'
  | 'axe'
  | 'hammer'
  | 'dual_sword';
export type RangedWeaponId = 'pistol' | 'dual_pistol' | 'shotgun' | 'bow' | 'rifle';
export type WeaponId = MeleeWeaponId | RangedWeaponId;

export interface WeaponDef {
  id: WeaponId;
  name: string;
  slot: WeaponSlot;
  damageType: DamageType;
  baseDamage: number;
  /** Hits per attack (e.g. dual_sword = 2, shotgun = 5) */
  hitsPerAttack: number;
  attackSpeed: 'very_fast' | 'fast' | 'normal' | 'slow';
  /** Frames between attacks at 60fps */
  attackCooldown: number;
  /** Base critical hit chance (0-1) */
  critChance: number;
  /** Reach rating 1-5 for arsenal comparison */
  reachRating: 1 | 2 | 3 | 4 | 5;
  /** Energy cost per shot (ranged only, 0 for melee) */
  energyCost: number;
  specialTrait: string;
  description: string;
}

export interface WeaponInstance {
  defId: WeaponId;
  tier: WeaponTier;
  /** Upgrade level: 1 = Base, 2 = Glowing (+24% DMG), 3 = Overcharged (+50% DMG) */
  level?: number;
}

export const TIER_DAMAGE_MULT: Record<WeaponTier, number> = {
  common: 1.0,
  rare: 1.4,
  epic: 1.8,
};

// ── ARMOR ───────────────────────────────────────────────────
export type ArmorId =
  | 'recruit_mk1'
  | 'moss_warden'
  | 'vanguard'
  | 'rift_stalker'
  | 'needle_dancer'
  | 'aether_praetor';

export interface ArmorDef {
  id: ArmorId;
  name: string;
  archetype: string;
  hpBonus: number;
  defPercent: number;
  speedMult: number;
  dashCdMult: number;
  energyCostMult: number;
  /** Optional combat bonuses */
  critBonus?: number;
  attackSpeedMult?: number;
  parryBonus?: number;
  pogoBonus?: number;
  regenInterval?: number;
  passiveDesc: string;
  /** Pixel color palette overrides for the MC sprite */
  palette: {
    primary: string;
    secondary: string;
    visor: string;
    glow: string;
    cloak?: string;
  };
}

// ── ENEMIES ─────────────────────────────────────────────────
export type EnemyId =
  | 'mana_husk'
  | 'rift_drone'
  | 'corrupted_sentinel'
  | 'void_spitter'
  | 'mana_stalker'
  | 'rift_brute'
  | 'mana_wisp'
  | 'void_hopper'
  | 'pulse_acolyte'
  | 'rift_lancer';

export type EnemyBehavior =
  | 'patrol'
  | 'chase'
  | 'flying_ranged'
  | 'turret'
  | 'agile'
  | 'heavy'
  | 'suicide'
  | 'leap_slammer'
  | 'burst_sniper'
  | 'dash_lancer';

export interface EnemyDef {
  id: EnemyId;
  name: string;
  hp: number;
  damage: number;
  behavior: EnemyBehavior;
  speed: number;
  /** Whether this enemy prioritizes Pylon over Player in defense mode */
  targetsPylon: boolean;
  /** Whether this enemy ignores barricade nodes */
  ignoresBarricade: boolean;
  weakness: string;
  shardDrop: number;
}

// ── BOSSES ──────────────────────────────────────────────────
export type BossId = 'mana_colossus' | 'forge_titan' | 'aetherion';

export interface BossPhase {
  hpThreshold: number; // e.g. 0.5 = activates when HP drops below 50%
  attacks: string[];
  spawnMinions?: EnemyId[];
  minionCount?: number;
  minionInterval?: number; // seconds
  hasShield?: boolean;
  shieldHp?: number;
}

export interface BossDef {
  id: BossId;
  name: string;
  title: string;
  maxHp: number;
  contactDamage: number;
  phases: BossPhase[];
  hasRunicPillar: boolean;
  drops?: {
    weaponId?: WeaponId;
    weaponTier?: WeaponTier;
    /** Pool of candidate weapons — randomly picks 1 (prioritizes unowned!) on kill */
    dropPool?: Array<{ weaponId: WeaponId; weaponTier: WeaponTier; level?: number }>;
    secondaryWeaponId?: WeaponId;
    secondaryWeaponTier?: WeaponTier;
    armorId?: ArmorId;
    shards: number;
    ammoPacks: number;
  };
}

// ── PUZZLES ─────────────────────────────────────────────────
export type PuzzleDifficulty = 'easy' | 'medium' | 'hard';
export type PuzzleTrigger = 'chest' | 'shrine' | 'terminal' | 'gate' | 'pillar' | 'merchant';

export interface PuzzleQuestion {
  id: string;
  stage: 1 | 2 | 3;
  difficulty: PuzzleDifficulty;
  category: string;
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
  usedIn: PuzzleTrigger[];
}

// ── INTERACTABLES ───────────────────────────────────────────
export type InteractableType =
  | 'chest_common'
  | 'chest_rare'
  | 'chest_epic'
  | 'puzzle_shrine'
  | 'merchant'
  | 'checkpoint'
  | 'emergency_terminal'
  | 'repair_terminal'
  | 'quick_decrypt_gate'
  | 'runic_pillar'
  | 'barricade_node'
  | 'exit_gate';

export interface ChestDef {
  tier: 'common' | 'rare' | 'epic';
  questionsRequired: number; // 1 for standard supply, 2 for rare armory, 3 for epic relic
  loot: {
    weaponId?: WeaponId;
    weaponTier?: WeaponTier;
    weaponLevel?: number;
    /** Specifically upgrades an existing weapon (e.g. Dagger Lv.1 -> Lv.2 Glowing!) */
    upgradeWeaponId?: WeaponId;
    armorId?: ArmorId;
    hpRestore?: number;
    energyRestore?: number;
    ammoPacks?: number;
    nanoVials?: number;
    shards: number;
  };
}

// ── STAGE & SEGMENTS ────────────────────────────────────────
export interface WaveConfig {
  enemies: Array<{ id: EnemyId; count: number }>;
  spawnDelay: number; // seconds between spawns within wave
}

export interface SegmentConfig {
  id: string;
  mode: GameMode;
  name: string;

  // TRAVERSE
  /** Width in tiles for traverse segments */
  width?: number;
  /** Platform layout defined in stage data */

  // SURVIVAL
  survivalDuration?: number; // seconds
  survivalWaves?: WaveConfig[];

  // DEFENSE
  pylonHp?: number;
  defenseWaves?: WaveConfig[];
  repairTerminalCount?: number;
  barricadeNodeCount?: number;

  // GAUNTLET
  gauntletDuration?: number; // seconds
  scrollSpeed?: number; // pixels per second
  quickDecryptGateCount?: number;

  // BOSS
  bossId?: BossId;

  // Shared
  chests?: ChestDef[];
  hasMerchant?: boolean;
  hasPuzzleShrine?: boolean;
}

export interface StageDef {
  id: string;
  name: string;
  subtitle: string;
  segments: SegmentConfig[];
  parallaxTheme: 'ruins' | 'foundry' | 'rift_scar';
}

// ── PLAYER STATE ────────────────────────────────────────────
export type StyleRank = 'D' | 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS';

export interface PlayerState {
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  ammoPacks: number;
  maxAmmoPacks: number;
  shards: number;
  nanoVials: number;
  maxNanoVials: number;
  meleeWeapon: WeaponInstance;
  /** Nullable: only 1H Dagger/Sword can pair with a Ranged gun; 2H weapons carry off-hand shield/sheath */
  rangedWeapon: WeaponInstance | null;
  armorId: ArmorId;
  styleRank: StyleRank;
  stylePoints: number;
  adrenaline: number; // 0-100
  /** Inventory of all obtained weapons */
  weaponInventory: WeaponInstance[];
  /** Inventory of all obtained armors */
  armorInventory: ArmorId[];
}

// ── STAGE RESULTS & GRADING ─────────────────────────────────
export type StageGrade = 'F' | 'D' | 'C' | 'B' | 'A' | 'S';

export interface StageResult {
  stageId: string;
  grade: StageGrade;
  combatScore: number;
  killCount: number;
  avgStyleRank: StyleRank;
  puzzleAttempted: number;
  puzzleCorrect: number;
  puzzleAccuracy: number; // 0-1
  timeTaken: number; // seconds
  hpRemaining: number;
  pylonHpRemaining?: number;
  aetherShardsEarned: number;
}

// ── SAVE DATA ───────────────────────────────────────────────
export interface StudentAnswerLog {
  questionId: string;
  category: string;
  difficulty: PuzzleDifficulty;
  correct: boolean;
  timestamp: number;
}

export type StageKey = 'stage_1' | 'stage_2' | 'stage_3';

export interface SavedGearState {
  ammoPacks: number;
  nanoVials: number;
  shards: number;
  meleeWeapon: WeaponInstance;
  /** Nullable: only 1H Dagger/Sword can pair with a Ranged gun; 2H weapons carry off-hand shield/sheath */
  rangedWeapon: WeaponInstance | null;
  armorId: ArmorId;
  weaponInventory: WeaponInstance[];
  armorInventory: ArmorId[];
}

export interface StudentProgress {
  username: string;
  usernameKey: string;
  className: string;
  totalKills: number;
  totalShards: number;
  puzzlesAttempted: number;
  puzzlesCorrect: number;
  answeredPuzzleIds: string[];
  modesCleared: GameMode[];
  completedStages: StageKey[];
  stageBestKills?: Record<string, number>;
  stageBestShards?: Record<string, number>;
  savedGear?: SavedGearState;
  recentAnswers: StudentAnswerLog[];
  updatedAt: number;
}

export interface SaveData {
  currentStageIndex: number;
  currentSegmentIndex: number;
  player: PlayerState;
  stageResults: StageResult[];
  /** All puzzle IDs the player has answered correctly (no repeat) */
  answeredPuzzleIds: string[];
  totalPlayTime: number; // seconds
  newGamePlus: boolean;
}

// ── SOUND IDS ───────────────────────────────────────────────
export type SoundId =
  | 'sword_slash'
  | 'dual_slash'
  | 'combo_spin'
  | 'combo_finisher'
  | 'spear_thrust'
  | 'hammer_slam'
  | 'block_clang'
  | 'parry_flash'
  | 'axe_hit'
  | 'pistol_fire'
  | 'dual_pistol_fire'
  | 'shotgun_blast'
  | 'rifle_beam'
  | 'dash'
  | 'jump'
  | 'double_jump'
  | 'wall_slide'
  | 'pogo_bounce'
  | 'player_hit'
  | 'player_heal'
  | 'enemy_hit'
  | 'enemy_die'
  | 'chest_open'
  | 'puzzle_correct'
  | 'puzzle_wrong'
  | 'style_rank_up'
  | 'adrenaline_burst'
  | 'pylon_hit'
  | 'pylon_repair'
  | 'turret_spawn'
  | 'barricade_activate'
  | 'gate_open'
  | 'boss_roar'
  | 'boss_shield'
  | 'boss_stun'
  | 'stage_clear'
  | 'game_over'
  | 'menu_select'
  | 'menu_confirm';
