import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";

import { colors, radii, shadows, spacing } from "../theme";

const gradients = {
  accent: ["#fff3e8", "#ffffff"],
  gold: ["#fff6dc", "#ffffff"],
  coral: ["#ffe8dd", "#ffffff"],
};

function StatTile({ label, value, tone = "accent" }) {
  const gradient = gradients[tone] || gradients.accent;

  return (
    <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tile}>
      <View style={styles.labelChip}>
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text style={styles.value}>{value}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 100,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: "rgba(16, 62, 111, 0.08)",
    ...shadows.card,
  },
  labelChip: {
    alignSelf: "flex-start",
    borderRadius: radii.pill,
    backgroundColor: "rgba(255,255,255,0.75)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.line,
  },
  value: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.ink,
  },
  label: {
    fontSize: 12,
    color: colors.inkSoft,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
});

export default StatTile;
