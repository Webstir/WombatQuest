import { describe, it, expect } from 'vitest';
import { SeededRng } from '/shared/adapters/SeededRng';
import { createArtCar } from '/src/modules/entities';
import { tryMountArtCar, dismount } from '/src/modules/actions';
import type { Player } from '/src/modules/world';

function makePlayer(x: number, y: number): Player {
  return { id: 'p1', pos: { x, y }, vel: { x: 0, y: 0 }, holding: null, mountedOn: null, bike: null, karma: 0 };
}

describe('Mount/Dismount', () => {
  it('mounts nearest car within range and leaves bike', () => {
    const rng = new SeededRng(5);
    const cars = [createArtCar(rng, { x: 0, y: 0 })];
    const player = makePlayer(10, 0);
    const res = tryMountArtCar(player, cars);
    expect(res.mounted).toBe(true);
    expect(res.player.mountedOn).toBe(cars[0].id);
    expect(res.player.bike).toBeTruthy();
  });

  it('fails to mount when holding gas can', () => {
    const rng = new SeededRng(6);
    const cars = [createArtCar(rng, { x: 0, y: 0 })];
    const player: Player = { id: 'p1', pos: { x: 10, y: 0 }, vel: { x: 0, y: 0 }, holding: { kind: 'GasCan', id: 'gc1' }, mountedOn: null, bike: null, karma: 0 };
    const res = tryMountArtCar(player, cars);
    expect(res.mounted).toBe(false);
  });

  it('dismounts correctly', () => {
    const player: Player = { id: 'p1', pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, holding: null, mountedOn: 'car1', bike: { id: 'bike', pos: { x: 0, y: 0 } }, karma: 0 };
    const res = dismount(player);
    expect(res.mountedOn).toBeNull();
    expect(res.bike).toBeNull();
  });
});

