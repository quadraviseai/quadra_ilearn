import { LinearGradient } from "expo-linear-gradient";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "../context/AuthContext";
import { colors, gradients, radii, spacing } from "../theme";

function AppHeader({ title, subtitle, showLogout = true, fullBleed = false }) {
  const { logout } = useAuth();

  return (
    <LinearGradient
      colors={gradients.headerGlass}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.wrap, fullBleed ? styles.wrapFullBleed : null]}
    >
      <View style={styles.brandRow}>
        <View style={styles.logoMark}>
          <Image source={require("../../assets/quadravise-logo.png")} style={styles.logoImage} resizeMode="contain" />
        </View>
        <View style={styles.brandCopy}>
          <Text style={styles.brandTitle}>QuadraILearn</Text>
          <Text style={styles.screenTitle}>{title}</Text>
          {subtitle ? <Text style={styles.screenSubtitle}>{subtitle}</Text> : null}
        </View>
        {showLogout ? (
          <Pressable style={styles.logoutButton} onPress={logout}>
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        ) : null}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  wrapFullBleed: {
    marginHorizontal: -spacing.lg,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  brandRow: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  logoMark: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
  logoImage: {
    width: 32,
    height: 32,
  },
  brandCopy: {
    flex: 1,
    gap: 2,
  },
  brandTitle: {
    color: colors.accentStrong,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  screenTitle: {
    color: colors.ink,
    fontSize: 26,
    lineHeight: 30,
    fontWeight: "900",
  },
  screenSubtitle: {
    color: colors.slate,
    marginTop: 2,
    lineHeight: 18,
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: colors.white,
  },
  logoutText: {
    color: colors.ink,
    fontWeight: "800",
    fontSize: 12,
  },
});

export default AppHeader;
