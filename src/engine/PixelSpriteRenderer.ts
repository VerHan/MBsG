// ============================================================
// RIFTBOUND: SLAYER CORPS — PixelSpriteRenderer
// Side-profile multi-pose pixel-art sprites for MC (idle,
// 4-frame run, jump-up, fall, wall-slide, attack-lunge),
// armored right-hand gauntlet + 7 held weapons, enemies, props.
// ============================================================

import type { WeaponId } from '../types';

export interface SpriteFrame {
  canvas: OffscreenCanvas;
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
}

export interface SpritePalette {
  primary: string;
  secondary: string;
  visor: string;
  glow: string;
  skin?: string;
}

export type PixelKey = 'P' | 'S' | 'V' | 'G' | 'K' | 'B' | null;

const KEY_TO_PALETTE: Record<string, keyof SpritePalette | 'black'> = {
  P: 'primary',
  S: 'secondary',
  V: 'visor',
  G: 'glow',
  K: 'skin',
  B: 'black',
};

const PIXEL_SCALE = 1;

export class PixelSpriteRenderer {
  private _cache = new Map<string, SpriteFrame>();

  render(
    key: string,
    matrix: PixelKey[][],
    palette: SpritePalette,
    scale = PIXEL_SCALE,
    flashWhite = false
  ): SpriteFrame {
    const cacheKey = flashWhite ? `${key}__white` : key;
    const cached = this._cache.get(cacheKey);
    if (cached) return cached;

    const rows = matrix.length;
    const cols = matrix[0].length;
    const w = cols * scale;
    const h = rows * scale;

    const offscreen = new OffscreenCanvas(w, h);
    const ctx = offscreen.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const px = matrix[r][c];
        if (px === null) continue;

        if (flashWhite) {
          ctx.fillStyle = '#FFFFFF';
        } else {
          const palKey = KEY_TO_PALETTE[px];
          ctx.fillStyle =
            palKey === 'black'
              ? '#0B0D14'
              : (palette[palKey as keyof SpritePalette] ?? '#FF00FF');
        }

        ctx.fillRect(c * scale, r * scale, scale, scale);
      }
    }

    const frame: SpriteFrame = {
      canvas: offscreen,
      width: w,
      height: h,
      anchorX: Math.floor(w / 2),
      anchorY: h,
    };

    this._cache.set(cacheKey, frame);
    return frame;
  }

  draw(
    ctx: CanvasRenderingContext2D,
    frame: SpriteFrame,
    x: number,
    y: number,
    flipX = false,
    scaleX = 1,
    scaleY = 1
  ) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(flipX ? -scaleX : scaleX, scaleY);
    ctx.drawImage(frame.canvas, -frame.anchorX, -frame.height);
    ctx.restore();
  }

  invalidate(keyPrefix?: string) {
    if (keyPrefix) {
      for (const k of this._cache.keys()) {
        if (k.startsWith(keyPrefix)) this._cache.delete(k);
      }
    } else {
      this._cache.clear();
    }
  }
}

// ── SIDE-PROFILE MC UPPER BODY (16x16, Facing Right) ────────
const MC_SIDE_UPPER: PixelKey[][] = [
  [null,null,null,null,null, 'B', 'B', 'B', 'B', 'B', 'B',null,null,null,null,null], // 0
  [null,null,null,null, 'B', 'P', 'P', 'P', 'P', 'P', 'P', 'B',null,null,null,null], // 1
  [null,null,null, 'B', 'P', 'P', 'S', 'S', 'S', 'P', 'P', 'P', 'B',null,null,null], // 2
  [null,null,null, 'B', 'P', 'S', 'S', 'P', 'B', 'B', 'B', 'B', 'B',null,null,null], // 3
  [null,null,null, 'B', 'P', 'P', 'B', 'B', 'V', 'V', 'V', 'V', 'V', 'B',null,null], // 4 visor
  [null,null,null, 'B', 'P', 'P', 'B', 'V', 'V', 'G', 'G', 'V', 'V', 'B',null,null], // 5 visor glow
  [null,null,null, 'B', 'P', 'S', 'B', 'B', 'B', 'B', 'B', 'B', 'B',null,null,null], // 6
  [null,null,null,null, 'B', 'P', 'S', 'S', 'G', 'S', 'G', 'P', 'B',null,null,null], // 7 respirator
  [null,null,null,null, 'B', 'S', 'S', 'S', 'S', 'S', 'S', 'B',null,null,null,null], // 8 neck
  [null,null,null, 'B', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'B',null,null,null], // 9
  [null,null, 'B', 'P', 'P', 'S', 'S', 'P', 'P', 'G', 'G', 'P', 'B',null,null,null], // 10 pauldron
  [null,null, 'B', 'P', 'S', 'S', 'P', 'P', 'P', 'G', 'G', 'P', 'B',null,null,null], // 11 chest core
  [null,null, 'B', 'P', 'P', 'S', 'S', 'P', 'P', 'P', 'P', 'B',null,null,null,null], // 12
  [null,null,null, 'B', 'P', 'P', 'S', 'S', 'P', 'P', 'B',null,null,null,null,null], // 13
  [null,null,null, 'B', 'S', 'S', 'B', 'G', 'G', 'B', 'S', 'B',null,null,null,null], // 14 belt
  [null,null,null, 'B', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'B',null,null,null,null], // 15
];

