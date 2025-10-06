/**
 * Actions module types - player actions and their effects
 */

// PlayerStats import removed as it's not used in this file

export interface StatDelta {
  coins: number;
  energy: number;
  mood: number;
}

export interface ActionResult {
  success: boolean;
  statDelta: StatDelta;
  message?: string;
}

export interface PickupAction {
  type: 'pickup_coin';
  coinId: string;
  coinValue: number;
}

export interface RestAction {
  type: 'rest';
  energyRestore: number;
  moodRestore: number;
}
