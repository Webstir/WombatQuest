/**
 * Spatial index types and interfaces
 */

import type { Vec2 } from '../core';

export interface SpatialEntity {
  id: string;
  position: Vec2;
  radius: number;
}

export interface GridCell {
  entities: SpatialEntity[];
}

export interface SpatialIndex {
  cellSize: number;
  worldWidth: number;
  worldHeight: number;
  gridWidth: number;
  gridHeight: number;
  cells: GridCell[][];
}

export interface QueryResult {
  entities: SpatialEntity[];
  cellsQueried: number;
}

