// ============================================================
// RIFTBOUND: SLAYER CORPS — Mobile-First Virtual Analog & Gamepad
// True multi-touch circular analog joystick + ergonomic thumb-arc
// combat buttons, supporting both Portrait Handheld Deck mode and
// Landscape Full-Viewport Overlay mode.
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Heart,
  Sparkles,
  Sword,
  Wind,
  Zap,
} from 'lucide-react';
import type { InputAction } from '../engine/InputManager';
import type { RightClickSkillKind } from '../engine/combatRules';
import { computeAnalogStickVector, type AnalogStickSample } from '../engine/locomotion';

export interface TouchControlsProps {
  onAction: (action: InputAction, down: boolean) => void;
  onAnalogChange: (x: number, y: number, dropDown: boolean) => void;
  layoutMode: 'overlay' | 'deck';
  hasInteractPrompt: boolean;
  interactLabel?: string | null;
  canAdrenaline: boolean;
  canRanged: boolean;
  rightSkillKind: RightClickSkillKind;
  rightSkillLabel: string;
  rightSkillCost: number;
  energy: number;
  nanoVials: number;
  ammoPacks: number;
  isMeleeMode: boolean;
  meleeWeaponName: string;
  rangedWeaponName?: string | null;
  styleRank?: string;
  adrenaline?: number;
  adrenalineActive?: boolean;
  canAirSlam?: boolean;
}

interface TouchBtnProps {
  action?: InputAction;
  onAction?: (action: InputAction, down: boolean) => void;
  onCustomDown?: () => void;
  onCustomUp?: () => void;
  ariaLabel: string;
  testId?: string;
  className?: string;
  children: React.ReactNode;
}

function TouchBtn({
  action,
  onAction,
  onCustomDown,
  onCustomUp,
  ariaLabel,
  testId,
  className = '',
  children,
}: TouchBtnProps) {
  const [pressed, setPressed] = useState(false);

  const handleDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore synthetic pointer events without active pointer id
    }
    setPressed(true);
    if (onCustomDown) onCustomDown();
    else if (action && onAction) onAction(action, true);
  };

  const handleUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setPressed(false);
    if (onCustomUp) onCustomUp();
    else if (action && onAction) onAction(action, false);
  };

  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={ariaLabel}
      data-testid={testId}
      onPointerDown={handleDown}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
      onLostPointerCapture={() => {
        if (pressed) {
          setPressed(false);
          if (onCustomUp) onCustomUp();
          else if (action && onAction) onAction(action, false);
        }
      }}
      onContextMenu={(e) => e.preventDefault()}
      className={`touch-none select-none flex items-center justify-center border-2 transition-transform duration-75 ${
        pressed ? 'scale-92 brightness-125' : ''
      } ${className}`}
    >
      {children}
    </button>
  );
}

const NEUTRAL_STICK: AnalogStickSample = {
  x: 0,
  y: 0,
  knobX: 0,
  knobY: 0,
  magnitude: 0,
  direction: 'neutral',
  dropDown: false,
  active: false,
};

