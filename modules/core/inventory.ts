/**
 * Inventory system for managing player items
 */

import type { ItemType, InventoryItem, PlayerInventory, PlayerStats, Player } from './types';
import { applyStatEffect } from './stats';

/**
 * Item definitions with their effects and hotkeys
 */
export const ITEM_DEFINITIONS: Record<ItemType, InventoryItem> = {
  'Water': {
    type: 'Water',
    quantity: 0,
    hotkey: 'W',
    effects: { thirst: -35, mood: 3, bathroom: 15 } // -35 thirst (reduces thirst), +15 bathroom need
  },
  'Grilled Cheese': {
    type: 'Grilled Cheese',
    quantity: 0,
    hotkey: 'J',
    effects: { hunger: -25, mood: 8, bathroom: 12 } // -25 hunger (reduces hunger), +12 bathroom need
  },
  'Energy Bar': {
    type: 'Energy Bar',
    quantity: 0,
    hotkey: 'E',
    effects: { hunger: -15, mood: 4, energy: 20, bathroom: 8 } // -15 hunger (reduces hunger), +8 bathroom need
  },
  'Trinket': {
    type: 'Trinket',
    quantity: 0,
    hotkey: 'T',
    effects: { mood: 12, energy: 8 }
  },
  'Clothing': {
    type: 'Clothing',
    quantity: 0,
    hotkey: 'C',
    effects: { mood: 15, energy: 10 }
  },
  'Fruit Salad': {
    type: 'Fruit Salad',
    quantity: 0,
    hotkey: 'F',
    effects: { hunger: -20, mood: 6, bathroom: 10 } // -20 hunger (reduces hunger)
  },
  'Smoothie': {
    type: 'Smoothie',
    quantity: 0,
    hotkey: 'S',
    effects: { hunger: -18, mood: 5, bathroom: 12 } // -18 hunger (reduces hunger)
  },
  'Popsicle': {
    type: 'Popsicle',
    quantity: 0,
    hotkey: 'O',
    effects: { hunger: -8, mood: 3, bathroom: 5 }
  },
  'Burrito': {
    type: 'Burrito',
    quantity: 0,
    hotkey: 'B',
    effects: { hunger: -28, mood: 9, bathroom: 20 }
  },
  'Taco': {
    type: 'Taco',
    quantity: 0,
    hotkey: 'A',
    effects: { hunger: -22, mood: 7, bathroom: 18 }
  },
  'Ice Cream': {
    type: 'Ice Cream',
    quantity: 0,
    hotkey: 'I',
    effects: { hunger: -12, mood: 6, bathroom: 8 }
  },
  'Corn Dog': {
    type: 'Corn Dog',
    quantity: 0,
    hotkey: 'D',
    effects: { hunger: -25, mood: 8, bathroom: 15 }
  },
  'Funnel Cake': {
    type: 'Funnel Cake',
    quantity: 0,
    hotkey: 'U',
    effects: { hunger: -20, mood: 10, bathroom: 12 }
  },
  'Nachos': {
    type: 'Nachos',
    quantity: 0,
    hotkey: 'N',
    effects: { hunger: -24, mood: 7, bathroom: 16 }
  },
  'Cotton Candy': {
    type: 'Cotton Candy',
    quantity: 0,
    hotkey: 'Y',
    effects: { hunger: -5, mood: 2, bathroom: 3 }
  },
  'Bacon Pancakes': {
    type: 'Bacon Pancakes',
    quantity: 0,
    hotkey: 'K',
    effects: { hunger: -32, mood: 12, bathroom: 22 }
  },
  'Dusty Donut': {
    type: 'Dusty Donut',
    quantity: 0,
    hotkey: 'H',
    effects: { hunger: -18, mood: 8, bathroom: 12 }
  },
  'Playa Pizza': {
    type: 'Playa Pizza',
    quantity: 0,
    hotkey: 'Z',
    effects: { hunger: -28, mood: 10, bathroom: 20 }
  },
  'Burner Burger': {
    type: 'Burner Burger',
    quantity: 0,
    hotkey: 'X',
    effects: { hunger: -35, mood: 15, bathroom: 25 }
  },
  'Pickles': {
    type: 'Pickles',
    quantity: 0,
    hotkey: 'Q',
    effects: { hunger: -8, mood: 4, bathroom: 6 }
  },
  'Gas Can': {
    type: 'Gas Can',
    quantity: 0,
    effects: {}
  },
  'Light Bulb': {
    type: 'Light Bulb',
    quantity: 0,
    effects: {}
  },
  'Light Bulb White': {
    type: 'Light Bulb White',
    quantity: 0,
    effects: {}
  },
  'Light Bulb Red': {
    type: 'Light Bulb Red',
    quantity: 0,
    effects: {}
  },
  'Light Bulb Green': {
    type: 'Light Bulb Green',
    quantity: 0,
    effects: {}
  },
  'Light Bulb Blue': {
    type: 'Light Bulb Blue',
    quantity: 0,
    effects: {}
  },
  'Light Bulb Orange': {
    type: 'Light Bulb Orange',
    quantity: 0,
    effects: {}
  },
  'Light Bulb Purple': {
    type: 'Light Bulb Purple',
    quantity: 0,
    effects: {}
  },
  'Light Bulb Rainbow': {
    type: 'Light Bulb Rainbow',
    quantity: 0,
    effects: {}
  },
  'Battery': {
    type: 'Battery',
    quantity: 0,
    hotkey: 'B',
    effects: {}
  },
  'Beer': {
    type: 'Beer',
    quantity: 0,
    hotkey: 'M',
    effects: { mood: 15, energy: -5, bathroom: 25, thirst: -20 }
  },
  'Vodka': {
    type: 'Vodka',
    quantity: 0,
    hotkey: 'K',
    effects: { mood: 20, energy: -10, bathroom: 30, thirst: -15, speed: -10 }
  },
  // New moop items
  'Ducting': {
    type: 'Ducting',
    quantity: 0,
    effects: {}
  },
  'Bucket': {
    type: 'Bucket',
    quantity: 0,
    effects: {}
  },
  'Zip Tie': {
    type: 'Zip Tie',
    quantity: 0,
    effects: {}
  },
  'Glitter': {
    type: 'Glitter',
    quantity: 0,
    effects: {}
  },
  'Rope': {
    type: 'Rope',
    quantity: 0,
    effects: {}
  },
  'Plastic Bag': {
    type: 'Plastic Bag',
    quantity: 0,
    effects: {}
  },
  'Furry Hat': {
    type: 'Furry Hat',
    quantity: 0,
    effects: { mood: 5 }
  },
  'Boots': {
    type: 'Boots',
    quantity: 0,
    effects: { mood: 3 }
  },
  'Cat Head': {
    type: 'Cat Head',
    quantity: 0,
    effects: { mood: 4 }
  },
  'Costume': {
    type: 'Costume',
    quantity: 0,
    hotkey: 'X',
    effects: { mood: 25, energy: 10 }
  },
  // Crafted items
  'Totem': {
    type: 'Totem',
    quantity: 0,
    effects: { mood: 5 } // Slow mood increase when equipped
  },
  'Swamp Cooler': {
    type: 'Swamp Cooler',
    quantity: 0,
    effects: {} // No effects when carried, only when placed
  },
  'Cape': {
    type: 'Cape',
    quantity: 0,
    hotkey: 'P',
    effects: { speed: 25 } // +25% speed when equipped
  },
  'POI': {
    type: 'POI',
    quantity: 0,
    hotkey: 'I',
    effects: { lightBattery: 10 } // Provides light at night
  },
  'Fire Spinning': {
    type: 'Fire Spinning',
    quantity: 0,
    hotkey: 'F',
    effects: { lightBattery: 15, mood: 10 } // More light + mood boost
  }
};

