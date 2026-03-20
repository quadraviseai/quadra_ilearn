import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";

import { colors, gradients, radii, spacing } from "../theme";

const tileGradients = {
  accent: gradients.statAccent,
  gold: gradients.statGold,
  coral: gradients.statCoral,
};

function StatTile({ label, value, tone = "accent" }) {
  const gradient = tileGradients[tone] || tileGradients.accent;

  return (
    <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tile}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 100,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.lineSoft,
  },
  value: {
    fontSize: 24,
    fontWeight: "900",
    color: colors.ink,
  },
  label: {
    fontSize: 11,
    color: colors.slate,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
});

export default StatTile;
