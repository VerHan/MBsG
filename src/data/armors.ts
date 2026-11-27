// ============================================================
// RIFTBOUND: SLAYER CORPS — Armor Definitions (4 Sets)
// All armor is DOOM-style full-helmet with sealed visor.
// ============================================================

import type { ArmorDef } from '../types';

export const ARMORS: Record<string, ArmorDef> = {
  recruit_mk1: {
    id: 'recruit_mk1',
    name: 'Slayer Recruit Mk.I',
    hpBonus: 0,
    defPercent: 0,
    speedMult: 1.0,
    dashCdMult: 1.0,
    energyCostMult: 1.0,
    passiveDesc: 'Standard Slayer Corps Mana filter. No special bonuses.',
    palette: {
      primary: '#2B2F3A',   // dark steel
      secondary: '#1F2430', // darker plates
      visor: '#F97316',     // orange visor
      glow: '#F97316',
    },
  },

  vanguard: {
    id: 'vanguard',
    name: 'Vanguard Breach Plate',
    hpBonus: 50,
    defPercent: 25,
    speedMult: 1.0,
    dashCdMult: 1.0,
    energyCostMult: 1.0,
    passiveDesc: 'Reduces knockback received by 70%. Tank-class armor.',
    palette: {
      primary: '#3D5A3A',   // olive steel
      secondary: '#2B3F2A', // dark olive
      visor: '#22C55E',     // green T-visor
      glow: '#22C55E',
    },
  },

  rift_stalker: {
    id: 'rift_stalker',
    name: 'Rift-Stalker Carapace',
    hpBonus: 20,
    defPercent: 10,
    speedMult: 1.15,       // +15% movement speed
    dashCdMult: 0.7,       // dash cooldown reduced by 30%
    energyCostMult: 0.8,   // ranged energy cost -20%
    passiveDesc: '+15% Speed, Dash CD -30%, Ranged energy -20%. Agility-class armor.',
    palette: {
      primary: '#2D1B4E',   // dark purple
      secondary: '#1A1028', // near-black purple
      visor: '#00F0FF',     // cyan visor
      glow: '#00F0FF',
    },
  },

  aether_praetor: {
    id: 'aether_praetor',
    name: 'Aether-Forge Praetor',
    hpBonus: 80,
    defPercent: 35,
    speedMult: 1.0,
    dashCdMult: 1.0,
    energyCostMult: 1.0,
    passiveDesc: 'Killing an enemy restores +1 HP. +15% all damage dealt. Endgame-class.',
    palette: {
      primary: '#1A1A2E',   // dark navy-black
      secondary: '#D4A017', // golden plates
      visor: '#FACC15',     // gold visor
      glow: '#A855F7',      // rune purple glow
    },
  },
};

/** Starting armor for new game */
export const DEFAULT_ARMOR = 'recruit_mk1';

/** Armor order for progression display */
export const ARMOR_ORDER: string[] = [
  'recruit_mk1',
  'vanguard',
  'rift_stalker',
  'aether_praetor',
];
