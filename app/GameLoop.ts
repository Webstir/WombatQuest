/**
 * Main game loop and state management
 */

import type { GameState, MovementInput } from '../modules/core';
import type { Clock, Rng, AudioPort } from '../shared/ports';
import type { SpatialIndex } from '../modules/spatial';
import type { Camera } from '../modules/camera';
import type { WorldManager } from '../modules/worlds';
import { getWorldLandmarks, getSpawnMultiplier } from '../modules/worlds';
import { calculateMovement, clampToBounds, createVec2, playerOverlapsCoin, playerOverlapsCollectible, applyStatEffect, calculateNaturalEffects, distance, updateDrugEffects, calculateTimeScale, calculateEffectiveSpeed, createEmptyInventory, useItem, ITEM_DEFINITIONS, addItemToInventory, removeItemFromInventory, getNotificationSystem, createCoinNotification, createStatNotification, createItemNotification, getActionSystem, createInitialGameTime, updateGameTime, addDrugEffect, DRUG_DEFINITIONS, createDrugEffect, getBackgroundColor, attemptAutoCraft, canEquipItem, equipItem, unequipItem, calculatePlayerArchetype, checkAndUnlockAwards, BURNER_AWARDS, type Vec2 } from '../modules/core';
import { CAMP_TIME_CONFIG, PLAYA_TIME_CONFIG } from '../modules/core/timeSystem';
import { spawnCollectibles } from '../modules/world';
import { spawnMoop, MoopSpawnConfig, findCollectibleMoop, collectMoop, getMoopDisplayName } from '../modules/moop';
import { getUnifiedItemEmoji } from '../modules/moop/types';
import { pickCoin, rest } from '../modules/actions';
import { tickHellStation } from '../src/modules/world';
import { tickArtCarKinematics, createArtCar } from '../src/modules/entities';
import { consumeFuel, checkArtCarGasCanCollision } from '../src/modules/actions/fuel';
import { decideArtCarState, seekGasTarget } from '../src/modules/ai';
import { CanvasRenderer, InputHandler } from '../ui/canvas';
import { createSpatialIndex, addEntity, removeEntity, queryRadius } from '../modules/spatial';
import { createCamera, followTarget, setCameraPosition } from '../modules/camera';

export interface GameConfig {
  canvasWidth: number;
  canvasHeight: number;
  playerSize: number;
  seed: number;
  coinCount: number;
}

export class GameLoop {
  private gameState!: GameState;
  private spatialIndex: SpatialIndex;
  private camera: Camera;
  private renderer: CanvasRenderer;
  private inputHandler: InputHandler;
  private clock: Clock;
  private rng: Rng;
  private audio: AudioPort;
  private worldManager: WorldManager;
  private config: GameConfig;
  private canvas: HTMLCanvasElement;
  private lastTime: number = 0;
  private animationId: number | null = null;
  private lastPlayerPosition: { x: number; y: number } | null = null;
  private actionSystem: any; // Will be used for action panel
  private isPaused: boolean = false;
  private lastLightDropTime: number = 0; // Track last light bulb drop time for cooldown
  private lastMoopDropTime: number = 0;
  
  // Achievement and archetype tracking
  private achievements: Set<string> = new Set();
  private totalMoopCollected: number = 0;
  private totalDrugsTaken: number = 0;
  private awards: any[] = [...BURNER_AWARDS];
  
  // Coin and karma change tracking for HUD
  private coinChangeHistory: Array<{ amount: number; timestamp: number }> = [];
  private karmaChangeHistory: Array<{ amount: number; timestamp: number }> = [];
  private lastCoinAmount: number = 0;
  private lastKarmaAmount: number = 0;
  private debugMenuOverlay: HTMLElement | null = null;
  private lastStatWarningTime: number = 0;
  private statWarningCooldown: number = 5000; // 5 seconds between warnings
  private dialogueOverlay: HTMLElement | null = null;
  private lastLightSystemLogTime: number = 0; // For 1-second interval logging
  private campMates: Array<{id: string, position: Vec2, color: string, name: string, targetPosition: Vec2, speed: number, mood: number}> = [];
  private lastDialogueCloseTime: number = 0; // Track when dialogue was last closed
  private lastLoggedLocation: string | null = null; // Track last logged location to prevent spam
  
  // Wombat tracking
  private wombatsAtCamp: number = 50; // Total wombats at camp
  private wombatsOnPlaya: number = 0; // Wombats following player on playa
  
  // Performance optimization: Cache frequently calculated values
  private performanceCache: {
    lastDistanceCalculation: { from: Vec2; to: Vec2; result: number } | null;
    lastWorldId: string | null;
    lastTimeScale: number | null;
  } = {
    lastDistanceCalculation: null,
    lastWorldId: null,
    lastTimeScale: null
  };

  constructor(
    canvas: HTMLCanvasElement,
    clock: Clock,
    rng: Rng,
    audio: AudioPort,
    worldManager: WorldManager,
    config: GameConfig
  ) {
    this.canvas = canvas;
    this.clock = clock;
    this.rng = rng;
    this.audio = audio;
    this.worldManager = worldManager;
    this.config = config;
    this.renderer = new CanvasRenderer(canvas, {
      canvasWidth: config.canvasWidth,
      canvasHeight: config.canvasHeight,
      playerSize: config.playerSize,
    });
    this.inputHandler = new InputHandler();

        // Initialize spatial index
        this.spatialIndex = createSpatialIndex(
          config.canvasWidth * 2, // 2x larger world
          config.canvasHeight * 2, // 2x larger world
          100 // 100px cell size
        );

        // Initialize camera
        this.camera = createCamera({
          viewportWidth: config.canvasWidth,
          viewportHeight: config.canvasHeight,
          zoom: 1.0,
          followSpeed: 250.0, // pixels per second - 5x faster following to keep player perfectly centered
          worldBounds: {
            minX: 0,
            minY: 0,
            maxX: 1600, // Fixed camp world width
            maxY: 1200, // Fixed camp world height
          },
        });

    // Initialize game state
    this.initializeGameState();
  }

