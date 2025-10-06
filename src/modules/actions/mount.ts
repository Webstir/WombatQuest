import { MOUNT_RANGE } from '../world';
import type { Player, ArtCar } from '../world';

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function tryMountArtCar(
  player: Player,
  cars: ArtCar[]
): { mounted: boolean; player: Player; artCarId?: string; bikeLeft?: boolean } {
  if (player.holding && player.holding.kind === 'GasCan') {
    return { mounted: false, player };
  }
  
  let nearest: ArtCar | null = null;
  let nearestDist = Infinity;
  for (const car of cars) {
    const dist = distance(player.pos, car.pos);
    if (dist < nearestDist && dist <= MOUNT_RANGE) {
      nearest = car;
      nearestDist = dist;
    }
  }
  
  if (!nearest) {
    return { mounted: false, player };
  }
  
  const updatedPlayer: Player = {
    ...player,
    mountedOn: nearest.id,
    bike: { id: 'bike', pos: { x: player.pos.x, y: player.pos.y } }
  };
  
  return { mounted: true, player: updatedPlayer, artCarId: nearest.id, bikeLeft: true };
}

export function dismount(player: Player): Player {
  if (!player.mountedOn) return player;
  
  return {
    ...player,
    mountedOn: null,
    bike: null
  };
}

