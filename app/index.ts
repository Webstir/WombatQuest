/**
 * Application boot and wiring
 */

import { GameLoop, type GameConfig } from './GameLoop';
import { BrowserClock, SeededRng, LocalStorage, WebAudio } from '../shared/adapters';
import type { Clock, Rng, Storage, AudioPort } from '../shared/ports';
import type { GameState } from '../modules/core';
import { WorldManager, WorldStateManager } from '../modules/worlds';

export interface AppConfig {
  canvasWidth?: number;
  canvasHeight?: number;
  playerSize?: number;
  seed?: number;
  coinCount?: number;
}

export class App {
  private gameLoop: GameLoop | null = null;
  private clock: Clock;
  private rng: Rng;
  private storage: Storage;
  private audio: AudioPort;
  private worldManager: WorldManager;

  constructor(config: AppConfig = {}) {
    this.clock = new BrowserClock();
    this.rng = new SeededRng(config.seed);
    this.storage = new LocalStorage();
    this.audio = new WebAudio();
    
    // Initialize world management
    const worldStateManager = new WorldStateManager(this.storage);
    this.worldManager = new WorldManager('camp', worldStateManager);

    const gameConfig: GameConfig = {
      canvasWidth: config.canvasWidth ?? 800,
      canvasHeight: config.canvasHeight ?? 600,
      playerSize: config.playerSize ?? 32,
      seed: this.rng.getSeed(),
      coinCount: config.coinCount ?? 10,
    };

    this.initializeGame(gameConfig);
  }

  private initializeGame(config: GameConfig): void {
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (!canvas) {
      throw new Error('Canvas element with id "gameCanvas" not found');
    }

    this.gameLoop = new GameLoop(canvas, this.clock, this.rng, this.audio, this.worldManager, config);
  }

  /**
   * Start the application
   */
  async start(): Promise<void> {
    if (!this.gameLoop) {
      throw new Error('Game loop not initialized');
    }
    
    try {
      // Initialize audio
      await this.audio.preloadGameSounds();
      console.log('Audio system initialized successfully');
    } catch (error) {
      console.warn('Audio initialization failed, continuing without audio:', error);
    }
    
    this.gameLoop.start();
  }

  /**
   * Stop the application
   */
  stop(): void {
    if (this.gameLoop) {
      this.gameLoop.stop();
    }
  }

  /**
   * Reset the game
   */
  reset(): void {
    if (this.gameLoop) {
      this.gameLoop.reset();
    }
  }

  /**
   * Get the RNG instance
   */
  getRng(): Rng {
    return this.rng;
  }

  /**
   * Get the clock instance
   */
  getClock(): Clock {
    return this.clock;
  }

  /**
   * Get the audio instance
   */
  getAudio(): AudioPort {
    return this.audio;
  }

  /**
   * Get the world manager instance
   */
  getWorldManager(): WorldManager {
    return this.worldManager;
  }

  /**
   * Get the game loop instance
   */
  getGameLoop(): GameLoop {
    if (!this.gameLoop) {
      throw new Error('Game loop not initialized');
    }
    return this.gameLoop;
  }

  /**
   * Save current game state
   */
  async saveGame(saveName: string = 'autosave'): Promise<void> {
    if (!this.gameLoop) {
      throw new Error('Game loop not initialized');
    }

    const gameState = this.gameLoop.getGameState();
    const saveData = {
      gameState,
      timestamp: Date.now(),
      version: '1.0.0',
    };

    await this.storage.save(saveName, saveData);
  }

  /**
   * Load saved game state
   */
  async loadGame(saveName: string = 'autosave'): Promise<boolean> {
    if (!this.gameLoop) {
      throw new Error('Game loop not initialized');
    }

    try {
      const saveData = await this.storage.load<{
        gameState: GameState;
        timestamp: number;
        version: string;
      }>(saveName);

      if (!saveData) {
        return false; // No save data found
      }

      // Restore the game state
      this.gameLoop.loadGameState(saveData.gameState);
      return true;
    } catch (error) {
      console.error('Failed to load game:', error);
      return false;
    }
  }

  /**
   * Check if a save exists
   */
  async hasSave(saveName: string = 'autosave'): Promise<boolean> {
    return await this.storage.exists(saveName);
  }

  /**
   * Get the storage instance
   */
  getStorage(): Storage {
    return this.storage;
  }
}
