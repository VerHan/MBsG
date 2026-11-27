// ============================================================
// RIFTBOUND: SLAYER CORPS — Armor Definitions (6 Distinct Sets)
// Silksong-Inspired Gothic Cloaks + Sealed Slayer Helmets.
// Each armor has a distinct silhouette, back accessory, cloak hue,
// and real combat passive.
// ============================================================

import type { ArmorDef, ArmorId } from '../types';

export const ARMORS: Record<ArmorId, ArmorDef> = {
  recruit_mk1: {
    id: 'recruit_mk1',
    name: 'Crimson Thread Cloak',
    archetype: 'Balanced Scout',
    hpBonus: 0,
    defPercent: 5,
    speedMult: 1.03,
    dashCdMult: 0.95,
    energyCostMult: 1.0,
    passiveDesc: 'Jubah sutra merah klasik Slayer Corps. +15% Energy dari serangan melee.',
    palette: {
      primary: '#2A2D3B',
      secondary: '#1B1E29',
      visor: '#F43F5E',
      glow: '#FB7185',
      cloak: '#BE123C',
    },
  },

  moss_warden: {
    id: 'moss_warden',
    name: 'Mossbell Warden',
    archetype: 'Sustain & Aerial',
    hpBonus: 35,
    defPercent: 15,
    speedMult: 1.0,
    dashCdMult: 1.0,
    energyCostMult: 0.95,
    pogoBonus: 0.25,
    regenInterval: 4.5,
    passiveDesc: 'Pulih +1 HP tiap 4.5s saat berpijak & +25% Pogo Strike DMG.',
    palette: {
      primary: '#2D4A3E',
      secondary: '#1C3028',
      visor: '#4ADE80',
      glow: '#86EFAC',
      cloak: '#15803D',
    },
  },

  vanguard: {
    id: 'vanguard',
    name: 'Ironbell Bastion',
    archetype: 'Heavy Tank',
    hpBonus: 55,
    defPercent: 25,
    speedMult: 0.96,
    dashCdMult: 1.0,
    energyCostMult: 1.0,
    passiveDesc: 'Tahan 70% knockback + memantulkan gelombang kejut saat Block sukses.',
    palette: {
      primary: '#4A433A',
      secondary: '#2E2924',
      visor: '#F59E0B',
      glow: '#FCD34D',
      cloak: '#78350F',
    },
  },

  rift_stalker: {
    id: 'rift_stalker',
    name: 'Weaver Shadow Shroud',
    archetype: 'Agile Assassin',
    hpBonus: 20,
    defPercent: 10,
    speedMult: 1.15,
    dashCdMult: 0.7,
    energyCostMult: 0.8,
    critBonus: 0.12,
    passiveDesc: '+15% Speed, Dash CD -30%, Energy Gun -20%, dan +12% Crit Chance.',
    palette: {
      primary: '#2B1948',
      secondary: '#160D26',
      visor: '#00F0FF',
      glow: '#38BDF8',
      cloak: '#581C87',
    },
  },

  needle_dancer: {
    id: 'needle_dancer',
    name: 'Gilded Silk-Dancer',
    archetype: 'Parry Duelist',
    hpBonus: 15,
    defPercent: 12,
    speedMult: 1.1,
    dashCdMult: 0.85,
    energyCostMult: 0.9,
    attackSpeedMult: 0.82,
    parryBonus: 0.1,
    critBonus: 0.08,
    passiveDesc: '+20% Kecepatan Serang, jendela Parry +0.10s, +8% Crit. Ideal untuk kombo.',
    palette: {
      primary: '#F1F5F9',
      secondary: '#94A3B8',
      visor: '#E11D48',
      glow: '#FACC15',
      cloak: '#9F1239',
    },
  },

  aether_praetor: {
    id: 'aether_praetor',
    name: 'Citadel Choir Praetor',
    archetype: 'Endgame Relic',
    hpBonus: 80,
    defPercent: 35,
    speedMult: 1.04,
    dashCdMult: 0.9,
    energyCostMult: 0.9,
    critBonus: 0.06,
    passiveDesc: 'Mengalahkan musuh memulihkan +2 HP & +15% seluruh Damage.',
    palette: {
      primary: '#1E1B2E',
      secondary: '#D4A017',
      visor: '#FACC15',
      glow: '#C084FC',
      cloak: '#4C1D95',
    },
  },
};

/** Starting armor for new game */
export const DEFAULT_ARMOR: ArmorId = 'recruit_mk1';

/** Armor order for progression display */
export const ARMOR_ORDER: ArmorId[] = [
  'recruit_mk1',
  'moss_warden',
  'vanguard',
  'rift_stalker',
  'needle_dancer',
  'aether_praetor',
];
