/**
 * World registry system - manages world configurations
 */

import type { WorldConfig } from './types';
import { createVec2 } from '../core';

/**
 * Registry of all available worlds
 */
class WorldRegistry {
  private worlds: Map<string, WorldConfig> = new Map();

  constructor() {
    this.initializeDefaultWorlds();
  }

  /**
   * Register a new world configuration
   */
  registerWorld(config: WorldConfig): void {
    this.worlds.set(config.id, config);
  }

  /**
   * Get a world configuration by ID
   */
  getWorld(worldId: string): WorldConfig | undefined {
    return this.worlds.get(worldId);
  }

  /**
   * Get all registered world IDs
   */
  getAllWorldIds(): string[] {
    return Array.from(this.worlds.keys());
  }

  /**
   * Check if a world exists
   */
  hasWorld(worldId: string): boolean {
    return this.worlds.has(worldId);
  }

  /**
   * Initialize default worlds (Camp, Playa, Dance Stage)
   */
  private initializeDefaultWorlds(): void {
    // Camp World - 1 second = 1 minute
    this.registerWorld({
      id: 'camp',
      name: 'Camp',
      width: 1600,
      height: 1200,
      backgroundColor: '#f5deb3', // Beige
      timeScale: 1.0, // Normal time speed
      spawnPosition: createVec2(800, 600),
      boundaries: [
        {
          side: 'left',
          exitWorldId: 'playa',
          exitPosition: createVec2(1200, 1500), // Camp → Playa near our camp
          triggerDistance: 50,
          useRelativePositioning: true // Enable relative positioning
        },
        {
          side: 'right',
          exitWorldId: 'playa',
          exitPosition: createVec2(1200, 1500), // Camp → Playa near our camp
          triggerDistance: 50,
          useRelativePositioning: true
        },
        {
          side: 'top',
          exitWorldId: 'playa',
          exitPosition: createVec2(1200, 1500), // Camp → Playa near our camp
          triggerDistance: 50,
          useRelativePositioning: true
        },
        {
          side: 'bottom',
          exitWorldId: 'playa',
          exitPosition: createVec2(1200, 1500), // Camp → Playa near our camp
          triggerDistance: 50,
          useRelativePositioning: true
        }
      ],
      description: 'Your home base at Burning Man'
    });

    // Playa World - 1 second = 1 hour
    this.registerWorld({
      id: 'playa',
      name: 'The Playa',
      width: 4000,
      height: 3000,
      backgroundColor: '#f5deb3', // Beige like camp
      timeScale: 1.0, // Normal time speed
      spawnPosition: createVec2(2000, 1500),
      boundaries: [
        {
          side: 'right',
          exitWorldId: 'camp',
          exitPosition: createVec2(100, 600), // Exit on left side of camp
          triggerDistance: 50
        },
        {
          side: 'left',
          exitWorldId: 'danceStage',
          exitPosition: createVec2(1400, 400), // Exit on right side of dance stage
          triggerDistance: 50
        },
        {
          side: 'area',
          exitWorldId: 'camp',
          exitPosition: createVec2(800, 600), // Base position (center of main camp)
          areaPosition: createVec2(1200, 1500), // Match new playa camp position
          areaWidth: 100, // 50% smaller
          areaHeight: 75, // 50% smaller
          triggerDistance: 0, // Instant trigger when entering area
          useRelativePositioning: true // Enable relative positioning for return to camp
        }
      ],
      description: 'The vast open playa of Burning Man'
    });

    // Dance Stage World - 1 second = 30 seconds
    this.registerWorld({
      id: 'danceStage',
      name: 'Dance Stage',
      width: 1200,
      height: 800,
      backgroundColor: '#1a1a2e', // Dark purple/blue
      timeScale: 1.0, // Normal time speed
      spawnPosition: createVec2(600, 400),
      boundaries: [
        {
          side: 'right',
          exitWorldId: 'playa',
          exitPosition: createVec2(100, 400), // Exit on left side of playa
          triggerDistance: 50
        }
      ],
      description: 'The main dance stage with pulsing lights'
    });
  }
}

// Export singleton instance
export const worldRegistry = new WorldRegistry();

/**
 * Helper functions for world registry
 */
export function getWorld(worldId: string): WorldConfig | undefined {
  return worldRegistry.getWorld(worldId);
}

export function getAllWorldIds(): string[] {
  return worldRegistry.getAllWorldIds();
}

export function hasWorld(worldId: string): boolean {
  return worldRegistry.hasWorld(worldId);
}

export function registerWorld(config: WorldConfig): void {
  worldRegistry.registerWorld(config);
}
