import { Vec2, createVec2, distance } from '../core';
import { Rng } from '../../shared/ports';
import { MoopItem, MoopType, MOOP_DEFINITIONS, generateMoopId } from './types';

/**
 * Configuration for moop spawning
 */
export interface MoopSpawnConfig {
  count: number;
  minDistanceFromPlayer: number;
  minDistanceFromOtherMoop: number;
  worldBounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

/**
 * Check if a position is too close to the player
 */
export function isTooCloseToPlayer(
  position: Vec2,
  playerPosition: Vec2,
  minDistance: number
): boolean {
  return distance(position, playerPosition) < minDistance;
}

/**
 * Check if a position is too close to existing moop items
 */
export function isTooCloseToMoop(
  position: Vec2,
  existingMoop: MoopItem[],
  minDistance: number
): boolean {
  return existingMoop.some(moop => 
    distance(position, moop.position) < minDistance
  );
}

/**
 * Generate a random position within world bounds
 */
export function generateRandomMoopPosition(
  rng: Rng,
  worldBounds: MoopSpawnConfig['worldBounds']
): Vec2 {
  const x = rng.random() * (worldBounds.maxX - worldBounds.minX) + worldBounds.minX;
  const y = rng.random() * (worldBounds.maxY - worldBounds.minY) + worldBounds.minY;
  return createVec2(x, y);
}

/**
 * Select a moop type based on spawn weights
 */
export function selectMoopType(rng: Rng): MoopType {
  const types: MoopType[] = Object.keys(MOOP_DEFINITIONS) as MoopType[];
  const weights = types.map(type => MOOP_DEFINITIONS[type].spawnWeight);
  
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let randomValue = rng.random() * totalWeight;
  
  for (let i = 0; i < types.length; i++) {
    randomValue -= weights[i];
    if (randomValue <= 0) {
      return types[i];
    }
  }
  
  return types[types.length - 1]; // Fallback
}

/**
 * Spawn moop items in the world
 */
export function spawnMoop(
  config: MoopSpawnConfig,
  playerPosition: Vec2,
  existingMoop: MoopItem[],
  rng: Rng
): MoopItem[] {
  const newMoop: MoopItem[] = [];
  
  for (let i = 0; i < config.count; i++) {
    let attempts = 0;
    const maxAttempts = 50;
    let position: Vec2;
    
    // Try to find a valid position
    do {
      position = generateRandomMoopPosition(rng, config.worldBounds);
      attempts++;
    } while (
      attempts < maxAttempts &&
      (isTooCloseToPlayer(position, playerPosition, config.minDistanceFromPlayer) ||
       isTooCloseToMoop(position, [...existingMoop, ...newMoop], config.minDistanceFromOtherMoop))
    );
    
    // If we found a valid position, create the moop item
    if (attempts < maxAttempts) {
      const moopType = selectMoopType(rng);
      const moopConfig = MOOP_DEFINITIONS[moopType];
      
      const moopItem: MoopItem = {
        id: generateMoopId(),
        type: moopType,
        position,
        radius: moopConfig.radius,
        karmaReward: moopConfig.karmaReward,
        collected: false,
      };
      
      newMoop.push(moopItem);
    }
  }
  
  return newMoop;
}
