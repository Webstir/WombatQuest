import { Vec2, PlayerStats, applyStatEffect } from '../core';
import { MoopItem, MOOP_DEFINITIONS, getUnifiedItemEmoji } from './types';

/**
 * Result of attempting to collect moop
 */
export interface MoopCollectionResult {
  success: boolean;
  collectedMoop: MoopItem | null;
  karmaGained: number;
  newStats: PlayerStats;
}

/**
 * Check if player overlaps with a moop item
 */
export function playerOverlapsMoop(
  playerPos: Vec2,
  playerRadius: number,
  moopPos: Vec2,
  moopRadius: number
): boolean {
  const dx = playerPos.x - moopPos.x;
  const dy = playerPos.y - moopPos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < (playerRadius + moopRadius);
}

/**
 * Attempt to collect a moop item
 */
export function collectMoop(
  moop: MoopItem,
  playerStats: PlayerStats
): MoopCollectionResult {
  if (moop.collected) {
    return {
      success: false,
      collectedMoop: null,
      karmaGained: 0,
      newStats: playerStats,
    };
  }
  
  const karmaGained = moop.karmaReward;
  const newStats = applyStatEffect(playerStats, {
    karma: karmaGained,
  });
  
  return {
    success: true,
    collectedMoop: { ...moop, collected: true },
    karmaGained,
    newStats,
  };
}

/**
 * Find all moop items that the player can collect
 */
export function findCollectibleMoop(
  playerPos: Vec2,
  playerRadius: number,
  moopItems: MoopItem[]
): MoopItem[] {
  return moopItems.filter(moop => 
    !moop.collected && 
    playerOverlapsMoop(playerPos, playerRadius, moop.position, moop.radius)
  );
}

/**
 * Get the emoji for a moop type using unified system
 */
export function getMoopEmoji(moopType: string): string {
  // Convert moop type to display name, then get emoji
  const moopTypeToDisplayName: Record<string, string> = {
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
  
  const displayName = moopTypeToDisplayName[moopType] || moopType;
  return getUnifiedItemEmoji(displayName);
}

/**
 * Get the karma reward for a moop type
 */
export function getMoopKarmaReward(moopType: string): number {
  return MOOP_DEFINITIONS[moopType as keyof typeof MOOP_DEFINITIONS]?.karmaReward || 0;
}
