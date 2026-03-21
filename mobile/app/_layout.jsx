import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { Text, TextInput } from "react-native";
import { useFonts, DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from "@expo-google-fonts/dm-sans";

import AppLoader from "../src/components/AppLoader";
import { AuthProvider, useAuth } from "../src/context/AuthContext";
import { getPendingAuthRedirectSync } from "../src/lib/authRedirect";
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

  useEffect(() => {
    if (!ready) {
      return;
    }

    const inAuthGroup = segments[0] === "(auth)";
    const inStudentGroup = segments[0] === "(student)";
    const inAdminGroup = segments[0] === "(admin)";
    const inDemoRoute = segments[0] === "demo";
    const inPublicLanding = segments.length === 0;

    if (!isAuthenticated && !inAuthGroup && !inPublicLanding && !inDemoRoute) {
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
  }, [isAuthenticated, logout, ready, router, segments, user?.role]);

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

  if (!ready) {
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
