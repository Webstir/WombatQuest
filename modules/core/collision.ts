/**
 * Collision detection utilities
 */

import type { Vec2 } from './types';

/**
 * Calculate distance between two points
 */
export function distance(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Check if two circles overlap
 */
export function circlesOverlap(
  center1: Vec2,
  radius1: number,
  center2: Vec2,
  radius2: number
): boolean {
  const dist = distance(center1, center2);
  return dist < radius1 + radius2;
}

/**
 * Check if a point is within a circle
 */
export function pointInCircle(
  point: Vec2,
  center: Vec2,
  radius: number
): boolean {
  return distance(point, center) <= radius;
}

/**
 * Check if player overlaps with a coin
 */
export function playerOverlapsCoin(
  playerPos: Vec2,
  playerRadius: number,
  coinPos: Vec2,
  coinRadius: number
): boolean {
  return circlesOverlap(playerPos, playerRadius, coinPos, coinRadius);
}

/**
 * Check if player overlaps with a collectible
 */
export function playerOverlapsCollectible(
  playerPos: Vec2,
  playerRadius: number,
  collectiblePos: Vec2,
  collectibleRadius: number = 15 // Default radius for emoji collectibles
): boolean {
  return circlesOverlap(playerPos, playerRadius, collectiblePos, collectibleRadius);
}
