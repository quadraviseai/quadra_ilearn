import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, gradients, radii, shadows, spacing } from "../theme";

function AppLoader({ label = "Preparing your workspace", detail = "Loading QuadraILearn mobile" }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={styles.glowTop} />
        <View style={styles.glowMid} />
        <View style={styles.glowBottom} />
      </View>

      <View style={styles.centerWrap}>
        <LinearGradient colors={gradients.authHero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.loaderShell}>
          <View style={styles.logoMark}>
            <Image source={require("../../assets/quadravise-logo.png")} style={styles.logoImage} resizeMode="contain" />
          </View>
          <Text style={styles.title}>QuadraILearn</Text>
          <Text style={styles.label}>{label}</Text>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.detail}>{detail}</Text>
        </LinearGradient>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.cloud,
  },
  centerWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  loaderShell: {
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.glassChip,
    gap: spacing.md,
    ...shadows.card,
  },
  logoMark: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.glow,
  },
  logoImage: {
    width: 46,
    height: 46,
  },
  title: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: "900",
  },
  label: {
    color: colors.inkSoft,
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },
  detail: {
    color: colors.slate,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  glowTop: {
    position: "absolute",
    top: -50,
    right: -20,
    width: 240,
    height: 240,
    borderRadius: radii.pill,
    backgroundColor: colors.accentGlow,
  },
  glowMid: {
    position: "absolute",
    top: 220,
    left: -60,
    width: 220,
    height: 220,
    borderRadius: radii.pill,
    backgroundColor: colors.brandBlueOverlay,
  },
  glowBottom: {
    position: "absolute",
    bottom: 100,
    right: -70,
    width: 260,
    height: 260,
    borderRadius: radii.pill,
    backgroundColor: colors.goldOverlay,
  },
});

export default AppLoader;
