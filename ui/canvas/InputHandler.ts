/**
 * Input handler for keyboard events
 */

import type { Direction } from '../../modules/core';

export interface InputState {
  keys: Set<string>;
  keyPressed: Set<string>; // Track keys that were just pressed this frame
  mouseX: number;
  mouseY: number;
  mouseClicked: boolean; // Track if mouse was clicked this frame
}

export class InputHandler {
  private inputState: InputState;

  constructor() {
    this.inputState = { keys: new Set(), keyPressed: new Set(), mouseX: 0, mouseY: 0, mouseClicked: false };
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    document.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      if (!this.inputState.keys.has(key)) {
        // Key was just pressed (not already held)
        this.inputState.keyPressed.add(key);
      }
      this.inputState.keys.add(key);
    });

    document.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      this.inputState.keys.delete(key);
      this.inputState.keyPressed.delete(key);
    });

    // Track mouse position
    document.addEventListener('mousemove', (e) => {
      this.inputState.mouseX = e.clientX;
      this.inputState.mouseY = e.clientY;
    });

    // Track mouse clicks
    document.addEventListener('mousedown', (e) => {
      this.inputState.mouseClicked = true;
    });
  }

  /**
   * Get current movement direction based on pressed keys
   */
  getMovementDirection(): Direction | null {
    const { keys } = this.inputState;

    // Prioritize diagonal movement
    if (keys.has('w') && keys.has('a')) return 'up';
    if (keys.has('w') && keys.has('d')) return 'up';
    if (keys.has('s') && keys.has('a')) return 'down';
    if (keys.has('s') && keys.has('d')) return 'down';

    // Single key movement
    if (keys.has('w') || keys.has('arrowup')) return 'up';
    if (keys.has('s') || keys.has('arrowdown')) return 'down';
    if (keys.has('a') || keys.has('arrowleft')) return 'left';
    if (keys.has('d') || keys.has('arrowright')) return 'right';

    return null;
  }

  /**
   * Check if a specific key is pressed
   */
  isKeyPressed(key: string): boolean {
    return this.inputState.keys.has(key.toLowerCase());
  }

  /**
   * Get all currently pressed keys
   */
  getPressedKeys(): string[] {
    return Array.from(this.inputState.keys);
  }

  /**
   * Check if rest key (E) was just pressed
   */
  isRestKeyPressed(): boolean {
    return this.inputState.keyPressed.has('r');
  }

  /** Gift key (G) */
  isGiftKeyPressed(): boolean {
    return this.inputState.keyPressed.has('g');
  }

  /** Totem toggle key (T) */
  isTotemTogglePressed(): boolean {
    return this.inputState.keyPressed.has('t');
  }

  /** Lights toggle key (L) */
  isLightsKeyPressed(): boolean {
    return this.inputState.keyPressed.has('l');
  }

  /**
   * Check if mute key (M) was just pressed
   */
  isMuteKeyPressed(): boolean {
    return this.inputState.keyPressed.has('m');
  }

  /**
   * Check if escape key (ESC) was just pressed
   */
  isEscapeKeyPressed(): boolean {
    return this.inputState.keyPressed.has('escape');
  }

  /**
   * Check if spacebar was just pressed
   */
  isSpaceKeyPressed(): boolean {
    return this.inputState.keyPressed.has(' ');
  }

  /**
   * Check if a specific key was just pressed
   */
  isKeyJustPressed(key: string): boolean {
    return this.inputState.keyPressed.has(key.toLowerCase());
  }

  /**
   * Check if any key was just pressed
   */
  isAnyKeyPressed(): boolean {
    return this.inputState.keyPressed.size > 0;
  }

  /**
   * Clear the keyPressed set - call this at the end of each frame
   */
  clearKeyPressed(): void {
    this.inputState.keyPressed.clear();
  }

  /**
   * Get current mouse position
   */
  getMousePosition(): { x: number; y: number } {
    return { x: this.inputState.mouseX, y: this.inputState.mouseY };
  }

  /**
   * Check if mouse was clicked this frame
   */
  isMouseClicked(): boolean {
    return this.inputState.mouseClicked;
  }

  /**
   * Clear the mouse clicked flag - call this at the end of each frame
   */
  clearMouseClicked(): void {
    this.inputState.mouseClicked = false;
  }
}
