import { isNative } from "@/lib/platform";
import { registerDeviceToken } from "@/lib/push.functions";

let listenersRegistered = false;

export async function registerPushListeners(): Promise<void> {
  if (!isNative() || listenersRegistered) return;
  const { PushNotifications } = await import("@capacitor/push-notifications");

  PushNotifications.addListener("registration", (token) => {
    void registerDeviceToken({
      data: { token: token.value, platform: "ios" },
    }).catch(() => {
      /* best-effort; will retry on next launch */
    });
  });

  PushNotifications.addListener("registrationError", (err) => {
    // eslint-disable-next-line no-console
    console.warn("APNs registration error", err);
  });

  PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
    // Route deep links carried in notification data.
    const path =
      typeof action.notification.data?.path === "string"
        ? (action.notification.data.path as string)
        : null;
    if (path && path.startsWith("/")) {
      window.location.assign(path);
    }
  });

  listenersRegistered = true;
}

/** Prompt the user for push permission and register with APNs. */
export async function requestPushPermission(): Promise<"granted" | "denied" | "prompt"> {
  if (!isNative()) return "denied";
  const { PushNotifications } = await import("@capacitor/push-notifications");
  const perm = await PushNotifications.requestPermissions();
  if (perm.receive !== "granted") {
    return perm.receive === "denied" ? "denied" : "prompt";
  }
  await PushNotifications.register();
  return "granted";
}
