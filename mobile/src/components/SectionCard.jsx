import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";

import { colors, gradients, radii, spacing } from "../theme";

function SectionCard({ title, subtitle, children, tone = "default" }) {
  const accentBand = tone === "accent" ? gradients.sectionAccent : gradients.commerceBand;

  return (
    <View style={styles.shell}>
      <LinearGradient colors={accentBand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.topBand} />
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
    borderRadius: radii.lg,
    backgroundColor: colors.section,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    overflow: "hidden",
  },
  topBand: {
    height: 4,
    width: "100%",
  },
  card: {
    backgroundColor: colors.section,
    padding: spacing.md,
    gap: spacing.md,
  },
  head: {
    gap: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.ink,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.slate,
  },
});

export default SectionCard;
