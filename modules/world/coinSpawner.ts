/**
 * Deterministic coin spawning logic
 */

import type { Rng } from '../../shared/ports';
import type { Vec2 } from '../core';
import type { Coin, SpawnConfig } from './types';
import type { SpatialIndex } from '../spatial';
import { queryRadius, addEntity } from '../spatial';

/**
 * Generate a deterministic coin ID based on index and seed
 */
export function generateCoinId(index: number, seed: number): string {
  return `coin_${seed}_${index}`;
}

/**
 * Check if a position is too close to the player spawn point
 */
export function isTooCloseToPlayer(
  position: Vec2,
  playerSpawn: Vec2,
  minDistance: number
): boolean {
  const dx = position.x - playerSpawn.x;
  const dy = position.y - playerSpawn.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < minDistance;
}

/**
 * Check if a position is too close to existing coins using spatial index
 */
export function isTooCloseToCoins(
  position: Vec2,
  spatialIndex: SpatialIndex,
  minDistance: number
): boolean {
  const nearbyEntities = queryRadius(spatialIndex, position, minDistance);
  return nearbyEntities.entities.length > 0;
}

/**
 * Generate a random position within world bounds
 */
export function generateRandomPosition(
  rng: Rng,
  worldWidth: number,
  worldHeight: number
): Vec2 {
  // If this looks like the enlarged Playa, sample within circular trash fence
  if (worldWidth >= 4000 && worldHeight >= 3000) {
    const centerX = worldWidth / 2; // 2000
    const centerY = worldHeight / 2; // 1500
    const fenceRadius = 1400 - 50; // keep 50px interior margin
    const theta = rng.random() * Math.PI * 2;
    const radius = Math.sqrt(rng.random()) * fenceRadius; // uniform disc
    return {
      x: centerX + Math.cos(theta) * radius,
      y: centerY + Math.sin(theta) * radius,
    };
  }
  // Default rectangular sampling
  return {
    x: rng.randomRange(50, worldWidth - 50),
    y: rng.randomRange(50, worldHeight - 50),
  } as Vec2;
}

/**
 * Spawn coins deterministically based on seed using spatial index
 */
export function spawnCoins(
  rng: Rng,
  config: SpawnConfig,
  playerSpawn: Vec2,
  spatialIndex: SpatialIndex
): Coin[] {
  const coins: Coin[] = [];
  const maxAttempts = config.coinCount * 10; // Prevent infinite loops
  let attempts = 0;

  for (let i = 0; i < config.coinCount && attempts < maxAttempts; attempts++) {
    const position = generateRandomPosition(
      rng,
      config.worldWidth,
      config.worldHeight
    );

    // Check if position is valid
    if (
      !isTooCloseToPlayer(position, playerSpawn, config.minDistanceFromPlayer) &&
      !isTooCloseToCoins(position, spatialIndex, 40) // 40px minimum between coins
    ) {
      const coin: Coin = {
        id: generateCoinId(i, rng.getSeed()),
        position,
        value: config.coinValue,
        collected: false,
      };
      coins.push(coin);
      
      // Add coin to spatial index
      addEntity(spatialIndex, {
        id: coin.id,
        position: coin.position,
        radius: 8, // Coin radius
      });
      
      i++; // Only increment when we successfully place a coin
    }
  }

  return coins;
}
