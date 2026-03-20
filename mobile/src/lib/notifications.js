import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { apiRequest } from "./api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function getProjectId() {
  return (
    Constants?.expoConfig?.extra?.eas?.projectId
    || Constants?.easConfig?.projectId
    || process.env.EXPO_PUBLIC_EAS_PROJECT_ID
    || ""
  );
}

export async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    return null;
  }

  const existing = await Notifications.getPermissionsAsync();
  let finalStatus = existing.status;
  if (finalStatus !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }
  if (finalStatus !== "granted") {
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#14579a",
    });
  }

  const projectId = getProjectId();
  const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  return token.data;
}

export async function syncPushDevice(expoPushToken) {
  if (!expoPushToken) {
    return null;
  }
  return apiRequest("/api/students/profile/push-device", {
    method: "POST",
    body: {
      expo_push_token: expoPushToken,
      platform: Platform.OS,
      device_id: Constants.sessionId || "",
      app_version: Constants.expoConfig?.version || "",
    },
  });
}

export function attachNotificationHandlers(onRouteRequest) {
  const receivedSub = Notifications.addNotificationReceivedListener(() => {});
  const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response?.notification?.request?.content?.data || {};
    onRouteRequest?.(data);
  });

  return () => {
    receivedSub.remove();
    responseSub.remove();
  };
}
