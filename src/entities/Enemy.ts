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
    attackTimer: 0,
    patrolLeft: options?.patrolLeft ?? x - 100,
    patrolRight: options?.patrolRight ?? x + 100,
    targetingPylon: options?.targetingPylon ?? def.targetsPylon,
    width: w,
    height: h,
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

  // Stun
  if (enemy.stunTimer > 0) {
    enemy.stunTimer -= dt;
    enemy.vx = 0;
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
  }

  // Face direction of movement
  if (enemy.vx > 0) enemy.facingRight = true;
  if (enemy.vx < 0) enemy.facingRight = false;
}

// ── AI Behaviors ──────────────────────────────────────────

function _aiPatrol(e: EnemyInstance, _dt: number, playerX: number) {
  const distToPlayer = Math.abs(playerX - e.x);

  if (distToPlayer < 150) {
    // Chase player if close
    e.vx = playerX > e.x ? e.speed : -e.speed;
  } else {
    // Patrol between bounds
    if (e.x <= e.patrolLeft) e.vx = e.speed;
    else if (e.x >= e.patrolRight) e.vx = -e.speed;
    // Otherwise keep current direction
    if (e.vx === 0) e.vx = e.speed;
  }
}

function _aiChase(e: EnemyInstance, _dt: number, targetX: number) {
  const dir = targetX > e.x ? 1 : -1;
  e.vx = dir * e.speed;
}

function _aiFlyingRanged(e: EnemyInstance, _dt: number, targetX: number, targetY: number) {
  // Hover at a distance above/near target, face target
  const desiredX = targetX + (e.x > targetX ? 100 : -100);
  const desiredY = targetY - 60;

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

  if (dist < 60) {
    // Too close → dash away briefly then attack
    e.vx = playerX > e.x ? -e.speed * 1.5 : e.speed * 1.5;
  } else if (dist < 200) {
    // Dash toward player
    e.vx = playerX > e.x ? e.speed * 1.3 : -e.speed * 1.3;
  } else {
    e.vx = playerX > e.x ? e.speed : -e.speed;
  }

  // Jump if player is above
  if (playerY < e.y - 40 && e.vy === 0) {
    e.vy = -280;
  }
}

function _aiHeavy(e: EnemyInstance, _dt: number, targetX: number) {
  const dir = targetX > e.x ? 1 : -1;
  e.vx = dir * e.speed; // slow but relentless
}

function _aiSuicide(e: EnemyInstance, _dt: number, targetX: number, targetY: number) {
  // Fly directly toward target
  const dx = targetX - e.x;
  const dy = targetY - e.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  e.vx = (dx / dist) * e.speed;
  e.vy = (dy / dist) * e.speed;
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
