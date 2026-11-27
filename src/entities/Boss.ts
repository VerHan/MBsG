// ============================================================
// RIFTBOUND: SLAYER CORPS — Boss Entity
// Dedicated boss logic with phase system, attack patterns,
// shield mechanics, and Runic Pillar integration.
// ============================================================

import type { BossDef, BossId, EnemyId } from '../types';
import { BOSSES } from '../data/bosses';

export type BossAttackState =
  | 'idle'
  | 'telegraph'  // wind-up animation before attack
  | 'attacking'
  | 'recovery'   // post-attack cooldown
  | 'stunned'
  | 'shielded'   // shield active, can be broken
  | 'dead';

export interface BossInstance {
  def: BossDef;
  hp: number;
  maxHp: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  facingRight: boolean;

  /** Current phase index (0-based) */
  currentPhase: number;
  /** Current attack state */
  attackState: BossAttackState;
  /** Current attack being executed */
  currentAttack: string | null;
  /** Timer for current state */
  stateTimer: number;
  /** Cooldown between attacks */
  attackCooldown: number;

  /** Shield */
  shieldActive: boolean;
  shieldHp: number;
  shieldMaxHp: number;

  /** Stun (from Runic Pillar puzzle or shield break) */
  stunTimer: number;

  /** Minion spawn timer */
  minionTimer: number;

  /** Whether the Runic Pillar is available this phase */
  runicPillarAvailable: boolean;
  /** Whether Runic Pillar has been used this phase */
  runicPillarUsed: boolean;
}

export function createBoss(bossId: BossId, x: number, y: number): BossInstance {
  const def = BOSSES[bossId];
  if (!def) throw new Error(`Unknown boss: ${bossId}`);

  const sizeMap: Record<BossId, [number, number]> = {
    mana_colossus: [48, 56],
    forge_titan:   [56, 64],
    aetherion:     [40, 48],
  };
  const [w, h] = sizeMap[bossId] ?? [40, 48];

  return {
    def,
    hp: def.maxHp,
    maxHp: def.maxHp,
    x,
    y,
    vx: 0,
    vy: 0,
    width: w,
    height: h,
    facingRight: true,
    currentPhase: 0,
    attackState: 'idle',
    currentAttack: null,
    stateTimer: 2, // 2s before first attack
    attackCooldown: 0,
    shieldActive: false,
    shieldHp: 0,
    shieldMaxHp: 0,
    stunTimer: 0,
    minionTimer: 0,
    runicPillarAvailable: def.hasRunicPillar,
    runicPillarUsed: false,
  };
}

/**
 * Update boss AI for one frame.
 */
export function updateBoss(
  boss: BossInstance,
  dt: number,
  playerX: number,
  _playerY: number,
  onAttack?: (attack: string) => void,
  onSpawnMinion?: (enemyId: EnemyId, count: number) => void,
): void {
  if (boss.hp <= 0) {
    boss.attackState = 'dead';
    return;
  }

  // Face player
  boss.facingRight = playerX > boss.x;

  // Check phase transition
  _checkPhaseTransition(boss);

  // Stun
  if (boss.stunTimer > 0) {
    boss.stunTimer -= dt;
    boss.attackState = 'stunned';
    return;
  }

  // Shield
  if (boss.shieldActive) {
    boss.attackState = 'shielded';
    // Boss can still be damaged through brute force on shield
  }

  // Minion spawning
  const phase = boss.def.phases[boss.currentPhase];
  if (phase?.spawnMinions && phase.minionInterval) {
    boss.minionTimer -= dt;
    if (boss.minionTimer <= 0) {
      onSpawnMinion?.(phase.spawnMinions[0], phase.minionCount ?? 1);
      boss.minionTimer = phase.minionInterval;
    }
  }

  // Attack state machine
  boss.stateTimer -= dt;

  switch (boss.attackState) {
    case 'idle':
      if (boss.stateTimer <= 0) {
        // Pick random attack from current phase
        const attacks = phase?.attacks ?? [];
        if (attacks.length > 0) {
          boss.currentAttack = attacks[Math.floor(Math.random() * attacks.length)];
          boss.attackState = 'telegraph';
          boss.stateTimer = 0.5; // 0.5s telegraph
        }
      }
      break;

    case 'telegraph':
      if (boss.stateTimer <= 0) {
        boss.attackState = 'attacking';
        boss.stateTimer = 0.8; // attack duration
        onAttack?.(boss.currentAttack!);
      }
      break;

    case 'attacking':
      if (boss.stateTimer <= 0) {
        boss.attackState = 'recovery';
        boss.stateTimer = 0.5;
      }
      break;

    case 'recovery':
      if (boss.stateTimer <= 0) {
        boss.attackState = 'idle';
        boss.stateTimer = 1.5 + Math.random() * 1; // 1.5-2.5s between attacks
      }
      break;

    case 'stunned':
      // Handled by stunTimer above
      if (boss.stunTimer <= 0) {
        boss.attackState = 'idle';
        boss.stateTimer = 1;
      }
      break;

    case 'shielded':
      // Waiting for shield to be broken (by damage or Runic Pillar)
      if (!boss.shieldActive) {
        boss.attackState = 'stunned';
        boss.stunTimer = 2; // 2s stun after shield break
      }
      break;
  }
}

/**
 * Damage the boss. Returns true if boss died.
 */
export function damageBoss(boss: BossInstance, amount: number): boolean {
  if (boss.shieldActive) {
    boss.shieldHp -= amount;
    if (boss.shieldHp <= 0) {
      boss.shieldActive = false;
      boss.shieldHp = 0;
    }
    return false;
  }

  boss.hp = Math.max(0, boss.hp - amount);
  return boss.hp <= 0;
}

/**
 * Break boss shield via Runic Pillar (puzzle correct answer).
 * Also stuns the boss for 4 seconds.
 */
export function breakShieldViaRunicPillar(boss: BossInstance) {
  boss.shieldActive = false;
  boss.shieldHp = 0;
  boss.stunTimer = 4;
  boss.runicPillarUsed = true;
  boss.attackState = 'stunned';
}

// ── Internal ──────────────────────────────────────────────

function _checkPhaseTransition(boss: BossInstance) {
  const hpPercent = boss.hp / boss.maxHp;
  const phases = boss.def.phases;

  // Find the latest phase that should be active
  let targetPhase = 0;
  for (let i = phases.length - 1; i >= 0; i--) {
    if (hpPercent <= phases[i].hpThreshold) {
      targetPhase = i;
    }
  }

  if (targetPhase > boss.currentPhase) {
    boss.currentPhase = targetPhase;
    const phase = phases[targetPhase];

    // Activate shield if this phase has one
    if (phase.hasShield) {
      boss.shieldActive = true;
      boss.shieldMaxHp = phase.shieldHp ?? 100;
      boss.shieldHp = boss.shieldMaxHp;
      boss.runicPillarUsed = false; // reset for new phase
    }

    // Set minion timer
    if (phase.spawnMinions && phase.minionInterval) {
      boss.minionTimer = phase.minionInterval;
    }
  }
}
