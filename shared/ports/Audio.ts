/**
 * Audio port interface for sound management
 */

export interface AudioPort {
  /**
   * Load a sound file
   */
  loadSound(id: string, url: string): Promise<void>;

  /**
   * Play a sound by ID
   */
  playSound(id: string, volume?: number): void;

  /**
   * Stop a sound by ID
   */
  stopSound(id: string): void;

  /**
   * Set master volume (0.0 to 1.0)
   */
  setMasterVolume(volume: number): void;

  /**
   * Get master volume
   */
  getMasterVolume(): number;

  /**
   * Mute/unmute all audio
   */
  setMuted(muted: boolean): void;

  /**
   * Check if audio is muted
   */
  isMuted(): boolean;

  /**
   * Preload all game sounds
   */
  preloadGameSounds(): Promise<void>;
}

/**
 * Sound effect types for the game
 */
export type SoundEffect = 
  | 'coinPickup'
  | 'playerMove'
  | 'playerRest'
  | 'buttonClick'
  | 'gameStart'
  | 'gameOver';

