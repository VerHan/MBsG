// ============================================================
// RIFTBOUND: SLAYER CORPS — Inventory, Live Preview & Forge Modal
// Features live animated Silksong-inspired Slayer preview canvas,
// interactive 3-hit combo animation tester, damage-type & stat bars,
// and 6 distinct sealed armor sets with visual/combat variety.
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { ArrowUpCircle, Crosshair, Play, Shield, Sparkles, Sword, X } from 'lucide-react';
import type { ArmorId, PlayerState, WeaponId, WeaponInstance } from '../types';
import { ARMORS, ARMOR_ORDER } from '../data/armors';
import {
  DAMAGE_TYPE_LABEL,
  WEAPONS,
  WEAPON_LEVEL_DMG_MULT,
  WEAPON_UPGRADE_COST,
  getWeaponLevel,
  isLightRangedCompatibleMelee,
} from '../data/weapons';
import { PixelSpriteRenderer, drawComplexSlayerAvatar } from '../engine/PixelSpriteRenderer';
import {
  canWeaponAirSlam,
  getRightClickSkillMeta,
  getWeaponMoveProfile,
  type CombatMoveType,
} from '../engine/combatRules';

interface InventoryModalProps {
  playerState: PlayerState;
  onEquipWeapon: (weapon: WeaponInstance) => void;
  onUnequipRanged?: () => void;
  onUpgradeWeapon: (weaponId: WeaponId) => void;
  onEquipArmor: (armorId: ArmorId) => void;
  onUnlockAllDemoGear: () => void;
  onClose: () => void;
}

const DMG_TYPE_TEXT_COLOR: Record<string, string> = {
  pierce: 'text-rose-400',
  slash: 'text-amber-400',
  impact: 'text-purple-400',
};

const TIER_DMG_MULT: Record<string, number> = {
  common: 1,
  rare: 1.15,
  epic: 1.35,
};

function computeWeaponDamage(inst: WeaponInstance): number {
  const def = WEAPONS[inst.defId];
  if (!def) return 0;
  const lv = getWeaponLevel(inst);
  const lvMult = WEAPON_LEVEL_DMG_MULT[lv] ?? 1;
  const tierMult = TIER_DMG_MULT[inst.tier] ?? 1;
  return Math.round(def.baseDamage * lvMult * tierMult);
}

const MOVE_PREVIEW_DURATION: Record<CombatMoveType, number> = {
  standard_slash: 0.34,
  spin_horizontal: 0.44,
  mini_thrust: 0.36,
  spin_vertical: 0.44,
  air_slam_windup: 0.3,
  air_slam_dive: 0.3,
  air_slam_impact: 0.4,
  dash_thrust: 0.38,
  ground_slam_charge: 0.34,
  ground_slam_impact: 0.44,
  dual_cross_combo: 0.42,
};

