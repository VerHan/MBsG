// ============================================================
// RIFTBOUND: SLAYER CORPS — Silksong-Inspired ParallaxRenderer
// Atmospheric multi-layer Gothic-Silk pixel-art backdrop:
//   - ruins:     Mossy Bell-Outskirts (mossy arches, hanging bells, pale shafts)
//   - foundry:   Deep Dock Forge (molten embers, iron chains, furnace vents)
//   - rift_scar: Citadel Silk-Spire (gilded cathedral spires, crimson silk strands)
// ============================================================

import { GAME_WIDTH, GAME_HEIGHT } from './GameEngine';

export interface ParallaxLayer {
  speed: number;
  canvas: OffscreenCanvas;
  ctx: OffscreenCanvasRenderingContext2D;
  width: number;
}

type ParallaxTheme = 'ruins' | 'foundry' | 'rift_scar';

interface AmbientMote {
  x: number;
  y: number;
  speedX: number;
  speedY: number;
  size: number;
  phase: number;
}

export class ParallaxRenderer {
  private _layers: ParallaxLayer[] = [];
  private _theme: ParallaxTheme = 'ruins';
  private _motes: AmbientMote[] = [];

  constructor() {
    this._initMotes();
  }

  private _initMotes() {
    this._motes = Array.from({ length: 28 }, (_, i) => ({
      x: (i * 47 + 19) % GAME_WIDTH,
      y: (i * 31 + 11) % GAME_HEIGHT,
      speedX: (i % 3 === 0 ? -1 : 1) * (4 + (i % 5) * 2.2),
      speedY: -5 - (i % 4) * 3,
      size: i % 5 === 0 ? 2 : 1,
      phase: i * 0.7,
    }));
  }

  setTheme(theme: ParallaxTheme) {
    this._theme = theme;
    this._layers = [];

    const layerConfigs = [
      { speed: 0.05, width: GAME_WIDTH * 2 },
      { speed: 0.18, width: GAME_WIDTH * 2 },
      { speed: 0.42, width: GAME_WIDTH * 2 },
    ];

    for (const cfg of layerConfigs) {
      const offscreen = new OffscreenCanvas(cfg.width, GAME_HEIGHT);
      const ctx = offscreen.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;
      this._drawLayer(ctx, cfg.width, this._layers.length, theme);
      this._layers.push({
        speed: cfg.speed,
        canvas: offscreen,
        ctx,
        width: cfg.width,
      });
    }
  }

  render(mainCtx: CanvasRenderingContext2D, cameraX: number, cameraY: number, animTime = 0) {
    for (let i = 0; i < this._layers.length; i++) {
      const layer = this._layers[i];
      const drift = i === 0 ? animTime * 2.2 : 0;
      const scrollX = cameraX * layer.speed + drift;
      const offsetX = ((scrollX % layer.width) + layer.width) % layer.width;
      const scrollY = Math.max(0, Math.min(26, cameraY * layer.speed * 0.25));

      mainCtx.drawImage(layer.canvas, -offsetX, -scrollY);
      mainCtx.drawImage(layer.canvas, layer.width - offsetX, -scrollY);
    }

    // Volumetric diagonal cathedral light shafts (Silksong atmosphere)
    this._renderLightShafts(mainCtx, cameraX, animTime);

    // Subtle animated silk threads / rift tear in sky
    this._renderSkyAccents(mainCtx, cameraX, animTime);

    // Floating bioluminescent spores / forge embers / silk wisps
    this._renderAmbientMotes(mainCtx, cameraX, animTime);
  }

