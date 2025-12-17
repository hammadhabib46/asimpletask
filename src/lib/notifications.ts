// Browser Notification utilities

export type NotificationPermission = 'granted' | 'denied' | 'default';

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
        console.warn('This browser does not support notifications');
        return 'denied';
    }

    if (Notification.permission === 'granted') {
        return 'granted';
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission as NotificationPermission;
    }

    return Notification.permission as NotificationPermission;
}

/**
 * Show a browser notification (works even when tab is not focused)
 */
export function showNotification(
    title: string,
    options?: NotificationOptions & { onClick?: () => void }
): Notification | null {
    if (!('Notification' in window)) {
        console.warn('This browser does not support notifications');
        return null;
    }

    if (Notification.permission !== 'granted') {
        console.warn('Notification permission not granted');
        return null;
    }

    const notification = new Notification(title, {
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        ...options,
    });

    if (options?.onClick) {
        notification.onclick = () => {
            window.focus();
            options.onClick?.();
            notification.close();
        };
    }

    return notification;
}

/**
 * Check if notifications are supported and permission is granted
 */
export function canShowNotifications(): boolean {
    return 'Notification' in window && Notification.permission === 'granted';
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
    if (!('Notification' in window)) {
        return 'denied';
    }
    return Notification.permission as NotificationPermission;
}
