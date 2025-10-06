/**
 * Unit tests for world registry
 */

import { describe, it, expect } from 'vitest';
import { getWorld, getAllWorldIds, hasWorld, registerWorld } from '../../modules/worlds/worldRegistry';
import { createVec2 } from '../../modules/core';

describe('World Registry', () => {
  it('should have default worlds registered', () => {
    expect(hasWorld('camp')).toBe(true);
    expect(hasWorld('playa')).toBe(true);
    expect(hasWorld('danceStage')).toBe(true);
  });

  it('should get world configuration', () => {
    const campWorld = getWorld('camp');
    expect(campWorld).toBeDefined();
    expect(campWorld?.id).toBe('camp');
    expect(campWorld?.name).toBe('Camp');
    expect(campWorld?.timeScale).toBe(60); // 1 second = 1 minute
  });

  it('should get all world IDs', () => {
    const worldIds = getAllWorldIds();
    expect(worldIds).toContain('camp');
    expect(worldIds).toContain('playa');
    expect(worldIds).toContain('danceStage');
    expect(worldIds.length).toBeGreaterThanOrEqual(3);
  });

  it('should register a new world', () => {
    const testWorld = {
      id: 'testWorld',
      name: 'Test World',
      width: 800,
      height: 600,
      backgroundColor: '#ff0000',
      timeScale: 30,
      spawnPosition: createVec2(400, 300),
      boundaries: []
    };

    registerWorld(testWorld);
    expect(hasWorld('testWorld')).toBe(true);
    
    const retrievedWorld = getWorld('testWorld');
    expect(retrievedWorld?.id).toBe('testWorld');
    expect(retrievedWorld?.name).toBe('Test World');
  });

  it('should return undefined for non-existent world', () => {
    expect(getWorld('nonExistentWorld')).toBeUndefined();
    expect(hasWorld('nonExistentWorld')).toBe(false);
  });

  it('should have correct world configurations', () => {
    const campWorld = getWorld('camp');
    const playaWorld = getWorld('playa');
    const danceStageWorld = getWorld('danceStage');

    // Camp world
    expect(campWorld?.timeScale).toBe(60); // 1 second = 1 minute
    expect(campWorld?.backgroundColor).toBe('#2c5530'); // Dark green
    expect(campWorld?.boundaries).toHaveLength(4); // left, right, top, bottom boundaries
    expect(campWorld?.boundaries[0].side).toBe('left');
    expect(campWorld?.boundaries[0].exitWorldId).toBe('playa');

    // Playa world
    expect(playaWorld?.timeScale).toBe(3600); // 1 second = 1 hour
    expect(playaWorld?.backgroundColor).toBe('#8b7355'); // Desert tan
    expect(playaWorld?.boundaries).toHaveLength(3); // right, left, area boundaries

    // Dance stage world
    expect(danceStageWorld?.timeScale).toBe(30); // 1 second = 30 seconds
    expect(danceStageWorld?.backgroundColor).toBe('#1a1a2e'); // Dark purple/blue
    expect(danceStageWorld?.boundaries).toHaveLength(1);
  });
});
