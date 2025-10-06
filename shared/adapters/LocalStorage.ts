/**
 * Browser localStorage implementation of Storage port
 */

import type { Storage } from '../ports/Storage';

export class LocalStorage implements Storage {
  private prefix: string;

  constructor(prefix: string = 'wombat-quest-') {
    this.prefix = prefix;
  }

  private getKey(key: string): string {
    return this.prefix + key;
  }

  async save(key: string, data: any): Promise<void> {
    try {
      const serialized = JSON.stringify(data);
      localStorage.setItem(this.getKey(key), serialized);
    } catch (error) {
      throw new Error(`Failed to save data for key "${key}": ${error}`);
    }
  }

  async load<T>(key: string): Promise<T | null> {
    try {
      const serialized = localStorage.getItem(this.getKey(key));
      if (serialized === null) {
        return null;
      }
      return JSON.parse(serialized) as T;
    } catch (error) {
      throw new Error(`Failed to load data for key "${key}": ${error}`);
    }
  }

  async remove(key: string): Promise<void> {
    try {
      localStorage.removeItem(this.getKey(key));
    } catch (error) {
      throw new Error(`Failed to remove data for key "${key}": ${error}`);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      return localStorage.getItem(this.getKey(key)) !== null;
    } catch (error) {
      throw new Error(`Failed to check existence for key "${key}": ${error}`);
    }
  }

  async keys(): Promise<string[]> {
    try {
      const allKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          allKeys.push(key.substring(this.prefix.length));
        }
      }
      return allKeys;
    } catch (error) {
      throw new Error(`Failed to get keys: ${error}`);
    }
  }
}

