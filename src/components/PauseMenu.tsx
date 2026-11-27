// ============================================================
// RIFTBOUND: SLAYER CORPS — Pause Menu & Controls Guide
// Enforces sequential Stage 1 -> 2 -> 3 locks inside Pause too.
// ============================================================

import { Play, RotateCcw, Home, Shield, Timer, Compass, Lock, CheckCircle2 } from 'lucide-react';
import type { StageKey } from '../types';
import type { PlayableModeKey } from '../engine/LevelBuilder';

interface PauseMenuProps {
  currentMode: PlayableModeKey;
  completedStages: StageKey[];
  onResume: () => void;
  onRestart: () => void;
  onSwitchMode: (mode: PlayableModeKey) => void;
  onExitToTitle: () => void;
}

const MODE_OPTIONS: Array<{
  key: PlayableModeKey;
  label: string;
  icon: 'stage' | 'survival' | 'defense';
}> = [
  { key: 'stage_1', label: 'Stage 1 (Komputasi)', icon: 'stage' },
  { key: 'stage_2', label: 'Stage 2 (Logika)', icon: 'stage' },
  { key: 'stage_3', label: 'Stage 3 (Biner)', icon: 'stage' },
  { key: 'survival', label: 'Survival 45s', icon: 'survival' },
  { key: 'defense', label: 'Hold The Fort', icon: 'defense' },
];

function canOpenMode(key: PlayableModeKey, completedStages: StageKey[]): boolean {
  if (key === 'stage_2') return completedStages.includes('stage_1');
  if (key === 'stage_3') return completedStages.includes('stage_1') && completedStages.includes('stage_2');
  return true;
}

export function PauseMenu({
  currentMode,
  completedStages,
  onResume,
  onRestart,
  onSwitchMode,
  onExitToTitle,
}: PauseMenuProps) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-abyss-950/85 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto border-2 border-ancient-stone bg-abyss-900 p-6 shadow-2xl">
        <h2 className="mb-4 font-pixel text-base text-mana-cyan">GAME PAUSED</h2>

        <div className="mb-4 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={onResume}
            className="flex items-center justify-center gap-2 border border-loot-green bg-loot-green/15 px-3 py-2 text-xs font-bold text-loot-green hover:bg-loot-green/25"
          >
            <Play className="h-4 w-4" /> Lanjutkan [ESC]
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="flex items-center justify-center gap-2 border border-slayer-orange bg-slayer-orange/15 px-3 py-2 text-xs font-bold text-slayer-orange hover:bg-slayer-orange/25"
          >
            <RotateCcw className="h-4 w-4" /> Ulangi Stage/Mode Ini
          </button>
        </div>

        <div className="mb-4 border border-ancient-stone bg-abyss-950/80 p-3">
          <div className="mb-2 text-[10px] font-bold tracking-wider text-slate-400">
            PILIH STAGE (HARUS BERURUTAN) / MODE LATIHAN
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-3">
            {MODE_OPTIONS.map((opt) => {
              const unlocked = canOpenMode(opt.key, completedStages);
              const cleared =
                (opt.key === 'stage_1' || opt.key === 'stage_2' || opt.key === 'stage_3') &&
                completedStages.includes(opt.key);

              return (
                <button
                  key={opt.key}
                  type="button"
                  disabled={!unlocked}
                  title={!unlocked ? 'Selesaikan & Save stage sebelumnya dulu' : opt.label}
                  onClick={() => unlocked && onSwitchMode(opt.key)}
                  className={`flex items-center justify-center gap-1.5 border p-2 ${
                    !unlocked
                      ? 'cursor-not-allowed border-ancient-stone/40 text-slate-600'
                      : currentMode === opt.key
                        ? 'border-loot-gold bg-loot-gold/15 text-loot-gold font-bold'
                        : 'border-ancient-stone text-slate-300 hover:border-mana-cyan'
                  }`}
                >
                  {!unlocked ? (
                    <Lock className="h-3.5 w-3.5 shrink-0" />
                  ) : cleared ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-loot-green" />
                  ) : opt.icon === 'survival' ? (
                    <Timer className="h-3.5 w-3.5 shrink-0" />
                  ) : opt.icon === 'defense' ? (
                    <Shield className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <Compass className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span className="truncate">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-4 border border-ancient-stone bg-abyss-950/80 p-3 text-[11px]">
          <div className="mb-2 font-bold text-slate-300">KONTROL SLAYER CORPS</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-400">
            <div><span className="text-white">A / D</span> atau ← / → : Gerak</div>
            <div><span className="text-white">Space / W</span> : Jump &amp; Double Jump Flip</div>
            <div><span className="text-white">Shift</span> : Dash (i-frame)</div>
            <div><span className="text-white">S</span> (di platform tipis) : Turun</div>
            <div><span className="text-white">Tap J / Klik Kiri</span> : 3-Hit Combo (Hit 2 Spin!)</div>
            <div><span className="text-white">Hold J / Klik Kiri</span> : Block &amp; Perfect Parry</div>
            <div><span className="text-white">S + J</span> (di udara) : Pogo-Slash</div>
            <div><span className="text-white">K / Klik Kanan</span> : Ranged Weapon</div>
            <div><span className="text-white">E</span> : Chest / Shrine / Pillar</div>
            <div><span className="text-white">Q / R</span> : Heal / Ammo Pack (+60 EN)</div>
            <div><span className="text-white">F / I</span> : Adrenaline / Inventory</div>
          </div>
        </div>

        <button
          type="button"
          onClick={onExitToTitle}
          className="flex w-full items-center justify-center gap-2 border border-ancient-stone py-2 text-xs text-slate-300 hover:border-slayer-red hover:text-slayer-red"
        >
          <Home className="h-4 w-4" /> Kembali ke Menu Utama
        </button>
      </div>
    </div>
  );
}
