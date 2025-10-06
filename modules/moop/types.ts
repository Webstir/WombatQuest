import { Vec2 } from '../core';

/**
 * Types of moop (trash) that can be found in the world
 */
export type MoopType = 
  | 'ziptie'
  | 'water-bottle'
  | 'cup'
  | 'flashing-light'
  | 'furry-hat'
  | 'cigarette-butt'
  | 'light-bulb'
  | 'ducting'
  | 'bucket'
  | 'glitter'
  | 'rope'
  | 'plastic-bag'
  | 'boots'
  | 'cat-head'
  | 'clothing'
  | 'cape';

/**
 * Moop item definition
 */
export interface MoopItem {
  id: string;
  type: MoopType;
  position: Vec2;
  radius: number;
  karmaReward: number;
  collected: boolean;
}

/**
 * Moop configuration for each type
 */
export interface MoopConfig {
  emoji: string;
  radius: number;
  karmaReward: number;
  spawnWeight: number; // Higher = more likely to spawn
}

/**
 * Collection of all moop configurations
 */
export const MOOP_DEFINITIONS: Record<MoopType, MoopConfig> = {
  'ziptie': {
    emoji: '🔗',
    radius: 8,
    karmaReward: 2,
    spawnWeight: 15,
  },
  'water-bottle': {
    emoji: '🍼',
    radius: 12,
    karmaReward: 3,
    spawnWeight: 20,
  },
  'cup': {
    emoji: '🥤',
    radius: 10,
    karmaReward: 2,
    spawnWeight: 18,
  },
  'flashing-light': {
    emoji: '💡',
    radius: 14,
    karmaReward: 5,
    spawnWeight: 8,
  },
  'furry-hat': {
    emoji: '🎩',
    radius: 16,
    karmaReward: 8,
    spawnWeight: 5,
  },
  'cigarette-butt': {
    emoji: '🚬',
    radius: 6,
    karmaReward: 1,
    spawnWeight: 25,
  },
  'light-bulb': {
    emoji: '💡',
    radius: 8,
    karmaReward: -5, // Negative karma for creating moop
    spawnWeight: 0, // Only spawned when dropped, not naturally
  },
  'ducting': {
    emoji: '🔧',
    radius: 10,
    karmaReward: 3,
    spawnWeight: 12,
  },
  'bucket': {
    emoji: '🪣',
    radius: 14,
    karmaReward: 4,
    spawnWeight: 8,
  },
  'glitter': {
    emoji: '✨',
    radius: 6,
    karmaReward: 2,
    spawnWeight: 15,
  },
  'rope': {
    emoji: '🪢',
    radius: 8,
    karmaReward: 3,
    spawnWeight: 10,
  },
  'plastic-bag': {
    emoji: '🛍️',
    radius: 6,
    karmaReward: 1,
    spawnWeight: 20,
  },
  'boots': {
    emoji: '👢',
    radius: 12,
    karmaReward: 4,
    spawnWeight: 8,
  },
  'cat-head': {
    emoji: '🐱',
    radius: 14,
    karmaReward: 6,
    spawnWeight: 6,
  },
  'clothing': {
    emoji: '👕',
    radius: 12,
    karmaReward: 5,
    spawnWeight: 8,
  },
  'cape': {
    emoji: '🦸',
    radius: 16,
    karmaReward: 8,
    spawnWeight: 4,
  },
};

/**
 * Generate a unique ID for a moop item
 */
