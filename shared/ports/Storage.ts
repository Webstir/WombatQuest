/**
 * Storage port - provides persistent storage functionality
 */

export interface Storage {
  /**
   * Save data with a key
   */
  save(key: string, data: any): Promise<void>;

  /**
   * Load data by key
   */
  load<T>(key: string): Promise<T | null>;

  /**
   * Remove data by key
   */
  remove(key: string): Promise<void>;

  /**
   * Check if a key exists
   */
  exists(key: string): Promise<boolean>;

  /**
   * Get all keys
   */
  keys(): Promise<string[]>;
}

