import type { Player, ArtCar } from '../world';

export function isOnPlatform(
  entityAabb: { x: number; y: number; w: number; h: number },
  platformAabb: { x: number; y: number; w: number; h: number }
): boolean {
  return (
    entityAabb.x < platformAabb.x + platformAabb.w &&
    entityAabb.x + entityAabb.w > platformAabb.x &&
    entityAabb.y < platformAabb.y + platformAabb.h &&
    entityAabb.y + entityAabb.h > platformAabb.y
  );
}

export function applyMovingPlatform(
  player: Player,
  artCar: ArtCar,
  dtSec: number
): { pos: { x: number; y: number } } {
  const playerAabb = { x: player.pos.x - 8, y: player.pos.y - 8, w: 16, h: 16 };
  
  if (isOnPlatform(playerAabb, artCar.platformAabb)) {
    return {
      pos: {
        x: player.pos.x + artCar.vel.x * dtSec,
        y: player.pos.y + artCar.vel.y * dtSec
      }
    };
  }
  
  return { pos: player.pos };
}

