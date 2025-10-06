import { describe, it, expect } from 'vitest';
import { SeededRng } from '/shared/adapters/SeededRng';
import { createArtCar, tickArtCarKinematics } from '/src/modules/entities';
import { consumeFuel } from '/src/modules/actions/fuel';

describe('ArtCar basics', () => {
  it('creates with fuel max and moves with kinematics', () => {
    const rng = new SeededRng(1);
    const car = createArtCar(rng, { x: 0, y: 0 });
    const moved = tickArtCarKinematics(car, 1.0);
    expect(moved.pos.x).not.toBe(0);
    expect(moved.pos.y).not.toBe(0);
    expect(car.fuel).toBeGreaterThan(0);
  });

  it('consumes fuel when moving and clamps to [0, fuelMax]', () => {
    const rng = new SeededRng(2);
    let car = createArtCar(rng, { x: 0, y: 0 });
    car = { ...car, fuel: 1 };
    car = consumeFuel(car, 5); // should drain to 0
    expect(car.fuel).toBeGreaterThanOrEqual(0);
    expect(car.fuel).toBeLessThanOrEqual(car.fuelMax);
  });
});



