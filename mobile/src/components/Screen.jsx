import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import AppLoader from "./AppLoader";
import { colors, radii, shadows, spacing } from "../theme";

function BackgroundDecor() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.topWash} />
      <View style={styles.bottomWash} />
    </View>
  );
}

function Screen({ children, scroll = true, loading = false, refreshControl }) {
  const insets = useSafeAreaInsets();

  if (loading) {
    return <AppLoader />;
  }

  const content = scroll ? (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingBottom: spacing.xxl + insets.bottom + 84 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl ? <RefreshControl tintColor={colors.accent} refreshing={false} onRefresh={refreshControl} /> : undefined}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, styles.staticContent, { paddingBottom: spacing.xxl + insets.bottom + 84 }]}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <BackgroundDecor />
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.cloud,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  staticContent: {
    flex: 1,
  },
  glowTop: {
    position: "absolute",
    top: -50,
    right: -20,
    width: 220,
    height: 220,
    borderRadius: radii.pill,
    backgroundColor: colors.accentGlow,
  },
  topWash: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 180,
    backgroundColor: "rgba(251, 100, 4, 0.05)",
  },
  bottomWash: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 220,
    backgroundColor: "rgba(20, 87, 154, 0.04)",
  },
});

export default Screen;
