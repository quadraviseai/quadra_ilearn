import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const SESSION_KEY = "quadrailearn-mobile-session";

async function canUseSecureStore() {
  if (Platform.OS === "web") {
    return false;
  }
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

async function readLegacySession() {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function clearLegacySession() {
  try {
    await AsyncStorage.removeItem(SESSION_KEY);
  } catch {
    // Ignore cleanup errors.
  }
}

export async function readSession() {
  const secureStoreEnabled = await canUseSecureStore();

  if (!secureStoreEnabled) {
    return readLegacySession();
  }

  try {
    const raw = await SecureStore.getItemAsync(SESSION_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // Fall through to legacy storage migration path.
  }

  const legacySession = await readLegacySession();
  if (legacySession) {
    try {
      await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(legacySession));
      await clearLegacySession();
    } catch {
      // Ignore migration write failure and still return the legacy session.
    }
  }
  return legacySession;
}

export async function writeSession(session) {
  const secureStoreEnabled = await canUseSecureStore();

  if (!secureStoreEnabled) {
    if (session) {
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      await AsyncStorage.removeItem(SESSION_KEY);
    }
    return;
  }

  if (session) {
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
  } else {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  }
  await clearLegacySession();
}