  private initializeGameState(): void {
    // Get current world configuration
    const currentWorld = this.worldManager.getCurrentWorld();
    const worldDimensions = this.worldManager.getCurrentWorldDimensions();
    // Spawn at the camp on Day 1
    const playerSpawn = createVec2(800, 600); // Center of camp world

    // Initialize game state first
    console.log('🔋 Initializing game state with lightBattery: 0');
    this.gameState = {
      player: {
        position: playerSpawn,
        stats: {
          coins: 0,
          energy: 100, // Start full
          mood: 100, // Start full
          thirst: 0, // Start empty (increases over time)
          hunger: 0, // Start empty (increases over time)
          karma: 0,
          speed: 100,
          lightBattery: 50, // Start with some battery for testing lights system
          bathroom: 0, // Start empty (increases over time)
        },
        drugs: {
          active: [],
          maxStack: 5,
        },
        inventory: (() => {
          const inventory = createEmptyInventory();
          // Add starting items
          addItemToInventory(inventory, 'Water', 3);
          addItemToInventory(inventory, 'Grilled Cheese', 1);
          addItemToInventory(inventory, 'Energy Bar', 1);
          addItemToInventory(inventory, 'Totem', 1); // Add totem for testing lighting effects
          addItemToInventory(inventory, 'Light Bulb White', 1); // Add light bulb for testing lights system
          return inventory;
        })(),
        isResting: false,
        lightsOn: false, // Lights start off since battery is 0
        equippedItem: undefined, // No item equipped initially
        totalDrugsTaken: 0,
        totalTimeOnDrugs: 0,
        gameStartTime: Date.now(),
        actualPlayTime: 0, // Track actual play time excluding pauses
        achievements: new Set<string>(),
        
        // Initialize achievement tracking variables
        totalDistanceTraveled: 0,
        lastPosition: playerSpawn,
        moodStreakHigh: 0,
        moodStreakLow: 0,
        lastMoodValue: 100,
        lastMoodTime: Date.now(),
        balancedStatsTime: 0,
        totalItemsGifted: 0,
        totalKarmaGifted: 0,
        totemUsedDuringManBurn: false,
      },
      seed: this.config.seed,
      time: createInitialGameTime(),
      gameEnded: false,
      weather: {
        type: 'clear',
        intensity: 0,
        duration: 0,
        startTime: 0
      },
      dustStorm: {
        active: false,
        intensity: 0,
        duration: 0,
        startTime: 0
      },
      coins: [], // Will be set by loadCoinsForCurrentWorld
      moop: [], // Will be set by spawnMoop
      hellStation: {
        id: 'hell-station-main',
        aabb: { x: 800, y: 400, w: 400, h: 400 }, // Moved to 10pm position (northwest) near trash fence
        spawnIntervalMs: 4000,
        maxCans: 6,
        lastSpawnAt: 0,
      },
      gasCans: [],
      artCars: [
        createArtCar(this.rng, { x: 1600, y: 1200 }),
        createArtCar(this.rng, { x: 2400, y: 2000 }),
        createArtCar(this.rng, { x: 1800, y: 800 }),
        createArtCar(this.rng, { x: 2200, y: 1600 }),
        createArtCar(this.rng, { x: 1400, y: 1800 }),
      ],
      portopotties: [
        { id: 'porto-1', position: { x: 1000, y: 500 }, aabb: { x: 1000, y: 500, w: 120, h: 120 }, used: false },
        { id: 'porto-2', position: { x: 1500, y: 800 }, aabb: { x: 1500, y: 800, w: 120, h: 120 }, used: false, broken: true }, // Broken toilet
        { id: 'porto-3', position: { x: 2000, y: 1200 }, aabb: { x: 2000, y: 1200, w: 120, h: 120 }, used: false },
        // Move this one away from Boom Boom Womb (playa-camp at 1200,1500) to avoid bathroom-at-camp bug
        { id: 'porto-4', position: { x: 1100, y: 1650 }, aabb: { x: 1100, y: 1650, w: 120, h: 120 }, used: false, broken: true }, // Broken toilet
        { id: 'porto-5', position: { x: 1800, y: 1800 }, aabb: { x: 1800, y: 1800, w: 120, h: 120 }, used: false },
        // 5 more portopotties for better coverage
        { id: 'porto-6', position: { x: 800, y: 1000 }, aabb: { x: 800, y: 1000, w: 120, h: 120 }, used: false },
        { id: 'porto-7', position: { x: 2200, y: 600 }, aabb: { x: 2200, y: 600, w: 120, h: 120 }, used: false, broken: true }, // Broken toilet
        { id: 'porto-8', position: { x: 1400, y: 2000 }, aabb: { x: 1400, y: 2000, w: 120, h: 120 }, used: false },
        { id: 'porto-9', position: { x: 2600, y: 1400 }, aabb: { x: 2600, y: 1400, w: 120, h: 120 }, used: false },
        { id: 'porto-10', position: { x: 900, y: 1700 }, aabb: { x: 900, y: 1700, w: 120, h: 120 }, used: false },
      ],
    };

    // Reset RNG to ensure deterministic coin spawning AFTER art cars are created
    this.rng.setSeed(this.config.seed);
    

    // Clear spatial index for current world
    this.spatialIndex = createSpatialIndex(
      worldDimensions.width,
      worldDimensions.height,
      100
    );

    // Load or spawn coins for current world
    this.loadCoinsForCurrentWorld();
    
    // Debug: Check if lightBattery was properly initialized
    console.log('🔋 Game state initialized, lightBattery:', this.gameState.player.stats.lightBattery);

        // Initialize last position for movement tracking
        this.lastPlayerPosition = { ...playerSpawn };

    // Listen for mute toggle events from button clicks
    window.addEventListener('toggleMute', () => this.handleMuteToggle());
    
    // Listen for inventory item click events
    window.addEventListener('useInventoryItem', (e: any) => this.handleInventoryItemClick(e.detail.itemType));
    
    // Light toggle events are now handled via playerAction events
    
    // Listen for pause toggle events
    window.addEventListener('togglePause', () => this.handlePauseToggle());
    
    // Listen for rest toggle events
    window.addEventListener('toggleRest', () => this.handleRestToggle());

    // Pause when menu opens, resume when it closes
    window.addEventListener('openMenu', () => {
      if (!this.isPaused) this.handlePauseToggle();
    });
    window.addEventListener('closeMenu', () => {
      if (this.isPaused) this.handlePauseToggle();
    });
    
    // Listen for action button events
    window.addEventListener('playerAction', (e: any) => this.handlePlayerAction(e.detail.action));
    
    // Listen for canvas clicks
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      this.renderer.handleCanvasClick(mouseX, mouseY);
    });
    
    // Initialize action system
    this.actionSystem = getActionSystem();
    
    // Generate camp mates
    this.generateCampMates();
  }

  /**
   * Generate 50 wombat camp mates with different colors
   */
  private generateCampMates(): void {
    const campCenter = { x: 800, y: 600 }; // Camp position (center of camp world)
    const worldWidth = 1600; // Full camp world width
    const worldHeight = 1200; // Full camp world height
    
    const colors = [
      '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57',
      '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3', '#ff9f43',
      '#10ac84', '#ee5a24', '#0984e3', '#6c5ce7', '#a29bfe',
      '#fd79a8', '#fdcb6e', '#e17055', '#81ecec', '#74b9ff',
      '#a29bfe', '#fd79a8', '#fdcb6e', '#e17055', '#81ecec',
      '#74b9ff', '#0984e3', '#6c5ce7', '#a29bfe', '#fd79a8',
      '#fdcb6e', '#e17055', '#81ecec', '#74b9ff', '#0984e3',
      '#6c5ce7', '#a29bfe', '#fd79a8', '#fdcb6e', '#e17055',
      '#81ecec', '#74b9ff', '#0984e3', '#6c5ce7', '#a29bfe',
      '#fd79a8', '#fdcb6e', '#e17055', '#81ecec', '#74b9ff'
    ];
    
    const names = [
      'Wombat Wally', 'Wombat Wendy', 'Wombat Walter', 'Wombat Willow', 'Wombat Winston',
      'Wombat Wanda', 'Wombat Wesley', 'Wombat Whitney', 'Wombat Warren', 'Wombat Wren',
      'Wombat Wade', 'Wombat Waverly', 'Wombat Waylon', 'Wombat Winona', 'Wombat Wyatt',
      'Wombat Wylie', 'Wombat Wanda', 'Wombat Walker', 'Wombat Winter', 'Wombat Wilder',
      'Wombat Wren', 'Wombat Wade', 'Wombat Waverly', 'Wombat Waylon', 'Wombat Winona',
      'Wombat Wyatt', 'Wombat Wylie', 'Wombat Wanda', 'Wombat Walker', 'Wombat Winter',
      'Wombat Wilder', 'Wombat Wren', 'Wombat Wade', 'Wombat Waverly', 'Wombat Waylon',
      'Wombat Winona', 'Wombat Wyatt', 'Wombat Wylie', 'Wombat Wanda', 'Wombat Walker',
      'Wombat Winter', 'Wombat Wilder', 'Wombat Wren', 'Wombat Wade', 'Wombat Waverly',
      'Wombat Waylon', 'Wombat Winona', 'Wombat Wyatt', 'Wombat Wylie', 'Wombat Wanda'
    ];
    
    for (let i = 0; i < 50; i++) {
      // Generate random position anywhere in the camp world
      const x = this.rng.random() * worldWidth;
      const y = this.rng.random() * worldHeight;
      
      // Generate initial target position anywhere in the camp world
      const targetX = this.rng.random() * worldWidth;
      const targetY = this.rng.random() * worldHeight;
      
      this.campMates.push({
        id: `campmate-${i}`,
        position: createVec2(x, y),
        color: colors[i % colors.length],
        name: names[i % names.length],
        targetPosition: createVec2(targetX, targetY),
        speed: 0.5 + this.rng.random() * 1.0, // Random speed between 0.5 and 1.5
        mood: 40 + this.rng.random() * 40 // Random mood between 40 and 80
      });
    }
    
    console.log(`🏕️ Generated ${this.campMates.length} wombat camp mates at the camp!`);
  }

  /**
   * Performance optimization: Cached distance calculation
   */
  private cachedDistance(from: Vec2, to: Vec2): number {
    // Check if we can reuse the last calculation
    if (this.performanceCache.lastDistanceCalculation &&
        this.performanceCache.lastDistanceCalculation.from.x === from.x &&
        this.performanceCache.lastDistanceCalculation.from.y === from.y &&
        this.performanceCache.lastDistanceCalculation.to.x === to.x &&
        this.performanceCache.lastDistanceCalculation.to.y === to.y) {
      return this.performanceCache.lastDistanceCalculation.result;
    }

    // Calculate new distance
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const result = Math.sqrt(dx * dx + dy * dy);

    // Cache the result
    this.performanceCache.lastDistanceCalculation = {
      from: { ...from },
      to: { ...to },
      result
    };

    return result;
  }

  /**
   * Log light system state for debugging
   */
  private logLightSystemState(): void {
    const player = this.gameState.player;
    const coloredBulbs = ['Light Bulb Red', 'Light Bulb Green', 'Light Bulb Blue', 'Light Bulb Orange', 'Light Bulb Purple', 'Light Bulb Rainbow'];
    let totalColoredBulbs = 0;
    
    coloredBulbs.forEach(bulbType => {
      const count = player.inventory.items.get(bulbType as any) || 0;
      if (count > 0) {
        totalColoredBulbs += count;
      }
    });
    
    console.log(`🔦 Light System State:`, {
      lightsOn: player.lightsOn,
      batteryLevel: player.stats.lightBattery.toFixed(1) + '%',
      totalColoredBulbs: totalColoredBulbs,
      inventorySize: player.inventory.items.size
    });
  }

  /**
   * Start the game loop
   */
  start(): void {
    this.lastTime = this.clock.now();
    this.tick();
  }

  /**
   * Stop the game loop
   */
  stop(): void {
    if (this.animationId !== null) {
      this.clock.cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Main game tick
   */
  private tick = (): void => {
    const currentTime = this.clock.now();
    const deltaTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.render();

    this.animationId = this.clock.requestAnimationFrame(this.tick);
  };

  /**
   * Update game state
   */
  private update(deltaTime: number): void {
    // Skip updates if paused or game ended
    if (this.isPaused || this.gameState.gameEnded) {
      return;
    }
    
    // Track actual play time (excluding pauses)
    this.gameState.player.actualPlayTime += deltaTime;
    
    // Update game time with both world and drug time scales
    const worldTimeScale = this.worldManager.getCurrentTimeScale();
    const drugTimeScale = calculateTimeScale(this.gameState.player.drugs);
    const effectiveTimeScale = worldTimeScale * drugTimeScale;
    
    // Debug logging for drug effects
    if (this.gameState.player.drugs.active.length > 0) {
      
    }
    
    // Use different time configs based on current world and location
    const currentWorldId = this.worldManager.getCurrentWorldId();
    let timeConfig = currentWorldId === 'camp' ? CAMP_TIME_CONFIG : PLAYA_TIME_CONFIG;
    
    // Use camp time (1 second = 1 minute) when at Hell Station or Center Camp
    if (currentWorldId === 'playa') {
      const playerPos = this.gameState.player.position;
      const isAtHellStation = this.isPlayerNearLandmark(playerPos, 'hell-station', 100);
      const isAtCenterCamp = this.isPlayerNearLandmark(playerPos, 'center-camp', 100);
      
      if (isAtHellStation || isAtCenterCamp) {
        timeConfig = CAMP_TIME_CONFIG; // Use camp time when at these locations
        
        // Only log once when entering the area to prevent spam
        const currentLocation = isAtHellStation ? 'Hell Station' : 'Center Camp';
        if (this.lastLoggedLocation !== currentLocation) {
          console.log(`⏰ Time slowed to 1s = 1 minute at ${currentLocation}`);
          this.lastLoggedLocation = currentLocation;
        }
      } else {
        // Reset when leaving the area
        this.lastLoggedLocation = null;
      }
    }
    
    this.gameState.time = updateGameTime(this.gameState.time, deltaTime, effectiveTimeScale, timeConfig);
    
    // Update weather system
    this.updateWeather(deltaTime);
    
    // Update achievement tracking
    this.updateAchievementTracking(deltaTime);
    
    // Update camp mates movement
    this.updateCampMates(deltaTime);
    
    // If mounted on an art car, move with the car (no manual movement)
    if (this.gameState.player.mountedOn) {
      const mountedCar = this.gameState.artCars.find(car => car.id === this.gameState.player.mountedOn);
      if (mountedCar) {
        // Position player on top of the art car (adjust for car size)
        const newPosition = {
          x: mountedCar.pos.x,
          y: mountedCar.pos.y - (40 * mountedCar.size) // Position above the car, scaled by size
        };
        
        // Art car riding provides energy and mood boost
        const artCarBoost = deltaTime * 0.5; // 0.5 points per second
        this.gameState.player.stats.energy = Math.min(100, this.gameState.player.stats.energy + artCarBoost);
        this.gameState.player.stats.mood = Math.min(100, this.gameState.player.stats.mood + artCarBoost);
        
        // Check for world transition before clamping
        const oldWorldId = this.worldManager.getCurrentWorldId(); // Get old world ID before transition
        const worldTransition = this.worldManager.checkWorldTransition(
          newPosition,
          this.config.playerSize
        );

        if (worldTransition && worldTransition.success) {
          // Handle world transition
          this.handleWorldTransition(worldTransition, oldWorldId);
        } else {
          // Clamp to current world bounds
          const worldDimensions = this.worldManager.getCurrentWorldDimensions();
          if (this.worldManager.getCurrentWorldId() === 'playa') {
            // Enforce circular trash fence boundary centered at (2000,1500) with radius 1400
            const center = createVec2(2000, 1500);
            const dx = newPosition.x - center.x;
            const dy = newPosition.y - center.y;
            const distSq = dx * dx + dy * dy;
            const radius = 1400;
            if (distSq > radius * radius) {
              const dist = Math.sqrt(distSq) || 1;
              const nx = dx / dist;
              const ny = dy / dist;
              this.gameState.player.position = createVec2(center.x + nx * radius, center.y + ny * radius);
            } else {
              this.gameState.player.position = newPosition;
            }
          } else {
            this.gameState.player.position = clampToBounds(
              newPosition,
              worldDimensions.width,
              worldDimensions.height,
              this.config.playerSize
            );
          }
        }
      }
    } else {
      // Normal movement when not mounted
      const direction = this.inputHandler.getMovementDirection();
      if (direction) {
        const input: MovementInput = { direction, deltaTime };
        // Calculate effective speed based on current stats
        // Only move if not resting
        if (!this.gameState.player.isResting) {
          // Calculate effective speed including drug effects and bike
          const drugSpeedMultiplier = this.calculateDrugSpeedMultiplier();
          const bikeMultiplier = (this.gameState.player.isOnBike || this.gameState.player.mountedOn) ? 1.5 : 1.0;
          const baseEffectiveSpeed = calculateEffectiveSpeed(
            this.gameState.player.stats.speed,
            this.gameState.player.stats
          );
          const effectiveSpeed = baseEffectiveSpeed * drugSpeedMultiplier * bikeMultiplier;
          
          
          const newPosition = calculateMovement(
            this.gameState.player.position,
            input,
            effectiveSpeed
          );

        // Check for world transition before clamping
        const oldWorldId = this.worldManager.getCurrentWorldId(); // Get old world ID before transition
        const worldTransition = this.worldManager.checkWorldTransition(
          newPosition,
          this.config.playerSize
        );

        if (worldTransition && worldTransition.success) {
          // Handle world transition
          this.handleWorldTransition(worldTransition, oldWorldId);
        } else {
          // Clamp to current world bounds
          const worldDimensions = this.worldManager.getCurrentWorldDimensions();
          if (this.worldManager.getCurrentWorldId() === 'playa') {
            // Enforce circular trash fence boundary centered at (2000,1500) with radius 1400
            const center = createVec2(2000, 1500);
            const dx = newPosition.x - center.x;
            const dy = newPosition.y - center.y;
            const distSq = dx * dx + dy * dy;
            const radius = 1400 - this.config.playerSize;
            const radiusSq = radius * radius;
            if (distSq > radiusSq) {
              const dist = Math.sqrt(distSq) || 1;
              const nx = dx / dist;
              const ny = dy / dist;
              this.gameState.player.position = createVec2(center.x + nx * radius, center.y + ny * radius);
            } else {
              this.gameState.player.position = newPosition;
            }
          } else {
            this.gameState.player.position = clampToBounds(
              newPosition,
              worldDimensions.width,
              worldDimensions.height,
              this.config.playerSize
            );
          }
        }

          // Play movement sound occasionally (not every frame)
          if (Math.random() < 0.1) { // 10% chance per frame
            this.audio.playSound('playerMove', 0.1);
          }
        }
      }
    }

    // If on a bike, move the bike with the player
    if (this.gameState.player.isOnBike && this.gameState.player.mountedBikeId) {
      const worldStateManager = this.worldManager.getWorldStateManager();
      const worldId = this.worldManager.getCurrentWorldId();
      const worldState = worldStateManager.getWorldState(worldId);
      const collectibles = worldState?.items || [];
      
      const mountedBike = collectibles.find(c => c.id === this.gameState.player.mountedBikeId);
      if (mountedBike) {
        // Move the bike to the player's position
        worldStateManager.updateWorldItem(worldId, mountedBike.id, { 
          position: { ...this.gameState.player.position }
        });
      }
    }

        // Update camera to follow player
        followTarget(this.camera, this.gameState.player.position, deltaTime, this.camera.followSpeed);

    // Calculate movement distance for energy decay
    const distanceMoved = this.lastPlayerPosition
      ? this.cachedDistance(this.lastPlayerPosition, this.gameState.player.position)
      : 0;

    // Apply natural stat decay
    this.applyNaturalDecay(distanceMoved, deltaTime);

    // Apply resting effects
    this.applyRestingEffects(deltaTime);

    // Update last position for next frame
    this.lastPlayerPosition = { ...this.gameState.player.position };

    // Check for coin pickups (only every few frames to reduce CPU load)
    if (Math.floor(this.clock.now() / 16) % 2 === 0) { // Every ~32ms (roughly 30fps)
      this.checkCoinPickups();
    }

    // Check for rest action
    this.checkRestAction();

        // Check for mute toggle
        this.checkMuteToggle();

        // Check for menu toggle
        this.checkMenuToggle();

        // Check for inventory item usage
        this.checkInventoryHotkeys();

        // Check for action hotkeys
        this.checkActionHotkeys();

        // Update Hell Station and Art Cars (only on Playa, and only every few frames)
        if (this.worldManager.getCurrentWorldId() === 'playa' && Math.floor(this.clock.now() / 16) % 3 === 0) {
          this.updateHellStationAndArtCars(deltaTime);
        }

        // Update notifications
        this.updateNotifications(deltaTime);

        // Clear key pressed states for next frame
        this.inputHandler.clearKeyPressed();
  }

  /**
   * Check for coin pickups and apply effects using spatial index
   */
  private checkCoinPickups(): void {
    const playerPos = this.gameState.player.position;
    const playerRadius = this.config.playerSize / 2;
    const coinRadius = 12;

    // Query nearby entities using spatial index
    const nearbyEntities = queryRadius(this.spatialIndex, playerPos, playerRadius + coinRadius);
    
    nearbyEntities.entities.forEach((entity) => {
      const coin = this.gameState.coins.find(c => c.id === entity.id);
      if (coin && !coin.collected && playerOverlapsCoin(playerPos, playerRadius, coin.position, coinRadius)) {
        // Pick up the coin
        const result = pickCoin(coin.value);
        if (result.success) {
          coin.collected = true;
          this.gameState.player.stats = applyStatEffect(this.gameState.player.stats, result.statDelta);
          
          // Track coin change for HUD
          this.trackCoinChange(coin.value);
          
          // Remove from spatial index
          removeEntity(this.spatialIndex, coin.id);
          
          // Show coin notification at the coin's world position
          createCoinNotification(coin.value, coin.position);
          
          // Update world state
          const worldId = this.worldManager.getCurrentWorldId();
          const worldStateManager = this.worldManager.getWorldStateManager();
          worldStateManager.updateWorldItem(worldId, coin.id, { collected: true });
          
          // Play coin pickup sound
          this.audio.playSound('coinPickup', 0.5);
        }
      }
    });
    
    // Check for collectible collection
    this.checkCollectibleCollection(playerPos, playerRadius);
    
    // Check for moop collection
    this.checkMoopCollection(playerPos, playerRadius);
  }
  
  /**
   * Check for moop collection
   */
  private checkMoopCollection(playerPos: any, playerRadius: number): void {
    const collectibleMoop = findCollectibleMoop(playerPos, playerRadius, this.gameState.moop as any);
    
    collectibleMoop.forEach((moopItem) => {
      const result = collectMoop(moopItem, this.gameState.player.stats);
      if (result.success) {
        // Update player stats with karma reward
        this.gameState.player.stats = result.newStats;
        
        // Track karma change for HUD
        this.trackKarmaChange(result.karmaGained);
        
                  // Add moop item to inventory
                  const inventoryItemType = this.getInventoryItemTypeFromMoop(moopItem.type);
                  if (inventoryItemType) {
                    addItemToInventory(this.gameState.player.inventory, inventoryItemType, 1);
                    // console.log muted: collected item
                    
                    // Track moop collection for achievements
                    this.totalMoopCollected++;
                    if (this.totalMoopCollected === 1) {
                      this.achievements.add('first-moop');
                      console.log(`🏆 Achievement unlocked: First Cleanup`);
                    }
                    if (this.totalMoopCollected >= 50) {
                      this.achievements.add('moop-collector');
                      console.log(`🏆 Achievement unlocked: Moop Collector`);
                    }
                    
                    // Attempt auto-crafting after adding item
                    const moopCraftedItems = attemptAutoCraft(this.gameState.player.inventory, this.gameState.player.position);
                    if (moopCraftedItems.length > 0) {
                      console.log(`🔨 Auto-crafted: ${moopCraftedItems.join(', ')}`);
                    }
                  }
        
        // Mark moop as collected
        const moopIndex = this.gameState.moop.findIndex(m => m.id === moopItem.id);
        if (moopIndex !== -1) {
          this.gameState.moop[moopIndex].collected = true;
        }
        
        // Show notification with item name and karma reward
        const itemName = getMoopDisplayName(moopItem.type);
        const system = getNotificationSystem();
        system.addNotification(`+1 ${itemName} (+${result.karmaGained} karma)`, 'item', result.karmaGained, moopItem.position);
        
        // Play sound
        this.audio.playSound('coinPickup', 0.3);
      }
    });
  }

  /**
   * Convert moop type to inventory item type
   */
  private getInventoryItemTypeFromMoop(moopType: string): string | null {
    const moopToInventoryMap: Record<string, string> = {
      'ziptie': 'Zip Tie',
      'ducting': 'Ducting',
      'bucket': 'Bucket',
      'glitter': 'Glitter',
      'rope': 'Rope',
      'plastic-bag': 'Plastic Bag',
      'water-bottle': 'Water', // Convert to water item
      'cup': 'Water', // Convert to water item
      'flashing-light': 'Light Bulb', // Convert to light bulb
      'furry-hat': 'Furry Hat', // Now separate from clothing
      'boots': 'Boots', // New boots item
      'cat-head': 'Cat Head', // New cat head item
      'cigarette-butt': 'Trinket', // Convert to trinket
      'light-bulb': 'Light Bulb'
    };
    
    return moopToInventoryMap[moopType] || null;
  }

  /**
   * Update weather system with daily weather changes
   */
  private updateWeather(deltaTime: number): void {
    // Decrease weather duration
    if (this.gameState.weather.duration > 0) {
      this.gameState.weather.duration -= deltaTime;
      if (this.gameState.weather.duration <= 0) {
        // Weather ended, set to clear
        this.gameState.weather.type = 'clear';
        this.gameState.weather.intensity = 0;
        this.gameState.weather.duration = 0;
        
        // Clear thunderstorm effects when weather ends
        if (this.renderer && typeof this.renderer.clearThunderstormEffects === 'function') {
          this.renderer.clearThunderstormEffects();
        }
      }
    }

    // Check for new weather at the start of each day (6 AM)
    const currentHour = this.gameState.time.hour;
    const currentMinute = this.gameState.time.minute;
    
    // If it's 6 AM and we don't have active weather, roll for new weather
    if (currentHour === 6 && currentMinute === 0 && this.gameState.weather.duration <= 0) {
      const random = Math.random();
      
      if (random < 0.2) {
        // 20% chance of thunderstorm
        this.gameState.weather.type = 'thunderstorm';
        this.gameState.weather.intensity = 0.8 + Math.random() * 0.2; // 0.8 to 1.0
        this.gameState.weather.duration = 4 * 60 * 60; // 4 hours
        this.gameState.weather.startTime = this.gameState.time.totalMinutes;
        
          // Weather changed to thunderstorm (no notification)
      } else if (random < 0.7) {
        // 50% chance of nice weather (between 0.2 and 0.7)
        this.gameState.weather.type = 'nice';
        this.gameState.weather.intensity = 0.6 + Math.random() * 0.4; // 0.6 to 1.0
        this.gameState.weather.duration = 8 * 60 * 60; // 8 hours
        this.gameState.weather.startTime = this.gameState.time.totalMinutes;
        
          // Weather changed to nice (no notification)
      } else {
        // 30% chance of overcast weather
        this.gameState.weather.type = 'overcast';
        this.gameState.weather.intensity = 0.3 + Math.random() * 0.4; // 0.3 to 0.7
        this.gameState.weather.duration = 6 * 60 * 60; // 6 hours
        this.gameState.weather.startTime = this.gameState.time.totalMinutes;
      }
    }
  }

  /**
   * Check for collectible collection
   */
  private checkCollectibleCollection(playerPos: any, playerRadius: number): void {
    const worldId = this.worldManager.getCurrentWorldId();
    const worldStateManager = this.worldManager.getWorldStateManager();
    const worldState = worldStateManager.getWorldState(worldId);
    const collectibles = worldState?.items || [];
    // Check bike mount interactions
    this.checkBikeMount(collectibles);
    
    // Check art car mount interactions (only on Playa)
    if (worldId === 'playa') {
      this.checkArtCarMount();
    }
    
    collectibles.forEach((collectible) => {
      if (!collectible.collected && collectible.type !== 'coin' && collectible.type !== 'bike') {
        // Check pickup cooldown for light bulbs (prevent immediate pickup after dropping)
        if (collectible.type === 'light-bulb' && collectible.dropTime) {
          const timeSinceDrop = Date.now() - collectible.dropTime;
          if (timeSinceDrop < 3000) { // 3 second pickup cooldown
            return; // Skip pickup if still in cooldown
          }
        }
        
        if (playerOverlapsCollectible(playerPos, playerRadius, collectible.position, 15)) {
          // Mark as collected
          worldStateManager.updateWorldItem(worldId, collectible.id, { collected: true });
          
          // Handle different collectible types
          switch (collectible.type) {
            case 'water':
              // Add water to inventory
              addItemToInventory(this.gameState.player.inventory, 'Water', 1);
              createItemNotification('Water', collectible.position);
              
              // Attempt auto-crafting after adding item
              const waterCraftedItems = attemptAutoCraft(this.gameState.player.inventory, this.gameState.player.position);
              if (waterCraftedItems.length > 0) {
                console.log(`🔨 Auto-crafted: ${waterCraftedItems.join(', ')}`);
              }
              break;
            case 'food':
              // Add food to inventory based on subtype
              const foodType = collectible.data?.subtype as keyof typeof ITEM_DEFINITIONS;
              if (foodType && ITEM_DEFINITIONS[foodType]) {
                addItemToInventory(this.gameState.player.inventory, foodType, 1);
                createItemNotification(foodType, collectible.position);
                
                // Attempt auto-crafting after adding item
                const foodCraftedItems = attemptAutoCraft(this.gameState.player.inventory, this.gameState.player.position);
                if (foodCraftedItems.length > 0) {
                  console.log(`🔨 Auto-crafted: ${foodCraftedItems.join(', ')}`);
                }
              }
              break;
            case 'drug':
              // Add drug effect immediately
              const drugType = collectible.data?.subtype as any;
              if (drugType) {
                const drugEffect = createDrugEffect(drugType, 1.0);
                this.gameState.player.drugs = addDrugEffect(this.gameState.player.drugs, drugEffect);
                // Track drug statistics
                this.gameState.player.totalDrugsTaken++;
                createItemNotification(drugType, collectible.position);
                
                // Apply stat effects immediately when drug is taken (except speed and timeScale)
                const drugDefinition = DRUG_DEFINITIONS[drugType as keyof typeof DRUG_DEFINITIONS];
                if (drugDefinition && drugDefinition.effects) {
                  
                  // Create stat effect without speed and timeScale (these are handled as multipliers)
                  const statEffect = {
                    energy: drugDefinition.effects.energy,
                    mood: drugDefinition.effects.mood,
                    thirst: drugDefinition.effects.thirst,
                    hunger: drugDefinition.effects.hunger,
                    karma: drugDefinition.effects.karma,
                    // speed and timeScale are handled as multipliers, not stat changes
                  };
                  
                  this.gameState.player.stats = applyStatEffect(this.gameState.player.stats, statEffect);
                  
                  // Show stat effect notifications
                  if (drugDefinition.effects.mood && drugDefinition.effects.mood !== 0) {
                    createStatNotification('mood', drugDefinition.effects.mood, collectible.position);
                  }
                  if (drugDefinition.effects.energy && drugDefinition.effects.energy !== 0) {
                    createStatNotification('energy', drugDefinition.effects.energy, collectible.position);
                  }
                  if (drugDefinition.effects.thirst && drugDefinition.effects.thirst !== 0) {
                    createStatNotification('thirst', drugDefinition.effects.thirst, collectible.position);
                  }
                  if (drugDefinition.effects.hunger && drugDefinition.effects.hunger !== 0) {
                    createStatNotification('hunger', drugDefinition.effects.hunger, collectible.position);
                  }
                  if (drugDefinition.effects.karma && drugDefinition.effects.karma !== 0) {
                    createStatNotification('karma', drugDefinition.effects.karma, collectible.position);
                  }
                  
                  // Show speed and time notifications separately
                  if (drugDefinition.effects.speed && drugDefinition.effects.speed !== 0) {
                    createStatNotification('speed', drugDefinition.effects.speed, collectible.position);
                  }
                  if (drugDefinition.effects.timeScale && drugDefinition.effects.timeScale !== 1.0) {
                    const timeChange = ((drugDefinition.effects.timeScale - 1.0) * 100).toFixed(0);
                    const system = getNotificationSystem();
                    system.addNotification(`Time: ${parseFloat(timeChange) > 0 ? '+' : ''}${timeChange}%`, 'item', 1, collectible.position);
                  }
                }
              }
              break;
            case 'battery':
              // Add battery to inventory
              addItemToInventory(this.gameState.player.inventory, 'Battery', 1);
              createItemNotification('Battery', collectible.position);
              
              // Attempt auto-crafting after adding item
              const batteryCraftedItems = attemptAutoCraft(this.gameState.player.inventory, this.gameState.player.position);
              if (batteryCraftedItems.length > 0) {
                console.log(`🔨 Auto-crafted: ${batteryCraftedItems.join(', ')}`);
              }
              break;
            case 'light-bulb':
            case 'light-bulb-white':
            case 'light-bulb-red':
            case 'light-bulb-green':
            case 'light-bulb-blue':
            case 'light-bulb-orange':
            case 'light-bulb-purple':
            case 'light-bulb-rainbow':
              // Add the light bulb to inventory
              let lightBulbType: string;
              if (collectible.type === 'light-bulb' && collectible.lightBulbType) {
                // Use the stored light bulb type for dropped light bulbs
                lightBulbType = collectible.lightBulbType;
              } else if (collectible.type === 'light-bulb') {
                // Fallback for generic light bulbs
                lightBulbType = 'Light Bulb';
              } else {
                // Convert "light-bulb-green" to "Light Bulb Green"
                const colorName = collectible.type.replace('light-bulb-', '');
                lightBulbType = `Light Bulb ${colorName.charAt(0).toUpperCase() + colorName.slice(1)}`;
              }
              addItemToInventory(this.gameState.player.inventory, lightBulbType as any, 1);
              createItemNotification(lightBulbType, collectible.position);
              
              // Charge battery when picking up a light bulb (3 bars = 30%)
              // If battery is already full, give a battery item instead
              if (this.gameState.player.stats.lightBattery >= 100) {
                // Battery is full, give a battery item instead
                addItemToInventory(this.gameState.player.inventory, 'Battery', 1);
                const system = getNotificationSystem();
                system.addNotification('Battery full! Got a spare battery instead.', 'item', 2, collectible.position);
              } else {
                // Add 30% charge, but don't exceed 100%
                const newBatteryLevel = Math.min(100, this.gameState.player.stats.lightBattery + 30);
                this.gameState.player.stats.lightBattery = newBatteryLevel;
                
                // Show battery charge notification
                const system = getNotificationSystem();
                system.addNotification(`Battery charged! (${newBatteryLevel}%)`, 'item', 2, collectible.position);
              }
              
              // Check for "Not a Darkwad" achievement (first light bulb)
              if (!this.gameState.player.achievements.has('not-a-darkwad')) {
                this.gameState.player.achievements.add('not-a-darkwad');
                this.showAchievement('Not a Darkwad', '💡 You found your first light!', collectible.position);
              }
              
                // Track light bulb achievement
                this.achievements.add('not-a-darkwad');
                console.log(`🏆 Achievement unlocked: Not a Darkwad`);
                
                // Attempt auto-crafting after adding item
                const lightBulbCraftedItems = attemptAutoCraft(this.gameState.player.inventory, this.gameState.player.position);
                if (lightBulbCraftedItems.length > 0) {
                  console.log(`🔨 Auto-crafted: ${lightBulbCraftedItems.join(', ')}`);
                }
              break;
          }
          
          // Play pickup sound
          this.audio.playSound('coinPickup', 0.3);
        }
      }
    });
  }

  /**
   * Track coin changes for HUD display
   */
  private trackCoinChange(amount: number): void {
    this.coinChangeHistory.push({ amount, timestamp: Date.now() });
    // Keep only last 5 seconds of history
    this.coinChangeHistory = this.coinChangeHistory.filter(
      entry => Date.now() - entry.timestamp < 5000
    );
  }

  /**
   * Track karma changes for HUD display
   */
  private trackKarmaChange(amount: number): void {
    this.karmaChangeHistory.push({ amount, timestamp: Date.now() });
    // Keep only last 5 seconds of history
    this.karmaChangeHistory = this.karmaChangeHistory.filter(
      entry => Date.now() - entry.timestamp < 5000
    );
  }

  /**
   * Get total coin change in last 5 seconds
   */
  private getRecentCoinChange(): number {
    const fiveSecondsAgo = Date.now() - 5000;
    return this.coinChangeHistory
      .filter(entry => entry.timestamp > fiveSecondsAgo)
      .reduce((total, entry) => total + entry.amount, 0);
  }

  /**
   * Get total karma change in last 5 seconds
   */
  private getRecentKarmaChange(): number {
    const fiveSecondsAgo = Date.now() - 5000;
    return this.karmaChangeHistory
      .filter(entry => entry.timestamp > fiveSecondsAgo)
      .reduce((total, entry) => total + entry.amount, 0);
  }

  /**
   * Check if player is at a rest area
   */
  private isPlayerAtRestArea(): boolean {
    const playerPos = this.gameState.player.position;
    const restAreaRadius = 120; // Easier to trigger
    
    const landmarks = getWorldLandmarks(this.worldManager.getCurrentWorldId(), this.gameState.time);
    // Treat explicit rest areas and Center Camp as rest areas
    const restAreas = landmarks.filter(landmark => landmark.type === 'restArea' || landmark.id === 'center-camp');
    
    for (const restArea of restAreas) {
      const distance = Math.sqrt(
        Math.pow(playerPos.x - restArea.position.x, 2) +
        Math.pow(playerPos.y - restArea.position.y, 2)
      );
      
      if (distance <= restAreaRadius) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Apply resting effects (energy restoration)
   */
  private applyRestingEffects(deltaTime: number): void {
    // Allow passive recovery inside rest areas; boost more when actively resting
    const isAtRestArea = this.isPlayerAtRestArea();
    if (this.gameState.player.isResting || isAtRestArea) {
      const baseEnergyRestore = 12 * deltaTime; // Base 12 energy per second
      const multiplier = isAtRestArea ? (this.gameState.player.isResting ? 3 : 2) : 1; // 3x if resting at rest area
      const energyRestore = baseEnergyRestore * multiplier;
      
      const newEnergy = Math.min(100, this.gameState.player.stats.energy + energyRestore);
      
      if (newEnergy !== this.gameState.player.stats.energy) {
        const oldEnergy = Math.floor(this.gameState.player.stats.energy);
        this.gameState.player.stats.energy = newEnergy;
        const newEnergyFloor = Math.floor(newEnergy);
        
        // Only show notification when we gain a whole number of energy
        if (newEnergyFloor > oldEnergy) {
          const energyGained = newEnergyFloor - oldEnergy;
          
          // Show energy restoration notification
          const notificationSystem = getNotificationSystem();
          const energyText = isAtRestArea ? (
            this.gameState.player.isResting
              ? `⚡ +${energyGained} Energy (3x Resting at Rest Area)`
              : `⚡ +${energyGained} Energy (2x Rest Area)`
          ) : `+${energyGained} Energy`;
          notificationSystem.addNotification(
            energyText,
            'energy',
            energyGained,
            this.gameState.player.position
          );
        }
      }
      // Auto-wake at 100 energy when actively resting
      if (this.gameState.player.isResting && this.gameState.player.stats.energy >= 100) {
        this.gameState.player.isResting = false;
        this.audio.playSound('buttonClick', 0.3);
      }
    }
  }

  /**
   * Apply natural stat decay from movement and time
   */
  private applyNaturalDecay(distanceMoved: number, deltaTime: number): void {
    // Update drug effects (reduce duration, remove expired) - unaffected by time multipliers
    const worldTimeScale = this.worldManager.getCurrentTimeScale();
    
    // Drug durations count down in real time - unaffected by time multipliers
    // Drugs always count down at the same speed regardless of active effects
    const gameTimeDelta = deltaTime;
    
    // Track time spent on drugs
    if (this.gameState.player.drugs.active.length > 0) {
      this.gameState.player.totalTimeOnDrugs += gameTimeDelta;
    }
    
    this.gameState.player.drugs = updateDrugEffects(this.gameState.player.drugs, gameTimeDelta);
    
    // Update dust storm
    this.updateDustStorm(deltaTime);
    
    // Check for game end on day 11
    if (this.gameState.time.day >= 11 && !this.gameState.gameEnded) {
      this.endGame();
    }

    // Drug effects are applied separately below

    // Calculate natural stat effects (decay) - use real time, not game time
    const naturalEffects = calculateNaturalEffects(
      distanceMoved,
      deltaTime, // Use real deltaTime for stat decay
      this.gameState.player.stats
    );
    
    // Debug bathroom meter - only log every 5 seconds to avoid spam
    if (naturalEffects.bathroom > 0 && Math.floor(this.clock.now() / 5000) !== Math.floor(this.lastTime / 5000)) {
      console.log(`🚽 Bathroom increasing by ${naturalEffects.bathroom.toFixed(2)}, current: ${this.gameState.player.stats.bathroom.toFixed(1)}`);
    }
    
    // Apply natural decay first
    this.gameState.player.stats = applyStatEffect(
      this.gameState.player.stats,
      naturalEffects
    );
    
    // No auto-turn-on logic - manual control only

    // Decrease light battery over time (1 bar every 6 seconds, 10 bars = 60 seconds total)
    if (this.gameState.player.stats.lightBattery > 0 && this.gameState.player.lightsOn) {
      const batteryDrain = deltaTime * 1.67; // 10% every 6 seconds = 1 bar per 6 seconds
      this.gameState.player.stats.lightBattery = Math.max(0, this.gameState.player.stats.lightBattery - batteryDrain);
      
      
      // Auto-turn off lights when battery reaches 0%
      if (this.gameState.player.stats.lightBattery <= 0) {
        this.gameState.player.lightsOn = false;
        
        // Update UI
        window.dispatchEvent(new CustomEvent('lightStateUpdate', {
          detail: { lightsOn: false }
        }));
        
        // Show notification
        const system = getNotificationSystem();
        system.addNotification('Battery dead - lights turned off', 'warning', 4000, this.gameState.player.position);
      }
    }

    // Drug effects are now applied immediately when taken, not continuously
  }

  /**
   * Check for rest action and apply effects
   */
  private checkRestAction(): void {
    // Instant energy restoration removed - now only slow restoration through applyRestingEffects
    // The rest button toggles isResting state, which triggers slow energy restoration
    // Gift hotkey (G)
    if (typeof (this.inputHandler as any).isGiftKeyPressed === 'function' && (this.inputHandler as any).isGiftKeyPressed()) {
      window.dispatchEvent(new CustomEvent('playerAction', { detail: { action: 'gift' } }));
    }
    // Totem toggle hotkey (T)
    if (typeof (this.inputHandler as any).isTotemTogglePressed === 'function' && (this.inputHandler as any).isTotemTogglePressed()) {
      window.dispatchEvent(new CustomEvent('playerAction', { detail: { action: 'toggleTotem' } }));
    }
    // Lights toggle hotkey (L)
    if (this.inputHandler.isLightsKeyPressed()) {
      console.log('🔑 L key pressed - dispatching toggleLights action');
      window.dispatchEvent(new CustomEvent('playerAction', { detail: { action: 'toggleLights' } }));
    }
  }

  /**
   * Check for mute toggle and apply effects
   */
  private checkMuteToggle(): void {
    if (this.inputHandler.isMuteKeyPressed()) {
      const currentlyMuted = this.audio.isMuted();
      this.audio.setMuted(!currentlyMuted);
      // Play button click sound
      this.audio.playSound('buttonClick', 0.2);
    }
  }

  /**
   * Check for escape key to toggle menu
   */
  private checkMenuToggle(): void {
    if (this.inputHandler.isEscapeKeyPressed()) {
      // Toggle menu (menu will handle pause/resume via events)
      window.dispatchEvent(new CustomEvent('toggleMenu'));
      this.audio.playSound('buttonClick', 0.2);
    }
  }

  /**
   * Handle mute toggle from button click
   */
  private handleMuteToggle(): void {
    const currentlyMuted = this.audio.isMuted();
    this.audio.setMuted(!currentlyMuted);
    // Play button click sound
    this.audio.playSound('buttonClick', 0.2);
  }

  /**
   * Check for inventory item hotkeys
   */
  private checkInventoryHotkeys(): void {
    // Check each item definition for hotkeys
    Object.values(ITEM_DEFINITIONS).forEach(itemDef => {
      if (itemDef.hotkey && this.inputHandler.isKeyJustPressed(itemDef.hotkey)) {
        // Skip light bulbs when L key is pressed - they should only be consumed when explicitly using them
        // Light toggle is handled separately and doesn't consume bulbs
        if (itemDef.hotkey === 'L' && itemDef.type.includes('Light Bulb')) {
          return; // Skip light bulb consumption on L key press
        }
        
        const result = useItem(this.gameState.player.inventory, itemDef.type, this.gameState.player.stats);
        if (result.success) {
          // Debug: Log bathroom changes from item usage
          const bathroomChange = result.newStats.bathroom - this.gameState.player.stats.bathroom;
          if (bathroomChange !== 0) {
            console.log(`🍔 Used ${itemDef.type}: bathroom changed by ${bathroomChange.toFixed(1)}, new bathroom: ${result.newStats.bathroom.toFixed(1)}`);
          }
          this.gameState.player.stats = result.newStats;
          this.audio.playSound('buttonClick', 0.3);
          
          // Show notifications for stat changes
          this.showItemUsageNotifications(itemDef.type);
        }
      }
    });
  }

  /**
   * Check for bike mount/dismount
   */
  private checkBikeMount(collectibles: any[]): void {
    const playerPos = this.gameState.player.position;
    const system = getNotificationSystem();
    
    // If already on bike, allow dismount
    if (this.gameState.player.isOnBike) {
      if (this.inputHandler.isKeyJustPressed(' ')) {
        this.gameState.player.isOnBike = false;
        this.gameState.player.mountedBikeId = undefined;
        this.audio.playSound('dismount', 0.3);
        system.addNotification('Dismounted from bike', 'item', 2, playerPos);
      }
      return;
    }
    
    // Check if near any bike
    const nearBike = collectibles.find(c => !c.collected && c.type === 'bike' && distance(playerPos, c.position) < 40);
    if (nearBike) {
      system.addNotification('Press Space to mount bike', 'persistent', 0, nearBike.position);
      system.updatePersistentNotificationPosition('Press Space to mount bike', nearBike.position);
      
      if (this.inputHandler.isKeyJustPressed(' ')) {
        this.gameState.player.isOnBike = true;
        this.gameState.player.mountedBikeId = nearBike.id;
        this.audio.playSound('mount', 0.3);
        system.removePersistentNotification('Press Space to mount bike');
        system.addNotification('Mounted bike!', 'item', 2, playerPos);
      }
    } else {
      // Remove the notification when not near any bike
      system.removePersistentNotification('Press Space to mount bike');
    }
  }

  /**
   * Check for art car mount/dismount
   */
  private checkArtCarMount(): void {
    const playerPos = this.gameState.player.position;
    const system = getNotificationSystem();
    
    // If already mounted, allow dismount
    if (this.gameState.player.mountedOn) {
      if (this.inputHandler.isKeyJustPressed(' ')) {
        this.gameState.player.mountedOn = null;
        this.audio.playSound('dismount', 0.3);
        system.addNotification('Dismounted from art car', 'item', 2, playerPos);
      }
      return;
    }
    
    // Check if near any art car
    const nearbyCar = this.gameState.artCars.find(car => {
      const dist = Math.hypot(playerPos.x - car.pos.x, playerPos.y - car.pos.y);
      return dist < 80; // Mount range
    });
    
    if (nearbyCar) {
      system.addNotification('Press Space to board art car', 'persistent', 0, nearbyCar.pos); // Persistent notification that follows the car
      // Update the notification position to follow the car
      system.updatePersistentNotificationPosition('Press Space to board art car', nearbyCar.pos);
      
      if (this.inputHandler.isKeyJustPressed(' ')) {
        this.gameState.player.mountedOn = nearbyCar.id;
        this.audio.playSound('mount', 0.3);
        system.removePersistentNotification('Press Space to board art car'); // Remove the persistent notification
        system.addNotification(`Boarded ${nearbyCar.id === 'art-car-1' ? 'Disco Bus' : 'Fire Dragon'}!`, 'item', 2, playerPos);
        
        // Track art car rider achievement
        this.achievements.add('art-car-rider');
        console.log(`🏆 Achievement unlocked: Art Car Rider`);
      }
    } else {
      // Remove the notification when not near any car
      system.removePersistentNotification('Press Space to board art car');
    }
  }

  /**
   * Check for action hotkeys
   */
  private checkActionHotkeys(): void {
    // If resting, any key press wakes up the player
    if (this.gameState.player.isResting) {
      if (this.inputHandler.isAnyKeyPressed()) {
        this.gameState.player.isResting = false;
        this.audio.playSound('buttonClick', 0.3);
        return;
      }
    }
    
    // Check for rest action (R key)
    if (this.inputHandler.isKeyJustPressed('r')) {
      this.handleRestAction();
    }
    
    // L key handling is done through the action system above
    
    // Check for pause toggle (P key)
    if (this.inputHandler.isKeyJustPressed('p')) {
      this.handlePauseToggle();
    }
  }

  /**
   * Handle rest action
   */
  private handleRestAction(): void {
    if (this.gameState.player.isResting) {
      // Stop resting
      this.gameState.player.isResting = false;
      this.audio.playSound('buttonClick', 0.3);
    } else {
      // Start resting
      this.gameState.player.isResting = true;
      this.audio.playSound('playerRest', 0.5);
    }
  }

  /**
   * Handle inventory item click
   */
  private handleInventoryItemClick(itemType: string): void {
    // Wake up if resting
    if (this.gameState.player.isResting) {
      this.gameState.player.isResting = false;
      console.log('Woke up from rest to use item:', itemType);
    }
    
    // Check if it's a light bulb - if so, drop it instead of using it
    if (itemType.includes('Light Bulb')) {
      this.dropLightBulb(itemType);
      return;
    }
    
    // Check if it's a moop item - if so, drop it instead of using it
    const moopItems = ['Ducting', 'Bucket', 'Zip Tie', 'Glitter', 'Rope', 'Plastic Bag'];
    if (moopItems.includes(itemType)) {
      this.dropMoop(itemType);
      return;
    }
    
    // Check if it's an equippable item
    if (canEquipItem(itemType as any)) {
      this.handleEquipmentToggle(itemType as any);
      return;
    }
    
    const result = useItem(this.gameState.player.inventory, itemType as any, this.gameState.player.stats);
    if (result.success) {
      // Debug: Log bathroom changes from item usage
      const bathroomChange = result.newStats.bathroom - this.gameState.player.stats.bathroom;
      if (bathroomChange !== 0) {
        console.log(`🍔 Used ${itemType}: bathroom changed by ${bathroomChange.toFixed(1)}, new bathroom: ${result.newStats.bathroom.toFixed(1)}`);
      }
      this.gameState.player.stats = result.newStats;
      this.audio.playSound('buttonClick', 0.3);
      
      // Show notifications for stat changes
      this.showItemUsageNotifications(itemType);
    }
  }

  /**
   * Handle equipment toggle (equip/unequip)
   */
  private handleEquipmentToggle(itemType: string): void {
    const player = this.gameState.player;
    
    if (player.equippedItem === itemType) {
      // Currently equipped, so unequip it
      unequipItem(player);
      const system = getNotificationSystem();
      system.addNotification(`Unequipped ${itemType}`, 'item', 2000, player.position);
      console.log(`🔧 Unequipped ${itemType}`);
    } else {
      // Not equipped, so equip it
      if (equipItem(player, itemType as any)) {
        const system = getNotificationSystem();
        system.addNotification(`Equipped ${itemType}`, 'item', 2000, player.position);
        console.log(`🔧 Equipped ${itemType}`);
        
        // Play equip sound
        this.audio.playSound('buttonClick', 0.5);
      } else {
        // Failed to equip
        const system = getNotificationSystem();
        system.addNotification(`Cannot equip ${itemType}`, 'warning', 2000, player.position);
      }
    }
  }

  /**
   * Drop a light bulb on the playa (creates a light bulb collectible)
   */
  private dropLightBulb(itemType: string): void {
    // Check cooldown (2 seconds)
    const currentTime = Date.now();
    const timeSinceLastDrop = currentTime - this.lastLightDropTime;
    if (timeSinceLastDrop < 2000) { // 2 seconds = 2000ms
      const remainingCooldown = Math.ceil((2000 - timeSinceLastDrop) / 1000);
      const system = getNotificationSystem();
      system.addNotification(`Light drop cooldown: ${remainingCooldown}s`, 'warning', 0, this.gameState.player.position);
      return;
    }

    // Check if player has the light bulb
    const currentCount = this.gameState.player.inventory.items.get(itemType as any) || 0;
    if (currentCount <= 0) {
      return;
    }

    // Remove one light bulb from inventory
    removeItemFromInventory(this.gameState.player.inventory, itemType as any, 1);

    // Create a light bulb collectible at player position with small random offset
    const offsetX = (Math.random() - 0.5) * 40; // Random offset between -20 and +20
    const offsetY = (Math.random() - 0.5) * 40; // Random offset between -20 and +20
    const lightBulbCollectible = {
      id: `dropped-light-${Date.now()}-${Math.random()}`,
      type: 'light-bulb',
      position: { 
        x: this.gameState.player.position.x + offsetX,
        y: this.gameState.player.position.y + offsetY
      },
      radius: 12,
      collected: false,
      lightBulbType: itemType, // Store the specific light bulb type
      dropTime: currentTime // Track when it was dropped
    };

    // Add to collectibles in the current world
    const worldId = this.worldManager.getCurrentWorldId();
    const worldStateManager = this.worldManager.getWorldStateManager();
    const worldState = worldStateManager.getWorldState(worldId);
    if (worldState) {
      worldState.items.push(lightBulbCollectible);
    }

    // Show notification
    const system = getNotificationSystem();
    system.addNotification(`Dropped ${itemType}`, 'item', 0, this.gameState.player.position);

    // Play sound
    this.audio.playSound('buttonClick', 0.3);

    // Update cooldown timer
    this.lastLightDropTime = currentTime;

  }

  /**
   * Drop a moop item on the playa (creates a moop collectible and reverses karma)
   */
  private dropMoop(itemType: string): void {
    // Check cooldown (2 seconds)
    const currentTime = Date.now();
    const timeSinceLastDrop = currentTime - this.lastMoopDropTime;
    if (timeSinceLastDrop < 2000) { // 2 seconds = 2000ms
      const remainingCooldown = Math.ceil((2000 - timeSinceLastDrop) / 1000);
      const system = getNotificationSystem();
      system.addNotification(`Moop drop cooldown: ${remainingCooldown}s`, 'warning', 0, this.gameState.player.position);
      return;
    }

    // Check if player has the moop item
    const currentCount = this.gameState.player.inventory.items.get(itemType as any) || 0;
    if (currentCount <= 0) {
      return;
    }

    // Remove one moop item from inventory
    removeItemFromInventory(this.gameState.player.inventory, itemType as any, 1);

    // Get the karma reward for this moop type (to reverse it)
    const moopTypeMap: Record<string, string> = {
      'Ducting': 'ducting',
      'Bucket': 'bucket',
      'Zip Tie': 'ziptie',
      'Glitter': 'glitter',
      'Rope': 'rope',
      'Plastic Bag': 'plastic-bag'
    };

    const moopType = moopTypeMap[itemType];
    const karmaReward = moopType ? this.getMoopKarmaReward(moopType) : 0;

    // Give negative karma for littering (double the original reward as penalty)
    const karmaPenalty = karmaReward * 2;
    this.gameState.player.stats.karma -= karmaPenalty;

    // Show notification about karma loss
    const system = getNotificationSystem();
    system.addNotification(`Littered ${itemType} • -${karmaPenalty} karma`, 'warning', 0, this.gameState.player.position);

    // Play sound
    this.audio.playSound('buttonClick', 0.3);

    // Update cooldown timer
    this.lastMoopDropTime = currentTime;

    console.log(`🗑️ Dropped ${itemType}, karma reversed: ${karmaReward}`);
  }

  /**
   * Get karma reward for a moop type
   */
  private getMoopKarmaReward(moopType: string): number {
    const karmaMap: Record<string, number> = {
      'ziptie': 2,
      'water-bottle': 3,
      'cup': 2,
      'flashing-light': 5,
      'furry-hat': 8,
      'cigarette-butt': 1,
      'light-bulb': -5,
      'ducting': 3,
      'bucket': 4,
      'glitter': 2,
      'rope': 3,
      'plastic-bag': 1
    };
    return karmaMap[moopType] || 0;
  }

  /**
   * Get radius for a moop type
   */
  private getMoopRadius(moopType: string): number {
    const radiusMap: Record<string, number> = {
      'ziptie': 8,
      'water-bottle': 12,
      'cup': 10,
      'flashing-light': 14,
      'furry-hat': 16,
      'cigarette-butt': 6,
      'light-bulb': 8,
      'ducting': 10,
      'bucket': 14,
      'glitter': 6,
      'rope': 8,
      'plastic-bag': 6
    };
    return radiusMap[moopType] || 8;
  }

  /**
   * Simple, clean lights toggle method
   */
  private toggleLights(): void {
    // Check if player can use lights
    const hasLightBulbs = this.playerHasLightBulbs();
    const hasBattery = this.gameState.player.stats.lightBattery > 0;
    
    if (!hasLightBulbs) {
      const system = getNotificationSystem();
      system.addNotification('No light bulbs! Find some to use lights.', 'warning', 0, this.gameState.player.position);
      this.audio.playSound('buttonClick', 0.2);
      return;
    }
    
    if (!hasBattery) {
      const system = getNotificationSystem();
      system.addNotification('Battery dead! Find a battery to use lights.', 'warning', 0, this.gameState.player.position);
      this.audio.playSound('buttonClick', 0.2);
      return;
    }
    
    // Simple toggle
    this.gameState.player.lightsOn = !this.gameState.player.lightsOn;
    
    // Update UI
    window.dispatchEvent(new CustomEvent('lightStateUpdate', { 
      detail: { lightsOn: this.gameState.player.lightsOn } 
    }));
    
    // Play sound
    this.audio.playSound('buttonClick', 0.3);
    
    // Show notification
    const system = getNotificationSystem();
    const message = this.gameState.player.lightsOn ? 'Lights turned on' : 'Lights turned off';
    system.addNotification(message, 'temporary', 3000, this.gameState.player.position);
  }
  
  /**
   * Check if player has light bulbs in inventory
   */
  private playerHasLightBulbs(): boolean {
    return Array.from(this.gameState.player.inventory.items.entries()).some(([itemType, quantity]) => 
      quantity > 0 && (itemType.includes('Light Bulb') || itemType === 'Battery')
    );
  }

  /**
   * Check bike mount interactions
   */
  private checkBikeMountInteractions(): void {
    // Implementation for bike mount interactions
    // This method was referenced but not implemented
  }

  /**
   * Handle rest toggle
   */
  private handleRestToggle(): void {
    this.handleRestAction();
  }

  /**
   * Handle pause toggle
   */
  private handlePauseToggle(): void {
    this.isPaused = !this.isPaused;
    this.audio.playSound('buttonClick', 0.2);
    
    // Show/hide debug menu
    if (this.isPaused) {
      this.showDebugMenu();
    } else {
      this.hideDebugMenu();
    }
    
    // Dispatch pause state update event
    window.dispatchEvent(new CustomEvent('pauseStateUpdate', { detail: { isPaused: this.isPaused } }));
  }

  /**
   * Show debug menu overlay
   */
  private showDebugMenu(): void {
    if (this.debugMenuOverlay) {
      this.hideDebugMenu();
    }

    // Create debug menu overlay
    this.debugMenuOverlay = document.createElement('div');
    this.debugMenuOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      font-family: 'Courier New', monospace;
      color: white;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: linear-gradient(135deg, #1a1a2e, #16213e);
      padding: 30px;
      border-radius: 15px;
      border: 2px solid #4ecdc4;
      text-align: center;
      max-width: 500px;
      box-shadow: 0 0 30px rgba(78, 205, 196, 0.3);
    `;

    content.innerHTML = `
      <h1 style="color: #4ecdc4; font-size: 2em; margin-bottom: 20px;">🔧 Debug Menu</h1>
      
      <div style="margin-bottom: 20px;">
        <h3 style="color: #ffd93d; margin-bottom: 10px;">Current State</h3>
        <div style="background: rgba(255, 255, 255, 0.1); padding: 15px; border-radius: 8px; margin-bottom: 15px;">
          <div>Day: ${this.gameState.time.day}</div>
          <div>Hour: ${this.gameState.time.hour}:${this.gameState.time.minute.toString().padStart(2, '0')}</div>
          <div>Weather: ${this.gameState.weather.type}</div>
          <div>World: ${this.worldManager.getCurrentWorldId()}</div>
        </div>
      </div>

      <div style="margin-bottom: 20px;">
        <h3 style="color: #ffd93d; margin-bottom: 10px;">Time Controls</h3>
        <button onclick="window.gameLoop.advanceDay()" style="
          background: linear-gradient(45deg, #4ecdc4, #44a08d);
          border: none;
          padding: 10px 20px;
          margin: 5px;
          font-size: 1em;
          color: white;
          border-radius: 20px;
          cursor: pointer;
          font-family: 'Courier New', monospace;
          font-weight: bold;
        ">⏭️ Advance Day</button>
        
        <button onclick="window.gameLoop.goBackDay()" style="
          background: linear-gradient(45deg, #e74c3c, #c0392b);
          border: none;
          padding: 10px 20px;
          margin: 5px;
          font-size: 1em;
          color: white;
          border-radius: 20px;
          cursor: pointer;
          font-family: 'Courier New', monospace;
          font-weight: bold;
        ">⏮️ Go Back Day</button>
        
        <button onclick="window.gameLoop.advanceHour()" style="
          background: linear-gradient(45deg, #4ecdc4, #44a08d);
          border: none;
          padding: 10px 20px;
          margin: 5px;
          font-size: 1em;
          color: white;
          border-radius: 20px;
          cursor: pointer;
          font-family: 'Courier New', monospace;
          font-weight: bold;
        ">⏰ Advance Hour</button>
      </div>

      <div style="margin-bottom: 20px;">
        <h3 style="color: #ffd93d; margin-bottom: 10px;">Weather Controls</h3>
        <button onclick="window.gameLoop.setWeather('clear')" style="
          background: linear-gradient(45deg, #87CEEB, #4682B4);
          border: none;
          padding: 8px 15px;
          margin: 3px;
          font-size: 0.9em;
          color: white;
          border-radius: 15px;
          cursor: pointer;
          font-family: 'Courier New', monospace;
        ">☀️ Clear</button>
        
        <button onclick="window.gameLoop.setWeather('nice')" style="
          background: linear-gradient(45deg, #98FB98, #32CD32);
          border: none;
          padding: 8px 15px;
          margin: 3px;
          font-size: 0.9em;
          color: white;
          border-radius: 15px;
          cursor: pointer;
          font-family: 'Courier New', monospace;
        ">🌤️ Nice</button>
        
        <button onclick="window.gameLoop.setWeather('overcast')" style="
          background: linear-gradient(45deg, #D3D3D3, #A9A9A9);
          border: none;
          padding: 8px 15px;
          margin: 3px;
          font-size: 0.9em;
          color: white;
          border-radius: 15px;
          cursor: pointer;
          font-family: 'Courier New', monospace;
        ">☁️ Overcast</button>
        
        <button onclick="window.gameLoop.setWeather('thunderstorm')" style="
          background: linear-gradient(45deg, #4169E1, #191970);
          border: none;
          padding: 8px 15px;
          margin: 3px;
          font-size: 0.9em;
          color: white;
          border-radius: 15px;
          cursor: pointer;
          font-family: 'Courier New', monospace;
        ">⛈️ Thunderstorm</button>
        
        <button onclick="window.gameLoop.setWeather('duststorm')" style="
          background: linear-gradient(45deg, #D2B48C, #8B4513);
          border: none;
          padding: 8px 15px;
          margin: 3px;
          font-size: 0.9em;
          color: white;
          border-radius: 15px;
          cursor: pointer;
          font-family: 'Courier New', monospace;
        ">🌪️ Duststorm</button>
      </div>

      <div style="margin-bottom: 20px;">
        <button onclick="window.gameLoop.hideDebugMenu(); window.gameLoop.handlePauseToggle();" style="
          background: linear-gradient(45deg, #ff6b6b, #ee5a52);
          border: none;
          padding: 15px 30px;
          font-size: 1.2em;
          color: white;
          border-radius: 25px;
          cursor: pointer;
          font-family: 'Courier New', monospace;
          font-weight: bold;
        ">▶️ Resume Game</button>
      </div>
    `;

    this.debugMenuOverlay.appendChild(content);
    document.body.appendChild(this.debugMenuOverlay);

    // Expose methods to window for button access
    (window as any).gameLoop = this;
  }

  /**
   * Hide debug menu overlay
   */
  private hideDebugMenu(): void {
    if (this.debugMenuOverlay) {
      document.body.removeChild(this.debugMenuOverlay);
      this.debugMenuOverlay = null;
    }
  }

  /**
   * Advance game by one day
   */
  public advanceDay(): void {
    this.gameState.time.day += 1;
    this.gameState.time.hour = 0;
    this.gameState.time.minute = 0;
    
    // Update totalMinutes to match the new day
    const totalMinutesInDay = 24 * 60; // 24 hours * 60 minutes
    this.gameState.time.totalMinutes = (this.gameState.time.day - 1) * totalMinutesInDay;
    
    
    // Refresh debug menu if it's open
    if (this.debugMenuOverlay) {
      this.hideDebugMenu();
      this.showDebugMenu();
    }
  }

  /**
   * Go back by one day
   */
  public goBackDay(): void {
    // Don't go below day 1
    if (this.gameState.time.day > 1) {
      this.gameState.time.day -= 1;
      this.gameState.time.hour = 23; // Set to end of previous day
      this.gameState.time.minute = 59;
      
      // Update totalMinutes to match the new day
      const totalMinutesInDay = 24 * 60; // 24 hours * 60 minutes
      this.gameState.time.totalMinutes = (this.gameState.time.day - 1) * totalMinutesInDay + 23 * 60 + 59;
      
      // Refresh debug menu if it's open
      if (this.debugMenuOverlay) {
        this.hideDebugMenu();
        this.showDebugMenu();
      }
    }
  }

  /**
   * Advance game by one hour
   */
  public advanceHour(): void {
    this.gameState.time.hour += 1;
    if (this.gameState.time.hour >= 24) {
      this.gameState.time.hour = 0;
      this.gameState.time.day += 1;
    }
    this.gameState.time.minute = 0;
    
    // Update totalMinutes to match the new time
    const totalMinutesInDay = 24 * 60; // 24 hours * 60 minutes
    this.gameState.time.totalMinutes = (this.gameState.time.day - 1) * totalMinutesInDay + 
                                      this.gameState.time.hour * 60 + 
                                      this.gameState.time.minute;
    
    
    // Refresh debug menu if it's open
    if (this.debugMenuOverlay) {
      this.hideDebugMenu();
      this.showDebugMenu();
    }
  }

  /**
   * Set weather type
   */
  public setWeather(weatherType: 'clear' | 'nice' | 'overcast' | 'thunderstorm' | 'duststorm'): void {
    this.gameState.weather.type = weatherType;
    this.gameState.weather.intensity = 0.5;
    this.gameState.weather.duration = 300; // 5 minutes
    this.gameState.weather.startTime = Date.now();
    
    // Clear thunderstorm effects when weather changes
    if (this.renderer && typeof this.renderer.clearThunderstormEffects === 'function') {
      this.renderer.clearThunderstormEffects();
    }
  }

  /**
   * Handle player action from button click
   */
  private handlePlayerAction(action: string): void {
    console.log('Player action:', action);
    
    switch (action) {
      case 'rest':
        this.handleRestAction();
        break;
      case 'toggleTotem':
        // Toggle equip Totem if present in inventory
        if ((this.gameState.player.inventory.items.get('Totem') || 0) > 0) {
          if (this.gameState.player.equippedItem === 'Totem') {
            this.gameState.player.equippedItem = undefined as any;
            console.log('🔧 Unequipped Totem');
          } else {
            this.gameState.player.equippedItem = 'Totem' as any;
            console.log('🔧 Equipped Totem');
          }
        }
        break;
      case 'toggleLights':
        // Use the clean toggle method
        this.toggleLights();
        break;
      case 'mountBike':
        // Wake up if resting
        if (this.gameState.player.isResting) {
          this.gameState.player.isResting = false;
          console.log('Woke up from rest to mount bike');
        }
        // Trigger bike mount (same as spacebar)
        this.checkBikeMountInteractions();
        break;
      case 'mountArtCar':
        // Wake up if resting
        if (this.gameState.player.isResting) {
          this.gameState.player.isResting = false;
          console.log('Woke up from rest to mount art car');
        }
        // Trigger art car mount (same as spacebar)
        this.checkArtCarMount();
        break;
      case 'explore':
        // Wake up if resting
        if (this.gameState.player.isResting) {
          this.gameState.player.isResting = false;
          console.log('Woke up from rest to explore');
        }
        break;
      case 'gift':
        // Wake up if resting
        if (this.gameState.player.isResting) {
          this.gameState.player.isResting = false;
          console.log('Woke up from rest to give gift');
        }
        this.showGiftDialogue();
        break;
      case 'help':
        // Wake up if resting
        if (this.gameState.player.isResting) {
          this.gameState.player.isResting = false;
          console.log('Woke up from rest to help stranger');
        }
        // TODO: Implement help stranger
        break;
      case 'battle':
        // Wake up if resting
        if (this.gameState.player.isResting) {
          this.gameState.player.isResting = false;
          console.log('Woke up from rest for silly battle');
        }
        // TODO: Implement silly battle
        break;
      case 'meditate':
        // Wake up if resting
        if (this.gameState.player.isResting) {
          this.gameState.player.isResting = false;
          console.log('Woke up from rest to meditate');
        }
        // TODO: Implement meditation
        break;
      default:
        console.log('Unknown action:', action);
    }
    
    this.audio.playSound('buttonClick', 0.2);
  }

  /**
   * Gift UI: show a grid of inventory items and counts, allow gifting with karma
   */
  private showGiftDialogue(): void {
    if (this.dialogueOverlay) return;
    const inventoryItems = Array.from(this.gameState.player.inventory.items.entries())
      .map(([type, quantity]) => ({ type, quantity }))
      .filter(it => it.quantity > 0);
    
    this.dialogueOverlay = document.createElement('div');
    this.dialogueOverlay.dataset.dialog = 'gift';
    this.dialogueOverlay.style.cssText = `
      position: fixed; inset: 0; background: rgba(0,0,0,0.55); z-index: 999999; pointer-events: auto;
      display: flex; align-items: center; justify-content: center; font-family: 'Courier New', monospace; color: #fff;`;
    
    const box = document.createElement('div');
    box.style.cssText = `
      background: #1e1e2f; border: 2px solid #8b5cf6; border-radius: 14px; width: 720px; max-width: 90vw; max-height: 80vh; overflow: auto; padding: 20px; position: relative;`;
    
    // Close (X)
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✖';
    closeBtn.style.cssText = `position:absolute; top:8px; right:10px; background: transparent; color:#fff; border:none; font-size: 18px; cursor:pointer;`;
    closeBtn.addEventListener('click', () => this.closeDialogue());
    box.appendChild(closeBtn);
    
    const title = document.createElement('h2');
    title.textContent = 'Give Gift';
    title.style.cssText = 'margin: 0 0 10px 0; color:#ffd23f;';
    box.appendChild(title);
    
    // Gift All button
    const giftAllBtn = document.createElement('button');
    giftAllBtn.textContent = '🎁 Gift All';
    giftAllBtn.style.cssText = `
      background: linear-gradient(45deg,#27ae60,#2ecc71); color:#fff; border:none; padding:10px 16px; border-radius:10px; font-weight:bold; cursor:pointer; margin: 0 0 12px 0;`;
    giftAllBtn.addEventListener('click', () => {
      let totalGifted = 0;
      let totalKarma = 0;
      for (const [type, qty] of Array.from(this.gameState.player.inventory.items.entries())) {
        if (qty > 0) {
          const karmaGain = this.getGiftKarmaForItem(type) * qty;
          // Remove from inventory entirely when gifting all
          this.gameState.player.inventory.items.delete(type);
          totalGifted += qty;
          totalKarma += karmaGain;
        }
      }
      if (totalGifted > 0) {
        // Track gifting for achievements
        this.gameState.player.totalItemsGifted += totalGifted;
        this.gameState.player.totalKarmaGifted += totalKarma;
        
        this.applyKarmaChange(totalKarma, `Gave ${totalGifted} items`);
        const system = getNotificationSystem();
        system.addNotification(`🎁 Gifted All • +${Math.round(totalKarma)} karma`, 'karma', 2500, this.gameState.player.position);
        
        // Check gifting achievements
        this.checkGiftingAchievements();
        // Inline banner inside gifting dialog so it shows above the overlay too
        const banner = document.createElement('div');
        banner.textContent = `+${Math.round(totalKarma)} karma`;
        banner.style.cssText = `
          position:absolute; top:12px; left:50%; transform: translateX(-50%);
          background: rgba(39, 174, 96, 0.9); color:#fff; padding:6px 12px; border-radius:999px;
          font-weight:bold; box-shadow:0 0 12px rgba(39,174,96,.6); z-index: 1000000;`;
        box.appendChild(banner);
        setTimeout(() => { box.contains(banner) && box.removeChild(banner); }, 1800);

        window.dispatchEvent(new CustomEvent('gameStateUpdate', { detail: { gameState: this.gameState } }));
        this.refreshGiftGrid(box);
      }
    });
    box.appendChild(giftAllBtn);
    
    // Grid container
    const grid = document.createElement('div');
    grid.className = 'gift-grid';
    grid.style.cssText = 'display:grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap:12px;';
    box.appendChild(grid);
    
    // Footer buttons
    const footer = document.createElement('div');
    footer.style.cssText = 'margin-top:12px; display:flex; justify-content:flex-end; gap:10px;';
    const stopBtn = document.createElement('button');
    stopBtn.textContent = 'Stop Gifting';
    stopBtn.style.cssText = 'background:#e74c3c; color:#fff; border:none; padding:8px 12px; border-radius:8px; cursor:pointer;';
    stopBtn.addEventListener('click', () => this.closeDialogue());
    footer.appendChild(stopBtn);
    box.appendChild(footer);
    
    this.dialogueOverlay.appendChild(box);
    document.body.appendChild(this.dialogueOverlay);
    
    // Populate grid
    this.populateGiftGrid(grid);
  }

  private populateGiftGrid(grid: HTMLElement): void {
    grid.innerHTML = '';
    const items = Array.from(this.gameState.player.inventory.items.entries())
      .map(([type, quantity]) => ({ type, quantity }))
      .filter(i => i.quantity > 0)
      .sort((a,b) => b.quantity - a.quantity || a.type.localeCompare(b.type));
    
    for (const it of items) {
      const btn = document.createElement('button');
      const perKarma = this.getGiftKarmaForItem(it.type);
      const emoji = getUnifiedItemEmoji(it.type);
      btn.style.cssText = 'background: rgba(45,45,68,0.85); color:#fff; border:1px solid #8b5cf6; border-radius:10px; padding:12px; text-align:left; cursor:pointer; backdrop-filter: blur(2px);';
      btn.innerHTML = `<div style="display:flex; align-items:center; gap:8px; font-weight:bold;"><span style="font-size:18px;">${emoji}</span> ${it.type}</div>
        <div style="opacity:.85; font-size:12px; margin-top:4px; display:flex; justify-content:space-between;">
          <span>Qty: ${it.quantity}</span>
          <span>+${perKarma} karma each</span>
        </div>`;
      btn.addEventListener('click', () => {
        this.giftItem(it.type, 1);
        this.populateGiftGrid(grid); // keep dialog open and refresh
      });
      grid.appendChild(btn);
    }
    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'opacity:.7; grid-column: 1 / -1; padding:6px;';
      empty.textContent = 'No items to gift';
      grid.appendChild(empty);
    }
  }

  private refreshGiftGrid(container: HTMLElement): void {
    const grid = container.querySelector('.gift-grid') as HTMLElement | null;
    if (grid) this.populateGiftGrid(grid);
  }

  private giftItem(itemType: string, amount: number): void {
    const current = this.gameState.player.inventory.items.get(itemType) || 0;
    if (current <= 0) return;
    const give = Math.min(current, amount);
    const remaining = current - give;
    if (remaining <= 0) {
      this.gameState.player.inventory.items.delete(itemType);
    } else {
      this.gameState.player.inventory.items.set(itemType, remaining);
    }
    const karmaGain = this.getGiftKarmaForItem(itemType) * give;
    
    // Track gifting for achievements
    this.gameState.player.totalItemsGifted += give;
    this.gameState.player.totalKarmaGifted += karmaGain;
    
    this.applyKarmaChange(karmaGain, `Gifted ${give} ${itemType}`);
    const system = getNotificationSystem();
    system.addNotification(`🎁 Gifted ${give} ${itemType} • +${Math.round(karmaGain)} karma`, 'karma', 2200, this.gameState.player.position);
    
    // Check gifting achievements
    this.checkGiftingAchievements();
    
    window.dispatchEvent(new CustomEvent('gameStateUpdate', { detail: { gameState: this.gameState } }));
  }

  private getGiftKarmaForItem(itemType: string): number {
    // Simple weighting: lights/batteries more valuable, food medium, trinkets low
    const t = itemType.toLowerCase();
    if (/light bulb|battery|bulb/.test(t)) return 5;
    if (/water|pizza|nachos|pickles|bacon|corn dog|energy bar|grilled cheese|burner burger|cotton candy|dusty donut|smoothie|popsicle|fruit salad|burrito/.test(t)) return 3;
    if (/trinket|clothing|hat|boots|cape|costume/.test(t)) return 2;
    return 1;
  }


  private applyKarmaChange(delta: number, _reason?: string): void {
    // Unlimited karma (no clamping)
    this.gameState.player.stats.karma = this.gameState.player.stats.karma + delta;
    // surface recent karma change to HUD
    this.karmaChangeHistory.push({ amount: delta, timestamp: Date.now() });
  }

  /**
   * Update Hell Station and Art Cars
   */
  private updateDustStorm(deltaTime: number): void {
    // Dust storms can occur randomly, more likely during certain times
    const currentHour = this.gameState.time.hour;
    const isDustStormTime = (currentHour >= 14 && currentHour <= 18) || (currentHour >= 2 && currentHour <= 6);
    
    if (this.gameState.dustStorm.active) {
      // Update active dust storm
      this.gameState.dustStorm.duration -= deltaTime;
      
      if (this.gameState.dustStorm.duration <= 0) {
        // End dust storm
        this.gameState.dustStorm.active = false;
        this.gameState.dustStorm.intensity = 0;
        this.gameState.dustStorm.duration = 0;
      } else {
        // Vary intensity during storm
        const stormAge = (Date.now() - this.gameState.dustStorm.startTime) / 1000;
        const baseIntensity = 0.7;
        const variation = Math.sin(stormAge * 0.5) * 0.2;
        this.gameState.dustStorm.intensity = Math.max(0.3, Math.min(1.0, baseIntensity + variation));
      }
    } else if (isDustStormTime && Math.random() < 0.001) { // 0.1% chance per frame during dust storm hours
      // Start new dust storm
      this.gameState.dustStorm.active = true;
      this.gameState.dustStorm.intensity = 0.8;
      this.gameState.dustStorm.duration = 30 + Math.random() * 60; // 30-90 seconds
      this.gameState.dustStorm.startTime = Date.now();
    }
  }

  private endGame(): void {
    this.gameState.gameEnded = true;
    
    // Calculate game statistics
    const actualPlayTimeSeconds = (Date.now() - this.gameState.player.gameStartTime) / 1000; // actual real-world play time in seconds
    const drugPercentage = actualPlayTimeSeconds > 0 ? (this.gameState.player.totalTimeOnDrugs / actualPlayTimeSeconds) * 100 : 0;
    
    // Show end game screen
    // Check final achievements before showing end screen
    this.checkManBurnTotemAchievement();
    
    this.showEndGameScreen({
      coins: this.gameState.player.stats.coins,
      karma: this.gameState.player.stats.karma,
      drugPercentage: drugPercentage,
      totalDrugsTaken: this.gameState.player.totalDrugsTaken,
      totalGameTime: actualPlayTimeSeconds
    });
  }

  /**
   * Show achievement notification
   */
  private showAchievement(title: string, description: string, position: Vec2): void {
    const system = getNotificationSystem();
    system.addNotification(`🏆 ${title}`, 'achievement', 3, position);
    
    // Also show a special achievement notification
    setTimeout(() => {
      system.addNotification(description, 'achievement', 2, position);
    }, 1000);
  }

  private showEndGameScreen(stats: {
    coins: number;
    karma: number;
    drugPercentage: number;
    totalDrugsTaken: number;
    totalGameTime: number;
  }): void {
    // Calculate archetype data
    const gameTimeHours = this.gameState.time.totalMinutes / 60;
    const playerArchetype = calculatePlayerArchetype(
      this.gameState.player.stats,
      this.achievements,
      this.gameState.player.inventory,
      this.totalDrugsTaken,
      gameTimeHours
    );
    const unlockedAwards = this.awards.filter(award => award.unlocked);
    
    // Create end game overlay with scrolling
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      z-index: 10000;
      font-family: 'Courier New', monospace;
      color: white;
      overflow-y: auto;
      padding: 20px;
      box-sizing: border-box;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
      background: linear-gradient(135deg, #1a1a2e, #16213e);
      padding: 40px;
      border-radius: 20px;
      border: 2px solid #ff6b6b;
      text-align: center;
      max-width: 800px;
      margin: 0 auto;
      box-shadow: 0 0 50px rgba(255, 107, 107, 0.3);
    `;
    
    // Calculate play time in seconds and add bonus time distortion
    const gameTimeSeconds = Math.floor(stats.totalGameTime);
    const timeDistortionBonus = stats.totalDrugsTaken * 5; // 5 seconds bonus per drug taken
    const totalTimeWithBonus = gameTimeSeconds + timeDistortionBonus;
    
    content.innerHTML = `
      <h1 style="color: #ff6b6b; font-size: 2.5em; margin-bottom: 20px; text-shadow: 0 0 10px #ff6b6b;">
        🎉 YOU WIN BURNING MAN! 🎉
      </h1>
      <h2 style="color: #4ecdc4; margin-bottom: 30px;">Your Burning Man Journey Ends</h2>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
        <div style="background: rgba(255, 255, 255, 0.1); padding: 20px; border-radius: 10px;">
          <h3 style="color: #ffd93d; margin-bottom: 10px;">💰 Coins Collected</h3>
          <div style="font-size: 2em; font-weight: bold;">${stats.coins}</div>
        </div>
        
        <div style="background: rgba(255, 255, 255, 0.1); padding: 20px; border-radius: 10px;">
          <h3 style="color: #ffd93d; margin-bottom: 10px;">🌟 Karma</h3>
          <div style="font-size: 2em; font-weight: bold;">${Math.round(stats.karma)}</div>
        </div>
        
        <div style="background: rgba(255, 255, 255, 0.1); padding: 20px; border-radius: 10px;">
          <h3 style="color: #ffd93d; margin-bottom: 10px;">💊 Time on Drugs</h3>
          <div style="font-size: 2em; font-weight: bold;">${stats.drugPercentage.toFixed(1)}%</div>
        </div>
        
        <div style="background: rgba(255, 255, 255, 0.1); padding: 20px; border-radius: 10px;">
          <h3 style="color: #ffd93d; margin-bottom: 10px;">🧪 Total Drugs Taken</h3>
          <div style="font-size: 2em; font-weight: bold;">${stats.totalDrugsTaken}</div>
        </div>
      </div>
      
      <div style="background: rgba(255, 255, 255, 0.1); padding: 20px; border-radius: 10px; margin-bottom: 30px;">
        <h3 style="color: #ffd93d; margin-bottom: 10px;">⏱️ Total Play Time</h3>
        <div style="font-size: 1.5em;">${totalTimeWithBonus}s <span style="color:#aaa; font-size:0.9em;">(base ${gameTimeSeconds}s + bonus +${timeDistortionBonus}s)</span></div>
      </div>
      
      <div style="background: rgba(255, 255, 255, 0.1); padding: 20px; border-radius: 10px; margin-bottom: 30px;">
        <h3 style="color: #ffd93d; margin-bottom: 15px;">🏆 Achievements Unlocked</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
          ${this.gameState.player.achievements.size > 0 ? 
            Array.from(this.gameState.player.achievements).map(achievement => {
              const achievementNames: { [key: string]: string } = {
                'first-moop': '🗑️ First Cleanup',
                'moop-collector': '🗑️ Moop Collector', 
                'not-a-darkwad': '💡 Not a Darkwad',
                'art-car-rider': '🚗 Art Car Rider'
              };
              return `<div style="background: rgba(255, 215, 0, 0.2); padding: 10px; border-radius: 8px; border: 1px solid #ffd700;">
                ${achievementNames[achievement] || `🏆 ${achievement.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`}
              </div>`;
            }).join('') :
            '<div style="color: #888; font-style: italic;">No achievements unlocked yet</div>'
          }
        </div>
        <div style="margin-top: 10px; color: #ffd93d; font-size: 0.9em;">
          Total: ${this.gameState.player.achievements.size} achievements
        </div>
      </div>
      
      <p style="color: #4ecdc4; font-size: 1.2em; margin-bottom: 30px;">
        ${stats.drugPercentage > 50 ? 
          'You really embraced the psychedelic experience! 🌈' : 
          stats.drugPercentage > 25 ? 
          'You had a balanced journey with some enhanced experiences! ✨' :
          'You stayed mostly sober and focused on the experience! 🧘'
        }
      </p>
      
      <hr style="border: 1px solid #ff6b6b; margin: 30px 0;">
      
      <!-- Archetype Section -->
      <div style="margin-top: 30px;">
        <h2 style="color: #ffd23f; margin-bottom: 20px;">Your Burner Archetype</h2>
        ${playerArchetype ? `
          <div style="font-size: 4em; margin-bottom: 15px;">${playerArchetype.emoji}</div>
          <h3 style="color: #ff6b6b; font-size: 2em; margin: 0 0 15px 0;">${playerArchetype.name}</h3>
          <p style="color: #4ecdc4; font-size: 1.3em; margin: 10px 0;">${playerArchetype.description}</p>
          <blockquote style="
            color: #ccc;
            font-style: italic;
            font-size: 1.1em;
            border-left: 3px solid #ff6b6b;
            padding-left: 20px;
            margin: 20px 0;
          ">"${playerArchetype.quote}"</blockquote>
        ` : `
          <p style="color: #888; font-size: 1.2em;">No archetype determined - explore more of your Burning Man journey!</p>
        `}
      </div>
      
      ${unlockedAwards.length > 0 ? `
        <hr style="border: 1px solid #ff6b6b; margin: 30px 0;">
        <div style="margin-top: 30px;">
          <h2 style="color: #ffd23f; margin-bottom: 20px;">🏆 Awards Unlocked</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
            ${unlockedAwards.map(award => `
              <div style="
                background: rgba(255, 215, 0, 0.2);
                padding: 15px;
                border-radius: 10px;
                border: 1px solid #ffd700;
              ">
                <div style="font-size: 2em; margin-bottom: 10px;">${award.emoji}</div>
                <h4 style="color: #ffd23f; margin: 0 0 8px 0;">${award.name}</h4>
                <p style="color: #ccc; font-size: 0.9em; margin: 0;">${award.description}</p>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
      
      <button onclick="window.gameLoop.resetAndStart()" style="
        background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
        border: none;
        padding: 15px 30px;
        font-size: 1.2em;
        color: white;
        border-radius: 25px;
        cursor: pointer;
        font-family: 'Courier New', monospace;
        font-weight: bold;
        transition: transform 0.3s ease;
        margin-top: 30px;
      " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
        🔄 Play Again
      </button>
    `;
    
    overlay.appendChild(content);
    document.body.appendChild(overlay);
  }

  private updateHellStationAndArtCars(deltaTime: number): void {
    if (!this.gameState.hellStation) return;

    // Update Hell Station spawning
    const now = this.clock.now();
    const result = tickHellStation(
      this.gameState.hellStation,
      this.gameState.gasCans,
      now,
      this.rng
    );
    this.gameState.hellStation = result.station;
    this.gameState.gasCans = result.cans;
    
    // Debug logging for Hell Station (disabled to prevent spam)
    // if (this.gameState.gasCans.length > 0) {
    //   console.log(`⛽ Hell Station: ${this.gameState.gasCans.length} gas cans active`);
    // }

    // Update Art Cars
    this.gameState.artCars = this.gameState.artCars.map((car) => {
      const consumed = consumeFuel(car, deltaTime);
      
      // Check for gas can collision and refuel
      const collisionResult = checkArtCarGasCanCollision(consumed, this.gameState.gasCans);
      let carWithFuel = collisionResult.car;
      
      // Remove gas can if art car consumed it
      if (collisionResult.collided && collisionResult.canId) {
        this.gameState.gasCans = this.gameState.gasCans.filter(can => can.id !== collisionResult.canId);
      }
      
      const newState = decideArtCarState(carWithFuel, {
        cans: this.gameState.gasCans,
        station: this.gameState.hellStation!,
        player: this.gameState.player
      });
      const target = seekGasTarget(carWithFuel, {
        cans: this.gameState.gasCans,
        station: this.gameState.hellStation!,
        player: this.gameState.player
      });
      
      // Debug logging for art car states
      if (newState === 'seekFuel') {
        console.log(`🚗 Art Car ${carWithFuel.id}: seeking fuel, fuel level: ${carWithFuel.fuel}/${carWithFuel.fuelMax}`);
      }

      let updatedCar = { ...carWithFuel, state: newState };

      // Simple steering toward target using design-specific speed
      if (target.targetPos && newState === 'seekFuel') {
        const dx = target.targetPos.x - updatedCar.pos.x;
        const dy = target.targetPos.y - updatedCar.pos.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 5) {
          const baseSpeed = 40;
          const speed = baseSpeed * updatedCar.speed; // Use design-specific speed
          updatedCar.vel.x = (dx / dist) * speed;
          updatedCar.vel.y = (dy / dist) * speed;
        }
      }

      return tickArtCarKinematics(updatedCar, deltaTime, { width: 4000, height: 3000 });
    });
  }

  /**
   * Update notifications
   */
  private updateNotifications(deltaTime: number): void {
    const notificationSystem = getNotificationSystem();
    notificationSystem.updateNotifications(deltaTime);
  }


  /**
   * Calculate speed multiplier from active drug effects
   */
  private calculateDrugSpeedMultiplier(): number {
    let speedMultiplier = 1.0;
    
    for (const drug of this.gameState.player.drugs.active) {
      if (drug.effects.speed) {
        speedMultiplier += (drug.effects.speed * drug.intensity) / 100; // Convert percentage to multiplier
      }
    }
    
    return Math.max(0.1, speedMultiplier); // Minimum 10% speed
  }

  /**
   * Show notifications for item usage
   */
  private showItemUsageNotifications(itemType: string): void {
    const itemDef = ITEM_DEFINITIONS[itemType as keyof typeof ITEM_DEFINITIONS];
    if (!itemDef) return;

    // Show notifications at the player's current position
    const playerPosition = this.gameState.player.position;

    // Show notifications for each stat effect
    if (itemDef.effects.thirst) {
      createStatNotification('thirst', itemDef.effects.thirst, playerPosition);
    }
    if (itemDef.effects.hunger) {
      createStatNotification('hunger', itemDef.effects.hunger, playerPosition);
    }
    if (itemDef.effects.energy) {
      createStatNotification('energy', itemDef.effects.energy, playerPosition);
    }
    if (itemDef.effects.mood) {
      createStatNotification('mood', itemDef.effects.mood, playerPosition);
    }
    if (itemDef.effects.karma) {
      createStatNotification('karma', itemDef.effects.karma, playerPosition);
    }
    if (itemDef.effects.speed) {
      createStatNotification('speed', itemDef.effects.speed, playerPosition);
    }
  }

  /**
   * Handle world transition
   */
  private handleWorldTransition(transition: any, oldWorldId: string): void {
    // Handle bike persistence across world transitions
    if (this.gameState.player.isOnBike && this.gameState.player.mountedBikeId) {
      const worldStateManager = this.worldManager.getWorldStateManager();
      
      // Get the bike from the old world
      const oldWorldState = worldStateManager.getWorldState(oldWorldId);
      const oldCollectibles = oldWorldState?.items || [];
      const mountedBike = oldCollectibles.find(c => c.id === this.gameState.player.mountedBikeId);
      
      if (mountedBike) {
        // Remove bike from old world
        worldStateManager.removeWorldItem(oldWorldId, mountedBike.id);
        
        // Add bike to new world at player's new position
        const newWorldId = transition.newWorldId;
        const bikeInNewWorld = {
          ...mountedBike,
          position: { ...transition.newPosition }
        };
        worldStateManager.addWorldItem(newWorldId, bikeInNewWorld);
      }
    }
    
    // Update player position to new world position
    this.gameState.player.position = transition.newPosition;
    
    // Update camera to new world
    const worldDimensions = this.worldManager.getCurrentWorldDimensions();
    this.camera.worldBounds = {
      minX: 0,
      minY: 0,
      maxX: worldDimensions.width,
      maxY: worldDimensions.height
    };
    
    // Set camera position to new player position
    setCameraPosition(this.camera, transition.newPosition);
    
    // Rebuild spatial index for new world
    this.spatialIndex = createSpatialIndex(
      worldDimensions.width,
      worldDimensions.height,
      100
    );
    
    // Load or spawn coins for new world
    this.loadCoinsForCurrentWorld();
    
    // Play transition sound
    this.audio.playSound('gameStart', 0.3);
    
    // Log transition message
    if (transition.message) {
      console.log(transition.message);
    }
  }

  /**
   * Load or spawn coins for current world
   */
  private loadCoinsForCurrentWorld(): void {
    const worldId = this.worldManager.getCurrentWorldId();
    const worldStateManager = this.worldManager.getWorldStateManager();
    const worldState = worldStateManager.getWorldState(worldId);
    
    // Check if coins already exist in world state
    const existingCoins = worldState.items.filter(item => item.type === 'coin');
    
    if (existingCoins.length > 0) {
      // Load existing coins
      this.gameState.coins = existingCoins.map(item => ({
        id: item.id,
        position: item.position,
        value: item.data?.value || 1,
        collected: item.collected
      }));
      
      // Add non-collected coins to spatial index
      this.gameState.coins.forEach(coin => {
        if (!coin.collected) {
          addEntity(this.spatialIndex, {
            id: coin.id,
            position: coin.position,
            radius: 8,
          });
        }
      });
    } else {
      // Spawn new coins for this world
      this.spawnCoinsForCurrentWorld();
    }
  }

  /**
   * Spawn coins for current world
   */
  private spawnCoinsForCurrentWorld(): void {
    const worldId = this.worldManager.getCurrentWorldId();
    const worldDimensions = this.worldManager.getCurrentWorldDimensions();
    const playerSpawn = this.gameState.player.position;
    const worldStateManager = this.worldManager.getWorldStateManager();
    
    this.rng.setSeed(this.config.seed + worldId.length);
    
    // Calculate spawn multiplier based on current day
    const spawnMultiplier = getSpawnMultiplier(this.gameState.time.day);
    // Additional world-based multiplier (Playa needs 4x items)
    const worldIdForSpawns = this.worldManager.getCurrentWorldId();
    const worldSpawnBoost = worldIdForSpawns === 'playa' ? 4 : 1;
    
    // Spawn all collectibles (coins, water, food, drugs, bikes) with day-based multiplier
    const coinCount = Math.floor(this.config.coinCount * spawnMultiplier * worldSpawnBoost * 4); // 4x Playa boost
    const waterCount = Math.floor(8 * spawnMultiplier * worldSpawnBoost * 4);
    const foodCount = Math.floor(10 * spawnMultiplier * worldSpawnBoost * 4);
    const drugCount = Math.floor(5 * spawnMultiplier * worldSpawnBoost * 4);
    const bikeCount = Math.floor(3.33 * spawnMultiplier * worldSpawnBoost * 4);
    const lightBulbCount = Math.floor(4 * spawnMultiplier * worldSpawnBoost * 4); // 2x more light bulbs
    const batteryCount = Math.floor(2 * spawnMultiplier * worldSpawnBoost * 4); // 2x more batteries

    const collectibles = spawnCollectibles(
      this.rng,
      worldDimensions.width,
      worldDimensions.height,
      playerSpawn,
      this.spatialIndex,
      coinCount,
      waterCount,
      foodCount,
      drugCount,
      bikeCount,
      lightBulbCount,
      batteryCount
    );
    
    // Spawn moop items with day-based multiplier
    const moopCount = Math.floor(120 * spawnMultiplier * worldSpawnBoost); // 2x previous moop count
    const moopConfig: MoopSpawnConfig = {
      count: moopCount,
      minDistanceFromPlayer: 100,
      minDistanceFromOtherMoop: 30,
      worldBounds: {
        minX: 0,
        maxX: worldDimensions.width,
        minY: 0,
        maxY: worldDimensions.height,
      },
    };
    
    const moop = spawnMoop(moopConfig, playerSpawn, [], this.rng);
    
    // Add moop to game state
    this.gameState.moop = moop;
    
    // console.log muted: spawn summary
    
    // Filter out just the coins for the coins array (for backward compatibility)
    this.gameState.coins = collectibles
      .filter(c => c.type === 'coin')
      .map(c => ({
        id: c.id,
        position: c.position,
        value: c.value,
        collected: c.collected,
      }));
    
    // Add all collectibles to world state
    collectibles.forEach(collectible => {
      worldStateManager.addWorldItem(worldId, {
        id: collectible.id,
        type: collectible.type,
        position: collectible.position,
        collected: collectible.collected,
        data: { 
          value: collectible.value,
          subtype: collectible.subtype
        }
      });
    });
  }

  /**
   * Render the game
   */
  private render(): void {
    const baseBackgroundColor = this.worldManager.getCurrentWorldBackgroundColor();
    const backgroundColor = getBackgroundColor(this.gameState.time, baseBackgroundColor);
    const landmarks = getWorldLandmarks(this.worldManager.getCurrentWorldId(), this.gameState.time);
    const isMuted = this.audio.isMuted();
    const worldTimeScale = this.worldManager.getCurrentTimeScale();
    const drugTimeScale = calculateTimeScale(this.gameState.player.drugs);
    const effectiveTimeScale = worldTimeScale * drugTimeScale;
    const activeDrugs = this.gameState.player.drugs.active;
    
    // Get collectibles from world state
    const worldId = this.worldManager.getCurrentWorldId();
    const worldStateManager = this.worldManager.getWorldStateManager();
    const worldState = worldStateManager.getWorldState(worldId);
    const collectibles = worldState?.items || [];
    
    // Update mouse position for hover effects
    this.renderer.updateMousePosition(this.inputHandler.getMousePosition());
    
    // Calculate bike and art car proximity for action panel
    const playerPos = this.gameState.player.position;
    const nearBike = collectibles.find(c => !c.collected && c.type === 'bike' && distance(playerPos, c.position) < 40);
    const nearbyArtCar = this.gameState.artCars.find(car => {
      const dist = Math.hypot(playerPos.x - car.pos.x, playerPos.y - car.pos.y);
      return dist < 80;
    });
    const isOnArtCar = !!this.gameState.player.mountedOn;
    
    this.renderer.render(this.gameState, this.camera, this.spatialIndex, backgroundColor, landmarks, isMuted, effectiveTimeScale, activeDrugs, this.worldManager.getCurrentWorldId(), collectibles, this.gameState.moop as any, this.campMates, this.getRecentCoinChange(), this.getRecentKarmaChange(), nearBike, nearbyArtCar, isOnArtCar);
    
    // Check for portal proximity and handle automatic warping
    this.checkPortalProximity(landmarks);
    
    // Check for camp interactions (Hell Station, Center Camp)
    this.checkCampInteractions(landmarks);
    
    // Check for portopotty interactions
    this.checkPortopottyInteractions();
    
    // Reset used portopotties after cooldown
    this.resetUsedPortopotties();
    
    // Check for critical stat warnings
    this.checkStatWarnings();
    
    // Check and unlock awards
    this.checkAndUnlockAwards();
    
    // Dispatch game state update event for HTML UI panels
    window.dispatchEvent(new CustomEvent('gameStateUpdate', { 
      detail: {
        ...this.gameState,
        coinChange: this.getRecentCoinChange(),
        karmaChange: this.getRecentKarmaChange()
      }
    }));
    
    // Clear input states for next frame
    this.inputHandler.clearKeyPressed();
  }

  /**
   * Check if player is near any portals and automatically warp them
   */
  private checkPortalProximity(landmarks: any[]): void {
    const playerPos = this.gameState.player.position;
    const warpDistance = 80; // Distance at which portal warps the player
    
    for (const landmark of landmarks) {
      if (landmark.type === 'artCar') {
        const distance = Math.sqrt(
          Math.pow(playerPos.x - landmark.position.x, 2) + 
          Math.pow(playerPos.y - landmark.position.y, 2)
        );
        
        if (distance <= warpDistance) {
          this.handlePortalWarp(landmark.id);
          break; // Only warp once per frame
        }
      }
    }
  }

  /**
   * Handle portal warping when player touches a portal
   */
  private handlePortalWarp(portalId: string): void {
    console.log('🌀 Portal warp triggered by proximity:', portalId);
    
    // Generate random warp positions within the playa bounds
    const playaBounds = { minX: 0, maxX: 4000, minY: 0, maxY: 4000 };
    const randomX = Math.random() * (playaBounds.maxX - playaBounds.minX) + playaBounds.minX;
    const randomY = Math.random() * (playaBounds.maxY - playaBounds.minY) + playaBounds.minY;
    
    // Warp the player to a random location
    this.gameState.player.position.x = randomX;
    this.gameState.player.position.y = randomY;
    
    // Temporarily increase camera follow speed for faster movement during warp
    const originalFollowSpeed = this.camera.followSpeed;
    this.camera.followSpeed = 1000; // Much faster camera movement (4x normal speed)
    
    // Reset camera speed after a short delay
    setTimeout(() => {
      this.camera.followSpeed = originalFollowSpeed;
    }, 1000); // 1 second of fast camera movement
    
    console.log('🌀 Warped to:', { x: randomX, y: randomY });
  }

  /**
   * Reset used portopotties after cooldown period (10 seconds)
   */
  private resetUsedPortopotties(): void {
    const currentTime = Date.now();
    const cooldownPeriod = 10000; // 10 seconds
    
    for (const porto of this.gameState.portopotties) {
      if (porto.used && porto.usedTime && (currentTime - porto.usedTime) > cooldownPeriod) {
        porto.used = false;
        porto.usedTime = undefined;
        // console.log muted: portopotty reset
      }
    }
  }

  /**
   * Check for portopotty interactions and handle bathroom reset
   */
  private checkPortopottyInteractions(): void {
    const playerPos = this.gameState.player.position;
    const interactionDistance = 80; // Distance for portopotty interaction
    
    for (const porto of this.gameState.portopotties) {
      const distance = Math.sqrt(
        Math.pow(playerPos.x - porto.position.x, 2) + 
        Math.pow(playerPos.y - porto.position.y, 2)
      );
      
      // Debug: Log when player gets close to portopotties
      if (distance <= interactionDistance + 20 && distance > interactionDistance - 10 && !porto.used) {
        // console.log muted: portopotty proximity
      }
      
      if (distance <= interactionDistance && !porto.used) {
        // Check if toilet is broken
        if (porto.broken) {
          // Only show notification if not already discovered
          if (!porto.discoveredBroken) {
            // Mark as discovered broken
            porto.discoveredBroken = true;
            
            // Show broken toilet message (won't combine due to notification system logic)
            const system = getNotificationSystem();
            system.addNotification('💩 Sorry, you can\'t poop there, the toilet is fucked', 'warning', 4000, playerPos);
            
            // Play different sound for broken toilet
            this.audio.playSound('buttonClick', 0.3);
            
            console.log(`💩 Broken portopotty ${porto.id} at (${porto.position.x}, ${porto.position.y}) - toilet is fucked`);
          }
          break; // Only interact with one portopotty at a time
        }
        
        // Only reset bathroom for working toilets
        // Reset bathroom stat to 0
        this.gameState.player.stats.bathroom = 0;
        
        // Mark portopotty as used with timestamp
        porto.used = true;
        porto.usedTime = Date.now();
        
        // Show notification
        const system = getNotificationSystem();
        system.addNotification('🚽 Bathroom break complete!', 'temporary', 3000, playerPos);
        
        // Play sound
        this.audio.playSound('buttonClick', 0.5);
        
        console.log(`🚽 Used portopotty ${porto.id} at (${porto.position.x}, ${porto.position.y}), bathroom reset from ${this.gameState.player.stats.bathroom.toFixed(1)} to 0`);
        break; // Only use one portopotty at a time
      }
    }
  }

  /**
   * Check and unlock awards based on player progress
   */
  private checkAndUnlockAwards(): void {
    const gameTimeHours = this.gameState.time.totalMinutes / 60; // Convert minutes to hours
    this.awards = checkAndUnlockAwards(
      this.awards,
      this.gameState.player.stats,
      this.achievements,
      this.gameState.player.inventory,
      this.totalDrugsTaken,
      gameTimeHours,
      this.totalMoopCollected
    );
  }

  /**
   * Show end game archetype screen
   */
  public showArchetypeScreen(): void {
    const gameTimeHours = this.gameState.time.totalMinutes / 60; // Convert minutes to hours
    const playerArchetype = calculatePlayerArchetype(
      this.gameState.player.stats,
      this.achievements,
      this.gameState.player.inventory,
      this.totalDrugsTaken,
      gameTimeHours
    );

    const unlockedAwards = this.awards.filter(award => award.unlocked);
    
    // Create archetype screen overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.95);
      color: white;
      font-family: 'Courier New', monospace;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
      box-sizing: border-box;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      max-width: 800px;
      text-align: center;
      background: linear-gradient(135deg, #1a1a1a, #2d2d2d);
      border: 3px solid #8b5cf6;
      border-radius: 20px;
      padding: 40px;
      box-shadow: 0 0 50px rgba(139, 92, 246, 0.5);
    `;

    const title = document.createElement('h1');
    title.style.cssText = `
      font-size: 3em;
      margin: 0 0 20px 0;
      background: linear-gradient(45deg, #FFD700, #FFA500);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
    `;
    title.textContent = '🔥 BURNING MAN COMPLETE 🔥';

    const archetypeSection = document.createElement('div');
    archetypeSection.style.cssText = `
      margin: 30px 0;
      padding: 30px;
      background: rgba(139, 92, 246, 0.1);
      border-radius: 15px;
      border: 2px solid ${playerArchetype?.color || '#8b5cf6'};
    `;

    if (playerArchetype) {
      const archetypeEmoji = document.createElement('div');
      archetypeEmoji.style.cssText = 'font-size: 4em; margin-bottom: 15px;';
      archetypeEmoji.textContent = playerArchetype.emoji;

      const archetypeName = document.createElement('h2');
      archetypeName.style.cssText = `
        font-size: 2em;
        margin: 0 0 10px 0;
        color: ${playerArchetype.color};
        text-shadow: 0 0 10px ${playerArchetype.color}50;
      `;
      archetypeName.textContent = playerArchetype.name;

      const archetypeDesc = document.createElement('p');
      archetypeDesc.style.cssText = 'font-size: 1.2em; margin: 10px 0; color: #ccc;';
      archetypeDesc.textContent = playerArchetype.description;

      const archetypeQuote = document.createElement('blockquote');
      archetypeQuote.style.cssText = `
        font-size: 1.1em;
        font-style: italic;
        margin: 20px 0;
        padding: 15px;
        background: rgba(0, 0, 0, 0.3);
        border-left: 4px solid ${playerArchetype.color};
        border-radius: 5px;
      `;
      archetypeQuote.textContent = `"${playerArchetype.quote}"`;

      archetypeSection.appendChild(archetypeEmoji);
      archetypeSection.appendChild(archetypeName);
      archetypeSection.appendChild(archetypeDesc);
      archetypeSection.appendChild(archetypeQuote);
    } else {
      const defaultText = document.createElement('p');
      defaultText.style.cssText = 'font-size: 1.5em; color: #888;';
      defaultText.textContent = '🌟 Your Burning Man journey continues... 🌟';
      archetypeSection.appendChild(defaultText);
    }

    const statsSection = document.createElement('div');
    statsSection.style.cssText = `
      margin: 30px 0;
      padding: 20px;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 10px;
    `;

    const statsTitle = document.createElement('h3');
    statsTitle.style.cssText = 'color: #8b5cf6; margin-bottom: 15px;';
    statsTitle.textContent = '📊 Your Journey Stats';

    const statsGrid = document.createElement('div');
    statsGrid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-top: 15px;
    `;

    // Calculate play time in seconds and add bonus time distortion
    const gameTimeSeconds = this.gameState.time.totalMinutes * 60; // Convert to seconds
    const timeDistortionBonus = this.totalDrugsTaken * 5; // 5 seconds bonus per drug taken
    const totalTimeWithBonus = gameTimeSeconds + timeDistortionBonus;
    
    const stats = [
      { label: '⏰ Time Played', value: `${totalTimeWithBonus.toFixed(0)} seconds` },
      { label: '🌀 Time Distortion Bonus', value: `+${timeDistortionBonus.toFixed(0)}s from ${this.totalDrugsTaken} drugs` },
      { label: '🗑️ Moop Collected', value: `${this.totalMoopCollected} pieces` },
      { label: '✨ Karma Earned', value: `${this.gameState.player.stats.karma.toFixed(0)}` },
      { label: '🪙 Coins Found', value: `${this.gameState.player.stats.coins}` },
      { label: '🏆 Achievements', value: `${this.achievements.size}` },
      { label: '🎖️ Awards Unlocked', value: `${unlockedAwards.length}/${this.awards.length}` },
    ];

    stats.forEach(stat => {
      const statDiv = document.createElement('div');
      statDiv.style.cssText = `
        padding: 10px;
        background: rgba(139, 92, 246, 0.1);
        border-radius: 8px;
        border: 1px solid rgba(139, 92, 246, 0.3);
      `;
      
      const label = document.createElement('div');
      label.style.cssText = 'font-size: 0.9em; color: #aaa; margin-bottom: 5px;';
      label.textContent = stat.label;
      
      const value = document.createElement('div');
      value.style.cssText = 'font-size: 1.2em; font-weight: bold; color: #8b5cf6;';
      value.textContent = stat.value;
      
      statDiv.appendChild(label);
      statDiv.appendChild(value);
      statsGrid.appendChild(statDiv);
    });

    statsSection.appendChild(statsTitle);
    statsSection.appendChild(statsGrid);

    const awardsSection = document.createElement('div');
    if (unlockedAwards.length > 0) {
      awardsSection.style.cssText = `
        margin: 30px 0;
        padding: 20px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 10px;
      `;

      const awardsTitle = document.createElement('h3');
      awardsTitle.style.cssText = 'color: #FFD700; margin-bottom: 15px;';
      awardsTitle.textContent = '🏆 Awards Unlocked';

      const awardsGrid = document.createElement('div');
      awardsGrid.style.cssText = `
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 10px;
        margin-top: 15px;
      `;

      unlockedAwards.forEach(award => {
        const awardDiv = document.createElement('div');
        awardDiv.style.cssText = `
          padding: 10px;
          background: rgba(255, 215, 0, 0.1);
          border-radius: 8px;
          border: 1px solid rgba(255, 215, 0, 0.3);
          display: flex;
          align-items: center;
          gap: 10px;
        `;
        
        const emoji = document.createElement('span');
        emoji.style.cssText = 'font-size: 1.5em;';
        emoji.textContent = award.emoji;
        
        const text = document.createElement('div');
        const name = document.createElement('div');
        name.style.cssText = 'font-weight: bold; color: #FFD700;';
        name.textContent = award.name;
        const desc = document.createElement('div');
        desc.style.cssText = 'font-size: 0.9em; color: #ccc;';
        desc.textContent = award.description;
        
        text.appendChild(name);
        text.appendChild(desc);
        awardDiv.appendChild(emoji);
        awardDiv.appendChild(text);
        awardsGrid.appendChild(awardDiv);
      });

      awardsSection.appendChild(awardsTitle);
      awardsSection.appendChild(awardsGrid);
    }

    const closeButton = document.createElement('button');
    closeButton.style.cssText = `
      margin-top: 30px;
      padding: 15px 30px;
      font-size: 1.2em;
      background: linear-gradient(45deg, #8b5cf6, #7c3aed);
      color: white;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.3s ease;
    `;
    closeButton.textContent = 'Continue Your Journey';
    closeButton.onclick = () => {
      document.body.removeChild(overlay);
    };
    closeButton.onmouseover = () => {
      closeButton.style.transform = 'scale(1.05)';
      closeButton.style.boxShadow = '0 0 20px rgba(139, 92, 246, 0.5)';
    };
    closeButton.onmouseout = () => {
      closeButton.style.transform = 'scale(1)';
      closeButton.style.boxShadow = 'none';
    };

    content.appendChild(title);
    content.appendChild(archetypeSection);
    content.appendChild(statsSection);
    if (unlockedAwards.length > 0) {
      content.appendChild(awardsSection);
    }
    content.appendChild(closeButton);
    overlay.appendChild(content);
    document.body.appendChild(overlay);
  }

  /**
   * Check for critical stat warnings and notify player
   */
  private checkStatWarnings(): void {
    const currentTime = this.clock.now();
    const stats = this.gameState.player.stats;
    const system = getNotificationSystem();
    
    // Only check for warnings every few seconds to avoid spam
    if (currentTime - this.lastStatWarningTime < this.statWarningCooldown) {
      return;
    }
    
    // Check each stat for critical levels
    if (stats.energy <= 15) {
      system.addNotification('⚡ You are exhausted! You need to get some rest!', 'temporary', 4000, this.gameState.player.position);
      this.lastStatWarningTime = currentTime;
      this.audio.playSound('buttonClick', 0.3);
    } else if (stats.thirst >= 85) {
      system.addNotification('💧 You are severely dehydrated! Find water immediately!', 'temporary', 4000, this.gameState.player.position);
      this.lastStatWarningTime = currentTime;
      this.audio.playSound('buttonClick', 0.3);
    } else if (stats.hunger >= 85) {
      system.addNotification('🍔 You are starving! You need food right now!', 'temporary', 4000, this.gameState.player.position);
      this.lastStatWarningTime = currentTime;
      this.audio.playSound('buttonClick', 0.3);
    } else if (stats.mood <= 15) {
      system.addNotification('😢 You are deeply depressed! Do something fun or eat some food!', 'temporary', 4000, this.gameState.player.position);
      this.lastStatWarningTime = currentTime;
      this.audio.playSound('buttonClick', 0.3);
    } else if (stats.bathroom >= 85) {
      system.addNotification('🚽 You desperately need a bathroom! Find a portopotty!', 'temporary', 4000, this.gameState.player.position);
      this.lastStatWarningTime = currentTime;
      this.audio.playSound('buttonClick', 0.3);
    }
  }

  /**
   * Check if player is near any camps and show dialogue options
   */
  private checkCampInteractions(landmarks: any[]): void {
    const playerPos = this.gameState.player.position;
    const interactionDistance = 100; // Distance at which camp interactions are available
    let nearAnyCamp = false;
    
    // Check if we're in cooldown period after closing dialogue
    const currentTime = Date.now();
    const timeSinceClose = currentTime - this.lastDialogueCloseTime;
    const dialogueCooldown = 3000; // 3 second cooldown after closing
    
    for (const landmark of landmarks) {
      if (landmark.type === 'camp' && (landmark.id === 'hell-station' || landmark.id === 'center-camp')) {
        const distance = Math.sqrt(
          Math.pow(playerPos.x - landmark.position.x, 2) + 
          Math.pow(playerPos.y - landmark.position.y, 2)
        );
        
        if (distance <= interactionDistance) {
          nearAnyCamp = true;
          // Only show dialogue if not in cooldown and no dialogue is open
          if (!this.dialogueOverlay && timeSinceClose > dialogueCooldown) {
            this.showCampDialogue(landmark);
            break; // Only show one dialogue at a time
          }
        }
      }
    }
    
    // If player is not near any camp and a camp dialogue is open, close it
    if (!nearAnyCamp && this.dialogueOverlay && this.dialogueOverlay.dataset.dialog !== 'gift') {
      this.closeDialogue();
    }
  }

  /**
   * Show dialogue for camp interactions
   */
  private showCampDialogue(landmark: any): void {
    if (this.dialogueOverlay) return; // Prevent multiple dialogues
    
    this.dialogueOverlay = document.createElement('div');
    this.dialogueOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      font-family: system-ui, -apple-system, sans-serif;
    `;
    
    const dialogueBox = document.createElement('div');
    dialogueBox.style.cssText = `
      background: linear-gradient(135deg, #2c3e50, #34495e);
      border: 3px solid #f39c12;
      border-radius: 15px;
      padding: 30px;
      max-width: 500px;
      text-align: center;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    `;
    
    let content = '';
    if (landmark.id === 'hell-station') {
      content = `
        <h2 style="color: #f39c12; margin: 0 0 20px 0; font-size: 24px;">⛽ Hell Station</h2>
        <p style="color: #ecf0f1; margin: 0 0 20px 0; font-size: 16px;">
          Buy gas for the art cars?<br>
          <strong>Cost:</strong> 40 coins<br>
          <strong>Reward:</strong> 20 karma
        </p>
        <div style="display: flex; gap: 15px; justify-content: center;">
          <button id="buy-gas" style="
            background: linear-gradient(135deg, #27ae60, #2ecc71);
            border: none;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
          ">Buy Gas (40 coins)</button>
          <button id="close-dialogue" style="
            background: linear-gradient(135deg, #e74c3c, #c0392b);
            border: none;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
          ">Cancel</button>
        </div>
      `;
    } else if (landmark.id === 'center-camp') {
      content = `
        <h2 style="color: #3498db; margin: 0 0 20px 0; font-size: 24px;">🏕️ Center Camp</h2>
        <p style="color: #ecf0f1; margin: 0 0 20px 0; font-size: 16px;">
          What would you like to buy?<br>
          <strong>Cost:</strong> 10 coins each<br>
          <strong>Ice:</strong> +5 karma<br>
          <strong>Tea:</strong> +20 energy
        </p>
        <div style="display: flex; gap: 15px; justify-content: center;">
          <button id="buy-ice" style="
            background: linear-gradient(135deg, #3498db, #5dade2);
            border: none;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
          ">🧊 Buy Ice (10 coins)</button>
          <button id="buy-tea" style="
            background: linear-gradient(135deg, #8b4513, #a0522d);
            border: none;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
          ">🍵 Buy Tea (10 coins)</button>
          <button id="close-dialogue" style="
            background: linear-gradient(135deg, #e74c3c, #c0392b);
            border: none;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
          ">Cancel</button>
        </div>
      `;
    }
    
    dialogueBox.innerHTML = content;
    this.dialogueOverlay.appendChild(dialogueBox);
    document.body.appendChild(this.dialogueOverlay);
    
    // Add event listeners
    const buyGasBtn = document.getElementById('buy-gas');
    const buyIceBtn = document.getElementById('buy-ice');
    const buyTeaBtn = document.getElementById('buy-tea');
    const closeBtn = document.getElementById('close-dialogue');
    
    if (buyGasBtn) {
      buyGasBtn.addEventListener('click', () => this.handleBuyGas());
    }
    if (buyIceBtn) {
      buyIceBtn.addEventListener('click', () => this.handleBuyIce());
    }
    if (buyTeaBtn) {
      buyTeaBtn.addEventListener('click', () => this.handleBuyTea());
    }
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeDialogue());
    }
    
    // Close on background click
    this.dialogueOverlay.addEventListener('click', (e) => {
      if (e.target === this.dialogueOverlay) {
        this.closeDialogue();
      }
    });
  }

  /**
   * Handle buying gas at Hell Station
   */
  private handleBuyGas(): void {
    const cost = 40;
    const karmaReward = 20;
    
    if (this.gameState.player.stats.coins >= cost) {
      this.gameState.player.stats.coins -= cost;
      this.gameState.player.stats.karma += karmaReward;
      
      // Add notification
      const notification = createStatNotification('karma', karmaReward, 'Gas purchase');
      getNotificationSystem().addNotification(notification);
      
      console.log(`⛽ Bought gas: -${cost} coins, +${karmaReward} karma`);
      this.closeDialogue();
    } else {
      alert('Not enough coins! You need 40 coins to buy gas.');
    }
  }

  /**
   * Handle buying ice at Center Camp
   */
  private handleBuyIce(): void {
    const cost = 10;
    const karmaReward = 5;
    
    if (this.gameState.player.stats.coins >= cost) {
      // Track changes for HUD
      this.trackCoinChange(-cost);
      this.trackKarmaChange(karmaReward);
      
      this.gameState.player.stats.coins -= cost;
      this.gameState.player.stats.karma += karmaReward;
      
      // Add notification
      const system = getNotificationSystem();
      system.addNotification(`🧊 Bought Ice: -${cost} coins, +${karmaReward} karma`, 'item', karmaReward, this.gameState.player.position);
      
      console.log(`🧊 Bought ice: -${cost} coins, +${karmaReward} karma`);
      this.closeDialogue();
    } else {
      alert('Not enough coins! You need 10 coins to buy ice.');
    }
  }

  /**
   * Handle buying tea at Center Camp
   */
  private handleBuyTea(): void {
    const cost = 10;
    const energyReward = 20; // Tea gives energy, not karma
    
    if (this.gameState.player.stats.coins >= cost) {
      // Track changes for HUD
      this.trackCoinChange(-cost);
      
      this.gameState.player.stats.coins -= cost;
      this.gameState.player.stats.energy = Math.min(100, this.gameState.player.stats.energy + energyReward);
      
      // Add notification
      const system = getNotificationSystem();
      system.addNotification(`🍵 Bought Tea: -${cost} coins, +${energyReward} energy`, 'energy', energyReward, this.gameState.player.position);
      
      console.log(`🍵 Bought tea: -${cost} coins, +${energyReward} energy`);
      this.closeDialogue();
    } else {
      alert('Not enough coins! You need 10 coins to buy tea.');
    }
  }

  /**
   * Close the dialogue overlay
   */
  private closeDialogue(): void {
    if (this.dialogueOverlay) {
      document.body.removeChild(this.dialogueOverlay);
      this.dialogueOverlay = null;
      // Set cooldown timer to prevent immediate re-opening
      this.lastDialogueCloseTime = Date.now();
    }
  }

  /**
   * Update camp mates movement
   */
  private updateCampMates(deltaTime: number): void {
    const worldWidth = 1600; // Full camp world width
    const worldHeight = 1200; // Full camp world height
    const avoidanceRadius = 40; // Distance to avoid other camp mates
    const avoidanceForce = 2.0; // How strongly they avoid each other
    
    // Handle wombat spawning when following to playa
    if (this.gameState.player.equippedItem === 'Totem') {
      const currentWorldId = this.worldManager.getCurrentWorldId();
      const isOnPlaya = currentWorldId !== 'camp';
      
      if (isOnPlaya && this.wombatsAtCamp > 0) {
        // Spawn a wombat from camp to follow player on playa
        this.spawnWombatFromCamp();
        this.wombatsAtCamp--;
        this.wombatsOnPlaya++;
        console.log(`🏕️ Wombat followed to playa! Camp: ${this.wombatsAtCamp}, Playa: ${this.wombatsOnPlaya}`);
      }
    } else {
      // When totem is not equipped, wombats stay on playa but wander around
      // Check if any wandering wombats have overlapped with camp area and send them back
      const currentWorldId = this.worldManager.getCurrentWorldId();
      if (currentWorldId === 'playa') {
        this.checkForWombatsOverlappingCamp();
      }
    }
    
    this.campMates.forEach((campMate) => {
      // Check if player has totem equipped - if so, wombats should follow the player
      let targetX, targetY;
      if (this.gameState.player.equippedItem === 'Totem') {
        // Follow the player with individual positioning to prevent clustering
        const playerAngle = Math.atan2(
          this.gameState.player.position.y - campMate.position.y,
          this.gameState.player.position.x - campMate.position.x
        );
        
        // Create unique positioning for each wombat using their ID
        const wombatId = parseInt(campMate.id.replace('campmate-', ''));
        const uniqueAngle = (wombatId * 0.5) % (Math.PI * 2); // Each wombat gets a unique angle
        const behindAngle = playerAngle + Math.PI + uniqueAngle;
        
        // Vary the distance slightly for each wombat
        const distance = 15 + (wombatId % 3) * 5; // 15, 20, or 25 pixels
        
        targetX = this.gameState.player.position.x + Math.cos(behindAngle) * distance;
        targetY = this.gameState.player.position.y + Math.sin(behindAngle) * distance;
      } else {
        // When not following player, wombats wander around the playa
        const currentWorldId = this.worldManager.getCurrentWorldId();
        if (currentWorldId === 'playa') {
          // On playa - wander around in a larger area
          targetX = campMate.targetPosition.x;
          targetY = campMate.targetPosition.y;
        } else {
          // In camp - use original camp-based random movement
          targetX = campMate.targetPosition.x;
          targetY = campMate.targetPosition.y;
        }
      }
      
      // Calculate distance to target
      const dx = targetX - campMate.position.x;
      const dy = targetY - campMate.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // If reached target or very close, pick a new target (only if not following player)
      if (distance < 10 && this.gameState.player.equippedItem !== 'Totem') {
        const currentWorldId = this.worldManager.getCurrentWorldId();
        if (currentWorldId === 'playa') {
          // On playa - wander around in a much larger area (no boundaries)
          const wanderRadius = 800; // Much larger wandering radius - wombats can explore far and wide
          const targetAngle = this.rng.random() * Math.PI * 2;
          const targetDistance = this.rng.random() * wanderRadius;
          campMate.targetPosition.x = campMate.position.x + Math.cos(targetAngle) * targetDistance;
          campMate.targetPosition.y = campMate.position.y + Math.sin(targetAngle) * targetDistance;
        } else {
          // In camp - use full world random movement
          campMate.targetPosition.x = this.rng.random() * worldWidth;
          campMate.targetPosition.y = this.rng.random() * worldHeight;
        }
      } else {
        // Move towards target - faster when following player
        const baseSpeed = this.gameState.player.equippedItem === 'Totem' ? 80 : 50;
        const moveDistance = campMate.speed * deltaTime * baseSpeed;
        let moveX = (dx / distance) * moveDistance;
        let moveY = (dy / distance) * moveDistance;
        
        // Collision avoidance with other camp mates
        let avoidanceX = 0;
        let avoidanceY = 0;
        
        this.campMates.forEach((otherMate) => {
          if (otherMate.id !== campMate.id) {
            const otherDx = campMate.position.x - otherMate.position.x;
            const otherDy = campMate.position.y - otherMate.position.y;
            const otherDistance = Math.sqrt(otherDx * otherDx + otherDy * otherDy);
            
            // If too close, add avoidance force
            if (otherDistance < avoidanceRadius && otherDistance > 0) {
              const avoidanceStrength = (avoidanceRadius - otherDistance) / avoidanceRadius;
              const normalizedX = otherDx / otherDistance;
              const normalizedY = otherDy / otherDistance;
              
              avoidanceX += normalizedX * avoidanceStrength * avoidanceForce;
              avoidanceY += normalizedY * avoidanceStrength * avoidanceForce;
            }
          }
        });
        
        // Combine target movement with avoidance
        moveX += avoidanceX * deltaTime * 30;
        moveY += avoidanceY * deltaTime * 30;
        
        campMate.position.x += moveX;
        campMate.position.y += moveY;
        
        // Only keep within world bounds if in camp world and not following the player
        // On playa, wombats have complete freedom to wander anywhere
        const currentWorldId = this.worldManager.getCurrentWorldId();
        if (this.gameState.player.equippedItem !== 'Totem' && currentWorldId === 'camp') {
          // Keep within world boundaries
          if (campMate.position.x < 0) campMate.position.x = 0;
          if (campMate.position.x > worldWidth) campMate.position.x = worldWidth;
          if (campMate.position.y < 0) campMate.position.y = 0;
          if (campMate.position.y > worldHeight) campMate.position.y = worldHeight;
        }
        // No boundary restrictions on playa - wombats can wander freely
      }
    });
  }

  /**
   * Check if wandering wombats have overlapped with camp area and send them back
   */
  private checkForWombatsOverlappingCamp(): void {
    // Get the camp area position (Boom Boom Womb landmark)
    const landmarks = getWorldLandmarks(this.worldManager.getCurrentWorldId(), this.gameState.time);
    const campLandmark = landmarks.find(l => l.id === 'playa-camp');
    
    if (!campLandmark) return;
    
    const campX = campLandmark.position.x;
    const campY = campLandmark.position.y;
    const campRadius = 100; // Camp area radius
    
    // Check each wombat for overlap with camp area
    const wombatsToReturn: number[] = [];
    
    this.campMates.forEach((campMate, index) => {
      const distanceFromCamp = Math.sqrt(
        Math.pow(campMate.position.x - campX, 2) + 
        Math.pow(campMate.position.y - campY, 2)
      );
      
      // If wombat is within camp radius, mark it for return
      if (distanceFromCamp <= campRadius) {
        wombatsToReturn.push(index);
      }
    });
    
    // Return wombats to camp (remove from playa)
    if (wombatsToReturn.length > 0) {
      // Remove from end of array to avoid index shifting issues
      wombatsToReturn.reverse().forEach(index => {
        this.campMates.splice(index, 1);
        this.wombatsOnPlaya--;
        this.wombatsAtCamp++;
      });
      
      console.log(`🏕️ ${wombatsToReturn.length} wombat(s) returned to camp due to overlap! Camp: ${this.wombatsAtCamp}, Playa: ${this.wombatsOnPlaya}`);
    }
  }

  /**
   * Spawn a wombat from camp to follow the player
   */
  private spawnWombatFromCamp(): void {
    const colors = [
      '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57',
      '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3', '#ff9f43',
      '#10ac84', '#ee5a24', '#0984e3', '#6c5ce7', '#a29bfe',
      '#fd79a8', '#fdcb6e', '#e17055', '#74b9ff', '#0984e3'
    ];
    const names = [
      'Wally', 'Wendy', 'Winston', 'Willow', 'Wade', 'Wanda', 'Wesley', 'Whitney',
      'Warren', 'Wren', 'Walker', 'Winter', 'Weston', 'Waverly', 'Wilder', 'Willa',
      'Wells', 'Wynn', 'Wyatt', 'Willa', 'Wade', 'Willa', 'Wren', 'Wade'
    ];
    
    // Get the Boom Boom Womb (playa-camp) landmark position
    const landmarks = getWorldLandmarks(this.worldManager.getCurrentWorldId(), this.gameState.time);
    const boomBoomWomb = landmarks.find(l => l.id === 'playa-camp');
    
    
    let spawnX, spawnY;
    if (boomBoomWomb) {
      // Spawn near the Boom Boom Womb landmark
      const spawnOffset = 30 + this.rng.random() * 40; // 30-70 pixels away from landmark
      const spawnAngle = this.rng.random() * Math.PI * 2;
      spawnX = boomBoomWomb.position.x + Math.cos(spawnAngle) * spawnOffset;
      spawnY = boomBoomWomb.position.y + Math.sin(spawnAngle) * spawnOffset;
    } else {
      // Fallback to near player position if landmark not found
      const spawnOffset = 50 + this.rng.random() * 50;
      const spawnAngle = this.rng.random() * Math.PI * 2;
      spawnX = this.gameState.player.position.x + Math.cos(spawnAngle) * spawnOffset;
      spawnY = this.gameState.player.position.y + Math.sin(spawnAngle) * spawnOffset;
    }
    
    // Create a new wombat that will follow the player
    const newWombat = {
      id: `campmate-${Date.now()}-${Math.random()}`, // Unique ID
      position: createVec2(spawnX, spawnY), // Start near player position
      color: colors[Math.floor(Math.random() * colors.length)],
      name: names[Math.floor(Math.random() * names.length)],
      targetPosition: createVec2(spawnX, spawnY), // Will be updated by following logic
      speed: 0.5 + this.rng.random() * 1.0, // Random speed
      mood: 40 + this.rng.random() * 40 // Random mood
    };
    
    this.campMates.push(newWombat);
    if (boomBoomWomb) {
      console.log(`🏕️ Spawned wombat at (${spawnX.toFixed(1)}, ${spawnY.toFixed(1)}) from Boom Boom Womb`);
    } else {
      console.log(`🏕️ Spawned wombat at (${spawnX.toFixed(1)}, ${spawnY.toFixed(1)}) near player`);
    }
  }

  /**
   * Check if player is near a specific landmark
   */
  private isPlayerNearLandmark(playerPos: Vec2, landmarkId: string, distance: number): boolean {
    const landmarks = getWorldLandmarks(this.worldManager.getCurrentWorldId(), this.gameState.time);
    const landmark = landmarks.find(l => l.id === landmarkId);
    
    if (!landmark) return false;
    
    const dist = Math.sqrt(
      Math.pow(playerPos.x - landmark.position.x, 2) + 
      Math.pow(playerPos.y - landmark.position.y, 2)
    );
    
    return dist <= distance;
  }

  /**
   * Get current game state (for debugging)
   */
  getGameState(): GameState {
    return { ...this.gameState };
  }

  /**
   * Update achievement tracking variables
   */
  private updateAchievementTracking(deltaTime: number): void {
    const player = this.gameState.player;
    const currentTime = Date.now();
    
    // Track distance traveled (only on playa)
    const dx = player.position.x - player.lastPosition.x;
    const dy = player.position.y - player.lastPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Only add distance if player is on the playa
    if (this.worldManager.getCurrentWorldId() === 'playa') {
      player.totalDistanceTraveled += distance;
    }
    player.lastPosition = { ...player.position };
    
    // Track mood streaks
    const currentMood = player.stats.mood;
    const timeSinceLastMoodCheck = (currentTime - player.lastMoodTime) / 1000; // Convert to seconds
    
    if (currentMood >= 80) {
      player.moodStreakHigh += timeSinceLastMoodCheck;
      player.moodStreakLow = 0; // Reset low streak
    } else if (currentMood <= 20) {
      player.moodStreakLow += timeSinceLastMoodCheck;
      player.moodStreakHigh = 0; // Reset high streak
    } else {
      // Check for mood bounce achievement (from <20 to >80)
      if (player.lastMoodValue <= 20 && currentMood >= 80) {
        this.checkMoodBounceAchievement();
      }
      player.moodStreakHigh = 0;
      player.moodStreakLow = 0;
    }
    
    player.lastMoodValue = currentMood;
    player.lastMoodTime = currentTime;
    
    // Track balanced stats (all core stats > 70)
    const coreStats = [player.stats.energy, player.stats.mood, player.stats.thirst, player.stats.hunger];
    const allStatsHigh = coreStats.every(stat => stat > 70);
    
    if (allStatsHigh) {
      player.balancedStatsTime += timeSinceLastMoodCheck;
    } else {
      player.balancedStatsTime = 0;
    }
    
    // Check for Man Burn totem usage (day 8, evening/night)
    if (this.gameState.time.day === 8 && this.gameState.time.hour >= 18 && player.equippedItem === 'Totem') {
      player.totemUsedDuringManBurn = true;
    }
    
    // Check achievements based on current tracking values
    this.checkDistanceAchievements();
    this.checkMoodStreakAchievements();
    this.checkBalancedStatsAchievement();
  }

  /**
   * Check distance-based achievements
   */
  private checkDistanceAchievements(): void {
    const distance = this.gameState.player.totalDistanceTraveled;
    const distanceKm = distance / 1000; // Convert pixels to approximate km
    
    if (distanceKm >= 6 && !this.gameState.player.achievements.has('playa-wanderer')) {
      this.unlockAchievement('playa-wanderer', 'Playa Wanderer', '🏃‍♂️ Traveled 6km across the playa');
    }
    if (distanceKm >= 15 && !this.gameState.player.achievements.has('playa-explorer')) {
      this.unlockAchievement('playa-explorer', 'Playa Explorer', '🗺️ Traveled 15km across the playa');
    }
    if (distanceKm >= 30 && !this.gameState.player.achievements.has('playa-nomad')) {
      this.unlockAchievement('playa-nomad', 'Playa Nomad', '🌵 Traveled 30km across the playa');
    }
  }

  /**
   * Check mood streak achievements
   */
  private checkMoodStreakAchievements(): void {
    const player = this.gameState.player;
    
    // High mood streak (5, 10, 20 minutes)
    const highStreakMinutes = player.moodStreakHigh / 60;
    if (highStreakMinutes >= 5 && !player.achievements.has('mood-streak-5min')) {
      this.unlockAchievement('mood-streak-5min', 'Mood Master', '😊 Stayed happy for 5 minutes straight');
    }
    if (highStreakMinutes >= 10 && !player.achievements.has('mood-streak-10min')) {
      this.unlockAchievement('mood-streak-10min', 'Zen Master', '🧘 Stayed happy for 10 minutes straight');
    }
    if (highStreakMinutes >= 20 && !player.achievements.has('mood-streak-20min')) {
      this.unlockAchievement('mood-streak-20min', 'Bliss Master', '✨ Stayed happy for 20 minutes straight');
    }
  }

  /**
   * Check mood bounce achievement
   */
  private checkMoodBounceAchievement(): void {
    if (!this.gameState.player.achievements.has('mood-bounce')) {
      this.unlockAchievement('mood-bounce', 'Mood Bouncer', '🎢 Bounced from depressed to ecstatic');
    }
  }

  /**
   * Check balanced stats achievement
   */
  private checkBalancedStatsAchievement(): void {
    const balancedMinutes = this.gameState.player.balancedStatsTime / 60;
    if (balancedMinutes >= 10 && !this.gameState.player.achievements.has('balanced-burner')) {
      this.unlockAchievement('balanced-burner', 'Balanced Burner', '⚖️ Maintained all stats above 70 for 10 minutes');
    }
  }

  /**
   * Check gifting achievements
   */
  private checkGiftingAchievements(): void {
    const player = this.gameState.player;
    
    // Item count achievements
    if (player.totalItemsGifted >= 10 && !player.achievements.has('gifter-10')) {
      this.unlockAchievement('gifter-10', 'Generous Gifter', '🎁 Gifted 10 items to others');
    }
    if (player.totalItemsGifted >= 50 && !player.achievements.has('gifter-50')) {
      this.unlockAchievement('gifter-50', 'Radical Gifter', '🎁 Gifted 50 items to others');
    }
    if (player.totalItemsGifted >= 200 && !player.achievements.has('gifter-200')) {
      this.unlockAchievement('gifter-200', 'Gifting Legend', '🎁 Gifted 200 items to others');
    }
    
    // Karma achievements
    if (player.totalKarmaGifted >= 50 && !player.achievements.has('karma-gifter-50')) {
      this.unlockAchievement('karma-gifter-50', 'Karma Builder', '✨ Gave 50+ karma worth of gifts');
    }
    if (player.totalKarmaGifted >= 250 && !player.achievements.has('karma-gifter-250')) {
      this.unlockAchievement('karma-gifter-250', 'Karma Master', '✨ Gave 250+ karma worth of gifts');
    }
    if (player.totalKarmaGifted >= 1000 && !player.achievements.has('karma-gifter-1000')) {
      this.unlockAchievement('karma-gifter-1000', 'Karma Legend', '✨ Gave 1000+ karma worth of gifts');
    }
  }

  /**
   * Check Man Burn totem achievement
   */
  private checkManBurnTotemAchievement(): void {
    if (this.gameState.player.totemUsedDuringManBurn && !this.gameState.player.achievements.has('man-burn-totemist')) {
      this.unlockAchievement('man-burn-totemist', 'Man Burn Totemist', '🪩 Used Totem during the Man Burn');
    }
  }

  /**
   * Unlock an achievement with notification
   */
  private unlockAchievement(id: string, name: string, description: string): void {
    this.gameState.player.achievements.add(id);
    console.log(`🏆 Achievement unlocked: ${name} - ${description}`);
    
    // Show big celebration notification
    const system = getNotificationSystem();
    system.addNotification(`🏆 ${name}`, 'achievement', 5000, this.gameState.player.position);
    
    // Show big confetti/trophy announcement overlay
    this.showAchievementCelebration(name, description);
  }

  /**
   * Show achievement celebration overlay (smaller, no background)
   */
  private showAchievementCelebration(name: string, description: string): void {
    // Create celebration overlay - positioned below top banner
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 80px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 100000;
      font-family: 'Courier New', monospace;
      pointer-events: none;
      text-align: center;
    `;

    // Create celebration content - no background or border
    const content = document.createElement('div');
    content.style.cssText = `
      text-align: center;
      animation: achievementPulse 2s ease-in-out;
      max-width: 400px;
      position: relative;
      overflow: hidden;
    `;

    // Add simple CSS animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes achievementPulse {
        0% { transform: scale(0.8); opacity: 0; }
        50% { transform: scale(1.05); opacity: 1; }
        100% { transform: scale(1); opacity: 1; }
      }
    `;
    document.head.appendChild(style);

    content.innerHTML = `
      <div style="font-size: 2em; margin-bottom: 10px;">🏆</div>
      <h2 style="color: #ffd700; font-size: 1.5em; margin: 0 0 8px 0; text-shadow: 1px 1px 2px rgba(0,0,0,0.5);">
        ${name}
      </h2>
      <p style="color: #fff; font-size: 1em; margin: 0; font-weight: bold; text-shadow: 1px 1px 2px rgba(0,0,0,0.5);">
        ${description}
      </p>
    `;

    overlay.appendChild(content);
    document.body.appendChild(overlay);

    // Remove overlay after 3 seconds
    setTimeout(() => {
      if (document.body.contains(overlay)) {
        document.body.removeChild(overlay);
      }
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    }, 3000);
  }

  /**
   * Reset game state
   */
  reset(): void {
    // Reset world manager to camp
    this.worldManager.forceTransitionToWorld('camp', createVec2(800, 600));
    this.initializeGameState();
  }

  /**
   * Reset and start the game (for restart button)
   */
  resetAndStart(): void {
    // Remove any existing overlays/dialogs
    const existingOverlays = document.querySelectorAll('[style*="z-index: 10000"], [style*="z-index: 999999"]');
    existingOverlays.forEach(overlay => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    });
    
    this.reset();
    this.start();
  }

  /**
   * Load a saved game state
   */
  loadGameState(savedState: GameState): void {
    this.gameState = { ...savedState };
    this.lastPlayerPosition = { ...savedState.player.position };
    
    // Rebuild spatial index with saved coins
    this.spatialIndex = createSpatialIndex(
      this.config.canvasWidth * 2, // 2x larger world
      this.config.canvasHeight * 2, // 2x larger world
      100
    );
    
    // Add all non-collected coins to spatial index
    savedState.coins.forEach(coin => {
      if (!coin.collected) {
        addEntity(this.spatialIndex, {
          id: coin.id,
          position: coin.position,
          radius: 8, // Coin radius
        });
      }
    });
    
    // Update camera to follow the loaded player position
    setCameraPosition(this.camera, savedState.player.position);
  }
}
