import { describe, it, expect, beforeEach } from 'vitest';
import { tickHellStation } from '/src/modules/world';
import type { GasCan, HellStation } from '/src/modules/world';
import { SeededRng } from '/shared/adapters/SeededRng';

describe('HellStation spawning', () => {
  let station: HellStation;
  let cans: GasCan[];
  let rng: SeededRng;

  beforeEach(() => {
    station = {
      id: 'hs-1',
      aabb: { x: 100, y: 100, w: 200, h: 100 },
      spawnIntervalMs: 1000,
      maxCans: 3,
      lastSpawnAt: 0,
    };
    cans = [];
    rng = new SeededRng(42);
  });

  it('spawns at most maxCans within the station', () => {
    let now = 2000;
    ({ cans, station } = tickHellStation(station, cans, now, rng));
    now += 1000;
    ({ cans, station } = tickHellStation(station, cans, now, rng));
    now += 1000;
    ({ cans, station } = tickHellStation(station, cans, now, rng));
    now += 1000;
    ({ cans, station } = tickHellStation(station, cans, now, rng));

    expect(cans.length).toBeLessThanOrEqual(3);
    for (const c of cans) {
      expect(c.pos.x).toBeGreaterThanOrEqual(station.aabb.x);
      expect(c.pos.x).toBeLessThanOrEqual(station.aabb.x + station.aabb.w);
      expect(c.pos.y).toBeGreaterThanOrEqual(station.aabb.y);
      expect(c.pos.y).toBeLessThanOrEqual(station.aabb.y + station.aabb.h);
    }
  });

  it('respects spawn interval', () => {
    let now = 1000;
    ({ cans, station } = tickHellStation(station, cans, now, rng));
    const countAfterFirst = cans.length;
    now += 500;
    ({ cans, station } = tickHellStation(station, cans, now, rng));
    expect(cans.length).toBe(countAfterFirst);
    now += 500;
    ({ cans, station } = tickHellStation(station, cans, now, rng));
    expect(cans.length).toBeGreaterThan(countAfterFirst);
  });

  it('is deterministic with fixed seed', () => {
    const rngA = new SeededRng(7);
    const rngB = new SeededRng(7);
    let sA = { ...station };
    let sB = { ...station };
    let cansA: GasCan[] = [];
    let cansB: GasCan[] = [];

    let now = 3000;
    ({ cans: cansA, station: sA } = tickHellStation(sA, cansA, now, rngA));
    ({ cans: cansB, station: sB } = tickHellStation(sB, cansB, now, rngB));
    expect(cansA[0].pos).toEqual(cansB[0].pos);
  });
});


