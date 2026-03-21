import AsyncStorage from "@react-native-async-storage/async-storage";

const PENDING_AUTH_REDIRECT_KEY = "quadrailearn-pending-auth-redirect";

let pendingAuthRedirect = "";

export async function setPendingAuthRedirect(path) {
  const value = typeof path === "string" ? path.trim() : "";
  pendingAuthRedirect = value;

  if (value) {
    await AsyncStorage.setItem(PENDING_AUTH_REDIRECT_KEY, value);
  } else {
    await AsyncStorage.removeItem(PENDING_AUTH_REDIRECT_KEY);
  }
}

export function getPendingAuthRedirectSync() {
  return pendingAuthRedirect;
}

export async function getPendingAuthRedirect() {
  if (pendingAuthRedirect) {
    return pendingAuthRedirect;
  }

  try {
    const stored = await AsyncStorage.getItem(PENDING_AUTH_REDIRECT_KEY);
    pendingAuthRedirect = stored || "";
    return pendingAuthRedirect;
  } catch {
    return "";
  }
}

export async function clearPendingAuthRedirect() {
  pendingAuthRedirect = "";
  try {
    await AsyncStorage.removeItem(PENDING_AUTH_REDIRECT_KEY);
  } catch {
    // Ignore cleanup errors.
  }
}
