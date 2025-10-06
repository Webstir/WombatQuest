/**
 * Main entry point for the application
 */

import { App } from './app/index';

// Initialize and start the application
const app = new App({
  canvasWidth: window.innerWidth,
  canvasHeight: window.innerHeight,
  playerSize: 32,
  seed: Math.floor(Math.random() * 1000000),
  coinCount: 90,
});

// Start the app when the page loads
app.start().catch(console.error);

// Make app available globally for debugging
(window as any).app = app;
(window as any).gameLoop = app.getGameLoop();

// Expose equipping methods for testing
import { equipItem, unequipItem } from './modules/core';

(window as any).equipItem = (itemType: string) => {
  const gameState = (window as any).gameLoop.getGameState();
  return equipItem(gameState.player, itemType);
};

(window as any).unequipItem = () => {
  const gameState = (window as any).gameLoop.getGameState();
  return unequipItem(gameState.player);
};
