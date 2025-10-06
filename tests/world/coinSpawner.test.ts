/**
 * Unit tests for coin spawning logic
 */

import { describe, it, expect } from 'vitest';
import { SeededRng } from '../../shared/adapters';
import {
  generateCoinId,
  isTooCloseToPlayer,
  isTooCloseToCoins,
  generateRandomPosition,
  spawnCoins,
} from '../../modules/world';
import { createVec2 } from '../../modules/core';
import { createSpatialIndex, addEntity } from '../../modules/spatial';

describe('Coin Spawner', () => {
  describe('generateCoinId', () => {
    it('should generate unique coin IDs', () => {
      const id1 = generateCoinId(0, 12345);
      const id2 = generateCoinId(1, 12345);
      const id3 = generateCoinId(0, 67890);

      expect(id1).toBe('coin_12345_0');
      expect(id2).toBe('coin_12345_1');
      expect(id3).toBe('coin_67890_0');
    });
  });

  describe('isTooCloseToPlayer', () => {
    it('should return true when position is too close to player', () => {
      const playerPos = createVec2(100, 100);
      const coinPos = createVec2(120, 100); // 20 units away
      const minDistance = 50;

      expect(isTooCloseToPlayer(coinPos, playerPos, minDistance)).toBe(true);
    });

    it('should return false when position is far enough from player', () => {
      const playerPos = createVec2(100, 100);
      const coinPos = createVec2(200, 100); // 100 units away
      const minDistance = 50;

      expect(isTooCloseToPlayer(coinPos, playerPos, minDistance)).toBe(false);
    });
  });

  describe('isTooCloseToCoins', () => {
    it('should return true when position is too close to existing coins', () => {
      const spatialIndex = createSpatialIndex(800, 600, 100);
      const existingCoins = [
        { id: '1', position: createVec2(100, 100), value: 1, collected: false },
        { id: '2', position: createVec2(200, 200), value: 1, collected: false },
      ];
      
      // Add coins to spatial index
      existingCoins.forEach(coin => {
        addEntity(spatialIndex, {
          id: coin.id,
          position: coin.position,
          radius: 8,
        });
      });
      
      const newPos = createVec2(110, 100); // 10 units from first coin
      const minDistance = 40;

      expect(isTooCloseToCoins(newPos, spatialIndex, minDistance)).toBe(true);
    });

    it('should return false when position is far enough from existing coins', () => {
      const spatialIndex = createSpatialIndex(800, 600, 100);
      const existingCoins = [
        { id: '1', position: createVec2(100, 100), value: 1, collected: false },
        { id: '2', position: createVec2(200, 200), value: 1, collected: false },
      ];
      
      // Add coins to spatial index
      existingCoins.forEach(coin => {
        addEntity(spatialIndex, {
          id: coin.id,
          position: coin.position,
          radius: 8,
        });
      });
      
      const newPos = createVec2(300, 300); // Far from both coins
      const minDistance = 40;

      expect(isTooCloseToCoins(newPos, spatialIndex, minDistance)).toBe(false);
    });
  });

  describe('generateRandomPosition', () => {
    it('should generate positions within world bounds', () => {
      const rng = new SeededRng(12345);
      const worldWidth = 800;
      const worldHeight = 600;

      for (let i = 0; i < 10; i++) {
        const pos = generateRandomPosition(rng, worldWidth, worldHeight);
        expect(pos.x).toBeGreaterThanOrEqual(50);
        expect(pos.x).toBeLessThanOrEqual(worldWidth - 50);
        expect(pos.y).toBeGreaterThanOrEqual(50);
        expect(pos.y).toBeLessThanOrEqual(worldHeight - 50);
      }
    });
  });

  describe('spawnCoins', () => {
    it('should spawn the correct number of coins', () => {
      const rng = new SeededRng(12345);
      const spatialIndex = createSpatialIndex(800, 600, 100);
      const config = {
        coinCount: 5,
        worldWidth: 800,
        worldHeight: 600,
        coinValue: 1,
        minDistanceFromPlayer: 80,
      };
      const playerSpawn = createVec2(400, 300);

      const coins = spawnCoins(rng, config, playerSpawn, spatialIndex);

      expect(coins).toHaveLength(5);
    });

    it('should generate deterministic results with same seed', () => {
      const config = {
        coinCount: 3,
        worldWidth: 800,
        worldHeight: 600,
        coinValue: 1,
        minDistanceFromPlayer: 80,
      };
      const playerSpawn = createVec2(400, 300);

      const rng1 = new SeededRng(12345);
      const spatialIndex1 = createSpatialIndex(800, 600, 100);
      const coins1 = spawnCoins(rng1, config, playerSpawn, spatialIndex1);

      const rng2 = new SeededRng(12345);
      const spatialIndex2 = createSpatialIndex(800, 600, 100);
      const coins2 = spawnCoins(rng2, config, playerSpawn, spatialIndex2);

      expect(coins1).toHaveLength(coins2.length);
      coins1.forEach((coin1, index) => {
        const coin2 = coins2[index];
        expect(coin1.id).toBe(coin2.id);
        expect(coin1.position.x).toBeCloseTo(coin2.position.x, 5);
        expect(coin1.position.y).toBeCloseTo(coin2.position.y, 5);
        expect(coin1.value).toBe(coin2.value);
      });
    });

    it('should not spawn coins too close to player', () => {
      const rng = new SeededRng(12345);
      const spatialIndex = createSpatialIndex(800, 600, 100);
      const config = {
        coinCount: 10,
        worldWidth: 800,
        worldHeight: 600,
        coinValue: 1,
        minDistanceFromPlayer: 100,
      };
      const playerSpawn = createVec2(400, 300);

      const coins = spawnCoins(rng, config, playerSpawn, spatialIndex);

      coins.forEach((coin) => {
        const distance = Math.sqrt(
          Math.pow(coin.position.x - playerSpawn.x, 2) +
          Math.pow(coin.position.y - playerSpawn.y, 2)
        );
        expect(distance).toBeGreaterThanOrEqual(config.minDistanceFromPlayer);
      });
    });
  });
});
