// ============================================================
// RIFTBOUND: SLAYER CORPS — Enemy Entity
// AI behaviors: patrol, chase, flying_ranged, turret, agile,
// heavy (Rift Brute), suicide (Mana Wisp)
// ============================================================

import type { EnemyBehavior, EnemyId } from '../types';
import { ENEMIES } from '../data/enemies';

export interface EnemyInstance {
  id: string;             // unique runtime instance ID
  defId: EnemyId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  damage: number;
  behavior: EnemyBehavior;
  speed: number;
  facingRight: boolean;
  alive: boolean;
  /** Stun timer — enemy can't act */
  stunTimer: number;
  /** White hit-flash timer (seconds) */
  hitFlashTimer: number;
  /** Shield HP (Sentinel only) */
  shieldHp: number;
  /** Attack cooldown */
  attackTimer: number;
  /** Patrol bounds (traverse mode) */
  patrolLeft: number;
  patrolRight: number;
  /** Whether this enemy is targeting the pylon (defense mode) */
  targetingPylon: boolean;
  /** Width/height for collision */
  width: number;
  height: number;
  /** Active special attack state machine for readable telegraphs */
  attackPhase: 'idle' | 'telegraph' | 'executing';
  /** Telegraph countdown before attack unleashes */
  telegraphTimer: number;
  /** Active attack motion timer (e.g. dash_lancer lunge) */
  activeAttackTimer: number;
  /** Set true while Void Hopper is mid-leap so landing triggers shockwave */
  pendingLeapShockwave: boolean;
  /** Original spawn point for tactical stage respawn */
  spawnX: number;
  spawnY: number;
  /** Whether killed enemy respawns after stage timer */
  canRespawn: boolean;
}

let _instanceCounter = 0;

/**
 * Create a new enemy instance from a definition.
 */
export function createEnemy(
  defId: EnemyId,
  x: number,
  y: number,
  options?: {
    patrolLeft?: number;
    patrolRight?: number;
    targetingPylon?: boolean;
    canRespawn?: boolean;
  }
): EnemyInstance {
  const def = ENEMIES[defId];
  if (!def) throw new Error(`Unknown enemy: ${defId}`);

  const sizeMap: Partial<Record<EnemyBehavior, [number, number]>> = {
    patrol:        [14, 20],
    chase:         [16, 22],
    flying_ranged: [12, 12],
    turret:        [14, 14],
    agile:         [12, 18],
    heavy:         [22, 28],
    suicide:       [8, 8],
    leap_slammer:  [15, 18],
    burst_sniper:  [14, 16],
    dash_lancer:   [16, 22],
  };
  const [w, h] = sizeMap[def.behavior] ?? [14, 20];

  return {
    id: `enemy_${_instanceCounter++}`,
    defId,
    x,
    y,
    vx: 0,
    vy: 0,
    hp: def.hp,
    maxHp: def.hp,
    damage: def.damage,
    behavior: def.behavior,
    speed: def.speed,
    facingRight: true,
    alive: true,
    stunTimer: 0,
    hitFlashTimer: 0,
    shieldHp: def.behavior === 'chase' && defId === 'corrupted_sentinel' ? 30 : 0,
    attackTimer: 0.6 + (_instanceCounter % 5) * 0.25,
    patrolLeft: options?.patrolLeft ?? x - 100,
    patrolRight: options?.patrolRight ?? x + 100,
    targetingPylon: options?.targetingPylon ?? def.targetsPylon,
    width: w,
    height: h,
    attackPhase: 'idle',
    telegraphTimer: 0,
    activeAttackTimer: 0,
    pendingLeapShockwave: false,
    spawnX: x,
    spawnY: y,
    canRespawn: options?.canRespawn ?? false,
  };
}

/**
 * Update enemy AI for one frame.
 * playerX/playerY = player position for chase/ranged targeting.
 * pylonX/pylonY = pylon position (defense mode).
 */
