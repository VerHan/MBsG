// ============================================================
// RIFTBOUND: SLAYER CORPS — ParticleSystem
// Manages and renders ephemeral visual effects:
// slash trails, muzzle flash, hit sparks, mana dust, etc.
// ============================================================

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;    // remaining lifetime (seconds)
  maxLife: number;
  size: number;
  color: string;
  /** Optional: fade alpha over lifetime */
  fadeAlpha: boolean;
  /** Optional: gravity multiplier */
  gravity: number;
}

type EmitterPreset =
  | 'slash_trail'
  | 'muzzle_flash'
  | 'hit_spark'
  | 'enemy_death'
  | 'mana_dust'
  | 'chest_open'
  | 'pylon_repair'
  | 'dash_afterimage'
  | 'damage_number'
  | 'explosion';

const PRESET_CONFIGS: Record<EmitterPreset, {
  count: number;
  color: string | string[];
  size: [number, number];
  speed: [number, number];
  life: [number, number];
  gravity: number;
  spread: number; // radians (Math.PI = full half circle)
  fadeAlpha: boolean;
}> = {
  slash_trail: {
    count: 6, color: ['#F97316', '#FACC15'], size: [1, 3], speed: [30, 80],
    life: [0.1, 0.25], gravity: 0, spread: Math.PI * 0.3, fadeAlpha: true,
  },
  muzzle_flash: {
    count: 4, color: ['#FACC15', '#FF6B35'], size: [1, 2], speed: [60, 120],
    life: [0.05, 0.12], gravity: 0, spread: Math.PI * 0.2, fadeAlpha: true,
  },
  hit_spark: {
    count: 8, color: ['#FACC15', '#F97316', '#FFFFFF'], size: [1, 2], speed: [50, 150],
    life: [0.1, 0.3], gravity: 200, spread: Math.PI, fadeAlpha: true,
  },
  enemy_death: {
    count: 15, color: ['#A855F7', '#00F0FF', '#2B2F3A'], size: [2, 4], speed: [40, 120],
    life: [0.2, 0.6], gravity: 150, spread: Math.PI, fadeAlpha: true,
  },
  mana_dust: {
    count: 3, color: ['#00F0FF', '#A855F7'], size: [1, 2], speed: [5, 20],
    life: [0.5, 1.5], gravity: -15, spread: Math.PI, fadeAlpha: true,
  },
  chest_open: {
    count: 20, color: ['#FACC15', '#22C55E', '#FFFFFF'], size: [1, 3], speed: [30, 100],
    life: [0.3, 0.8], gravity: 80, spread: Math.PI, fadeAlpha: true,
  },
  pylon_repair: {
    count: 10, color: ['#00F0FF', '#22C55E'], size: [1, 3], speed: [20, 60],
    life: [0.3, 0.6], gravity: -30, spread: Math.PI, fadeAlpha: true,
  },
  dash_afterimage: {
    count: 2, color: ['#F97316'], size: [2, 4], speed: [0, 5],
    life: [0.1, 0.2], gravity: 0, spread: 0, fadeAlpha: true,
  },
  damage_number: {
    count: 1, color: ['#FFFFFF'], size: [1, 1], speed: [20, 40],
    life: [0.6, 0.8], gravity: -50, spread: Math.PI * 0.1, fadeAlpha: true,
  },
  explosion: {
    count: 25, color: ['#FF3B3B', '#F97316', '#FACC15'], size: [2, 5], speed: [60, 200],
    life: [0.2, 0.5], gravity: 100, spread: Math.PI, fadeAlpha: true,
  },
};

export class ParticleSystem {
  private _particles: Particle[] = [];
  private _pool: Particle[] = []; // object pool to reduce GC

  /** Emit particles at a position with a direction angle (radians) */
  emit(preset: EmitterPreset, x: number, y: number, angle = 0) {
    const cfg = PRESET_CONFIGS[preset];
    const colors = Array.isArray(cfg.color) ? cfg.color : [cfg.color];

    for (let i = 0; i < cfg.count; i++) {
      const p = this._pool.pop() ?? ({} as Particle);
      const a = angle + (Math.random() - 0.5) * cfg.spread * 2;
      const spd = cfg.speed[0] + Math.random() * (cfg.speed[1] - cfg.speed[0]);
      const life = cfg.life[0] + Math.random() * (cfg.life[1] - cfg.life[0]);

      p.x = x;
      p.y = y;
      p.vx = Math.cos(a) * spd;
      p.vy = Math.sin(a) * spd;
      p.life = life;
      p.maxLife = life;
      p.size = cfg.size[0] + Math.random() * (cfg.size[1] - cfg.size[0]);
      p.color = colors[Math.floor(Math.random() * colors.length)];
      p.fadeAlpha = cfg.fadeAlpha;
      p.gravity = cfg.gravity;

      this._particles.push(p);
    }
  }

  /** Update all particles */
  update(dt: number) {
    for (let i = this._particles.length - 1; i >= 0; i--) {
      const p = this._particles[i];
      p.life -= dt;

      if (p.life <= 0) {
        // Return to pool
        this._pool.push(p);
        this._particles.splice(i, 1);
        continue;
      }

      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  /** Render all particles */
  render(ctx: CanvasRenderingContext2D) {
    for (const p of this._particles) {
      const alpha = p.fadeAlpha ? Math.max(0, p.life / p.maxLife) : 1;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      const s = Math.round(p.size);
      ctx.fillRect(Math.round(p.x), Math.round(p.y), s, s);
    }
    ctx.globalAlpha = 1;
  }

  /** Clear all particles (e.g. on segment transition) */
  clear() {
    this._pool.push(...this._particles);
    this._particles.length = 0;
  }

  get count() {
    return this._particles.length;
  }
}
