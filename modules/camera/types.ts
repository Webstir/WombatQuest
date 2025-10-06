/**
 * Camera system types and interfaces
 */

import type { Vec2 } from '../core';

export interface Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Camera {
  position: Vec2;
  zoom: number;
  viewport: Viewport;
  followSpeed: number;
  worldBounds?: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
}

export interface CameraConfig {
  viewportWidth: number;
  viewportHeight: number;
  zoom: number;
  followSpeed: number;
  worldBounds?: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
}