/**
 * Create empty inventory
 */
export function createEmptyInventory(): PlayerInventory {
  return {
    items: new Map<ItemType, number>()
  };
}

/**
 * Add item to inventory
 */
export function addItemToInventory(inventory: PlayerInventory, itemType: ItemType, quantity: number = 1): void {
  const currentQuantity = inventory.items.get(itemType) || 0;
  inventory.items.set(itemType, currentQuantity + quantity);
}

/**
 * Remove item from inventory
 */
export function removeItemFromInventory(inventory: PlayerInventory, itemType: ItemType, quantity: number = 1): boolean {
  const currentQuantity = inventory.items.get(itemType) || 0;
  if (currentQuantity >= quantity) {
    const newQuantity = currentQuantity - quantity;
    if (newQuantity <= 0) {
      inventory.items.delete(itemType);
    } else {
      inventory.items.set(itemType, newQuantity);
    }
    return true;
  }
  return false;
}

/**
 * Check if player has item
 */
export function hasItem(inventory: PlayerInventory, itemType: ItemType, quantity: number = 1): boolean {
  const currentQuantity = inventory.items.get(itemType) || 0;
  return currentQuantity >= quantity;
}

/**
 * Get item quantity
 */
export function getItemQuantity(inventory: PlayerInventory, itemType: ItemType): number {
  return inventory.items.get(itemType) || 0;
}

