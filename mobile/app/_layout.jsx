import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

import { AuthProvider, useAuth } from "../src/context/AuthContext";
import { colors } from "../src/theme";

function AppNavigator() {
  const { ready, isAuthenticated, user } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!ready) {
      return;
    }

    const inAuthGroup = segments[0] === "(auth)";
    const inStudentGroup = segments[0] === "(student)";
    const inGuardianGroup = segments[0] === "(guardian)";

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/(auth)/login");
      return;
    }

    if (isAuthenticated && inAuthGroup) {
      router.replace(user?.role === "guardian" ? "/(guardian)" : "/(student)");
      return;
    }

    if (isAuthenticated && user?.role === "student" && inGuardianGroup) {
      router.replace("/(student)");
      return;
    }

    if (isAuthenticated && user?.role === "guardian" && inStudentGroup) {
      router.replace("/(guardian)");
    }
  }, [isAuthenticated, ready, router, segments, user?.role]);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.cloud }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)/login" />
      <Stack.Screen name="(student)" />
      <Stack.Screen name="(guardian)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}
