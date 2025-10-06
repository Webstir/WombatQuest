/**
 * Collectible spawning logic for coins, water bottles, food, and drugs
 */

import type { Rng } from '../../shared/ports';
import type { Vec2 } from '../core';
import type { Collectible, CollectibleType } from './types';
import type { SpatialIndex } from '../spatial';
import { queryRadius, addEntity } from '../spatial';

/**
 * Generate a deterministic collectible ID based on index and seed
 */
export function generateCollectibleId(index: number, seed: number, type: CollectibleType): string {
  return `${type}_${seed}_${index}`;
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
 * Check if a position is too close to existing collectibles using spatial index
 */
export function isTooCloseToCollectibles(
  position: Vec2,
  spatialIndex: SpatialIndex,
  minDistance: number
): boolean {
  const nearbyEntities = queryRadius(spatialIndex, position, minDistance);
  return nearbyEntities.entities.length > 0;
}

/**
 * Check if a position is too close to landmarks (Man, Temple, etc.)
 */
export function isTooCloseToLandmarks(
  position: Vec2,
  minDistance: number = 200
): boolean {
  // The Man position (2000, 1500)
  const manPos = { x: 2000, y: 1500 };
  const manDistance = Math.sqrt((position.x - manPos.x) ** 2 + (position.y - manPos.y) ** 2);
  if (manDistance < minDistance) return true;
  
  // The Temple position (2000, 600)
  const templePos = { x: 2000, y: 600 };
  const templeDistance = Math.sqrt((position.x - templePos.x) ** 2 + (position.y - templePos.y) ** 2);
  if (templeDistance < minDistance) return true;
  
  return false;
}

/**
 * Generate a random position within world bounds
 */
export function generateRandomPosition(
  rng: Rng,
  worldWidth: number,
  worldHeight: number
): Vec2 {
  if (worldWidth >= 4000 && worldHeight >= 3000) {
    const centerX = worldWidth / 2; // 2000
    const centerY = worldHeight / 2; // 1500
    const fenceRadius = 1400 - 50; // interior margin
    const theta = rng.random() * Math.PI * 2;
    const radius = Math.sqrt(rng.random()) * fenceRadius;
    return { x: centerX + Math.cos(theta) * radius, y: centerY + Math.sin(theta) * radius };
  }
  return {
    x: rng.randomRange(50, worldWidth - 50), // 50px margin from edges
    y: rng.randomRange(50, worldHeight - 50),
  } as Vec2;
}

/**
 * Get collectible configuration based on type
 */
export function getCollectibleConfig(type: CollectibleType, _subtype?: string) {
  const configs = {
    coin: { value: 1, radius: 2.4, color: '#f1c40f', borderColor: '#f39c12' },
    water: { value: 1, radius: 3, color: '#3498db', borderColor: '#2980b9' },
    food: { 
      value: 1, 
      radius: 4, 
      color: '#e67e22', 
      borderColor: '#d35400',
      subtypes: [
        'Grilled Cheese', 'Energy Bar', 'Fruit Salad', 
        'Smoothie', 'Popsicle', 'Burrito', 'Taco', 'Ice Cream', 'Corn Dog', 
        'Bacon Pancakes', 'Nachos', 'Cotton Candy', 'Dusty Donut', 'Playa Pizza', 'Burner Burger', 'Pickles'
      ]
    },
    drug: { 
      value: 1, 
      radius: 3.5, 
      color: '#9b59b6', 
      borderColor: '#8e44ad',
      subtypes: [
        'molly', 'shrooms', 'acid', 'dmt', 'salvia', 'whipits', 'energy-drink', 
        'mystery-pill', 'mystery-snowball', 'cigarette', 'joint', 'vodka', 
        'mda', '2c-i', 'caffeine', 'alcohol', 'mdma', 'weed',
        'cocaine', 'ketamine', 'cannabis'
      ]
    },
    bike: { 
      value: 1, 
      radius: 6, 
      color: '#2c3e50', 
      borderColor: '#34495e'
    }
  };
  
  return configs[type];
}

/**
 * Spawn collectibles deterministically based on seed using spatial index
 */
export function spawnCollectibles(
  rng: Rng,
  worldWidth: number,
  worldHeight: number,
  playerSpawn: Vec2,
  spatialIndex: SpatialIndex,
  coinCount: number = 100,
  waterCount: number = 50,
  foodCount: number = 30,
  drugCount: number = 20,
  bikeCount: number = 10,
  lightBulbCount: number = 16, // 2x more light bulbs
  batteryCount: number = 10 // 2x more batteries
): Collectible[] {
  const collectibles: Collectible[] = [];
  const maxAttempts = (coinCount + waterCount + foodCount + drugCount + bikeCount + lightBulbCount + batteryCount) * 10;
  let attempts = 0;

  // Spawn coins
  for (let i = 0; i < coinCount && attempts < maxAttempts; attempts++) {
    const position = generateRandomPosition(rng, worldWidth, worldHeight);
    
    if (
      !isTooCloseToPlayer(position, playerSpawn, 100) &&
      !isTooCloseToCollectibles(position, spatialIndex, 40) &&
      !isTooCloseToLandmarks(position, 200)
    ) {
      const collectible: Collectible = {
        id: generateCollectibleId(i, rng.getSeed(), 'coin'),
        position,
        type: 'coin',
        value: 1,
        collected: false,
      };
      collectibles.push(collectible);
      
      addEntity(spatialIndex, {
        id: collectible.id,
        position: collectible.position,
        radius: 2.4,
      });
      
      i++;
    }
  }

  // Spawn water bottles
  for (let i = 0; i < waterCount && attempts < maxAttempts; attempts++) {
    const position = generateRandomPosition(rng, worldWidth, worldHeight);
    
    if (
      !isTooCloseToPlayer(position, playerSpawn, 100) &&
      !isTooCloseToCollectibles(position, spatialIndex, 40) &&
      !isTooCloseToLandmarks(position, 200)
    ) {
      const collectible: Collectible = {
        id: generateCollectibleId(i, rng.getSeed(), 'water'),
        position,
        type: 'water',
        value: 1,
        collected: false,
        subtype: 'water-bottle',
      };
      collectibles.push(collectible);
      
      addEntity(spatialIndex, {
        id: collectible.id,
        position: collectible.position,
        radius: 3,
      });
      
      i++;
    }
  }

  // Spawn food
  for (let i = 0; i < foodCount && attempts < maxAttempts; attempts++) {
    const position = generateRandomPosition(rng, worldWidth, worldHeight);
    
    if (
      !isTooCloseToPlayer(position, playerSpawn, 100) &&
      !isTooCloseToCollectibles(position, spatialIndex, 40) &&
      !isTooCloseToLandmarks(position, 200)
    ) {
      const foodConfig = getCollectibleConfig('food');
      const randomSubtype = (foodConfig as any).subtypes![Math.floor(rng.random() * (foodConfig as any).subtypes!.length)];
      
      const collectible: Collectible = {
        id: generateCollectibleId(i, rng.getSeed(), 'food'),
        position,
        type: 'food',
        value: 1,
        collected: false,
        subtype: randomSubtype,
      };
      collectibles.push(collectible);
      
      addEntity(spatialIndex, {
        id: collectible.id,
        position: collectible.position,
        radius: 4,
      });
      
      i++;
    }
  }

  // Spawn drugs
  for (let i = 0; i < drugCount && attempts < maxAttempts; attempts++) {
    const position = generateRandomPosition(rng, worldWidth, worldHeight);
    
    if (
      !isTooCloseToPlayer(position, playerSpawn, 100) &&
      !isTooCloseToCollectibles(position, spatialIndex, 40) &&
      !isTooCloseToLandmarks(position, 200)
    ) {
      const drugConfig = getCollectibleConfig('drug');
      const randomSubtype = (drugConfig as any).subtypes![Math.floor(rng.random() * (drugConfig as any).subtypes!.length)];
      
      const collectible: Collectible = {
        id: generateCollectibleId(i, rng.getSeed(), 'drug'),
        position,
        type: 'drug',
        value: 1,
        collected: false,
        subtype: randomSubtype,
      };
      collectibles.push(collectible);
      
      addEntity(spatialIndex, {
        id: collectible.id,
        position: collectible.position,
        radius: 3.5,
      });
      
      i++;
    }
  }

  // Spawn bikes
  for (let i = 0; i < bikeCount && attempts < maxAttempts; attempts++) {
    const position = generateRandomPosition(rng, worldWidth, worldHeight);
    
    if (
      !isTooCloseToPlayer(position, playerSpawn, 100) &&
      !isTooCloseToCollectibles(position, spatialIndex, 60) && // Bikes need more space
      !isTooCloseToLandmarks(position, 200)
    ) {
      const collectible: Collectible = {
        id: generateCollectibleId(i, rng.getSeed(), 'bike'),
        position,
        type: 'bike',
        value: 1,
        collected: false,
      };
      collectibles.push(collectible);
      
      addEntity(spatialIndex, {
        id: collectible.id,
        position: collectible.position,
        radius: 6,
      });
      
      i++;
    }
  }

  // Spawn colored light bulbs with specific percentages
  const lightBulbTypes = [
    { type: 'light-bulb-white', itemType: 'Light Bulb White', weight: 70 },
    { type: 'light-bulb-red', itemType: 'Light Bulb Red', weight: 20 },
    { type: 'light-bulb-green', itemType: 'Light Bulb Green', weight: 20 },
    { type: 'light-bulb-blue', itemType: 'Light Bulb Blue', weight: 20 },
    { type: 'light-bulb-orange', itemType: 'Light Bulb Orange', weight: 20 },
    { type: 'light-bulb-purple', itemType: 'Light Bulb Purple', weight: 20 },
    { type: 'light-bulb-rainbow', itemType: 'Light Bulb Rainbow', weight: 10 }
  ];
  
  for (let i = 0; i < lightBulbCount && attempts < maxAttempts; attempts++) {
    const position = generateRandomPosition(rng, worldWidth, worldHeight);
    
    if (
      !isTooCloseToPlayer(position, playerSpawn, 100) &&
      !isTooCloseToCollectibles(position, spatialIndex, 50)
    ) {
      // Select light bulb type based on weighted random
      const totalWeight = lightBulbTypes.reduce((sum, bulb) => sum + bulb.weight, 0);
      let randomWeight = rng.randomRange(0, totalWeight);
      
      let selectedBulb = lightBulbTypes[0];
      for (const bulb of lightBulbTypes) {
        randomWeight -= bulb.weight;
        if (randomWeight <= 0) {
          selectedBulb = bulb;
          break;
        }
      }
      
      const collectible: Collectible = {
        id: generateCollectibleId(i, rng.getSeed(), selectedBulb.type),
        position,
        type: selectedBulb.type,
        value: 1,
        collected: false,
        data: { itemType: selectedBulb.itemType }
      };
      collectibles.push(collectible);
      
      addEntity(spatialIndex, {
        id: collectible.id,
        position: collectible.position,
        radius: 10,
      });
      
      i++;
    }
  }

  // Spawn batteries
  for (let i = 0; i < batteryCount && attempts < maxAttempts; attempts++) {
    const position = generateRandomPosition(rng, worldWidth, worldHeight);
    
    if (
      !isTooCloseToPlayer(position, playerSpawn, 100) &&
      !isTooCloseToCollectibles(position, spatialIndex, 50)
    ) {
      const collectible: Collectible = {
        id: generateCollectibleId(i, rng.getSeed(), 'battery'),
        position,
        type: 'battery',
        value: 1,
        collected: false
      };
      collectibles.push(collectible);
      
      addEntity(spatialIndex, {
        id: collectible.id,
        position: collectible.position,
        radius: 10,
      });
      
      i++;
    }
  }

  return collectibles;
}
