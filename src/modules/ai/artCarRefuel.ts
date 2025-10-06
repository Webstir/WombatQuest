import type { ArtCar, GasCan, HellStation, Player } from '../world';

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function decideArtCarState(
  car: ArtCar,
  context: { cans: GasCan[]; station: HellStation; player: Player }
): 'patrol' | 'seekFuel' | 'refueling' | 'idle' {
  if (car.fuel <= car.fuelLowThreshold) {
    return 'seekFuel';
  }
  if (car.fuel >= car.fuelMax * 0.8) {
    return 'patrol';
  }
  return car.state;
}

export function seekGasTarget(
  car: ArtCar,
  context: { cans: GasCan[]; station: HellStation; player: Player }
): { targetPos: { x: number; y: number } | null } {
  const { cans, station, player } = context;
  
  // Check if player is holding gas and nearby
  if (player.holding && player.holding.kind === 'GasCan') {
    const distToPlayer = distance(car.pos, player.pos);
    if (distToPlayer <= 50) {
      return { targetPos: { x: player.pos.x, y: player.pos.y } };
    }
  }
  
  // Find nearest gas can at station
  let nearest: GasCan | null = null;
  let nearestDist = Infinity;
  for (const can of cans) {
    if (can.active) continue;
    const dist = distance(car.pos, can.pos);
    if (dist < nearestDist) {
      nearest = can;
      nearestDist = dist;
    }
  }
  
  if (nearest) {
    return { targetPos: { x: nearest.pos.x, y: nearest.pos.y } };
  }
  
  // Fallback to station center
  const centerX = station.aabb.x + station.aabb.w / 2;
  const centerY = station.aabb.y + station.aabb.h / 2;
  return { targetPos: { x: centerX, y: centerY } };
}

