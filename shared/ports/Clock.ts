/**
 * Clock port - provides time-related functionality
 */

export interface Clock {
  /**
   * Get current time in milliseconds
   */
  now(): number;

  /**
   * Request animation frame callback
   */
  requestAnimationFrame(callback: (time: number) => void): number;

  /**
   * Cancel animation frame
   */
  cancelAnimationFrame(id: number): void;
}

