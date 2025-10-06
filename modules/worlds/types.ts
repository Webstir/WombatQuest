/**
 * World management types and interfaces
 */

import type { Vec2 } from '../core';

/**
 * World boundary for transitions
 */
export interface WorldBoundary {
  side: 'left' | 'right' | 'top' | 'bottom' | 'area';
  exitWorldId: string;
  exitPosition: Vec2;
  triggerDistance?: number; // How close to edge to trigger (default: player size)
  // For area-based boundaries
  areaPosition?: Vec2; // Center of the area
  areaWidth?: number; // Width of the area
  areaHeight?: number; // Height of the area
  // For relative positioning
  useRelativePositioning?: boolean; // Whether to use relative exit positions
}

/**
 * World configuration
 */
export interface WorldConfig {
  id: string;
  name: string;
  width: number;
  height: number;
  backgroundColor: string;
  timeScale: number; // 1 second = X real time (e.g., 60 for 1 second = 1 minute)
  boundaries: WorldBoundary[];
  spawnPosition: Vec2;
  description?: string;
}

/**
 * World-specific state (items, NPCs, events, etc.)
 */
export interface WorldState {
  worldId: string;
  items: WorldItem[];
  npcs: WorldNPC[];
  events: WorldEvent[];
  lastVisited: number; // timestamp
  isLoaded: boolean;
}

/**
 * Items that exist in a specific world
 */
export interface WorldItem {
  id: string;
  type: string;
  position: Vec2;
  collected: boolean;
  data?: any; // Item-specific data
}

/**
 * NPCs in a specific world
 */
export interface WorldNPC {
  id: string;
  type: string;
  position: Vec2;
  state: string;
  data?: any; // NPC-specific data
}

/**
 * Events that can happen in a world
 */
export interface WorldEvent {
  id: string;
  type: string;
  position: Vec2;
  triggered: boolean;
  data?: any; // Event-specific data
}

/**
 * World transition result
 */
export interface WorldTransition {
  success: boolean;
  newWorldId: string;
  newPosition: Vec2;
  message?: string;
}

/**
 * World manager state
 */
export interface WorldManagerState {
  currentWorldId: string;
  loadedWorlds: Set<string>;
  worldStates: Map<string, WorldState>;
  transitionInProgress: boolean;
  lastExitDirection?: 'left' | 'right' | 'top' | 'bottom'; // Track last exit direction for relative positioning
}
