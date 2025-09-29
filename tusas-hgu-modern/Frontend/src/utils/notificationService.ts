// 🔔 Notification Service - Reconnect Events & System Notifications
// Eliminates notification duplication and provides consistent UX

export interface NotificationConfig {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  persistent?: boolean;
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}

export interface Notification extends NotificationConfig {
  id: string;
  timestamp: Date;
  read: boolean;
}

class NotificationService {
  private notifications: Notification[] = [];
  private listeners: Array<(notifications: Notification[]) => void> = [];
  private maxNotifications = 50;

  // Add notification
  add(config: NotificationConfig): string {
    const notification: Notification = {
      ...config,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      read: false,
      duration: config.duration ?? (config.type === 'error' ? 0 : 5000), // Errors are persistent by default
    };

    this.notifications.unshift(notification);

    // Keep only recent notifications
    if (this.notifications.length > this.maxNotifications) {
      this.notifications = this.notifications.slice(0, this.maxNotifications);
    }

    // Notify listeners
    this.listeners.forEach(listener => listener([...this.notifications]));

    // Auto-dismiss non-persistent notifications
    if (!config.persistent && notification.duration && notification.duration > 0) {
      setTimeout(() => {
        this.remove(notification.id);
      }, notification.duration);
    }

    // Log to console for debugging
    console.log(`🔔 Notification [${config.type.toUpperCase()}]: ${config.title} - ${config.message}`);

    return notification.id;
  }

  // Remove notification
  remove(id: string): void {
    const index = this.notifications.findIndex(n => n.id === id);
    if (index > -1) {
      this.notifications.splice(index, 1);
      this.listeners.forEach(listener => listener([...this.notifications]));
    }
  }

  // Mark as read
  markAsRead(id: string): void {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      notification.read = true;
      this.listeners.forEach(listener => listener([...this.notifications]));
    }
  }

  // Clear all notifications
  clear(): void {
    this.notifications = [];
    this.listeners.forEach(listener => listener([...this.notifications]));
  }

  // Get all notifications
  getAll(): Notification[] {
    return [...this.notifications];
  }

  // Get unread count
  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  // Subscribe to notifications
  subscribe(listener: (notifications: Notification[]) => void): () => void {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Convenience methods for common notifications
  success(title: string, message: string, duration?: number): string {
    return this.add({ type: 'success', title, message, duration });
  }

  error(title: string, message: string, persistent: boolean = true): string {
    return this.add({ type: 'error', title, message, persistent });
  }

  warning(title: string, message: string, duration?: number): string {
    return this.add({ type: 'warning', title, message, duration });
  }

  info(title: string, message: string, duration?: number): string {
    return this.add({ type: 'info', title, message, duration });
  }

  // OPC-specific notifications
  connectionLost(): string {
    return this.error(
      'Connection Lost',
      'OPC UA connection lost. Attempting to reconnect...',
      true
    );
  }

  connectionRestored(): string {
    return this.success(
      'Connection Restored',
      'OPC UA connection restored successfully',
      3000
    );
  }

  reconnectAttempt(attempt: number, maxAttempts: number): string {
    return this.warning(
      'Reconnecting',
      `Attempting to reconnect (${attempt}/${maxAttempts})...`,
      2000
    );
  }

  reconnectFailed(maxAttempts: number): string {
    return this.error(
      'Reconnection Failed',
      `Failed to reconnect after ${maxAttempts} attempts. Please check network connection.`,
      true
    );
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;