const EMPTY_ROW: PixelKey[] = Array(16).fill(null);

function shiftRowRight(row: PixelKey[], px: number): PixelKey[] {
  if (px <= 0) return row;
  return [...Array(px).fill(null), ...row.slice(0, 16 - px)];
}

// 1. IDLE (16x24)
export const MC_IDLE: PixelKey[][] = [
  ...MC_SIDE_UPPER,
  [null,null,null, 'B', 'S', 'S', 'B', 'B', 'P', 'P', 'P', 'B',null,null,null,null],
  [null,null,null, 'B', 'S', 'S', 'B', 'B', 'P', 'P', 'P', 'B',null,null,null,null],
  [null,null,null, 'B', 'S', 'B',null,null, 'B', 'P', 'P', 'B',null,null,null,null],
  [null,null,null, 'B', 'S', 'B',null,null, 'B', 'S', 'S', 'B',null,null,null,null],
  [null,null,null, 'B', 'S', 'S', 'B',null, 'B', 'P', 'P', 'B',null,null,null,null],
  [null,null,null, 'B', 'S', 'S', 'B',null, 'B', 'P', 'P', 'P', 'B',null,null,null],
  [null,null, 'B', 'S', 'S', 'S', 'B',null, 'B', 'S', 'S', 'S', 'B',null,null,null],
  [null,null, 'B', 'B', 'B', 'B', 'B',null, 'B', 'B', 'B', 'B', 'B',null,null,null],
];

