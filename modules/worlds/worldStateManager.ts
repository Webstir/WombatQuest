/**
 * World state management - handles per-world persistence
 */

import type { WorldState, WorldItem, WorldNPC, WorldEvent } from './types';
import type { Storage } from '../../shared/ports';

/**
 * Manages world-specific state persistence
 */
export class WorldStateManager {
  private worldStates: Map<string, WorldState> = new Map();
  private storage: Storage;
  private storagePrefix: string = 'world_state_';

  constructor(storage: Storage) {
    this.storage = storage;
  }

  /**
   * Get world state for a specific world
   */
  getWorldState(worldId: string): WorldState {
    if (!this.worldStates.has(worldId)) {
      this.worldStates.set(worldId, this.createEmptyWorldState(worldId));
    }
    return this.worldStates.get(worldId)!;
  }

  /**
   * Update world state
   */
  updateWorldState(worldId: string, updates: Partial<WorldState>): void {
    const currentState = this.getWorldState(worldId);
    const updatedState = { ...currentState, ...updates };
    this.worldStates.set(worldId, updatedState);
  }

  /**
   * Add an item to a world
   */
  addWorldItem(worldId: string, item: WorldItem): void {
    const state = this.getWorldState(worldId);
    state.items.push(item);
    this.updateWorldState(worldId, { items: state.items });
  }

  /**
   * Remove an item from a world
   */
  removeWorldItem(worldId: string, itemId: string): void {
    const state = this.getWorldState(worldId);
    state.items = state.items.filter(item => item.id !== itemId);
    this.updateWorldState(worldId, { items: state.items });
  }

  /**
   * Update an item in a world
   */
  updateWorldItem(worldId: string, itemId: string, updates: Partial<WorldItem>): void {
    const state = this.getWorldState(worldId);
    const itemIndex = state.items.findIndex(item => item.id === itemId);
    if (itemIndex !== -1) {
      state.items[itemIndex] = { ...state.items[itemIndex], ...updates };
      this.updateWorldState(worldId, { items: state.items });
    }
  }

  /**
   * Add an NPC to a world
   */
  addWorldNPC(worldId: string, npc: WorldNPC): void {
    const state = this.getWorldState(worldId);
    state.npcs.push(npc);
    this.updateWorldState(worldId, { npcs: state.npcs });
  }

  /**
   * Update an NPC in a world
   */
  updateWorldNPC(worldId: string, npcId: string, updates: Partial<WorldNPC>): void {
    const state = this.getWorldState(worldId);
    const npcIndex = state.npcs.findIndex(npc => npc.id === npcId);
    if (npcIndex !== -1) {
      state.npcs[npcIndex] = { ...state.npcs[npcIndex], ...updates };
      this.updateWorldState(worldId, { npcs: state.npcs });
    }
  }

  /**
   * Add an event to a world
   */
  addWorldEvent(worldId: string, event: WorldEvent): void {
    const state = this.getWorldState(worldId);
    state.events.push(event);
    this.updateWorldState(worldId, { events: state.events });
  }

  /**
   * Trigger an event in a world
   */
  triggerWorldEvent(worldId: string, eventId: string): void {
    const state = this.getWorldState(worldId);
    const eventIndex = state.events.findIndex(event => event.id === eventId);
    if (eventIndex !== -1) {
      state.events[eventIndex].triggered = true;
      this.updateWorldState(worldId, { events: state.events });
    }
  }

  /**
   * Mark world as visited
   */
  markWorldVisited(worldId: string): void {
    this.updateWorldState(worldId, { lastVisited: Date.now() });
  }

  /**
   * Mark world as loaded
   */
  markWorldLoaded(worldId: string, loaded: boolean): void {
    this.updateWorldState(worldId, { isLoaded: loaded });
  }

  /**
   * Save all world states to storage
   */
  async saveAllWorldStates(): Promise<void> {
    const savePromises = Array.from(this.worldStates.entries()).map(([worldId, state]) => {
      const storageKey = `${this.storagePrefix}${worldId}`;
      return this.storage.save(storageKey, JSON.stringify(state));
    });
    await Promise.all(savePromises);
  }

  /**
   * Load all world states from storage
   */
  async loadAllWorldStates(): Promise<void> {
    const worldIds = ['camp', 'playa', 'danceStage']; // Default worlds
    const loadPromises = worldIds.map(async (worldId) => {
      const storageKey = `${this.storagePrefix}${worldId}`;
      try {
        const savedData = await this.storage.load(storageKey);
        if (savedData && typeof savedData === 'string') {
          const worldState = JSON.parse(savedData) as WorldState;
          this.worldStates.set(worldId, worldState);
        }
      } catch (error) {
        console.warn(`Failed to load world state for ${worldId}:`, error);
        // Create empty state if loading fails
        this.worldStates.set(worldId, this.createEmptyWorldState(worldId));
      }
    });
    await Promise.all(loadPromises);
  }

  /**
   * Create empty world state
   */
  private createEmptyWorldState(worldId: string): WorldState {
    return {
      worldId,
      items: [],
      npcs: [],
      events: [],
      lastVisited: Date.now(),
      isLoaded: false
    };
  }

  /**
   * Get all loaded world IDs
   */
  getLoadedWorldIds(): string[] {
    return Array.from(this.worldStates.entries())
      .filter(([_, state]) => state.isLoaded)
      .map(([worldId, _]) => worldId);
  }

  /**
   * Clear all world states (for testing)
   */
  clearAllWorldStates(): void {
    this.worldStates.clear();
  }
}
