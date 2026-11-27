// ============================================================
// RIFTBOUND: SLAYER CORPS — ParallaxRenderer
// 4-layer seamless horizontal looping parallax background
// with animated Rift energy glow and drifting cloud bands.
// ============================================================

import { GAME_WIDTH, GAME_HEIGHT } from './GameEngine';

export interface ParallaxLayer {
  speed: number;
  canvas: OffscreenCanvas;
  ctx: OffscreenCanvasRenderingContext2D;
  width: number;
}

type ParallaxTheme = 'ruins' | 'foundry' | 'rift_scar';

export class ParallaxRenderer {
  private _layers: ParallaxLayer[] = [];
  private _theme: ParallaxTheme = 'ruins';

  setTheme(theme: ParallaxTheme) {
    this._theme = theme;
    this._layers = [];

    const layerConfigs = [
      { speed: 0.06, width: GAME_WIDTH * 2 },
      { speed: 0.22, width: GAME_WIDTH * 2 },
      { speed: 0.48, width: GAME_WIDTH * 2 },
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
      const drift = i === 0 ? animTime * 4 : 0;
      const scrollX = cameraX * layer.speed + drift;
      const offsetX = ((scrollX % layer.width) + layer.width) % layer.width;
      const scrollY = Math.max(0, Math.min(24, cameraY * layer.speed * 0.25));

      mainCtx.drawImage(layer.canvas, -offsetX, -scrollY);
      mainCtx.drawImage(layer.canvas, layer.width - offsetX, -scrollY);
    }

    // Animated pulsing Rift tear overlay in the distant sky
    const riftPulse = 0.22 + 0.18 * Math.sin(animTime * 2.5);
    mainCtx.save();
    mainCtx.strokeStyle = this._theme === 'ruins' ? '#00F0FF' : '#A855F7';
    mainCtx.globalAlpha = riftPulse;
    mainCtx.lineWidth = 2;
    const rx = 310 - ((cameraX * 0.06) % 240);
    mainCtx.beginPath();
    mainCtx.moveTo(rx, 14);
    mainCtx.lineTo(rx - 14, 42);
    mainCtx.lineTo(rx + 8, 66);
    mainCtx.lineTo(rx - 10, 96);
    mainCtx.stroke();
    mainCtx.restore();
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
      ruins: { top: '#080A12', mid: '#111626', bottom: '#1B2236' },
      foundry: { top: '#0C0816', mid: '#1A112B', bottom: '#26173C' },
      rift_scar: { top: '#080B18', mid: '#191038', bottom: '#2B124C' },
    }[theme];

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, colors.top);
    grad.addColorStop(0.55, colors.mid);
    grad.addColorStop(1, colors.bottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Distant dim stars / Mana spores
    ctx.fillStyle = 'rgba(200, 230, 255, 0.25)';
    for (let i = 0; i < 40; i++) {
      const sx = (i * 73) % w;
      const sy = (i * 37) % (h * 0.55);
      ctx.fillRect(sx, sy, 1, 1);
    }

    // Floating Islands in the Sky Sanctuary
    const drawIsland = (ix: number, iy: number, iw: number) => {
      ctx.fillStyle = '#191F30';
      ctx.fillRect(ix, iy, iw, 8);
      ctx.fillRect(ix + 8, iy - 6, iw - 16, 6);
      // Citadel towers on top
      ctx.fillStyle = '#232B42';
      ctx.fillRect(ix + Math.floor(iw * 0.35), iy - 18, 10, 12);
      ctx.fillRect(ix + Math.floor(iw * 0.55), iy - 14, 8, 8);
      // Bottom rock taper
      ctx.fillStyle = '#131826';
      ctx.fillRect(ix + 6, iy + 8, iw - 12, 8);
      ctx.fillRect(ix + 16, iy + 16, iw - 32, 10);
      // Tiny sanctuary lights
      ctx.fillStyle = '#FACC15';
      ctx.fillRect(ix + Math.floor(iw * 0.38), iy - 14, 2, 2);
      ctx.fillRect(ix + Math.floor(iw * 0.57), iy - 10, 2, 2);
    };

    drawIsland(140, 42, 74);
    drawIsland(620, 32, 92);

    // Cloud band
    ctx.fillStyle = 'rgba(18, 24, 40, 0.6)';
    for (let cx = 0; cx < w; cx += 90) {
      ctx.fillRect(cx, 78 + (cx % 14), 68, 6);
    }
  }

  private _drawMidFar(
    ctx: OffscreenCanvasRenderingContext2D,
    w: number,
    h: number,
    theme: ParallaxTheme
  ) {
    // Jagged distant mountains
    ctx.fillStyle = '#0F131D';
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 60) {
      const peak = 55 + ((x * 29) % 55);
      ctx.lineTo(x, h - peak);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    // Ruined Ancient Tech towers & viaducts
    const accent = theme === 'foundry' ? '#A855F7' : '#00F0FF';
    for (let tx = 70; tx < w; tx += 220) {
      ctx.fillStyle = '#141926';
      ctx.fillRect(tx, h - 185, 34, 185);
      ctx.fillRect(tx - 8, h - 196, 50, 12);
      ctx.fillRect(tx + 4, h - 210, 14, 14);
      // Glowing slit window
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.35;
      ctx.fillRect(tx + 15, h - 170, 3, 28);
      ctx.globalAlpha = 1;
    }

    // Broken aqueduct arches
    ctx.fillStyle = '#121622';
    ctx.fillRect(190, h - 105, 160, 14);
    ctx.fillRect(210, h - 91, 16, 91);
    ctx.fillRect(310, h - 91, 16, 91);
  }

  private _drawMidNear(
    ctx: OffscreenCanvasRenderingContext2D,
    w: number,
    h: number,
    theme: ParallaxTheme
  ) {
    const glow = theme === 'rift_scar' ? '#A855F7' : '#00F0FF';

    // Gothic pillars + chains + leaking pipes
    for (let px = 40; px < w; px += 240) {
      ctx.fillStyle = '#1B202C';
      ctx.fillRect(px, h - 168, 20, 168);
      ctx.fillRect(px - 5, h - 176, 30, 8);
      ctx.fillStyle = '#252B3B';
      ctx.fillRect(px + 3, h - 168, 4, 168);

      // Hanging chain
      ctx.fillStyle = '#2B2F3A';
      for (let cy = 10; cy < 110; cy += 7) {
        ctx.fillRect(px + 95, cy, 3, 5);
      }

      // Mana conduit pipe
      ctx.fillStyle = '#332C28';
      ctx.fillRect(px + 130, h - 86, 70, 7);
      ctx.fillStyle = glow;
      ctx.globalAlpha = 0.3;
      ctx.fillRect(px + 150, h - 79, 4, 38);
      ctx.globalAlpha = 1;
    }

    // Ground-level toxic Mana mist
    ctx.fillStyle = 'rgba(0, 240, 255, 0.05)';
    ctx.fillRect(0, h - 26, w, 26);
    ctx.fillStyle = 'rgba(168, 85, 247, 0.05)';
    ctx.fillRect(0, h - 14, w, 14);
  }
}
