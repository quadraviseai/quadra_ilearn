import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radii } from "../../src/theme";

export default function StudentLayout() {
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
        tabBarItemStyle: {
          borderRadius: 14,
          marginHorizontal: 2,
        },
        tabBarStyle: {
          height: 64 + insets.bottom,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingHorizontal: 8,
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
          backgroundColor: colors.white,
          borderTopWidth: 1,
          borderTopColor: colors.line,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="diagnostics"
        options={{
          title: "Exams",
          tabBarIcon: ({ color, size }) => <Ionicons name="flask-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: "Report",
          tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
