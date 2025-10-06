/**
 * Random Number Generator port - provides deterministic randomness
 */

export interface Rng {
  /**
   * Generate a random number between 0 and 1
   */
  random(): number;

  /**
   * Generate a random integer between min (inclusive) and max (exclusive)
   */
  randomInt(min: number, max: number): number;

  /**
   * Generate a random number between min (inclusive) and max (exclusive)
   */
  randomRange(min: number, max: number): number;

  /**
   * Set the seed for deterministic generation
   */
  setSeed(seed: number): void;

  /**
   * Get the current seed
   */
  getSeed(): number;
}

