import type { Rng } from '/shared/ports';
import type { GasCan, HellStation } from './types';

export function randomPointInAabb(aabb: HellStation['aabb'], rng: Rng): { x: number; y: number } {
  const x = rng.randomRange(aabb.x, aabb.x + aabb.w);
  const y = rng.randomRange(aabb.y, aabb.y + aabb.h);
  return { x, y };
}

export function createGasCan(id: string, pos: { x: number; y: number }): GasCan {
  return { id, pos, active: false };
}


