// ============================================================
// RIFTBOUND: SLAYER CORPS — PixelSpriteRenderer
// 4 Distinct Armor Silhouettes (Recruit, Vanguard T-Visor,
// Rift-Stalker Hooded Horn, Aether-Forge Crowned Praetor),
// 8 Held Weapons (incl. Dagger), 7 Distinct Enemies & 3 Bosses!
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

// ── 4 DISTINCT ARMOR UPPER SILHOUETTES (16x16, Facing Right) ─

// 1. Slayer Recruit Mk.I — Compact tactical respirator helm
const UPPER_RECRUIT: PixelKey[][] = [
  [null,null,null,null,null, 'B', 'B', 'B', 'B', 'B', 'B',null,null,null,null,null],
  [null,null,null,null, 'B', 'P', 'P', 'P', 'P', 'P', 'P', 'B',null,null,null,null],
  [null,null,null, 'B', 'P', 'P', 'S', 'S', 'S', 'P', 'P', 'P', 'B',null,null,null],
  [null,null,null, 'B', 'P', 'S', 'S', 'P', 'B', 'B', 'B', 'B', 'B',null,null,null],
  [null,null,null, 'B', 'P', 'P', 'B', 'B', 'V', 'V', 'V', 'V', 'V', 'B',null,null],
  [null,null,null, 'B', 'P', 'P', 'B', 'V', 'V', 'G', 'G', 'V', 'V', 'B',null,null],
  [null,null,null, 'B', 'P', 'S', 'B', 'B', 'B', 'B', 'B', 'B', 'B',null,null,null],
  [null,null,null,null, 'B', 'P', 'S', 'S', 'G', 'S', 'G', 'P', 'B',null,null,null],
  [null,null,null,null, 'B', 'S', 'S', 'S', 'S', 'S', 'S', 'B',null,null,null,null],
  [null,null,null, 'B', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'B',null,null,null],
  [null,null, 'B', 'P', 'P', 'S', 'S', 'P', 'P', 'G', 'G', 'P', 'B',null,null,null],
  [null,null, 'B', 'P', 'S', 'S', 'P', 'P', 'P', 'G', 'G', 'P', 'B',null,null,null],
  [null,null, 'B', 'P', 'P', 'S', 'S', 'P', 'P', 'P', 'P', 'B',null,null,null,null],
  [null,null,null, 'B', 'P', 'P', 'S', 'S', 'P', 'P', 'B',null,null,null,null,null],
  [null,null,null, 'B', 'S', 'S', 'B', 'G', 'G', 'B', 'S', 'B',null,null,null,null],
  [null,null,null, 'B', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'B',null,null,null,null],
];

