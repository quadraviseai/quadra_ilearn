import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";

import { colors, radii, shadows, spacing } from "../theme";

function SectionCard({ title, subtitle, children, tone = "default" }) {
  const accentBand = tone === "accent" ? ["rgba(251, 100, 4, 0.18)", "rgba(20, 87, 154, 0.08)"] : ["rgba(20, 87, 154, 0.12)", "rgba(251, 100, 4, 0.04)"];

  return (
    <View style={styles.shell}>
      <LinearGradient colors={accentBand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.topBand} />
      <View style={styles.card}>
        {(title || subtitle) ? (
          <View style={styles.head}>
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
        ) : null}
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.68)",
    overflow: "hidden",
    ...shadows.card,
  },
  topBand: {
    height: 8,
    width: "100%",
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.92)",
    padding: spacing.lg,
    gap: spacing.md,
  },
  head: {
    gap: 6,
  },
  title: {
    fontSize: 19,
    fontWeight: "800",
    color: colors.ink,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.slate,
  },
});

export default SectionCard;