function VirtualAnalogStick({
  onAnalogChange,
  size = 122,
  showLabel = true,
}: {
  onAnalogChange: (x: number, y: number, dropDown: boolean) => void;
  size?: number;
  showLabel?: boolean;
}) {
  const baseRef = useRef<HTMLDivElement | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const centerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [stick, setStick] = useState<AnalogStickSample>(NEUTRAL_STICK);

  const maxRadius = Math.round(size * 0.36);

  const releaseStick = useCallback(() => {
    pointerIdRef.current = null;
    setStick(NEUTRAL_STICK);
    onAnalogChange(0, 0, false);
  }, [onAnalogChange]);

  useEffect(() => {
    return () => {
      onAnalogChange(0, 0, false);
    };
  }, [onAnalogChange]);

  const updateFromClientPos = useCallback(
    (clientX: number, clientY: number) => {
      const dx = clientX - centerRef.current.x;
      const dy = clientY - centerRef.current.y;
      const sample = computeAnalogStickVector(dx, dy, maxRadius, 0.16);
      setStick(sample);
      onAnalogChange(sample.x, sample.y, sample.dropDown);
    },
    [maxRadius, onAnalogChange]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== null) return;
    e.preventDefault();
    e.stopPropagation();
    const el = baseRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    centerRef.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    pointerIdRef.current = e.pointerId;
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      // ignore synthetic events
    }
    updateFromClientPos(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    updateFromClientPos(e.clientX, e.clientY);
  };

  const handlePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    releaseStick();
  };

  const isLeft = stick.direction === 'left';
  const isRight = stick.direction === 'right';
  const isDown = stick.dropDown;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        ref={baseRef}
        role="slider"
        aria-label="Analog Gerak Kiri Kanan"
        aria-valuemin={-100}
        aria-valuemax={100}
        aria-valuenow={Math.round(stick.x * 100)}
        data-testid="mobile-analog-stick"
        data-direction={stick.direction}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onLostPointerCapture={releaseStick}
        onContextMenu={(e) => e.preventDefault()}
        style={{ width: size, height: size }}
        className={`relative touch-none select-none rounded-full border-2 bg-abyss-950/75 shadow-[inset_0_0_20px_rgba(0,0,0,0.75)] transition-colors ${
          stick.active ? 'border-mana-cyan/80' : 'border-slate-600/75'
        }`}
      >
        {/* Subtle Inner Track Ring */}
        <div className="pointer-events-none absolute inset-3 rounded-full border border-slate-700/70" />

        {/* Active Directional Arc Accent (Left vs Right) */}
        {isLeft && (
          <div className="pointer-events-none absolute inset-0 rounded-full border-l-4 border-l-mana-cyan" />
        )}
        {isRight && (
          <div className="pointer-events-none absolute inset-0 rounded-full border-r-4 border-r-mana-cyan" />
        )}
        {isDown && (
          <div className="pointer-events-none absolute inset-0 rounded-full border-b-4 border-b-mana-purple" />
        )}

        {/* Directional Chevrons */}
        <ChevronLeft
          className={`pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors ${
            isLeft ? 'text-mana-cyan scale-110' : 'text-slate-500/70'
          }`}
        />
        <ChevronRight
          className={`pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors ${
            isRight ? 'text-mana-cyan scale-110' : 'text-slate-500/70'
          }`}
        />
        <ChevronDown
          className={`pointer-events-none absolute bottom-1.5 left-1/2 h-3.5 w-3.5 -translate-x-1/2 transition-colors ${
            isDown ? 'text-mana-purple scale-110' : 'text-slate-600/70'
          }`}
        />

        {/* Center Crosshair Dot */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-600/70" />

        {/* Smooth Floating Thumb Knob (compositor-only translate3d) */}
        <div
          data-testid="mobile-analog-knob"
          style={{
            transform: `translate3d(calc(-50% + ${stick.knobX}px), calc(-50% + ${stick.knobY}px), 0)`,
          }}
          className={`pointer-events-none absolute left-1/2 top-1/2 flex h-12 w-12 items-center justify-center rounded-full border-2 shadow-lg transition-colors ${
            stick.active
              ? 'border-mana-cyan bg-mana-cyan/30 shadow-[0_0_16px_rgba(0,240,255,0.4)]'
              : 'border-slate-400/80 bg-slate-800/90'
          }`}
        >
          <div
            className={`h-5 w-5 rounded-full border ${
              stick.active
                ? 'border-white/80 bg-mana-cyan/60'
                : 'border-slate-500/80 bg-slate-700/90'
            }`}
          />
        </div>
      </div>

      {/* Subtle Direction Readout below stick in Deck mode */}
      {showLabel && (
        <span className="text-[10px] font-bold tracking-wider text-slate-400 tabular-nums">
          {isLeft ? '◄ KIRI' : isRight ? 'KANAN ►' : isDown ? '▼ TURUN' : 'ANALOG'}
        </span>
      )}
    </div>
  );
}

