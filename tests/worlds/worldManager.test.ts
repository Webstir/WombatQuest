/**
 * Unit tests for world manager
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorldManager } from '../../modules/worlds/worldManager';
import { WorldStateManager } from '../../modules/worlds/worldStateManager';
import { InMemoryStorage } from '../../shared/adapters';
import { createVec2 } from '../../modules/core';

describe('World Manager', () => {
  let worldManager: WorldManager;
  let worldStateManager: WorldStateManager;
  let storage: InMemoryStorage;

  beforeEach(() => {
    storage = new InMemoryStorage();
    worldStateManager = new WorldStateManager(storage);
    worldManager = new WorldManager('camp', worldStateManager);
  });

  it('should initialize with correct world', () => {
    expect(worldManager.getCurrentWorldId()).toBe('camp');
    expect(worldManager.getCurrentWorld()?.id).toBe('camp');
  });

  it('should get current world configuration', () => {
    const currentWorld = worldManager.getCurrentWorld();
    expect(currentWorld).toBeDefined();
    expect(currentWorld?.id).toBe('camp');
    expect(currentWorld?.name).toBe('Camp');
  });

  it('should get current time scale', () => {
    expect(worldManager.getCurrentTimeScale()).toBe(60); // Camp time scale
  });

  it('should get current world background color', () => {
    expect(worldManager.getCurrentWorldBackgroundColor()).toBe('#2c5530');
  });

  it('should get current world dimensions', () => {
    const dimensions = worldManager.getCurrentWorldDimensions();
    expect(dimensions.width).toBe(1600);
    expect(dimensions.height).toBe(1200);
  });

  it('should check world transition when near boundary', () => {
    // Position near left boundary of camp (should transition to playa)
    const playerPosition = createVec2(10, 600); // Very close to left edge
    const playerSize = 32;

    const transition = worldManager.checkWorldTransition(playerPosition, playerSize);
    
    expect(transition).toBeDefined();
    expect(transition?.success).toBe(true);
    expect(transition?.newWorldId).toBe('playa');
    // With relative positioning, exiting left should appear on the left side of the target
    // For Playa, use smaller offset (150) to stay closer to camp area
    expect(transition?.newPosition.x).toBe(650); // 800 (base) - 150 (offset) = 650
    expect(transition?.newPosition.y).toBe(1200);
  });

  it('should not transition when not near boundary', () => {
    // Position in center of camp
    const playerPosition = createVec2(800, 600);
    const playerSize = 32;

    const transition = worldManager.checkWorldTransition(playerPosition, playerSize);
    
    expect(transition).toBeNull();
  });

  it('should position correctly when returning to camp from playa', () => {
    // First, exit camp to the left (this sets originalExitDirection to 'left')
    const exitPosition = createVec2(10, 600);
    const exitTransition = worldManager.checkWorldTransition(exitPosition, 32);
    expect(exitTransition?.success).toBe(true);
    expect(exitTransition?.newWorldId).toBe('playa');
    
    // Now simulate being in the playa camp area and returning to camp
    // The originalExitDirection should be 'left', so we should appear on the left side of camp
    const returnPosition = createVec2(800, 1200); // In the playa camp area
    const returnTransition = worldManager.checkWorldTransition(returnPosition, 32);
    
    expect(returnTransition).toBeDefined();
    expect(returnTransition?.success).toBe(true);
    expect(returnTransition?.newWorldId).toBe('camp');
    // Since we originally exited left, we should appear on the left side of camp
    expect(returnTransition?.newPosition.x).toBe(400); // 800 (base) - 400 (offset) = 400
    expect(returnTransition?.newPosition.y).toBe(600);
  });

  it('should force transition to specific world', () => {
    const newPosition = createVec2(100, 100);
    const transition = worldManager.forceTransitionToWorld('playa', newPosition);
    
    expect(transition.success).toBe(true);
    expect(transition.newWorldId).toBe('playa');
    expect(worldManager.getCurrentWorldId()).toBe('playa');
  });

  it('should handle invalid world transition', () => {
    const newPosition = createVec2(100, 100);
    const transition = worldManager.forceTransitionToWorld('invalidWorld', newPosition);
    
    expect(transition.success).toBe(false);
    expect(transition.newWorldId).toBe('camp'); // Should stay in current world
    expect(transition.message).toContain('not found');
  });

  it('should track loaded worlds', () => {
    expect(worldManager.isWorldLoaded('camp')).toBe(true);
    expect(worldManager.isWorldLoaded('playa')).toBe(false);
    
    const loadedWorlds = worldManager.getLoadedWorldIds();
    expect(loadedWorlds).toContain('camp');
  });

  it('should get world state manager', () => {
    const stateManager = worldManager.getWorldStateManager();
    expect(stateManager).toBe(worldStateManager);
  });

  it('should get manager state', () => {
    const state = worldManager.getState();
    expect(state.currentWorldId).toBe('camp');
    expect(state.loadedWorlds.has('camp')).toBe(true);
    expect(state.transitionInProgress).toBe(false);
  });
});
