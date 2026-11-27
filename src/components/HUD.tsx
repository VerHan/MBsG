// ============================================================
// RIFTBOUND: SLAYER CORPS — Mobile-First Diegetic Slayer HUD
// Compact corner clusters keeping >= 85% of the playfield clear,
// zero backdrop-blur over live canvas, tabular numerals, and
// clean responsive adaptation for portrait & landscape phones.
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
import { DAMAGE_TYPE_LABEL, WEAPONS } from '../data/weapons';

interface HUDProps {
  hud: HudSnapshot;
  toast: string | null;
  areaBanner: { name: string; subtitle: string } | null;
  showTouchControls: boolean;
  compactMobile?: boolean;
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
  compactMobile = false,
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

  const hideBottomOverlayCards = showTouchControls || compactMobile;

  return (
    <div
      className={`pointer-events-none absolute inset-0 flex flex-col justify-between select-none ${
        compactMobile ? 'p-1.5 text-[11px]' : 'p-2.5 text-xs'
      }`}
    >
      {/* ── TOP BAR (3 Compact Corner Clusters, <= 14% Height on Mobile) ── */}
      <div className="flex items-start justify-between gap-1.5 sm:gap-2">
        {/* Top-Left: Vitals & Shards */}
        <div
          className={`border border-ancient-stone/90 bg-abyss-950/90 ${
            compactMobile ? 'w-[138px] px-2 py-1' : 'w-56 p-2'
          }`}
        >
          <div className="mb-0.5 flex items-center justify-between gap-1 text-[9px] text-slate-400 tabular-nums">
            <span className="truncate font-bold text-slate-200">{armorDef?.name}</span>
            <span className="flex shrink-0 items-center gap-1 font-bold">
              <span className="text-loot-gold">{hud.shards}◈</span>
              {compactMobile && (
                <span
                  className={`border px-1 text-[8px] font-pixel leading-tight ${
                    RANK_COLORS[hud.styleRank] ?? RANK_COLORS.D
                  }`}
                >
                  {hud.styleRank}
                </span>
              )}
            </span>
          </div>

          {/* HP Bar */}
          <div className="mb-0.5">
            <div className="mb-0.5 flex justify-between text-[8px] sm:text-[9px] tabular-nums leading-none">
              <span className="flex items-center gap-0.5 font-bold text-slayer-red">
                <Heart className="h-2.5 w-2.5" /> HP
              </span>
              <span className="font-semibold text-slate-100">
                {Math.round(hud.hp)}/{Math.round(hud.maxHp)}
              </span>
            </div>
            <div className="h-1.5 w-full border border-ancient-stone bg-abyss-900">
              <div
                className="h-full bg-gradient-to-r from-slayer-red to-slayer-orange transition-all duration-100"
                style={{ width: `${hpPct}%` }}
              />
            </div>
          </div>

          {/* Energy Bar */}
          <div>
            <div className="mb-0.5 flex justify-between text-[8px] sm:text-[9px] tabular-nums leading-none">
              <span className="flex items-center gap-0.5 font-bold text-mana-cyan">
                <Zap className="h-2.5 w-2.5" /> EN
              </span>
              <span className="font-semibold text-slate-200">
                {Math.round(hud.energy)}/{Math.round(hud.maxEnergy)}
              </span>
            </div>
            <div className="h-1.5 w-full border border-ancient-stone bg-abyss-900">
              <div
                className="h-full bg-gradient-to-r from-mana-purple to-mana-cyan transition-all duration-100"
                style={{ width: `${enPct}%` }}
              />
            </div>
          </div>

          {/* Desktop-only hotkey counters (mobile has tactile buttons) */}
          {!hideBottomOverlayCards && (
            <div className="mt-1 hidden items-center justify-between gap-2 text-[9px] sm:flex tabular-nums">
              <span className="font-semibold text-loot-green">
                [Q] Vial: {hud.nanoVials}/{hud.maxNanoVials}
              </span>
              <span className="font-semibold text-loot-gold">
                {hud.isMeleeMode ? '[R] EN:' : '[R] Ammo:'} {hud.ammoPacks}/{hud.maxAmmoPacks}
              </span>
            </div>
          )}

          {hud.manaShieldTimer > 0 && (
            <div className="mt-0.5 text-[8px] font-bold text-mana-cyan animate-pulse tabular-nums">
              SHIELD {hud.manaShieldTimer.toFixed(1)}s
            </div>
          )}
        </div>

        {/* Top-Center: Compact Stage / Minimap / Boss HP */}
        <div
          className={`flex min-w-0 flex-1 flex-col items-center gap-1 ${
            compactMobile ? 'max-w-[148px]' : 'max-w-[270px]'
          }`}
        >
          <div className="w-full border border-ancient-stone/90 bg-abyss-950/90 px-2 py-1 text-center">
            <div className="truncate text-[8px] sm:text-[9px] font-bold tracking-wider text-loot-gold uppercase">
              STG {hud.stageNumber} · {hud.areaName}
            </div>

            {hud.mode === 'survival' && (
              <div
                className={`mt-0.5 font-pixel text-xs sm:text-base tabular-nums ${
                  hud.timer <= 15 ? 'text-slayer-red animate-pulse' : 'text-loot-gold'
                }`}
              >
                {Math.ceil(hud.timer)}s
              </div>
            )}

            {hud.mode === 'defense' && (
              <div className="mt-1 w-full">
                <div className="mb-0.5 flex justify-between text-[8px] sm:text-[10px] font-bold tabular-nums">
                  <span className="flex items-center gap-0.5 text-mana-cyan">
                    <Shield className="h-2.5 w-2.5" /> PYLON
                  </span>
                  <span>
                    {hud.pylonHp}/{hud.pylonMaxHp}
                  </span>
                </div>
                <div className="h-1.5 w-full border border-mana-cyan/50 bg-abyss-900">
                  <div
                    className={`h-full transition-all duration-150 ${
                      pylonPct < 30 ? 'bg-slayer-red' : 'bg-mana-cyan'
                    }`}
                    style={{ width: `${pylonPct}%` }}
                  />
                </div>
                <div className="mt-0.5 flex justify-between text-[8px] sm:text-[9px] text-slate-400 tabular-nums">
                  <span>
                    W{hud.currentWave}/{hud.totalWaves}
                  </span>
                  <span>Musuh: {hud.enemiesRemaining}</span>
                </div>
              </div>
            )}

            {hud.mode === 'traverse' && (
              <div className="mt-1 w-full">
                {hud.minimap ? (
                  <div className="relative h-2 sm:h-2.5 w-full overflow-hidden border border-ancient-stone bg-abyss-900">
                    {hud.minimap.areas.slice(1).map((a, idx) => {
                      const leftPct = (a.startX / Math.max(1, hud.minimap!.worldWidth)) * 100;
                      return (
                        <div
                          key={idx}
                          className="absolute top-0 bottom-0 w-px bg-ancient-stone/80"
                          style={{ left: `${leftPct}%` }}
                        />
                      );
                    })}
                    <div
                      className="absolute top-0 bottom-0 left-0 bg-mana-cyan/20"
                      style={{ width: `${hud.progressPct}%` }}
                    />
                    {hud.minimap.markers.map((m, idx) => {
                      const leftPct = Math.max(
                        1,
                        Math.min(99, (m.x / Math.max(1, hud.minimap!.worldWidth)) * 100)
                      );
                      const cls =
                        m.kind === 'boss'
                          ? 'h-1.5 w-1.5 bg-slayer-red rotate-45'
                          : m.kind === 'exit'
                            ? 'h-2 w-1 bg-loot-gold'
                            : m.kind === 'shrine'
                              ? 'h-1.5 w-1.5 bg-mana-purple'
                              : m.kind === 'chest_open'
                                ? 'h-1 w-1 bg-loot-green/50'
                                : 'h-1.5 w-1.5 bg-loot-gold';
                      return (
                        <span
                          key={idx}
                          className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 ${cls}`}
                          style={{ left: `${leftPct}%` }}
                        />
                      );
                    })}
                    <span
                      className="absolute top-1/2 h-2 w-1 -translate-x-1/2 -translate-y-1/2 bg-white shadow-[0_0_5px_#00F0FF]"
                      style={{
                        left: `${Math.max(
                          1,
                          Math.min(99, (hud.minimap.playerX / Math.max(1, hud.minimap.worldWidth)) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                ) : (
                  <div className="h-1.5 w-full border border-ancient-stone bg-abyss-900">
                    <div
                      className="h-full bg-loot-gold transition-all duration-150"
                      style={{ width: `${hud.progressPct}%` }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {hud.boss && (
            <div className="w-[200px] sm:w-72 border-2 border-slayer-red/80 bg-abyss-950/95 px-2.5 py-1 shadow-xl">
              <div className="mb-0.5 flex items-center justify-between text-[9px] font-bold tabular-nums">
                <span className="truncate text-slayer-red uppercase">
                  {hud.boss.name}
                  {hud.boss.stunned ? ' [STUN]' : ''}
                </span>
                <span className="shrink-0 text-slate-200">
                  {hud.boss.hp}/{hud.boss.maxHp}
                </span>
              </div>
              <div className="h-1.5 w-full border border-slayer-red/60 bg-abyss-900">
                <div
                  className="h-full bg-gradient-to-r from-slayer-red to-mana-purple transition-all duration-100"
                  style={{ width: `${Math.max(0, (hud.boss.hp / hud.boss.maxHp) * 100)}%` }}
                />
              </div>
              {hud.boss.shieldActive && (
                <div className="mt-0.5">
                  <div className="flex justify-between text-[8px] font-bold text-mana-cyan tabular-nums">
                    <span>PERISAI MANA</span>
                    <span>
                      {hud.boss.shieldHp}/{hud.boss.shieldMaxHp}
                    </span>
                  </div>
                  <div className="h-1 w-full bg-abyss-900">
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
            <div
              className={`border-y border-mana-cyan bg-abyss-950/90 text-center shadow-xl ${
                compactMobile ? 'px-2.5 py-0.5' : 'px-5 py-1.5'
              }`}
            >
              <div
                className={`font-pixel text-mana-cyan ${
                  compactMobile ? 'text-[8px] leading-tight' : 'text-xs'
                }`}
              >
                {areaBanner.name}
              </div>
              {!compactMobile && areaBanner.subtitle && (
                <div className="mt-0.5 text-[10px] text-slate-300">{areaBanner.subtitle}</div>
              )}
            </div>
          )}

          {toast && (
            <div className="max-w-[220px] sm:max-w-sm border border-loot-gold/70 bg-abyss-950/95 px-2.5 py-0.5 text-center text-[10px] font-semibold text-loot-gold shadow-lg">
              {toast}
            </div>
          )}
        </div>

        {/* Top-Right: Style Rank (desktop only) & Compact Single-Row Utility Buttons */}
        <div className="flex items-start gap-1.5">
          {!compactMobile && (
            <div className="hidden md:block border border-ancient-stone bg-abyss-950/90 p-1.5 text-center">
              <div className="text-[8px] tracking-wider text-slate-400">STYLE</div>
              <div
                className={`mt-0.5 border px-1.5 py-0.5 font-pixel text-xs ${
                  RANK_COLORS[hud.styleRank] ?? RANK_COLORS.D
                }`}
              >
                {hud.styleRank}
              </div>
              <div className="mt-1 w-14">
                <div className="flex justify-between text-[8px] text-slayer-orange tabular-nums">
                  <span>ADR</span>
                  <span>{hud.adrenalineActive ? 'ON' : `${hud.adrenaline}%`}</span>
                </div>
                <div className="h-1 w-full border border-ancient-stone bg-abyss-900">
                  <div
                    className="h-full bg-slayer-orange"
                    style={{ width: `${hud.adrenalineActive ? 100 : hud.adrenaline}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="pointer-events-auto flex items-center gap-1">
            <button
              type="button"
              tabIndex={-1}
              aria-label="Buka Gear dan Senjata"
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenInventory();
              }}
              className={`flex items-center justify-center gap-1 border border-ancient-stone bg-abyss-950/90 text-[10px] font-bold text-loot-gold hover:border-loot-gold active:scale-95 ${
                compactMobile ? 'h-9 w-9' : 'min-h-[40px] px-2.5'
              }`}
            >
              <Package className="h-4 w-4" />
              {!compactMobile && <span>GEAR</span>}
            </button>
            <button
              type="button"
              tabIndex={-1}
              aria-label={showTouchControls ? 'Sembunyikan Kontrol Sentuh' : 'Tampilkan Kontrol Sentuh'}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleTouchControls();
              }}
              className={`flex items-center justify-center gap-1 border text-[10px] font-bold active:scale-95 ${
                compactMobile ? 'h-9 w-9' : 'min-h-[40px] px-2.5'
              } ${
                showTouchControls
                  ? 'border-mana-cyan bg-mana-cyan/20 text-mana-cyan'
                  : 'border-ancient-stone bg-abyss-950/90 text-slate-400 hover:text-white'
              }`}
            >
              <Gamepad2 className="h-4 w-4" />
              {!compactMobile && <span>TOUCH</span>}
            </button>
            <button
              type="button"
              tabIndex={-1}
              aria-label="Jeda Permainan"
              onClick={(e) => {
                e.currentTarget.blur();
                onPause();
              }}
              className={`flex items-center justify-center gap-1 border border-ancient-stone bg-abyss-950/90 text-[10px] font-bold text-slate-200 hover:border-mana-cyan active:scale-95 ${
                compactMobile ? 'h-9 w-9' : 'min-h-[40px] px-2.5'
              }`}
            >
              <Pause className="h-4 w-4" />
              {!compactMobile && <span>ESC</span>}
            </button>
          </div>
        </div>
      </div>

      {/* ── BOTTOM BAR (Desktop / Non-Touch Mode Only — zero collision with Analog Stick!) ── */}
      {!hideBottomOverlayCards && (
        <div className="flex items-end justify-between gap-3">
          <div className="flex gap-2">
            <div className="border border-slayer-orange/60 bg-abyss-950/90 px-2 py-1">
              <div className="flex items-center justify-between gap-2 text-[9px] font-bold text-slayer-orange">
                <span className="flex items-center gap-1">
                  <Sword className="h-3 w-3" /> [LMB/J] COMBO 3 · JUMP SPIN
                  {hud.canAirSlam ? '/SLAM' : ''}
                </span>
                {hud.isBlocking ? (
                  <span className="text-mana-cyan animate-pulse">BLOCK!</span>
                ) : hud.activeMove === 'dash_thrust' ? (
                  <span className="text-loot-gold">DASH THRUST</span>
                ) : hud.activeMove === 'dual_cross_combo' ? (
                  <span className="text-mana-cyan">DUAL X 2x!</span>
                ) : hud.activeMove === 'ground_slam_charge' ? (
                  <span className="text-loot-gold animate-pulse">CHARGE SLAM</span>
                ) : hud.activeMove === 'ground_slam_impact' ? (
                  <span className="text-loot-gold">GROUND SLAM!</span>
                ) : hud.activeMove === 'spin_vertical' ? (
                  <span className="text-mana-cyan">SPIN V</span>
                ) : hud.activeMove === 'air_slam_windup' ||
                  hud.activeMove === 'air_slam_dive' ||
                  hud.activeMove === 'air_slam_impact' ? (
                  <span className="text-loot-gold">SLAM!</span>
                ) : hud.counterReady ? (
                  <span className="text-loot-gold animate-pulse">COUNTER!</span>
                ) : hud.meleeCombo > 0 ? (
                  <span className="text-loot-gold">HIT {hud.meleeCombo}</span>
                ) : null}
              </div>
              <div className="text-[10px] font-semibold text-white">
                {meleeDef?.name}{' '}
                <span
                  className={`text-[9px] font-bold uppercase tabular-nums ${
                    (hud.meleeWeapon.level ?? 1) >= 3
                      ? 'text-loot-gold'
                      : (hud.meleeWeapon.level ?? 1) === 2
                        ? 'text-mana-cyan'
                        : 'text-slate-400'
                  }`}
                >
                  Lv.{hud.meleeWeapon.level ?? 1}
                  {(hud.meleeWeapon.level ?? 1) >= 2 ? ' ★' : ''}
                </span>
                {meleeDef && (
                  <span className="text-[9px] text-slate-400">
                    {' '}
                    · {DAMAGE_TYPE_LABEL[meleeDef.damageType].label}
                  </span>
                )}
              </div>
            </div>
            <div className="border border-mana-cyan/60 bg-abyss-950/90 px-2 py-1">
              {hud.rangedWeapon && rangedDef ? (
                <>
                  <div className="flex items-center justify-between gap-2 text-[9px] font-bold text-mana-cyan">
                    <span className="flex items-center gap-1">
                      <Crosshair className="h-3 w-3" /> [RMB/K] RANGE · {hud.rightSkillCost} EN
                    </span>
                    <span className="text-slate-400">DAGGER NO SLAM</span>
                  </div>
                  <div className="text-[10px] font-semibold text-white">
                    {rangedDef.name}{' '}
                    <span className="text-[9px] uppercase text-mana-purple">
                      Lv.{hud.rangedWeapon.level ?? 1} ({hud.rangedWeapon.tier})
                    </span>
                  </div>
                </>
              ) : hud.rightSkillKind !== 'none' ? (
                <>
                  <div className="flex items-center justify-between gap-2 text-[9px] font-bold text-slayer-orange">
                    <span className="flex items-center gap-1">
                      <Zap className="h-3 w-3" /> [{hud.rightSkillInputHint}]{' '}
                      {hud.rightSkillLabel.toUpperCase()}
                    </span>
                    <span
                      className={
                        !hud.dashThrustReady
                          ? 'text-slate-500'
                          : hud.energy >= hud.rightSkillCost
                            ? 'text-loot-green'
                            : 'text-slayer-red'
                      }
                    >
                      {!hud.dashThrustReady
                        ? 'CD'
                        : hud.energy >= hud.rightSkillCost
                          ? `${hud.rightSkillCost} EN`
                          : `LOW EN (${hud.rightSkillCost})`}
                    </span>
                  </div>
                  <div className="text-[10px] font-semibold text-mana-cyan">
                    Mode Melee Murni (Tanpa Gun)
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1 text-[9px] font-bold text-slayer-orange">
                    <Sword className="h-3 w-3" /> MODE MELEE MURNI
                  </div>
                  <div className="text-[10px] font-semibold text-mana-cyan">
                    Kombo 3-Hit · Jump Spin &amp; Slam
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

          <div className="hidden border border-ancient-stone bg-abyss-950/90 px-2.5 py-1 text-[10px] text-slate-400 lg:block">
            <span className="text-slate-200">LMB/J</span> Combo 3 / Jump Spin
            {hud.canAirSlam ? ' / Hold Slam' : ''} ·{' '}
            {hud.rightSkillKind !== 'none' && (
              <>
                <span className="text-slate-200">{hud.rightSkillInputHint}</span>{' '}
                {hud.rightSkillLabel} ({hud.rightSkillCost} EN) ·{' '}
              </>
            )}
            <span className="text-slate-200">Hold J</span> Blok ·{' '}
            <span className="text-slate-200">E</span> Aksi
          </div>
        </div>
      )}
    </div>
  );
}