export function updateEnemyAI(
  enemy: EnemyInstance,
  dt: number,
  playerX: number,
  playerY: number,
  pylonX?: number,
  pylonY?: number,
) {
  if (!enemy.alive) return;

  if (enemy.hitFlashTimer > 0) enemy.hitFlashTimer -= dt;

  // Stun interrupts normal motion & resets telegraph if stunned
  if (enemy.stunTimer > 0) {
    enemy.stunTimer -= dt;
    enemy.vx = 0;
    if (enemy.attackPhase === 'telegraph') {
      enemy.attackPhase = 'idle';
      enemy.telegraphTimer = 0;
    }
    return;
  }

  // Attack cooldown
  if (enemy.attackTimer > 0) enemy.attackTimer -= dt;

  // Target selection (defense mode: pylon if applicable)
  let targetX = playerX;
  let targetY = playerY;
  if (enemy.targetingPylon && pylonX !== undefined && pylonY !== undefined) {
    targetX = pylonX;
    targetY = pylonY;
  }

  switch (enemy.behavior) {
    case 'patrol':
      _aiPatrol(enemy, dt, playerX);
      break;
    case 'chase':
      _aiChase(enemy, dt, targetX);
      break;
    case 'flying_ranged':
      _aiFlyingRanged(enemy, dt, targetX, targetY);
      break;
    case 'turret':
      _aiTurret(enemy, playerX);
      break;
    case 'agile':
      _aiAgile(enemy, dt, playerX, playerY);
      break;
    case 'heavy':
      _aiHeavy(enemy, dt, targetX);
      break;
    case 'suicide':
      _aiSuicide(enemy, dt, targetX, targetY);
      break;
    case 'leap_slammer':
      _aiLeapSlammer(enemy, dt, targetX, targetY);
      break;
    case 'burst_sniper':
      _aiBurstSniper(enemy, dt, targetX, targetY);
      break;
    case 'dash_lancer':
      _aiDashLancer(enemy, dt, targetX, targetY);
      break;
  }

  // Face direction of movement when not locked in a telegraph
  if (enemy.attackPhase !== 'telegraph') {
    if (enemy.vx > 0) enemy.facingRight = true;
    if (enemy.vx < 0) enemy.facingRight = false;
  }
}

// ── AI Behaviors ──────────────────────────────────────────

function _aiPatrol(e: EnemyInstance, _dt: number, playerX: number) {
  const distToPlayer = Math.abs(playerX - e.x);

  if (distToPlayer < 165) {
    // Chase player if close
    e.vx = playerX > e.x ? e.speed : -e.speed;
  } else {
    // Patrol between bounds
    if (e.x <= e.patrolLeft) e.vx = e.speed;
    else if (e.x >= e.patrolRight) e.vx = -e.speed;
    if (e.vx === 0) e.vx = e.speed;
  }
}

function _aiChase(e: EnemyInstance, _dt: number, targetX: number) {
  const dist = Math.abs(targetX - e.x);
  if (dist < 280 || e.targetingPylon) {
    const dir = targetX > e.x ? 1 : -1;
    e.vx = dir * e.speed;
  } else {
    if (e.x <= e.patrolLeft) e.vx = e.speed * 0.7;
    else if (e.x >= e.patrolRight) e.vx = -e.speed * 0.7;
    if (e.vx === 0) e.vx = e.speed * 0.7;
  }
}

function _aiFlyingRanged(e: EnemyInstance, _dt: number, targetX: number, targetY: number) {
  const dist = Math.abs(targetX - e.x);
  if (dist > 360 && !e.targetingPylon) {
    // Gentle hover patrol until player nears
    if (e.x <= e.patrolLeft) e.vx = e.speed * 0.6;
    else if (e.x >= e.patrolRight) e.vx = -e.speed * 0.6;
    if (e.vx === 0) e.vx = e.speed * 0.6;
    e.vy = 0;
    return;
  }
  const desiredX = targetX + (e.x > targetX ? 105 : -105);
  const desiredY = targetY - 62;

  const dx = desiredX - e.x;
  const dy = desiredY - e.y;
  e.vx = Math.sign(dx) * Math.min(Math.abs(dx), e.speed);
  e.vy = Math.sign(dy) * Math.min(Math.abs(dy), e.speed * 0.6);
}

