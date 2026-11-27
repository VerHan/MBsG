// ============================================================
// RIFTBOUND: SLAYER CORPS — Inventory & Weapon Forge Modal
// 1-Slot Primary Focus:
//   - Light 1H Melee (Dagger / Sword) pairs with any Ranged Gun
//   - Heavy 2H Melee (Spear, Katana, Axe, Hammer, Dual Sword)
//     uses Off-Hand Shield/Scabbard/Twin Blade & disables Gun.
// ============================================================

import { ArrowUpCircle, Crosshair, Shield, Sparkles, Sword, X } from 'lucide-react';
import type { ArmorId, PlayerState, WeaponId, WeaponInstance } from '../types';
import { ARMORS, ARMOR_ORDER } from '../data/armors';
import {
  WEAPONS,
  WEAPON_UPGRADE_COST,
  getWeaponLevel,
  isLightRangedCompatibleMelee,
} from '../data/weapons';

interface InventoryModalProps {
  playerState: PlayerState;
  onEquipWeapon: (weapon: WeaponInstance) => void;
  onUnequipRanged?: () => void;
  onUpgradeWeapon: (weaponId: WeaponId) => void;
  onEquipArmor: (armorId: ArmorId) => void;
  onUnlockAllDemoGear: () => void;
  onClose: () => void;
}

function LevelBadge({ level }: { level: number }) {
  if (level >= 3) {
    return (
      <span className="border border-loot-gold bg-loot-gold/20 px-1.5 py-0.5 text-[9px] font-bold text-loot-gold shadow-[0_0_8px_rgba(250,204,21,0.5)]">
        LV.3 MAX GLOW
      </span>
    );
  }
  if (level === 2) {
    return (
      <span className="border border-mana-cyan bg-mana-cyan/20 px-1.5 py-0.5 text-[9px] font-bold text-mana-cyan shadow-[0_0_6px_rgba(0,240,255,0.45)]">
        LV.2 GLOW
      </span>
    );
  }
  return (
    <span className="border border-ancient-stone bg-abyss-900 px-1.5 py-0.5 text-[9px] font-bold text-slate-400">
      LV.1
    </span>
  );
}

