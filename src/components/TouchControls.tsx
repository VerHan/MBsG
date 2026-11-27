// ============================================================
// RIFTBOUND: SLAYER CORPS — Mobile PWA Touch Controls
// Multi-touch virtual gamepad using pointer events.
// ============================================================

import { ArrowDown, ArrowLeft, ArrowRight, Crosshair, Heart, Sparkles, Sword, Wind, Zap } from 'lucide-react';
import type { InputAction } from '../engine/InputManager';

interface TouchControlsProps {
  onAction: (action: InputAction, down: boolean) => void;
  hasInteractPrompt: boolean;
  canAdrenaline: boolean;
}

interface TouchBtnProps {
  action: InputAction;
  onAction: (action: InputAction, down: boolean) => void;
  className?: string;
  children: React.ReactNode;
}

function TouchBtn({ action, onAction, className = '', children }: TouchBtnProps) {
  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        onAction(action, true);
      }}
      onPointerUp={(e) => {
        e.preventDefault();
        onAction(action, false);
      }}
      onPointerCancel={() => onAction(action, false)}
      className={`touch-none select-none flex items-center justify-center border-2 backdrop-blur-sm active:scale-95 transition-transform ${className}`}
    >
      {children}
    </button>
  );
}

export function TouchControls({
  onAction,
  hasInteractPrompt,
  canAdrenaline,
}: TouchControlsProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-14 z-30 flex items-end justify-between px-3 sm:bottom-12 sm:px-5">
      {/* Left D-Pad */}
      <div className="pointer-events-auto flex items-center gap-2">
        <TouchBtn
          action="move_left"
          onAction={onAction}
          className="h-12 w-12 rounded-md border-slate-500/70 bg-abyss-950/75 text-slate-100 active:border-mana-cyan active:bg-mana-cyan/25"
        >
          <ArrowLeft className="h-5 w-5" />
        </TouchBtn>
        <TouchBtn
          action="drop_down"
          onAction={onAction}
          className="h-11 w-11 rounded-md border-slate-600/70 bg-abyss-950/70 text-slate-300 active:border-mana-purple active:bg-mana-purple/25"
        >
          <ArrowDown className="h-4 w-4" />
        </TouchBtn>
        <TouchBtn
          action="move_right"
          onAction={onAction}
          className="h-12 w-12 rounded-md border-slate-500/70 bg-abyss-950/75 text-slate-100 active:border-mana-cyan active:bg-mana-cyan/25"
        >
          <ArrowRight className="h-5 w-5" />
        </TouchBtn>
      </div>

      {/* Center Interact / Utility */}
      <div className="pointer-events-auto flex items-center gap-2">
        {hasInteractPrompt && (
          <TouchBtn
            action="interact"
            onAction={onAction}
            className="h-11 px-3 rounded-md border-loot-gold bg-loot-gold/25 text-xs font-bold text-loot-gold animate-pulse"
          >
            <Sparkles className="mr-1 h-4 w-4" /> E
          </TouchBtn>
        )}
        <TouchBtn
          action="heal"
          onAction={onAction}
          className="h-10 w-10 rounded-full border-loot-green/70 bg-abyss-950/75 text-loot-green active:bg-loot-green/25"
        >
          <Heart className="h-4 w-4" />
        </TouchBtn>
        {canAdrenaline && (
          <TouchBtn
            action="adrenaline"
            onAction={onAction}
            className="h-10 w-10 rounded-full border-slayer-orange bg-slayer-orange/25 text-loot-gold animate-pulse"
          >
            <Zap className="h-4 w-4" />
          </TouchBtn>
        )}
      </div>

      {/* Right Action Cluster */}
      <div className="pointer-events-auto grid grid-cols-2 gap-2">
        <TouchBtn
          action="melee"
          onAction={onAction}
          className="h-12 w-12 rounded-full border-slayer-orange/80 bg-slayer-orange/20 text-slayer-orange active:bg-slayer-orange/40"
        >
          <Sword className="h-5 w-5" />
        </TouchBtn>
        <TouchBtn
          action="jump"
          onAction={onAction}
          className="h-12 w-12 rounded-full border-loot-gold/80 bg-loot-gold/20 text-loot-gold text-[10px] font-bold active:bg-loot-gold/40"
        >
          JUMP
        </TouchBtn>
        <TouchBtn
          action="ranged"
          onAction={onAction}
          className="h-11 w-11 rounded-full border-mana-cyan/80 bg-mana-cyan/20 text-mana-cyan active:bg-mana-cyan/40"
        >
          <Crosshair className="h-4 w-4" />
        </TouchBtn>
        <TouchBtn
          action="dash"
          onAction={onAction}
          className="h-11 w-11 rounded-full border-mana-purple/80 bg-mana-purple/20 text-mana-purple active:bg-mana-purple/40"
        >
          <Wind className="h-4 w-4" />
        </TouchBtn>
      </div>
    </div>
  );
}
