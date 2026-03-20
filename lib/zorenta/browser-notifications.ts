/**
 * Browser-only desktop notifications (Notification API). No service worker / push.
 * Call sites must check permission before showing; request permission only from a user gesture.
 */

export function isBrowserNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/** Safe read of current permission; `"denied"` when unsupported. */
export function getBrowserNotificationPermission(): NotificationPermission {
  if (!isBrowserNotificationSupported()) return "denied";
  return Notification.permission;
}

/**
 * Must be triggered from a user gesture (click/tap) for reliable browser support.
 * Resolves to the new permission, or `"denied"` on error / unsupported.
 */
export async function requestBrowserNotificationPermission(): Promise<NotificationPermission> {
  if (!isBrowserNotificationSupported()) return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

/**
 * When the incoming message belongs to the open thread, suppress notifications only if
 * this tab is the visible, focused surface. Otherwise show (other thread or background tab).
 */
export function shouldShowMessageNotificationForIncoming(opts: {
  messageBelongsToOpenThread: boolean;
}): boolean {
  if (typeof document === "undefined") return false;
  if (!opts.messageBelongsToOpenThread) return true;
  if (document.visibilityState !== "visible") return true;
  if (!document.hasFocus()) return true;
  return false;
}

export function showIncomingMessageBrowserNotification(opts: {
  title: string;
  body: string;
  conversationId: string;
  messageId: string;
}): void {
  if (!isBrowserNotificationSupported()) return;
  if (Notification.permission !== "granted") return;
  const body = opts.body.trim().slice(0, 240) || "Nieuw bericht";
  try {
    new Notification(opts.title.trim() || "Bericht", {
      body,
      tag: `zorenta:${opts.conversationId}:${opts.messageId}`,
    });
  } catch {
    // Invalid options or non-secure context — ignore.
  }
}
