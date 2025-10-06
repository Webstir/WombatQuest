/**
 * Unit tests for spatial index uniform grid
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSpatialIndex,
  addEntity,
  removeEntity,
  updateEntity,
  queryRadius,
  queryRect,
  clearIndex,
  getEntityCount,
  worldToGrid,
  isValidGridCell,
} from '../../modules/spatial';
import { createVec2 } from '../../modules/core';

describe('UniformGrid', () => {
  let spatialIndex: ReturnType<typeof createSpatialIndex>;

  beforeEach(() => {
    spatialIndex = createSpatialIndex(800, 600, 100); // 8x6 grid
  });

  describe('createSpatialIndex', () => {
    it('should create a spatial index with correct dimensions', () => {
      expect(spatialIndex.cellSize).toBe(100);
      expect(spatialIndex.worldWidth).toBe(800);
      expect(spatialIndex.worldHeight).toBe(600);
      expect(spatialIndex.gridWidth).toBe(8);
      expect(spatialIndex.gridHeight).toBe(6);
      expect(spatialIndex.cells).toHaveLength(8);
      expect(spatialIndex.cells[0]).toHaveLength(6);
    });
  });

  describe('worldToGrid', () => {
    it('should convert world coordinates to grid coordinates', () => {
      expect(worldToGrid(createVec2(0, 0), 100)).toEqual({ x: 0, y: 0 });
      expect(worldToGrid(createVec2(50, 50), 100)).toEqual({ x: 0, y: 0 });
      expect(worldToGrid(createVec2(100, 100), 100)).toEqual({ x: 1, y: 1 });
      expect(worldToGrid(createVec2(150, 250), 100)).toEqual({ x: 1, y: 2 });
    });
  });

  describe('isValidGridCell', () => {
    it('should validate grid cell coordinates', () => {
      expect(isValidGridCell(0, 0, 8, 6)).toBe(true);
      expect(isValidGridCell(7, 5, 8, 6)).toBe(true);
      expect(isValidGridCell(-1, 0, 8, 6)).toBe(false);
      expect(isValidGridCell(0, -1, 8, 6)).toBe(false);
      expect(isValidGridCell(8, 0, 8, 6)).toBe(false);
      expect(isValidGridCell(0, 6, 8, 6)).toBe(false);
    });
  });

  describe('addEntity', () => {
    it('should add entity to correct grid cell', () => {
      const entity = {
        id: 'test-1',
        position: createVec2(50, 50),
        radius: 10,
      };

      addEntity(spatialIndex, entity);
      expect(spatialIndex.cells[0][0].entities).toHaveLength(1);
      expect(spatialIndex.cells[0][0].entities[0]).toBe(entity);
    });

    it('should not add entity outside world bounds', () => {
      const entity = {
        id: 'test-1',
        position: createVec2(900, 50),
        radius: 10,
      };

      addEntity(spatialIndex, entity);
      // Should not crash and entity should not be added
      expect(getEntityCount(spatialIndex)).toBe(0);
    });
  });

  describe('removeEntity', () => {
    it('should remove entity from spatial index', () => {
      const entity = {
        id: 'test-1',
        position: createVec2(50, 50),
        radius: 10,
      };

      addEntity(spatialIndex, entity);
      expect(getEntityCount(spatialIndex)).toBe(1);

      removeEntity(spatialIndex, 'test-1');
      expect(getEntityCount(spatialIndex)).toBe(0);
    });

    it('should handle removing non-existent entity', () => {
      removeEntity(spatialIndex, 'non-existent');
      expect(getEntityCount(spatialIndex)).toBe(0);
    });
  });

  describe('updateEntity', () => {
    it('should update entity position in spatial index', () => {
      const entity = {
        id: 'test-1',
        position: createVec2(50, 50),
        radius: 10,
      };

      addEntity(spatialIndex, entity);
      expect(spatialIndex.cells[0][0].entities).toHaveLength(1);

      updateEntity(spatialIndex, 'test-1', createVec2(150, 150));
      expect(spatialIndex.cells[0][0].entities).toHaveLength(0);
      expect(spatialIndex.cells[1][1].entities).toHaveLength(1);
      expect(spatialIndex.cells[1][1].entities[0].position).toEqual(createVec2(150, 150));
    });
  });

  describe('queryRadius', () => {
    beforeEach(() => {
      // Add entities in different grid cells
      addEntity(spatialIndex, {
        id: 'entity-1',
        position: createVec2(50, 50),
        radius: 10,
      });
      addEntity(spatialIndex, {
        id: 'entity-2',
        position: createVec2(150, 50),
        radius: 10,
      });
      addEntity(spatialIndex, {
        id: 'entity-3',
        position: createVec2(50, 150),
        radius: 10,
      });
      addEntity(spatialIndex, {
        id: 'entity-4',
        position: createVec2(400, 300),
        radius: 10,
      });
    });

    it('should find entities within radius', () => {
      const result = queryRadius(spatialIndex, createVec2(50, 50), 50);
      expect(result.entities).toHaveLength(1);
      expect(result.entities[0].id).toBe('entity-1');
    });

    it('should find multiple entities within larger radius', () => {
      const result = queryRadius(spatialIndex, createVec2(100, 100), 100);
      expect(result.entities).toHaveLength(3);
      expect(result.entities.map(e => e.id)).toContain('entity-1');
      expect(result.entities.map(e => e.id)).toContain('entity-2');
      expect(result.entities.map(e => e.id)).toContain('entity-3');
    });

    it('should return correct cells queried count', () => {
      const result = queryRadius(spatialIndex, createVec2(50, 50), 50);
      expect(result.cellsQueried).toBeGreaterThan(0);
    });
  });

  describe('queryRect', () => {
    beforeEach(() => {
      addEntity(spatialIndex, {
        id: 'entity-1',
        position: createVec2(50, 50),
        radius: 10,
      });
      addEntity(spatialIndex, {
        id: 'entity-2',
        position: createVec2(150, 50),
        radius: 10,
      });
      addEntity(spatialIndex, {
        id: 'entity-3',
        position: createVec2(400, 300),
        radius: 10,
      });
    });

    it('should find entities within rectangular area', () => {
      const result = queryRect(spatialIndex, 0, 0, 200, 100);
      expect(result.entities).toHaveLength(2);
      expect(result.entities.map(e => e.id)).toContain('entity-1');
      expect(result.entities.map(e => e.id)).toContain('entity-2');
    });

    it('should not find entities outside rectangular area', () => {
      const result = queryRect(spatialIndex, 0, 0, 100, 100);
      expect(result.entities).toHaveLength(1);
      expect(result.entities[0].id).toBe('entity-1');
    });
  });

  describe('clearIndex', () => {
    it('should clear all entities from spatial index', () => {
      addEntity(spatialIndex, {
        id: 'entity-1',
        position: createVec2(50, 50),
        radius: 10,
      });
      addEntity(spatialIndex, {
        id: 'entity-2',
        position: createVec2(150, 150),
        radius: 10,
      });

      expect(getEntityCount(spatialIndex)).toBe(2);
      clearIndex(spatialIndex);
      expect(getEntityCount(spatialIndex)).toBe(0);
    });
  });

  describe('getEntityCount', () => {
    it('should return correct entity count', () => {
      expect(getEntityCount(spatialIndex)).toBe(0);

      addEntity(spatialIndex, {
        id: 'entity-1',
        position: createVec2(50, 50),
        radius: 10,
      });
      expect(getEntityCount(spatialIndex)).toBe(1);

      addEntity(spatialIndex, {
        id: 'entity-2',
        position: createVec2(150, 150),
        radius: 10,
      });
      expect(getEntityCount(spatialIndex)).toBe(2);
    });
  });
});