function HandedBadge({ defId }: { defId: WeaponId }) {
  if (isLightRangedCompatibleMelee(defId)) {
    return (
      <span className="border border-loot-green/60 bg-loot-green/10 px-1.5 py-0.5 text-[8px] font-bold text-loot-green">
        1H · +GUN
      </span>
    );
  }
  if (defId === 'dual_sword') {
    return (
      <span className="border border-mana-purple/70 bg-mana-purple/15 px-1.5 py-0.5 text-[8px] font-bold text-mana-purple">
        2H TWIN · NO GUN
      </span>
    );
  }
  if (defId === 'katana') {
    return (
      <span className="border border-slayer-red/70 bg-slayer-red/15 px-1.5 py-0.5 text-[8px] font-bold text-slayer-red">
        2H IAIDO · NO GUN
      </span>
    );
  }
  return (
    <span className="border border-slayer-orange/70 bg-slayer-orange/15 px-1.5 py-0.5 text-[8px] font-bold text-slayer-orange">
      2H +SHIELD · NO GUN
    </span>
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
  const meleeOwned = playerState.weaponInventory.filter(
    (w) => WEAPONS[w.defId]?.slot === 'melee'
  );
  const rangedOwned = playerState.weaponInventory.filter(
    (w) => WEAPONS[w.defId]?.slot === 'ranged'
  );
  const usingHeavy2H = !isLightRangedCompatibleMelee(playerState.meleeWeapon.defId);

  const renderWeaponCard = (inst: WeaponInstance, isMelee: boolean) => {
    const def = WEAPONS[inst.defId];
    if (!def) return null;
    const lv = getWeaponLevel(inst);
    const upgradeCost = WEAPON_UPGRADE_COST[lv];
    const canAfford = upgradeCost !== undefined && playerState.shards >= upgradeCost;
    const equipped = isMelee
      ? playerState.meleeWeapon.defId === inst.defId
      : playerState.rangedWeapon?.defId === inst.defId;

    return (
      <div
        key={inst.defId}
        className={`border p-2.5 text-xs transition ${
          equipped
            ? isMelee
              ? 'border-slayer-orange bg-slayer-orange/15'
              : 'border-mana-cyan bg-mana-cyan/15'
            : 'border-ancient-stone bg-abyss-950/80'
        }`}
      >
        <button
          type="button"
          onClick={() => onEquipWeapon(inst)}
          className="w-full text-left"
        >
          <div className="flex flex-wrap items-center justify-between gap-1.5 font-bold text-white">
            <span className="flex flex-wrap items-center gap-1.5">
              {def.name}
              <LevelBadge level={lv} />
              {isMelee && <HandedBadge defId={inst.defId} />}
            </span>
            <span className="text-[10px] uppercase text-loot-gold">
              {equipped ? 'EQUIPPED ✓' : `${inst.tier} · PILIH`}
            </span>
          </div>
          <p className="mt-1 text-[10px] text-slate-400">{def.specialTrait}</p>
        </button>

        <div className="mt-2 flex items-center justify-between border-t border-ancient-stone/50 pt-1.5 text-[10px]">
          <span className="text-slate-400">
            Tier: <span className="uppercase text-slate-200">{inst.tier}</span>
            {!isMelee && ` · ${def.energyCost} EN`}
          </span>

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
              <ArrowUpCircle className="h-3 w-3" /> Upgrade Lv.{lv + 1} ({upgradeCost} Shards)
            </button>
          ) : (
            <span className="font-bold text-loot-gold">MAX LEVEL</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-abyss-950/85 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto border-2 border-loot-gold/70 bg-abyss-900 p-5 shadow-2xl">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-ancient-stone pb-3">
          <div>
            <h2 className="font-pixel text-sm text-loot-gold">SLAYER ARSENAL &amp; FORGE</h2>
            <p className="mt-1 text-[11px] text-slate-400">
              <strong className="text-loot-green">1-Tangan (Dagger/Sword)</strong> bisa bawa Gun ·{' '}
              <strong className="text-slayer-orange">2-Tangan (Spear/Katana/Axe/Hammer/Dual)</strong>{' '}
              pakai Off-hand Shield/Sarung (Tanpa Gun).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="border border-loot-gold/60 bg-abyss-950 px-2.5 py-1 text-[11px] font-bold text-loot-gold">
              {playerState.shards} SHARDS
            </span>
            <button
              type="button"
              onClick={onUnlockAllDemoGear}
              className="inline-flex items-center gap-1 border border-mana-cyan/60 bg-mana-cyan/10 px-2.5 py-1 text-[10px] font-bold text-mana-cyan hover:bg-mana-cyan/20"
            >
              <Sparkles className="h-3.5 w-3.5" /> Sandbox: Buka 11 Senjata
            </button>
            <button
              type="button"
              onClick={onClose}
              className="border border-ancient-stone p-1.5 text-slate-300 hover:border-slayer-red hover:text-slayer-red"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Melee Slot */}
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-slayer-orange">
              <Sword className="h-4 w-4" /> MELEE WEAPONS (UTAMA · {meleeOwned.length}/7)
            </div>
            <div className="space-y-2">
              {meleeOwned.map((inst) => renderWeaponCard(inst, true))}
            </div>
          </div>

          {/* Ranged Slot */}
          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-mana-cyan">
              <span className="flex items-center gap-1.5">
                <Crosshair className="h-4 w-4" /> RANGED GUN ({rangedOwned.length}/4)
              </span>
              {usingHeavy2H ? (
                <span className="text-[9px] text-slayer-orange">
                  OFF-HAND: ENERGY SHIELD / 2H
                </span>
              ) : (
                playerState.rangedWeapon &&
                onUnequipRanged && (
                  <button
                    type="button"
                    onClick={onUnequipRanged}
                    className="border border-ancient-stone px-2 py-0.5 text-[9px] text-slate-300 hover:border-slayer-orange hover:text-slayer-orange"
                  >
                    Lepas Gun
                  </button>
                )
              )}
            </div>
            {usingHeavy2H && (
              <div className="mb-2 border border-slayer-orange/50 bg-slayer-orange/10 p-2 text-[10px] text-slate-300">
                Memakai senjata 2-Tangan (Gun tidak aktif). Klik senjata Ranged di bawah untuk
                otomatis ganti ke Dagger / Sword + Gun.
              </div>
            )}
            <div className="space-y-2">
              {rangedOwned.map((inst) => renderWeaponCard(inst, false))}
            </div>
          </div>
        </div>

        {/* Armors */}
        <div className="mt-4">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-loot-green">
            <Shield className="h-4 w-4" /> DOOM-STYLE SEALED ARMOR SETS
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
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
                        ? 'border-loot-green bg-loot-green/15'
                        : 'border-ancient-stone bg-abyss-950/80 hover:border-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-2 text-white">
                      <span
                        className="inline-block h-3 w-3 border border-black"
                        style={{ backgroundColor: armor.palette.visor }}
                      />
                      {armor.name}
                    </span>
                    <span className="text-[10px] text-loot-green">
                      {!owned ? 'LOCKED' : equipped ? 'EQUIPPED' : 'EQUIP'}
                    </span>
                  </div>
                  <div className="mt-1 text-[10px] text-slate-300">
                    +{armor.hpBonus} HP · +{armor.defPercent}% DEF
                  </div>
                  <div className="mt-0.5 text-[10px] text-slate-400">{armor.passiveDesc}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