// 2. RUN FRAME 1 — Wide stride, front leg (P) forward, back leg (S) trailing, 1px bob down
export const MC_RUN_1: PixelKey[][] = [
  EMPTY_ROW,
  ...MC_SIDE_UPPER.slice(0, 15).map((r) => shiftRowRight(r, 1)),
  [null,null, 'B', 'S', 'S', 'B',null,null, 'B', 'P', 'P', 'P', 'B',null,null,null],
  [null, 'B', 'S', 'S', 'B',null,null,null,null, 'B', 'P', 'P', 'P', 'B',null,null],
  [ 'B', 'S', 'S', 'B',null,null,null,null,null,null, 'B', 'S', 'S', 'B',null,null],
  [ 'B', 'S', 'B',null,null,null,null,null,null,null, 'B', 'P', 'P', 'B',null,null],
  [ 'B', 'S', 'S', 'B',null,null,null,null,null,null,null, 'B', 'P', 'P', 'B',null],
  [ 'B', 'S', 'B',null,null,null,null,null,null,null,null, 'B', 'S', 'S', 'B',null],
  [null, 'B', 'B',null,null,null,null,null,null,null,null, 'B', 'B', 'B', 'B',null],
  [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
];

//Wait: keep boots touching row 23 on run 1 & 3 so MC never floats!
MC_RUN_1[22] = [ 'B', 'S', 'B',null,null,null,null,null,null,null,null, 'B', 'P', 'P', 'B',null];
MC_RUN_1[23] = [null, 'B', 'B',null,null,null,null,null,null,null,null, 'B', 'B', 'B', 'B',null];

// 3. RUN FRAME 2 — Passing stride (body up, back leg lifted)
export const MC_RUN_2: PixelKey[][] = [
  ...MC_SIDE_UPPER,
  [null,null,null,null, 'B', 'S', 'S', 'P', 'P', 'B',null,null,null,null,null,null],
  [null,null,null,null, 'B', 'S', 'B', 'P', 'P', 'P', 'B',null,null,null,null,null],
  [null,null,null, 'B', 'S', 'B',null, 'B', 'P', 'P', 'B',null,null,null,null,null],
  [null,null, 'B', 'S', 'B',null,null, 'B', 'S', 'S', 'B',null,null,null,null,null],
  [null,null, 'B', 'B',null,null,null, 'B', 'P', 'P', 'B',null,null,null,null,null],
  [null,null,null,null,null,null,null, 'B', 'P', 'P', 'P', 'B',null,null,null,null],
  [null,null,null,null,null,null,null, 'B', 'S', 'S', 'S', 'B',null,null,null,null],
  [null,null,null,null,null,null,null, 'B', 'B', 'B', 'B', 'B',null,null,null,null],
];

// 4. RUN FRAME 3 — Opposite stride (dark leg forward, bright leg back), 1px bob down
export const MC_RUN_3: PixelKey[][] = [
  EMPTY_ROW,
  ...MC_SIDE_UPPER.slice(0, 15).map((r) => shiftRowRight(r, 1)),
  [null,null, 'B', 'P', 'P', 'B',null,null, 'B', 'S', 'S', 'S', 'B',null,null,null],
  [null, 'B', 'P', 'P', 'B',null,null,null,null, 'B', 'S', 'S', 'S', 'B',null,null],
  [ 'B', 'P', 'P', 'B',null,null,null,null,null,null, 'B', 'S', 'S', 'B',null,null],
  [ 'B', 'P', 'B',null,null,null,null,null,null,null, 'B', 'S', 'S', 'B',null,null],
  [ 'B', 'P', 'P', 'B',null,null,null,null,null,null,null, 'B', 'S', 'S', 'B',null],
  [ 'B', 'S', 'S', 'B',null,null,null,null,null,null,null, 'B', 'S', 'S', 'B',null],
  [ 'B', 'B', 'B',null,null,null,null,null,null,null,null, 'B', 'S', 'S', 'B',null],
  [null,null,null,null,null,null,null,null,null,null,null, 'B', 'B', 'B', 'B',null],
];

// 5. RUN FRAME 4 — Opposite passing stride (front knee tucked up)
export const MC_RUN_4: PixelKey[][] = [
  ...MC_SIDE_UPPER,
  [null,null,null,null, 'B', 'P', 'P', 'S', 'S', 'B',null,null,null,null,null,null],
  [null,null,null,null, 'B', 'P', 'P', 'B', 'S', 'S', 'B',null,null,null,null,null],
  [null,null,null,null, 'B', 'P', 'B',null, 'B', 'S', 'S', 'P', 'B',null,null,null],
  [null,null,null,null, 'B', 'S', 'B',null,null, 'B', 'S', 'B',null,null,null,null],
  [null,null,null,null, 'B', 'P', 'B',null,null,null, 'B', 'B',null,null,null,null],
  [null,null,null,null, 'B', 'P', 'P', 'B',null,null,null,null,null,null,null,null],
  [null,null,null,null, 'B', 'S', 'S', 'B',null,null,null,null,null,null,null,null],
  [null,null,null,null, 'B', 'B', 'B', 'B',null,null,null,null,null,null,null,null],
];

// 6. JUMP UP — Rising knee-tuck pose (aligned to bottom)
export const MC_JUMP_UP: PixelKey[][] = [
  ...MC_SIDE_UPPER.map((r) => shiftRowRight(r, 1)),
  [null,null,null, 'B', 'S', 'S', 'B',null, 'B', 'P', 'P', 'P', 'B',null,null,null],
  [null,null, 'B', 'S', 'S', 'B',null,null,null, 'B', 'P', 'P', 'P', 'B',null,null],
  [null,null, 'B', 'S', 'B',null,null,null,null, 'B', 'S', 'S', 'B',null,null,null],
  [null, 'B', 'S', 'B',null,null,null,null,null, 'B', 'P', 'P', 'B',null,null,null],
  [null, 'B', 'S', 'S', 'B',null,null,null,null, 'B', 'B', 'B',null,null,null,null],
  [null, 'B', 'S', 'B',null,null,null,null,null,null,null,null,null,null,null,null],
  [null, 'B', 'B',null,null,null,null,null,null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
];

// 7. FALL — Descending landing pose (legs braced downward)
export const MC_FALL: PixelKey[][] = [
  ...MC_SIDE_UPPER,
  [null,null, 'B', 'S', 'S', 'B',null, 'B', 'P', 'P', 'B',null,null,null,null,null],
  [null,null, 'B', 'S', 'B',null,null, 'B', 'P', 'P', 'P', 'B',null,null,null,null],
  [null, 'B', 'S', 'B',null,null,null,null, 'B', 'S', 'S', 'B',null,null,null,null],
  [null, 'B', 'S', 'S', 'B',null,null,null, 'B', 'P', 'P', 'B',null,null,null,null],
  [ 'B', 'S', 'S', 'B',null,null,null,null, 'B', 'P', 'P', 'P', 'B',null,null,null],
  [ 'B', 'B', 'B',null,null,null,null,null, 'B', 'S', 'S', 'S', 'B',null,null,null],
  [null,null,null,null,null,null,null,null, 'B', 'B', 'B', 'B', 'B',null,null,null],
  [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
];

// 8. WALL SLIDE — Pressed against wall
export const MC_WALL_SLIDE: PixelKey[][] = [
  ...MC_SIDE_UPPER,
  [null,null,null, 'B', 'S', 'S', 'B', 'B', 'P', 'P', 'B',null,null,null,null,null],
  [null,null,null, 'B', 'S', 'B',null, 'B', 'P', 'P', 'P', 'B',null,null,null,null],
  [null,null,null, 'B', 'S', 'B',null,null, 'B', 'P', 'B',null,null,null,null,null],
  [null,null,null, 'B', 'S', 'S', 'B',null, 'B', 'S', 'B',null,null,null,null,null],
  [null,null,null, 'B', 'S', 'B',null,null, 'B', 'P', 'P', 'B',null,null,null,null],
  [null,null,null, 'B', 'S', 'B',null,null, 'B', 'S', 'S', 'B',null,null,null,null],
  [null,null, 'B', 'S', 'S', 'B',null,null, 'B', 'B', 'B',null,null,null,null,null],
  [null,null, 'B', 'B', 'B',null,null,null,null,null,null,null,null,null,null,null],
];

// 9. ATTACK LUNGE — Leaning forward during melee swing (boots anchored on row 23)
export const MC_ATTACK: PixelKey[][] = [
  EMPTY_ROW,
  ...MC_SIDE_UPPER.slice(0, 15).map((r) => shiftRowRight(r, 2)),
  [null,null, 'B', 'S', 'S', 'B',null,null,null, 'B', 'P', 'P', 'P', 'B',null,null],
  [null, 'B', 'S', 'S', 'B',null,null,null,null,null, 'B', 'P', 'P', 'P', 'B',null],
  [ 'B', 'S', 'S', 'B',null,null,null,null,null,null,null, 'B', 'S', 'S', 'B',null],
  [ 'B', 'S', 'B',null,null,null,null,null,null,null,null, 'B', 'P', 'P', 'B',null],
  [ 'B', 'S', 'S', 'B',null,null,null,null,null,null,null, 'B', 'P', 'P', 'B',null],
  [ 'B', 'S', 'S', 'B',null,null,null,null,null,null,null, 'B', 'P', 'P', 'B',null],
  [ 'B', 'S', 'S', 'B',null,null,null,null,null,null,null, 'B', 'S', 'S', 'B',null],
  [ 'B', 'B', 'B',null,null,null,null,null,null,null,null, 'B', 'B', 'B', 'B',null],
];

// ── RIGHT-HAND ARMORED GAUNTLET + WEAPON RENDERER ───────────
export function drawWeaponInHand(
  ctx: CanvasRenderingContext2D,
  weaponId: WeaponId,
  shoulderX: number,
  shoulderY: number,
  facingRight: boolean,
  palette: SpritePalette,
  swingProgress: number, // 0 = idle, 0..1 = swinging
  comboStep = 0,
  isPogo = false,
  recoil = 0
) {
  ctx.save();
  ctx.translate(Math.round(shoulderX), Math.round(shoulderY));
  if (!facingRight) ctx.scale(-1, 1);

  // Rotate the entire right arm + weapon during melee swing!
  if (swingProgress > 0) {
    if (isPogo) {
      // Point downward & sweep underneath MC
      ctx.rotate(Math.PI * 0.5 + (-0.9 + swingProgress * 1.8));
    } else if (comboStep % 2 === 1) {
      // Reverse upward slash
      ctx.rotate(1.1 - swingProgress * 2.4);
    } else {
      // Overhead downward cleave
      ctx.rotate(-1.35 + swingProgress * 2.5);
    }
  } else {
    // Ready combat angle depending on melee vs ranged
    const isGun =
      weaponId === 'pistol' ||
      weaponId === 'dual_pistol' ||
      weaponId === 'shotgun' ||
      weaponId === 'rifle';
    ctx.translate(-recoil, 0);
    ctx.rotate(isGun ? 0 : -0.35);
  }

  // Draw Armored Forearm & Right Gauntlet holding the weapon
  ctx.fillStyle = '#0B0D14';
  ctx.fillRect(0, -2, 7, 5);
  ctx.fillStyle = palette.primary;
  ctx.fillRect(1, -1, 5, 3);
  ctx.fillStyle = palette.glow;
  ctx.fillRect(3, -1, 1, 3); // wrist energy trim
  ctx.fillStyle = palette.secondary;
  ctx.fillRect(5, -1, 2, 3); // clenched gauntlet fist

  // Hand grip point is at (6, 0)
  ctx.translate(6, 0);

  switch (weaponId) {
    case 'sword':
      // Crossguard + long glowing blade extending forward
      ctx.fillStyle = '#0B0D14';
      ctx.fillRect(-1, -4, 3, 8);
      ctx.fillStyle = '#FACC15';
      ctx.fillRect(0, -3, 2, 6);
      ctx.fillStyle = '#E2E8F0';
      ctx.fillRect(2, -1, 14, 2);
      ctx.fillStyle = '#F97316';
      ctx.fillRect(3, 0, 11, 1);
      break;

    case 'dual_sword':
      // Twin cyber-cyan blades
      ctx.fillStyle = '#A855F7';
      ctx.fillRect(0, -3, 2, 6);
      ctx.fillStyle = '#00F0FF';
      ctx.fillRect(2, -2, 12, 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(4, -2, 9, 1);
      ctx.fillStyle = '#94A3B8';
      ctx.fillRect(1, 2, 10, 1);
      break;

    case 'axe':
      // Heavy pole + crimson battleaxe head
      ctx.fillStyle = '#78350F';
      ctx.fillRect(-1, -1, 14, 2);
      ctx.fillStyle = '#94A3B8';
      ctx.fillRect(9, -6, 5, 11);
      ctx.fillStyle = '#EF4444';
      ctx.fillRect(13, -5, 2, 9);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(14, -4, 1, 7);
      break;

    case 'pistol':
      ctx.fillStyle = '#0B0D14';
      ctx.fillRect(-1, -3, 10, 5);
      ctx.fillStyle = '#475569';
      ctx.fillRect(0, -2, 8, 3);
      ctx.fillStyle = '#F97316';
      ctx.fillRect(6, -2, 2, 2);
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(0, 1, 3, 2);
      break;

    case 'dual_pistol':
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(0, -3, 9, 3);
      ctx.fillRect(-2, 1, 8, 2);
      ctx.fillStyle = '#00F0FF';
      ctx.fillRect(7, -3, 2, 2);
      ctx.fillRect(4, 1, 2, 1);
      break;

    case 'shotgun':
      ctx.fillStyle = '#0B0D14';
      ctx.fillRect(-2, -3, 15, 5);
      ctx.fillStyle = '#64748B';
      ctx.fillRect(-1, -2, 13, 3);
      ctx.fillStyle = '#FACC15';
      ctx.fillRect(10, -2, 2, 2);
      ctx.fillStyle = '#78350F';
      ctx.fillRect(-2, 0, 4, 2);
      break;

    case 'rifle':
      ctx.fillStyle = '#0B0D14';
      ctx.fillRect(-2, -3, 18, 4);
      ctx.fillStyle = '#312E81';
      ctx.fillRect(-1, -2, 16, 2);
      ctx.fillStyle = '#00F0FF';
      ctx.fillRect(4, -2, 9, 1);
      ctx.fillStyle = '#A855F7';
      ctx.fillRect(14, -2, 2, 2);
      break;
  }

  ctx.restore();
}

// ── ENCRYPTED CHEST (16x12) ─────────────────────────────────
export const CHEST_SPRITE: PixelKey[][] = [
  [null, 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B',null],
  [ 'B', 'P', 'P', 'P', 'S', 'S', 'S', 'G', 'G', 'S', 'S', 'S', 'P', 'P', 'P', 'B'],
  [ 'B', 'P', 'S', 'S', 'S', 'P', 'P', 'G', 'G', 'P', 'P', 'S', 'S', 'S', 'P', 'B'],
  [ 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B'],
  [ 'B', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'B'],
  [ 'B', 'P', 'S', 'S', 'P', 'P', 'B', 'V', 'V', 'B', 'P', 'P', 'S', 'S', 'P', 'B'],
  [ 'B', 'P', 'S', 'S', 'P', 'B', 'V', 'G', 'G', 'V', 'B', 'P', 'S', 'S', 'P', 'B'],
  [ 'B', 'P', 'S', 'S', 'P', 'P', 'B', 'V', 'V', 'B', 'P', 'P', 'S', 'S', 'P', 'B'],
  [ 'B', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'B'],
  [ 'B', 'P', 'S', 'P', 'S', 'P', 'S', 'P', 'P', 'S', 'P', 'S', 'P', 'S', 'P', 'B'],
  [ 'B', 'S', 'P', 'S', 'P', 'S', 'P', 'S', 'S', 'P', 'S', 'P', 'S', 'P', 'S', 'B'],
  [null, 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B',null],
];

// ── MANA HUSK (2-frame walk) ────────────────────────────────
export const MANA_HUSK_SPRITE: PixelKey[][] = [
  [null,null,null,null, 'B', 'B', 'B', 'B', 'B', 'B',null,null,null,null],
  [null,null,null, 'B', 'P', 'P', 'S', 'S', 'P', 'P', 'B',null,null,null],
  [null,null, 'B', 'P', 'B', 'V', 'V', 'B', 'V', 'V', 'P', 'B',null,null],
  [null,null, 'B', 'P', 'P', 'S', 'G', 'S', 'S', 'P', 'P', 'B',null,null],
  [null,null,null, 'B', 'S', 'B', 'S', 'B', 'S', 'B',null,null,null,null],
  [null,null, 'B', 'P', 'P', 'P', 'G', 'P', 'P', 'P', 'B',null,null,null],
  [null, 'B', 'P', 'S', 'P', 'G', 'V', 'G', 'P', 'S', 'P', 'B',null,null],
  [null, 'B', 'P', 'B', 'P', 'P', 'G', 'P', 'P', 'B', 'P', 'B',null,null],
  [null, 'B', 'S', 'B', 'S', 'P', 'P', 'P', 'S', 'B', 'S', 'B',null,null],
  [null,null, 'B',null, 'B', 'S', 'S', 'S', 'B',null, 'B',null,null,null],
  [null,null,null,null, 'B', 'P', 'B', 'P', 'B',null,null,null,null,null],
  [null,null,null, 'B', 'P', 'P', 'B', 'P', 'P', 'B',null,null,null,null],
  [null,null,null, 'B', 'S', 'S', 'B', 'S', 'S', 'B',null,null,null,null],
  [null,null,null, 'B', 'P', 'B',null, 'B', 'P', 'B',null,null,null,null],
  [null,null, 'B', 'S', 'S', 'B',null, 'B', 'S', 'S', 'B',null,null,null],
  [null,null, 'B', 'B', 'B', 'B',null, 'B', 'B', 'B', 'B',null,null,null],
];

export const MANA_HUSK_WALK: PixelKey[][] = [
  ...MANA_HUSK_SPRITE.slice(0, 12),
  [null,null, 'B', 'S', 'S', 'B',null,null, 'B', 'S', 'S', 'B',null,null],
  [null, 'B', 'P', 'P', 'B',null,null,null,null, 'B', 'P', 'P', 'B',null],
  [null, 'B', 'S', 'B',null,null,null,null,null,null, 'B', 'S', 'B',null],
  [null, 'B', 'B',null,null,null,null,null,null,null,null, 'B', 'B',null],
];

// ── RIFT DRONE (12x10) ──────────────────────────────────────
export const RIFT_DRONE_SPRITE: PixelKey[][] = [
  [null,null,null, 'B', 'G', 'B', 'B', 'G', 'B',null,null,null],
  [null,null, 'B', 'S', 'S', 'P', 'P', 'S', 'S', 'B',null,null],
  [null, 'B', 'P', 'P', 'B', 'V', 'V', 'B', 'P', 'P', 'B',null],
  [ 'B', 'S', 'P', 'B', 'V', 'G', 'G', 'V', 'B', 'P', 'S', 'B'],
  [ 'B', 'S', 'P', 'B', 'V', 'G', 'G', 'V', 'B', 'P', 'S', 'B'],
  [null, 'B', 'P', 'P', 'B', 'V', 'V', 'B', 'P', 'P', 'B',null],
  [null,null, 'B', 'S', 'P', 'P', 'P', 'P', 'S', 'B',null,null],
  [null,null,null, 'B', 'S', 'B', 'B', 'S', 'B',null,null,null],
  [null,null,null,null, 'G',null,null, 'G',null,null,null,null],
  [null,null,null,null, 'V',null,null, 'V',null,null,null,null],
];

// ── ANCIENT SEAL PYLON (20x15 scaled 2x) ────────────────────
export const PYLON_SPRITE: PixelKey[][] = [
  [null,null,null,null,null,null,null,null, 'G', 'G', 'G', 'G',null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null, 'G', 'V', 'V', 'V', 'V', 'G',null,null,null,null,null,null,null],
  [null,null,null,null,null,null, 'B', 'G', 'V', 'G', 'G', 'V', 'G', 'B',null,null,null,null,null,null],
  [null,null,null,null,null,null, 'B', 'P', 'B', 'V', 'V', 'B', 'P', 'B',null,null,null,null,null,null],
  [null,null,null,null,null, 'B', 'P', 'S', 'P', 'G', 'G', 'P', 'S', 'P', 'B',null,null,null,null,null],
  [null,null,null,null,null, 'B', 'P', 'P', 'B', 'V', 'V', 'B', 'P', 'P', 'B',null,null,null,null,null],
  [null,null,null,null, 'B', 'S', 'P', 'P', 'B', 'G', 'G', 'B', 'P', 'P', 'S', 'B',null,null,null,null],
  [null,null,null,null, 'B', 'S', 'P', 'S', 'P', 'V', 'V', 'P', 'S', 'P', 'S', 'B',null,null,null,null],
  [null,null,null,null, 'B', 'P', 'P', 'S', 'P', 'G', 'G', 'P', 'S', 'P', 'P', 'B',null,null,null,null],
  [null,null,null, 'B', 'S', 'P', 'P', 'P', 'B', 'V', 'V', 'B', 'P', 'P', 'P', 'S', 'B',null,null,null],
  [null,null,null, 'B', 'S', 'S', 'P', 'P', 'B', 'G', 'G', 'B', 'P', 'P', 'S', 'S', 'B',null,null,null],
  [null,null, 'B', 'S', 'P', 'P', 'S', 'P', 'P', 'V', 'V', 'P', 'P', 'S', 'P', 'P', 'S', 'B',null,null],
  [null, 'B', 'S', 'P', 'P', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'P', 'P', 'S', 'B',null],
  [ 'B', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'B'],
  [ 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B'],
];

export const ENEMY_PALETTES: Record<string, SpritePalette> = {
  mana_husk: {
    primary: '#3B2D4A',
    secondary: '#241B2E',
    visor: '#A855F7',
    glow: '#00F0FF',
  },
  rift_drone: {
    primary: '#2B2F3A',
    secondary: '#161B29',
    visor: '#00F0FF',
    glow: '#A855F7',
  },
  corrupted_sentinel: {
    primary: '#4A3F35',
    secondary: '#2B2F3A',
    visor: '#EF4444',
    glow: '#F97316',
  },
  mana_stalker: {
    primary: '#1E1B4B',
    secondary: '#0F172A',
    visor: '#22C55E',
    glow: '#00F0FF',
  },
  rift_brute: {
    primary: '#451A2B',
    secondary: '#260E18',
    visor: '#FACC15',
    glow: '#EF4444',
  },
  pylon: {
    primary: '#2B2F3A',
    secondary: '#1E293B',
    visor: '#00F0FF',
    glow: '#A855F7',
  },
  chest_common: {
    primary: '#4A3F35',
    secondary: '#2B2F3A',
    visor: '#FACC15',
    glow: '#F97316',
  },
  chest_rare: {
    primary: '#1E3A5F',
    secondary: '#161B29',
    visor: '#00F0FF',
    glow: '#FACC15',
  },
  chest_epic: {
    primary: '#3B1D5A',
    secondary: '#161B29',
    visor: '#A855F7',
    glow: '#FACC15',
  },
};
