// ============================================================
// RIFTBOUND: SLAYER CORPS — Projectile Entity
// Handles all ranged weapon projectiles:
// Pistol (single), Dual Pistol (burst), Shotgun (5-spread),
// Rifle (piercing beam), Enemy orbs, Boss attacks.
// ============================================================

export type ProjectileSource = 'player' | 'enemy' | 'boss';

export interface ProjectileInstance {
  id: string;
  source: ProjectileSource;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  width: number;
  height: number;
  /** Whether this projectile pierces through enemies */
  piercing: boolean;
  /** Set of enemy IDs already hit (for piercing) */
  hitTargets: Set<string>;
  /** Remaining lifetime (seconds) — auto-despawn after */
  life: number;
  /** Visual color */
  color: string;
  /** Trail color (for particle emit) */
  trailColor: string;
  alive: boolean;
}

let _projCounter = 0;

/**
 * Spawn a single projectile.
 */
export function createProjectile(
  source: ProjectileSource,
  x: number,
  y: number,
  angle: number,
  speed: number,
  damage: number,
  options?: {
    piercing?: boolean;
    color?: string;
    trailColor?: string;
    life?: number;
    size?: number;
  }
): ProjectileInstance {
  const size = options?.size ?? 3;
  return {
    id: `proj_${_projCounter++}`,
    source,
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    damage,
    width: size,
    height: size,
    piercing: options?.piercing ?? false,
    hitTargets: new Set(),
    life: options?.life ?? 3,
    color: options?.color ?? '#F97316',
    trailColor: options?.trailColor ?? '#FACC15',
    alive: true,
  };
}

/**
 * Spawn shotgun spread (5 pellets).
 */
export function createShotgunSpread(
  x: number,
  y: number,
  baseAngle: number,
  damage: number,
  pelletCount = 5,
  spreadAngle = Math.PI * 0.25
): ProjectileInstance[] {
  const projectiles: ProjectileInstance[] = [];
  const halfSpread = spreadAngle / 2;
  const step = spreadAngle / (pelletCount - 1);

  for (let i = 0; i < pelletCount; i++) {
    const angle = baseAngle - halfSpread + step * i;
    projectiles.push(
      createProjectile('player', x, y, angle, 350, damage, {
        color: '#FACC15',
        trailColor: '#F97316',
        life: 0.4, // short range
        size: 2,
      })
    );
  }
  return projectiles;
}

/**
 * Spawn dual pistol burst (2 rapid shots).
 */
export function createDualPistolBurst(
  x: number,
  y: number,
  angle: number,
  damage: number,
): ProjectileInstance[] {
  return [
    createProjectile('player', x, y - 2, angle, 400, damage, {
      color: '#00F0FF',
      trailColor: '#A855F7',
      size: 2,
    }),
    createProjectile('player', x, y + 2, angle + 0.05, 400, damage, {
      color: '#00F0FF',
      trailColor: '#A855F7',
      size: 2,
    }),
  ];
}

/**
 * Spawn rifle piercing beam.
 */
export function createRifleBeam(
  x: number,
  y: number,
  angle: number,
  damage: number,
): ProjectileInstance {
  return createProjectile('player', x, y, angle, 500, damage, {
    piercing: true,
    color: '#A855F7',
    trailColor: '#00F0FF',
    life: 2,
    size: 4,
  });
}

/**
 * Spawn an enemy orb (slow homing-ish).
 */
export function createEnemyOrb(
  x: number,
  y: number,
  angle: number,
  damage: number,
): ProjectileInstance {
  return createProjectile('enemy', x, y, angle, 120, damage, {
    color: '#A855F7',
    trailColor: '#00F0FF',
    life: 4,
    size: 4,
  });
}

/**
 * Update a projectile. Returns false if it should be removed.
 */
export function updateProjectile(proj: ProjectileInstance, dt: number): boolean {
  if (!proj.alive) return false;

  proj.x += proj.vx * dt;
  proj.y += proj.vy * dt;
  proj.life -= dt;

  if (proj.life <= 0) {
    proj.alive = false;
    return false;
  }

  return true;
}
