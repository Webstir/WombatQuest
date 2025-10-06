/**
 * World manager - coordinates world transitions and state
 */

import type { WorldConfig, WorldTransition, WorldManagerState } from './types';
import type { Vec2 } from '../core';
import { getWorld } from './worldRegistry';
import { WorldStateManager } from './worldStateManager';

/**
 * Main world management system
 */
export class WorldManager {
  private currentWorldId: string;
  private loadedWorlds: Set<string> = new Set();
  private worldStateManager: WorldStateManager;
  private transitionInProgress: boolean = false;
  private lastExitDirection?: 'left' | 'right' | 'top' | 'bottom';
  private originalExitDirection?: 'left' | 'right' | 'top' | 'bottom'; // Track original exit from camp

  constructor(
    initialWorldId: string,
    worldStateManager: WorldStateManager
  ) {
    this.currentWorldId = initialWorldId;
    this.worldStateManager = worldStateManager;
    this.loadedWorlds.add(initialWorldId);
  }

  /**
   * Get current world configuration
   */
  getCurrentWorld(): WorldConfig | undefined {
    return getWorld(this.currentWorldId);
  }

  /**
   * Get current world ID
   */
  getCurrentWorldId(): string {
    return this.currentWorldId;
  }

  /**
   * Get world manager state
   */
  getState(): WorldManagerState {
    return {
      currentWorldId: this.currentWorldId,
      loadedWorlds: new Set(this.loadedWorlds),
      worldStates: new Map(), // This would need to be exposed from WorldStateManager
      transitionInProgress: this.transitionInProgress
    };
  }

  /**
   * Check if player is near a world boundary and should transition
   */
  checkWorldTransition(playerPosition: Vec2, playerSize: number): WorldTransition | null {
    if (this.transitionInProgress) {
      return null;
    }

    const currentWorld = this.getCurrentWorld();
    if (!currentWorld) {
      return null;
    }

    // Check each boundary
    for (const boundary of currentWorld.boundaries) {
      const distanceToBoundary = this.getDistanceToBoundary(playerPosition, boundary, currentWorld);
      const triggerDistance = boundary.triggerDistance || playerSize;

      if (distanceToBoundary <= triggerDistance) {
        // Track exit direction for relative positioning
        this.lastExitDirection = boundary.side as 'left' | 'right' | 'top' | 'bottom';
        
        // If leaving camp, store the original exit direction
        if (this.currentWorldId === 'camp') {
          this.originalExitDirection = this.lastExitDirection;
        }
        
        // Calculate exit position (relative or fixed)
        const exitPosition = this.calculateExitPosition(boundary, currentWorld);
        
        return this.initiateWorldTransition(boundary.exitWorldId, exitPosition);
      }
    }

    return null;
  }

  /**
   * Calculate distance to a specific boundary
   */
  private getDistanceToBoundary(
    playerPosition: Vec2,
    boundary: any,
    worldConfig: WorldConfig
  ): number {
    switch (boundary.side) {
      case 'left':
        return playerPosition.x;
      case 'right':
        return worldConfig.width - playerPosition.x;
      case 'top':
        return playerPosition.y;
      case 'bottom':
        return worldConfig.height - playerPosition.y;
      case 'area':
        // Check if player is inside the area
        if (boundary.areaPosition && boundary.areaWidth && boundary.areaHeight) {
          const areaLeft = boundary.areaPosition.x - boundary.areaWidth / 2;
          const areaRight = boundary.areaPosition.x + boundary.areaWidth / 2;
          const areaTop = boundary.areaPosition.y - boundary.areaHeight / 2;
          const areaBottom = boundary.areaPosition.y + boundary.areaHeight / 2;
          
          // Check if player is inside the area
          if (playerPosition.x >= areaLeft && playerPosition.x <= areaRight &&
              playerPosition.y >= areaTop && playerPosition.y <= areaBottom) {
            return 0; // Player is inside the area
          }
        }
        return Infinity;
      default:
        return Infinity;
    }
  }

