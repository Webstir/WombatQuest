/**
 * Pickup action logic
 */

import type { StatDelta, ActionResult } from './types';

/**
 * Create a stat delta for coin pickup
 */
export function createCoinPickupDelta(coinValue: number): StatDelta {
  return {
    coins: coinValue,
    energy: 0,
    mood: 0,
  };
}

/**
 * Create a stat delta for rest action
 */
export function createRestDelta(energyRestore: number, moodRestore: number): StatDelta {
  return {
    coins: 0,
    energy: energyRestore,
    mood: moodRestore,
  };
}

/**
 * Apply stat delta to current stats with clamping
 * @deprecated Use applyStatEffect from core module instead
 */
export function applyStatDelta(
  currentStats: { coins: number; energy: number; mood: number },
  delta: StatDelta
): { coins: number; energy: number; mood: number } {
  return {
    coins: Math.max(0, currentStats.coins + delta.coins),
    energy: Math.max(0, Math.min(100, currentStats.energy + delta.energy)),
    mood: Math.max(0, Math.min(100, currentStats.mood + delta.mood)),
  };
}

/**
 * Pick up a coin action
 */
export function pickCoin(coinValue: number): ActionResult {
  return {
    success: true,
    statDelta: createCoinPickupDelta(coinValue),
    message: `Picked up ${coinValue} coin${coinValue > 1 ? 's' : ''}!`,
  };
}

/**
 * Rest action to restore energy and mood
 */
export function rest(energyRestore: number = 20, moodRestore: number = 10): ActionResult {
  return {
    success: true,
    statDelta: createRestDelta(energyRestore, moodRestore),
    message: 'You feel refreshed!',
  };
}
