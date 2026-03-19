import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "../context/AuthContext";
import { colors, radii, shadows, spacing } from "../theme";

function AppHeader({ title, subtitle, showLogout = true }) {
  const { logout } = useAuth();

  return (
    <LinearGradient colors={["rgba(255,255,255,0.96)", "rgba(234,244,255,0.86)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.wrap}>
      <View style={styles.brandRow}>
        <LinearGradient colors={[colors.accent, colors.coral]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logoMark}>
          <Text style={styles.logoText}>Q</Text>
        </LinearGradient>
        <View style={styles.brandCopy}>
          <Text style={styles.brandTitle}>QuadraILearn</Text>
          <Text style={styles.screenTitle}>{title}</Text>
          {subtitle ? <Text style={styles.screenSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {showLogout ? (
        <Pressable style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      ) : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
    marginBottom: spacing.xs,
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.75)",
    ...shadows.card,
  },
  brandRow: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "flex-start",
    flex: 1,
  },
  logoMark: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.glow,
  },
  logoText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 24,
  },
  brandCopy: {
    flex: 1,
    gap: 2,
  },
  brandTitle: {
    color: colors.accentStrong,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  screenTitle: {
    color: colors.ink,
    fontSize: 24,
    lineHeight: 29,
    fontWeight: "800",
  },
  screenSubtitle: {
    color: colors.slate,
    marginTop: 4,
    lineHeight: 19,
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.86)",
  },
  logoutText: {
    color: colors.ink,
    fontWeight: "700",
  },
});

export default AppHeader;
