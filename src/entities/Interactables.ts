// ============================================================
// RIFTBOUND: SLAYER CORPS — Interactables
// Encrypted Chest, Puzzle Shrine, Merchant, Checkpoint,
// Emergency Terminal, Repair Terminal, Quick-Decrypt Gate,
// Runic Pillar, Barricade Node, Exit Gate, Pylon
// ============================================================

import type { ChestDef, InteractableType, PuzzleTrigger } from '../types';

export interface InteractableInstance {
  id: string;
  type: InteractableType;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Whether the player is in interact range */
  inRange: boolean;
  /** Whether this interactable has been used/opened */
  used: boolean;
  /** Whether this is currently active (blinking prompt) */
  active: boolean;
  /** Additional data specific to type */
  data: InteractableData;
}

export type InteractableData =
  | ChestData
  | PylonData
  | TerminalData
  | BarricadeData
  | GateData
  | GenericData;

interface ChestData {
  kind: 'chest';
  chest: ChestDef;
  opened: boolean;
}

interface PylonData {
  kind: 'pylon';
  hp: number;
  maxHp: number;
  reactivating: boolean;
}

interface TerminalData {
  kind: 'terminal';
  terminalType: 'emergency' | 'repair';
  cooldownTimer: number; // seconds until reusable
  puzzleTrigger: PuzzleTrigger;
}

interface BarricadeData {
  kind: 'barricade';
  activeTimer: number;    // seconds remaining when active
  cooldownTimer: number;  // seconds until reusable
  isDeployed: boolean;
}

interface GateData {
  kind: 'gate';
  gateType: 'exit' | 'quick_decrypt';
  isOpen: boolean;
  /** For quick-decrypt: has alternate (dangerous) path */
  hasAlternatePath: boolean;
}

interface GenericData {
  kind: 'generic';
  subType: 'merchant' | 'checkpoint' | 'puzzle_shrine' | 'runic_pillar';
}

let _interactCounter = 0;

// ── Factory Functions ─────────────────────────────────────

export function createChest(x: number, y: number, chest: ChestDef): InteractableInstance {
  const typeMap = {
    common: 'chest_common' as InteractableType,
    rare: 'chest_rare' as InteractableType,
    epic: 'chest_epic' as InteractableType,
  };
  return {
    id: `interact_${_interactCounter++}`,
    type: typeMap[chest.tier],
    x, y,
    width: 32,
    height: 24,
    inRange: false,
    used: false,
    active: false,
    data: { kind: 'chest', chest, opened: false },
  };
}

export function createPylon(x: number, y: number, maxHp: number): InteractableInstance {
  return {
    id: `interact_${_interactCounter++}`,
    type: 'repair_terminal', // co-located
    x, y,
    width: 24,
    height: 48,
    inRange: false,
    used: false,
    active: true,
    data: { kind: 'pylon', hp: maxHp, maxHp, reactivating: true },
  };
}

export function createTerminal(
  x: number,
  y: number,
  terminalType: 'emergency' | 'repair',
): InteractableInstance {
  return {
    id: `interact_${_interactCounter++}`,
    type: terminalType === 'emergency' ? 'emergency_terminal' : 'repair_terminal',
    x, y,
    width: 16,
    height: 24,
    inRange: false,
    used: false,
    active: true,
    data: {
      kind: 'terminal',
      terminalType,
      cooldownTimer: 0,
      puzzleTrigger: 'terminal',
    },
  };
}

export function createBarricadeNode(x: number, y: number): InteractableInstance {
  return {
    id: `interact_${_interactCounter++}`,
    type: 'barricade_node',
    x, y,
    width: 20,
    height: 32,
    inRange: false,
    used: false,
    active: true,
    data: {
      kind: 'barricade',
      activeTimer: 0,
      cooldownTimer: 0,
      isDeployed: false,
    },
  };
}

export function createExitGate(x: number, y: number): InteractableInstance {
  return {
    id: `interact_${_interactCounter++}`,
    type: 'exit_gate',
    x, y,
    width: 32,
    height: 48,
    inRange: false,
    used: false,
    active: true,
    data: { kind: 'gate', gateType: 'exit', isOpen: false, hasAlternatePath: false },
  };
}

export function createQuickDecryptGate(x: number, y: number): InteractableInstance {
  return {
    id: `interact_${_interactCounter++}`,
    type: 'quick_decrypt_gate',
    x, y,
    width: 8,
    height: 48,
    inRange: false,
    used: false,
    active: true,
    data: { kind: 'gate', gateType: 'quick_decrypt', isOpen: false, hasAlternatePath: true },
  };
}

export function createMerchant(x: number, y: number): InteractableInstance {
  return {
    id: `interact_${_interactCounter++}`,
    type: 'merchant',
    x, y,
    width: 20,
    height: 32,
    inRange: false,
    used: false,
    active: true,
    data: { kind: 'generic', subType: 'merchant' },
  };
}

export function createCheckpoint(x: number, y: number): InteractableInstance {
  return {
    id: `interact_${_interactCounter++}`,
    type: 'checkpoint',
    x, y,
    width: 16,
    height: 32,
    inRange: false,
    used: false,
    active: true,
    data: { kind: 'generic', subType: 'checkpoint' },
  };
}

export function createPuzzleShrine(x: number, y: number): InteractableInstance {
  return {
    id: `interact_${_interactCounter++}`,
    type: 'puzzle_shrine',
    x, y,
    width: 32,
    height: 40,
    inRange: false,
    used: false,
    active: true,
    data: { kind: 'generic', subType: 'puzzle_shrine' },
  };
}

export function createRunicPillar(x: number, y: number): InteractableInstance {
  return {
    id: `interact_${_interactCounter++}`,
    type: 'runic_pillar',
    x, y,
    width: 16,
    height: 40,
    inRange: false,
    used: false,
    active: true,
    data: { kind: 'generic', subType: 'runic_pillar' },
  };
}

// ── Update & Utility ──────────────────────────────────────

/** Check if player AABB overlaps interactable interact-range */
export function checkInteractRange(
  interactable: InteractableInstance,
  playerX: number,
  playerY: number,
  playerW: number,
  playerH: number,
  rangePadding = 12,
): boolean {
  const ix = interactable.x - rangePadding;
  const iy = interactable.y - rangePadding;
  const iw = interactable.width + rangePadding * 2;
  const ih = interactable.height + rangePadding * 2;

  const overlap =
    playerX < ix + iw &&
    playerX + playerW > ix &&
    playerY < iy + ih &&
    playerY + playerH > iy;

  interactable.inRange = overlap;
  return overlap;
}

/** Update barricade/terminal cooldowns */
export function updateInteractable(interactable: InteractableInstance, dt: number) {
  const d = interactable.data;

  if (d.kind === 'barricade') {
    if (d.isDeployed) {
      d.activeTimer -= dt;
      if (d.activeTimer <= 0) {
        d.isDeployed = false;
        d.cooldownTimer = 20; // 20s cooldown
      }
    } else if (d.cooldownTimer > 0) {
      d.cooldownTimer -= dt;
    }
  }

  if (d.kind === 'terminal') {
    if (d.cooldownTimer > 0) {
      d.cooldownTimer -= dt;
    }
  }
}