// 2. Vanguard Breach Plate — Heavy DOOM T-Visor + Broad Towering Pauldrons
const UPPER_VANGUARD: PixelKey[][] = [
  [null,null,null,null, 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B',null,null,null,null],
  [null,null,null, 'B', 'P', 'P', 'S', 'S', 'P', 'P', 'P', 'P', 'B',null,null,null],
  [null,null, 'B', 'P', 'P', 'S', 'S', 'P', 'B', 'B', 'B', 'B', 'B',null,null,null],
  [null,null, 'B', 'P', 'P', 'B', 'B', 'V', 'V', 'V', 'V', 'V', 'V', 'B',null,null],
  [null,null, 'B', 'P', 'S', 'B', 'V', 'V', 'G', 'V', 'V', 'G', 'V', 'B',null,null],
  [null,null, 'B', 'P', 'P', 'B', 'B', 'B', 'V', 'V', 'B', 'B', 'B',null,null,null], // T-visor stem
  [null,null,null, 'B', 'P', 'S', 'S', 'B', 'V', 'V', 'B', 'P', 'B',null,null,null],
  [null,null,null, 'B', 'S', 'S', 'G', 'S', 'B', 'B', 'S', 'S', 'B',null,null,null],
  [null, 'B', 'B', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'B',null,null],
  [ 'B', 'P', 'P', 'P', 'S', 'P', 'P', 'P', 'P', 'G', 'G', 'P', 'P', 'B',null,null], // wide pauldron
  [ 'B', 'P', 'S', 'S', 'P', 'P', 'P', 'S', 'P', 'G', 'G', 'P', 'P', 'B',null,null],
  [ 'B', 'P', 'P', 'P', 'S', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'B',null,null,null],
  [null, 'B', 'S', 'S', 'P', 'P', 'S', 'P', 'P', 'P', 'P', 'B',null,null,null,null],
  [null,null, 'B', 'P', 'P', 'S', 'S', 'P', 'P', 'P', 'B',null,null,null,null,null],
  [null,null, 'B', 'S', 'S', 'B', 'G', 'G', 'B', 'S', 'S', 'B',null,null,null,null],
  [null,null, 'B', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'B',null,null,null,null],
];

// 3. Rift-Stalker Carapace — Swept Horned Cowl + Agile Tactical Armor
const UPPER_STALKER: PixelKey[][] = [
  [null,null, 'B', 'B',null,null, 'B', 'B', 'B', 'B',null,null,null,null,null,null], // swept horn tip!
  [null, 'B', 'G', 'P', 'B', 'B', 'P', 'P', 'P', 'P', 'B',null,null,null,null,null],
  [null,null, 'B', 'P', 'P', 'P', 'P', 'S', 'P', 'P', 'P', 'B',null,null,null,null],
  [null,null,null, 'B', 'P', 'S', 'B', 'B', 'B', 'B', 'B', 'B', 'B',null,null,null],
  [null,null,null, 'B', 'P', 'B', 'V', 'V', 'V', 'G', 'V', 'V', 'V', 'B',null,null], // sleek sharp visor
  [null,null,null, 'B', 'S', 'B', 'B', 'B', 'V', 'G', 'G', 'B', 'B',null,null,null],
  [null,null,null, 'B', 'P', 'S', 'S', 'B', 'B', 'B', 'B', 'S', 'B',null,null,null],
  [null,null,null,null, 'B', 'S', 'G', 'S', 'G', 'S', 'P', 'B',null,null,null,null],
  [null,null,null,null, 'B', 'S', 'S', 'S', 'S', 'S', 'B',null,null,null,null,null],
  [null,null,null, 'B', 'G', 'P', 'P', 'P', 'P', 'P', 'P', 'B',null,null,null,null],
  [null,null, 'B', 'G', 'P', 'S', 'P', 'P', 'G', 'P', 'P', 'B',null,null,null,null],
  [null,null, 'B', 'P', 'S', 'P', 'P', 'G', 'G', 'P', 'B',null,null,null,null,null],
  [null,null,null, 'B', 'P', 'P', 'S', 'P', 'P', 'P', 'B',null,null,null,null,null],
  [null,null,null, 'B', 'S', 'P', 'P', 'P', 'P', 'B',null,null,null,null,null,null],
  [null,null,null, 'B', 'S', 'B', 'G', 'G', 'B', 'S', 'B',null,null,null,null,null],
  [null,null,null, 'B', 'S', 'S', 'S', 'S', 'S', 'S', 'B',null,null,null,null,null],
];

// 4. Aether-Forge Praetor — Crowned Horned Crest + Golden Rune Armor
const UPPER_PRAETOR: PixelKey[][] = [
  [null,null, 'B', 'S', 'B',null, 'B', 'S', 'S', 'B',null, 'B', 'S', 'B',null,null], // Praetor crown horns!
  [null,null,null, 'B', 'S', 'B', 'P', 'S', 'S', 'P', 'B', 'S', 'B',null,null,null],
  [null,null,null, 'B', 'P', 'P', 'S', 'P', 'P', 'S', 'P', 'P', 'B',null,null,null],
  [null,null, 'B', 'P', 'P', 'S', 'B', 'B', 'B', 'B', 'B', 'B', 'B',null,null,null],
  [null,null, 'B', 'P', 'S', 'B', 'V', 'V', 'V', 'G', 'G', 'V', 'V', 'B',null,null],
  [null,null, 'B', 'P', 'S', 'B', 'B', 'V', 'G', 'V', 'V', 'G', 'V', 'B',null,null],
  [null,null, 'B', 'S', 'P', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B',null,null,null],
  [null,null,null, 'B', 'P', 'S', 'G', 'S', 'G', 'S', 'S', 'P', 'B',null,null,null],
  [null,null, 'B', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'B',null,null,null],
  [ 'B', 'S', 'S', 'P', 'P', 'P', 'G', 'G', 'P', 'P', 'P', 'S', 'S', 'B',null,null], // winged gold pauldrons
  [ 'B', 'S', 'P', 'P', 'S', 'P', 'G', 'V', 'G', 'P', 'S', 'P', 'P', 'B',null,null], // glowing rune core
  [null, 'B', 'P', 'P', 'S', 'P', 'P', 'G', 'P', 'P', 'S', 'P', 'B',null,null,null],
  [null,null, 'B', 'P', 'S', 'S', 'P', 'P', 'P', 'S', 'S', 'B',null,null,null,null],
  [null,null,null, 'B', 'P', 'P', 'S', 'P', 'P', 'P', 'B',null,null,null,null,null],
  [null,null,null, 'B', 'S', 'S', 'B', 'V', 'V', 'B', 'S', 'B',null,null,null,null],
  [null,null,null, 'B', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'B',null,null,null,null],
];

const ARMOR_UPPERS: Record<ArmorId, PixelKey[][]> = {
  recruit_mk1: UPPER_RECRUIT,
  vanguard: UPPER_VANGUARD,
  rift_stalker: UPPER_STALKER,
  aether_praetor: UPPER_PRAETOR,
};

const EMPTY_ROW: PixelKey[] = Array(16).fill(null);

function shiftRowRight(row: PixelKey[], px: number): PixelKey[] {
  if (px <= 0) return row;
  return [...Array(px).fill(null), ...row.slice(0, 16 - px)];
}

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

export function getMCPoseMatrix(armorId: ArmorId, pose: MCPoseName): PixelKey[][] {
  const upper = ARMOR_UPPERS[armorId] ?? UPPER_RECRUIT;

  switch (pose) {
    case 'run_0':
      return [
        EMPTY_ROW,
        ...upper.slice(0, 15).map((r) => shiftRowRight(r, 1)),
        [null,null, 'B', 'S', 'S', 'B',null,null, 'B', 'P', 'P', 'P', 'B',null,null,null],
        [null, 'B', 'S', 'S', 'B',null,null,null,null, 'B', 'P', 'P', 'P', 'B',null,null],
        [ 'B', 'S', 'S', 'B',null,null,null,null,null,null, 'B', 'S', 'S', 'B',null,null],
        [ 'B', 'S', 'B',null,null,null,null,null,null,null, 'B', 'P', 'P', 'B',null,null],
        [ 'B', 'S', 'S', 'B',null,null,null,null,null,null,null, 'B', 'P', 'P', 'B',null],
        [ 'B', 'S', 'B',null,null,null,null,null,null,null,null, 'B', 'S', 'S', 'B',null],
        [ 'B', 'S', 'B',null,null,null,null,null,null,null,null, 'B', 'P', 'P', 'B',null],
        [null, 'B', 'B',null,null,null,null,null,null,null,null, 'B', 'B', 'B', 'B',null],
      ];
    case 'run_1':
      return [
        ...upper,
        [null,null,null,null, 'B', 'S', 'S', 'P', 'P', 'B',null,null,null,null,null,null],
        [null,null,null,null, 'B', 'S', 'B', 'P', 'P', 'P', 'B',null,null,null,null,null],
        [null,null,null, 'B', 'S', 'B',null, 'B', 'P', 'P', 'B',null,null,null,null,null],
        [null,null, 'B', 'S', 'B',null,null, 'B', 'S', 'S', 'B',null,null,null,null,null],
        [null,null, 'B', 'B',null,null,null, 'B', 'P', 'P', 'B',null,null,null,null,null],
        [null,null,null,null,null,null,null, 'B', 'P', 'P', 'P', 'B',null,null,null,null],
        [null,null,null,null,null,null,null, 'B', 'S', 'S', 'S', 'B',null,null,null,null],
        [null,null,null,null,null,null,null, 'B', 'B', 'B', 'B', 'B',null,null,null,null],
      ];
    case 'run_2':
      return [
        EMPTY_ROW,
        ...upper.slice(0, 15).map((r) => shiftRowRight(r, 1)),
        [null,null, 'B', 'P', 'P', 'B',null,null, 'B', 'S', 'S', 'S', 'B',null,null,null],
        [null, 'B', 'P', 'P', 'B',null,null,null,null, 'B', 'S', 'S', 'S', 'B',null,null],
        [ 'B', 'P', 'P', 'B',null,null,null,null,null,null, 'B', 'S', 'S', 'B',null,null],
        [ 'B', 'P', 'B',null,null,null,null,null,null,null, 'B', 'S', 'S', 'B',null,null],
        [ 'B', 'P', 'P', 'B',null,null,null,null,null,null,null, 'B', 'S', 'S', 'B',null],
        [ 'B', 'S', 'S', 'B',null,null,null,null,null,null,null, 'B', 'S', 'S', 'B',null],
        [ 'B', 'B', 'B',null,null,null,null,null,null,null,null, 'B', 'S', 'S', 'B',null],
        [null,null,null,null,null,null,null,null,null,null,null, 'B', 'B', 'B', 'B',null],
      ];
    case 'run_3':
      return [
        ...upper,
        [null,null,null,null, 'B', 'P', 'P', 'S', 'S', 'B',null,null,null,null,null,null],
        [null,null,null,null, 'B', 'P', 'P', 'B', 'S', 'S', 'B',null,null,null,null,null],
        [null,null,null,null, 'B', 'P', 'B',null, 'B', 'S', 'S', 'P', 'B',null,null,null],
        [null,null,null,null, 'B', 'S', 'B',null,null, 'B', 'S', 'B',null,null,null,null],
        [null,null,null,null, 'B', 'P', 'B',null,null,null, 'B', 'B',null,null,null,null],
        [null,null,null,null, 'B', 'P', 'P', 'B',null,null,null,null,null,null,null,null],
        [null,null,null,null, 'B', 'S', 'S', 'B',null,null,null,null,null,null,null,null],
        [null,null,null,null, 'B', 'B', 'B', 'B',null,null,null,null,null,null,null,null],
      ];
    case 'jump_up':
      return [
        ...upper.map((r) => shiftRowRight(r, 1)),
        [null,null,null, 'B', 'S', 'S', 'B',null, 'B', 'P', 'P', 'P', 'B',null,null,null],
        [null,null, 'B', 'S', 'S', 'B',null,null,null, 'B', 'P', 'P', 'P', 'B',null,null],
        [null,null, 'B', 'S', 'B',null,null,null,null, 'B', 'S', 'S', 'B',null,null,null],
        [null, 'B', 'S', 'B',null,null,null,null,null, 'B', 'P', 'P', 'B',null,null,null],
        [null, 'B', 'S', 'S', 'B',null,null,null,null, 'B', 'B', 'B',null,null,null,null],
        [null, 'B', 'S', 'B',null,null,null,null,null,null,null,null,null,null,null,null],
        [null, 'B', 'B',null,null,null,null,null,null,null,null,null,null,null,null,null],
        EMPTY_ROW,
      ];
    case 'fall':
      return [
        ...upper,
        [null,null, 'B', 'S', 'S', 'B',null, 'B', 'P', 'P', 'B',null,null,null,null,null],
        [null,null, 'B', 'S', 'B',null,null, 'B', 'P', 'P', 'P', 'B',null,null,null,null],
        [null, 'B', 'S', 'B',null,null,null,null, 'B', 'S', 'S', 'B',null,null,null,null],
        [null, 'B', 'S', 'S', 'B',null,null,null, 'B', 'P', 'P', 'B',null,null,null,null],
        [ 'B', 'S', 'S', 'B',null,null,null,null, 'B', 'P', 'P', 'P', 'B',null,null,null],
        [ 'B', 'B', 'B',null,null,null,null,null, 'B', 'S', 'S', 'S', 'B',null,null,null],
        [null,null,null,null,null,null,null,null, 'B', 'B', 'B', 'B', 'B',null,null,null],
        EMPTY_ROW,
      ];
    case 'wall':
      return [
        ...upper,
        [null,null,null, 'B', 'S', 'S', 'B', 'B', 'P', 'P', 'B',null,null,null,null,null],
        [null,null,null, 'B', 'S', 'B',null, 'B', 'P', 'P', 'P', 'B',null,null,null,null],
        [null,null,null, 'B', 'S', 'B',null,null, 'B', 'P', 'B',null,null,null,null,null],
        [null,null,null, 'B', 'S', 'S', 'B',null, 'B', 'S', 'B',null,null,null,null,null],
        [null,null,null, 'B', 'S', 'B',null,null, 'B', 'P', 'P', 'B',null,null,null,null],
        [null,null,null, 'B', 'S', 'B',null,null, 'B', 'S', 'S', 'B',null,null,null,null],
        [null,null, 'B', 'S', 'S', 'B',null,null, 'B', 'B', 'B',null,null,null,null,null],
        [null,null, 'B', 'B', 'B',null,null,null,null,null,null,null,null,null,null,null],
      ];
    case 'attack':
      return [
        EMPTY_ROW,
        ...upper.slice(0, 15).map((r) => shiftRowRight(r, 2)),
        [null,null, 'B', 'S', 'S', 'B',null,null,null, 'B', 'P', 'P', 'P', 'B',null,null],
        [null, 'B', 'S', 'S', 'B',null,null,null,null,null, 'B', 'P', 'P', 'P', 'B',null],
        [ 'B', 'S', 'S', 'B',null,null,null,null,null,null,null, 'B', 'S', 'S', 'B',null],
        [ 'B', 'S', 'B',null,null,null,null,null,null,null,null, 'B', 'P', 'P', 'B',null],
        [ 'B', 'S', 'S', 'B',null,null,null,null,null,null,null, 'B', 'P', 'P', 'B',null],
        [ 'B', 'S', 'S', 'B',null,null,null,null,null,null,null, 'B', 'P', 'P', 'B',null],
        [ 'B', 'S', 'S', 'B',null,null,null,null,null,null,null, 'B', 'S', 'S', 'B',null],
        [ 'B', 'B', 'B',null,null,null,null,null,null,null,null, 'B', 'B', 'B', 'B',null],
      ];
    case 'idle':
    default:
      return [
        ...upper,
        [null,null,null, 'B', 'S', 'S', 'B', 'B', 'P', 'P', 'P', 'B',null,null,null,null],
        [null,null,null, 'B', 'S', 'S', 'B', 'B', 'P', 'P', 'P', 'B',null,null,null,null],
        [null,null,null, 'B', 'S', 'B',null,null, 'B', 'P', 'P', 'B',null,null,null,null],
        [null,null,null, 'B', 'S', 'B',null,null, 'B', 'S', 'S', 'B',null,null,null,null],
        [null,null,null, 'B', 'S', 'S', 'B',null, 'B', 'P', 'P', 'B',null,null,null,null],
        [null,null,null, 'B', 'S', 'S', 'B',null, 'B', 'P', 'P', 'P', 'B',null,null,null],
        [null,null, 'B', 'S', 'S', 'S', 'B',null, 'B', 'S', 'S', 'S', 'B',null,null,null],
        [null,null, 'B', 'B', 'B', 'B', 'B',null, 'B', 'B', 'B', 'B', 'B',null,null,null],
      ];
  }
}

// ── RIGHT-HAND ARMORED GAUNTLET + 8 WEAPONS ─────────────────
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
  recoil = 0
) {
  ctx.save();
  ctx.translate(Math.round(shoulderX), Math.round(shoulderY));
  if (!facingRight) ctx.scale(-1, 1);

  if (swingProgress > 0) {
    if (isPogo) {
      ctx.rotate(Math.PI * 0.5 + (-0.9 + swingProgress * 1.8));
    } else if (comboStep % 2 === 1) {
      ctx.rotate(1.1 - swingProgress * 2.4);
    } else {
      ctx.rotate(-1.35 + swingProgress * 2.5);
    }
  } else {
    const isGun =
      weaponId === 'pistol' ||
      weaponId === 'dual_pistol' ||
      weaponId === 'shotgun' ||
      weaponId === 'rifle';
    ctx.translate(-recoil, 0);
    ctx.rotate(isGun ? 0 : -0.35);
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

  switch (weaponId) {
    case 'dagger':
      // Sleek combat shiv
      ctx.fillStyle = '#475569';
      ctx.fillRect(-1, -2, 2, 4);
      ctx.fillStyle = '#CBD5E1';
      ctx.fillRect(1, -1, 8, 2);
      ctx.fillStyle = '#F97316';
      ctx.fillRect(3, 0, 5, 1);
      break;

    case 'sword':
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

// 1. Mana Husk (14x16)
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

// 2. Rift Drone (12x10)
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

// 3. Corrupted Sentinel — Horned knight with big front tower shield (16x22)
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

// 4. Mana Stalker — Crouched agile razor-claw hunter (14x16)
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

// 5. Void Spitter — Organic-tech turret pod (14x14)
export const SPITTER_SPRITE: PixelKey[][] = [
  [null,null,null,null, 'B', 'G', 'G', 'B',null,null,null,null,null,null],
  [null,null,null, 'B', 'S', 'V', 'V', 'S', 'B',null,null,null,null,null],
  [null,null, 'B', 'P', 'P', 'G', 'G', 'P', 'P', 'B', 'B', 'B',null,null],
  [null, 'B', 'P', 'S', 'P', 'V', 'V', 'P', 'P', 'S', 'G', 'V', 'B',null],
  [null, 'B', 'P', 'P', 'P', 'G', 'G', 'P', 'P', 'S', 'G', 'V', 'B',null],
  [null,null, 'B', 'S', 'P', 'P', 'P', 'P', 'B', 'B', 'B', 'B',null,null],
  [null,null, 'B', 'S', 'S', 'P', 'P', 'S', 'S', 'B',null,null,null,null],
  [null, 'B', 'P', 'S', 'B', 'S', 'S', 'B', 'S', 'P', 'B',null,null,null],
  [ 'B', 'P', 'B',null, 'B', 'S', 'S', 'B',null, 'B', 'P', 'B',null,null],
  [ 'B', 'B',null,null, 'B', 'B', 'B', 'B',null,null, 'B', 'B',null,null],
];

// 6. Rift Brute — Huge horned juggernaut (18x20)
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

// 7. Mana Wisp (8x8)
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
    // Jagged Ancient Stone Golem with floating shoulder boulders & rune core
    ctx.fillStyle = flash ? '#FFFFFF' : '#2B2F3A';
    ctx.fillRect(-18, -h + 10, 36, h - 18); // torso
    ctx.fillRect(-12, -h, 24, 14); // head
    // Legs
    ctx.fillStyle = flash ? '#FFFFFF' : '#1E222E';
    ctx.fillRect(-16, -12, 12, 12);
    ctx.fillRect(4, -12, 12, 12);
    // Floating shoulder boulders
    ctx.fillStyle = flash ? '#FFFFFF' : '#4A3F35';
    ctx.fillRect(-26, -h + 8 + bob, 10, 14);
    ctx.fillRect(16, -h + 8 - bob, 10, 14);
    // Massive stone fists
    ctx.fillRect(-24, -24 - bob, 8, 14);
    ctx.fillRect(16, -24 + bob, 8, 14);
    // Glowing cyan eyes & chest rune cracks
    ctx.fillStyle = stunned ? '#00F0FF' : '#00F0FF';
    ctx.fillRect(2, -h + 5, 7, 3);
    ctx.fillStyle = flash ? '#FFFFFF' : '#A855F7';
    ctx.fillRect(-6, -h + 22, 12, 12);
    ctx.fillStyle = '#00F0FF';
    ctx.fillRect(-2, -h + 25, 4, 6);
  } else if (bossId === 'forge_titan') {
    // Mechanical Furnace Titan with Twin Smokestacks & Piston Hammer Arms
    ctx.fillStyle = flash ? '#FFFFFF' : '#451A03';
    ctx.fillRect(-22, -h + 12, 44, h - 22);
    ctx.fillStyle = flash ? '#FFFFFF' : '#78350F';
    ctx.fillRect(-14, -h + 2, 28, 14); // armored furnace helm
    // Twin smokestacks on shoulders
    ctx.fillStyle = flash ? '#FFFFFF' : '#2B2F3A';
    ctx.fillRect(-20, -h - 6, 8, 18);
    ctx.fillRect(12, -h - 6, 8, 18);
    ctx.fillStyle = '#F97316';
    ctx.fillRect(-18, -h - 8 + bob, 4, 3);
    ctx.fillRect(14, -h - 8 - bob, 4, 3);
    // Piston arms
    ctx.fillStyle = flash ? '#FFFFFF' : '#64748B';
    ctx.fillRect(-29, -36 + bob, 10, 22);
    ctx.fillRect(19, -36 - bob, 10, 22);
    // Legs
    ctx.fillStyle = flash ? '#FFFFFF' : '#1E293B';
    ctx.fillRect(-18, -12, 14, 12);
    ctx.fillRect(4, -12, 14, 12);
    // Furnace grate chest & visor
    ctx.fillStyle = '#EF4444';
    ctx.fillRect(0, -h + 6, 10, 3);
    ctx.fillStyle = '#F97316';
    ctx.fillRect(-10, -h + 24, 20, 14);
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(-8, -h + 26, 4, 10);
    ctx.fillRect(-2, -h + 26, 4, 10);
    ctx.fillRect(4, -h + 26, 4, 10);
  } else {
    // Aetherion, The Corrupted Warden — Floating Winged Ancient Being + Rift Halo + Greatsword
    const floatY = Math.round(Math.sin(animTime * 3) * 3);
    ctx.translate(0, floatY);

    // Rift Halo behind head
    ctx.strokeStyle = stunned ? '#00F0FF' : '#FACC15';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -h + 8, 18, 0, Math.PI * 2);
    ctx.stroke();

    // Spectral Rift Wings
    ctx.fillStyle = flash ? '#FFFFFF' : '#4C1D95';
    ctx.fillRect(-28, -h + 12, 14, 24);
    ctx.fillRect(14, -h + 12, 14, 24);
    ctx.fillStyle = '#A855F7';
    ctx.fillRect(-32, -h + 16, 6, 16);
    ctx.fillRect(26, -h + 16, 6, 16);

    // Armored Warden Cloak & Torso
    ctx.fillStyle = flash ? '#FFFFFF' : '#1E1B4B';
    ctx.fillRect(-14, -h + 10, 28, h - 14);
    ctx.fillStyle = flash ? '#FFFFFF' : '#312E81';
    ctx.fillRect(-10, -h, 20, 14); // Crowned helm
    // Crown horns
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(-11, -h - 6, 4, 8);
    ctx.fillRect(7, -h - 6, 4, 8);
    // Glowing visor & chest core
    ctx.fillStyle = '#00F0FF';
    ctx.fillRect(0, -h + 5, 9, 3);
    ctx.fillStyle = '#A855F7';
    ctx.fillRect(-5, -h + 18, 10, 12);
    // Energy Greatsword in forward hand
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(14, -h + 22, 4, 10);
    ctx.fillStyle = '#00F0FF';
    ctx.fillRect(16, -h - 4, 3, 28);
  }

  // Outer Boss Telegraph / Stun Aura
  ctx.strokeStyle = rimColor;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-Math.floor(w / 2) - 1, -h - 1, w + 2, h + 2);
  ctx.restore();
}
