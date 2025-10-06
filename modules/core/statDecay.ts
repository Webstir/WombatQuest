/**
 * Stat decay and natural effects system
 */

import type { PlayerStats } from './types';

export interface DecayConfig {
  energyDecayPerPixel: number;
  moodDecayPerSecond: number;
  moodDecayFromLowEnergy: number;
  lowEnergyThreshold: number;
  thirstDecayPerSecond: number;
  hungerDecayPerSecond: number;
  karmaDecayPerSecond: number;
  bathroomDecayPerSecond: number;
}

export const DEFAULT_DECAY_CONFIG: DecayConfig = {
  energyDecayPerPixel: 0.01, // Energy decreases by 0.01 per pixel moved
  moodDecayPerSecond: 0.1,   // Mood decreases by 0.1 per second (slow but noticeable)
  moodDecayFromLowEnergy: 0.2, // Extra mood decay when energy is low
  lowEnergyThreshold: 30,     // Energy below 30 is considered "low"
  thirstDecayPerSecond: 0.75, // Thirst decreases by 0.75 per second (5x faster)
  hungerDecayPerSecond: 0.5, // Hunger decreases by 0.5 per second (5x faster)
  karmaDecayPerSecond: 0.01,  // Karma very slowly returns to neutral
  bathroomDecayPerSecond: 0.3, // Bathroom need slowly increases over time
};

/**
 * Calculate energy decay from movement distance
 */
export function calculateMovementEnergyDecay(
  distanceMoved: number,
  config: DecayConfig = DEFAULT_DECAY_CONFIG
): number {
  return -(distanceMoved * config.energyDecayPerPixel);
}

/**
 * Calculate mood change based on overall well-being
 */
export function calculateMoodDecay(
  deltaTime: number,
  currentEnergy: number,
  currentThirst: number,
  currentHunger: number,
  currentMood: number,
  config: DecayConfig = DEFAULT_DECAY_CONFIG
): number {
  // Since thirst and hunger now increase over time (higher = worse),
  // we need to invert them for the well-being calculation
  const energyScore = currentEnergy; // Higher is better (0-100)
  const thirstScore = 100 - currentThirst; // Lower thirst is better (0-100)
  const hungerScore = 100 - currentHunger; // Lower hunger is better (0-100)
  
  // Calculate overall well-being (0-100 scale)
  const overallWellBeing = (energyScore + thirstScore + hungerScore) / 3;
  
  // Calculate the difference between current mood and well-being
  const moodDifference = overallWellBeing - currentMood;
  
  // Mood moves toward well-being at a rate of 2.0 per second
  const moodChangeRate = 2.0;
  const moodChange = moodDifference * moodChangeRate * deltaTime;
  
  // Also add base mood decay over time (mood naturally decreases)
  const baseMoodDecay = -(deltaTime * config.moodDecayPerSecond);
  
  return moodChange + baseMoodDecay;
}

/**
 * Calculate thirst decay from time (increases over time - higher = worse)
 */
export function calculateThirstDecay(
  deltaTime: number,
  config: DecayConfig = DEFAULT_DECAY_CONFIG
): number {
  return deltaTime * config.thirstDecayPerSecond; // Positive value = thirst increases
}

/**
 * Calculate hunger decay from time (increases over time - higher = worse)
 */
export function calculateHungerDecay(
  deltaTime: number,
  config: DecayConfig = DEFAULT_DECAY_CONFIG
): number {
  return deltaTime * config.hungerDecayPerSecond; // Positive value = hunger increases
}

/**
 * Calculate karma decay (returns to neutral)
 */
export function calculateKarmaDecay(
  deltaTime: number,
  currentKarma: number,
  config: DecayConfig = DEFAULT_DECAY_CONFIG
): number {
  // Karma slowly returns to 0 (neutral)
  if (currentKarma > 0) {
    return -(deltaTime * config.karmaDecayPerSecond);
  } else if (currentKarma < 0) {
    return deltaTime * config.karmaDecayPerSecond;
  }
  return 0;
}

/**
 * Calculate bathroom decay from time (increases over time - higher = worse)
 */
export function calculateBathroomDecay(
  deltaTime: number,
  config: DecayConfig = DEFAULT_DECAY_CONFIG
): number {
  return deltaTime * config.bathroomDecayPerSecond; // Positive value = bathroom need increases
}

/**
 * Calculate all natural stat effects for a frame
 */
export function calculateNaturalEffects(
  distanceMoved: number,
  deltaTime: number,
  currentStats: PlayerStats,
  config: DecayConfig = DEFAULT_DECAY_CONFIG
): { energy: number; mood: number; thirst: number; hunger: number; karma: number; bathroom: number } {
  const energyDecay = calculateMovementEnergyDecay(distanceMoved, config);
  const moodDecay = calculateMoodDecay(deltaTime, currentStats.energy, currentStats.thirst, currentStats.hunger, currentStats.mood, config);
  const thirstDecay = calculateThirstDecay(deltaTime, config);
  const hungerDecay = calculateHungerDecay(deltaTime, config);
  const karmaDecay = calculateKarmaDecay(deltaTime, currentStats.karma, config);
  const bathroomDecay = calculateBathroomDecay(deltaTime, config);
  
  return {
    energy: energyDecay,
    mood: moodDecay,
    thirst: thirstDecay,
    hunger: hungerDecay,
    karma: karmaDecay,
    bathroom: bathroomDecay,
  };
}
