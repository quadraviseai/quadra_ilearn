import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radii, shadows, spacing } from "../theme";

function BackgroundDecor() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.glowTop} />
      <View style={styles.glowMid} />
      <View style={styles.glowBottom} />
    </View>
  );
}

function Screen({ children, scroll = true, loading = false, refreshControl }) {
  const insets = useSafeAreaInsets();

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <BackgroundDecor />
        <View style={styles.loaderWrap}>
          <View style={styles.loaderCard}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: spacing.xxl + insets.bottom + 84 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl ? <RefreshControl tintColor={colors.accent} refreshing={false} onRefresh={refreshControl} /> : undefined}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, { paddingBottom: spacing.xxl + insets.bottom + 84 }]}>{children}</View>
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
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  loaderWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  loaderCard: {
    width: 88,
    height: 88,
    borderRadius: radii.lg,
    backgroundColor: "rgba(255,255,255,0.88)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.card,
  },
  glowTop: {
    position: "absolute",
    top: -50,
    right: -20,
    width: 220,
    height: 220,
    borderRadius: radii.pill,
    backgroundColor: "rgba(251, 100, 4, 0.12)",
  },
  glowMid: {
    position: "absolute",
    top: 210,
    left: -60,
    width: 200,
    height: 200,
    borderRadius: radii.pill,
    backgroundColor: "rgba(20, 87, 154, 0.1)",
  },
  glowBottom: {
    position: "absolute",
    bottom: 120,
    right: -70,
    width: 240,
    height: 240,
    borderRadius: radii.pill,
    backgroundColor: "rgba(242, 178, 71, 0.08)",
  },
});

export default Screen;
