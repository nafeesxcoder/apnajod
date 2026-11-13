import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";

import { pushApi } from "../../api/pushApi";
import { pushTarget, type PushTargets } from "./nativePush";

export { pushTarget, type PushTargets } from "./nativePush";

// A notification that arrives while the app is open still shows at the top.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let savedToken: string | null = null;

/**
 * Asks once for permission, sends this phone's push token to the server,
 * and opens the right chat or post when a notification is tapped (also
 * when the tap is what started the app). Returns a stop function.
 */
export function startNativePush(accessToken: string, targets: PushTargets): () => void {
  let live = true;
  const open = (data: unknown) => {
    const target = pushTarget(data);
    if (target.chat) targets.onOpenChat(target.chat);
    else if (target.post) targets.onOpenPost(target.post);
  };

  void (async () => {
    try {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Messages and activity",
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 200, 250],
          lightColor: "#B81C3C",
          sound: "default",
        });
      }
      let { status } = await Notifications.getPermissionsAsync();
      if (status !== "granted") status = (await Notifications.requestPermissionsAsync()).status;
      if (status !== "granted" || !live) return;
      const projectId =
        (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ??
        (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId;
      const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
      if (!live) return;
      savedToken = token;
      await pushApi.saveDeviceToken(accessToken, token, Platform.OS);
    } catch {
      // Notifications are optional; nothing else should stop because of them.
    }
  })();

  const tapped = Notifications.addNotificationResponseReceivedListener((response) =>
    open(response.notification.request.content.data),
  );
  Notifications.getLastNotificationResponseAsync()
    .then((response) => {
      if (live && response) open(response.notification.request.content.data);
    })
    .catch(() => undefined);

  return () => {
    live = false;
    tapped.remove();
  };
}

/** On sign-out: this phone stops getting that account's notifications. */
export async function forgetNativePush(accessToken: string): Promise<void> {
  if (!savedToken) return;
  const token = savedToken;
  savedToken = null;
  await pushApi.removeDeviceToken(accessToken, token).catch(() => undefined);
}
