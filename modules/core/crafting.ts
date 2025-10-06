/**
 * Automatic crafting system
 */

import type { ItemType, PlayerInventory } from './types';
import { addItemToInventory, removeItemFromInventory, getNotificationSystem } from './index';

export interface CraftingRecipe {
  id: string;
  result: ItemType;
  ingredients: Array<{ item: ItemType; quantity: number }>;
  description: string;
}

export const CRAFTING_RECIPES: Record<string, CraftingRecipe> = {
  'totem': {
    id: 'totem',
    result: 'Totem',
    ingredients: [
      { item: 'Light Bulb', quantity: 2 },
      { item: 'Glitter', quantity: 1 },
      { item: 'Rope', quantity: 1 }
    ],
    description: 'A spiritual totem that raises mood and attracts wombats'
  },
  'swamp-cooler': {
    id: 'swamp-cooler',
    result: 'Swamp Cooler',
    ingredients: [
      { item: 'Water', quantity: 1 },
      { item: 'Battery', quantity: 1 },
      { item: 'Bucket', quantity: 1 },
      { item: 'Ducting', quantity: 1 }
    ],
    description: 'A cooling device that creates an energy and mood aura when placed'
  },
  'cape': {
    id: 'cape',
    result: 'Cape',
    ingredients: [
      { item: 'Clothing', quantity: 1 },
      { item: 'Zip Tie', quantity: 1 },
      { item: 'Glitter', quantity: 2 }
    ],
    description: 'A magical cape that increases your movement speed'
  },
  'costume': {
    id: 'costume',
    result: 'Costume',
    ingredients: [
      { item: 'Furry Hat', quantity: 1 },
      { item: 'Boots', quantity: 1 },
      { item: 'Cat Head', quantity: 1 }
    ],
    description: 'A complete costume that greatly boosts your mood and energy'
  }
};

/**
 * Check if player has ingredients for a recipe
 */
export function canCraftRecipe(inventory: PlayerInventory, recipe: CraftingRecipe): boolean {
  return recipe.ingredients.every(ingredient => {
    const currentQuantity = inventory.items.get(ingredient.item) || 0;
    return currentQuantity >= ingredient.quantity;
  });
}

/**
 * Craft an item automatically if ingredients are available
 */
export function attemptAutoCraft(inventory: PlayerInventory, playerPosition: { x: number; y: number }): string[] {
  const craftedItems: string[] = [];
  
  for (const [recipeId, recipe] of Object.entries(CRAFTING_RECIPES)) {
    if (canCraftRecipe(inventory, recipe)) {
      // Remove ingredients
      recipe.ingredients.forEach(ingredient => {
        removeItemFromInventory(inventory, ingredient.item, ingredient.quantity);
      });
      
      // Add result
      addItemToInventory(inventory, recipe.result, 1);
      
      // Show notification
      const system = getNotificationSystem();
      system.addNotification(`🔨 Crafted ${recipe.result}! ${recipe.description}`, 'craft', 5000, playerPosition);
      
      craftedItems.push(recipe.result);
      
      console.log(`🔨 Auto-crafted ${recipe.result} using recipe ${recipeId}`);
    }
  }
  
  return craftedItems;
}

/**
 * Get all craftable recipes for current inventory
 */
export function getAvailableRecipes(inventory: PlayerInventory): CraftingRecipe[] {
  return Object.values(CRAFTING_RECIPES).filter(recipe => canCraftRecipe(inventory, recipe));
}
