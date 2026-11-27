// ============================================================
// RIFTBOUND: SLAYER CORPS — PixelSpriteRenderer
// Articulated Complex Multi-Part Slayer Avatar (4 distinct Helmets,
// Chestplates, Thrusters/Halo/Cowl accessories, Flowing 2-Layer Cloak,
// Kinematic Legs, Off-Hand Aegis Shield + Off-Blade, 8 Weapons),
// 7 Distinct Enemies & 3 Bosses.
// ============================================================

import type { ArmorId, BossId, EnemyId, RangedWeaponId, WeaponId } from '../types';
import {
  getWeaponMoveProfile,
  resolveDisplayedWeapon,
  sampleRangedAimPose,
  sampleStickmanCombatPose,
  sampleWeaponBladeTrail,
  solveTwoBoneElbow,
  type CombatMoveType,
} from './combatRules';

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
  cloak?: string;
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

// 5. Mossbell Warden — Leaf-Crested Bell Hood + Verdant Visor
const HELM_MOSS_WARDEN: PixelKey[][] = [
  [null,null,null,null, 'B', 'G', 'G', 'B',null,null,null,null,null,null,null,null], // bell leaf stem
  [null,null,null, 'B', 'P', 'P', 'P', 'P', 'B',null,null,null,null,null,null,null],
  [null,null, 'B', 'P', 'S', 'P', 'G', 'P', 'P', 'B',null,null,null,null,null,null],
  [null, 'B', 'P', 'P', 'P', 'S', 'P', 'P', 'S', 'P', 'B',null,null,null,null,null],
  [null, 'B', 'S', 'P', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B',null,null,null,null],
  [null, 'B', 'P', 'B', 'V', 'V', 'G', 'V', 'V', 'G', 'V', 'V', 'B',null,null,null],
  [null, 'B', 'P', 'B', 'B', 'V', 'V', 'V', 'V', 'V', 'V', 'B',null,null,null,null],
  [null, 'B', 'S', 'P', 'B', 'B', 'B', 'B', 'B', 'B', 'B',null,null,null,null,null],
  [null,null, 'B', 'P', 'S', 'G', 'P', 'S', 'G', 'P', 'B',null,null,null,null,null],
  [null,null, 'B', 'S', 'S', 'P', 'S', 'S', 'P', 'S', 'B',null,null,null,null,null],
  [null,null,null, 'B', 'S', 'S', 'S', 'S', 'S', 'B',null,null,null,null,null,null],
  [null,null,null,null, 'B', 'B', 'B', 'B', 'B',null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
];

// 6. Gilded Silk-Dancer — Twin Swept Silksong Mask Horns + Crimson Slit Visor
const HELM_NEEDLE_DANCER: PixelKey[][] = [
  [ 'B', 'P', 'B',null,null,null,null,null,null,null,null, 'B', 'P', 'B',null,null], // tall curved ivory horns
  [null, 'B', 'P', 'B',null,null,null,null,null,null, 'B', 'P', 'B',null,null,null],
  [null, 'B', 'P', 'P', 'B',null, 'B', 'G', 'B',null, 'B', 'P', 'P', 'B',null,null],
  [null,null, 'B', 'P', 'P', 'B', 'P', 'P', 'P', 'B', 'P', 'P', 'B',null,null,null],
  [null,null, 'B', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'B',null,null,null],
  [null,null, 'B', 'S', 'P', 'B', 'V', 'V', 'B', 'P', 'V', 'V', 'B',null,null,null], // dark crimson eyes
  [null,null, 'B', 'P', 'P', 'B', 'V', 'G', 'B', 'P', 'V', 'G', 'B',null,null,null],
  [null,null, 'B', 'S', 'P', 'P', 'B', 'B', 'P', 'P', 'B', 'B', 'B',null,null,null],
  [null,null,null, 'B', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'B',null,null,null,null],
  [null,null,null, 'B', 'S', 'P', 'P', 'S', 'P', 'P', 'B',null,null,null,null,null],
  [null,null,null,null, 'B', 'S', 'P', 'P', 'S', 'B',null,null,null,null,null,null],
  [null,null,null,null,null, 'B', 'G', 'G', 'B',null,null,null,null,null,null,null],
  [null,null,null,null,null,null, 'B', 'B',null,null,null,null,null,null,null,null],
];

const ARMOR_HELMS: Record<ArmorId, PixelKey[][]> = {
  recruit_mk1: HELM_RECRUIT,
  moss_warden: HELM_MOSS_WARDEN,
  vanguard: HELM_VANGUARD,
  rift_stalker: HELM_STALKER,
  needle_dancer: HELM_NEEDLE_DANCER,
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

const CHEST_MOSS_WARDEN: PixelKey[][] = [
  [null,null, 'B', 'G', 'S', 'S', 'S', 'S', 'S', 'G', 'B',null,null,null,null,null],
  [null, 'B', 'P', 'P', 'G', 'P', 'P', 'P', 'G', 'P', 'P', 'B',null,null,null,null],
  [ 'B', 'P', 'S', 'P', 'P', 'P', 'G', 'G', 'P', 'P', 'S', 'P', 'B',null,null,null],
  [ 'B', 'P', 'P', 'S', 'P', 'G', 'V', 'V', 'G', 'P', 'S', 'P', 'B',null,null,null],
  [null, 'B', 'P', 'P', 'S', 'P', 'G', 'G', 'P', 'S', 'P', 'B',null,null,null,null],
  [null,null, 'B', 'P', 'P', 'S', 'P', 'P', 'S', 'P', 'B',null,null,null,null,null],
  [null,null, 'B', 'S', 'P', 'P', 'G', 'G', 'P', 'S', 'B',null,null,null,null,null],
  [null,null, 'B', 'P', 'S', 'P', 'P', 'P', 'S', 'P', 'B',null,null,null,null,null],
  [null,null,null, 'B', 'S', 'B', 'G', 'G', 'B', 'S', 'B',null,null,null,null,null],
  [null,null,null, 'B', 'S', 'S', 'S', 'S', 'S', 'S', 'B',null,null,null,null,null],
  [null,null, 'B', 'G', 'P', 'B',null,null, 'B', 'P', 'G', 'B',null,null,null,null],
  [null,null,null, 'B', 'B',null,null,null,null, 'B', 'B',null,null,null,null,null],
];

const CHEST_NEEDLE_DANCER: PixelKey[][] = [
  [null,null,null, 'B', 'V', 'V', 'V', 'V', 'V', 'V', 'B',null,null,null,null,null], // crimson silk shawl
  [null,null, 'B', 'V', 'V', 'G', 'V', 'V', 'G', 'V', 'V', 'B',null,null,null,null],
  [null, 'B', 'V', 'V', 'V', 'V', 'G', 'G', 'V', 'V', 'V', 'V', 'B',null,null,null],
  [null, 'B', 'V', 'S', 'V', 'V', 'P', 'P', 'V', 'V', 'S', 'V', 'B',null,null,null],
  [null,null, 'B', 'V', 'V', 'S', 'P', 'P', 'S', 'V', 'V', 'B',null,null,null,null],
  [null,null,null, 'B', 'S', 'P', 'G', 'G', 'P', 'S', 'B',null,null,null,null,null],
  [null,null,null, 'B', 'P', 'S', 'P', 'P', 'S', 'P', 'B',null,null,null,null,null],
  [null,null,null, 'B', 'V', 'P', 'S', 'S', 'P', 'V', 'B',null,null,null,null,null],
  [null,null,null, 'B', 'G', 'B', 'V', 'V', 'B', 'G', 'B',null,null,null,null,null],
  [null,null, 'B', 'V', 'V', 'S', 'S', 'S', 'S', 'V', 'V', 'B',null,null,null,null],
  [null,null, 'B', 'V', 'B',null,null,null,null, 'B', 'V', 'B',null,null,null,null],
  [null,null,null, 'B',null,null,null,null,null,null, 'B',null,null,null,null,null],
];

const ARMOR_CHESTS: Record<ArmorId, PixelKey[][]> = {
  recruit_mk1: CHEST_RECRUIT,
  moss_warden: CHEST_MOSS_WARDEN,
  vanguard: CHEST_VANGUARD,
  rift_stalker: CHEST_STALKER,
  needle_dancer: CHEST_NEEDLE_DANCER,
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
  /** Active stickman combat move & normalized [0..1] progress */
  combatMove?: CombatMoveType | null;
  combatMoveProgress?: number;
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

  // ── 1. Multi-layer Flowing Silksong Cloak Behind Hero ────
  if (s.scarfPoints.length >= 2) {
    ctx.save();
    const cloakPrimary = pal.cloak ?? pal.primary;
    const cloakShade = pal.secondary;
    ctx.lineCap = 'round';
    for (let i = 0; i < s.scarfPoints.length - 1; i++) {
      const p0 = s.scarfPoints[i];
      const p1 = s.scarfPoints[i + 1];
      const w = Math.max(2.5, 7.5 - i * 0.9);
      ctx.strokeStyle = '#0B0D14';
      ctx.lineWidth = w + 1.8;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();

      ctx.strokeStyle = i % 2 === 0 ? cloakPrimary : cloakShade;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
    // Luminous woven trim line along hem of cloak
    ctx.strokeStyle = pal.glow;
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(s.scarfPoints[0].x, s.scarfPoints[0].y + 1);
    for (let i = 1; i < s.scarfPoints.length; i++) {
      ctx.lineTo(s.scarfPoints[i].x, s.scarfPoints[i].y + 1.6);
    }
    ctx.stroke();
    ctx.restore();
  }

  // Compute kinematic pose angles & offsets in local character space (facing right = +X)
  const speedRatio = Math.min(1, Math.abs(s.vx) / 165);
  const moving = speedRatio > 0.08 && s.onGround;
  const idleBob = Math.sin(s.animTime * 4) * 0.7;
  const runBob = moving ? Math.abs(Math.sin(s.walkPhase)) * 1.8 : 0;

  const activePose =
    s.combatMove && !s.isBlocking
      ? sampleStickmanCombatPose(s.combatMove, s.combatMoveProgress ?? 0, s.meleeWeaponId)
      : null;

  const displayWeapon = resolveDisplayedWeapon({
    meleeWeaponId: s.meleeWeaponId,
    rangedWeaponId: s.rangedWeaponId,
    isMeleeAttacking: Boolean(activePose),
  });

  const activeRangedId: RangedWeaponId | null =
    displayWeapon.mode === 'ranged_primary' && s.rangedWeaponId
      ? (s.rangedWeaponId as RangedWeaponId)
      : null;
  const rangedRecoilProg = s.rangedTimer > 0 ? Math.max(0, Math.min(1, 1 - s.rangedTimer / 0.14)) : 0;
  const rangedPose = activeRangedId && !s.isBlocking ? sampleRangedAimPose(activeRangedId, rangedRecoilProg) : null;

  // ── 1B. Live Physical Blade-Swept Motion Ribbon (world space, attached directly to moving blade!) ──
  if (
    activePose &&
    s.combatMove &&
    s.combatMove !== 'air_slam_windup' &&
    s.combatMove !== 'air_slam_impact'
  ) {
    const trail = sampleWeaponBladeTrail(
      s.combatMove,
      s.combatMoveProgress ?? 0,
      s.meleeWeaponId,
      s.facingRight,
      cx,
      bottomY,
      7
    );
    if (trail.length >= 2) {
      const wProfile = getWeaponMoveProfile(s.meleeWeaponId);
      const ribbonColor =
        s.meleeWeaponLevel >= 3
          ? '#FACC15'
          : s.meleeWeaponLevel === 2
            ? '#00F0FF'
            : wProfile.trailColor;
      ctx.save();
      // Tapered physical blade-sweep polygon connecting moving blade base -> blade tip
      for (let i = 1; i < trail.length; i++) {
        const a = trail[i - 1];
        const b = trail[i];
        const frac = i / (trail.length - 1);
        ctx.globalAlpha = frac * 0.42;
        ctx.fillStyle = ribbonColor;
        ctx.beginPath();
        ctx.moveTo(a.baseX, a.baseY);
        ctx.lineTo(a.tipX, a.tipY);
        ctx.lineTo(b.tipX, b.tipY);
        ctx.lineTo(b.baseX, b.baseY);
        ctx.closePath();
        ctx.fill();
      }
      // Razor-sharp gleaming blade-tip wake line
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = wProfile.heavy ? 2.1 : 1.3;
      ctx.beginPath();
      for (let i = 0; i < trail.length; i++) {
        if (i === 0) ctx.moveTo(trail[i].tipX, trail[i].tipY);
        else ctx.lineTo(trail[i].tipX, trail[i].tipY);
      }
      ctx.stroke();

      // Secondary metallic core gleam along mid-blade
      ctx.globalAlpha = 0.45;
      ctx.strokeStyle = wProfile.accentColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < trail.length; i++) {
        const mx = (trail[i].baseX + trail[i].tipX) * 0.5;
        const my = (trail[i].baseY + trail[i].tipY) * 0.5;
        if (i === 0) ctx.moveTo(mx, my);
        else ctx.lineTo(mx, my);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  let bodyTilt = 0;
  let headTilt = 0;
  let crouchY = 0;

  if (activePose) {
    bodyTilt = activePose.torsoTilt;
    headTilt = activePose.headTilt;
    crouchY = activePose.crouchY;
  } else if (s.isDashing) {
    bodyTilt = 0.42;
    headTilt = -0.18;
    crouchY = 2;
  } else if (s.isBlocking) {
    bodyTilt = -0.1;
    headTilt = 0.14;
    crouchY = 3.2;
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

  if (activePose) {
    fKneeX = activePose.frontKnee.x;
    fKneeY = activePose.frontKnee.y;
    fFootX = activePose.frontFoot.x;
    fFootY = activePose.frontFoot.y;
    bKneeX = activePose.backKnee.x;
    bKneeY = activePose.backKnee.y;
    bFootX = activePose.backFoot.x;
    bFootY = activePose.backFoot.y;
  } else if (s.isDashing) {
    bKneeX = -7; bKneeY = hipY + 3; bFootX = -11; bFootY = -4;
    fKneeX = 4; fKneeY = hipY + 2; fFootX = 1; fFootY = -2;
    offArmAngle = -0.9;
  } else if (s.isWallSliding) {
    bKneeX = 4; bKneeY = hipY + 4; bFootX = 5; bFootY = -2;
    fKneeX = -2; fKneeY = hipY + 6; fFootX = -3; fFootY = -1;
    offArmAngle = -1.2;
  } else if (!s.onGround) {
    if (s.vy < 0) {
      fKneeX = 5; fKneeY = hipY + 3; fFootX = 3; fFootY = hipY + 8;
      bKneeX = -4; bKneeY = hipY + 5; bFootX = -6; bFootY = hipY + 10;
      offArmAngle = -0.65;
    } else {
      fKneeX = 4; fKneeY = hipY + 5; fFootX = 5; fFootY = hipY + 10;
      bKneeX = -3; bKneeY = hipY + 4; bFootX = -5; bFootY = hipY + 9;
      offArmAngle = -0.95;
    }
  } else if (s.isBlocking) {
    fKneeX = 5; fKneeY = hipY + 4; fFootX = 6; fFootY = -1;
    bKneeX = -4; bKneeY = hipY + 5; bFootX = -6; bFootY = -1;
    offArmAngle = -0.15;
  } else if (moving) {
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
    fKneeX = 3; fKneeY = hipY + 5; fFootX = 3; fFootY = -1;
    bKneeX = -2; bKneeY = hipY + 5; bFootX = -3; bFootY = -1;
    offArmAngle = 0.25 + Math.sin(s.animTime * 4) * 0.08;
  }

  ctx.save();
  ctx.translate(Math.round(cx), Math.round(bottomY));
  if (s.isInvincible && !s.isDashing && Math.floor(s.animTime * 22) % 2 === 0) {
    ctx.globalAlpha = 0.48;
  }

  const totalScaleX = s.scaleX * (activePose?.squashX ?? 1);
  const totalScaleY = s.scaleY * (activePose?.squashY ?? 1);
  ctx.scale(s.facingRight ? totalScaleX : -totalScaleX, totalScaleY);

  if (activePose && activePose.bodyOffsetX !== 0) {
    ctx.translate(activePose.bodyOffsetX, 0);
  }

  // Acrobatic flip (Double Jump) OR Stickman Vertical Spin Somersault
  if (activePose && activePose.bodyRotation !== 0) {
    ctx.translate(0, -14);
    ctx.rotate(activePose.bodyRotation);
    ctx.translate(0, 14);
  } else if (s.doubleJumpFlip > 0) {
    ctx.translate(0, -14);
    ctx.rotate((1 - s.doubleJumpFlip) * Math.PI * 2);
    ctx.translate(0, 14);
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
  } else if (s.armorId === 'moss_warden') {
    // Swaying moss-bell charm + glowing spore wisps on back
    const sway = Math.sin(s.animTime * 7) * 1.6;
    ctx.fillStyle = '#0B0D14';
    ctx.fillRect(Math.round(-7 + sway * 0.4), Math.round(-19 + crouchY), 5, 6);
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(Math.round(-6 + sway * 0.4), Math.round(-18 + crouchY), 3, 4);
    ctx.fillStyle = '#4ADE80';
    ctx.fillRect(Math.round(-9 + sway), Math.round(-23 + crouchY), 2, 2);
  } else if (s.armorId === 'needle_dancer') {
    // Twin gilded crimson silk ribbons trailing behind mask horns
    const wave = Math.sin(s.animTime * 14) * 2.4;
    ctx.strokeStyle = '#F43F5E';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-3, Math.round(-23 + crouchY));
    ctx.quadraticCurveTo(-9, Math.round(-21 + crouchY + wave), -15, Math.round(-18 + crouchY - wave * 0.6));
    ctx.stroke();
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-4, Math.round(-21 + crouchY));
    ctx.quadraticCurveTo(-10, Math.round(-18 + crouchY - wave), -14, Math.round(-15 + crouchY + wave * 0.5));
    ctx.stroke();
  }

  // ── 3. Back Articulated Leg ─────────────────────────────
  drawArmoredLeg(ctx, -1, hipY, bKneeX, bKneeY, bFootX, bFootY, pal.secondary, pal.secondary, pal.glow);

  // ── 4. Back-Slung Ranged Weapon (during Quick-Draw Dagger) / Hip Sheath / Off-Hand Arm ─
  if (displayWeapon.showHolsteredRangedOnBack && s.rangedWeaponId) {
    // Ranged weapon cleanly slung diagonally across back while quick-drawing the short dagger
    ctx.save();
    ctx.translate(-3, -16 + crouchY);
    ctx.rotate(-1.08);
    ctx.globalAlpha = 0.92;
    drawWeaponPixelArt(ctx, s.rangedWeaponId, s.rangedWeaponLevel, s.animTime, 0);
    ctx.restore();
  }

  if (displayWeapon.showHolsteredDagger) {
    // Compact Short Combat Dagger tucked cleanly at hip sheath until melee attack
    ctx.save();
    ctx.translate(-4, -9 + crouchY);
    ctx.rotate(0.65);
    ctx.fillStyle = '#0B0D14';
    ctx.fillRect(-1, -1, 7, 3);
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 0, 5, 1);
    ctx.fillStyle = '#00F0FF';
    ctx.fillRect(-2, -1, 2, 3);
    ctx.restore();
  }

  if (s.meleeWeaponId === 'katana' && displayWeapon.mode === 'melee_primary') {
    ctx.save();
    ctx.translate(-3, -10 + crouchY);
    ctx.rotate(-0.32);
    ctx.fillStyle = '#0B0D14';
    ctx.fillRect(-10, -1, 16, 4);
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(-9, 0, 14, 2);
    ctx.fillStyle = '#EF4444';
    ctx.fillRect(-2, 0, 5, 2);
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(-10, 0, 2, 2);
    ctx.fillRect(5, -1, 2, 4);
    if (s.iaidoWindup || (!activePose && s.meleeTimer <= 0 && !s.isBlocking)) {
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

  const handShoulderX = 2 + Math.sin(bodyTilt) * 5;
  const handShoulderY = -17 + crouchY;
  const offShoulderX = -1 + Math.sin(bodyTilt) * 4;
  const offShoulderY = -17 + crouchY;

  const drawStickmanMainArm = () => {
    if (!activePose) return;
    const ex = handShoulderX + activePose.elbow.x;
    const ey = handShoulderY + activePose.elbow.y;
    const hx = handShoulderX + activePose.hand.x;
    const hy = handShoulderY + activePose.hand.y;

    // Articulated 2-bone stickman upper arm + forearm with glowing elbow joint
    drawLimbSegment(ctx, handShoulderX, handShoulderY, ex, ey, 2.8, '#0B0D14', pal.primary);
    drawLimbSegment(ctx, ex, ey, hx, hy, 2.6, '#0B0D14', pal.secondary);
    ctx.fillStyle = pal.glow;
    ctx.fillRect(Math.round(ex - 1), Math.round(ey - 1), 2, 2);
    ctx.fillStyle = '#0B0D14';
    ctx.fillRect(Math.round(hx - 2), Math.round(hy - 2), 4, 4);
    ctx.fillStyle = pal.primary;
    ctx.fillRect(Math.round(hx - 1), Math.round(hy - 1), 2, 2);

    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(activePose.weaponAngle);
    drawWeaponPixelArt(ctx, s.meleeWeaponId, s.meleeWeaponLevel, s.animTime, 0);
    ctx.restore();
  };

  if (activePose) {
    // Articulated 2-bone off-hand arm: either physically gripping two-handed weapon shaft OR counterbalance!
    const oEx = offShoulderX + activePose.offElbow.x;
    const oEy = offShoulderY + activePose.offElbow.y;
    const oHx = offShoulderX + activePose.offHand.x;
    const oHy = offShoulderY + activePose.offHand.y;
    if (!activePose.offHandOnWeapon) {
      drawLimbSegment(ctx, offShoulderX, offShoulderY, oEx, oEy, 2.4, '#0B0D14', pal.secondary);
      drawLimbSegment(ctx, oEx, oEy, oHx, oHy, 2.2, '#0B0D14', pal.secondary);
      ctx.fillStyle = pal.glow;
      ctx.fillRect(Math.round(oHx - 1), Math.round(oHy - 1), 2, 2);
    }

    if (s.meleeWeaponId === 'dual_sword') {
      const offAng = Math.atan2(oHy - oEy, oHx - oEx);
      ctx.save();
      ctx.translate(oHx, oHy);
      ctx.rotate(offAng);
      drawOffhandTwinBlade(ctx, s.meleeWeaponLevel);
      ctx.restore();
    }
    // Back half of horizontal spin draws main weapon behind torso for crisp 3D depth!
    if (activePose.weaponBehindTorso) {
      drawStickmanMainArm();
    }
  } else if (rangedPose && activeRangedId) {
    // Off-hand arm for Ranged Mode (behind torso for Pistol/Shotgun/Rifle/Dual Pistol/Bow)
    const oEx = offShoulderX + rangedPose.offElbow.x;
    const oEy = offShoulderY + rangedPose.offElbow.y;
    const oHx = offShoulderX + rangedPose.offHand.x;
    const oHy = offShoulderY + rangedPose.offHand.y;
    drawLimbSegment(ctx, offShoulderX, offShoulderY, oEx, oEy, 2.4, '#0B0D14', pal.secondary);
    drawLimbSegment(ctx, oEx, oEy, oHx, oHy, 2.2, '#0B0D14', pal.secondary);
    ctx.fillStyle = pal.glow;
    ctx.fillRect(Math.round(oHx - 1), Math.round(oHy - 1), 2, 2);

    if (rangedPose.hasOffhandGun) {
      // Second pistol held in off-hand for Dual Pistol (cyan plasma slide)!
      ctx.save();
      ctx.translate(oHx, oHy);
      ctx.rotate(rangedPose.offWeaponAngle);
      drawWeaponPixelArt(ctx, 'pistol', Math.max(2, s.rangedWeaponLevel), s.animTime, 0);
      if (s.rangedTimer > 0.05) {
        ctx.fillStyle = '#00F0FF';
        ctx.fillRect(9, -3, 4, 3);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(10, -2, 3, 1);
      }
      ctx.restore();
    }
  } else {
    ctx.save();
    ctx.translate(2, -17 + crouchY);
    ctx.rotate(offArmAngle);
    ctx.fillStyle = '#0B0D14';
    ctx.fillRect(-1, -1, 7, 4);
    ctx.fillStyle = pal.secondary;
    ctx.fillRect(0, 0, 5, 2);
    ctx.fillStyle = pal.glow;
    ctx.fillRect(4, 0, 2, 2);

    if (displayWeapon.mode === 'melee_primary' && s.meleeWeaponId === 'dual_sword') {
      ctx.save();
      ctx.translate(5, 0);
      drawOffhandTwinBlade(ctx, s.meleeWeaponLevel);
      ctx.restore();
    } else if (displayWeapon.mode === 'melee_primary' && s.hasOffhandShield) {
      ctx.fillStyle = '#0B0D14';
      ctx.fillRect(4, -5, 4, 10);
      ctx.fillStyle = pal.primary;
      ctx.fillRect(5, -4, 2, 8);
      ctx.fillStyle = '#00F0FF';
      ctx.fillRect(6, -3, 2, 6);
    } else if (displayWeapon.mode === 'melee_primary' && s.meleeWeaponId === 'needle') {
      ctx.fillStyle = '#0B0D14';
      ctx.fillRect(4, -3, 4, 6);
      ctx.fillStyle = '#FFF1F2';
      ctx.fillRect(5, -2, 2, 4);
      ctx.fillStyle = '#F43F5E';
      ctx.fillRect(5, -1, 2, 2);
    } else if (s.isBlocking) {
      ctx.fillStyle = '#0B0D14';
      ctx.fillRect(5, -4, 3, 8);
      ctx.fillStyle = pal.glow;
      ctx.fillRect(6, -3, 1, 6);
    }
    ctx.restore();
  }

  // ── 5. Tilted Torso + Armor Chestplate Matrix ───────────
  ctx.save();
  ctx.translate(0, -10 + crouchY);
  ctx.rotate(bodyTilt + (rangedPose ? rangedPose.recoilTilt : 0));

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

  // ── 8. Front Right Arm + Active Weapon (Ranged Primary OR Realistic Melee Grip) ──
  const isKatanaSheathed =
    displayWeapon.mode === 'melee_primary' &&
    s.meleeWeaponId === 'katana' &&
    (s.iaidoWindup || (!activePose && s.meleeTimer <= 0 && !s.isBlocking));

  if (s.isBlocking) {
    drawWeaponInHand(
      ctx,
      displayWeapon.weaponId,
      handShoulderX + 2,
      handShoulderY - 1,
      true,
      pal,
      0.01,
      0,
      false,
      0,
      true,
      displayWeapon.mode === 'ranged_primary' ? s.rangedWeaponLevel : s.meleeWeaponLevel,
      s.animTime,
      false
    );
  } else if (activePose) {
    if (!activePose.weaponBehindTorso) {
      drawStickmanMainArm();
      // Draw front-side second hand gripping two-handed weapon shaft/pommel so BOTH hands visibly hold it!
      if (activePose.offHandOnWeapon) {
        const oEx = offShoulderX + activePose.offElbow.x;
        const oEy = offShoulderY + activePose.offElbow.y;
        const oHx = offShoulderX + activePose.offHand.x;
        const oHy = offShoulderY + activePose.offHand.y;
        drawLimbSegment(ctx, offShoulderX, offShoulderY, oEx, oEy, 2.3, '#0B0D14', pal.secondary);
        drawLimbSegment(ctx, oEx, oEy, oHx, oHy, 2.2, '#0B0D14', pal.primary);
        ctx.fillStyle = '#0B0D14';
        ctx.fillRect(Math.round(oHx - 1.5), Math.round(oHy - 1.5), 3, 3);
        ctx.fillStyle = pal.glow;
        ctx.fillRect(Math.round(oHx - 1), Math.round(oHy - 1), 2, 2);
      }
    }
  } else if (rangedPose && activeRangedId) {
    // Realistic Ranged Weapon Pose (Pistol, Dual Pistol, Shotgun, Bow, Rifle!)
    const mEx = handShoulderX + rangedPose.mainElbow.x;
    const mEy = handShoulderY + rangedPose.mainElbow.y;
    const mHx = handShoulderX + rangedPose.mainHand.x;
    const mHy = handShoulderY + rangedPose.mainHand.y;
    const oHx = offShoulderX + rangedPose.offHand.x;
    const oHy = offShoulderY + rangedPose.offHand.y;

    if (activeRangedId === 'bow') {
      // Recurve Bow is anchored at the extended front (off) hand, drawn by the rear (main) hand!
      ctx.save();
      ctx.translate(oHx, oHy);
      drawWeaponPixelArt(ctx, 'bow', s.rangedWeaponLevel, s.animTime, rangedPose.bowDraw);
      ctx.restore();

      // Rear drawing arm pulling bowstring back toward visor
      drawLimbSegment(ctx, handShoulderX, handShoulderY, mEx, mEy, 2.6, '#0B0D14', pal.primary);
      drawLimbSegment(ctx, mEx, mEy, mHx, mHy, 2.4, '#0B0D14', pal.secondary);
      ctx.fillStyle = '#0B0D14';
      ctx.fillRect(Math.round(mHx - 2), Math.round(mHy - 2), 4, 4);
      ctx.fillStyle = pal.glow;
      ctx.fillRect(Math.round(mHx - 1), Math.round(mHy - 1), 2, 2);

      // Flash release sparkle when firing arrow
      if (s.rangedTimer > 0.04) {
        ctx.fillStyle = '#4ADE80';
        ctx.fillRect(Math.round(oHx + 4), Math.round(oHy - 2), 5, 4);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(Math.round(oHx + 6), Math.round(oHy - 1), 4, 2);
      }
    } else {
      // Main arm holding Pistol / Dual Pistol (right gun) / Shotgun / Rifle
      drawLimbSegment(ctx, handShoulderX, handShoulderY, mEx, mEy, 2.7, '#0B0D14', pal.primary);
      drawLimbSegment(ctx, mEx, mEy, mHx, mHy, 2.5, '#0B0D14', pal.secondary);
      ctx.fillStyle = '#0B0D14';
      ctx.fillRect(Math.round(mHx - 2), Math.round(mHy - 2), 4, 4);
      ctx.fillStyle = pal.primary;
      ctx.fillRect(Math.round(mHx - 1), Math.round(mHy - 1), 2, 2);

      ctx.save();
      ctx.translate(mHx, mHy);
      ctx.rotate(rangedPose.mainWeaponAngle);
      // Dual pistol draws a crisp single pistol in each hand!
      const artId: WeaponId = activeRangedId === 'dual_pistol' ? 'pistol' : activeRangedId;
      drawWeaponPixelArt(ctx, artId, s.rangedWeaponLevel, s.animTime, 0);

      // Crisp live muzzle flash right at each gun's actual barrel tip!
      if (s.rangedTimer > 0.04) {
        const tipX = activeRangedId === 'rifle' ? 18 : activeRangedId === 'shotgun' ? 14 : 9;
        const flashColor =
          activeRangedId === 'rifle'
            ? '#A855F7'
            : activeRangedId === 'shotgun'
              ? '#FACC15'
              : activeRangedId === 'dual_pistol'
                ? '#00F0FF'
                : '#F97316';
        ctx.fillStyle = flashColor;
        ctx.fillRect(tipX, activeRangedId === 'shotgun' ? -4 : -3, activeRangedId === 'shotgun' ? 6 : 5, activeRangedId === 'shotgun' ? 6 : 4);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(tipX + 1, -2, 4, 2);
      }
      ctx.restore();

      // For two-handed Shotgun & Rifle, draw front-hand gauntlet visibly gripping the barrel/pump!
      if (rangedPose.twoHanded) {
        ctx.fillStyle = '#0B0D14';
        ctx.fillRect(Math.round(oHx - 2), Math.round(oHy - 2), 4, 4);
        ctx.fillStyle = pal.glow;
        ctx.fillRect(Math.round(oHx - 1), Math.round(oHy - 1), 2, 2);
      }
    }
  } else {
    // Idle / Running Melee Primary Stance with realistic articulated arm & two-hand brace!
    const wProfile = getWeaponMoveProfile(s.meleeWeaponId);
    const sway = Math.sin(s.animTime * 4.5 + (moving ? s.walkPhase : 0)) * (moving ? 0.14 : 0.04);
    if (isKatanaSheathed) {
      drawWeaponInHand(
        ctx,
        s.meleeWeaponId,
        handShoulderX - 2,
        handShoulderY + 3,
        true,
        pal,
        0,
        s.meleeCombo,
        false,
        0,
        false,
        s.meleeWeaponLevel,
        s.animTime,
        true
      );
    } else {
      const idleHandX = wProfile.heavy ? 5.2 : 6.4;
      const idleHandY = wProfile.heavy ? 2.2 : 1.0 + Math.sin(s.animTime * 4) * 0.5;
      const idleAngle =
        s.meleeWeaponId === 'spear'
          ? -0.22 + sway
          : wProfile.heavy
            ? -0.58 + sway
            : -0.34 + sway;
      const el = solveTwoBoneElbow(idleHandX, idleHandY, 5.2, 5.0, 1);
      const ex = handShoulderX + el.x;
      const ey = handShoulderY + el.y;
      const hx = handShoulderX + idleHandX;
      const hy = handShoulderY + idleHandY;

      drawLimbSegment(ctx, handShoulderX, handShoulderY, ex, ey, 2.7, '#0B0D14', pal.primary);
      drawLimbSegment(ctx, ex, ey, hx, hy, 2.5, '#0B0D14', pal.secondary);
      ctx.fillStyle = '#0B0D14';
      ctx.fillRect(Math.round(hx - 2), Math.round(hy - 2), 4, 4);
      ctx.fillStyle = pal.primary;
      ctx.fillRect(Math.round(hx - 1), Math.round(hy - 1), 2, 2);

      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(idleAngle);
      drawWeaponPixelArt(ctx, s.meleeWeaponId, s.meleeWeaponLevel, s.animTime, 0);
      ctx.restore();

      // Rest second hand on handle for heavy two-handed/polearm weapons even at idle!
      if (wProfile.gripStyle === 'two_hand' || wProfile.gripStyle === 'polearm') {
        const gX = hx + Math.cos(idleAngle) * wProfile.offhandGripOffset;
        const gY = hy + Math.sin(idleAngle) * wProfile.offhandGripOffset;
        ctx.fillStyle = '#0B0D14';
        ctx.fillRect(Math.round(gX - 1.5), Math.round(gY - 1.5), 3, 3);
        ctx.fillStyle = pal.glow;
        ctx.fillRect(Math.round(gX - 1), Math.round(gY - 1), 2, 2);
      }
    }
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
  needle: '#F43F5E',
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
  bow: '#4ADE80',
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
      if (weaponId === 'needle') {
        // Iconic Silksong diagonal dive-needle thrust
        const poke = Math.sin(swingProgress * Math.PI) * 7;
        ctx.rotate(Math.PI * 0.42);
        ctx.translate(poke, 0);
      } else {
        ctx.rotate(Math.PI * 0.5 + (-0.9 + swingProgress * 1.8));
      }
    } else if (weaponId === 'needle') {
      if (comboStep === 3) {
        // Gossamer 3x rapid silk-weave thrusts
        const poke = Math.abs(Math.sin(swingProgress * Math.PI * 3)) * 9;
        ctx.translate(poke, Math.sin(swingProgress * Math.PI * 6) * 1.4);
        ctx.rotate(Math.sin(swingProgress * Math.PI * 3) * 0.22);
      } else if (comboStep === 2) {
        // Thread Lunge: deep forward needle pierce
        const poke = Math.sin(swingProgress * Math.PI) * 10;
        ctx.translate(poke, -0.5);
        ctx.rotate(0.05);
      } else {
        // Silk Lash: whippy sweeping slash
        ctx.rotate(-1.35 + swingProgress * 2.55);
      }
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
      weaponId === 'bow' ||
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
  drawWeaponPixelArt(ctx, weaponId, weaponLevel, animTime);
  ctx.restore();
}

function drawOffhandTwinBlade(ctx: CanvasRenderingContext2D, weaponLevel: number) {
  if (weaponLevel >= 2) {
    ctx.shadowColor = '#A855F7';
    ctx.shadowBlur = weaponLevel === 3 ? 9 : 5;
  }
  ctx.fillStyle = '#FACC15';
  ctx.fillRect(0, -3, 2, 6);
  ctx.fillStyle = '#1E1B4B';
  ctx.fillRect(2, -2, 11, 3);
  ctx.fillStyle = '#A855F7';
  ctx.fillRect(3, -3, 9, 1);
  ctx.fillStyle = '#00F0FF';
  ctx.fillRect(3, 0, 12, 1);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(10, -2, 4, 2);
}

/** Shared pixel-art renderer for all 13 weapons anchored at the hand grip (0, 0) */
export function drawWeaponPixelArt(
  ctx: CanvasRenderingContext2D,
  weaponId: WeaponId,
  weaponLevel = 1,
  animTime = 0,
  bowDraw = 0.6
) {
  const glowColor = WEAPON_GLOW_COLOR[weaponId] ?? '#00F0FF';
  if (weaponLevel >= 2) {
    const pulse = 0.65 + 0.35 * Math.sin(animTime * 9);
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = weaponLevel === 3 ? 11 : 6;
    const glowLen =
      weaponId === 'dagger'
        ? 6
        : weaponId === 'bow'
          ? 7
          : weaponId === 'spear' || weaponId === 'needle'
            ? 22
            : weaponId === 'sword' || weaponId === 'katana'
              ? 17
              : weaponId === 'axe' || weaponId === 'hammer'
                ? 16
                : 12;
    ctx.fillStyle =
      weaponLevel === 3
        ? `rgba(255, 255, 255, ${0.26 + pulse * 0.18})`
        : `rgba(0, 240, 255, ${0.18 + pulse * 0.15})`;
    ctx.fillRect(1, weaponLevel === 3 ? -3 : -2, glowLen, weaponLevel === 3 ? 6 : 4);
  }

  switch (weaponId) {
    case 'needle': {
      const threadWave = Math.sin(animTime * 14) * 2.2;
      ctx.strokeStyle = weaponLevel >= 2 ? '#FFF1F2' : '#FDA4AF';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-4, 0);
      ctx.quadraticCurveTo(-9, threadWave, -14, -threadWave * 0.6);
      ctx.stroke();

      ctx.fillStyle = '#0B0D14';
      ctx.fillRect(-5, -2, 4, 4);
      ctx.fillStyle = '#E2E8F0';
      ctx.fillRect(-4, -1, 2, 2);
      ctx.fillStyle = '#F43F5E';
      ctx.fillRect(-1, -3, 2, 6);
      ctx.fillStyle = '#CBD5E1';
      ctx.fillRect(1, -1, 14, 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(1, -1, 18, 1);
      ctx.fillStyle = weaponLevel >= 2 ? '#F43F5E' : '#FB7185';
      ctx.fillRect(3, 0, 12, 1);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(18, -1, 3, 1);
      break;
    }

    case 'dagger':
      // Ultra-short tactical backup blade (visibly compact close-range sidearm!)
      ctx.fillStyle = '#0B0D14';
      ctx.fillRect(-2, -2, 3, 4);
      ctx.fillStyle = weaponLevel >= 2 ? '#FACC15' : '#64748B';
      ctx.fillRect(-1, -2, 2, 4);
      ctx.fillStyle = weaponLevel >= 3 ? '#FFFFFF' : '#CBD5E1';
      ctx.fillRect(1, -1, 5, 2);
      ctx.fillStyle = weaponLevel >= 2 ? '#00F0FF' : '#38BDF8';
      ctx.fillRect(2, 0, 4, 1);
      break;

    case 'sword':
      // Extended two-handed pommel + broad glowing fuller blade
      ctx.fillStyle = '#0B0D14';
      ctx.fillRect(-5, -1, 5, 3);
      ctx.fillStyle = '#92400E';
      ctx.fillRect(-4, 0, 4, 1);
      ctx.fillStyle = '#0B0D14';
      ctx.fillRect(-1, -4, 3, 8);
      ctx.fillStyle = '#FACC15';
      ctx.fillRect(0, -3, 2, 6);
      ctx.fillStyle = weaponLevel >= 3 ? '#FFFFFF' : '#E2E8F0';
      ctx.fillRect(2, -1, 15, 2);
      ctx.fillStyle = weaponLevel >= 2 ? '#00F0FF' : '#F97316';
      ctx.fillRect(3, 0, 12, 1);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(16, -1, 2, 1);
      break;

    case 'spear':
      ctx.fillStyle = '#0B0D14';
      ctx.fillRect(-8, -1, 23, 3);
      ctx.fillStyle = '#78350F';
      ctx.fillRect(-7, -1, 21, 2);
      ctx.fillStyle = '#FACC15';
      ctx.fillRect(12, -2, 2, 4);
      ctx.fillStyle = weaponLevel >= 2 ? '#00F0FF' : '#E2E8F0';
      ctx.fillRect(14, -2, 5, 4);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(16, -1, 7, 2);
      break;

    case 'katana':
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(-5, -1, 6, 2);
      ctx.fillStyle = '#EF4444';
      ctx.fillRect(-4, -1, 1, 2);
      ctx.fillRect(-2, -1, 1, 2);
      ctx.fillStyle = '#FACC15';
      ctx.fillRect(1, -3, 1, 6);
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(2, -1, 15, 2);
      ctx.fillStyle = weaponLevel >= 2 ? '#EF4444' : '#F87171';
      ctx.fillRect(4, -2, 14, 1);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(10, -2, 8, 1);
      break;

    case 'dual_sword':
      ctx.fillStyle = '#0B0D14';
      ctx.fillRect(-1, -4, 3, 8);
      ctx.fillStyle = '#FACC15';
      ctx.fillRect(0, -3, 2, 6);
      ctx.fillStyle = '#1E1B4B';
      ctx.fillRect(2, -2, 13, 3);
      ctx.fillStyle = '#A855F7';
      ctx.fillRect(3, 1, 9, 1);
      ctx.fillStyle = weaponLevel >= 2 ? '#FFFFFF' : '#00F0FF';
      ctx.fillRect(2, -2, 14, 1);
      ctx.fillStyle = '#00F0FF';
      ctx.fillRect(11, -3, 4, 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(14, -3, 2, 2);
      break;

    case 'axe':
      ctx.fillStyle = '#0B0D14';
      ctx.fillRect(-3, -1, 17, 3);
      ctx.fillStyle = '#78350F';
      ctx.fillRect(-2, -1, 15, 2);
      ctx.fillStyle = '#94A3B8';
      ctx.fillRect(9, -6, 5, 11);
      ctx.fillStyle = weaponLevel >= 2 ? '#FACC15' : '#EF4444';
      ctx.fillRect(13, -5, 2, 9);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(14, -4, 1, 7);
      break;

    case 'hammer':
      ctx.fillStyle = '#0B0D14';
      ctx.fillRect(-4, -1, 15, 3);
      ctx.fillStyle = '#475569';
      ctx.fillRect(-3, -1, 13, 2);
      ctx.fillStyle = '#0B0D14';
      ctx.fillRect(8, -7, 8, 14);
      ctx.fillStyle = '#334155';
      ctx.fillRect(9, -6, 6, 12);
      ctx.fillStyle = weaponLevel >= 2 ? '#00F0FF' : '#A855F7';
      ctx.fillRect(10, -4, 4, 8);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(11, -2, 2, 4);
      break;

    // ── 5 DISTINCT RANGED WEAPONS ───────────────────────────
    case 'pistol':
      // Crisp tactical plasma sidearm with barrel rail & angled grip
      ctx.fillStyle = '#0B0D14';
      ctx.fillRect(-1, -3, 11, 5);
      ctx.fillRect(-1, 1, 4, 4);
      ctx.fillStyle = '#64748B';
      ctx.fillRect(0, -2, 9, 2);
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, 0, 7, 1);
      ctx.fillStyle = weaponLevel >= 2 ? '#00F0FF' : '#F97316';
      ctx.fillRect(5, -2, 4, 1);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(8, -2, 1, 2);
      break;

    case 'dual_pistol':
      // Paired cyber pistols icon/fallback (in active stance each hand renders its own crisp pistol!)
      ctx.fillStyle = '#0B0D14';
      ctx.fillRect(-1, -4, 10, 4);
      ctx.fillRect(-2, 1, 9, 4);
      ctx.fillStyle = '#38BDF8';
      ctx.fillRect(0, -3, 8, 2);
      ctx.fillRect(-1, 2, 7, 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(6, -3, 2, 1);
      ctx.fillRect(4, 2, 2, 1);
      break;

    case 'shotgun':
      // Heavy pump-action Breacher shotgun with wooden stock, pump forend, & wide dual-bore muzzle
      ctx.fillStyle = '#0B0D14';
      ctx.fillRect(-5, -2, 20, 6);
      ctx.fillStyle = '#78350F'; // wood stock
      ctx.fillRect(-4, 0, 5, 3);
      ctx.fillStyle = '#475569'; // receiver
      ctx.fillRect(1, -2, 6, 4);
      ctx.fillStyle = '#94A3B8'; // thick upper barrel
      ctx.fillRect(7, -2, 7, 2);
      ctx.fillStyle = '#B45309'; // tactical pump forend (where off-hand grips!)
      ctx.fillRect(6, 0, 5, 2);
      ctx.fillStyle = '#FACC15'; // glowing energy choke
      ctx.fillRect(12, -2, 2, 3);
      break;

    case 'bow': {
      // Silkstring Recurve Bow: curved dark-jade/ivory recurve limbs + taut drawn silkstring + nocked arrow!
      const pullX = -2 - bowDraw * 5.5;
      // Curved upper & lower recurve limbs
      ctx.strokeStyle = '#0B0D14';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(-2, -10);
      ctx.quadraticCurveTo(5, -5, 1, 0);
      ctx.quadraticCurveTo(5, 5, -2, 10);
      ctx.stroke();

      ctx.strokeStyle = weaponLevel >= 2 ? '#4ADE80' : '#CBD5E1';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-2, -10);
      ctx.quadraticCurveTo(4.5, -5, 1, 0);
      ctx.quadraticCurveTo(4.5, 5, -2, 10);
      ctx.stroke();

      // Gold riser grip + limb tips
      ctx.fillStyle = '#FACC15';
      ctx.fillRect(0, -2, 2, 4);
      ctx.fillRect(-3, -11, 2, 2);
      ctx.fillRect(-3, 9, 2, 2);

      // Animated taut glowing silkstring pulled back to drawing hand!
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-2, -10);
      ctx.lineTo(pullX, 0);
      ctx.lineTo(-2, 10);
      ctx.stroke();

      // Nocked glowing energy arrow (visible whenever bowstring is drawn!)
      if (bowDraw > 0.15) {
        ctx.fillStyle = '#E2E8F0';
        ctx.fillRect(Math.round(pullX), -1, Math.round(9 - pullX), 1);
        ctx.fillStyle = '#4ADE80';
        ctx.fillRect(8, -2, 3, 3);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(10, -1, 2, 1);
      }
      break;
    }

    case 'rifle':
      // Long Ancient-Tech Rail Sniper Rifle with top optic scope & glowing violet/cyan rail coils
      ctx.fillStyle = '#0B0D14';
      ctx.fillRect(-5, -3, 24, 5);
      ctx.fillRect(1, -5, 7, 2); // optic scope silhouette
      ctx.fillStyle = '#334155'; // stock
      ctx.fillRect(-4, -1, 5, 3);
      ctx.fillStyle = '#312E81'; // body chassis
      ctx.fillRect(1, -2, 16, 3);
      ctx.fillStyle = '#00F0FF'; // optic lens & rail strip
      ctx.fillRect(2, -4, 5, 1);
      ctx.fillRect(6, -1, 10, 1);
      ctx.fillStyle = '#A855F7'; // plasma rail muzzle
      ctx.fillRect(16, -2, 3, 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(18, -1, 1, 1);
      break;
  }

  if (weaponLevel >= 3) {
    const maxSpark = weaponId === 'dagger' || weaponId === 'bow' ? 4 : 10;
    const sparkX = 2 + Math.round((animTime * 22) % maxSpark);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(sparkX, -1, 2, 2);
  }
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
