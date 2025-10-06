/**
 * Action system for player actions like rest
 */

export interface Action {
  id: string;
  name: string;
  hotkey: string;
  description: string;
  cooldown: number; // in milliseconds
  lastUsed: number;
  enabled: boolean;
}

export interface ActionPanel {
  actions: Action[];
  addAction(action: Action): void;
  getActionByHotkey(hotkey: string): Action | undefined;
  canUseAction(actionId: string): boolean;
  useAction(actionId: string): void;
}

export class ActionSystem implements ActionPanel {
  public actions: Action[] = [];

  constructor() {
    this.initializeDefaultActions();
  }

  private initializeDefaultActions(): void {
    this.addAction({
      id: 'rest',
      name: 'Rest',
      hotkey: 'R',
      description: 'Rest to restore energy',
      cooldown: 1000, // 1 second cooldown
      lastUsed: 0,
      enabled: true
    });
  }

  addAction(action: Action): void {
    this.actions.push(action);
  }

  getActionByHotkey(hotkey: string): Action | undefined {
    return this.actions.find(action => action.hotkey.toLowerCase() === hotkey.toLowerCase());
  }

  canUseAction(actionId: string): boolean {
    const action = this.actions.find(a => a.id === actionId);
    if (!action || !action.enabled) return false;
    
    const now = Date.now();
    return (now - action.lastUsed) >= action.cooldown;
  }

  useAction(actionId: string): void {
    const action = this.actions.find(a => a.id === actionId);
    if (!action || !this.canUseAction(actionId)) return;
    
    action.lastUsed = Date.now();
  }
}

// Global action system instance
let globalActionSystem: ActionSystem | null = null;

export function getActionSystem(): ActionSystem {
  if (!globalActionSystem) {
    globalActionSystem = new ActionSystem();
  }
  return globalActionSystem;
}

