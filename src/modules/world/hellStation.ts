import type { Rng } from '/shared/ports';
import { GASCAN_MAX_AT_STATION, GASCAN_SPAWN_INTERVAL_MS } from './config';
import type { GasCan, HellStation } from './types';
import { createGasCan, randomPointInAabb } from './spawn';

function countCansAtStation(cans: GasCan[], station: HellStation): number {
  const { x, y, w, h } = station.aabb;
  return cans.filter((c) => !c.active && c.pos.x >= x && c.pos.x <= x + w && c.pos.y >= y && c.pos.y <= y + h).length;
}

function nextGasCanId(stationId: string, seq: number): string {
  return `gascan:${stationId}:${seq}`;
}

export function tickHellStation(
  station: HellStation,
  cans: GasCan[],
  clockNowMs: number,
  rng: Rng
): { cans: GasCan[]; station: HellStation } {
  const timeSince = clockNowMs - station.lastSpawnAt;
  const currentCount = countCansAtStation(cans, station);

  if (currentCount >= (station.maxCans ?? GASCAN_MAX_AT_STATION)) {
    return { cans, station };
  }

  const interval = station.spawnIntervalMs ?? GASCAN_SPAWN_INTERVAL_MS;
  if (timeSince < interval) {
    return { cans, station };
  }

  // Spawn exactly one can per interval tick
  const spawnSeq = Math.floor(clockNowMs / interval);
  const id = nextGasCanId(station.id, spawnSeq);
  const pos = randomPointInAabb(station.aabb, rng);
  const newCan = createGasCan(id, pos);

  const updatedCans = [...cans, newCan];
  const updatedStation: HellStation = { ...station, lastSpawnAt: clockNowMs };
  return { cans: updatedCans, station: updatedStation };
}


