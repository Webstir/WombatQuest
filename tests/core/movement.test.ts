/**
 * Unit tests for core movement logic
 */

import { describe, it, expect } from 'vitest';
import {
  createVec2,
  addVec2,
  scaleVec2,
  getDirectionVector,
  calculateMovement,
  clampToBounds,
} from '../../modules/core';

describe('Movement Logic', () => {
  describe('createVec2', () => {
    it('should create a Vec2 with given coordinates', () => {
      const vec = createVec2(10, 20);
      expect(vec).toEqual({ x: 10, y: 20 });
    });
  });

  describe('addVec2', () => {
    it('should add two Vec2s correctly', () => {
      const a = createVec2(10, 20);
      const b = createVec2(5, 15);
      const result = addVec2(a, b);
      expect(result).toEqual({ x: 15, y: 35 });
    });
  });

  describe('scaleVec2', () => {
    it('should scale a Vec2 by a scalar', () => {
      const vec = createVec2(10, 20);
      const result = scaleVec2(vec, 2);
      expect(result).toEqual({ x: 20, y: 40 });
    });

    it('should handle negative scaling', () => {
      const vec = createVec2(10, 20);
      const result = scaleVec2(vec, -0.5);
      expect(result).toEqual({ x: -5, y: -10 });
    });
  });

  describe('getDirectionVector', () => {
    it('should return correct vectors for each direction', () => {
      expect(getDirectionVector('up')).toEqual({ x: 0, y: -1 });
      expect(getDirectionVector('down')).toEqual({ x: 0, y: 1 });
      expect(getDirectionVector('left')).toEqual({ x: -1, y: 0 });
      expect(getDirectionVector('right')).toEqual({ x: 1, y: 0 });
    });
  });

  describe('calculateMovement', () => {
    it('should calculate movement correctly for 1 second', () => {
      const startPos = createVec2(100, 100);
      const input = { direction: 'right' as const, deltaTime: 1 };
      const result = calculateMovement(startPos, input);
      
      // Movement speed is 200 pixels per second
      expect(result.x).toBe(300); // 100 + 200
      expect(result.y).toBe(100);
    });

    it('should calculate movement correctly for 0.5 seconds', () => {
      const startPos = createVec2(100, 100);
      const input = { direction: 'up' as const, deltaTime: 0.5 };
      const result = calculateMovement(startPos, input);
      
      // Movement speed is 200 pixels per second, 0.5 seconds = 100 pixels
      expect(result.x).toBe(100);
      expect(result.y).toBe(0); // 100 - 100
    });

    it('should handle zero delta time', () => {
      const startPos = createVec2(100, 100);
      const input = { direction: 'left' as const, deltaTime: 0 };
      const result = calculateMovement(startPos, input);
      
      expect(result).toEqual(startPos);
    });
  });

  describe('clampToBounds', () => {
    const canvasWidth = 800;
    const canvasHeight = 600;
    const playerSize = 32;

    it('should not clamp position within bounds', () => {
      const position = createVec2(400, 300);
      const result = clampToBounds(position, canvasWidth, canvasHeight, playerSize);
      expect(result).toEqual(position);
    });

    it('should clamp position to left edge', () => {
      const position = createVec2(10, 300); // Too far left
      const result = clampToBounds(position, canvasWidth, canvasHeight, playerSize);
      expect(result.x).toBe(16); // playerSize / 2
      expect(result.y).toBe(300);
    });

    it('should clamp position to right edge', () => {
      const position = createVec2(790, 300); // Too far right
      const result = clampToBounds(position, canvasWidth, canvasHeight, playerSize);
      expect(result.x).toBe(784); // canvasWidth - playerSize / 2
      expect(result.y).toBe(300);
    });

    it('should clamp position to top edge', () => {
      const position = createVec2(400, 10); // Too far up
      const result = clampToBounds(position, canvasWidth, canvasHeight, playerSize);
      expect(result.x).toBe(400);
      expect(result.y).toBe(16); // playerSize / 2
    });

    it('should clamp position to bottom edge', () => {
      const position = createVec2(400, 590); // Too far down
      const result = clampToBounds(position, canvasWidth, canvasHeight, playerSize);
      expect(result.x).toBe(400);
      expect(result.y).toBe(584); // canvasHeight - playerSize / 2
    });

    it('should clamp position to corner', () => {
      const position = createVec2(10, 10); // Top-left corner
      const result = clampToBounds(position, canvasWidth, canvasHeight, playerSize);
      expect(result.x).toBe(16); // playerSize / 2
      expect(result.y).toBe(16); // playerSize / 2
    });
  });
});
