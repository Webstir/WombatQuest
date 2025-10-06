/**
 * Pure movement logic and helpers
 */

import type { Vec2, Direction, MovementInput } from './types';

const MOVEMENT_SPEED = 200; // pixels per second

/**
 * Create a new Vec2
 */
export function createVec2(x: number, y: number): Vec2 {
  return { x, y };
}

/**
 * Add two Vec2s
 */
export function addVec2(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

/**
 * Scale a Vec2 by a scalar
 */
export function scaleVec2(vec: Vec2, scalar: number): Vec2 {
  return { x: vec.x * scalar, y: vec.y * scalar };
}

/**
 * Get movement vector for a direction
 */
export function getDirectionVector(direction: Direction): Vec2 {
  switch (direction) {
    case 'up':
      return createVec2(0, -1);
    case 'down':
      return createVec2(0, 1);
    case 'left':
      return createVec2(-1, 0);
    case 'right':
      return createVec2(1, 0);
  }
}

/**
 * Calculate new position based on movement input
 */
export function calculateMovement(
  currentPosition: Vec2,
  input: MovementInput,
  speed: number = MOVEMENT_SPEED
): Vec2 {
  const direction = getDirectionVector(input.direction);
  const distance = speed * input.deltaTime;
  const movement = scaleVec2(direction, distance);
  return addVec2(currentPosition, movement);
}

/**
 * Clamp position to canvas bounds
 */
export function clampToBounds(
  position: Vec2,
  canvasWidth: number,
  canvasHeight: number,
  playerSize: number
): Vec2 {
  const halfSize = playerSize / 2;
  return {
    x: Math.max(halfSize, Math.min(canvasWidth - halfSize, position.x)),
    y: Math.max(halfSize, Math.min(canvasHeight - halfSize, position.y)),
  };
}
