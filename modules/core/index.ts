/**
 * Core module - Basic game types and movement logic
 */

// Types
export type {
  Vec2,
  PlayerStats,
  Player,
  GameState,
  GameTime,
  Direction,
  MovementInput,
  DrugType,
  DrugEffect,
  PlayerDrugs,
  ItemType,
  InventoryItem,
  PlayerInventory,
} from './types';

// Movement functions
export {
  createVec2,
  addVec2,
  scaleVec2,
  getDirectionVector,
  calculateMovement,
  clampToBounds,
} from './movement';

// Collision detection functions
export {
  distance,
  circlesOverlap,
  pointInCircle,
  playerOverlapsCoin,
  playerOverlapsCollectible,
} from './collision';

// Stats system functions
export {
  applyStatEffect,
  clampValue,
  isStatsAtMax,
  isStatsAtMin,
  getStatPercentage,
  DEFAULT_STAT_BOUNDS,
} from './stats';

export type { StatEffect, StatBounds } from './stats';

// Stat decay functions
export {
  calculateMovementEnergyDecay,
  calculateMoodDecay,
  calculateNaturalEffects,
  DEFAULT_DECAY_CONFIG,
} from './statDecay';

export type { DecayConfig } from './statDecay';

// Drug system functions
export {
  createDrugEffect,
  applyDrugEffect,
  updateDrugEffects,
  addDrugEffect,
  calculateTimeScale,
  getActiveDrugEffects,
  isOnDrug,
  DRUG_DEFINITIONS,
} from './drugs';

// Speed modifier functions
export {
  calculateSpeedMultiplier,
  calculateEffectiveSpeed,
  getSpeedModifierDescription,
  DEFAULT_SPEED_CONFIG,
} from './speedModifiers';

export type { SpeedModifierConfig } from './speedModifiers';

// Inventory system functions
export {
  createEmptyInventory,
  addItemToInventory,
  removeItemFromInventory,
  hasItem,
  getItemQuantity,
  useItem,
  getInventoryItems,
  ITEM_DEFINITIONS,
  canEquipItem,
  equipItem,
  unequipItem,
  getEquippedItemEffects,
} from './inventory';

// Notification system
export {
  NotificationSystem,
  getNotificationSystem,
  createCoinNotification,
  createStatNotification,
  createItemNotification,
} from './notifications';

export type { Notification, NotificationManager } from './notifications';

// Action system
export {
  ActionSystem,
  getActionSystem,
} from './actions';

export type { Action, ActionPanel } from './actions';

// Time system
export {
  createInitialGameTime,
  updateGameTime,
  formatGameTime,
  getTimeOfDayDescription,
  isNightTime,
  isDayTime,
  getBackgroundColor,
  DEFAULT_TIME_CONFIG,
} from './timeSystem';

export type { TimeConfig } from './timeSystem';

// Crafting system
export {
  CRAFTING_RECIPES,
  canCraftRecipe,
  attemptAutoCraft,
  getAvailableRecipes,
} from './crafting';

export type { CraftingRecipe } from './crafting';

// Archetype system
export {
  BURNER_ARCHETYPES,
  BURNER_AWARDS,
  calculatePlayerArchetype,
  checkAndUnlockAwards,
} from './archetypes';

export type { Archetype, Award } from './archetypes';
