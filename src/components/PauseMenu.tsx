// ============================================================
// RIFTBOUND: SLAYER CORPS — Pause Menu & Controls Guide
// ============================================================

import { Play, RotateCcw, Home, Shield, Timer, Compass } from 'lucide-react';

interface PauseMenuProps {
  currentMode: 'traverse' | 'survival' | 'defense';
  onResume: () => void;
  onRestart: () => void;
  onSwitchMode: (mode: 'traverse' | 'survival' | 'defense') => void;
  onExitToTitle: () => void;
}

export function PauseMenu({
  currentMode,
  onResume,
  onRestart,
  onSwitchMode,
  onExitToTitle,
}: PauseMenuProps) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-abyss-950/85 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg border-2 border-ancient-stone bg-abyss-900 p-6 shadow-2xl">
        <h2 className="mb-4 font-pixel text-base text-mana-cyan">GAME PAUSED</h2>

        <div className="mb-5 grid gap-2 sm:grid-cols-2">
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
            <RotateCcw className="h-4 w-4" /> Ulangi Mode Ini
          </button>
        </div>

        {/* Switch Demo Mode */}
        <div className="mb-5 border border-ancient-stone bg-abyss-950/80 p-3">
          <div className="mb-2 text-[10px] font-bold tracking-wider text-slate-400">
            PINDAH DEMO MODE LANGSUNG
          </div>
          <div className="grid grid-cols-3 gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => onSwitchMode('traverse')}
              className={`flex flex-col items-center gap-1 border p-2 ${
                currentMode === 'traverse'
                  ? 'border-loot-gold bg-loot-gold/15 text-loot-gold'
                  : 'border-ancient-stone text-slate-300 hover:border-mana-cyan'
              }`}
            >
              <Compass className="h-4 w-4" />
              Traverse
            </button>
            <button
              type="button"
              onClick={() => onSwitchMode('survival')}
              className={`flex flex-col items-center gap-1 border p-2 ${
                currentMode === 'survival'
                  ? 'border-loot-gold bg-loot-gold/15 text-loot-gold'
                  : 'border-ancient-stone text-slate-300 hover:border-mana-cyan'
              }`}
            >
              <Timer className="h-4 w-4" />
              Survival 45s
            </button>
            <button
              type="button"
              onClick={() => onSwitchMode('defense')}
              className={`flex flex-col items-center gap-1 border p-2 ${
                currentMode === 'defense'
                  ? 'border-loot-gold bg-loot-gold/15 text-loot-gold'
                  : 'border-ancient-stone text-slate-300 hover:border-mana-cyan'
              }`}
            >
              <Shield className="h-4 w-4" />
              Hold The Fort
            </button>
          </div>
        </div>

        {/* Controls Reference */}
        <div className="mb-5 border border-ancient-stone bg-abyss-950/80 p-3 text-[11px]">
          <div className="mb-2 font-bold text-slate-300">KONTROL SLAYER CORPS</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-400">
            <div><span className="text-white">A / D</span> atau ← / → : Gerak</div>
            <div><span className="text-white">Space / W</span> : Jump &amp; Double Jump</div>
            <div><span className="text-white">Shift</span> : Dash (i-frame)</div>
            <div><span className="text-white">S</span> (di platform tipis) : Turun</div>
            <div><span className="text-white">J / Klik Kiri</span> : Melee (+Energy)</div>
            <div><span className="text-white">S + J</span> (di udara) : Pogo-Slash</div>
            <div><span className="text-white">K / Klik Kanan</span> : Ranged Weapon</div>
            <div><span className="text-white">E</span> : Chest / Terminal / Gate</div>
            <div><span className="text-white">Q</span> : Nano-Vial Heal</div>
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