function SlayerPreviewCanvas({
  playerState,
  moveTrigger,
  rangedTriggerSeq,
}: {
  playerState: PlayerState;
  moveTrigger: { seq: number; move: CombatMoveType };
  rangedTriggerSeq: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const spritesRef = useRef<PixelSpriteRenderer | null>(null);
  const stateRef = useRef(playerState);
  stateRef.current = playerState;

  const swingRef = useRef<{
    timer: number;
    duration: number;
    move: CombatMoveType | null;
    lastSeq: number;
    rangedTimer: number;
    lastRangedSeq: number;
  }>({ timer: 0, duration: 0.34, move: null, lastSeq: 0, rangedTimer: 0, lastRangedSeq: 0 });

  if (moveTrigger.seq !== swingRef.current.lastSeq) {
    swingRef.current.lastSeq = moveTrigger.seq;
    swingRef.current.move = moveTrigger.move;
    swingRef.current.duration = MOVE_PREVIEW_DURATION[moveTrigger.move] ?? 0.36;
    swingRef.current.timer = swingRef.current.duration;
    swingRef.current.rangedTimer = 0;
  }

  if (rangedTriggerSeq !== swingRef.current.lastRangedSeq) {
    swingRef.current.lastRangedSeq = rangedTriggerSeq;
    swingRef.current.timer = 0;
    swingRef.current.move = null;
    swingRef.current.rangedTimer = 0.18;
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (!spritesRef.current) {
      spritesRef.current = new PixelSpriteRenderer();
    }
    const sprites = spritesRef.current;

    let rafId = 0;
    let last = performance.now();
    let animTime = 0;
    const scarfPoints = Array.from({ length: 4 }, (_, i) => ({
      x: 42 - i * 1.4,
      y: 47 + i * 2.1,
    }));

    const renderFrame = (now: number) => {
      rafId = requestAnimationFrame(renderFrame);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      animTime += dt;

      if (swingRef.current.timer > 0) {
        swingRef.current.timer = Math.max(0, swingRef.current.timer - dt);
        if (swingRef.current.timer <= 0) {
          swingRef.current.move = null;
        }
      }
      if (swingRef.current.rangedTimer > 0) {
        swingRef.current.rangedTimer = Math.max(0, swingRef.current.rangedTimer - dt);
      }

      const ps = stateRef.current;
      const armor = ARMORS[ps.armorId] ?? ARMORS.recruit_mk1;
      const meleeDefId = ps.meleeWeapon.defId;
      const meleeLv = getWeaponLevel(ps.meleeWeapon);
      const profile = getWeaponMoveProfile(meleeDefId);
      const hasFullShield =
        !isLightRangedCompatibleMelee(meleeDefId) &&
        meleeDefId !== 'dual_sword' &&
        meleeDefId !== 'katana';

      const activeMove = swingRef.current.timer > 0 ? swingRef.current.move : null;
      const prog =
        activeMove && swingRef.current.duration > 0
          ? 1 - swingRef.current.timer / swingRef.current.duration
          : 0;
      const airLiftY = activeMove === 'spin_vertical' ? -Math.sin(prog * Math.PI) * 14 : 0;

      scarfPoints[0].x = 44;
      scarfPoints[0].y = 48 + airLiftY;
      for (let i = 1; i < scarfPoints.length; i++) {
        const prev = scarfPoints[i - 1];
        const curr = scarfPoints[i];
        const wave = Math.sin(animTime * 5.5 + i * 0.85) * 0.45;
        curr.x += (prev.x - 1.3 - curr.x) * Math.min(1, dt * 18);
        curr.y += (prev.y + 2.1 + wave - curr.y) * Math.min(1, dt * 18);
      }

      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
      bg.addColorStop(0, '#0B0F1A');
      bg.addColorStop(1, '#141B2D');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = armor.palette.glow;
      ctx.beginPath();
      ctx.arc(48, 50, 26 + Math.sin(animTime * 3) * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = '#1E293B';
      ctx.fillRect(10, 72, 76, 8);
      ctx.fillStyle = armor.palette.glow;
      ctx.globalAlpha = 0.45;
      ctx.fillRect(14, 72, 68, 1);
      ctx.globalAlpha = 1;

      // Ground shockwave for Slam or projectile streak for Ranged fire preview
      // (Melee slashes use the real live blade-swept ribbon inside drawComplexSlayerAvatar!)
      if (activeMove === 'air_slam_impact' || activeMove === 'ground_slam_impact') {
        const alpha = Math.max(0, 1 - prog * 0.72);
        const arcColor =
          meleeLv >= 3 ? '#FACC15' : meleeLv === 2 ? '#00F0FF' : profile.trailColor;
        const r = Math.round(22 * Math.max(0.65, profile.reachScale));
        const spread = (r + 12) * (0.4 + prog * 0.7);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(48, 72);
        ctx.fillStyle = arcColor;
        ctx.beginPath();
        ctx.moveTo(-spread, 0);
        ctx.quadraticCurveTo(-spread * 0.45, -18 * (1 - prog * 0.5), 0, -6);
        ctx.quadraticCurveTo(spread * 0.45, -18 * (1 - prog * 0.5), spread, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.ellipse(0, 0, spread, 5, 0, Math.PI, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else if (activeMove === 'dual_cross_combo' && prog > 0.2) {
        const alpha = Math.max(0, 1 - (prog - 0.2) * 1.25);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(64, 54);
        ctx.strokeStyle = '#00F0FF';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(-12, -12);
        ctx.lineTo(12, 12);
        ctx.stroke();
        ctx.strokeStyle = '#F43F5E';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(-12, 12);
        ctx.lineTo(12, -12);
        ctx.stroke();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-9, -9);
        ctx.lineTo(9, 9);
        ctx.moveTo(-9, 9);
        ctx.lineTo(9, -9);
        ctx.stroke();
        ctx.restore();
      } else if (swingRef.current.rangedTimer > 0 && ps.rangedWeapon) {
        const rProg = 1 - swingRef.current.rangedTimer / 0.18;
        const shotX = 62 + rProg * 30;
        ctx.save();
        if (ps.rangedWeapon.defId === 'bow') {
          ctx.fillStyle = '#E2E8F0';
          ctx.fillRect(Math.round(shotX - 6), 54, 10, 1);
          ctx.fillStyle = '#4ADE80';
          ctx.fillRect(Math.round(shotX + 3), 53, 3, 3);
        } else if (ps.rangedWeapon.defId === 'shotgun') {
          ctx.fillStyle = '#FACC15';
          for (let i = -2; i <= 2; i++) {
            ctx.fillRect(Math.round(shotX), Math.round(54 + i * rProg * 5), 3, 2);
          }
        } else if (ps.rangedWeapon.defId === 'rifle') {
          ctx.fillStyle = '#00F0FF';
          ctx.fillRect(60, 53, 34, 3);
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(62, 54, 32, 1);
        } else {
          ctx.fillStyle = ps.rangedWeapon.defId === 'dual_pistol' ? '#00F0FF' : '#F97316';
          ctx.fillRect(Math.round(shotX), 53, 5, 2);
          if (ps.rangedWeapon.defId === 'dual_pistol') {
            ctx.fillRect(Math.round(shotX - 5), 57, 5, 2);
          }
        }
        ctx.restore();
      }

      drawComplexSlayerAvatar(ctx, sprites, {
        armorId: armor.id,
        palette: armor.palette,
        x: 41,
        y: 44 + airLiftY,
        width: 14,
        height: 28,
        facingRight: true,
        vx: 0,
        vy: 0,
        onGround: activeMove !== 'spin_vertical',
        isWallSliding: false,
        isDashing: false,
        isInvincible: false,
        isBlocking: false,
        parryFlash: 0,
        counterReady: false,
        meleeTimer: swingRef.current.timer,
        meleeDuration: swingRef.current.duration,
        meleeCombo: 1,
        isPogo: false,
        rangedTimer: swingRef.current.rangedTimer,
        doubleJumpFlip: 0,
        spinAttack: 0,
        walkPhase: 0,
        animTime,
        scaleX: 1,
        scaleY: 1,
        meleeWeaponId: meleeDefId,
        meleeWeaponLevel: meleeLv,
        rangedWeaponId: ps.rangedWeapon?.defId ?? null,
        rangedWeaponLevel: ps.rangedWeapon ? getWeaponLevel(ps.rangedWeapon) : 1,
        hasOffhandShield: hasFullShield,
        iaidoWindup: false,
        scarfPoints,
        combatMove: activeMove,
        combatMoveProgress: prog,
      });
    };

    rafId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={96}
      height={88}
      className="pixelated h-32 w-40 border border-ancient-stone bg-abyss-950"
    />
  );
}

export function InventoryModal({
  playerState,
  onEquipWeapon,
  onUnequipRanged,
  onUpgradeWeapon,
  onEquipArmor,
  onUnlockAllDemoGear,
  onClose,
}: InventoryModalProps) {
  const [comboStep, setComboStep] = useState(1);
  const [rangedTriggerSeq, setRangedTriggerSeq] = useState(0);
  const [moveTrigger, setMoveTrigger] = useState<{ seq: number; move: CombatMoveType }>({
    seq: 0,
    move: 'standard_slash',
  });

  const meleeOwned = playerState.weaponInventory.filter(
    (w) => WEAPONS[w.defId]?.slot === 'melee'
  );
  const rangedOwned = playerState.weaponInventory.filter(
    (w) => WEAPONS[w.defId]?.slot === 'ranged'
  );
  const isMeleeOnlyMode = playerState.rangedWeapon === null;
  const activeArmor = ARMORS[playerState.armorId] ?? ARMORS.recruit_mk1;
  const activeMeleeDef = WEAPONS[playerState.meleeWeapon.defId];
  const activeMeleeDamage = computeWeaponDamage(playerState.meleeWeapon);

  const triggerPreviewMove = (move: CombatMoveType) => {
    setMoveTrigger((prev) => ({ seq: prev.seq + 1, move }));
  };

  const handleTestCombo = () => {
    const seqMoves: CombatMoveType[] = ['standard_slash', 'spin_horizontal', 'mini_thrust'];
    const chosen = seqMoves[(comboStep - 1) % 3];
    triggerPreviewMove(chosen);
    setComboStep((prev) => (prev >= 3 ? 1 : prev + 1));
  };

  const renderWeaponCard = (inst: WeaponInstance, isMelee: boolean) => {
    const def = WEAPONS[inst.defId];
    if (!def) return null;
    const lv = getWeaponLevel(inst);
    const scaledDmg = computeWeaponDamage(inst);
    const upgradeCost = WEAPON_UPGRADE_COST[lv];
    const canAfford = upgradeCost !== undefined && playerState.shards >= upgradeCost;
    const equipped = isMelee
      ? playerState.meleeWeapon.defId === inst.defId
      : playerState.rangedWeapon?.defId === inst.defId;

    const cardSkill = isMelee ? getRightClickSkillMeta(inst.defId, false) : null;
    const handedText = !isMelee
      ? `${def.energyCost} EN · +Dagger`
      : isLightRangedCompatibleMelee(inst.defId)
        ? 'Sidearm Gun (No Slam)'
        : cardSkill && cardSkill.kind !== 'none'
          ? `${cardSkill.shortLabel} (${cardSkill.energyCost} EN)`
          : 'Melee Murni';

    const dmgPct = Math.min(100, Math.round((scaledDmg / 60) * 100));
    const spdPct = Math.max(18, Math.min(100, Math.round(((42 - def.attackCooldown) / 30) * 100)));
    const dmgMeta = DAMAGE_TYPE_LABEL[def.damageType];

    return (
      <div
        key={inst.defId}
        className={`border p-2.5 text-xs transition ${
          equipped
            ? isMelee
              ? 'border-slayer-orange bg-slayer-orange/10'
              : 'border-mana-cyan bg-mana-cyan/10'
            : 'border-ancient-stone bg-abyss-950/80 hover:border-slate-500'
        }`}
      >
        <button
          type="button"
          onClick={() => {
            onEquipWeapon(inst);
            if (isMelee) handleTestCombo();
            else setRangedTriggerSeq((s) => s + 1);
          }}
          className="w-full text-left"
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-bold text-white truncate">{def.name}</span>
            <span className="shrink-0 text-[10px] font-bold uppercase text-loot-gold tabular-nums">
              {equipped ? 'AKTIF' : `PILIH`}
            </span>
          </div>

          <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[10px] text-slate-400 tabular-nums">
            <span
              title={dmgMeta.detail}
              className={`font-semibold ${DMG_TYPE_TEXT_COLOR[def.damageType] ?? 'text-slate-300'}`}
            >
              {dmgMeta.label}
            </span>
            <span>·</span>
            <span className={lv >= 3 ? 'text-loot-gold font-bold' : lv === 2 ? 'text-mana-cyan font-bold' : ''}>
              Lv.{lv}
              {lv >= 2 ? ' ★' : ''}
            </span>
            <span>·</span>
            <span>{handedText}</span>
            <span>·</span>
            <span>Crit {Math.round(def.critChance * 100)}%</span>
          </div>

          <div className="mt-1.5 grid grid-cols-2 gap-2 text-[9px] text-slate-400 tabular-nums">
            <div>
              <div className="flex justify-between">
                <span>DMG</span>
                <span className="text-slate-200 font-semibold">
                  {scaledDmg}
                  {def.hitsPerAttack > 1 ? `×${def.hitsPerAttack}` : ''}
                </span>
              </div>
              <div className="mt-0.5 h-1 w-full bg-abyss-900">
                <div className="h-full bg-slayer-orange" style={{ width: `${dmgPct}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between">
                <span>SPD · Jangkau</span>
                <span className="text-slate-200 font-semibold">{def.reachRating}/5</span>
              </div>
              <div className="mt-0.5 h-1 w-full bg-abyss-900">
                <div className="h-full bg-mana-cyan" style={{ width: `${spdPct}%` }} />
              </div>
            </div>
          </div>

          <p className="mt-1.5 text-[10px] leading-snug text-slate-400">{def.specialTrait}</p>
        </button>

        <div className="mt-2 flex items-center justify-between border-t border-ancient-stone/50 pt-1.5 text-[10px] tabular-nums">
          <span className="uppercase text-slate-500">{inst.tier}</span>
          {upgradeCost !== undefined ? (
            <button
              type="button"
              disabled={!canAfford}
              onClick={() => onUpgradeWeapon(inst.defId)}
              className={`inline-flex items-center gap-1 border px-2 py-0.5 font-bold transition ${
                canAfford
                  ? 'border-loot-gold bg-loot-gold/15 text-loot-gold hover:bg-loot-gold/30'
                  : 'cursor-not-allowed border-ancient-stone/50 text-slate-500'
              }`}
            >
              <ArrowUpCircle className="h-3 w-3" /> Upgrade Lv.{lv + 1} ({upgradeCost})
            </button>
          ) : (
            <span className="font-bold text-loot-gold">MAX LEVEL</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-abyss-950/90 p-2.5 sm:p-4">
      <div className="max-h-[92dvh] w-full max-w-4xl overflow-y-auto border-2 border-loot-gold/70 bg-abyss-900 p-3.5 sm:p-5 shadow-2xl">
        {/* Header */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-ancient-stone pb-3">
          <div>
            <h2 className="font-pixel text-xs sm:text-sm text-loot-gold">SLAYER ARSENAL &amp; FORGE</h2>
            <p className="mt-1 text-[11px] text-slate-400">
              Pilih salah satu: <strong className="text-slayer-orange">Mode Melee Murni</strong> (Skill sesuai senjata + Energy) ATAU{' '}
              <strong className="text-mana-cyan">Mode Range + Short Dagger</strong> (Dagger tanpa Slam).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-1 text-[11px] font-bold text-loot-gold tabular-nums">
              {playerState.shards} SHARDS
            </span>
            <button
              type="button"
              onClick={onUnlockAllDemoGear}
              className="min-h-[40px] inline-flex items-center gap-1 border border-mana-cyan/60 bg-mana-cyan/10 px-2.5 py-1 text-[10px] font-bold text-mana-cyan hover:bg-mana-cyan/20"
            >
              <Sparkles className="h-3.5 w-3.5" /> Sandbox: Buka 13 Senjata &amp; 6 Armor
            </button>
            <button
              type="button"
              aria-label="Tutup Arsenal"
              onClick={onClose}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center border border-ancient-stone p-1.5 text-slate-300 hover:border-slayer-red hover:text-slayer-red"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Live Animated Stickman Slayer Loadout Preview */}
        {(() => {
          const activeRangedDef = playerState.rangedWeapon
            ? WEAPONS[playerState.rangedWeapon.defId]
            : undefined;
          const activeSkill = getRightClickSkillMeta(
            playerState.meleeWeapon.defId,
            playerState.rangedWeapon !== null,
            activeRangedDef?.energyCost ?? 8
          );
          const allowAirSlam = canWeaponAirSlam(playerState.meleeWeapon.defId);

          return (
            <div className="mb-4 flex flex-col sm:flex-row items-center gap-4 border border-ancient-stone bg-abyss-950/90 p-3">
              <div className="flex flex-col items-center gap-1.5 shrink-0 w-44">
                <SlayerPreviewCanvas
                  playerState={playerState}
                  moveTrigger={moveTrigger}
                  rangedTriggerSeq={rangedTriggerSeq}
                />
                <div className="grid w-full grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={handleTestCombo}
                    className="inline-flex items-center justify-center gap-1 border border-slayer-orange/70 bg-slayer-orange/15 px-1.5 py-1 text-[9px] font-bold text-slayer-orange hover:bg-slayer-orange/25"
                  >
                    <Play className="h-2.5 w-2.5" /> {isMeleeOnlyMode ? `Combo ${comboStep}` : `Dagger ${comboStep}`}
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerPreviewMove('spin_vertical')}
                    className="border border-mana-cyan/60 bg-mana-cyan/10 px-1.5 py-1 text-[9px] font-bold text-mana-cyan hover:bg-mana-cyan/20"
                  >
                    Spin V
                  </button>
                  {activeSkill.kind === 'ranged' ? (
                    <button
                      type="button"
                      onClick={() => setRangedTriggerSeq((s) => s + 1)}
                      className="border border-emerald-400/70 bg-emerald-500/15 px-1.5 py-1 text-[9px] font-bold text-emerald-300 hover:bg-emerald-500/25"
                    >
                      {playerState.rangedWeapon?.defId === 'bow' ? 'Tarik Busur' : 'Tembak Range'}
                    </button>
                  ) : activeSkill.kind === 'dash_thrust' ? (
                    <button
                      type="button"
                      onClick={() => triggerPreviewMove('dash_thrust')}
                      className="border border-rose-400/70 bg-rose-500/15 px-1.5 py-1 text-[9px] font-bold text-rose-300 hover:bg-rose-500/25"
                    >
                      Thrust ({activeSkill.energyCost} EN)
                    </button>
                  ) : activeSkill.kind === 'ground_slam' ? (
                    <button
                      type="button"
                      onClick={() => triggerPreviewMove('ground_slam_impact')}
                      className="border border-amber-400/70 bg-amber-500/15 px-1.5 py-1 text-[9px] font-bold text-amber-300 hover:bg-amber-500/25"
                    >
                      G-Slam ({activeSkill.energyCost} EN)
                    </button>
                  ) : activeSkill.kind === 'dual_combo' ? (
                    <button
                      type="button"
                      onClick={() => triggerPreviewMove('dual_cross_combo')}
                      className="border border-fuchsia-400/70 bg-fuchsia-500/15 px-1.5 py-1 text-[9px] font-bold text-fuchsia-300 hover:bg-fuchsia-500/25"
                    >
                      Dual X ({activeSkill.energyCost} EN)
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => triggerPreviewMove('mini_thrust')}
                      className="border border-rose-400/60 bg-rose-500/10 px-1.5 py-1 text-[9px] font-bold text-rose-300 hover:bg-rose-500/20"
                    >
                      Thrust
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={!allowAirSlam}
                    onClick={() => allowAirSlam && triggerPreviewMove('air_slam_impact')}
                    className={`border px-1.5 py-1 text-[9px] font-bold ${
                      allowAirSlam
                        ? 'border-loot-gold/70 bg-loot-gold/15 text-loot-gold hover:bg-loot-gold/25'
                        : 'cursor-not-allowed border-ancient-stone/50 bg-abyss-900 text-slate-500'
                    }`}
                  >
                    {allowAirSlam ? 'Air Slam' : 'No Slam'}
                  </button>
                </div>
              </div>

              <div className="flex-1 w-full text-xs">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400">
                      {activeArmor.archetype}
                    </div>
                    <div className="font-bold text-sm text-white">{activeArmor.name}</div>
                  </div>
                  <div className="text-[11px] text-slate-300 tabular-nums">
                    HP <strong className="text-loot-green">{playerState.maxHp}</strong> · DEF{' '}
                    <strong className="text-mana-cyan">{activeArmor.defPercent}%</strong> · SPD{' '}
                    <strong className="text-loot-gold">{Math.round(activeArmor.speedMult * 100)}%</strong>
                  </div>
                </div>

                <p className="mt-1 text-[11px] text-slate-400">{activeArmor.passiveDesc}</p>

                <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 border-t border-ancient-stone/60 pt-2 text-[11px] tabular-nums">
                  <div>
                    <span className="text-slate-400">Melee Aktif: </span>
                    <strong className="text-white">{activeMeleeDef?.name}</strong>{' '}
                    <span className={DMG_TYPE_TEXT_COLOR[activeMeleeDef?.damageType ?? 'slash']}>
                      ({DAMAGE_TYPE_LABEL[activeMeleeDef?.damageType ?? 'slash'].label} · {activeMeleeDamage} DMG)
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Skill Khusus ({activeSkill.inputHint}): </span>
                    <strong className={playerState.rangedWeapon ? 'text-mana-cyan' : 'text-slayer-orange'}>
                      {playerState.rangedWeapon
                        ? `${activeRangedDef?.name} (${activeSkill.energyCost} EN)`
                        : activeSkill.kind === 'none'
                          ? 'Kombo 3-Hit & Aerial Slam'
                          : `${activeSkill.label} (${activeSkill.energyCost} EN)`}
                    </strong>
                  </div>
                </div>
                <div className="mt-1.5 text-[10px] text-slate-400">
                  Combo 3-Hit: <strong className="text-slate-200">Slash → Spin Horizontal → Thrust Kecil</strong> · Udara:{' '}
                  <strong className="text-mana-cyan">Tap = Spin Vertical</strong> ·{' '}
                  {allowAirSlam ? (
                    <strong className="text-loot-gold">Hold = Air Slam</strong>
                  ) : (
                    <strong className="text-slate-500">Dagger tidak bisa Slam</strong>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Weapons Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-slayer-orange tabular-nums">
              <Sword className="h-4 w-4" /> MELEE WEAPONS ({meleeOwned.length}/8)
            </div>
            <div className="space-y-2">{meleeOwned.map((inst) => renderWeaponCard(inst, true))}</div>
          </div>

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-mana-cyan tabular-nums">
              <span className="flex items-center gap-1.5">
                <Crosshair className="h-4 w-4" /> RANGED ARSENAL ({rangedOwned.length}/5)
              </span>
              {isMeleeOnlyMode ? (
                <span className="text-[10px] font-normal text-slayer-orange">
                  Mode Melee Murni (Dash Thrust)
                </span>
              ) : (
                playerState.rangedWeapon &&
                onUnequipRanged && (
                  <button
                    type="button"
                    onClick={onUnequipRanged}
                    className="border border-ancient-stone px-2 py-0.5 text-[10px] text-slate-300 hover:border-slayer-orange hover:text-slayer-orange"
                  >
                    Lepas Range
                  </button>
                )
              )}
            </div>
            {isMeleeOnlyMode && (
              <div className="mb-2 border border-slayer-orange/40 bg-slayer-orange/10 p-2 text-[10px] text-slate-300">
                Sedang dalam Mode Melee Murni (Klik Kanan = Dash Thrust). Pilih Pistol, Dual Pistol, Shotgun, Bow, atau Rifle di bawah untuk tampil di tangan +{' '}
                <strong className="text-mana-cyan">Quick-Draw Short Dagger</strong> saat hit melee.
              </div>
            )}
            <div className="space-y-2">
              {rangedOwned.map((inst) => renderWeaponCard(inst, false))}
            </div>
          </div>
        </div>

        {/* 6 Armor Sets */}
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-xs font-bold text-loot-green tabular-nums">
            <span className="flex items-center gap-1.5">
              <Shield className="h-4 w-4" /> SEALED ARMOR &amp; CLOAK SETS ({playerState.armorInventory.length}/6)
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {ARMOR_ORDER.map((id) => {
              const armor = ARMORS[id];
              const owned = playerState.armorInventory.includes(id as ArmorId);
              const equipped = playerState.armorId === id;
              return (
                <button
                  key={id}
                  type="button"
                  disabled={!owned}
                  onClick={() => onEquipArmor(id as ArmorId)}
                  className={`border p-2.5 text-left text-xs transition ${
                    !owned
                      ? 'cursor-not-allowed border-ancient-stone/40 bg-abyss-950/40 opacity-50'
                      : equipped
                        ? 'border-loot-green bg-loot-green/12'
                        : 'border-ancient-stone bg-abyss-950/80 hover:border-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 font-bold">
                    <span className="flex items-center gap-1.5 text-white truncate">
                      <span className="flex items-center shrink-0">
                        <span
                          className="inline-block h-3 w-2 border border-black"
                          style={{ backgroundColor: armor.palette.cloak }}
                        />
                        <span
                          className="inline-block h-3 w-2 border-y border-r border-black"
                          style={{ backgroundColor: armor.palette.visor }}
                        />
                      </span>
                      <span className="truncate">{armor.name}</span>
                    </span>
                    <span className="shrink-0 text-[10px] text-loot-green">
                      {!owned ? 'LOCKED' : equipped ? 'AKTIF' : 'PAKAI'}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[10px] text-slate-400">{armor.archetype}</div>
                  <div className="mt-1 text-[10px] text-slate-200 tabular-nums">
                    +{armor.hpBonus} HP · +{armor.defPercent}% DEF · {Math.round(armor.speedMult * 100)}% SPD
                  </div>
                  <div className="mt-0.5 text-[10px] leading-snug text-slate-400">
                    {armor.passiveDesc}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
