/**
 * Notification system for displaying stat changes and actions
 */

export interface Notification {
  id: string;
  message: string;
  type: 'coin' | 'thirst' | 'hunger' | 'energy' | 'mood' | 'karma' | 'speed' | 'item' | 'persistent' | 'warning' | 'info' | 'achievement' | 'temporary';
  value: number;
  timestamp: number;
  duration: number; // in milliseconds
  worldPosition: { x: number; y: number }; // World position where action happened
  alpha: number;
  count: number; // How many of this notification type
  persistent?: boolean; // If true, doesn't auto-expire and follows world position
}

export interface NotificationManager {
  notifications: Notification[];
  addNotification(message: string, type: Notification['type'], value: number, worldPosition: { x: number; y: number }): void;
  updateNotifications(deltaTime: number): void;
  clearNotifications(): void;
}

export class NotificationSystem implements NotificationManager {
  public notifications: Notification[] = [];
  private nextId = 0;

  /**
   * Add a new notification
   */
  addNotification(
    message: string, 
    type: Notification['type'], 
    value: number, 
    worldPosition: { x: number; y: number }
  ): void {
    const now = Date.now();
    const combineThreshold = 500; // Combine notifications within 500ms
    
    // For persistent notifications, don't combine and use special duration
    if (type === 'persistent') {
      // Remove any existing persistent notifications with the same message
      this.notifications = this.notifications.filter(n => n.type !== 'persistent' || n.message !== message);
      
      const notification: Notification = {
        id: `notification_${this.nextId++}`,
        message,
        type,
        value,
        timestamp: now,
        duration: value === 0 ? Infinity : value, // Use value as duration, 0 = infinite
        worldPosition: { ...worldPosition },
        alpha: 1.0,
        count: 1,
        persistent: true
      };

      this.notifications.push(notification);
      return;
    }
    
    // Check if we can combine with an existing notification of the same type
    // Don't combine notifications that contain "toilet is fucked" or lights messages - they should be unique
    const shouldNotCombine = message.includes("toilet is fucked") || 
                             message.includes("Lights turned") ||
                             message.includes("Battery dead");
    
    const existingNotification = !shouldNotCombine ? this.notifications.find(n => 
      n.type === type && 
      n.value === value && 
      (now - n.timestamp) < combineThreshold
    ) : null;
    
    if (existingNotification) {
      // Combine with existing notification
      existingNotification.count += 1;
      existingNotification.timestamp = now; // Reset timer
      existingNotification.alpha = 1.0; // Reset alpha
      
      // Update message to show combined count
      const baseMessage = message.replace(/^\+?(\d+)/, '').trim();
      existingNotification.message = `+${existingNotification.count} ${baseMessage}`;
    } else {
      // Create new notification with world position only
      const notification: Notification = {
        id: `notification_${this.nextId++}`,
        message,
        type,
        value,
        timestamp: now,
        duration: 2000, // 2 seconds
        worldPosition: { ...worldPosition },
        alpha: 1.0,
        count: 1
      };

      this.notifications.push(notification);
    }
  }

  /**
   * Update all notifications
   */
  updateNotifications(_deltaTime: number): void {
    const now = Date.now();
    
    this.notifications = this.notifications.filter(notification => {
      // Persistent notifications don't expire
      if (notification.persistent) {
        notification.alpha = 1.0; // Keep at full opacity
        return true;
      }
      
      const elapsed = now - notification.timestamp;
      const progress = elapsed / notification.duration;
      
      if (progress >= 1) {
        return false; // Remove expired notifications
      }

      // Update alpha (fade out) - no position changes needed since they're fixed screen positions
      notification.alpha = 1 - progress;

      return true;
    });
  }

  /**
   * Clear all notifications
   */
  clearNotifications(): void {
    this.notifications = [];
  }

  /**
   * Update position of persistent notifications
   */
  updatePersistentNotificationPosition(message: string, newPosition: { x: number; y: number }): void {
    const notification = this.notifications.find(n => n.persistent && n.message === message);
    if (notification) {
      notification.worldPosition = { ...newPosition };
    }
  }

  /**
   * Remove persistent notification by message
   */
  removePersistentNotification(message: string): void {
    this.notifications = this.notifications.filter(n => !(n.persistent && n.message === message));
  }

  /**
   * Get notifications grouped by type for stacking
   */
  getGroupedNotifications(): Map<string, Notification[]> {
    const grouped = new Map<string, Notification[]>();
    
    this.notifications.forEach(notification => {
      const key = `${notification.type}_${notification.value > 0 ? 'positive' : 'negative'}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(notification);
    });

    return grouped;
  }
}

/**
 * Helper functions for creating common notifications
 */
export function createCoinNotification(value: number, worldPosition: { x: number; y: number }): void {
  const system = getNotificationSystem();
  const message = value > 0 ? `+${value} Coin` : `${value} Coin`;
  system.addNotification(message, 'coin', value, worldPosition);
}

export function createStatNotification(
  statType: 'thirst' | 'hunger' | 'energy' | 'mood' | 'karma' | 'speed',
  value: number,
  worldPosition: { x: number; y: number }
): void {
  const system = getNotificationSystem();
  const message = value > 0 ? `+${value} ${statType.charAt(0).toUpperCase() + statType.slice(1)}` : `${value} ${statType.charAt(0).toUpperCase() + statType.slice(1)}`;
  system.addNotification(message, statType, value, worldPosition);
}

export function createItemNotification(itemName: string, worldPosition: { x: number; y: number }): void {
  const system = getNotificationSystem();
  system.addNotification(`+1 ${itemName}`, 'item', 1, worldPosition);
}

// Global notification system instance
let globalNotificationSystem: NotificationSystem | null = null;

export function getNotificationSystem(): NotificationSystem {
  if (!globalNotificationSystem) {
    globalNotificationSystem = new NotificationSystem();
  }
  return globalNotificationSystem;
}
