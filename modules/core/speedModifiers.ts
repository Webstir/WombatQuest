/**
 * Speed modifier system based on player stats
 */

import type { PlayerStats } from './types';

export interface SpeedModifierConfig {
  baseSpeed: number;
  energyThreshold: number;
  thirstThreshold: number;
  hungerThreshold: number;
  moodThreshold: number;
  maxSpeedMultiplier: number;
  minSpeedMultiplier: number;
}

export const DEFAULT_SPEED_CONFIG: SpeedModifierConfig = {
  baseSpeed: 100,
  energyThreshold: 30,
  thirstThreshold: 30,
  hungerThreshold: 30,
  moodThreshold: 30,
  maxSpeedMultiplier: 1.5, // 50% faster when all stats are high
  minSpeedMultiplier: 0.3, // 70% slower when stats are very low
};

/**
 * Calculate speed multiplier based on current stats
 */
export function calculateSpeedMultiplier(
  stats: PlayerStats,
  config: SpeedModifierConfig = DEFAULT_SPEED_CONFIG
): number {
  let multiplier = 1.0;
  
  // Energy affects speed significantly
  if (stats.energy < config.energyThreshold) {
    const energyRatio = stats.energy / config.energyThreshold;
    multiplier *= 0.3 + (energyRatio * 0.7); // 30% to 100% based on energy
  } else if (stats.energy > 80) {
    multiplier *= 1.2; // 20% faster when energy is high
  }
  
  // Thirst affects speed moderately (higher thirst = slower)
  if (stats.thirst > (100 - config.thirstThreshold)) {
    const thirstRatio = (100 - stats.thirst) / config.thirstThreshold;
    multiplier *= 0.6 + (thirstRatio * 0.4); // 60% to 100% based on thirst level
  } else if (stats.thirst < 20) {
    multiplier *= 1.1; // 10% faster when well hydrated (low thirst)
  }
  
  // Hunger affects speed moderately (higher hunger = slower)
  if (stats.hunger > (100 - config.hungerThreshold)) {
    const hungerRatio = (100 - stats.hunger) / config.hungerThreshold;
    multiplier *= 0.7 + (hungerRatio * 0.3); // 70% to 100% based on hunger level
  } else if (stats.hunger < 20) {
    multiplier *= 1.05; // 5% faster when well fed (low hunger)
  }
  
  // Mood affects speed slightly
  if (stats.mood < config.moodThreshold) {
    const moodRatio = stats.mood / config.moodThreshold;
    multiplier *= 0.8 + (moodRatio * 0.2); // 80% to 100% based on mood
  } else if (stats.mood > 80) {
    multiplier *= 1.05; // 5% faster when in good mood
  }
  
  // Clamp to min/max multipliers
  return Math.max(
    config.minSpeedMultiplier,
    Math.min(config.maxSpeedMultiplier, multiplier)
  );
}

/**
 * Calculate effective speed based on base speed and stat modifiers
 */
export function calculateEffectiveSpeed(
  baseSpeed: number,
  stats: PlayerStats,
  config: SpeedModifierConfig = DEFAULT_SPEED_CONFIG
): number {
  const multiplier = calculateSpeedMultiplier(stats, config);
  return baseSpeed * multiplier;
}

/**
 * Get speed modifier description for UI
 */
export function getSpeedModifierDescription(
  stats: PlayerStats,
  config: SpeedModifierConfig = DEFAULT_SPEED_CONFIG
): string {
  const multiplier = calculateSpeedMultiplier(stats, config);
  
  if (multiplier > 1.1) {
    return "Feeling energetic!";
  } else if (multiplier > 0.9) {
    return "Normal speed";
  } else if (multiplier > 0.6) {
    return "Feeling sluggish";
  } else if (multiplier > 0.4) {
    return "Very tired";
  } else {
    return "Exhausted";
  }
}

