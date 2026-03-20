import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, shadows } from "../../src/theme";

export default function AdminLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.slate,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "800",
        },
        tabBarStyle: {
          position: "absolute",
          left: 14,
          right: 14,
          bottom: 12,
          height: 68 + insets.bottom,
          paddingTop: 10,
          paddingBottom: Math.max(insets.bottom, 10),
          paddingHorizontal: 10,
          borderRadius: 28,
          backgroundColor: colors.glass,
          borderTopWidth: 1,
          borderTopColor: colors.lineSoft,
          ...shadows.card,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Ionicons name="speedometer-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: "Users",
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="token-rules"
        options={{
          title: "Tokens",
          tabBarIcon: ({ color, size }) => <Ionicons name="wallet-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
