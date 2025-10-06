/**
 * World module types - entities and world state
 */

import type { Vec2 } from '../core';
import type { MoopItem } from '../moop';

export interface Coin {
  id: string;
  position: Vec2;
  value: number;
  collected: boolean;
}

export type CollectibleType = 'coin' | 'water' | 'food' | 'drug' | 'bike' | 'light-bulb' | 'light-bulb-white' | 'light-bulb-red' | 'light-bulb-green' | 'light-bulb-blue' | 'light-bulb-orange' | 'light-bulb-purple' | 'light-bulb-rainbow' | 'battery';

export interface Collectible {
  id: string;
  position: Vec2;
  type: CollectibleType;
  value: number;
  collected: boolean;
  subtype?: string; // For specific items like 'grilled-cheese', 'molly', etc.
}

export interface WorldState {
  coins: Coin[];
  moop: MoopItem[];
  seed: number;
}

export interface SpawnConfig {
  coinCount: number;
  worldWidth: number;
  worldHeight: number;
  coinValue: number;
  minDistanceFromPlayer: number;
}
