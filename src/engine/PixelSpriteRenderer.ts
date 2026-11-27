// ============================================================
// RIFTBOUND: SLAYER CORPS — PixelSpriteRenderer
// Articulated Complex Multi-Part Slayer Avatar (4 distinct Helmets,
// Chestplates, Thrusters/Halo/Cowl accessories, Flowing 2-Layer Cloak,
// Kinematic Legs, Off-Hand Aegis Shield + Off-Blade, 8 Weapons),
// 7 Distinct Enemies & 3 Bosses.
// ============================================================

import type { ArmorId, BossId, EnemyId, WeaponId } from '../types';

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

// ── 4 COMPLEX HELMET MATRICES (16x13, Facing Right) ──────────

// 1. Recruit Mk.I — Sculpted tactical comms helm + brow crest + respirator
const HELM_RECRUIT: PixelKey[][] = [
  [null,null,null, 'B', 'G', 'B',null,null,null,null,null,null,null,null,null,null], // comms fin
  [null,null,null, 'B', 'P', 'B', 'B', 'B', 'B', 'B',null,null,null,null,null,null],
  [null,null, 'B', 'P', 'P', 'P', 'S', 'S', 'P', 'P', 'B',null,null,null,null,null],
  [null, 'B', 'P', 'P', 'S', 'P', 'P', 'S', 'S', 'P', 'P', 'B',null,null,null,null],
  [null, 'B', 'P', 'S', 'P', 'P', 'B', 'B', 'B', 'B', 'B', 'B', 'B',null,null,null],
  [null, 'B', 'P', 'P', 'B', 'B', 'V', 'V', 'V', 'V', 'G', 'V', 'B',null,null,null],
  [null, 'B', 'S', 'P', 'B', 'V', 'V', 'V', 'G', 'G', 'V', 'V', 'V', 'B',null,null],
  [null, 'B', 'P', 'S', 'B', 'B', 'V', 'V', 'V', 'V', 'V', 'B', 'B',null,null,null],
  [null, 'B', 'S', 'P', 'S', 'B', 'B', 'B', 'B', 'B', 'B', 'B',null,null,null,null],
  [null,null, 'B', 'P', 'S', 'P', 'S', 'B', 'G', 'B', 'S', 'B',null,null,null,null], // respirator vents
  [null,null, 'B', 'S', 'S', 'P', 'S', 'S', 'S', 'S', 'S', 'B',null,null,null,null],
  [null,null,null, 'B', 'B', 'S', 'S', 'S', 'S', 'S', 'B',null,null,null,null,null],
  [null,null,null,null, 'B', 'B', 'B', 'B', 'B', 'B',null,null,null,null,null,null],
];

