// ============================================================
// RIFTBOUND: SLAYER CORPS — Diegetic Slayer Helm HUD
// ============================================================

import {
  Crosshair,
  Gamepad2,
  Heart,
  Package,
  Pause,
  Shield,
  Sparkles,
  Sword,
  Zap,
} from 'lucide-react';
import type { HudSnapshot } from '../engine/GameEngine';
import { ARMORS } from '../data/armors';
import { WEAPONS } from '../data/weapons';

interface HUDProps {
  hud: HudSnapshot;
  toast: string | null;
  areaBanner: { name: string; subtitle: string } | null;
  showTouchControls: boolean;
  onToggleTouchControls: () => void;
  onOpenInventory: () => void;
  onPause: () => void;
}

const RANK_COLORS: Record<string, string> = {
  D: 'text-slate-400 border-slate-600',
  C: 'text-loot-green border-loot-green/60',
  B: 'text-mana-cyan border-mana-cyan/60',
  A: 'text-mana-purple border-mana-purple/70',
  S: 'text-loot-gold border-loot-gold',
  SS: 'text-slayer-orange border-slayer-orange',
  SSS: 'text-slayer-red border-slayer-red animate-pulse',
};

export function HUD({
  hud,
  toast,
  areaBanner,
  showTouchControls,
  onToggleTouchControls,
  onOpenInventory,
  onPause,
}: HUDProps) {
  const hpPct = Math.max(0, Math.min(100, (hud.hp / hud.maxHp) * 100));
  const enPct = Math.max(0, Math.min(100, (hud.energy / hud.maxEnergy) * 100));
  const pylonPct =
    hud.pylonMaxHp > 0 ? Math.max(0, Math.min(100, (hud.pylonHp / hud.pylonMaxHp) * 100)) : 0;

  const meleeDef = WEAPONS[hud.meleeWeapon.defId];
  const rangedDef = hud.rangedWeapon ? WEAPONS[hud.rangedWeapon.defId] : null;
  const armorDef = ARMORS[hud.armorId];

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-2.5 sm:p-3 text-xs select-none">
      {/* ── TOP BAR ── */}
      <div className="flex items-start justify-between gap-2">
        {/* Top-Left: Vitals & Armor */}
        <div className="w-48 sm:w-64 border border-ancient-stone bg-abyss-950/85 p-2 sm:p-2.5 backdrop-blur-sm">
          <div className="mb-1 flex items-center justify-between text-[10px] text-slate-400">
            <span className="truncate font-bold text-slate-200">{armorDef?.name}</span>
            <span className="text-loot-gold font-bold">{hud.shards} SHARDS</span>
          </div>

          <div className="mb-1">
            <div className="mb-0.5 flex justify-between text-[10px]">
              <span className="flex items-center gap-1 text-slayer-red font-bold">
                <Heart className="h-3 w-3" /> HP
              </span>
              <span>
                {hud.hp}/{hud.maxHp}
              </span>
            </div>
            <div className="h-2 w-full bg-abyss-900 border border-ancient-stone">
              <div
                className="h-full bg-gradient-to-r from-slayer-red to-slayer-orange transition-all duration-100"
                style={{ width: `${hpPct}%` }}
              />
            </div>
          </div>

          <div className="mb-1.5">
            <div className="mb-0.5 flex justify-between text-[10px]">
              <span className="flex items-center gap-1 text-mana-cyan font-bold">
                <Zap className="h-3 w-3" /> EN
              </span>
              <span>
                {hud.energy}/{hud.maxEnergy}
              </span>
            </div>
            <div className="h-1.5 w-full bg-abyss-900 border border-ancient-stone">
              <div
                className="h-full bg-gradient-to-r from-mana-purple to-mana-cyan transition-all duration-100"
                style={{ width: `${enPct}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 text-[10px]">
            <span className="text-loot-green font-semibold">
              [Q] Vial: {hud.nanoVials}/{hud.maxNanoVials}
            </span>
            <span className="text-loot-gold font-semibold">
              [R] Ammo: {hud.ammoPacks}/{hud.maxAmmoPacks}
            </span>
          </div>
          {hud.manaShieldTimer > 0 && (
            <div className="mt-0.5 text-[10px] text-mana-cyan font-bold animate-pulse">
              SHIELD {hud.manaShieldTimer.toFixed(1)}s
            </div>
          )}
        </div>

        {/* Top-Center: Area / Mode Objective / Timer / Pylon HP / Boss HP */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="border border-ancient-stone bg-abyss-950/85 px-3 py-1.5 text-center backdrop-blur-sm">
            <div className="text-[9px] font-bold tracking-widest text-loot-gold uppercase">
              STAGE {hud.stageNumber} · {hud.themeTopic}
            </div>
            <div className="text-[10px] font-bold tracking-wider text-mana-cyan uppercase">
              {hud.areaName}
            </div>

            {hud.mode === 'survival' && (
              <div
                className={`mt-1 font-pixel text-base sm:text-lg ${
                  hud.timer <= 15 ? 'text-slayer-red animate-pulse' : 'text-loot-gold'
                }`}
              >
                {Math.ceil(hud.timer)}s
              </div>
            )}

            {hud.mode === 'defense' && (
              <div className="mt-1 w-48 sm:w-64">
                <div className="mb-0.5 flex justify-between text-[10px] font-bold">
                  <span className="flex items-center gap-1 text-mana-cyan">
                    <Shield className="h-3 w-3" /> PYLON
                  </span>
                  <span>
                    {hud.pylonHp}/{hud.pylonMaxHp}
                  </span>
                </div>
                <div className="h-2 w-full border border-mana-cyan/50 bg-abyss-900">
                  <div
                    className={`h-full transition-all duration-150 ${
                      pylonPct < 30 ? 'bg-slayer-red' : 'bg-mana-cyan'
                    }`}
                    style={{ width: `${pylonPct}%` }}
                  />
                </div>
                <div className="mt-0.5 flex justify-between text-[10px] text-slate-400">
                  <span>
                    Wave {hud.currentWave}/{hud.totalWaves}
                  </span>
                  <span>Musuh: {hud.enemiesRemaining}</span>
                  {hud.turretTimer > 0 && (
                    <span className="text-loot-green">Turret {Math.ceil(hud.turretTimer)}s</span>
                  )}
                </div>
              </div>
            )}

            {hud.mode === 'traverse' && (
              <div className="mt-1 w-44 sm:w-56">
                <div className="mb-0.5 flex justify-between text-[9px] text-slate-400">
                  <span>Progres Sektor</span>
                  <span className="text-loot-gold">{hud.progressPct}%</span>
                </div>
                <div className="h-1.5 w-full bg-abyss-900 border border-ancient-stone">
                  <div
                    className="h-full bg-loot-gold transition-all duration-150"
                    style={{ width: `${hud.progressPct}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {hud.boss && (
            <div className="w-64 sm:w-80 border-2 border-slayer-red/80 bg-abyss-950/90 px-3 py-1.5 shadow-xl">
              <div className="mb-0.5 flex items-center justify-between text-[10px] font-bold">
                <span className="text-slayer-red uppercase">
                  BOSS: {hud.boss.name}
                  {hud.boss.stunned ? ' [STUNNED!]' : ''}
                </span>
                <span className="text-slate-200">
                  {hud.boss.hp}/{hud.boss.maxHp}
                </span>
              </div>
              <div className="h-2.5 w-full border border-slayer-red/60 bg-abyss-900">
                <div
                  className="h-full bg-gradient-to-r from-slayer-red to-mana-purple transition-all duration-100"
                  style={{ width: `${Math.max(0, (hud.boss.hp / hud.boss.maxHp) * 100)}%` }}
                />
              </div>
              {hud.boss.shieldActive && (
                <div className="mt-1">
                  <div className="flex justify-between text-[9px] font-bold text-mana-cyan">
                    <span>PERISAI MANA (Gunakan Runic Pillar [E]!)</span>
                    <span>
                      {hud.boss.shieldHp}/{hud.boss.shieldMaxHp}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-abyss-900">
                    <div
                      className="h-full bg-mana-cyan"
                      style={{
                        width: `${Math.max(
                          0,
                          (hud.boss.shieldHp / Math.max(1, hud.boss.shieldMaxHp)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {areaBanner && (
            <div className="border-y-2 border-mana-cyan bg-abyss-950/90 px-6 py-2 text-center shadow-2xl">
              <div className="font-pixel text-xs text-mana-cyan">{areaBanner.name}</div>
              {areaBanner.subtitle && (
                <div className="mt-1 text-[10px] text-slate-300">{areaBanner.subtitle}</div>
              )}
            </div>
          )}

          {toast && (
            <div className="border border-loot-gold/70 bg-abyss-950/95 px-3 py-1 text-[11px] font-semibold text-loot-gold shadow-lg">
              {toast}
            </div>
          )}
        </div>

        {/* Top-Right: Style Rank, Adrenaline & Quick Menu */}
        <div className="flex items-start gap-1.5 sm:gap-2">
          <div className="hidden sm:block border border-ancient-stone bg-abyss-950/85 p-2 text-center backdrop-blur-sm">
            <div className="text-[9px] tracking-wider text-slate-400">STYLE</div>
            <div
              className={`mt-0.5 border px-2 py-0.5 font-pixel text-sm ${
                RANK_COLORS[hud.styleRank] ?? RANK_COLORS.D
              }`}
            >
              {hud.styleRank}
            </div>
            <div className="mt-1 w-16">
              <div className="flex justify-between text-[9px] text-slayer-orange">
                <span>ADR</span>
                <span>{hud.adrenalineActive ? 'ON' : `${hud.adrenaline}%`}</span>
              </div>
              <div className="h-1.5 w-full bg-abyss-900 border border-ancient-stone">
                <div
                  className="h-full bg-slayer-orange"
                  style={{ width: `${hud.adrenalineActive ? 100 : hud.adrenaline}%` }}
                />
              </div>
            </div>
          </div>

          <div className="pointer-events-auto flex flex-col gap-1">
            <button
              type="button"
              onClick={onPause}
              className="flex items-center gap-1 border border-ancient-stone bg-abyss-950/90 px-2 py-1 text-[10px] text-slate-200 hover:border-mana-cyan"
            >
              <Pause className="h-3.5 w-3.5" /> [ESC]
            </button>
            <button
              type="button"
              onClick={onOpenInventory}
              className="flex items-center gap-1 border border-ancient-stone bg-abyss-950/90 px-2 py-1 text-[10px] text-loot-gold hover:border-loot-gold"
            >
              <Package className="h-3.5 w-3.5" /> [I] GEAR
            </button>
            <button
              type="button"
              onClick={onToggleTouchControls}
              title="Toggle Mobile Touch Controls"
              className={`flex items-center gap-1 border px-2 py-1 text-[10px] ${
                showTouchControls
                  ? 'border-mana-cyan bg-mana-cyan/15 text-mana-cyan'
                  : 'border-ancient-stone bg-abyss-950/90 text-slate-400 hover:text-white'
              }`}
            >
              <Gamepad2 className="h-3.5 w-3.5" /> TOUCH
            </button>
          </div>
        </div>
      </div>

      {/* ── BOTTOM BAR ── */}
      <div className="flex items-end justify-between gap-3">
        <div className="flex gap-2">
          <div className="border border-slayer-orange/60 bg-abyss-950/85 px-2 py-1 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-2 text-[9px] font-bold text-slayer-orange">
              <span className="flex items-center gap-1">
                <Sword className="h-3 w-3" /> [J] TAP HIT · HOLD BLOK
              </span>
              {hud.isBlocking ? (
                <span className="text-mana-cyan animate-pulse">BLOCK!</span>
              ) : hud.counterReady ? (
                <span className="text-loot-gold animate-pulse">COUNTER!</span>
              ) : hud.meleeCombo > 0 ? (
                <span className="text-loot-gold">x{hud.meleeCombo}</span>
              ) : null}
            </div>
            <div className="text-[10px] font-semibold text-white">
              {meleeDef?.name}{' '}
              <span
                className={`text-[9px] font-bold uppercase ${
                  (hud.meleeWeapon.level ?? 1) >= 3
                    ? 'text-loot-gold'
                    : (hud.meleeWeapon.level ?? 1) === 2
                      ? 'text-mana-cyan'
                      : 'text-slate-400'
                }`}
              >
                Lv.{hud.meleeWeapon.level ?? 1}
                {(hud.meleeWeapon.level ?? 1) >= 2 ? ' ★' : ''} ({hud.meleeWeapon.tier})
              </span>
            </div>
          </div>
          <div className="border border-mana-cyan/60 bg-abyss-950/85 px-2 py-1 backdrop-blur-sm">
            {hud.rangedWeapon && rangedDef ? (
              <>
                <div className="flex items-center gap-1 text-[9px] font-bold text-mana-cyan">
                  <Crosshair className="h-3 w-3" /> [K] RANGED (1H)
                </div>
                <div className="text-[10px] font-semibold text-white">
                  {rangedDef.name}{' '}
                  <span className="text-[9px] uppercase text-mana-purple">
                    Lv.{hud.rangedWeapon.level ?? 1} ({hud.rangedWeapon.tier})
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1 text-[9px] font-bold text-slayer-orange">
                  <Shield className="h-3 w-3" /> OFF-HAND (2H)
                </div>
                <div className="text-[10px] font-semibold text-mana-cyan">
                  {hud.hasFullShield
                    ? 'Energy Shield (Full Guard)'
                    : hud.meleeWeapon.defId === 'dual_sword'
                      ? 'Twin Blade (No Gun)'
                      : 'Melee Focus (No Gun)'}
                </div>
              </>
            )}
          </div>
        </div>

        {hud.interactPrompt && (
          <div className="hidden sm:flex items-center gap-1.5 border-2 border-loot-gold bg-abyss-950/95 px-4 py-1.5 text-xs font-bold text-loot-gold shadow-lg animate-bounce">
            <Sparkles className="h-3.5 w-3.5" />
            {hud.interactPrompt}
          </div>
        )}

        <div className="hidden border border-ancient-stone bg-abyss-950/80 px-2.5 py-1 text-[10px] text-slate-400 lg:block">
          <span className="text-slate-200">A/D</span> Gerak ·{' '}
          <span className="text-slate-200">Space</span> Jump/2x ·{' '}
          <span className="text-slate-200">Tap J</span> Combo ·{' '}
          <span className="text-slate-200">Hold J</span> Blok ·{' '}
          <span className="text-slate-200">E</span> Interaksi
        </div>
      </div>
    </div>
  );
}
