/**
 * Browser implementation of Clock port
 */

import type { Clock } from '../ports/Clock';

export class BrowserClock implements Clock {
  now(): number {
    return performance.now();
  }

  requestAnimationFrame(callback: (time: number) => void): number {
    return requestAnimationFrame(callback);
  }

  cancelAnimationFrame(id: number): void {
    cancelAnimationFrame(id);
  }
}

