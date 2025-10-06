/**
 * Camera system implementation
 */

import type { Vec2 } from '../core';
import { createVec2 } from '../core';
import type { Camera, CameraConfig } from './types';

/**
 * Create a new camera
 */
export function createCamera(config: CameraConfig): Camera {
  const camera = {
    position: createVec2(0, 0),
    zoom: config.zoom,
    viewport: {
      x: 0,
      y: 0,
      width: config.viewportWidth,
      height: config.viewportHeight,
    },
    followSpeed: config.followSpeed,
    worldBounds: config.worldBounds,
  };
  
  updateViewport(camera);
  return camera;
}

/**
 * Update camera viewport based on position and zoom
 */
export function updateViewport(camera: Camera): void {
  const halfWidth = camera.viewport.width / 2;
  const halfHeight = camera.viewport.height / 2;
  
  camera.viewport.x = camera.position.x - halfWidth;
  camera.viewport.y = camera.position.y - halfHeight;
}

/**
 * Transform world coordinates to screen coordinates
 */
export function worldToScreen(worldPos: Vec2, camera: Camera): Vec2 {
  const screenX = (worldPos.x - camera.viewport.x) * camera.zoom;
  const screenY = (worldPos.y - camera.viewport.y) * camera.zoom;
  return createVec2(screenX, screenY);
}

/**
 * Transform screen coordinates to world coordinates
 */
export function screenToWorld(screenPos: Vec2, camera: Camera): Vec2 {
  const worldX = screenPos.x / camera.zoom + camera.viewport.x;
  const worldY = screenPos.y / camera.zoom + camera.viewport.y;
  return createVec2(worldX, worldY);
}

/**
 * Check if a world position is visible in the camera viewport
 */
export function isWorldPositionVisible(worldPos: Vec2, camera: Camera, margin: number = 0): boolean {
  const minX = camera.viewport.x - margin;
  const maxX = camera.viewport.x + camera.viewport.width + margin;
  const minY = camera.viewport.y - margin;
  const maxY = camera.viewport.y + camera.viewport.height + margin;
  
  return worldPos.x >= minX && worldPos.x <= maxX &&
         worldPos.y >= minY && worldPos.y <= maxY;
}

/**
 * Check if a world rectangle is visible in the camera viewport
 */
export function isWorldRectVisible(
  worldX: number,
  worldY: number,
  worldWidth: number,
  worldHeight: number,
  camera: Camera,
  margin: number = 0
): boolean {
  const minX = camera.viewport.x - margin;
  const maxX = camera.viewport.x + camera.viewport.width + margin;
  const minY = camera.viewport.y - margin;
  const maxY = camera.viewport.y + camera.viewport.height + margin;
  
  return !(worldX + worldWidth < minX || worldX > maxX ||
           worldY + worldHeight < minY || worldY > maxY);
}

/**
 * Set camera position with bounds clamping
 */
export function setCameraPosition(camera: Camera, position: Vec2): void {
  let newX = position.x;
  let newY = position.y;
  
  if (camera.worldBounds) {
    const halfWidth = camera.viewport.width / 2;
    const halfHeight = camera.viewport.height / 2;
    
    newX = Math.max(
      camera.worldBounds.minX + halfWidth,
      Math.min(camera.worldBounds.maxX - halfWidth, newX)
    );
    newY = Math.max(
      camera.worldBounds.minY + halfHeight,
      Math.min(camera.worldBounds.maxY - halfHeight, newY)
    );
  }
  
  camera.position = createVec2(newX, newY);
  updateViewport(camera);
}

/**
 * Follow a target position with smooth interpolation
 */
export function followTarget(
  camera: Camera,
  targetPosition: Vec2,
  deltaTime: number,
  followSpeed: number
): void {
  const currentPos = camera.position;
  const targetPos = targetPosition;
  
  // Calculate distance to target
  const dx = targetPos.x - currentPos.x;
  const dy = targetPos.y - currentPos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // If we're close enough, snap to target
  if (distance < 1) {
    setCameraPosition(camera, targetPos);
    return;
  }
  
  // Interpolate towards target
  const moveDistance = followSpeed * deltaTime;
  const moveRatio = Math.min(moveDistance / distance, 1);
  
  const newX = currentPos.x + dx * moveRatio;
  const newY = currentPos.y + dy * moveRatio;
  
  setCameraPosition(camera, createVec2(newX, newY));
}

/**
 * Set camera zoom with bounds checking
 */
export function setCameraZoom(camera: Camera, zoom: number, minZoom: number = 0.1, maxZoom: number = 5): void {
  camera.zoom = Math.max(minZoom, Math.min(maxZoom, zoom));
  updateViewport(camera);
}

/**
 * Get the world bounds visible in the camera viewport
 */
export function getVisibleWorldBounds(camera: Camera): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  return {
    minX: camera.viewport.x,
    minY: camera.viewport.y,
    maxX: camera.viewport.x + camera.viewport.width,
    maxY: camera.viewport.y + camera.viewport.height,
  };
}

/**
 * Center camera on a world position
 */
export function centerOnPosition(camera: Camera, worldPosition: Vec2): void {
  setCameraPosition(camera, worldPosition);
}

/**
 * Fit camera to show a world rectangle
 */
export function fitToWorldRect(
  camera: Camera,
  worldX: number,
  worldY: number,
  worldWidth: number,
  worldHeight: number,
  padding: number = 50
): void {
  const centerX = worldX + worldWidth / 2;
  const centerY = worldY + worldHeight / 2;
  
  // Calculate required zoom to fit the rectangle
  const scaleX = (camera.viewport.width - padding * 2) / worldWidth;
  const scaleY = (camera.viewport.height - padding * 2) / worldHeight;
  const newZoom = Math.min(scaleX, scaleY, camera.zoom); // Don't zoom in more than current
  
  setCameraZoom(camera, newZoom);
  setCameraPosition(camera, createVec2(centerX, centerY));
}
