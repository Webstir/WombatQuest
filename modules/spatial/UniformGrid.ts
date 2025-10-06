/**
 * Uniform grid spatial index implementation
 */

import type { Vec2 } from '../core';
import type { SpatialEntity, SpatialIndex, GridCell, QueryResult } from './types';

/**
 * Create a new spatial index with uniform grid
 */
export function createSpatialIndex(
  worldWidth: number,
  worldHeight: number,
  cellSize: number = 100
): SpatialIndex {
  const gridWidth = Math.ceil(worldWidth / cellSize);
  const gridHeight = Math.ceil(worldHeight / cellSize);
  
  const cells: GridCell[][] = [];
  for (let x = 0; x < gridWidth; x++) {
    cells[x] = [];
    for (let y = 0; y < gridHeight; y++) {
      cells[x][y] = { entities: [] };
    }
  }

  return {
    cellSize,
    worldWidth,
    worldHeight,
    gridWidth,
    gridHeight,
    cells,
  };
}

/**
 * Get grid coordinates from world position
 */
export function worldToGrid(
  position: Vec2,
  cellSize: number
): { x: number; y: number } {
  return {
    x: Math.floor(position.x / cellSize),
    y: Math.floor(position.y / cellSize),
  };
}

/**
 * Check if grid coordinates are valid
 */
export function isValidGridCell(
  gridX: number,
  gridY: number,
  gridWidth: number,
  gridHeight: number
): boolean {
  return gridX >= 0 && gridX < gridWidth && gridY >= 0 && gridY < gridHeight;
}

/**
 * Add an entity to the spatial index
 */
export function addEntity(
  index: SpatialIndex,
  entity: SpatialEntity
): void {
  const gridPos = worldToGrid(entity.position, index.cellSize);
  
  if (isValidGridCell(gridPos.x, gridPos.y, index.gridWidth, index.gridHeight)) {
    index.cells[gridPos.x][gridPos.y].entities.push(entity);
  }
}

/**
 * Remove an entity from the spatial index
 */
export function removeEntity(
  index: SpatialIndex,
  entityId: string
): void {
  for (let x = 0; x < index.gridWidth; x++) {
    for (let y = 0; y < index.gridHeight; y++) {
      const cell = index.cells[x][y];
      const entityIndex = cell.entities.findIndex(e => e.id === entityId);
      if (entityIndex !== -1) {
        cell.entities.splice(entityIndex, 1);
        return;
      }
    }
  }
}

/**
 * Update an entity's position in the spatial index
 */
export function updateEntity(
  index: SpatialIndex,
  entityId: string,
  newPosition: Vec2
): void {
  // Find and remove the entity
  let entity: SpatialEntity | null = null;
  for (let x = 0; x < index.gridWidth; x++) {
    for (let y = 0; y < index.gridHeight; y++) {
      const cell = index.cells[x][y];
      const entityIndex = cell.entities.findIndex(e => e.id === entityId);
      if (entityIndex !== -1) {
        entity = cell.entities[entityIndex];
        cell.entities.splice(entityIndex, 1);
        break;
      }
    }
    if (entity) break;
  }

  // Add it back with new position
  if (entity) {
    entity.position = newPosition;
    addEntity(index, entity);
  }
}

/**
 * Query entities within a radius of a position
 */
export function queryRadius(
  index: SpatialIndex,
  center: Vec2,
  radius: number
): QueryResult {
  const entities: SpatialEntity[] = [];
  let cellsQueried = 0;

  // Calculate which cells to check
  const minGridX = Math.max(0, Math.floor((center.x - radius) / index.cellSize));
  const maxGridX = Math.min(index.gridWidth - 1, Math.floor((center.x + radius) / index.cellSize));
  const minGridY = Math.max(0, Math.floor((center.y - radius) / index.cellSize));
  const maxGridY = Math.min(index.gridHeight - 1, Math.floor((center.y + radius) / index.cellSize));

  for (let x = minGridX; x <= maxGridX; x++) {
    for (let y = minGridY; y <= maxGridY; y++) {
      cellsQueried++;
      const cell = index.cells[x][y];
      
      for (const entity of cell.entities) {
        const dx = entity.position.x - center.x;
        const dy = entity.position.y - center.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= radius) {
          entities.push(entity);
        }
      }
    }
  }

  return { entities, cellsQueried };
}

/**
 * Query entities within a rectangular area
 */
export function queryRect(
  index: SpatialIndex,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
): QueryResult {
  const entities: SpatialEntity[] = [];
  let cellsQueried = 0;

  const minGridX = Math.max(0, Math.floor(minX / index.cellSize));
  const maxGridX = Math.min(index.gridWidth - 1, Math.floor(maxX / index.cellSize));
  const minGridY = Math.max(0, Math.floor(minY / index.cellSize));
  const maxGridY = Math.min(index.gridHeight - 1, Math.floor(maxY / index.cellSize));

  for (let x = minGridX; x <= maxGridX; x++) {
    for (let y = minGridY; y <= maxGridY; y++) {
      cellsQueried++;
      const cell = index.cells[x][y];
      
      for (const entity of cell.entities) {
        if (entity.position.x >= minX && entity.position.x <= maxX &&
            entity.position.y >= minY && entity.position.y <= maxY) {
          entities.push(entity);
        }
      }
    }
  }

  return { entities, cellsQueried };
}

/**
 * Clear all entities from the spatial index
 */
export function clearIndex(index: SpatialIndex): void {
  for (let x = 0; x < index.gridWidth; x++) {
    for (let y = 0; y < index.gridHeight; y++) {
      index.cells[x][y].entities = [];
    }
  }
}

/**
 * Get total entity count across all cells
 */
export function getEntityCount(index: SpatialIndex): number {
  let count = 0;
  for (let x = 0; x < index.gridWidth; x++) {
    for (let y = 0; y < index.gridHeight; y++) {
      count += index.cells[x][y].entities.length;
    }
  }
  return count;
}

