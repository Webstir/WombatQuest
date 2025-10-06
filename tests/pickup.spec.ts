import { describe, it, expect } from 'vitest';
import { tryPickupGasCan } from '/src/modules/actions';
import type { Player, GasCan } from '/src/modules/world';

function makePlayer(x: number, y: number): Player {
  return { id: 'p1', pos: { x, y }, vel: { x: 0, y: 0 }, holding: null, mountedOn: null, bike: null, karma: 0 };
}

function canAt(id: string, x: number, y: number): GasCan {
  return { id, pos: { x, y }, active: false };
}

describe('pickup gas can', () => {
  it('succeeds within range and marks can active', () => {
    const player = makePlayer(0, 0);
    const cans = [canAt('c1', 10, 0)];
    const res = tryPickupGasCan(player, cans);
    expect(res.picked).toBe(true);
    expect(res.player.holding?.id).toBe('c1');
    expect(res.cans[0].active).toBe(true);
  });

  it('fails out of range', () => {
    const player = makePlayer(0, 0);
    const cans = [canAt('c1', 100, 100)];
    const res = tryPickupGasCan(player, cans);
    expect(res.picked).toBe(false);
    expect(res.player.holding).toBeTruthy();
    expect(res.player.holding).toBeNull();
  });

  it('rejects pickup when already holding', () => {
    const player: Player = { id: 'p1', pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, holding: { kind: 'GasCan', id: 'cZ' }, mountedOn: null, bike: null, karma: 0 };
    const cans = [canAt('c1', 5, 0)];
    const res = tryPickupGasCan(player, cans);
    expect(res.picked).toBe(false);
    expect(res.player.holding?.id).toBe('cZ');
    expect(res.cans[0].active).toBe(false);
  });
});


