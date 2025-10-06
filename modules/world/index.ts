/**
 * World module - Entity spawning and world state management
 */

// Types
export type {
  Coin,
  WorldState,
  SpawnConfig,
} from './types';

// Coin spawning functions
export {
  generateCoinId,
  isTooCloseToPlayer,
  isTooCloseToCoins,
  generateRandomPosition,
  spawnCoins,
} from './coinSpawner';

export {
  generateCollectibleId,
  isTooCloseToCollectibles,
  getCollectibleConfig,
  spawnCollectibles,
} from './collectibleSpawner';