// 2. Vanguard Breach Plate — Heavy Fortress Brow + DOOM Green T-Visor
const HELM_VANGUARD: PixelKey[][] = [
  [null,null,null,null, 'B', 'B', 'B', 'B', 'B', 'B', 'B',null,null,null,null,null],
  [null,null,null, 'B', 'S', 'P', 'P', 'G', 'P', 'P', 'S', 'B',null,null,null,null],
  [null,null, 'B', 'P', 'P', 'S', 'P', 'P', 'S', 'P', 'P', 'P', 'B',null,null,null],
  [null, 'B', 'P', 'S', 'P', 'P', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B',null,null],
  [null, 'B', 'P', 'P', 'B', 'B', 'V', 'V', 'V', 'V', 'V', 'V', 'V', 'B',null,null], // T-visor top bar
  [null, 'B', 'S', 'P', 'B', 'V', 'V', 'G', 'V', 'V', 'V', 'G', 'V', 'B',null,null],
  [null, 'B', 'P', 'P', 'B', 'B', 'B', 'B', 'V', 'V', 'B', 'B', 'B', 'B',null,null], // T-visor stem
  [null, 'B', 'S', 'S', 'P', 'S', 'B', 'B', 'V', 'V', 'B', 'P', 'B',null,null,null],
  [null, 'B', 'P', 'S', 'S', 'P', 'B', 'B', 'V', 'V', 'B', 'S', 'B',null,null,null],
  [null,null, 'B', 'S', 'P', 'S', 'S', 'B', 'B', 'B', 'B', 'B',null,null,null,null],
  [null,null, 'B', 'P', 'S', 'S', 'S', 'S', 'G', 'S', 'S', 'B',null,null,null,null],
  [null,null,null, 'B', 'S', 'S', 'S', 'S', 'S', 'S', 'B',null,null,null,null,null],
  [null,null,null,null, 'B', 'B', 'B', 'B', 'B', 'B',null,null,null,null,null,null],
];

// 3. Rift-Stalker Carapace — Twin Swept Horns + Assassin Cowl + Sharp Optic Slit
const HELM_STALKER: PixelKey[][] = [
  [ 'B', 'B',null,null,null,null,null,null,null,null,null,null,null,null,null,null], // tall swept horn
  [ 'B', 'G', 'B', 'B',null,null, 'B', 'B', 'B', 'B', 'B',null,null,null,null,null],
  [null, 'B', 'P', 'P', 'B', 'B', 'P', 'P', 'S', 'P', 'P', 'B',null,null,null,null],
  [null,null, 'B', 'P', 'P', 'P', 'P', 'P', 'P', 'G', 'P', 'P', 'B',null,null,null],
  [null,null, 'B', 'S', 'P', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B',null,null],
  [null,null, 'B', 'P', 'B', 'V', 'V', 'V', 'G', 'V', 'V', 'V', 'G', 'B',null,null], // razor visor
  [null,null, 'B', 'S', 'B', 'B', 'V', 'V', 'V', 'G', 'G', 'V', 'B',null,null,null],
  [null,null, 'B', 'P', 'S', 'B', 'B', 'B', 'B', 'B', 'B', 'B',null,null,null,null],
  [null,null, 'B', 'S', 'P', 'S', 'P', 'B', 'G', 'P', 'S', 'B',null,null,null,null], // shadow ninja mask
  [null,null,null, 'B', 'S', 'S', 'P', 'P', 'S', 'S', 'B',null,null,null,null,null],
  [null,null,null, 'B', 'S', 'G', 'S', 'S', 'S', 'B',null,null,null,null,null,null],
  [null,null,null,null, 'B', 'S', 'S', 'S', 'B',null,null,null,null,null,null,null],
  [null,null,null,null,null, 'B', 'B', 'B',null,null,null,null,null,null,null,null],
];

// 4. Aether-Forge Praetor — Crowned Dual Horns + Golden Forehead Crest
const HELM_PRAETOR: PixelKey[][] = [
  [ 'B', 'S', 'B',null,null, 'B', 'S', 'S', 'B',null,null, 'B', 'S', 'B',null,null], // curved Praetor horns
  [null, 'B', 'S', 'B',null, 'B', 'S', 'G', 'B',null, 'B', 'S', 'B',null,null,null],
  [null, 'B', 'S', 'P', 'B', 'P', 'S', 'G', 'P', 'B', 'P', 'S', 'B',null,null,null],
  [null,null, 'B', 'P', 'P', 'S', 'P', 'S', 'P', 'S', 'P', 'P', 'B',null,null,null],
  [null,null, 'B', 'P', 'S', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B',null,null,null],
  [null, 'B', 'S', 'P', 'B', 'V', 'V', 'G', 'V', 'V', 'G', 'V', 'V', 'B',null,null],
  [null, 'B', 'P', 'S', 'B', 'B', 'V', 'V', 'G', 'V', 'V', 'V', 'B',null,null,null],
  [null,null, 'B', 'S', 'P', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B',null,null,null],
  [null,null, 'B', 'P', 'S', 'S', 'G', 'S', 'G', 'S', 'S', 'B',null,null,null,null],
  [null,null, 'B', 'S', 'S', 'P', 'S', 'S', 'S', 'P', 'S', 'B',null,null,null,null],
  [null,null,null, 'B', 'S', 'S', 'S', 'G', 'S', 'S', 'B',null,null,null,null,null],
  [null,null,null,null, 'B', 'B', 'S', 'S', 'S', 'B',null,null,null,null,null,null],
  [null,null,null,null,null, 'B', 'B', 'B', 'B',null,null,null,null,null,null,null],
];

const ARMOR_HELMS: Record<ArmorId, PixelKey[][]> = {
  recruit_mk1: HELM_RECRUIT,
  vanguard: HELM_VANGUARD,
  rift_stalker: HELM_STALKER,
  aether_praetor: HELM_PRAETOR,
};

// ── 4 COMPLEX CHESTPLATE MATRICES (16x12, Facing Right) ──────

const CHEST_RECRUIT: PixelKey[][] = [
  [null,null,null, 'B', 'S', 'S', 'S', 'S', 'S', 'S', 'B',null,null,null,null,null],
  [null,null, 'B', 'P', 'P', 'S', 'P', 'P', 'S', 'P', 'P', 'B',null,null,null,null],
  [null, 'B', 'P', 'P', 'P', 'P', 'G', 'G', 'P', 'P', 'P', 'P', 'B',null,null,null], // core slit
  [null, 'B', 'P', 'S', 'P', 'P', 'P', 'V', 'P', 'P', 'S', 'P', 'B',null,null,null],
  [null, 'B', 'P', 'P', 'S', 'P', 'P', 'G', 'P', 'S', 'P', 'P', 'B',null,null,null],
  [null,null, 'B', 'P', 'P', 'S', 'P', 'P', 'P', 'P', 'P', 'B',null,null,null,null],
  [null,null, 'B', 'S', 'P', 'P', 'S', 'S', 'P', 'P', 'S', 'B',null,null,null,null],
  [null,null, 'B', 'P', 'S', 'P', 'P', 'P', 'P', 'S', 'P', 'B',null,null,null,null],
  [null,null,null, 'B', 'S', 'S', 'B', 'G', 'G', 'B', 'S', 'B',null,null,null,null], // belt
  [null,null,null, 'B', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'B',null,null,null,null],
  [null,null,null, 'B', 'P', 'S', 'B',null,null, 'B', 'S', 'P', 'B',null,null,null], // tassets
  [null,null,null,null, 'B', 'B',null,null,null,null, 'B', 'B',null,null,null,null],
];

const CHEST_VANGUARD: PixelKey[][] = [
  [null, 'B', 'B', 'S', 'S', 'P', 'P', 'P', 'P', 'P', 'S', 'S', 'B', 'B',null,null], // towering pauldrons
  [ 'B', 'P', 'P', 'P', 'S', 'P', 'P', 'P', 'P', 'P', 'P', 'S', 'P', 'P', 'B',null],
  [ 'B', 'P', 'G', 'S', 'P', 'P', 'P', 'G', 'G', 'P', 'P', 'P', 'S', 'G', 'P', 'B'],
  [ 'B', 'P', 'P', 'P', 'P', 'S', 'G', 'V', 'V', 'G', 'S', 'P', 'P', 'P', 'B',null],
  [ 'B', 'S', 'P', 'S', 'P', 'P', 'P', 'G', 'G', 'P', 'P', 'P', 'S', 'S', 'B',null],
  [null, 'B', 'B', 'P', 'P', 'S', 'P', 'P', 'P', 'P', 'S', 'P', 'P', 'B',null,null],
  [null,null, 'B', 'P', 'P', 'P', 'S', 'P', 'P', 'S', 'P', 'P', 'B',null,null,null],
  [null,null, 'B', 'S', 'P', 'S', 'P', 'P', 'P', 'P', 'S', 'B',null,null,null,null],
  [null,null, 'B', 'S', 'S', 'B', 'V', 'G', 'V', 'B', 'S', 'S', 'B',null,null,null],
  [null,null, 'B', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'B',null,null,null,null],
  [null,null, 'B', 'P', 'S', 'S', 'B',null,null, 'B', 'S', 'P', 'B',null,null,null],
  [null,null,null, 'B', 'B', 'B',null,null,null,null, 'B', 'B',null,null,null,null],
];

const CHEST_STALKER: PixelKey[][] = [
  [null,null, 'B', 'G', 'B', 'S', 'S', 'S', 'S', 'B', 'G', 'B',null,null,null,null], // upturned assassin collar
  [null, 'B', 'G', 'P', 'P', 'S', 'P', 'P', 'S', 'P', 'P', 'G', 'B',null,null,null],
  [null, 'B', 'P', 'P', 'G', 'P', 'P', 'G', 'P', 'P', 'G', 'P', 'B',null,null,null],
  [null,null, 'B', 'P', 'S', 'G', 'P', 'V', 'G', 'P', 'P', 'B',null,null,null,null],
  [null,null, 'B', 'P', 'P', 'S', 'G', 'P', 'P', 'S', 'P', 'B',null,null,null,null],
  [null,null,null, 'B', 'P', 'P', 'S', 'G', 'P', 'P', 'B',null,null,null,null,null],
  [null,null,null, 'B', 'S', 'P', 'P', 'P', 'S', 'P', 'B',null,null,null,null,null],
  [null,null,null, 'B', 'P', 'S', 'P', 'P', 'P', 'B',null,null,null,null,null,null],
  [null,null,null, 'B', 'S', 'B', 'G', 'G', 'B', 'S', 'B',null,null,null,null,null],
  [null,null,null, 'B', 'S', 'S', 'S', 'S', 'S', 'B',null,null,null,null,null,null],
  [null,null, 'B', 'S', 'P', 'B',null,null,null, 'B', 'P', 'S', 'B',null,null,null],
  [null,null, 'B', 'B',null,null,null,null,null,null,null, 'B', 'B',null,null,null],
];

const CHEST_PRAETOR: PixelKey[][] = [
  [ 'B', 'S', 'B',null, 'B', 'S', 'S', 'S', 'S', 'B',null, 'B', 'S', 'B',null,null], // winged gold pauldrons
  [ 'B', 'S', 'S', 'B', 'P', 'P', 'G', 'G', 'P', 'P', 'B', 'S', 'S', 'B',null,null],
  [ 'B', 'S', 'P', 'P', 'S', 'P', 'G', 'V', 'G', 'P', 'S', 'P', 'P', 'S', 'B',null],
  [null, 'B', 'P', 'P', 'S', 'P', 'V', 'G', 'V', 'P', 'S', 'P', 'P', 'B',null,null],
  [null,null, 'B', 'P', 'S', 'S', 'P', 'G', 'P', 'S', 'S', 'P', 'B',null,null,null],
  [null,null, 'B', 'P', 'P', 'S', 'S', 'P', 'S', 'S', 'P', 'B',null,null,null,null],
  [null,null,null, 'B', 'S', 'P', 'S', 'P', 'S', 'P', 'B',null,null,null,null,null],
  [null,null,null, 'B', 'P', 'S', 'S', 'S', 'S', 'P', 'B',null,null,null,null,null],
  [null,null,null, 'B', 'S', 'S', 'B', 'V', 'V', 'B', 'S', 'B',null,null,null,null],
  [null,null,null, 'B', 'S', 'S', 'S', 'G', 'S', 'S', 'S', 'B',null,null,null,null],
  [null,null, 'B', 'S', 'P', 'S', 'B',null,null, 'B', 'S', 'P', 'S', 'B',null,null],
  [null,null,null, 'B', 'B', 'B',null,null,null,null, 'B', 'B', 'B',null,null,null],
];

const ARMOR_CHESTS: Record<ArmorId, PixelKey[][]> = {
  recruit_mk1: CHEST_RECRUIT,
  vanguard: CHEST_VANGUARD,
  rift_stalker: CHEST_STALKER,
  aether_praetor: CHEST_PRAETOR,
};

export interface AvatarRenderState {
  armorId: ArmorId;
  palette: SpritePalette;
  x: number;
  y: number;
  width: number;
  height: number;
  facingRight: boolean;
  vx: number;
  vy: number;
  onGround: boolean;
  isWallSliding: boolean;
  isDashing: boolean;
  isInvincible: boolean;
  isBlocking: boolean;
  parryFlash: number;
  counterReady: boolean;
  meleeTimer: number;
  meleeDuration: number;
  meleeCombo: number;
  isPogo: boolean;
  rangedTimer: number;
  doubleJumpFlip: number;
  spinAttack: number;
  spinMode?: 'vertical' | 'horizontal';
  walkPhase: number;
  animTime: number;
  scaleX: number;
  scaleY: number;
  meleeWeaponId: WeaponId;
  meleeWeaponLevel: number;
  rangedWeaponId: WeaponId | null;
  rangedWeaponLevel: number;
  hasOffhandShield: boolean;
  iaidoWindup: boolean;
  scarfPoints: Array<{ x: number; y: number }>;
}

function drawLimbSegment(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  thickness: number,
  outlineColor: string,
  fillColor: string
) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = thickness + 2;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();

  ctx.strokeStyle = fillColor;
  ctx.lineWidth = thickness;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

function drawArmoredLeg(
  ctx: CanvasRenderingContext2D,
  hipX: number,
  hipY: number,
  kneeX: number,
  kneeY: number,
  footX: number,
  footY: number,
  thighCol: string,
  shinCol: string,
  kneeCol: string
) {
  drawLimbSegment(ctx, hipX, hipY, kneeX, kneeY, 3, '#0B0D14', thighCol);
  drawLimbSegment(ctx, kneeX, kneeY, footX, footY, 3, '#0B0D14', shinCol);
  // Boot & knee pad highlights
  ctx.fillStyle = kneeCol;
  ctx.fillRect(Math.round(kneeX - 1), Math.round(kneeY - 1), 2, 2);
  ctx.fillStyle = '#0B0D14';
  ctx.fillRect(Math.round(footX - 2), Math.round(footY - 1), 6, 3);
  ctx.fillStyle = shinCol;
  ctx.fillRect(Math.round(footX - 1), Math.round(footY), 4, 2);
}

/**
 * Draw the complete complex, multi-part articulated Slayer avatar with cape,
 * armor accessories, kinematic legs, off-hand buckler/blade, shield block aura,
 * and active right-hand weapon.
 */
export function drawComplexSlayerAvatar(
  ctx: CanvasRenderingContext2D,
  sprites: PixelSpriteRenderer,
  s: AvatarRenderState
) {
  const cx = s.x + s.width / 2;
  const bottomY = s.y + s.height;
  const pal = s.palette;

  // ── 1. Multi-layer Flowing Cloak Behind Hero ────────────
  if (s.scarfPoints.length >= 2) {
    ctx.save();
    // Outer cloak outline/cloth
    ctx.lineCap = 'round';
    for (let i = 0; i < s.scarfPoints.length - 1; i++) {
      const p0 = s.scarfPoints[i];
      const p1 = s.scarfPoints[i + 1];
      const w = Math.max(2, 6 - i);
      ctx.strokeStyle = '#0B0D14';
      ctx.lineWidth = w + 1.5;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();

      ctx.strokeStyle = i % 2 === 0 ? pal.secondary : pal.primary;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
    // Glowing trim line along edge of cloak
    ctx.strokeStyle = pal.glow;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(s.scarfPoints[0].x, s.scarfPoints[0].y + 1);
    for (let i = 1; i < s.scarfPoints.length; i++) {
      ctx.lineTo(s.scarfPoints[i].x, s.scarfPoints[i].y + 1.5);
    }
    ctx.stroke();
    ctx.restore();
  }

  // Compute kinematic pose angles & offsets in local character space (facing right = +X)
  const speedRatio = Math.min(1, Math.abs(s.vx) / 165);
  const moving = speedRatio > 0.08 && s.onGround;
  const idleBob = Math.sin(s.animTime * 4) * 0.7;
  const runBob = moving ? Math.abs(Math.sin(s.walkPhase)) * 1.8 : 0;

  let bodyTilt = 0;
  let headTilt = 0;
  let crouchY = 0;

  if (s.isDashing) {
    bodyTilt = 0.42;
    headTilt = -0.18;
    crouchY = 2;
  } else if (s.spinAttack > 0) {
    // Hit 2 dynamic spinning cyclone uppercut
    bodyTilt = 0;
    crouchY = -1;
  } else if (s.isBlocking) {
    bodyTilt = -0.1;
    headTilt = 0.14;
    crouchY = 3.2;
  } else if (s.meleeTimer > 0) {
    const t = 1 - s.meleeTimer / Math.max(0.05, s.meleeDuration);
    bodyTilt = s.meleeCombo === 3 ? -0.25 + t * 0.65 : 0.28 * Math.sin(t * Math.PI);
    crouchY = s.meleeCombo === 3 ? 2 * t : 1;
  } else if (s.isWallSliding) {
    bodyTilt = -0.16;
    headTilt = 0.1;
  } else if (!s.onGround) {
    bodyTilt = s.vy < 0 ? 0.12 : -0.1;
    headTilt = s.vy < 0 ? -0.14 : 0.12;
  } else if (moving) {
    bodyTilt = 0.18 * speedRatio;
    headTilt = -0.05 * speedRatio;
    crouchY = runBob;
  } else {
    crouchY = idleBob > 0.35 ? 0.6 : 0;
  }

  // Leg joint targets relative to ankle ground anchor (0, 0 = feet level, torso at y=-11)
  const hipY = -11 + crouchY;
  let bKneeX = -1, bKneeY = hipY + 5, bFootX = -3, bFootY = -1;
  let fKneeX = 2, fKneeY = hipY + 5, fFootX = 3, fFootY = -1;
  let offArmAngle = 0.25;

  if (s.isDashing) {
    bKneeX = -7; bKneeY = hipY + 3; bFootX = -11; bFootY = -4;
    fKneeX = 4; fKneeY = hipY + 2; fFootX = 1; fFootY = -2;
    offArmAngle = -0.9;
  } else if (s.isWallSliding) {
    bKneeX = 4; bKneeY = hipY + 4; bFootX = 5; bFootY = -2;
    fKneeX = -2; fKneeY = hipY + 6; fFootX = -3; fFootY = -1;
    offArmAngle = -1.2;
  } else if (!s.onGround) {
    if (s.vy < 0) {
      // Rising tuck
      fKneeX = 5; fKneeY = hipY + 3; fFootX = 3; fFootY = hipY + 8;
      bKneeX = -4; bKneeY = hipY + 5; bFootX = -6; bFootY = hipY + 10;
      offArmAngle = -0.65;
    } else {
      // Falling brace
      fKneeX = 4; fKneeY = hipY + 5; fFootX = 5; fFootY = hipY + 10;
      bKneeX = -3; bKneeY = hipY + 4; bFootX = -5; bFootY = hipY + 9;
      offArmAngle = -0.95;
    }
  } else if (s.isBlocking) {
    // Low anchored martial guard stance
    fKneeX = 5; fKneeY = hipY + 4; fFootX = 6; fFootY = -1;
    bKneeX = -4; bKneeY = hipY + 5; bFootX = -6; bFootY = -1;
    offArmAngle = -0.15;
  } else if (s.meleeTimer > 0) {
    // Wide lunging stance during combo hits
    const stride = s.meleeCombo === 3 ? 7 : 5.5;
    fKneeX = stride - 1; fKneeY = hipY + 4; fFootX = stride; fFootY = -1;
    bKneeX = -stride + 1; bKneeY = hipY + 5; bFootX = -stride - 1; bFootY = -1;
    offArmAngle = s.meleeCombo === 2 ? -0.35 : -0.75;
  } else if (moving) {
    // Smooth sinusoidal running gait
    const sF = Math.sin(s.walkPhase);
    const cF = Math.cos(s.walkPhase);
    const sB = Math.sin(s.walkPhase + Math.PI);
    const cB = Math.cos(s.walkPhase + Math.PI);
    const amp = 5.5 * speedRatio;
    const liftF = Math.max(0, -cF) * 3.5 * speedRatio;
    const liftB = Math.max(0, -cB) * 3.5 * speedRatio;

    fFootX = sF * amp;
    fFootY = -1 - liftF;
    fKneeX = fFootX * 0.5 + 2.2;
    fKneeY = (hipY + fFootY) * 0.5 - liftF * 0.35;

    bFootX = sB * amp;
    bFootY = -1 - liftB;
    bKneeX = bFootX * 0.5 + 2.0;
    bKneeY = (hipY + bFootY) * 0.5 - liftB * 0.35;

    offArmAngle = -sF * 0.85 * speedRatio;
  } else {
    // Idle breathing readiness
    fKneeX = 3; fKneeY = hipY + 5; fFootX = 3; fFootY = -1;
    bKneeX = -2; bKneeY = hipY + 5; bFootX = -3; bFootY = -1;
    offArmAngle = 0.25 + Math.sin(s.animTime * 4) * 0.08;
  }

  ctx.save();
  ctx.translate(Math.round(cx), Math.round(bottomY));
  if (s.isInvincible && !s.isDashing && Math.floor(s.animTime * 22) % 2 === 0) {
    ctx.globalAlpha = 0.48;
  }

  ctx.scale(s.facingRight ? s.scaleX : -s.scaleX, s.scaleY);

  // Acrobatic flip (Double Jump) OR Horizontal / Vertical Spin Attack
  if (s.doubleJumpFlip > 0) {
    ctx.translate(0, -14);
    ctx.rotate((1 - s.doubleJumpFlip) * Math.PI * 2);
    ctx.translate(0, 14);
  } else if (s.spinAttack > 0) {
    if (s.spinMode === 'horizontal') {
      const hCos = Math.cos((1 - s.spinAttack) * Math.PI * 4);
      const safeScaleX = Math.abs(hCos) < 0.2 ? (hCos >= 0 ? 0.2 : -0.2) : hCos;
      ctx.scale(safeScaleX, 1);
    } else {
      // Crisp 2x vertical forward somersault wheel spin!
      ctx.translate(0, -14);
      ctx.rotate((1 - s.spinAttack) * Math.PI * 4);
      ctx.translate(0, 14);
    }
  }

  // ── 2. Armor-Specific Complex Back Aura / Thrusters / Halo ──
  if (s.armorId === 'aether_praetor') {
    ctx.save();
    ctx.translate(-1, -24 + crouchY);
    ctx.rotate(s.animTime * 1.4);
    ctx.strokeStyle = s.counterReady ? '#FFFFFF' : '#FACC15';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const rx = Math.cos(a) * 11;
      const ry = Math.sin(a) * 11;
      if (i === 0) ctx.moveTo(rx, ry);
      else ctx.lineTo(rx, ry);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = '#A855F7';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.fillRect(Math.round(Math.cos(a) * 11 - 1), Math.round(Math.sin(a) * 11 - 1), 2, 2);
    }
    ctx.restore();
  } else if (s.armorId === 'vanguard') {
    // Shoulder reactor exhaust
    ctx.fillStyle = '#22C55E';
    ctx.fillRect(-6, Math.round(-21 + crouchY), 2, 3);
    if (moving || !s.onGround) {
      ctx.fillStyle = '#00F0FF';
      ctx.fillRect(-8, Math.round(-19 + crouchY + (Math.random() > 0.5 ? 1 : 0)), 2, 2);
    }
  } else if (s.armorId === 'recruit_mk1') {
    // Tactical mana cell pack on back
    ctx.fillStyle = '#0B0D14';
    ctx.fillRect(-7, Math.round(-20 + crouchY), 4, 8);
    ctx.fillStyle = pal.glow;
    ctx.fillRect(-6, Math.round(-19 + crouchY), 2, 4);
  } else if (s.armorId === 'rift_stalker') {
    // Flowing dual energy head-ribbons
    const flutter = Math.sin(s.animTime * 16) * 2;
    ctx.strokeStyle = '#00F0FF';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-4, Math.round(-26 + crouchY));
    ctx.lineTo(-11, Math.round(-24 + crouchY + flutter));
    ctx.moveTo(-3, Math.round(-24 + crouchY));
    ctx.lineTo(-10, Math.round(-20 + crouchY - flutter));
    ctx.stroke();
  }

  // ── 3. Back Articulated Leg ─────────────────────────────
  drawArmoredLeg(ctx, -1, hipY, bKneeX, bKneeY, bFootX, bFootY, pal.secondary, pal.secondary, pal.glow);

  // ── 4. Off-Hand Left Arm / Buckler / Cyber Fang / Katana Scabbard ─
  if (s.meleeWeaponId === 'katana') {
    // Sleek Iaido Saya (Scabbard) worn at left hip behind torso
    ctx.save();
    ctx.translate(-3, -10 + crouchY);
    ctx.rotate(-0.32);
    ctx.fillStyle = '#0B0D14';
    ctx.fillRect(-10, -1, 16, 4);
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(-9, 0, 14, 2);
    ctx.fillStyle = '#EF4444';
    ctx.fillRect(-2, 0, 5, 2); // crimson sageo cord wrap
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(-10, 0, 2, 2); // golden kojiri tip
    ctx.fillRect(5, -1, 2, 4); // koi-guchi mouth
    if (s.iaidoWindup || (s.meleeTimer <= 0 && !s.isBlocking)) {
      // Sheathed katana hilt protruding from scabbard mouth + glowing draw glint!
      ctx.fillStyle = '#FACC15';
      ctx.fillRect(7, -2, 1, 5);
      ctx.fillStyle = '#EF4444';
      ctx.fillRect(8, -1, 4, 2);
      if (s.iaidoWindup) {
        const g = 2 + Math.sin(s.animTime * 40) * 1.5;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(Math.round(7 - g), 0, Math.round(g * 2 + 1), 1);
        ctx.fillRect(7, Math.round(-g), 1, Math.round(g * 2 + 1));
      }
    }
    ctx.restore();
  }

  ctx.save();
  ctx.translate(2, -17 + crouchY);
  const offDualAngle =
    s.meleeWeaponId === 'dual_sword' && s.meleeTimer > 0
      ? -1.2 + (1 - s.meleeTimer / Math.max(0.05, s.meleeDuration)) * 2.5
      : offArmAngle;
  ctx.rotate(offDualAngle);
  // Arm & gauntlet
  ctx.fillStyle = '#0B0D14';
  ctx.fillRect(-1, -1, 7, 4);
  ctx.fillStyle = pal.secondary;
  ctx.fillRect(0, 0, 5, 2);
  ctx.fillStyle = pal.glow;
  ctx.fillRect(4, 0, 2, 2);

  if (s.meleeWeaponId === 'dual_sword') {
    // Cool redesigned Off-Hand Twin Phantom Kukri Fang (reverse/forward cyber silhouette!)
    if (s.meleeWeaponLevel >= 2) {
      ctx.shadowColor = '#A855F7';
      ctx.shadowBlur = s.meleeWeaponLevel === 3 ? 9 : 5;
    }
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(5, -3, 2, 6); // gold winged guard
    ctx.fillStyle = '#1E1B4B';
    ctx.fillRect(7, -2, 11, 3); // dark blade body
    ctx.fillStyle = '#A855F7';
    ctx.fillRect(8, -3, 9, 1); // purple plasma ridge
    ctx.fillStyle = '#00F0FF';
    ctx.fillRect(8, 0, 12, 1); // razor cyan edge
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(15, -2, 4, 2); // wicked tip glint
  } else if (s.hasOffhandShield) {
    // Full Armored Wrist Energy Shield Emitter on 2H Melee builds
    ctx.fillStyle = '#0B0D14';
    ctx.fillRect(4, -5, 4, 10);
    ctx.fillStyle = pal.primary;
    ctx.fillRect(5, -4, 2, 8);
    ctx.fillStyle = '#00F0FF';
    ctx.fillRect(6, -3, 2, 6);
  } else if (s.isBlocking) {
    ctx.fillStyle = '#0B0D14';
    ctx.fillRect(5, -4, 3, 8);
    ctx.fillStyle = pal.glow;
    ctx.fillRect(6, -3, 1, 6);
  }
  ctx.restore();

  // ── 5. Tilted Torso + Armor Chestplate Matrix ───────────
  ctx.save();
  ctx.translate(0, -10 + crouchY);
  ctx.rotate(bodyTilt);

  const chestMat = ARMOR_CHESTS[s.armorId] ?? CHEST_RECRUIT;
  const chestFrame = sprites.render(`chest_v2_${s.armorId}`, chestMat, pal, 1);
  ctx.drawImage(chestFrame.canvas, -8, -12);

  // ── 6. Helmet Sprite Positioned On Neck Pivot ───────────
  ctx.save();
  ctx.translate(1, -10);
  ctx.rotate(headTilt);
  const helmMat = ARMOR_HELMS[s.armorId] ?? HELM_RECRUIT;
  const helmFrame = sprites.render(`helm_v2_${s.armorId}`, helmMat, pal, 1);
  ctx.drawImage(helmFrame.canvas, -8, -12);
  ctx.restore();

  ctx.restore(); // end torso

  // ── 7. Front Articulated Leg ────────────────────────────
  drawArmoredLeg(ctx, 1, hipY, fKneeX, fKneeY, fFootX, fFootY, pal.primary, pal.secondary, pal.glow);

  // ── 8. Front Right Arm + Pauldron + Active Weapon (With Lv.2/Lv.3 Glow!) ─
  const handShoulderX = 2 + Math.sin(bodyTilt) * 6;
  const handShoulderY = -17 + crouchY;
  const isKatanaSheathed =
    s.meleeWeaponId === 'katana' && (s.iaidoWindup || (s.meleeTimer <= 0 && !s.isBlocking));

  if (s.isBlocking) {
    drawWeaponInHand(
      ctx,
      s.meleeWeaponId,
      handShoulderX + 2,
      handShoulderY - 1,
      true,
      pal,
      0.01,
      0,
      false,
      0,
      true,
      s.meleeWeaponLevel,
      s.animTime,
      false
    );
  } else if (s.meleeTimer > 0 && !s.iaidoWindup) {
    const prog = 1 - s.meleeTimer / Math.max(0.05, s.meleeDuration);
    drawWeaponInHand(
      ctx,
      s.meleeWeaponId,
      handShoulderX,
      handShoulderY,
      true,
      pal,
      prog,
      s.meleeCombo,
      s.isPogo,
      0,
      false,
      s.meleeWeaponLevel,
      s.animTime,
      false
    );
  } else {
    const recoil = s.rangedTimer > 0 ? 3 : 0;
    const useRangedPose = s.rangedTimer > 0 && s.rangedWeaponId !== null;
    const showWeapon = useRangedPose && s.rangedWeaponId ? s.rangedWeaponId : s.meleeWeaponId;
    const showLv = useRangedPose ? s.rangedWeaponLevel : s.meleeWeaponLevel;
    drawWeaponInHand(
      ctx,
      showWeapon,
      isKatanaSheathed ? handShoulderX - 2 : handShoulderX,
      isKatanaSheathed ? handShoulderY + 3 : handShoulderY,
      true,
      pal,
      0,
      s.meleeCombo,
      false,
      recoil,
      false,
      showLv,
      s.animTime,
      isKatanaSheathed
    );
  }

  // ── 9. Active Hold-Block Energy Aegis Shield & Parry Ring ─
  if (s.isBlocking || s.parryFlash > 0) {
    const shieldX = 11;
    const shieldY = -15 + crouchY;
    const parryActive = s.parryFlash > 0;
    const bigShield = s.hasOffhandShield;
    ctx.save();
    ctx.strokeStyle = parryActive ? '#FACC15' : bigShield ? '#00F0FF' : '#F97316';
    ctx.fillStyle = parryActive
      ? `rgba(250, 204, 21, ${0.35 + s.parryFlash * 0.45})`
      : bigShield
        ? 'rgba(0, 240, 255, 0.28)'
        : 'rgba(249, 115, 22, 0.16)';
    ctx.lineWidth = parryActive ? 2.4 : bigShield ? 2.0 : 1.2;

    const hHalf = bigShield ? 13 : 8;
    ctx.beginPath();
    ctx.moveTo(shieldX, shieldY - hHalf);
    ctx.lineTo(shieldX + (bigShield ? 5 : 3), shieldY - hHalf * 0.45);
    ctx.lineTo(shieldX + (bigShield ? 5 : 3), shieldY + hHalf * 0.45);
    ctx.lineTo(shieldX, shieldY + hHalf);
    ctx.lineTo(shieldX - 2, shieldY + hHalf * 0.6);
    ctx.lineTo(shieldX - 2, shieldY - hHalf * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (bigShield && !parryActive) {
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(shieldX + 1, shieldY - 7);
      ctx.lineTo(shieldX + 1, shieldY + 7);
      ctx.stroke();
    }

    if (parryActive) {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(shieldX + 2, shieldY, 16 * (1.2 - s.parryFlash * 0.4), -1.1, 1.1);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Counter Riposte Ready Spark around gauntlet
  if (s.counterReady && !s.isBlocking) {
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(Math.round(handShoulderX + 3), Math.round(handShoulderY - 3), 2, 2);
  }

  ctx.restore();
}

// Backwards-compatible fallback pose wrapper (used only if external caller calls it directly)
export type MCPoseName =
  | 'idle'
  | 'run_0'
  | 'run_1'
  | 'run_2'
  | 'run_3'
  | 'jump_up'
  | 'fall'
  | 'wall'
  | 'attack';

export function getMCPoseMatrix(armorId: ArmorId, _pose: MCPoseName): PixelKey[][] {
  return ARMOR_HELMS[armorId] ?? HELM_RECRUIT;
}

const WEAPON_GLOW_COLOR: Record<WeaponId, string> = {
  dagger: '#00F0FF',
  sword: '#F97316',
  spear: '#00F0FF',
  katana: '#EF4444',
  axe: '#F97316',
  hammer: '#A855F7',
  dual_sword: '#00F0FF',
  pistol: '#F97316',
  dual_pistol: '#00F0FF',
  shotgun: '#FACC15',
  rifle: '#A855F7',
};

// ── RIGHT-HAND ARMORED GAUNTLET + 11 WEAPONS + GLOW AURA ────
export function drawWeaponInHand(
  ctx: CanvasRenderingContext2D,
  weaponId: WeaponId,
  shoulderX: number,
  shoulderY: number,
  facingRight: boolean,
  palette: SpritePalette,
  swingProgress: number,
  comboStep = 0,
  isPogo = false,
  recoil = 0,
  isGuardPose = false,
  weaponLevel = 1,
  animTime = 0,
  isKatanaSheathed = false
) {
  ctx.save();
  ctx.translate(Math.round(shoulderX), Math.round(shoulderY));
  if (!facingRight) ctx.scale(-1, 1);

  if (isKatanaSheathed) {
    // Hand rests poised across hip scabbard hilt ready for Iaido draw!
    ctx.rotate(0.45);
    ctx.fillStyle = '#0B0D14';
    ctx.fillRect(0, -2, 7, 5);
    ctx.fillStyle = palette.primary;
    ctx.fillRect(1, -1, 5, 3);
    ctx.fillStyle = palette.glow;
    ctx.fillRect(3, -1, 1, 3);
    ctx.restore();
    return;
  }

  if (isGuardPose) {
    ctx.translate(1, -2);
    ctx.rotate(-1.05);
  } else if (swingProgress > 0) {
    if (isPogo) {
      ctx.rotate(Math.PI * 0.5 + (-0.9 + swingProgress * 1.8));
    } else if (weaponId === 'dagger') {
      if (comboStep === 3) {
        const poke = Math.abs(Math.sin(swingProgress * Math.PI * 3)) * 6;
        ctx.translate(poke, Math.sin(swingProgress * Math.PI * 6) * 1.0);
        ctx.rotate(0);
      } else if (comboStep === 2) {
        ctx.rotate(1.15 - swingProgress * 2.4);
      } else {
        ctx.rotate(-1.25 + swingProgress * 2.35);
      }
    } else if (weaponId === 'spear') {
      if (comboStep === 3) {
        const poke = Math.abs(Math.sin(swingProgress * Math.PI * 3)) * 7;
        ctx.translate(poke, 0);
        ctx.rotate(Math.sin(swingProgress * Math.PI * 6) * 0.06);
      } else if (comboStep === 2) {
        ctx.rotate(-1.4 + swingProgress * 2.75);
      } else {
        const poke = Math.sin(swingProgress * Math.PI) * 7;
        ctx.translate(poke, 0);
        ctx.rotate(0);
      }
    } else if (weaponId === 'axe' || weaponId === 'hammer') {
      if (comboStep === 2) {
        ctx.rotate(swingProgress * Math.PI * 3.5);
      } else if (comboStep === 3) {
        const chop = (swingProgress * 3) % 1;
        ctx.rotate(-1.9 + chop * 2.7);
      } else {
        ctx.rotate(-1.65 + swingProgress * 2.6);
      }
    } else if (weaponId === 'sword') {
      if (comboStep === 2) {
        ctx.rotate(Math.sin(swingProgress * Math.PI * 2) * 0.45);
      } else if (comboStep === 3) {
        ctx.translate(2, -1);
        ctx.rotate(-0.2 + swingProgress * 0.4);
      } else {
        ctx.rotate(-1.3 + swingProgress * 2.45);
      }
    } else if (weaponId === 'katana') {
      if (comboStep === 2) {
        ctx.rotate(1.3 - swingProgress * 2.7);
      } else if (comboStep === 3) {
        ctx.translate(3, -1);
        ctx.rotate(-0.15 + swingProgress * 1.6);
      } else {
        // Iai draw straight snap cut
        ctx.rotate(-0.9 + swingProgress * 2.2);
      }
    } else if (weaponId === 'dual_sword') {
      if (comboStep === 2) {
        ctx.rotate(-1.2 + swingProgress * 3.2);
      } else if (comboStep === 3) {
        ctx.rotate(swingProgress * Math.PI * 3.0);
      } else {
        ctx.rotate(-1.35 + swingProgress * 2.6);
      }
    }
  } else {
    const isGun =
      weaponId === 'pistol' ||
      weaponId === 'dual_pistol' ||
      weaponId === 'shotgun' ||
      weaponId === 'rifle';
    ctx.translate(-recoil, 0);
    ctx.rotate(isGun ? 0 : weaponId === 'spear' ? -0.15 : -0.35);
  }

  // Armored forearm & clenched right gauntlet
  ctx.fillStyle = '#0B0D14';
  ctx.fillRect(0, -2, 7, 5);
  ctx.fillStyle = palette.primary;
  ctx.fillRect(1, -1, 5, 3);
  ctx.fillStyle = palette.glow;
  ctx.fillRect(3, -1, 1, 3);
  ctx.fillStyle = palette.secondary;
  ctx.fillRect(5, -1, 2, 3);

  ctx.translate(6, 0);

  // Weapon Upgrade Lv.2 / Lv.3 Glowing Aura Halo
  const glowColor = WEAPON_GLOW_COLOR[weaponId] ?? '#00F0FF';
  if (weaponLevel >= 2) {
    const pulse = 0.65 + 0.35 * Math.sin(animTime * 9);
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = weaponLevel === 3 ? 11 : 6;
    const glowLen =
      weaponId === 'spear'
        ? 22
        : weaponId === 'sword' || weaponId === 'katana'
          ? 17
          : weaponId === 'axe' || weaponId === 'hammer'
            ? 16
            : 12;
    ctx.fillStyle =
      weaponLevel === 3
        ? `rgba(255, 255, 255, ${0.28 + pulse * 0.2})`
        : `rgba(0, 240, 255, ${0.2 + pulse * 0.16})`;
    ctx.fillRect(1, weaponLevel === 3 ? -3 : -2, glowLen, weaponLevel === 3 ? 6 : 4);
  }

  switch (weaponId) {
    case 'dagger':
      ctx.fillStyle = weaponLevel >= 2 ? '#E2E8F0' : '#475569';
      ctx.fillRect(-1, -2, 2, 4);
      ctx.fillStyle = weaponLevel >= 3 ? '#FFFFFF' : '#CBD5E1';
      ctx.fillRect(1, -1, 9, 2);
      ctx.fillStyle = weaponLevel >= 2 ? '#00F0FF' : '#F97316';
      ctx.fillRect(3, 0, 6, 1);
      break;

    case 'sword':
      ctx.fillStyle = '#0B0D14';
      ctx.fillRect(-1, -4, 3, 8);
      ctx.fillStyle = '#FACC15';
      ctx.fillRect(0, -3, 2, 6);
      ctx.fillStyle = weaponLevel >= 3 ? '#FFFFFF' : '#E2E8F0';
      ctx.fillRect(2, -1, 15, 2);
      ctx.fillStyle = weaponLevel >= 2 ? '#00F0FF' : '#F97316';
      ctx.fillRect(3, 0, 12, 1);
      break;

    case 'spear':
      // Long tactical polearm shaft + energized lance tip
      ctx.fillStyle = '#78350F';
      ctx.fillRect(-5, -1, 19, 2);
      ctx.fillStyle = '#FACC15';
      ctx.fillRect(12, -2, 2, 4);
      ctx.fillStyle = weaponLevel >= 2 ? '#00F0FF' : '#E2E8F0';
      ctx.fillRect(14, -2, 5, 4);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(16, -1, 6, 2);
      break;

    case 'katana':
      // Sleek curved Rift Katana with gold tsuba
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(-2, -1, 3, 2);
      ctx.fillStyle = '#FACC15';
      ctx.fillRect(1, -3, 1, 6);
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(2, -1, 14, 2);
      ctx.fillStyle = weaponLevel >= 2 ? '#EF4444' : '#F87171';
      ctx.fillRect(4, -2, 13, 1);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(10, -2, 6, 1);
      break;

    case 'dual_sword':
      // Sleek Main-Hand Aether Kukri Fang (stepped cyber silhouette + glowing edge + gold hilt)
      ctx.fillStyle = '#0B0D14';
      ctx.fillRect(-1, -4, 3, 8);
      ctx.fillStyle = '#FACC15';
      ctx.fillRect(0, -3, 2, 6);
      ctx.fillStyle = '#1E1B4B';
      ctx.fillRect(2, -2, 13, 3);
      ctx.fillStyle = '#A855F7';
      ctx.fillRect(3, 1, 9, 1); // violet under-ridge
      ctx.fillStyle = weaponLevel >= 2 ? '#FFFFFF' : '#00F0FF';
      ctx.fillRect(2, -2, 14, 1); // razor plasma edge
      ctx.fillStyle = '#00F0FF';
      ctx.fillRect(11, -3, 4, 2); // hooked kukri tip
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(14, -3, 2, 2);
      break;

    case 'axe':
      ctx.fillStyle = '#78350F';
      ctx.fillRect(-1, -1, 14, 2);
      ctx.fillStyle = '#94A3B8';
      ctx.fillRect(9, -6, 5, 11);
      ctx.fillStyle = weaponLevel >= 2 ? '#FACC15' : '#EF4444';
      ctx.fillRect(13, -5, 2, 9);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(14, -4, 1, 7);
      break;

    case 'hammer':
      // Massive Grav-Crusher Warhammer
      ctx.fillStyle = '#475569';
      ctx.fillRect(-2, -1, 12, 2);
      ctx.fillStyle = '#0B0D14';
      ctx.fillRect(8, -7, 8, 14);
      ctx.fillStyle = '#334155';
      ctx.fillRect(9, -6, 6, 12);
      ctx.fillStyle = weaponLevel >= 2 ? '#00F0FF' : '#A855F7';
      ctx.fillRect(10, -4, 4, 8);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(11, -2, 2, 4);
      break;

    case 'pistol':
      ctx.fillStyle = '#0B0D14';
      ctx.fillRect(-1, -3, 10, 5);
      ctx.fillStyle = '#475569';
      ctx.fillRect(0, -2, 8, 3);
      ctx.fillStyle = weaponLevel >= 2 ? '#00F0FF' : '#F97316';
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

  // Lv.3 Animated Glint Sparkle gliding along blade
  if (weaponLevel >= 3) {
    const sparkX = 4 + Math.round(((animTime * 22) % 10));
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(sparkX, -1, 2, 2);
  }

  ctx.restore();
}

// ── CHEST & PYLON SPRITES ───────────────────────────────────
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

// ── 7 DISTINCT ENEMY PIXEL MATRICES ─────────────────────────

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

export const SENTINEL_SPRITE: PixelKey[][] = [
  [null, 'B',null,null, 'B', 'B', 'B', 'B', 'B',null,null, 'B',null,null,null,null],
  [null, 'B', 'G', 'B', 'P', 'P', 'S', 'P', 'P', 'B', 'G', 'B',null,null,null,null],
  [null,null, 'B', 'P', 'P', 'B', 'V', 'V', 'V', 'B', 'B',null,null,null,null,null],
  [null,null, 'B', 'P', 'S', 'B', 'B', 'B', 'B', 'B',null,null,null,null,null,null],
  [null,null, 'B', 'P', 'P', 'P', 'P', 'P', 'B',null, 'B', 'B', 'B', 'B',null,null],
  [null, 'B', 'P', 'S', 'P', 'P', 'G', 'P', 'B', 'B', 'P', 'S', 'G', 'P', 'B',null],
  [null, 'B', 'P', 'S', 'P', 'P', 'P', 'P', 'B', 'P', 'S', 'G', 'V', 'S', 'B',null],
  [null, 'B', 'P', 'P', 'S', 'P', 'P', 'B', 'B', 'P', 'S', 'G', 'V', 'S', 'B',null],
  [null,null, 'B', 'P', 'P', 'S', 'P', 'B', 'P', 'S', 'P', 'S', 'G', 'S', 'B',null],
  [null,null, 'B', 'S', 'S', 'S', 'B', 'B', 'P', 'P', 'S', 'S', 'S', 'P', 'B',null],
  [null,null, 'B', 'P', 'B', 'P', 'B',null, 'B', 'P', 'P', 'P', 'P', 'B',null,null],
  [null,null, 'B', 'P', 'B', 'P', 'B',null,null, 'B', 'B', 'B', 'B',null,null,null],
  [null,null, 'B', 'S', 'B', 'S', 'B',null,null,null,null,null,null,null,null,null],
  [null, 'B', 'P', 'P', 'B', 'P', 'P', 'B',null,null,null,null,null,null,null,null],
  [null, 'B', 'S', 'S', 'B', 'S', 'S', 'B',null,null,null,null,null,null,null,null],
  [null, 'B', 'B', 'B', 'B', 'B', 'B', 'B',null,null,null,null,null,null,null,null],
];

export const STALKER_SPRITE: PixelKey[][] = [
  [null,null,null,null,null, 'B', 'B',null,null, 'B', 'B',null,null,null],
  [null,null,null,null, 'B', 'P', 'P', 'B', 'B', 'P', 'B',null,null,null],
  [null,null,null, 'B', 'P', 'P', 'B', 'V', 'V', 'G', 'V', 'B',null,null],
  [null,null, 'B', 'S', 'P', 'P', 'P', 'B', 'B', 'B', 'B',null,null,null],
  [null, 'B', 'G', 'S', 'P', 'P', 'G', 'P', 'P', 'B',null,null,null,null],
  [ 'B', 'G', 'B', 'P', 'S', 'P', 'P', 'P', 'P', 'P', 'B', 'G',null,null],
  [ 'B', 'B',null, 'B', 'P', 'P', 'P', 'B', 'S', 'P', 'B', 'V', 'G',null],
  [null,null,null, 'B', 'S', 'B',null,null, 'B', 'P', 'B', 'B',null,null],
  [null,null, 'B', 'P', 'B',null,null,null,null, 'B', 'P', 'B',null,null],
  [null, 'B', 'S', 'B',null,null,null,null,null,null, 'B', 'S', 'B',null],
  [null, 'B', 'B',null,null,null,null,null,null,null,null, 'B', 'B',null],
];

export const SPITTER_SPRITE: PixelKey[][] = [
  [null,null,null,null, 'B', 'G', 'G', 'B',null,null,null,null,null,null],
  [null,null,null, 'B', 'S', 'V', 'V', 'S', 'B',null,null,null,null,null],
  [null,null, 'B', 'P', 'P', 'G', 'G', 'P', 'P', 'B', 'B', 'B',null,null],
  [null,null, 'B', 'P', 'P', 'G', 'G', 'P', 'P', 'B', 'B', 'B',null,null],
  [null, 'B', 'P', 'S', 'P', 'V', 'V', 'P', 'P', 'S', 'G', 'V', 'B',null],
  [null, 'B', 'P', 'P', 'P', 'G', 'G', 'P', 'P', 'S', 'G', 'V', 'B',null],
  [null,null, 'B', 'S', 'P', 'P', 'P', 'P', 'B', 'B', 'B', 'B',null,null],
  [null,null, 'B', 'S', 'S', 'P', 'P', 'S', 'S', 'B',null,null,null,null],
  [null, 'B', 'P', 'S', 'B', 'S', 'S', 'B', 'S', 'P', 'B',null,null,null],
  [ 'B', 'P', 'B',null, 'B', 'S', 'S', 'B',null, 'B', 'P', 'B',null,null],
  [ 'B', 'B',null,null, 'B', 'B', 'B', 'B',null,null, 'B', 'B',null,null],
];

export const BRUTE_SPRITE: PixelKey[][] = [
  [null, 'B', 'G',null,null,null, 'B', 'B', 'B', 'B',null,null,null, 'G', 'B',null,null,null],
  [null, 'B', 'P', 'B',null, 'B', 'P', 'S', 'S', 'P', 'B',null, 'B', 'P', 'B',null,null,null],
  [null,null, 'B', 'P', 'B', 'P', 'B', 'V', 'V', 'B', 'P', 'B', 'P', 'B',null,null,null,null],
  [null,null, 'B', 'P', 'P', 'P', 'P', 'B', 'B', 'P', 'P', 'P', 'P', 'B',null,null,null,null],
  [null, 'B', 'P', 'S', 'P', 'P', 'G', 'V', 'V', 'G', 'P', 'P', 'S', 'P', 'B',null,null,null],
  [ 'B', 'P', 'P', 'S', 'P', 'P', 'P', 'G', 'G', 'P', 'P', 'P', 'S', 'P', 'P', 'B',null,null],
  [ 'B', 'P', 'S', 'P', 'P', 'S', 'P', 'P', 'P', 'P', 'S', 'P', 'P', 'S', 'P', 'B',null,null],
  [ 'B', 'P', 'P', 'B', 'P', 'P', 'S', 'S', 'S', 'S', 'P', 'P', 'B', 'P', 'P', 'B',null,null],
  [ 'B', 'S', 'S', 'B', 'B', 'P', 'P', 'P', 'P', 'P', 'P', 'B', 'B', 'S', 'S', 'B',null,null],
  [ 'B', 'B', 'B',null, 'B', 'S', 'S', 'B', 'B', 'S', 'S', 'B',null, 'B', 'B', 'B',null,null],
  [null,null,null,null, 'B', 'P', 'P', 'B', 'B', 'P', 'P', 'B',null,null,null,null,null,null],
  [null,null,null, 'B', 'P', 'P', 'B',null,null, 'B', 'P', 'P', 'B',null,null,null,null,null],
  [null,null,null, 'B', 'S', 'S', 'B',null,null, 'B', 'S', 'S', 'B',null,null,null,null,null],
  [null,null, 'B', 'S', 'S', 'S', 'B',null,null, 'B', 'S', 'S', 'S', 'B',null,null,null,null],
  [null,null, 'B', 'B', 'B', 'B', 'B',null,null, 'B', 'B', 'B', 'B', 'B',null,null,null,null],
];

export const WISP_SPRITE: PixelKey[][] = [
  [null,null, 'G', 'G', 'G', 'G',null,null],
  [null, 'G', 'V', 'V', 'V', 'V', 'G',null],
  [ 'G', 'V', 'B', 'G', 'G', 'B', 'V', 'G'],
  [ 'G', 'V', 'G', 'V', 'V', 'G', 'V', 'G'],
  [ 'G', 'V', 'V', 'B', 'B', 'V', 'V', 'G'],
  [null, 'G', 'P', 'V', 'V', 'P', 'G',null],
  [null,null, 'G', 'P', 'P', 'G',null,null],
  [null,null,null, 'G', 'G',null,null,null],
];

export function getEnemyMatrix(defId: EnemyId, walkingFrame: boolean): PixelKey[][] {
  switch (defId) {
    case 'rift_drone':
      return RIFT_DRONE_SPRITE;
    case 'corrupted_sentinel':
      return SENTINEL_SPRITE;
    case 'mana_stalker':
      return STALKER_SPRITE;
    case 'void_spitter':
      return SPITTER_SPRITE;
    case 'rift_brute':
      return BRUTE_SPRITE;
    case 'mana_wisp':
      return WISP_SPRITE;
    case 'mana_husk':
    default:
      return walkingFrame ? MANA_HUSK_WALK : MANA_HUSK_SPRITE;
  }
}

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
  void_spitter: {
    primary: '#311042',
    secondary: '#1C0926',
    visor: '#22C55E',
    glow: '#A855F7',
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
  mana_wisp: {
    primary: '#A855F7',
    secondary: '#1E1B4B',
    visor: '#00F0FF',
    glow: '#FFFFFF',
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

// ── 3 DETAILED PIXEL-ART BOSS RENDERERS ─────────────────────
export function drawBossSprite(
  ctx: CanvasRenderingContext2D,
  bossId: BossId,
  x: number,
  y: number,
  w: number,
  h: number,
  facingRight: boolean,
  flash: boolean,
  stunned: boolean,
  telegraph: boolean,
  animTime: number
) {
  ctx.save();
  const cx = Math.round(x + w / 2);
  const cy = Math.round(y + h);
  ctx.translate(cx, cy);
  if (!facingRight) ctx.scale(-1, 1);

  const bob = Math.round(Math.sin(animTime * 4) * 2);
  const rimColor = telegraph ? '#EF4444' : stunned ? '#00F0FF' : '#A855F7';

  if (bossId === 'mana_colossus') {
    ctx.fillStyle = flash ? '#FFFFFF' : '#2B2F3A';
    ctx.fillRect(-18, -h + 10, 36, h - 18);
    ctx.fillRect(-12, -h, 24, 14);
    ctx.fillStyle = flash ? '#FFFFFF' : '#1E222E';
    ctx.fillRect(-16, -12, 12, 12);
    ctx.fillRect(4, -12, 12, 12);
    ctx.fillStyle = flash ? '#FFFFFF' : '#4A3F35';
    ctx.fillRect(-26, -h + 8 + bob, 10, 14);
    ctx.fillRect(16, -h + 8 - bob, 10, 14);
    ctx.fillRect(-24, -24 - bob, 8, 14);
    ctx.fillRect(16, -24 + bob, 8, 14);
    ctx.fillStyle = '#00F0FF';
    ctx.fillRect(2, -h + 5, 7, 3);
    ctx.fillStyle = flash ? '#FFFFFF' : '#A855F7';
    ctx.fillRect(-6, -h + 22, 12, 12);
    ctx.fillStyle = '#00F0FF';
    ctx.fillRect(-2, -h + 25, 4, 6);
  } else if (bossId === 'forge_titan') {
    ctx.fillStyle = flash ? '#FFFFFF' : '#451A03';
    ctx.fillRect(-22, -h + 12, 44, h - 22);
    ctx.fillStyle = flash ? '#FFFFFF' : '#78350F';
    ctx.fillRect(-14, -h + 2, 28, 14);
    ctx.fillStyle = flash ? '#FFFFFF' : '#2B2F3A';
    ctx.fillRect(-20, -h - 6, 8, 18);
    ctx.fillRect(12, -h - 6, 8, 18);
    ctx.fillStyle = '#F97316';
    ctx.fillRect(-18, -h - 8 + bob, 4, 3);
    ctx.fillRect(14, -h - 8 - bob, 4, 3);
    ctx.fillStyle = flash ? '#FFFFFF' : '#64748B';
    ctx.fillRect(-29, -36 + bob, 10, 22);
    ctx.fillRect(19, -36 - bob, 10, 22);
    ctx.fillStyle = flash ? '#FFFFFF' : '#1E293B';
    ctx.fillRect(-18, -12, 14, 12);
    ctx.fillRect(4, -12, 14, 12);
    ctx.fillStyle = '#EF4444';
    ctx.fillRect(0, -h + 6, 10, 3);
    ctx.fillStyle = '#F97316';
    ctx.fillRect(-10, -h + 24, 20, 14);
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(-8, -h + 26, 4, 10);
    ctx.fillRect(-2, -h + 26, 4, 10);
    ctx.fillRect(4, -h + 26, 4, 10);
  } else {
    const floatY = Math.round(Math.sin(animTime * 3) * 3);
    ctx.translate(0, floatY);
    ctx.strokeStyle = stunned ? '#00F0FF' : '#FACC15';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -h + 8, 18, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = flash ? '#FFFFFF' : '#4C1D95';
    ctx.fillRect(-28, -h + 12, 14, 24);
    ctx.fillRect(14, -h + 12, 14, 24);
    ctx.fillStyle = '#A855F7';
    ctx.fillRect(-32, -h + 16, 6, 16);
    ctx.fillRect(26, -h + 16, 6, 16);

    ctx.fillStyle = flash ? '#FFFFFF' : '#1E1B4B';
    ctx.fillRect(-14, -h + 10, 28, h - 14);
    ctx.fillStyle = flash ? '#FFFFFF' : '#312E81';
    ctx.fillRect(-10, -h, 20, 14);
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(-11, -h - 6, 4, 8);
    ctx.fillRect(7, -h - 6, 4, 8);
    ctx.fillStyle = '#00F0FF';
    ctx.fillRect(0, -h + 5, 9, 3);
    ctx.fillStyle = '#A855F7';
    ctx.fillRect(-5, -h + 18, 10, 12);
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(14, -h + 22, 4, 10);
    ctx.fillStyle = '#00F0FF';
    ctx.fillRect(16, -h - 4, 3, 28);
  }

  ctx.strokeStyle = rimColor;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-Math.floor(w / 2) - 1, -h - 1, w + 2, h + 2);
  ctx.restore();
}
