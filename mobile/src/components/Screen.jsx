import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import AppLoader from "./AppLoader";
import { colors, spacing } from "../theme";

function Screen({
  children,
  scroll = true,
  loading = false,
  refreshControl,
  topPadding = spacing.md,
  horizontalPadding = spacing.lg,
}) {
  const insets = useSafeAreaInsets();

  if (loading) {
    return <AppLoader />;
  }

  const content = scroll ? (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: topPadding,
          paddingBottom: spacing.xxl + insets.bottom + 84,
          paddingHorizontal: horizontalPadding,
        },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl ? <RefreshControl tintColor={colors.accent} refreshing={false} onRefresh={refreshControl} /> : undefined}
    >
      {children}
    </ScrollView>
  ) : (
    <View
      style={[
        styles.content,
        styles.staticContent,
        {
          paddingTop: topPadding,
          paddingBottom: spacing.xxl + insets.bottom + 84,
          paddingHorizontal: horizontalPadding,
        },
      ]}
    >
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
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
    gap: spacing.md,
  },
  staticContent: {
    flex: 1,
  },
});

export default Screen;