export function generateMoopId(): string {
  return `moop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get display name for moop type
 */
export function getMoopDisplayName(type: MoopType): string {
  const displayNames: Record<MoopType, string> = {
    'ziptie': 'Zip Tie',
    'water-bottle': 'Water Bottle',
    'cup': 'Cup',
    'flashing-light': 'Flashing Light',
    'furry-hat': 'Furry Hat',
    'cigarette-butt': 'Cigarette Butt',
    'light-bulb': 'Light Bulb',
    'ducting': 'Ducting',
    'bucket': 'Bucket',
    'glitter': 'Glitter',
    'rope': 'Rope',
    'plastic-bag': 'Plastic Bag',
    'boots': 'Boots',
    'cat-head': 'Cat Head',
    'clothing': 'Clothing',
    'cape': 'Cape',
  };
  return displayNames[type];
}

/**
 * Unified emoji function that maps inventory item names to moop emojis
 * This ensures all systems (playa, inventory, gift panel) use the same emojis
 */
export function getUnifiedItemEmoji(itemType: string): string {
  // First try to match exact moop types
  const moopTypeMap: Record<string, MoopType> = {
    'Water': 'water-bottle',
    'Water Bottle': 'water-bottle',
    'Cup': 'cup',
    'Light Bulb': 'light-bulb',
    'Light Bulb White': 'light-bulb',
    'Light Bulb Red': 'light-bulb',
    'Light Bulb Green': 'light-bulb',
    'Light Bulb Blue': 'light-bulb',
    'Light Bulb Orange': 'light-bulb',
    'Light Bulb Purple': 'light-bulb',
    'Light Bulb Rainbow': 'light-bulb',
    'Flashing Light': 'flashing-light',
    'Furry Hat': 'furry-hat',
    'Cigarette Butt': 'cigarette-butt',
    'Ducting': 'ducting',
    'Bucket': 'bucket',
    'Glitter': 'glitter',
    'Rope': 'rope',
    'Plastic Bag': 'plastic-bag',
    'Boots': 'boots',
    'Cat Head': 'cat-head',
    'Clothing': 'clothing',
    'Cape': 'cape',
    'Zip Tie': 'ziptie',
  };

  // Try exact match first
  if (moopTypeMap[itemType]) {
    return MOOP_DEFINITIONS[moopTypeMap[itemType]].emoji;
  }

  // Try partial matches for items that might have variations
  const lowerItemType = itemType.toLowerCase();
  
  // Food items
  if (lowerItemType.includes('pizza')) return '🍕';
  if (lowerItemType.includes('burger')) return '🍔';
  if (lowerItemType.includes('cheese')) return '🧀';
  if (lowerItemType.includes('salad') || lowerItemType.includes('fruit')) return '🥗';
  if (lowerItemType.includes('smoothie')) return '🥤';
  if (lowerItemType.includes('popsicle')) return '🍭';
  if (lowerItemType.includes('burrito')) return '🌯';
  if (lowerItemType.includes('taco')) return '🌮';
  if (lowerItemType.includes('ice cream')) return '🍦';
  if (lowerItemType.includes('corn dog')) return '🌭';
  if (lowerItemType.includes('funnel cake')) return '🧇';
  if (lowerItemType.includes('nachos')) return '🧀';
  if (lowerItemType.includes('cotton candy')) return '🍬';
  if (lowerItemType.includes('bacon')) return '🥓';
  if (lowerItemType.includes('donut')) return '🍩';
  if (lowerItemType.includes('pickles')) return '🥒';
  
  // Drink items
  if (lowerItemType.includes('water')) return '💧';
  if (lowerItemType.includes('beer')) return '🍺';
  if (lowerItemType.includes('vodka')) return '🍸';
  if (lowerItemType.includes('energy bar')) return '🍫';
  if (lowerItemType.includes('energy')) return '⚡';
  
  // Special items
  if (lowerItemType.includes('totem')) return '🪩';
  if (lowerItemType.includes('trinket')) return '✨';
  if (lowerItemType.includes('battery')) return '🔋';
  if (lowerItemType.includes('gas')) return '⛽';
  if (lowerItemType.includes('swamp cooler')) return '❄️';
  
  // Colored light bulbs
  if (lowerItemType.includes('light bulb red')) return '🔴';
  if (lowerItemType.includes('light bulb green')) return '🟢';
  if (lowerItemType.includes('light bulb blue')) return '🔵';
  if (lowerItemType.includes('light bulb orange')) return '🟠';
  if (lowerItemType.includes('light bulb purple')) return '🟣';
  if (lowerItemType.includes('light bulb rainbow')) return '🌈';
  if (lowerItemType.includes('light bulb white')) return '⚪';
  if (lowerItemType.includes('light bulb')) return '💡';
  
  // Drug items
  if (lowerItemType.includes('joint') || lowerItemType.includes('weed')) return '🍃';
  if (lowerItemType.includes('molly') || lowerItemType.includes('mdma')) return '💊';
  if (lowerItemType.includes('acid') || lowerItemType.includes('lsd')) return '🔄';
  if (lowerItemType.includes('shrooms') || lowerItemType.includes('mushroom')) return '🍄';
  if (lowerItemType.includes('dmt')) return '🌌';
  if (lowerItemType.includes('salvia')) return '🌿';
  if (lowerItemType.includes('ketamine')) return '💉';
  if (lowerItemType.includes('cocaine')) return '❄️';
  if (lowerItemType.includes('cannabis')) return '🌿';
  if (lowerItemType.includes('cigarette')) return '🚬';
  if (lowerItemType.includes('mystery')) return '❓';
  if (lowerItemType.includes('whipit')) return '🎈';
  if (lowerItemType.includes('energy drink')) return '⚡';
  
  // Default fallback
  return '📦';
}
