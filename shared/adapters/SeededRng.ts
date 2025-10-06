/**
 * Seeded random number generator implementation
 * Uses a simple Linear Congruential Generator for deterministic results
 */

import type { Rng } from '../ports/Rng';

export class SeededRng implements Rng {
  private seed: number;
  private current: number;

  constructor(seed: number = Date.now()) {
    this.seed = seed;
    this.current = seed;
  }

  random(): number {
    // Linear Congruential Generator
    // Using constants from Numerical Recipes
    this.current = (this.current * 1664525 + 1013904223) % 4294967296;
    return this.current / 4294967296;
  }

  randomInt(min: number, max: number): number {
    return Math.floor(this.randomRange(min, max));
  }

  randomRange(min: number, max: number): number {
    return min + this.random() * (max - min);
  }

  setSeed(seed: number): void {
    this.seed = seed;
    this.current = seed;
  }

  getSeed(): number {
    return this.seed;
  }
}

