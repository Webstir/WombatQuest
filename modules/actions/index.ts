/**
 * Actions module - Player actions and their effects
 */

// Types
export type {
  StatDelta,
  ActionResult,
  PickupAction,
  RestAction,
} from './types';

// Action functions
export {
  createCoinPickupDelta,
  createRestDelta,
  applyStatDelta,
  pickCoin,
  rest,
} from './pickupActions';

