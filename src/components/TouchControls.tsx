// ============================================================
// RIFTBOUND: SLAYER CORPS — Mobile-First Virtual Analog & Gamepad
// True multi-touch circular analog joystick + ergonomic thumb-arc
// combat buttons, supporting both Portrait Handheld Deck mode and
// Landscape Full-Viewport Overlay mode.
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  ArrowUpLeft,
  ArrowUpRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Heart,
  RotateCw,
  Sparkles,
  Sword,
  Wind,
  Zap,
} from 'lucide-react';
import type { InputAction } from '../engine/InputManager';
import type { RightClickSkillKind } from '../engine/combatRules';
import { computeAnalogStickVector, type AnalogStickSample } from '../engine/locomotion';

export interface TouchControlsProps {
  onAction: (action: InputAction, down: boolean, sourceId?: string) => void;
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
  sourceId?: string;
  onAction?: (action: InputAction, down: boolean, sourceId?: string) => void;
  onCustomDown?: () => void;
  onCustomUp?: () => void;
  ariaLabel: string;
  testId?: string;
  className?: string;
  children: React.ReactNode;
}

function TouchBtn({
  action,
  sourceId,
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
    else if (action && onAction) onAction(action, true, sourceId);
  };

  const handleUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setPressed(false);
    if (onCustomUp) onCustomUp();
    else if (action && onAction) onAction(action, false, sourceId);
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
          else if (action && onAction) onAction(action, false, sourceId);
        }
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
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
  zone: 'neutral',
  jump: false,
  dropDown: false,
  active: false,
};