  /**
   * Calculate exit position based on boundary configuration
   */
  private calculateExitPosition(boundary: any, currentWorld: WorldConfig): Vec2 {
    // If using relative positioning, calculate based on exit direction
    if (boundary.useRelativePositioning) {
      // If returning to camp from camp area, use original exit direction
      if (boundary.exitWorldId === 'camp' && this.originalExitDirection) {
        return this.calculateRelativeExitPosition(boundary, currentWorld, this.originalExitDirection);
      }
      // Otherwise use current exit direction
      else if (this.lastExitDirection) {
        return this.calculateRelativeExitPosition(boundary, currentWorld, this.lastExitDirection);
      }
    }
    
    // Use fixed exit position
    return boundary.exitPosition;
  }

  /**
   * Calculate relative exit position based on exit direction
   */
  private calculateRelativeExitPosition(boundary: any, _currentWorld: WorldConfig, direction: 'left' | 'right' | 'top' | 'bottom'): Vec2 {
    const basePosition = boundary.exitPosition;
    
    // Use different offsets based on target world
    // For Playa positioning, use smaller offset to stay closer to camp area
    // For Camp positioning, use larger offset to get closer to edges
    const offset = boundary.exitWorldId === 'playa' ? 150 : 400;
    
    switch (direction) {
      case 'left':
        // If we exited left, appear on the left side of the target
        return { x: basePosition.x - offset, y: basePosition.y };
      case 'right':
        // If we exited right, appear on the right side of the target
        return { x: basePosition.x + offset, y: basePosition.y };
      case 'top':
        // If we exited top, appear above the target
        return { x: basePosition.x, y: basePosition.y - offset };
      case 'bottom':
        // If we exited bottom, appear below the target
        return { x: basePosition.x, y: basePosition.y + offset };
      default:
        return basePosition;
    }
  }

  /**
   * Initiate a world transition
   */
  private initiateWorldTransition(newWorldId: string, newPosition: Vec2): WorldTransition {
    this.transitionInProgress = true;

    // Mark current world as visited
    this.worldStateManager.markWorldVisited(this.currentWorldId);

    // Load new world if not already loaded
    if (!this.loadedWorlds.has(newWorldId)) {
      this.loadedWorlds.add(newWorldId);
    }

    // Update current world
    this.currentWorldId = newWorldId;

    // If returning to camp, reset the original exit direction
    if (newWorldId === 'camp') {
      this.originalExitDirection = undefined;
    }

    // Mark new world as visited
    this.worldStateManager.markWorldVisited(newWorldId);

    // Complete transition
    this.transitionInProgress = false;

    const newWorld = getWorld(newWorldId);
    const message = newWorld ? `Entering ${newWorld.name}` : undefined;

    return {
      success: true,
      newWorldId,
      newPosition,
      message
    };
  }

  /**
   * Get world state manager
   */
  getWorldStateManager(): WorldStateManager {
    return this.worldStateManager;
  }

  /**
   * Check if a world is loaded
   */
  isWorldLoaded(worldId: string): boolean {
    return this.loadedWorlds.has(worldId);
  }

  /**
   * Get all loaded world IDs
   */
  getLoadedWorldIds(): string[] {
    return Array.from(this.loadedWorlds);
  }

  /**
   * Force transition to a specific world (for testing or special cases)
   */
  forceTransitionToWorld(worldId: string, position: Vec2): WorldTransition {
    if (!getWorld(worldId)) {
      return {
        success: false,
        newWorldId: this.currentWorldId,
        newPosition: position,
        message: `World ${worldId} not found`
      };
    }

    return this.initiateWorldTransition(worldId, position);
  }

  /**
   * Get time scale for current world
   */
  getCurrentTimeScale(): number {
    const currentWorld = this.getCurrentWorld();
    return currentWorld?.timeScale || 1.0; // Default to normal time speed
  }

  /**
   * Get world background color
   */
  getCurrentWorldBackgroundColor(): string {
    const currentWorld = this.getCurrentWorld();
    return currentWorld?.backgroundColor || '#34495e';
  }

  /**
   * Get world dimensions
   */
  getCurrentWorldDimensions(): { width: number; height: number } {
    const currentWorld = this.getCurrentWorld();
    return {
      width: currentWorld?.width || 1600,
      height: currentWorld?.height || 1200
    };
  }
}
