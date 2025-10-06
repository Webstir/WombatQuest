/**
 * Unit tests for camera system
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
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
} from '../../modules/camera';
import { createVec2 } from '../../modules/core';

describe('CameraSystem', () => {
  let camera: ReturnType<typeof createCamera>;

  beforeEach(() => {
    camera = createCamera({
      viewportWidth: 800,
      viewportHeight: 600,
      zoom: 1.0,
      followSpeed: 5.0,
      worldBounds: {
        minX: 0,
        minY: 0,
        maxX: 1600,
        maxY: 1200,
      },
    });
  });

  describe('createCamera', () => {
    it('should create a camera with correct initial values', () => {
      expect(camera.position).toEqual(createVec2(0, 0));
      expect(camera.zoom).toBe(1.0);
      expect(camera.viewport.width).toBe(800);
      expect(camera.viewport.height).toBe(600);
      expect(camera.worldBounds).toEqual({
        minX: 0,
        minY: 0,
        maxX: 1600,
        maxY: 1200,
      });
    });
  });

  describe('updateViewport', () => {
    it('should update viewport based on camera position', () => {
      camera.position = createVec2(400, 300);
      updateViewport(camera);
      
      expect(camera.viewport.x).toBe(0); // 400 - 400
      expect(camera.viewport.y).toBe(0); // 300 - 300
    });

    it('should update viewport with zoom', () => {
      camera.position = createVec2(400, 300);
      camera.zoom = 2.0;
      updateViewport(camera);
      
      expect(camera.viewport.x).toBe(0);
      expect(camera.viewport.y).toBe(0);
    });
  });

  describe('worldToScreen', () => {
    it('should transform world coordinates to screen coordinates', () => {
      camera.position = createVec2(400, 300);
      updateViewport(camera);
      
      const worldPos = createVec2(500, 400);
      const screenPos = worldToScreen(worldPos, camera);
      
      // Camera at (400, 300) with viewport 800x600 means viewport is at (0, 0) to (800, 600)
      // World pos (500, 400) should map to screen pos (500, 400) since viewport starts at (0, 0)
      expect(screenPos.x).toBe(500); // (500 - 0) * 1.0
      expect(screenPos.y).toBe(400); // (400 - 0) * 1.0
    });

    it('should apply zoom to screen coordinates', () => {
      camera.position = createVec2(400, 300);
      camera.zoom = 2.0;
      updateViewport(camera);
      
      const worldPos = createVec2(500, 400);
      const screenPos = worldToScreen(worldPos, camera);
      
      expect(screenPos.x).toBe(1000); // (500 - 0) * 2.0
      expect(screenPos.y).toBe(800); // (400 - 0) * 2.0
    });
  });

  describe('screenToWorld', () => {
    it('should transform screen coordinates to world coordinates', () => {
      camera.position = createVec2(400, 300);
      updateViewport(camera);
      
      const screenPos = createVec2(100, 100);
      const worldPos = screenToWorld(screenPos, camera);
      
      expect(worldPos.x).toBe(100); // 100 / 1.0 + 0
      expect(worldPos.y).toBe(100); // 100 / 1.0 + 0
    });

    it('should apply zoom to world coordinates', () => {
      camera.position = createVec2(400, 300);
      camera.zoom = 2.0;
      updateViewport(camera);
      
      const screenPos = createVec2(200, 200);
      const worldPos = screenToWorld(screenPos, camera);
      
      expect(worldPos.x).toBe(100); // 200 / 2.0 + 0
      expect(worldPos.y).toBe(100); // 200 / 2.0 + 0
    });
  });

  describe('isWorldPositionVisible', () => {
    beforeEach(() => {
      camera.position = createVec2(400, 300);
      updateViewport(camera);
    });

    it('should return true for positions within viewport', () => {
      const worldPos = createVec2(400, 300);
      expect(isWorldPositionVisible(worldPos, camera)).toBe(true);
    });

    it('should return false for positions outside viewport', () => {
      const worldPos = createVec2(1000, 1000);
      expect(isWorldPositionVisible(worldPos, camera)).toBe(false);
    });

    it('should respect margin parameter', () => {
      const worldPos = createVec2(850, 300); // Just outside viewport
      expect(isWorldPositionVisible(worldPos, camera, 100)).toBe(true);
    });
  });

  describe('isWorldRectVisible', () => {
    beforeEach(() => {
      camera.position = createVec2(400, 300);
      updateViewport(camera);
    });

    it('should return true for rectangles within viewport', () => {
      expect(isWorldRectVisible(400, 300, 100, 100, camera)).toBe(true);
    });

    it('should return false for rectangles outside viewport', () => {
      expect(isWorldRectVisible(1000, 1000, 100, 100, camera)).toBe(false);
    });

    it('should return true for partially visible rectangles', () => {
      expect(isWorldRectVisible(750, 300, 100, 100, camera)).toBe(true);
    });
  });

  describe('setCameraPosition', () => {
    it('should set camera position within world bounds', () => {
      setCameraPosition(camera, createVec2(800, 600));
      
      expect(camera.position.x).toBe(800);
      expect(camera.position.y).toBe(600);
    });

    it('should clamp camera position to world bounds', () => {
      setCameraPosition(camera, createVec2(-100, -100));
      
      // Should be clamped to minimum bounds + half viewport
      expect(camera.position.x).toBe(400); // 0 + 400
      expect(camera.position.y).toBe(300); // 0 + 300
    });

    it('should update viewport after setting position', () => {
      setCameraPosition(camera, createVec2(800, 600));
      
      expect(camera.viewport.x).toBe(400); // 800 - 400
      expect(camera.viewport.y).toBe(300); // 600 - 300
    });
  });

  describe('followTarget', () => {
    it('should smoothly follow target position', () => {
      const targetPos = createVec2(800, 600);
      const deltaTime = 0.1; // 100ms
      
      followTarget(camera, targetPos, deltaTime, 5.0);
      
      // Should move towards target but not reach it in one frame
      expect(camera.position.x).toBeGreaterThan(0);
      expect(camera.position.x).toBeLessThan(800);
      expect(camera.position.y).toBeGreaterThan(0);
      expect(camera.position.y).toBeLessThan(600);
    });

    it('should snap to target when close enough', () => {
      camera.position = createVec2(799.5, 599.5);
      const targetPos = createVec2(800, 600);
      
      followTarget(camera, targetPos, 0.1, 5.0);
      
      expect(camera.position.x).toBeCloseTo(800, 1);
      expect(camera.position.y).toBeCloseTo(600, 1);
    });
  });

  describe('setCameraZoom', () => {
    it('should set zoom within bounds', () => {
      setCameraZoom(camera, 2.0);
      expect(camera.zoom).toBe(2.0);
    });

    it('should clamp zoom to minimum and maximum', () => {
      setCameraZoom(camera, 0.05, 0.1, 5.0);
      expect(camera.zoom).toBe(0.1);
      
      setCameraZoom(camera, 10.0, 0.1, 5.0);
      expect(camera.zoom).toBe(5.0);
    });

    it('should update viewport after setting zoom', () => {
      camera.position = createVec2(400, 300);
      setCameraZoom(camera, 2.0);
      
      expect(camera.viewport.x).toBe(0);
      expect(camera.viewport.y).toBe(0);
    });
  });

  describe('getVisibleWorldBounds', () => {
    it('should return correct visible world bounds', () => {
      camera.position = createVec2(400, 300);
      updateViewport(camera);
      
      const bounds = getVisibleWorldBounds(camera);
      
      expect(bounds.minX).toBe(0);
      expect(bounds.minY).toBe(0);
      expect(bounds.maxX).toBe(800);
      expect(bounds.maxY).toBe(600);
    });
  });

  describe('centerOnPosition', () => {
    it('should center camera on world position', () => {
      centerOnPosition(camera, createVec2(800, 600));
      
      expect(camera.position.x).toBe(800);
      expect(camera.position.y).toBe(600);
    });
  });

  describe('fitToWorldRect', () => {
    it('should fit camera to world rectangle', () => {
      fitToWorldRect(camera, 0, 0, 400, 300, 50);
      
      // Should center on rectangle and adjust zoom
      // The rectangle is 400x300, so center would be at (200, 150)
      // But camera is clamped to world bounds, so it stays at (400, 300)
      expect(camera.position.x).toBe(400); // Clamped to minimum bounds
      expect(camera.position.y).toBe(300); // Clamped to minimum bounds
      expect(camera.zoom).toBeLessThanOrEqual(1.0); // Should zoom out to fit or stay same
    });
  });
});
