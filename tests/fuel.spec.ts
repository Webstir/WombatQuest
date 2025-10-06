import { describe, it, expect } from 'vitest';
import { SeededRng } from '/shared/adapters/SeededRng';
import { createArtCar } from '/src/modules/entities';
import { deliverGasToArtCar } from '/src/modules/actions/fuel';
import type { Player } from '/src/modules/world';
import { FUEL_REFILL_AMOUNT, KARMA_FOR_DELIVERY } from '/src/modules/world';

describe('Deliver gas to ArtCar', () => {
  it('adds fuel and karma and clears holding when in range', () => {
    const rng = new SeededRng(3);
    let car = createArtCar(rng, { x: 0, y: 0 });
    car = { ...car, fuel: 0 };
    const player: Player = { id: 'p1', pos: { x: 10, y: 0 }, vel: { x: 0, y: 0 }, holding: { kind: 'GasCan', id: 'gc1' }, mountedOn: null, bike: null, karma: 0 };
    const res = deliverGasToArtCar(player, car);
    expect(res.delivered).toBe(true);
    expect(res.fuelAdded).toBe(FUEL_REFILL_AMOUNT);
    expect(res.karmaGained).toBe(KARMA_FOR_DELIVERY);
    expect(res.player.holding).toBeNull();
    expect(res.player.karma).toBe(KARMA_FOR_DELIVERY);
    expect(res.car.fuel).toBe(FUEL_REFILL_AMOUNT);
  });

  it('fails when out of range or not holding', () => {
    const rng = new SeededRng(4);
    const car = createArtCar(rng, { x: 0, y: 0 });
    const playerFar: Player = { id: 'p1', pos: { x: 1000, y: 0 }, vel: { x: 0, y: 0 }, holding: { kind: 'GasCan', id: 'gc1' }, mountedOn: null, bike: null, karma: 0 };
    const res1 = deliverGasToArtCar(playerFar, car);
    expect(res1.delivered).toBe(false);

    const playerNoCan: Player = { id: 'p1', pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, holding: null, mountedOn: null, bike: null, karma: 0 };
    const res2 = deliverGasToArtCar(playerNoCan, car);
    expect(res2.delivered).toBe(false);
  });
});



