export type EntityId = string;

export interface GasCan {
  id: EntityId;
  pos: { x: number; y: number };
  active: boolean; // true when held by player
}

export interface HellStation {
  id: EntityId;
  aabb: { x: number; y: number; w: number; h: number };
  spawnIntervalMs: number;
  maxCans: number;
  lastSpawnAt: number; // Clock.now()
}

export interface Player {
  id: EntityId;
  pos: { x: number; y: number };
  vel: { x: number; y: number };
  holding?: { kind: 'GasCan'; id: EntityId } | null;
  mountedOn?: EntityId | null;
  bike?: { id: EntityId; pos: { x: number; y: number } } | null;
  karma: number;
}

export interface ArtCar {
  id: EntityId;
  pos: { x: number; y: number };
  vel: { x: number; y: number };
  fuel: number;
  fuelMax: number;
  fuelLowThreshold: number;
  state: 'patrol' | 'seekFuel' | 'refueling' | 'idle';
  platformAabb: { x: number; y: number; w: number; h: number };
  holder?: EntityId;
  path?: { x: number; y: number }[];
  design: 'classic' | 'fire' | 'speedy' | 'heavy' | 'compact';
  size: number;
  speed: number;
}


