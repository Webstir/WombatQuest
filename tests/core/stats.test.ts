/**
 * Unit tests for stats system
 */

import { describe, it, expect } from 'vitest';
import {
  applyStatEffect,
  clampValue,
  isStatsAtMax,
  isStatsAtMin,
  getStatPercentage,
  DEFAULT_STAT_BOUNDS,
} from '../../modules/core';
import type { PlayerStats, StatEffect, StatBounds } from '../../modules/core';

describe('Stats System', () => {
  const baseStats: PlayerStats = {
    coins: 10,
    energy: 50,
    mood: 75,
    thirst: 80,
    hunger: 60,
    karma: 10,
    speed: 100,
    lightBattery: 50,
  };

  describe('clampValue', () => {
    it('should clamp values within bounds', () => {
      expect(clampValue(5, 0, 10)).toBe(5);
      expect(clampValue(-5, 0, 10)).toBe(0);
      expect(clampValue(15, 0, 10)).toBe(10);
    });

    it('should handle edge cases', () => {
      expect(clampValue(0, 0, 10)).toBe(0);
      expect(clampValue(10, 0, 10)).toBe(10);
    });
  });

  describe('applyStatEffect', () => {
    it('should apply positive effects', () => {
      const effect: StatEffect = {
        coins: 5,
        energy: 10,
        mood: 15,
      };

      const result = applyStatEffect(baseStats, effect);

      expect(result.coins).toBe(15);
      expect(result.energy).toBe(60);
      expect(result.mood).toBe(90);
    });

    it('should apply negative effects', () => {
      const effect: StatEffect = {
        coins: -3,
        energy: -20,
        mood: -30,
      };

      const result = applyStatEffect(baseStats, effect);

      expect(result.coins).toBe(7);
      expect(result.energy).toBe(30);
      expect(result.mood).toBe(45);
    });

    it('should clamp values to bounds', () => {
      const effect: StatEffect = {
        energy: 100, // Would exceed max of 100
        mood: -100,  // Would go below min of 0
      };

      const result = applyStatEffect(baseStats, effect);

      expect(result.energy).toBe(100); // Clamped to max
      expect(result.mood).toBe(0);     // Clamped to min
    });

    it('should handle partial effects', () => {
      const effect: StatEffect = {
        energy: 25,
        // coins and mood not specified
      };

      const result = applyStatEffect(baseStats, effect);

      expect(result.coins).toBe(10);  // Unchanged
      expect(result.energy).toBe(75); // +25
      expect(result.mood).toBe(75);   // Unchanged
    });

    it('should work with custom bounds', () => {
      const customBounds: StatBounds = {
        coins: { min: 0, max: 50 },
        energy: { min: 0, max: 200 },
        mood: { min: 0, max: 200 },
        thirst: { min: 0, max: 200 },
        hunger: { min: 0, max: 200 },
        karma: { min: -200, max: 200 },
        speed: { min: 25, max: 400 },
      };

      const effect: StatEffect = {
        energy: 150,
        mood: 150,
      };

      const result = applyStatEffect(baseStats, effect, customBounds);

      expect(result.energy).toBe(200); // Clamped to custom max
      expect(result.mood).toBe(200);   // Clamped to custom max
    });
  });

  describe('isStatsAtMax', () => {
    it('should return true when stats are at maximum', () => {
      const maxStats: PlayerStats = {
        coins: 1000,
        energy: 100,
        mood: 100,
        thirst: 100,
        hunger: 100,
        karma: 100,
        speed: 200,
        lightBattery: 100,
      };

      expect(isStatsAtMax(maxStats)).toBe(true);
    });

    it('should return false when stats are not at maximum', () => {
      expect(isStatsAtMax(baseStats)).toBe(false);
    });

    it('should work with custom bounds', () => {
      const customBounds: StatBounds = {
        coins: { min: 0, max: 50 },
        energy: { min: 0, max: 200 },
        mood: { min: 0, max: 200 },
        thirst: { min: 0, max: 200 },
        hunger: { min: 0, max: 200 },
        karma: { min: -200, max: 200 },
        speed: { min: 25, max: 400 },
      };

      const stats: PlayerStats = {
        coins: 10,
        energy: 200,
        mood: 200,
        thirst: 200,
        hunger: 200,
        karma: 200,
        speed: 400,
        lightBattery: 100,
      };

      expect(isStatsAtMax(stats, customBounds)).toBe(true);
    });
  });

  describe('isStatsAtMin', () => {
    it('should return true when stats are at minimum', () => {
      const minStats: PlayerStats = {
        coins: 0,
        energy: 0,
        mood: 0,
        thirst: 0,
        hunger: 0,
        karma: -100,
        speed: 50,
        lightBattery: 0,
      };

      expect(isStatsAtMin(minStats)).toBe(true);
    });

    it('should return false when stats are not at minimum', () => {
      expect(isStatsAtMin(baseStats)).toBe(false);
    });
  });

  describe('getStatPercentage', () => {
    it('should calculate correct percentages', () => {
      expect(getStatPercentage(50, 0, 100)).toBe(0.5);
      expect(getStatPercentage(25, 0, 100)).toBe(0.25);
      expect(getStatPercentage(100, 0, 100)).toBe(1);
      expect(getStatPercentage(0, 0, 100)).toBe(0);
    });

    it('should handle edge cases', () => {
      expect(getStatPercentage(0, 0, 0)).toBe(1); // max === min
      expect(getStatPercentage(-10, 0, 100)).toBe(0); // below min
      expect(getStatPercentage(150, 0, 100)).toBe(1); // above max
    });
  });

  describe('DEFAULT_STAT_BOUNDS', () => {
    it('should have correct default bounds', () => {
      expect(DEFAULT_STAT_BOUNDS.coins.min).toBe(0);
      expect(DEFAULT_STAT_BOUNDS.coins.max).toBe(Number.MAX_SAFE_INTEGER);
      expect(DEFAULT_STAT_BOUNDS.energy.min).toBe(0);
      expect(DEFAULT_STAT_BOUNDS.energy.max).toBe(100);
      expect(DEFAULT_STAT_BOUNDS.mood.min).toBe(0);
      expect(DEFAULT_STAT_BOUNDS.mood.max).toBe(100);
    });
  });
});
