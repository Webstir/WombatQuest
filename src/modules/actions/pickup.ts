import { PICKUP_RANGE } from '../world';
import type { GasCan, Player } from '../world';

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

export function tryPickupGasCan(
  player: Player,
  cans: GasCan[]
): { picked: boolean; player: Player; cans: GasCan[]; pickedId?: string } {
  if (player.holding && player.holding.kind === 'GasCan') {
    return { picked: false, player, cans };
  }

  let nearest: GasCan | null = null;
  let nearestDist = Infinity;
  for (const can of cans) {
    if (can.active) continue;
    const d = distance(player.pos, can.pos);
    if (d < nearestDist) {
      nearest = can;
      nearestDist = d;
    }
  }

  if (!nearest || nearestDist > PICKUP_RANGE) {
    return { picked: false, player, cans };
  }

  const updatedPlayer: Player = {
    ...player,
    holding: { kind: 'GasCan', id: nearest.id },
  };

  const updatedCans: GasCan[] = cans.map((c) => (c.id === nearest!.id ? { ...c, active: true } : c));

  return { picked: true, player: updatedPlayer, cans: updatedCans, pickedId: nearest.id };
}


