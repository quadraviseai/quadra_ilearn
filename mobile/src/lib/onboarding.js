import AsyncStorage from "@react-native-async-storage/async-storage";

const ONBOARDING_COMPLETED_KEY = "quadrailearn-mobile-onboarding-completed";

export async function getOnboardingCompleted() {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
    return value === "true";
  } catch {
    return false;
  }
}

export async function setOnboardingCompleted(completed = true) {
  try {
    if (completed) {
      await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, "true");
      return;
    }

    await AsyncStorage.removeItem(ONBOARDING_COMPLETED_KEY);
  } catch {
    // Ignore onboarding persistence errors so app startup still works.
  }
}
