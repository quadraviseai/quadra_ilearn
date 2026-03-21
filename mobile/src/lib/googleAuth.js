import AsyncStorage from "@react-native-async-storage/async-storage";

const PENDING_GOOGLE_AUTH_KEY = "quadrailearn-pending-google-auth";

export const DEFAULT_GOOGLE_WEB_CLIENT_ID = "52499757157-mr3kcemi7o13gilv87oqvrr0p8p9jvkv.apps.googleusercontent.com";
export const DEFAULT_GOOGLE_ANDROID_CLIENT_ID = "52499757157-6724lll0jek5os124d8jctg11kfjhrck.apps.googleusercontent.com";
export const DEFAULT_GOOGLE_IOS_CLIENT_ID = "52499757157-mr3kcemi7o13gilv87oqvrr0p8p9jvkv.apps.googleusercontent.com";

export function buildNativeGoogleRedirect(clientId) {
  const compactClientId = String(clientId || "").trim().replace(/\.apps\.googleusercontent\.com$/i, "");
  if (!compactClientId) {
    return undefined;
  }
  return `com.googleusercontent.apps.${compactClientId}:/oauthredirect`;
}

export async function setPendingGoogleAuth(payload) {
  await AsyncStorage.setItem(PENDING_GOOGLE_AUTH_KEY, JSON.stringify(payload || {}));
}

export async function getPendingGoogleAuth() {
  try {
    const raw = await AsyncStorage.getItem(PENDING_GOOGLE_AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function clearPendingGoogleAuth() {
  try {
    await AsyncStorage.removeItem(PENDING_GOOGLE_AUTH_KEY);
  } catch {
    // Ignore cleanup errors.
  }
}
