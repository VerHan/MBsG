// ============================================================
// RIFTBOUND: SLAYER CORPS — Inventory & Loadout Modal
// Equip Melee, Ranged, and DOOM-style Full-Helmet Armor
// ============================================================

import { Shield, Sword, Crosshair, Sparkles, X } from 'lucide-react';
import type { ArmorId, PlayerState, WeaponInstance } from '../types';
import { ARMORS, ARMOR_ORDER } from '../data/armors';
import { WEAPONS } from '../data/weapons';

interface InventoryModalProps {
  playerState: PlayerState;
  onEquipWeapon: (weapon: WeaponInstance) => void;
  onEquipArmor: (armorId: ArmorId) => void;
  onUnlockAllDemoGear: () => void;
  onClose: () => void;
}

export function InventoryModal({
  playerState,
  onEquipWeapon,
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

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-abyss-950/85 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto border-2 border-loot-gold/70 bg-abyss-900 p-5 shadow-2xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-ancient-stone pb-3">
          <div>
            <h2 className="font-pixel text-sm text-loot-gold">SLAYER ARSENAL &amp; ARMOR</h2>
            <p className="mt-1 text-[11px] text-slate-400">
              Pilih 1 Senjata Melee, 1 Senjata Ranged, dan 1 Set Armor Full-Helmet.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onUnlockAllDemoGear}
              className="inline-flex items-center gap-1 border border-mana-cyan/60 bg-mana-cyan/10 px-2.5 py-1 text-[10px] font-bold text-mana-cyan hover:bg-mana-cyan/20"
            >
              <Sparkles className="h-3.5 w-3.5" /> Sandbox: Buka Semua Gear Demo
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
              <Sword className="h-4 w-4" /> MELEE WEAPONS (SLOT 1)
            </div>
            <div className="space-y-2">
              {meleeOwned.map((inst, idx) => {
                const def = WEAPONS[inst.defId];
                const equipped =
                  playerState.meleeWeapon.defId === inst.defId &&
                  playerState.meleeWeapon.tier === inst.tier;
                return (
                  <button
                    key={`${inst.defId}_${idx}`}
                    type="button"
                    onClick={() => onEquipWeapon(inst)}
                    className={`w-full border p-2.5 text-left text-xs transition ${
                      equipped
                        ? 'border-slayer-orange bg-slayer-orange/15'
                        : 'border-ancient-stone bg-abyss-950/80 hover:border-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-white">
                      <span>{def.name}</span>
                      <span className="text-[10px] uppercase text-loot-gold">
                        {equipped ? 'EQUIPPED' : inst.tier}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-400">{def.specialTrait}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ranged Slot */}
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-mana-cyan">
              <Crosshair className="h-4 w-4" /> RANGED WEAPONS (SLOT 2)
            </div>
            <div className="space-y-2">
              {rangedOwned.map((inst, idx) => {
                const def = WEAPONS[inst.defId];
                const equipped =
                  playerState.rangedWeapon.defId === inst.defId &&
                  playerState.rangedWeapon.tier === inst.tier;
                return (
                  <button
                    key={`${inst.defId}_${idx}`}
                    type="button"
                    onClick={() => onEquipWeapon(inst)}
                    className={`w-full border p-2.5 text-left text-xs transition ${
                      equipped
                        ? 'border-mana-cyan bg-mana-cyan/15'
                        : 'border-ancient-stone bg-abyss-950/80 hover:border-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-white">
                      <span>{def.name}</span>
                      <span className="text-[10px] uppercase text-mana-purple">
                        {equipped ? 'EQUIPPED' : `${inst.tier} · ${def.energyCost} EN`}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-400">{def.specialTrait}</p>
                  </button>
                );
              })}
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
