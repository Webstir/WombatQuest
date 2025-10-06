/**
 * Drug system with effects, duration, and stacking
 */

import type { DrugEffect, DrugType, PlayerDrugs, PlayerStats } from './types';
import { applyStatEffect, DEFAULT_STAT_BOUNDS } from './stats';

/**
 * Drug effect definitions
 */
export const DRUG_DEFINITIONS: Record<DrugType, Partial<DrugEffect>> = {
  caffeine: {
    type: 'caffeine',
    duration: 10, // 10 seconds
    intensity: 0.3,
    effects: {
      timeScale: 1.2, // 20% faster time
      speed: 20, // +20 speed
      energy: 15, // +15 energy
      thirst: -10, // -10 thirst (dehydrating)
    },
  },
  alcohol: {
    type: 'alcohol',
    duration: 12, // 2 hours = 12 seconds (2 * 6)
    intensity: 0.5,
    effects: {
      timeScale: 0.8, // 20% slower time
      speed: -15, // -15 speed
      mood: 20, // +20 mood
      energy: -10, // -10 energy
      thirst: 15, // +15 thirst
    },
  },
  mdma: {
    type: 'mdma',
    duration: 24, // 4 hours = 24 seconds (4 * 6)
    intensity: 0.8,
    effects: {
      timeScale: 1.5, // 50% faster time
      speed: 30, // +30 speed
      mood: 40, // +40 mood
      energy: 25, // +25 energy
      thirst: 20, // +20 thirst
      hunger: -15, // -15 hunger
    },
  },
  weed: {
    type: 'weed',
    duration: 18, // 3 hours = 18 seconds (3 * 6)
    intensity: 0.4,
    effects: {
      timeScale: 0.7, // 30% slower time
      mood: 15, // +15 mood
      hunger: 20, // +20 hunger (munchies)
      speed: -10, // -10 speed
    },
  },
  molly: {
    type: 'molly',
    duration: 18, // 3 hours = 18 seconds (3 * 6)
    intensity: 1.0,
    effects: {
      timeScale: 0.3, // 70% slower time (30% of normal speed)
      mood: 25, // +25 mood (molly raises mood)
      energy: 10, // +10 energy (reduced from 20)
      thirst: 20, // +20 thirst (molly makes you thirsty)
      hunger: -5, // -5 hunger (reduced from -10)
    },
  },
  shrooms: {
    type: 'shrooms',
    duration: 48, // 8 hours = 48 seconds (8 * 6)
    intensity: 0.8,
    effects: {
      timeScale: 0.5, // 50% slower time
      mood: 25, // +25 mood (mushrooms help mood)
      hunger: -8, // -8 hunger (reduced from -15)
      karma: 8, // +8 karma (reduced from 15)
    },
  },
  acid: {
    type: 'acid',
    duration: 45, // 45 seconds
    intensity: 1.0,
    effects: {
      timeScale: 0.2, // 80% slower time
      mood: 12, // +12 mood (reduced from 40)
      hunger: -10, // -10 hunger (reduced from -25)
      thirst: -8, // -8 thirst (reduced from -15)
    },
  },
  dmt: {
    type: 'dmt',
    duration: 10, // 10 seconds
    intensity: 1.0,
    effects: {
      timeScale: 0.1, // 90% slower time (very intense)
      mood: 50, // +50 mood (very high)
      energy: 40, // +40 energy (intense boost)
      hunger: -30, // -30 hunger (intense suppression)
      thirst: -20, // -20 thirst (intense suppression)
      karma: 25, // +25 karma (spiritual experience)
    },
  },
  salvia: {
    type: 'salvia',
    duration: 12, // 2 hours = 12 seconds (2 * 6)
    intensity: 0.8,
    effects: {
      timeScale: 0.2, // 80% slower time
      mood: 20, // +20 mood
      hunger: -15, // -15 hunger
      thirst: -10, // -10 thirst
    },
  },
  whipits: {
    type: 'whipits',
    duration: 5, // 5 seconds
    intensity: 1.0,
    effects: {
      timeScale: 0.1, // Time slows to 10% (0.1x)
      speed: -90, // Speed reduced to 10% (0.1x)
      mood: 8, // +8 mood (reduced from 15)
      energy: 5, // +5 energy (reduced from 10)
    },
  },
  'energy-drink': {
    type: 'energy-drink',
    duration: 30, // 5 hours = 30 seconds (5 * 6)
    intensity: 0.6,
    effects: {
      timeScale: 2.0, // 100% faster time
      speed: 40, // +40 speed
      energy: 30, // +30 energy
      thirst: -15, // -15 thirst
    },
  },
  'mystery-pill': {
    type: 'mystery-pill',
    duration: 24, // 4 hours = 24 seconds (4 * 6)
    intensity: 0.8,
    effects: {
      timeScale: 0.8, // 20% slower time
      speed: 15, // +15 speed
      mood: 20, // +20 mood
      energy: 15, // +15 energy
    },
  },
  'mystery-snowball': {
    type: 'mystery-snowball',
    duration: 12, // 2 hours = 12 seconds (2 * 6)
    intensity: 0.7,
    effects: {
      timeScale: 2.0, // 100% faster time (speed)
      speed: 50, // +50 speed
      energy: 20, // +20 energy
      mood: 10, // +10 mood
    },
  },
  cigarette: {
    type: 'cigarette',
    duration: 5, // 5 seconds
    intensity: 0.3,
    effects: {
      timeScale: 1.0, // No time change
      mood: 5, // +5 mood
      energy: -5, // -5 energy
      thirst: -5, // -5 thirst
    },
  },
  joint: {
    type: 'joint',
    duration: 18, // 3 hours = 18 seconds (3 * 6)
    intensity: 0.4,
    effects: {
      timeScale: 0.7, // 30% slower time
      mood: 15, // +15 mood
      hunger: 20, // +20 hunger (munchies)
      thirst: 15, // +15 thirst (joint makes you thirsty)
      speed: -10, // -10 speed
    },
  },
  vodka: {
    type: 'vodka',
    duration: 24, // 4 hours = 24 seconds (4 * 6)
    intensity: 0.5,
    effects: {
      timeScale: 0.8, // 20% slower time
      speed: -20, // -20 speed
      mood: 15, // +15 mood
      energy: -15, // -15 energy
      thirst: 20, // +20 thirst
    },
  },
  mda: {
    type: 'mda',
    duration: 30, // 5 hours = 30 seconds (5 * 6)
    intensity: 0.7,
    effects: {
      timeScale: 0.9, // 10% slower time
      speed: 15, // +15 speed
      mood: 25, // +25 mood
      energy: 20, // +20 energy
      thirst: 15, // +15 thirst
    },
  },
  '2c-i': {
    type: '2c-i',
    duration: 36, // 6 hours = 36 seconds (6 * 6)
    intensity: 0.8,
    effects: {
      timeScale: 0.7, // 30% slower time
      mood: 20, // +20 mood
      hunger: -15, // -15 hunger
      thirst: -10, // -10 thirst
    },
  },
  cocaine: {
    type: 'cocaine',
    duration: 30, // 30 seconds
    intensity: 0.9,
    effects: {
      timeScale: 1.2, // 20% faster time
      speed: 20, // +20 speed
      mood: 25, // +25 mood
      energy: 30, // +30 energy
      hunger: -10, // -10 hunger
      thirst: -15, // -15 thirst
    },
  },
  ketamine: {
    type: 'ketamine',
    duration: 10, // 10 seconds
    intensity: 0.8,
    effects: {
      timeScale: 0.2, // 80% slower time (20% of normal speed)
      speed: -80, // -80 speed (makes you very slow)
      mood: 20, // +20 mood
      energy: 15, // +15 energy
      hunger: -5, // -5 hunger
      thirst: -10, // -10 thirst
    },
  },
  cannabis: {
    type: 'cannabis',
    duration: 24, // 4 hours = 24 seconds (4 * 6)
    intensity: 0.5,
    effects: {
      timeScale: 0.8, // 20% slower time
      mood: 20, // +20 mood
      hunger: 25, // +25 hunger (munchies)
      speed: -15, // -15 speed
      energy: -5, // -5 energy
    },
  },
};

