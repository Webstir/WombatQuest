/**
 * In-memory implementation of Storage port for testing
 */

import type { Storage } from '../ports/Storage';

export class InMemoryStorage implements Storage {
  private data: Map<string, any> = new Map();
  private prefix: string;

  constructor(prefix: string = 'wombat-quest-') {
    this.prefix = prefix;
  }

  private getKey(key: string): string {
    return this.prefix + key;
  }

  async save(key: string, data: any): Promise<void> {
    // Deep clone the data to avoid reference issues
    const cloned = JSON.parse(JSON.stringify(data));
    this.data.set(this.getKey(key), cloned);
  }

  async load<T>(key: string): Promise<T | null> {
    const data = this.data.get(this.getKey(key));
    if (data === undefined) {
      return null;
    }
    // Deep clone to avoid reference issues
    return JSON.parse(JSON.stringify(data)) as T;
  }

  async remove(key: string): Promise<void> {
    this.data.delete(this.getKey(key));
  }

  async exists(key: string): Promise<boolean> {
    return this.data.has(this.getKey(key));
  }

  async keys(): Promise<string[]> {
    const allKeys: string[] = [];
    for (const key of this.data.keys()) {
      if (key.startsWith(this.prefix)) {
        allKeys.push(key.substring(this.prefix.length));
      }
    }
    return allKeys;
  }

  /**
   * Clear all data (useful for testing)
   */
  clear(): void {
    this.data.clear();
  }

  /**
   * Get the number of stored items (useful for testing)
   */
  size(): number {
    return this.data.size;
  }
}