  private _renderLightShafts(ctx: CanvasRenderingContext2D, cameraX: number, animTime: number) {
    const shaftColor =
      this._theme === 'ruins'
        ? 'rgba(134, 239, 172, 0.045)'
        : this._theme === 'foundry'
          ? 'rgba(251, 146, 60, 0.055)'
          : 'rgba(244, 63, 94, 0.055)';

    ctx.save();
    for (let i = 0; i < 4; i++) {
      const baseX = ((i * 150 - cameraX * 0.14) % (GAME_WIDTH + 140) + (GAME_WIDTH + 140)) % (GAME_WIDTH + 140) - 70;
      const pulse = 0.75 + 0.25 * Math.sin(animTime * 0.9 + i * 1.6);
      ctx.fillStyle = shaftColor;
      ctx.globalAlpha = pulse;
      ctx.beginPath();
      ctx.moveTo(baseX, 0);
      ctx.lineTo(baseX + 34, 0);
      ctx.lineTo(baseX - 28, GAME_HEIGHT);
      ctx.lineTo(baseX - 66, GAME_HEIGHT);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  private _renderSkyAccents(ctx: CanvasRenderingContext2D, cameraX: number, animTime: number) {
    ctx.save();
    if (this._theme === 'rift_scar') {
      // Crimson-violet Rift seam + gleaming silk threads across the chasm
      const pulse = 0.26 + 0.18 * Math.sin(animTime * 2.4);
      ctx.strokeStyle = '#F43F5E';
      ctx.globalAlpha = pulse;
      ctx.lineWidth = 2;
      const rx = 310 - ((cameraX * 0.06) % 240);
      ctx.beginPath();
      ctx.moveTo(rx, 10);
      ctx.lineTo(rx - 14, 42);
      ctx.lineTo(rx + 8, 68);
      ctx.lineTo(rx - 12, 102);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 241, 242, 0.14)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        const sx = ((i * 185 - cameraX * 0.24) % GAME_WIDTH + GAME_WIDTH) % GAME_WIDTH;
        const sway = Math.sin(animTime * 1.8 + i) * 4;
        ctx.beginPath();
        ctx.moveTo(sx, 0);
        ctx.quadraticCurveTo(sx + sway, 65, sx - 8, 125);
        ctx.stroke();
      }
    } else if (this._theme === 'ruins') {
      // Gently swaying moss silk filaments from upper cavern canopy
      ctx.strokeStyle = 'rgba(187, 247, 208, 0.18)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        const sx = ((i * 135 - cameraX * 0.28) % GAME_WIDTH + GAME_WIDTH) % GAME_WIDTH;
        const sway = Math.sin(animTime * 1.6 + i * 1.4) * 5;
        ctx.beginPath();
        ctx.moveTo(sx, 0);
        ctx.quadraticCurveTo(sx + sway, 40, sx + sway * 1.3, 84);
        ctx.stroke();
      }
    } else {
      // Foundry glowing furnace heat haze at bottom
      const glow = 0.12 + 0.06 * Math.sin(animTime * 3.1);
      const grad = ctx.createLinearGradient(0, GAME_HEIGHT - 55, 0, GAME_HEIGHT);
      grad.addColorStop(0, 'rgba(249, 115, 22, 0)');
      grad.addColorStop(1, `rgba(234, 88, 12, ${glow})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, GAME_HEIGHT - 55, GAME_WIDTH, 55);
    }
    ctx.restore();
  }

  private _renderAmbientMotes(ctx: CanvasRenderingContext2D, cameraX: number, animTime: number) {
    const color =
      this._theme === 'ruins'
        ? '#86EFAC'
        : this._theme === 'foundry'
          ? '#FB923C'
          : '#FDA4AF';
    const altColor =
      this._theme === 'ruins'
        ? '#E0F2FE'
        : this._theme === 'foundry'
          ? '#FACC15'
          : '#E9D5FF';

    ctx.save();
    for (let i = 0; i < this._motes.length; i++) {
      const m = this._motes[i];
      const rawX = m.x + animTime * m.speedX - cameraX * 0.25 + Math.sin(animTime * 1.5 + m.phase) * 6;
      const rawY = m.y + animTime * m.speedY;
      const px = ((rawX % GAME_WIDTH) + GAME_WIDTH) % GAME_WIDTH;
      const py = ((rawY % GAME_HEIGHT) + GAME_HEIGHT) % GAME_HEIGHT;
      const alpha = 0.25 + 0.45 * (0.5 + 0.5 * Math.sin(animTime * 3.2 + m.phase));

      ctx.globalAlpha = alpha;
      ctx.fillStyle = i % 3 === 0 ? altColor : color;
      ctx.fillRect(Math.round(px), Math.round(py), m.size, m.size);
    }
    ctx.restore();
  }

  private _drawLayer(
    ctx: OffscreenCanvasRenderingContext2D,
    width: number,
    layerIndex: number,
    theme: ParallaxTheme
  ) {
    const h = GAME_HEIGHT;
    if (layerIndex === 0) this._drawSky(ctx, width, h, theme);
    else if (layerIndex === 1) this._drawMidFar(ctx, width, h, theme);
    else this._drawMidNear(ctx, width, h, theme);
  }

  private _drawSky(
    ctx: OffscreenCanvasRenderingContext2D,
    w: number,
    h: number,
    theme: ParallaxTheme
  ) {
    const colors = {
      ruins: { top: '#070D0F', mid: '#0F1D21', bottom: '#172A2C' },
      foundry: { top: '#11090C', mid: '#1E1117', bottom: '#2F1619' },
      rift_scar: { top: '#0B0714', mid: '#1B102B', bottom: '#2B1336' },
    }[theme];

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, colors.top);
    grad.addColorStop(0.58, colors.mid);
    grad.addColorStop(1, colors.bottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Distant pale moon / cathedral rose-window glow
    const moonX = Math.floor(w * 0.24);
    const moonY = 54;
    const moonGlow = ctx.createRadialGradient(moonX, moonY, 4, moonX, moonY, 64);
    moonGlow.addColorStop(
      0,
      theme === 'ruins'
        ? 'rgba(187, 247, 208, 0.22)'
        : theme === 'foundry'
          ? 'rgba(251, 146, 60, 0.22)'
          : 'rgba(244, 63, 94, 0.24)'
    );
    moonGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = moonGlow;
    ctx.fillRect(moonX - 64, moonY - 64, 128, 128);

    // Distant cavern stars / hanging silk lanterns
    ctx.fillStyle =
      theme === 'ruins'
        ? 'rgba(187, 247, 208, 0.28)'
        : theme === 'foundry'
          ? 'rgba(254, 215, 170, 0.26)'
          : 'rgba(253, 164, 175, 0.28)';
    for (let i = 0; i < 46; i++) {
      const sx = (i * 73) % w;
      const sy = (i * 37) % Math.floor(h * 0.52);
      ctx.fillRect(sx, sy, 1, 1);
    }

    // Distant Citadel Spires (Silksong Pharloom-inspired vertical silhouettes)
    const spireColor =
      theme === 'ruins' ? '#0D181B' : theme === 'foundry' ? '#190E12' : '#140B21';
    ctx.fillStyle = spireColor;
    for (let sx = 40; sx < w; sx += 160) {
      const sh = 90 + ((sx * 17) % 65);
      // Tapered gothic spire
      ctx.fillRect(sx, h - sh, 26, sh);
      ctx.fillRect(sx + 5, h - sh - 22, 16, 22);
      ctx.fillRect(sx + 10, h - sh - 44, 6, 22);
      ctx.fillRect(sx + 12, h - sh - 58, 2, 14);
      // Small lit chapel window
      ctx.fillStyle =
        theme === 'ruins' ? '#4ADE80' : theme === 'foundry' ? '#F97316' : '#FACC15';
      ctx.globalAlpha = 0.45;
      ctx.fillRect(sx + 11, h - sh + 12, 4, 9);
      ctx.globalAlpha = 1;
      ctx.fillStyle = spireColor;
    }

    // Soft mist ribbon
    ctx.fillStyle =
      theme === 'ruins'
        ? 'rgba(34, 66, 62, 0.25)'
        : theme === 'foundry'
          ? 'rgba(67, 24, 24, 0.28)'
          : 'rgba(68, 22, 74, 0.25)';
    for (let cx = 0; cx < w; cx += 110) {
      ctx.fillRect(cx, 92 + (cx % 18), 86, 8);
    }
  }

  private _drawMidFar(
    ctx: OffscreenCanvasRenderingContext2D,
    w: number,
    h: number,
    theme: ParallaxTheme
  ) {
    const rockCol =
      theme === 'ruins' ? '#0C1518' : theme === 'foundry' ? '#160D11' : '#120A1E';
    const archCol =
      theme === 'ruins' ? '#132226' : theme === 'foundry' ? '#231419' : '#1E1130';
    const accent =
      theme === 'ruins' ? '#4ADE80' : theme === 'foundry' ? '#F97316' : '#F43F5E';

    // Cavern ridges
    ctx.fillStyle = rockCol;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 48) {
      const peak = 52 + ((x * 31) % 62);
      ctx.lineTo(x, h - peak);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    // Gothic Pointed Arches & Hanging Giant Bells (Silksong signature motif)
    for (let ax = 30; ax < w; ax += 190) {
      ctx.fillStyle = archCol;
      // Twin columns
      ctx.fillRect(ax, h - 185, 16, 185);
      ctx.fillRect(ax + 86, h - 185, 16, 185);
      // Pointed gothic arch beam
      ctx.fillRect(ax - 4, h - 194, 110, 10);
      ctx.fillRect(ax + 12, h - 204, 78, 10);
      ctx.fillRect(ax + 32, h - 214, 38, 10);

      // Hanging Giant Ancient Bell suspended inside the arch
      ctx.fillStyle = '#090B10';
      ctx.fillRect(ax + 50, h - 184, 2, 26); // chain
      ctx.fillStyle = theme === 'foundry' ? '#3B231E' : '#1E293B';
      ctx.fillRect(ax + 42, h - 158, 18, 14);
      ctx.fillRect(ax + 39, h - 144, 24, 6);
      ctx.fillRect(ax + 49, h - 138, 4, 4); // clapper
      // Bell rim highlight
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.25;
      ctx.fillRect(ax + 40, h - 141, 22, 1);
      ctx.globalAlpha = 1;

      // Tattered silk banner hanging on left pillar
      ctx.fillStyle =
        theme === 'ruins' ? '#14532D' : theme === 'foundry' ? '#7C2D12' : '#881337';
      ctx.fillRect(ax + 3, h - 165, 10, 44);
      ctx.fillRect(ax + 5, h - 121, 6, 14);
      ctx.fillRect(ax + 7, h - 107, 2, 8);
    }
  }

  private _drawMidNear(
    ctx: OffscreenCanvasRenderingContext2D,
    w: number,
    h: number,
    theme: ParallaxTheme
  ) {
    const pillarCol =
      theme === 'ruins' ? '#17262B' : theme === 'foundry' ? '#27171B' : '#211333';
    const pillarHi =
      theme === 'ruins' ? '#233A40' : theme === 'foundry' ? '#3E2326' : '#351F52';
    const glow =
      theme === 'ruins' ? '#4ADE80' : theme === 'foundry' ? '#FB923C' : '#F43F5E';

    for (let px = 44; px < w; px += 220) {
      // Carved Gothic Pillar
      ctx.fillStyle = pillarCol;
      ctx.fillRect(px, h - 178, 22, 178);
      ctx.fillRect(px - 6, h - 186, 34, 8);
      ctx.fillRect(px - 4, h - 14, 30, 14);
      // Rim edge highlight
      ctx.fillStyle = pillarHi;
      ctx.fillRect(px + 2, h - 178, 4, 178);

      // Hanging Iron Chain + Glowing Cage Lantern
      ctx.fillStyle = '#1E2430';
      for (let cy = 6; cy < 96; cy += 6) {
        ctx.fillRect(px + 98, cy, 2, 4);
      }
      ctx.fillStyle = '#0F131A';
      ctx.fillRect(px + 94, 96, 10, 12);
      ctx.fillStyle = glow;
      ctx.globalAlpha = 0.7;
      ctx.fillRect(px + 96, 99, 6, 6);
      ctx.globalAlpha = 0.14;
      ctx.beginPath();
      ctx.arc(px + 99, 102, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      if (theme === 'ruins') {
        // Hanging moss vines along pillar capital
        ctx.fillStyle = '#166534';
        ctx.fillRect(px - 4, h - 178, 5, 22);
        ctx.fillRect(px + 18, h - 178, 4, 34);
        ctx.fillStyle = '#22C55E';
        ctx.fillRect(px + 19, h - 174, 2, 16);
      } else if (theme === 'foundry') {
        // Molten furnace pipe + glowing lava slit
        ctx.fillStyle = '#38221D';
        ctx.fillRect(px + 126, h - 88, 68, 8);
        ctx.fillStyle = '#F97316';
        ctx.globalAlpha = 0.35;
        ctx.fillRect(px + 148, h - 80, 5, 42);
        ctx.fillStyle = '#FACC15';
        ctx.fillRect(px + 150, h - 80, 1, 42);
        ctx.globalAlpha = 1;
      } else {
        // Woven silver-crimson silk strands spanning between pillars
        ctx.strokeStyle = 'rgba(255, 228, 230, 0.18)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px + 22, h - 150);
        ctx.quadraticCurveTo(px + 110, h - 115, px + 220, h - 160);
        ctx.stroke();
      }
    }

    // Layered ground mist
    ctx.fillStyle =
      theme === 'ruins'
        ? 'rgba(74, 222, 128, 0.055)'
        : theme === 'foundry'
          ? 'rgba(249, 115, 22, 0.06)'
          : 'rgba(244, 63, 94, 0.06)';
    ctx.fillRect(0, h - 30, w, 30);
    ctx.fillStyle = 'rgba(11, 13, 20, 0.25)';
    ctx.fillRect(0, h - 12, w, 12);
  }
}
