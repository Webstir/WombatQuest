import { FUEL_CONSUMPTION_PER_SEC, FUEL_REFILL_AMOUNT, KARMA_FOR_DELIVERY, MOUNT_RANGE } from '../world';
import type { ArtCar, Player } from '../world';

export function consumeFuel(car: ArtCar, dtSec: number): ArtCar {
  const moving = Math.hypot(car.vel.x, car.vel.y) > 1e-3;
  const drain = moving ? FUEL_CONSUMPTION_PER_SEC * dtSec : 0;
  const fuel = Math.max(0, Math.min(car.fuelMax, car.fuel - drain));
  return { ...car, fuel };
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function deliverGasToArtCar(
  player: Player,
  car: ArtCar
): { delivered: boolean; fuelAdded: number; karmaGained: number; player: Player; car: ArtCar } {
  if (!player.holding || player.holding.kind !== 'GasCan') {
    return { delivered: false, fuelAdded: 0, karmaGained: 0, player, car };
  }
  const within = distance(player.pos, car.pos) <= MOUNT_RANGE;
  if (!within) {
    return { delivered: false, fuelAdded: 0, karmaGained: 0, player, car };
  }
  const add = Math.min(FUEL_REFILL_AMOUNT, car.fuelMax - car.fuel);
  const updatedCar: ArtCar = { ...car, fuel: car.fuel + add };
  const updatedPlayer: Player = { ...player, holding: null, karma: player.karma + KARMA_FOR_DELIVERY };
  return { delivered: true, fuelAdded: add, karmaGained: KARMA_FOR_DELIVERY, player: updatedPlayer, car: updatedCar };
}

export function checkArtCarGasCanCollision(
  car: ArtCar,
  gasCans: { id: string; pos: { x: number; y: number }; active: boolean }[]
): { collided: boolean; canId?: string; fuelAdded: number; car: ArtCar } {
  const carRadius = 30 * car.size; // Car collision radius based on size
  
  for (const can of gasCans) {
    if (can.active) continue; // Skip cans held by player
    
    const dist = distance(car.pos, can.pos);
    if (dist <= carRadius) {
      // Art car collided with gas can - refuel
      const add = Math.min(FUEL_REFILL_AMOUNT, car.fuelMax - car.fuel);
      const updatedCar: ArtCar = { ...car, fuel: car.fuel + add };
      return { collided: true, canId: can.id, fuelAdded: add, car: updatedCar };
    }
  }
  
  return { collided: false, fuelAdded: 0, car };
}


