/**
 * Spatial index module - Efficient spatial queries and culling
 */

// Types
export type {
  SpatialEntity,
  GridCell,
  SpatialIndex,
  QueryResult,
} from './types';

// Uniform grid functions
export {
  createSpatialIndex,
  worldToGrid,
  isValidGridCell,
  addEntity,
  removeEntity,
  updateEntity,
  queryRadius,
  queryRect,
  clearIndex,
  getEntityCount,
} from './UniformGrid';

