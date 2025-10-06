/**
 * Camera system module - Viewport management and coordinate transforms
 */

// Types
export type {
  Viewport,
  Camera,
  CameraConfig,
} from './types';

// Camera system functions
export {
  createCamera,
  updateViewport,
  worldToScreen,
  screenToWorld,
  isWorldPositionVisible,
  isWorldRectVisible,
  setCameraPosition,
  followTarget,
  setCameraZoom,
  getVisibleWorldBounds,
  centerOnPosition,
  fitToWorldRect,
} from './CameraSystem';