/**
 * Create a new drug effect
 */
export function createDrugEffect(type: DrugType, intensity: number = 1.0): DrugEffect {
  const definition = DRUG_DEFINITIONS[type];
  if (!definition) {
    throw new Error(`Unknown drug type: ${type}`);
  }

  return {
    type,
    duration: definition.duration!,
    intensity: Math.min(1.0, Math.max(0.0, intensity)),
    effects: {
      timeScale: definition.effects?.timeScale,
      speed: definition.effects?.speed,
      energy: definition.effects?.energy,
      mood: definition.effects?.mood,
      thirst: definition.effects?.thirst,
      hunger: definition.effects?.hunger,
      karma: definition.effects?.karma,
    },
  };
}

/**
 * Apply a drug effect to player stats
 */
export function applyDrugEffect(stats: PlayerStats, effect: DrugEffect): PlayerStats {
  // Special case for acid: random mood effect
  let moodEffect = effect.effects.mood ? effect.effects.mood * effect.intensity : undefined;
  if (effect.type === 'acid' && moodEffect !== undefined) {
    // Random mood effect: 50% chance of positive, 50% chance of negative
    const isPositive = Math.random() < 0.5;
    moodEffect = isPositive ? Math.abs(moodEffect) : -Math.abs(moodEffect);
  }

  const statEffect = {
    speed: effect.effects.speed ? effect.effects.speed * effect.intensity : undefined,
    energy: effect.effects.energy ? effect.effects.energy * effect.intensity : undefined,
    mood: moodEffect,
    thirst: effect.effects.thirst ? effect.effects.thirst * effect.intensity : undefined,
    hunger: effect.effects.hunger ? effect.effects.hunger * effect.intensity : undefined,
    karma: effect.effects.karma ? effect.effects.karma * effect.intensity : undefined,
  };

  return applyStatEffect(stats, statEffect, DEFAULT_STAT_BOUNDS);
}