function _aiTurret(e: EnemyInstance, playerX: number) {
  e.vx = 0;
  e.vy = 0;
  e.facingRight = playerX > e.x;
}

function _aiAgile(e: EnemyInstance, _dt: number, playerX: number, playerY: number) {
  const dist = Math.abs(playerX - e.x);

  if (dist > 320) {
    if (e.x <= e.patrolLeft) e.vx = e.speed * 0.65;
    else if (e.x >= e.patrolRight) e.vx = -e.speed * 0.65;
    if (e.vx === 0) e.vx = e.speed * 0.65;
    return;
  }

  if (dist < 56) {
    e.vx = playerX > e.x ? -e.speed * 1.45 : e.speed * 1.45;
  } else if (dist < 210) {
    e.vx = playerX > e.x ? e.speed * 1.3 : -e.speed * 1.3;
  } else {
    e.vx = playerX > e.x ? e.speed : -e.speed;
  }

  if (playerY < e.y - 40 && e.vy === 0) {
    e.vy = -280;
  }
}

function _aiHeavy(e: EnemyInstance, dt: number, targetX: number) {
  const dist = Math.abs(targetX - e.x);

  if (e.attackPhase === 'telegraph') {
    e.vx = 0;
    e.facingRight = targetX > e.x;
    e.telegraphTimer -= dt;
    if (e.telegraphTimer <= 0) {
      e.attackPhase = 'executing';
      e.activeAttackTimer = 0.25;
      e.attackTimer = 3.1;
    }
    return;
  }

  if (e.attackPhase === 'executing') {
    e.vx = 0;
    e.activeAttackTimer -= dt;
    if (e.activeAttackTimer <= 0) {
      e.attackPhase = 'idle';
    }
    return;
  }

  if (dist < 115 && e.attackTimer <= 0) {
    e.attackPhase = 'telegraph';
    e.telegraphTimer = 0.58;
    e.vx = 0;
    e.facingRight = targetX > e.x;
    return;
  }

  if (dist < 300 || e.targetingPylon) {
    const dir = targetX > e.x ? 1 : -1;
    e.vx = dir * e.speed;
  } else {
    if (e.x <= e.patrolLeft) e.vx = e.speed * 0.7;
    else if (e.x >= e.patrolRight) e.vx = -e.speed * 0.7;
    if (e.vx === 0) e.vx = e.speed * 0.7;
  }
}

function _aiSuicide(e: EnemyInstance, _dt: number, targetX: number, targetY: number) {
  const dx = targetX - e.x;
  const dy = targetY - e.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  if (dist > 360 && !e.targetingPylon) {
    e.vx = 0;
    e.vy = 0;
    return;
  }
  e.vx = (dx / dist) * e.speed;
  e.vy = (dy / dist) * e.speed;
}

// ── NEW PATTERN 1: LEAP SLAMMER (Void Hopper) ───────────────
// Coils with amber telegraph -> launches high parabolic arc -> slams shockwave on landing
function _aiLeapSlammer(e: EnemyInstance, dt: number, targetX: number, targetY: number) {
  const distX = targetX - e.x;
  const absDistX = Math.abs(distX);
  const absDistY = Math.abs(targetY - e.y);

  if (e.attackPhase === 'telegraph') {
    e.vx = 0;
    e.facingRight = distX >= 0;
    e.telegraphTimer -= dt;
    if (e.telegraphTimer <= 0) {
      // Parabolic leap toward target!
      const dir = distX >= 0 ? 1 : -1;
      e.vx = dir * Math.max(120, Math.min(240, absDistX * 1.15));
      e.vy = -340;
      e.attackPhase = 'executing';
      e.pendingLeapShockwave = true;
      e.attackTimer = 2.6;
    }
    return;
  }

  if (e.attackPhase === 'executing') {
    // Keep airborne momentum until landing (GameEngine resets attackPhase when hitting ground)
    return;
  }

  if (absDistX < 210 && absDistY < 130 && e.attackTimer <= 0 && Math.abs(e.vy) < 2) {
    e.attackPhase = 'telegraph';
    e.telegraphTimer = 0.52;
    e.vx = 0;
    e.facingRight = distX >= 0;
    return;
  }

  if (absDistX < 280) {
    e.vx = (distX >= 0 ? 1 : -1) * e.speed;
  } else {
    if (e.x <= e.patrolLeft) e.vx = e.speed * 0.75;
    else if (e.x >= e.patrolRight) e.vx = -e.speed * 0.75;
    if (e.vx === 0) e.vx = e.speed * 0.75;
  }
}

