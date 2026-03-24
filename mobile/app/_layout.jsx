import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { Text, TextInput } from "react-native";
import { useFonts, DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from "@expo-google-fonts/dm-sans";

import AppLoader from "../src/components/AppLoader";
import { AuthProvider, useAuth } from "../src/context/AuthContext";
import { getPendingAuthRedirectSync } from "../src/lib/authRedirect";
import { getOnboardingCompleted } from "../src/lib/onboarding";
import {
  attachNotificationHandlers,
  registerForPushNotificationsAsync,
  syncPushDevice,
} from "../src/lib/notifications";

function routeForRole(role) {
  if (role === "admin") {
    return "/(admin)";
  }
  return "/(student)/diagnostics";
}

function AppNavigator() {
  const { ready, isAuthenticated, user, logout } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [onboardingReady, setOnboardingReady] = useState(false);
  const [onboardingCompleted, setOnboardingState] = useState(false);

  useEffect(() => {
    let active = true;

    const loadOnboarding = async () => {
      const completed = await getOnboardingCompleted();
      if (!active) {
        return;
      }
      setOnboardingState(completed);
      setOnboardingReady(true);
    };

    loadOnboarding();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ready || !onboardingReady) {
      return;
    }

    let cancelled = false;

    const syncNavigation = async () => {
      const inAuthGroup = segments[0] === "(auth)";
      const inStudentGroup = segments[0] === "(student)";
      const inAdminGroup = segments[0] === "(admin)";
      const inDemoRoute = segments[0] === "demo";
      const inLegacyLanding = segments[0] === "landing";
      const inWelcomeRoute = segments[0] === "welcome";
      const inOAuthRedirect = segments[0] === "oauthredirect";
      const inPublicLanding = segments.length === 0;

      let completed = onboardingCompleted;
      if (!isAuthenticated && !completed) {
        completed = await getOnboardingCompleted();
        if (cancelled) {
          return;
        }
        if (completed !== onboardingCompleted) {
          setOnboardingState(completed);
        }
      }

      const requiresOnboarding = !isAuthenticated && !completed;

      if (requiresOnboarding && !inWelcomeRoute) {
        router.replace("/welcome");
        return;
      }

      if (!requiresOnboarding && inWelcomeRoute) {
        router.replace(isAuthenticated ? routeForRole(user?.role) : "/");
        return;
      }

      if (!isAuthenticated && !inAuthGroup && !inPublicLanding && !inDemoRoute && !inOAuthRedirect && !inWelcomeRoute && !inLegacyLanding) {
        router.replace("/(auth)/login");
        return;
      }

      if (isAuthenticated && inPublicLanding) {
        router.replace(routeForRole(user?.role));
        return;
      }

      if (isAuthenticated && inAuthGroup) {
        router.replace(getPendingAuthRedirectSync() || routeForRole(user?.role));
        return;
      }

      if (isAuthenticated && user?.role === "guardian") {
        logout();
        router.replace("/(auth)/login");
        return;
      }

      if (isAuthenticated && user?.role === "student" && inAdminGroup) {
        router.replace("/(student)");
        return;
      }

      if (isAuthenticated && user?.role === "admin" && inStudentGroup) {
        router.replace("/(admin)");
      }
    };

    void syncNavigation();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, logout, onboardingCompleted, onboardingReady, ready, router, segments, user?.role]);

  useEffect(() => {
    if (!ready || !isAuthenticated || user?.role !== "student") {
      return;
    }

    let active = true;
    const sync = async () => {
      try {
        const token = await registerForPushNotificationsAsync();
        if (active && token) {
          await syncPushDevice(token);
        }
      } catch {
        // Ignore registration failure for now; app flow should continue.
      }
    };

    sync();
    const detach = attachNotificationHandlers((data) => {
      const screen = data?.screen;
      if (screen === "diagnostics") {
        router.push("/(student)/diagnostics");
      } else if (screen === "report" && data?.reportId) {
        router.push({ pathname: "/(student)/report", params: { reportId: String(data.reportId) } });
      } else if (screen === "profile") {
        router.push("/(student)/profile");
      }
    });

    return () => {
      active = false;
      detach?.();
    };
  }, [isAuthenticated, ready, router, user?.role]);

  if (!ready || !onboardingReady) {
    return <AppLoader label="Checking your session" detail="Loading account state and mobile routes" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  useEffect(() => {
    if (!fontsLoaded) {
      return;
    }

    Text.defaultProps = Text.defaultProps || {};
    Text.defaultProps.style = [{ fontFamily: "DMSans_400Regular" }];

    TextInput.defaultProps = TextInput.defaultProps || {};
    TextInput.defaultProps.style = [{ fontFamily: "DMSans_400Regular" }];
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return <AppLoader label="Loading fonts" detail="Applying DM Sans across the mobile app" />;
  }

  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}