export function TouchControls({
  onAction,
  onAnalogChange,
  layoutMode,
  hasInteractPrompt,
  interactLabel,
  canAdrenaline,
  canRanged,
  rightSkillKind,
  rightSkillLabel,
  rightSkillCost,
  energy,
  nanoVials,
  ammoPacks,
  isMeleeMode,
  meleeWeaponName,
  rangedWeaponName,
  styleRank = 'D',
  adrenaline = 0,
  adrenalineActive = false,
  canAirSlam = true,
}: TouchControlsProps) {
  const isDeck = layoutMode === 'deck';
  const canAffordSkill = energy >= rightSkillCost;
  const showSkillButton = canRanged || rightSkillKind !== 'none';

  // Special single-thumb Dual Sword X-Combo chord helper for mobile ergonomics
  const handleDualComboDown = () => {
    onAction('ranged', true);
    onAction('melee', true);
  };
  const handleDualComboUp = () => {
    onAction('melee', false);
    onAction('ranged', false);
  };

  const renderActionCluster = () => (
    <div className="pointer-events-auto relative flex flex-col items-end gap-2">
      {/* Contextual Interact Trigger (appears cleanly only near interactive objects) */}
      {hasInteractPrompt && (
        <TouchBtn
          action="interact"
          onAction={onAction}
          ariaLabel="Interaksi"
          testId="mobile-btn-interact"
          className="min-h-[44px] rounded-xl border-loot-gold bg-loot-gold/25 px-3.5 py-2 text-xs font-bold text-loot-gold shadow-lg animate-pulse"
        >
          <Sparkles className="mr-1.5 h-4 w-4 shrink-0" />
          <span className="max-w-[140px] truncate">{interactLabel ? 'BUKA / AKSI' : 'AKSI [E]'}</span>
        </TouchBtn>
      )}

      {/* Ergonomic Thumb-Arc Combat Pad */}
      <div className="relative h-[136px] w-[154px] sm:h-[144px] sm:w-[164px]">
        {/* DASH — Top Right */}
        <TouchBtn
          action="dash"
          onAction={onAction}
          ariaLabel="Dash"
          testId="mobile-btn-dash"
          className="absolute right-1 top-0 h-12 w-12 flex-col rounded-full border-mana-purple/85 bg-abyss-950/80 text-mana-purple shadow-md active:bg-mana-purple/35"
        >
          <Wind className="h-4 w-4" />
          <span className="mt-0.5 text-[8px] font-bold leading-none">DASH</span>
        </TouchBtn>

        {/* SKILL / GUN / DUAL X — Mid Left */}
        {showSkillButton && (
          <TouchBtn
            action={rightSkillKind === 'dual_combo' ? undefined : 'ranged'}
            onAction={rightSkillKind === 'dual_combo' ? undefined : onAction}
            onCustomDown={rightSkillKind === 'dual_combo' ? handleDualComboDown : undefined}
            onCustomUp={rightSkillKind === 'dual_combo' ? handleDualComboUp : undefined}
            ariaLabel={canRanged ? 'Tembak Senjata Range' : `Skill ${rightSkillLabel}`}
            testId="mobile-btn-skill"
            className={`absolute left-1 top-5 h-[52px] w-[52px] flex-col rounded-full shadow-md ${
              !canAffordSkill
                ? 'border-slate-600/80 bg-abyss-950/75 text-slate-500'
                : canRanged
                  ? 'border-mana-cyan/85 bg-abyss-950/80 text-mana-cyan active:bg-mana-cyan/35'
                  : 'border-rose-400/90 bg-abyss-950/80 text-rose-300 active:bg-rose-500/35'
            }`}
          >
            {canRanged ? <Crosshair className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
            <span className="mt-0.5 text-[8px] font-bold leading-none">
              {canRanged ? 'GUN' : rightSkillLabel}
            </span>
            {rightSkillCost > 0 && (
              <span className="text-[7px] leading-none opacity-80 tabular-nums">{rightSkillCost}</span>
            )}
          </TouchBtn>
        )}

        {/* JUMP — Lower Right */}
        <TouchBtn
          action="jump"
          onAction={onAction}
          ariaLabel="Lompat"
          testId="mobile-btn-jump"
          className="absolute bottom-2 right-0 h-[56px] w-[56px] flex-col rounded-full border-loot-gold/90 bg-abyss-950/85 text-loot-gold shadow-lg active:bg-loot-gold/35"
        >
          <span className="text-[11px] font-extrabold tracking-wide leading-none">JUMP</span>
          <span className="mt-0.5 text-[7px] opacity-75 leading-none">2X FLIP</span>
        </TouchBtn>

        {/* PRIMARY ATTACK / HOLD BLOCK — Bottom Center-Left Anchor (Largest Target) */}
        <TouchBtn
          action="melee"
          onAction={onAction}
          ariaLabel="Serang dan Blok"
          testId="mobile-btn-attack"
          className="absolute bottom-0 left-10 h-[62px] w-[62px] flex-col rounded-full border-slayer-orange bg-slayer-orange/25 text-white shadow-[0_0_18px_rgba(249,115,22,0.3)] active:bg-slayer-orange/50"
        >
          <Sword className="h-5 w-5 text-slayer-orange" />
          <span className="mt-0.5 text-[9px] font-extrabold leading-none text-white">ATK</span>
          <span className="text-[7px] leading-none text-slayer-orange">HOLD BLK</span>
        </TouchBtn>
      </div>
    </div>
  );

  const renderUtilityButtons = () => (
    <div className="pointer-events-auto flex items-center gap-2">
      <TouchBtn
        action="heal"
        onAction={onAction}
        ariaLabel="Gunakan Nano Vial Heal"
        testId="mobile-btn-heal"
        className="h-11 min-w-[44px] flex-col rounded-xl border-loot-green/75 bg-abyss-950/85 px-2.5 text-loot-green active:bg-loot-green/30"
      >
        <div className="flex items-center gap-1">
          <Heart className="h-3.5 w-3.5" />
          <span className="text-[10px] font-bold tabular-nums">{nanoVials}</span>
        </div>
        <span className="text-[7px] font-semibold leading-none opacity-85">HEAL</span>
      </TouchBtn>

      <TouchBtn
        action="use_ammo"
        onAction={onAction}
        ariaLabel="Isi Energi atau Ammo"
        testId="mobile-btn-ammo"
        className="h-11 min-w-[44px] flex-col rounded-xl border-loot-gold/75 bg-abyss-950/85 px-2.5 text-loot-gold active:bg-loot-gold/30"
      >
        <div className="flex items-center gap-1">
          <Zap className="h-3.5 w-3.5" />
          <span className="text-[10px] font-bold tabular-nums">{ammoPacks}</span>
        </div>
        <span className="text-[7px] font-semibold leading-none opacity-85">
          {isMeleeMode ? 'EN+' : 'AMMO'}
        </span>
      </TouchBtn>

      {canAdrenaline && (
        <TouchBtn
          action="adrenaline"
          onAction={onAction}
          ariaLabel="Aktifkan Adrenaline Burst"
          testId="mobile-btn-adrenaline"
          className="h-11 min-w-[44px] flex-col rounded-xl border-slayer-orange bg-slayer-orange/30 px-2.5 text-loot-gold animate-pulse"
        >
          <Zap className="h-4 w-4" />
          <span className="text-[7px] font-extrabold leading-none">BURST</span>
        </TouchBtn>
      )}
    </div>
  );

  // ── PORTRAIT HANDHELD DECK MODE (100% Unobstructed Canvas Above!) ──
  if (isDeck) {
    return (
      <section
        aria-label="Kontrol Sentuh Mobile"
        data-testid="mobile-control-deck"
        className="flex flex-1 flex-col justify-between border-t-2 border-ancient-stone bg-abyss-950 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] select-none touch-none"
      >
        {/* Top Deck Strip: Active Loadout Summary + Consumables */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2 border-b border-ancient-stone/70 pb-2.5">
            <div className="min-w-0">
              <div className="text-[9px] font-bold tracking-wider text-slate-400 uppercase">
                {rangedWeaponName ? 'Mode Range + Dagger' : 'Mode Melee Murni'}
              </div>
              <div className="truncate text-xs font-bold text-white">
                {rangedWeaponName ? `${rangedWeaponName} · ${meleeWeaponName}` : meleeWeaponName}
              </div>
            </div>
            {renderUtilityButtons()}
          </div>

          {/* Live Combat Status Strip (Style Rank, Adrenaline, Weapon Moves) */}
          <div className="grid grid-cols-3 gap-2 border border-ancient-stone/70 bg-abyss-900/75 px-3 py-2 text-[10px] tabular-nums">
            <div>
              <div className="text-[8px] uppercase text-slate-400">Style Rank</div>
              <div className="mt-0.5 font-pixel text-xs text-loot-gold">{styleRank}</div>
            </div>
            <div>
              <div className="flex justify-between text-[8px] uppercase text-slate-400">
                <span>Adrenaline</span>
                <span className="text-slayer-orange">{adrenalineActive ? 'ON' : `${adrenaline}%`}</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full border border-ancient-stone bg-abyss-950">
                <div
                  className="h-full bg-slayer-orange transition-all duration-100"
                  style={{ width: `${adrenalineActive ? 100 : adrenaline}%` }}
                />
              </div>
            </div>
            <div className="text-right">
              <div className="text-[8px] uppercase text-slate-400">Skill</div>
              <div className="mt-0.5 truncate font-bold text-mana-cyan">
                {canRanged ? `GUN (${rightSkillCost})` : rightSkillKind !== 'none' ? `${rightSkillLabel} (${rightSkillCost})` : canAirSlam ? 'COMBO / SLAM' : 'NO SLAM'}
              </div>
            </div>
          </div>
        </div>

        {/* Main Ergonomic Thumb Zone: Left Analog Stick + Right Action Arc */}
        <div className="mt-auto mb-3 flex items-center justify-between gap-3 pt-4">
          <VirtualAnalogStick onAnalogChange={onAnalogChange} size={134} showLabel />
          {renderActionCluster()}
        </div>

        {/* Clean Single-Line Tactile Hint */}
        <div className="text-center text-[10px] text-slate-500">
          Analog kiri/kanan · Tarik bawah turun · Tap ATK 3x Combo · Hold ATK Blok
        </div>
      </section>
    );
  }

  // ── LANDSCAPE / TABLET FULL-VIEWPORT OVERLAY MODE ──
  return (
    <div
      aria-label="Kontrol Sentuh Mobile Overlay"
      data-testid="mobile-control-overlay"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex items-end justify-between px-[max(0.65rem,env(safe-area-inset-left))] pr-[max(0.65rem,env(safe-area-inset-right))] pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      {/* Left Thumb Analog Stick */}
      <div className="pointer-events-auto">
        <VirtualAnalogStick onAnalogChange={onAnalogChange} size={108} showLabel={false} />
      </div>

      {/* Bottom Center Compact Consumables */}
      <div className="mb-0.5 hidden sm:flex">{renderUtilityButtons()}</div>

      {/* Right Thumb Action Cluster + Compact Consumables on Ultra-Narrow Landscape */}
      <div className="flex flex-col items-end gap-1.5">
        <div className="flex sm:hidden">{renderUtilityButtons()}</div>
        {renderActionCluster()}
      </div>
    </div>
  );
}