// ── NEW PATTERN 2: BURST SNIPER (Pulse Acolyte) ─────────────
// Hovers at mid-range, charges cyan lock-on reticle, fires 3-bolt fan spread
function _aiBurstSniper(e: EnemyInstance, dt: number, targetX: number, targetY: number) {
  const dx = targetX - e.x;
  const absX = Math.abs(dx);
  e.facingRight = dx >= 0;

  if (e.attackPhase === 'telegraph') {
    // Hold steady while charging reticle
    e.vx *= 0.85;
    e.vy *= 0.85;
    e.telegraphTimer -= dt;
    if (e.telegraphTimer <= 0) {
      // Hand off to GameEngine to unleash 3-shot burst
      e.attackPhase = 'executing';
      e.activeAttackTimer = 0.18;
      e.attackTimer = 2.9;
    }
    return;
  }

  if (e.attackPhase === 'executing') {
    e.vx *= 0.9;
    e.vy *= 0.9;
    e.activeAttackTimer -= dt;
    if (e.activeAttackTimer <= 0) {
      e.attackPhase = 'idle';
    }
    return;
  }

  if (absX > 380 && !e.targetingPylon) {
    if (e.x <= e.patrolLeft) e.vx = e.speed * 0.6;
    else if (e.x >= e.patrolRight) e.vx = -e.speed * 0.6;
    if (e.vx === 0) e.vx = e.speed * 0.6;
    e.vy = 0;
    return;
  }

  // Keep medium elevated spacing (~145px horizontal, 68px above target)
  const desiredX = targetX + (e.x > targetX ? 145 : -145);
  const desiredY = targetY - 68;
  e.vx = Math.sign(desiredX - e.x) * Math.min(Math.abs(desiredX - e.x), e.speed);
  e.vy = Math.sign(desiredY - e.y) * Math.min(Math.abs(desiredY - e.y), e.speed * 0.65);

  if (absX < 310 && e.attackTimer <= 0) {
    e.attackPhase = 'telegraph';
    e.telegraphTimer = 0.56;
  }
}

// ── NEW PATTERN 3: DASH LANCER (Rift Lancer) ────────────────
// Locks horizontal crimson warning beam -> executes blistering lance dash charge
function _aiDashLancer(e: EnemyInstance, dt: number, targetX: number, targetY: number) {
  const dx = targetX - e.x;
  const absX = Math.abs(dx);
  const absY = Math.abs(targetY - e.y);

  if (e.attackPhase === 'telegraph') {
    e.vx = 0;
    e.telegraphTimer -= dt;
    if (e.telegraphTimer <= 0) {
      e.attackPhase = 'executing';
      e.activeAttackTimer = 0.44;
      e.vx = (e.facingRight ? 1 : -1) * 295;
      e.attackTimer = 2.75;
    }
    return;
  }

  if (e.attackPhase === 'executing') {
    e.activeAttackTimer -= dt;
    e.vx = (e.facingRight ? 1 : -1) * 295;
    if (e.activeAttackTimer <= 0) {
      e.attackPhase = 'idle';
      e.vx = 0;
    }
    return;
  }

  if (absX < 220 && absY < 64 && e.attackTimer <= 0) {
    e.attackPhase = 'telegraph';
    e.telegraphTimer = 0.62;
    e.facingRight = dx >= 0;
    e.vx = 0;
    return;
  }

  if (absX < 280) {
    e.vx = (dx >= 0 ? 1 : -1) * e.speed;
  } else {
    if (e.x <= e.patrolLeft) e.vx = e.speed * 0.75;
    else if (e.x >= e.patrolRight) e.vx = -e.speed * 0.75;
    if (e.vx === 0) e.vx = e.speed * 0.75;
  }
}