/**
 * Update drug effects (reduce duration, remove expired)
 */
export function updateDrugEffects(drugs: PlayerDrugs, deltaTime: number): PlayerDrugs {
  // deltaTime is now in game time units (already converted from real time)
  const deltaTimeSeconds = deltaTime; // deltaTime is already in seconds
  
  const updatedDrugs = drugs.active.map(drug => {
    const newDuration = Math.max(0, drug.duration - deltaTimeSeconds);
    return {
      ...drug,
      duration: newDuration,
    };
  });

  // Remove expired drugs
  const activeDrugs = updatedDrugs.filter(drug => drug.duration > 0);

  return {
    ...drugs,
    active: activeDrugs,
  };
}

/**
 * Add a new drug effect (with stacking logic)
 */
export function addDrugEffect(drugs: PlayerDrugs, newEffect: DrugEffect): PlayerDrugs {
  // Check if we're at max stack
  if (drugs.active.length >= drugs.maxStack) {
    // Remove the oldest drug
    const sortedDrugs = [...drugs.active].sort((a, b) => a.duration - b.duration);
    sortedDrugs.shift();
    sortedDrugs.push(newEffect);
    return {
      ...drugs,
      active: sortedDrugs,
    };
  }

  // Check if same drug type already exists
  const existingIndex = drugs.active.findIndex(drug => drug.type === newEffect.type);
  if (existingIndex !== -1) {
    // Stack with existing drug (increase intensity, add duration)
    const existing = drugs.active[existingIndex];
    const stackedEffect: DrugEffect = {
      ...newEffect,
      intensity: Math.min(1.0, existing.intensity + newEffect.intensity * 0.5), // Increase intensity
      duration: existing.duration + newEffect.duration * 0.5, // Add duration
    };
    
    const updatedDrugs = [...drugs.active];
    updatedDrugs[existingIndex] = stackedEffect;
    
    return {
      ...drugs,
      active: updatedDrugs,
    };
  }

  // Add new drug
  return {
    ...drugs,
    active: [...drugs.active, newEffect],
  };
}

/**
 * Calculate combined time scale from all active drugs
 */
export function calculateTimeScale(drugs: PlayerDrugs): number {
  let timeScale = 1.0;
  
  for (const drug of drugs.active) {
    if (drug.effects.timeScale) {
      timeScale *= drug.effects.timeScale;
    }
  }
  
  return timeScale;
}

/**
 * Get all active drug effects as stat modifiers
 */
export function getActiveDrugEffects(drugs: PlayerDrugs): Partial<PlayerStats> {
  const effects: Partial<PlayerStats> = {};
  
  for (const drug of drugs.active) {
    if (drug.effects.speed) {
      effects.speed = (effects.speed || 0) + (drug.effects.speed * drug.intensity);
    }
    if (drug.effects.energy) {
      effects.energy = (effects.energy || 0) + (drug.effects.energy * drug.intensity);
    }
    if (drug.effects.mood) {
      effects.mood = (effects.mood || 0) + (drug.effects.mood * drug.intensity);
    }
    if (drug.effects.thirst) {
      effects.thirst = (effects.thirst || 0) + (drug.effects.thirst * drug.intensity);
    }
    if (drug.effects.hunger) {
      effects.hunger = (effects.hunger || 0) + (drug.effects.hunger * drug.intensity);
    }
    if (drug.effects.karma) {
      effects.karma = (effects.karma || 0) + (drug.effects.karma * drug.intensity);
    }
  }
  
  return effects;
}

/**
 * Check if player is on a specific drug
 */
export function isOnDrug(drugs: PlayerDrugs, drugType: DrugType): boolean {
  return drugs.active.some(effect => effect.type === drugType && effect.duration > 0);
}