function VirtualAnalogStick({
  onAction,
  onAnalogChange,
  size = 150,
  showLabel = true,
}: {
  onAction: (action: InputAction, down: boolean, sourceId?: string) => void;
  onAnalogChange: (x: number, y: number, dropDown: boolean) => void;
  size?: number;
  showLabel?: boolean;
}) {
  const baseRef = useRef<HTMLDivElement | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const centerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const prevJumpRef = useRef<boolean>(false);
  const [stick, setStick] = useState<AnalogStickSample>(NEUTRAL_STICK);

  const maxRadius = Math.round(size * 0.36);

  const applySample = useCallback(
    (sample: AnalogStickSample) => {
      setStick(sample);
      onAnalogChange(sample.x, sample.y, sample.dropDown);
      if (sample.jump !== prevJumpRef.current) {
        prevJumpRef.current = sample.jump;
        onAction('jump', sample.jump, 'analog');
      }
    },
    [onAction, onAnalogChange]
  );

  const releaseStick = useCallback(() => {
    pointerIdRef.current = null;
    applySample(NEUTRAL_STICK);
  }, [applySample]);

  useEffect(() => {
    return () => {
      onAnalogChange(0, 0, false);
      if (prevJumpRef.current) {
        prevJumpRef.current = false;
        onAction('jump', false, 'analog');
      }
    };
  }, [onAction, onAnalogChange]);

  const updateFromClientPos = useCallback(
    (clientX: number, clientY: number) => {
      const dx = clientX - centerRef.current.x;
      const dy = clientY - centerRef.current.y;
      const sample = computeAnalogStickVector(dx, dy, maxRadius, 0.16);
      applySample(sample);
    },
    [maxRadius, applySample]
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

  const isJumpUp = stick.zone === 'jump_up';
  const isJumpLeft = stick.zone === 'jump_left';
  const isJumpRight = stick.zone === 'jump_right';
  const isAnyJump = stick.jump;
  const isLeft = stick.zone === 'left' || isJumpLeft;
  const isRight = stick.zone === 'right' || isJumpRight;
  const isDown = stick.zone === 'down';

  const zoneLabel =
    isJumpUp
      ? '▲ JUMP LURUS'
      : isJumpRight
        ? '↗ JUMP KANAN'
        : isJumpLeft
          ? '↖ JUMP KIRI'
          : stick.zone === 'left'
            ? '◄ KIRI'
            : stick.zone === 'right'
              ? 'KANAN ►'
              : isDown
                ? '▼ TURUN'
                : 'ANALOG 6-ARAH';

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        ref={baseRef}
        role="slider"
        aria-label="Analog 6-Fungsi Gerak dan Jump"
        aria-valuemin={-100}
        aria-valuemax={100}
        aria-valuenow={Math.round(stick.x * 100)}
        data-testid="mobile-analog-stick"
        data-direction={stick.direction}
        data-zone={stick.zone}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onLostPointerCapture={releaseStick}
        onContextMenu={(e) => e.preventDefault()}
        style={{ width: size, height: size }}
        className={`relative touch-none select-none rounded-full border-2 bg-abyss-950/75 shadow-[inset_0_0_24px_rgba(0,0,0,0.8)] transition-colors ${
          isAnyJump
            ? 'border-loot-gold/90'
            : stick.active
              ? 'border-mana-cyan/85'
              : 'border-slate-600/80'
        }`}
      >
        {/* Subtle 6-Sector Radial Ring Overlay (Highlights Top 3 Jump Arcs) */}
        <svg
          viewBox="0 0 100 100"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          {/* Upper Jump Arc Guide (from -156° to -24°) */}
          <path
            d="M 10.6 32.5 A 43 43 0 0 1 89.4 32.5"
            fill="none"
            stroke={isAnyJump ? 'rgba(250, 204, 21, 0.72)' : 'rgba(250, 204, 21, 0.28)'}
            strokeWidth={isAnyJump ? '4' : '2.5'}
            strokeLinecap="round"
          />
          {/* Inner Track Ring */}
          <circle
            cx="50"
            cy="50"
            r="34"
            fill="none"
            stroke="rgba(100, 116, 139, 0.35)"
            strokeWidth="1"
          />
          {/* Subtle Sector Tick Marks separating Straight Jump vs Diagonal Jumps */}
          <line x1="36" y1="15" x2="39" y2="23" stroke="rgba(250,204,21,0.35)" strokeWidth="1.2" />
          <line x1="64" y1="15" x2="61" y2="23" stroke="rgba(250,204,21,0.35)" strokeWidth="1.2" />
        </svg>

        {/* Active Outer Glow Accents */}
        {isLeft && !isAnyJump && (
          <div className="pointer-events-none absolute inset-0 rounded-full border-l-4 border-l-mana-cyan" />
        )}
        {isRight && !isAnyJump && (
          <div className="pointer-events-none absolute inset-0 rounded-full border-r-4 border-r-mana-cyan" />
        )}
        {isDown && (
          <div className="pointer-events-none absolute inset-0 rounded-full border-b-4 border-b-mana-purple" />
        )}

        {/* 1. Symmetric Top JUMP Indicator */}
        <div
          className={`pointer-events-none absolute left-1/2 top-1.5 flex -translate-x-1/2 flex-col items-center transition-all ${
            isJumpUp ? 'scale-115 text-loot-gold' : 'text-loot-gold/75'
          }`}
        >
          <ArrowUp className="h-3.5 w-3.5 stroke-[2.75]" />
          <span className="-mt-0.5 text-[6px] font-extrabold tracking-tight leading-none">JMP</span>
        </div>

        {/* 2. Top-Left Diagonal Forward-Left Jump Indicator */}
        <ArrowUpLeft
          className={`pointer-events-none absolute left-[17%] top-[17%] h-3.5 w-3.5 transition-all ${
            isJumpLeft ? 'scale-125 text-loot-gold drop-shadow-[0_0_6px_rgba(250,204,21,0.9)]' : 'text-loot-gold/45'
          }`}
        />

        {/* 3. Top-Right Diagonal Forward-Right Jump Indicator */}
        <ArrowUpRight
          className={`pointer-events-none absolute right-[17%] top-[17%] h-3.5 w-3.5 transition-all ${
            isJumpRight ? 'scale-125 text-loot-gold drop-shadow-[0_0_6px_rgba(250,204,21,0.9)]' : 'text-loot-gold/45'
          }`}
        />

        {/* 4. Left Run Indicator */}
        <ChevronLeft
          className={`pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 transition-all ${
            stick.zone === 'left' ? 'scale-115 text-mana-cyan' : 'text-slate-400/75'
          }`}
        />

        {/* 5. Right Run Indicator */}
        <ChevronRight
          className={`pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 transition-all ${
            stick.zone === 'right' ? 'scale-115 text-mana-cyan' : 'text-slate-400/75'
          }`}
        />

        {/* 6. Down Platform Drop Indicator */}
        <ChevronDown
          className={`pointer-events-none absolute bottom-1.5 left-1/2 h-4 w-4 -translate-x-1/2 transition-all ${
            isDown ? 'scale-115 text-mana-purple' : 'text-slate-500/75'
          }`}
        />

        {/* Center Pivot Dot */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-600/80" />

        {/* Large Smooth Floating Thumb Knob (compositor-only translate3d) */}
        <div
          data-testid="mobile-analog-knob"
          style={{
            transform: `translate3d(calc(-50% + ${stick.knobX}px), calc(-50% + ${stick.knobY}px), 0)`,
          }}
          className={`pointer-events-none absolute left-1/2 top-1/2 flex h-14 w-14 items-center justify-center rounded-full border-2 shadow-lg transition-colors ${
            isAnyJump
              ? 'border-loot-gold bg-loot-gold/30 shadow-[0_0_18px_rgba(250,204,21,0.45)]'
              : isDown
                ? 'border-mana-purple bg-mana-purple/30 shadow-[0_0_16px_rgba(168,85,247,0.4)]'
                : stick.active
                  ? 'border-mana-cyan bg-mana-cyan/30 shadow-[0_0_18px_rgba(0,240,255,0.45)]'
                  : 'border-slate-400/85 bg-slate-800/90'
          }`}
        >
          <div
            className={`h-6 w-6 rounded-full border ${
              isAnyJump
                ? 'border-white/90 bg-loot-gold/70'
                : isDown
                  ? 'border-white/80 bg-mana-purple/65'
                  : stick.active
                    ? 'border-white/85 bg-mana-cyan/65'
                    : 'border-slate-500/85 bg-slate-700/90'
            }`}
          />
        </div>
      </div>

      {/* Subtle Direction Readout below stick in Deck mode */}
      {showLabel && (
        <span
          className={`text-[10px] font-bold tracking-wider tabular-nums ${
            isAnyJump ? 'text-loot-gold' : stick.active ? 'text-mana-cyan' : 'text-slate-400'
          }`}
        >
          {zoneLabel}
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
  const hasActiveRightSkill = canRanged || rightSkillKind !== 'none';
  const canAffordSkill = hasActiveRightSkill && energy >= rightSkillCost;

  // Special single-thumb Dual Sword X-Combo chord helper for mobile ergonomics
  const handleDualComboDown = () => {
    onAction('ranged', true);
    onAction('melee', true);
  };
  const handleDualComboUp = () => {
    onAction('melee', false);
    onAction('ranged', false);
  };

  const rightButtonLabel = canRanged
    ? 'GUN'
    : rightSkillKind === 'dash_thrust'
      ? 'THRUST'
      : rightSkillKind === 'ground_slam'
        ? 'G-SLAM'
        : rightSkillKind === 'dual_combo'
          ? 'DUAL X'
          : 'THRUST';

  const rightButtonSubLabel = !hasActiveRightSkill
    ? 'RMB'
    : rightSkillKind === 'ground_slam'
      ? `HOLD ${rightSkillCost}`
      : rightSkillCost > 0
        ? `${rightSkillCost} EN`
        : 'RMB';

  const renderUtilityButtons = () => (
    <div className="pointer-events-auto flex items-center justify-end gap-1.5">
      {canAdrenaline && (
        <TouchBtn
          action="adrenaline"
          onAction={onAction}
          ariaLabel="Aktifkan Adrenaline Burst"
          testId="mobile-btn-adrenaline"
          className="h-11 min-w-[48px] flex-col rounded-xl border-slayer-orange bg-slayer-orange/30 px-2 text-loot-gold shadow-md animate-pulse"
        >
          <Zap className="h-3.5 w-3.5" />
          <span className="mt-0.5 text-[7px] font-extrabold leading-none">BURST</span>
        </TouchBtn>
      )}

      <TouchBtn
        action="heal"
        onAction={onAction}
        ariaLabel="Gunakan Vial Heal"
        testId="mobile-btn-heal"
        className={`h-11 min-w-[52px] flex-col rounded-xl px-2 shadow-md ${
          nanoVials > 0
            ? 'border-loot-green/85 bg-abyss-950/85 text-loot-green active:bg-loot-green/30'
            : 'border-slate-700/80 bg-abyss-950/70 text-slate-500'
        }`}
      >
        <div className="flex items-center gap-1">
          <Heart className="h-3.5 w-3.5" />
          <span className="text-[10px] font-bold tabular-nums">{nanoVials}</span>
        </div>
        <span className="text-[7px] font-bold tracking-wide leading-none opacity-90">VIAL</span>
      </TouchBtn>

      <TouchBtn
        action="use_ammo"
        onAction={onAction}
        ariaLabel="Reload Energi atau Ammo"
        testId="mobile-btn-ammo"
        className={`h-11 min-w-[56px] flex-col rounded-xl px-2 shadow-md ${
          ammoPacks > 0
            ? 'border-mana-cyan/85 bg-abyss-950/85 text-mana-cyan active:bg-mana-cyan/30'
            : 'border-slate-700/80 bg-abyss-950/70 text-slate-500'
        }`}
      >
        <div className="flex items-center gap-1">
          <RotateCw className="h-3.5 w-3.5" />
          <span className="text-[10px] font-bold tabular-nums">{ammoPacks}</span>
        </div>
        <span className="text-[7px] font-bold tracking-wide leading-none opacity-90">RELOAD</span>
      </TouchBtn>
    </div>
  );

  const renderActionCluster = () => (
    <div className="pointer-events-auto relative flex flex-col items-end gap-2">
      {/* Contextual Interact Trigger + Right-Aligned Vial & Reload Strip */}
      <div className="flex items-center justify-end gap-1.5">
        {hasInteractPrompt && (
          <TouchBtn
            action="interact"
            onAction={onAction}
            ariaLabel="Interaksi"
            testId="mobile-btn-interact"
            className="h-11 rounded-xl border-loot-gold bg-loot-gold/25 px-3 text-[11px] font-bold text-loot-gold shadow-lg animate-pulse"
          >
            <Sparkles className="mr-1 h-3.5 w-3.5 shrink-0" />
            <span className="max-w-[96px] truncate">{interactLabel ? 'AKSI' : 'AKSI [E]'}</span>
          </TouchBtn>
        )}
        {renderUtilityButtons()}
      </div>

      {/* Ergonomic Right-Thumb Combat Arc (All 4 Core Actions Always Accessible) */}
      <div
        className={`relative ${
          isDeck ? 'h-[146px] w-[198px]' : 'h-[138px] w-[194px]'
        }`}
      >
        {/* DASH — Upper Right */}
        <TouchBtn
          action="dash"
          onAction={onAction}
          ariaLabel="Dash"
          testId="mobile-btn-dash"
          className="absolute right-1 top-0 h-12 w-12 flex-col rounded-full border-mana-purple/85 bg-abyss-950/85 text-mana-purple shadow-md active:bg-mana-purple/35"
        >
          <Wind className="h-4 w-4" />
          <span className="mt-0.5 text-[8px] font-bold leading-none">DASH</span>
        </TouchBtn>

        {/* RIGHT-CLICK SKILL / LONG THRUST / G-SLAM / DUAL X / GUN — Always Visible Upper-Left of ATK */}
        <TouchBtn
          action={rightSkillKind === 'dual_combo' ? undefined : 'ranged'}
          onAction={rightSkillKind === 'dual_combo' ? undefined : onAction}
          onCustomDown={rightSkillKind === 'dual_combo' ? handleDualComboDown : undefined}
          onCustomUp={rightSkillKind === 'dual_combo' ? handleDualComboUp : undefined}
          ariaLabel={
            canRanged
              ? 'Tembak Senjata Range'
              : hasActiveRightSkill
                ? `Klik Kanan ${rightSkillLabel}`
                : 'Klik Kanan Long Thrust (Khusus Sword, Katana, Spear)'
          }
          testId="mobile-btn-skill"
          className={`absolute left-0 bottom-[42px] h-[54px] w-[54px] flex-col rounded-full shadow-md ${
            !hasActiveRightSkill
              ? 'border-slate-600/75 bg-abyss-950/75 text-slate-400 active:bg-slate-800/80'
              : !canAffordSkill
                ? 'border-slate-600/80 bg-abyss-950/80 text-slate-500'
                : canRanged
                  ? 'border-mana-cyan/90 bg-mana-cyan/15 text-mana-cyan shadow-[0_0_12px_rgba(0,240,255,0.22)] active:bg-mana-cyan/35'
                  : rightSkillKind === 'ground_slam'
                    ? 'border-amber-400/90 bg-amber-500/15 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.22)] active:bg-amber-500/35'
                    : rightSkillKind === 'dual_combo'
                      ? 'border-purple-400/90 bg-purple-500/20 text-purple-200 shadow-[0_0_12px_rgba(168,85,247,0.28)] active:bg-purple-500/40'
                      : 'border-rose-400/90 bg-rose-500/20 text-rose-200 shadow-[0_0_14px_rgba(244,63,94,0.28)] active:bg-rose-500/40'
          }`}
        >
          {canRanged ? <Crosshair className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
          <span className="mt-0.5 text-[8px] font-extrabold leading-none">
            {rightButtonLabel}
          </span>
          <span className="text-[7px] leading-none opacity-85 tabular-nums">
            {rightButtonSubLabel}
          </span>
        </TouchBtn>

        {/* JUMP — Lower Right (Independent Dual Jump & Double Jump Source!) */}
        <TouchBtn
          action="jump"
          sourceId="btn"
          onAction={onAction}
          ariaLabel="Lompat dan Double Jump"
          testId="mobile-btn-jump"
          className="absolute bottom-2 right-0 h-[56px] w-[56px] flex-col rounded-full border-loot-gold/90 bg-abyss-950/85 text-loot-gold shadow-lg active:bg-loot-gold/35"
        >
          <span className="text-[11px] font-extrabold tracking-wide leading-none">JUMP</span>
          <span className="mt-0.5 text-[7px] opacity-75 leading-none">2X FLIP</span>
        </TouchBtn>

        {/* PRIMARY ATTACK / HOLD BLOCK — Bottom Center-Right Anchor (Largest Target) */}
        <TouchBtn
          action="melee"
          onAction={onAction}
          ariaLabel="Serang dan Blok"
          testId="mobile-btn-attack"
          className="absolute bottom-0 right-[66px] h-[62px] w-[62px] flex-col rounded-full border-slayer-orange bg-slayer-orange/25 text-white shadow-[0_0_18px_rgba(249,115,22,0.3)] active:bg-slayer-orange/50"
        >
          <Sword className="h-5 w-5 text-slayer-orange" />
          <span className="mt-0.5 text-[9px] font-extrabold leading-none text-white">ATK</span>
          <span className="text-[7px] leading-none text-slayer-orange">HOLD BLK</span>
        </TouchBtn>
      </div>
    </div>
  );

  // ── PORTRAIT HANDHELD DECK MODE (100% Unobstructed Canvas Above!) ──
  if (isDeck) {
    return (
      <section
        aria-label="Kontrol Sentuh Mobile"
        data-testid="mobile-control-deck"
        className="flex flex-1 flex-col justify-between border-t-2 border-ancient-stone bg-abyss-950 px-3 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] select-none touch-none"
      >
        {/* Top Deck Strip: Active Loadout Summary + Live Combat Telemetry */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2 border-b border-ancient-stone/70 pb-2">
            <div className="min-w-0">
              <div className="text-[9px] font-bold tracking-wider text-slate-400 uppercase">
                {rangedWeaponName ? 'Mode Range + Dagger' : 'Mode Melee Murni'}
              </div>
              <div className="truncate text-xs font-bold text-white">
                {rangedWeaponName ? `${rangedWeaponName} · ${meleeWeaponName}` : meleeWeaponName}
              </div>
            </div>
            <div className="shrink-0 text-right text-[10px] font-bold text-mana-cyan">
              {canRanged
                ? `GUN (${rightSkillCost} EN)`
                : rightSkillKind !== 'none'
                  ? `${rightSkillLabel} (${rightSkillCost} EN)`
                  : canAirSlam
                    ? 'COMBO / SLAM'
                    : 'NO SLAM'}
            </div>
          </div>

          {/* Live Combat Status Strip (Style Rank, Adrenaline, Energy) */}
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
              <div className="text-[8px] uppercase text-slate-400">Kontrol</div>
              <div className="mt-0.5 text-[9px] font-semibold text-slate-300">
                {isMeleeMode ? 'Kiri Gerak · Kanan Aksi' : 'Range · Kanan Aksi'}
              </div>
            </div>
          </div>
        </div>

        {/* Main Ergonomic Thumb Zone: Left = Larger 6-Function Analog Stick, Right = All Actions (including 2nd Jump) */}
        <div className="mt-auto mb-2 flex items-end justify-between gap-2 pt-3">
          <div className="pb-0.5">
            <VirtualAnalogStick onAction={onAction} onAnalogChange={onAnalogChange} size={150} showLabel />
          </div>
          {renderActionCluster()}
        </div>

        {/* Clean Single-Line Tactile Hint */}
        <div className="text-center text-[10px] text-slate-500">
          Kiri: Analog 6-Arah (◄ ► · ▲ Jump · ↖ ↗ Jump Maju · ▼) · Kanan: Semua Aksi &amp; Jump 2x
        </div>
      </section>
    );
  }

  // ── LANDSCAPE / TABLET FULL-VIEWPORT OVERLAY MODE ──
  // Pure Left Controller (Larger 6-Function Analog Stick) + Pure Right Action Zone (Vial, Reload, Burst, Thrust, Dash, ATK, Jump)
  return (
    <div
      aria-label="Kontrol Sentuh Mobile Overlay"
      data-testid="mobile-control-overlay"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex items-end justify-between px-[max(0.65rem,env(safe-area-inset-left))] pr-[max(0.65rem,env(safe-area-inset-right))] pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      {/* Left Side: Larger 6-Function Virtual Analog Controller */}
      <div className="pointer-events-auto">
        <VirtualAnalogStick onAction={onAction} onAnalogChange={onAnalogChange} size={134} showLabel={false} />
      </div>

      {/* Right Side: All Action Buttons Grouped Together */}
      {renderActionCluster()}
    </div>
  );
}