export interface DamageResult {
  killed: boolean;
  finalDamage: number;
  shieldAbsorbed: boolean;
  shieldBroken: boolean;
  piercedShield: boolean;
}

/**
 * Apply damage to enemy with DamageType scaling:
 * - 'impact': 1.35x shield damage & longer stagger
 * - 'pierce': 40% damage bleeds directly through shields
 * - 'slash': standard shield interaction, faster combos
 */
export function damageEnemyDetailed(
  enemy: EnemyInstance,
  amount: number,
  isArmorBreak = false,
  damageType: 'slash' | 'pierce' | 'impact' = 'slash'
): DamageResult {
  if (!enemy.alive) {
    return {
      killed: false,
      finalDamage: 0,
      shieldAbsorbed: false,
      shieldBroken: false,
      piercedShield: false,
    };
  }

  let shieldBroken = false;
  let piercedShield = false;

  // Shield check (Corrupted Sentinel)
  if (enemy.shieldHp > 0 && !isArmorBreak) {
    const shieldDmg =
      damageType === 'impact' ? Math.round(amount * 1.35) : amount;
    enemy.shieldHp = Math.max(0, enemy.shieldHp - shieldDmg);
    if (enemy.shieldHp <= 0) {
      shieldBroken = true;
      enemy.stunTimer = Math.max(enemy.stunTimer, 0.35);
    }

    if (damageType === 'pierce') {
      const bleed = Math.max(1, Math.round(amount * 0.4));
      enemy.hp -= bleed;
      enemy.hitFlashTimer = 0.09;
      piercedShield = true;
      if (enemy.hp <= 0) {
        enemy.alive = false;
        return {
          killed: true,
          finalDamage: bleed,
          shieldAbsorbed: false,
          shieldBroken,
          piercedShield: true,
        };
      }
      return {
        killed: false,
        finalDamage: bleed,
        shieldAbsorbed: !shieldBroken,
        shieldBroken,
        piercedShield: true,
      };
    }

    enemy.hitFlashTimer = 0.06;
    return {
      killed: false,
      finalDamage: shieldDmg,
      shieldAbsorbed: !shieldBroken,
      shieldBroken,
      piercedShield: false,
    };
  }

  // Armor break bypasses shield
  if (isArmorBreak && enemy.shieldHp > 0) {
    enemy.shieldHp = 0;
    shieldBroken = true;
  }

  const finalDamage = Math.max(1, Math.round(amount));
  enemy.hp -= finalDamage;
  const stagger = damageType === 'impact' ? 0.2 : 0.12;
  enemy.stunTimer = Math.max(enemy.stunTimer, enemy.behavior === 'heavy' ? stagger * 0.55 : stagger);
  enemy.hitFlashTimer = 0.1;

  if (enemy.hp <= 0) {
    enemy.alive = false;
    return {
      killed: true,
      finalDamage,
      shieldAbsorbed: false,
      shieldBroken,
      piercedShield,
    };
  }
  return {
    killed: false,
    finalDamage,
    shieldAbsorbed: false,
    shieldBroken,
    piercedShield,
  };
}

/**
 * Backwards-compatible wrapper returning boolean killed.
 */
export function damageEnemy(
  enemy: EnemyInstance,
  amount: number,
  isArmorBreak = false,
  damageType: 'slash' | 'pierce' | 'impact' = 'slash'
): boolean {
  return damageEnemyDetailed(enemy, amount, isArmorBreak, damageType).killed;
}