/**
 * Use an item and apply its effects
 */
export function useItem(inventory: PlayerInventory, itemType: ItemType, stats: PlayerStats): { success: boolean; newStats: PlayerStats } {
  console.log('useItem called:', itemType, 'current stats:', stats);
  
  if (!hasItem(inventory, itemType, 1)) {
    console.log('useItem failed: no item in inventory');
    return { success: false, newStats: stats };
  }

  const itemDef = ITEM_DEFINITIONS[itemType];
  if (!itemDef) {
    console.log('useItem failed: no item definition');
    return { success: false, newStats: stats };
  }

  console.log('useItem: item effects:', itemDef.effects);

  // Remove item from inventory
  removeItemFromInventory(inventory, itemType, 1);

  // Special handling for light bulbs - charge the battery instead of applying stat effects
  if (itemType.includes('Light Bulb')) {
    const newStats = { ...stats };
    newStats.lightBattery = 30; // 3 bars (30%) when using a light bulb
    console.log('useItem: light bulb used, battery charged to 30%');
    return { success: true, newStats };
  }

  // Special handling for batteries - fully charge the battery
  if (itemType === 'Battery') {
    const newStats = { ...stats };
    newStats.lightBattery = 100; // Full charge
    console.log('useItem: battery used, battery fully charged');
    return { success: true, newStats };
  }

  // Apply effects to stats for other items
  const newStats = applyStatEffect(stats, itemDef.effects);
  console.log('useItem: new stats after applying effects:', newStats);

  return { success: true, newStats };
}

/**
 * Get all items in inventory as array
 */
export function getInventoryItems(inventory: PlayerInventory): Array<{ type: ItemType; quantity: number; hotkey?: string }> {
  const items: Array<{ type: ItemType; quantity: number; hotkey?: string }> = [];
  
  inventory.items.forEach((quantity, itemType) => {
    const itemDef = ITEM_DEFINITIONS[itemType];
    items.push({
      type: itemType,
      quantity,
      hotkey: itemDef?.hotkey
    });
  });

  return items.sort((a, b) => b.quantity - a.quantity); // Sort by quantity (highest first)
}

/**
 * Equipment system functions
 */

/**
 * Check if an item can be equipped
 */
export function canEquipItem(itemType: ItemType): boolean {
  const equippableItems: ItemType[] = ['Totem', 'Cape', 'POI', 'Fire Spinning', 'Costume'];
  return equippableItems.includes(itemType);
}

/**
 * Equip an item
 */
export function equipItem(player: Player, itemType: ItemType): boolean {
  if (!canEquipItem(itemType)) {
    return false;
  }
  
  if (!hasItem(player.inventory, itemType, 1)) {
    return false;
  }
  
  // Unequip current item first
  if (player.equippedItem) {
    unequipItem(player);
  }
  
  player.equippedItem = itemType;
  return true;
}

/**
 * Unequip current item
 */
export function unequipItem(player: Player): void {
  if (player.equippedItem) {
    player.equippedItem = undefined;
  }
}

/**
 * Get equipped item effects
 */
export function getEquippedItemEffects(player: Player): any {
  if (!player.equippedItem) {
    return {};
  }
  
  const itemDef = ITEM_DEFINITIONS[player.equippedItem];
  return itemDef?.effects || {};
}
