/**
 * Unit tests for InMemoryStorage
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryStorage } from '../../shared/adapters';

describe('InMemoryStorage', () => {
  let storage: InMemoryStorage;

  beforeEach(() => {
    storage = new InMemoryStorage('test-');
  });

  describe('save and load', () => {
    it('should save and load data correctly', async () => {
      const testData = { name: 'test', value: 42 };
      
      await storage.save('test-key', testData);
      const loaded = await storage.load('test-key');
      
      expect(loaded).toEqual(testData);
    });

    it('should return null for non-existent keys', async () => {
      const loaded = await storage.load('non-existent');
      expect(loaded).toBeNull();
    });

    it('should handle complex nested objects', async () => {
      const complexData = {
        player: {
          position: { x: 100, y: 200 },
          stats: { coins: 5, energy: 80, mood: 90 }
        },
        coins: [
          { id: '1', position: { x: 50, y: 50 }, value: 1, collected: false }
        ],
        seed: 12345
      };

      await storage.save('game-state', complexData);
      const loaded = await storage.load('game-state');
      
      expect(loaded).toEqual(complexData);
    });

    it('should deep clone data to avoid reference issues', async () => {
      const originalData = { value: 42 };
      
      await storage.save('test', originalData);
      const loaded = await storage.load('test') as { value: number };
      
      // Modify the loaded data
      loaded.value = 100;
      
      // Load again to ensure original wasn't modified
      const loadedAgain = await storage.load('test');
      expect(loadedAgain).toEqual({ value: 42 });
    });
  });

  describe('exists', () => {
    it('should return true for existing keys', async () => {
      await storage.save('test-key', { data: 'test' });
      expect(await storage.exists('test-key')).toBe(true);
    });

    it('should return false for non-existent keys', async () => {
      expect(await storage.exists('non-existent')).toBe(false);
    });
  });

  describe('remove', () => {
    it('should remove existing keys', async () => {
      await storage.save('test-key', { data: 'test' });
      expect(await storage.exists('test-key')).toBe(true);
      
      await storage.remove('test-key');
      expect(await storage.exists('test-key')).toBe(false);
    });

    it('should handle removing non-existent keys gracefully', async () => {
      await expect(storage.remove('non-existent')).resolves.not.toThrow();
    });
  });

  describe('keys', () => {
    it('should return all keys with correct prefix', async () => {
      await storage.save('key1', { data: 'test1' });
      await storage.save('key2', { data: 'test2' });
      
      const keys = await storage.keys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toHaveLength(2);
    });

    it('should return empty array when no keys exist', async () => {
      const keys = await storage.keys();
      expect(keys).toEqual([]);
    });
  });

  describe('clear and size', () => {
    it('should clear all data', async () => {
      await storage.save('key1', { data: 'test1' });
      await storage.save('key2', { data: 'test2' });
      
      expect(storage.size()).toBe(2);
      
      storage.clear();
      expect(storage.size()).toBe(0);
      expect(await storage.keys()).toEqual([]);
    });

    it('should track size correctly', async () => {
      expect(storage.size()).toBe(0);
      
      await storage.save('key1', { data: 'test1' });
      expect(storage.size()).toBe(1);
      
      await storage.save('key2', { data: 'test2' });
      expect(storage.size()).toBe(2);
      
      await storage.remove('key1');
      expect(storage.size()).toBe(1);
    });
  });

  describe('prefix handling', () => {
    it('should use custom prefix', async () => {
      const customStorage = new InMemoryStorage('custom-');
      
      await customStorage.save('test', { data: 'value' });
      expect(await customStorage.exists('test')).toBe(true);
      
      // Should not be visible in storage with different prefix
      expect(await storage.exists('test')).toBe(false);
    });
  });
});
