/**
 * Stats system with effect application and clamping
 */

import type { PlayerStats } from './types';

export interface StatEffect {
  coins?: number;
  energy?: number;
  mood?: number;
  thirst?: number;
  hunger?: number;
  karma?: number;
  speed?: number;
  lightBattery?: number;
  bathroom?: number;
}

export interface StatBounds {
  coins: { min: number; max: number };
  energy: { min: number; max: number };
  mood: { min: number; max: number };
  thirst: { min: number; max: number };
  hunger: { min: number; max: number };
  karma: { min: number; max: number };
  speed: { min: number; max: number };
  bathroom: { min: number; max: number };
}

/**
 * Default stat bounds
 */
export const DEFAULT_STAT_BOUNDS: StatBounds = {
  coins: { min: 0, max: Number.MAX_SAFE_INTEGER },
  energy: { min: 0, max: 100 },
  mood: { min: 0, max: 100 },
  thirst: { min: 0, max: 100 },
  hunger: { min: 0, max: 100 },
  // Unlimited karma (no upper bound)
  karma: { min: -Number.MAX_SAFE_INTEGER, max: Number.MAX_SAFE_INTEGER },
  speed: { min: 50, max: 200 },
  bathroom: { min: 0, max: 100 },
};

/**
 * Apply a stat effect to current stats with clamping
 */
export function applyStatEffect(
  currentStats: PlayerStats,
  effect: StatEffect,
  bounds: StatBounds = DEFAULT_STAT_BOUNDS
): PlayerStats {
  return {
    coins: clampValue(
      currentStats.coins + (effect.coins ?? 0),
      bounds.coins.min,
      bounds.coins.max
    ),
    energy: clampValue(
      currentStats.energy + (effect.energy ?? 0),
      bounds.energy.min,
      bounds.energy.max
    ),
    mood: clampValue(
      currentStats.mood + (effect.mood ?? 0),
      bounds.mood.min,
      bounds.mood.max
    ),
    thirst: clampValue(
      currentStats.thirst + (effect.thirst ?? 0),
      bounds.thirst.min,
      bounds.thirst.max
    ),
    hunger: clampValue(
      currentStats.hunger + (effect.hunger ?? 0),
      bounds.hunger.min,
      bounds.hunger.max
    ),
    karma: clampValue(
      currentStats.karma + (effect.karma ?? 0),
      bounds.karma.min,
      bounds.karma.max
    ),
    speed: clampValue(
      currentStats.speed + (effect.speed ?? 0),
      bounds.speed.min,
      bounds.speed.max
    ),
    lightBattery: clampValue(
      currentStats.lightBattery + (effect.lightBattery ?? 0),
      0,
      100
    ),
    bathroom: clampValue(
      currentStats.bathroom + (effect.bathroom ?? 0),
      bounds.bathroom.min,
      bounds.bathroom.max
    ),
  };
}

/**
 * Clamp a value between min and max
 */
export function clampValue(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Check if stats are at maximum values
 */
export function isStatsAtMax(stats: PlayerStats, bounds: StatBounds = DEFAULT_STAT_BOUNDS): boolean {
  return (
    stats.energy >= bounds.energy.max &&
    stats.mood >= bounds.mood.max &&
    stats.thirst >= bounds.thirst.max &&
    stats.hunger >= bounds.hunger.max
  );
}

/**
 * Check if stats are at minimum values
 */
export function isStatsAtMin(stats: PlayerStats, bounds: StatBounds = DEFAULT_STAT_BOUNDS): boolean {
  return (
    stats.energy <= bounds.energy.min &&
    stats.mood <= bounds.mood.min &&
    stats.thirst <= bounds.thirst.min &&
    stats.hunger <= bounds.hunger.min
  );
}

/**
 * Get stat percentage (0-1) for display
 */
export function getStatPercentage(
  value: number,
  min: number,
  max: number
): number {
  if (max === min) return 1;
  const percentage = (value - min) / (max - min);
  return Math.max(0, Math.min(1, percentage));
}
