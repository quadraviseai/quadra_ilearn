import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import Screen from "../src/components/Screen";

const ui = {
  color: {
    primaryBlue: "#1D4E89",
    primaryOrange: "#FF7A00",
    background: "#F8FAFC",
    surface: "#FFFFFF",
    surfaceSoft: "#F1F5F9",
    surfaceWarm: "#FFF7ED",
    border: "#E2E8F0",
    divider: "#E5E7EB",
    textPrimary: "#0F172A",
    textSecondary: "#475569",
    textTertiary: "#94A3B8",
  },
  radius: {
    md: 12,
    lg: 16,
    pill: 999,
  },
  spacing: {
    md: 12,
    lg: 16,
  },
};

const leaderboardPreview = [
  { rank: 1, name: "Rahul", score: "98%", tone: "#F4B400" },
  { rank: 2, name: "Sneha", score: "96%", tone: "#B8C2CC" },
  { rank: 3, name: "Arjun", score: "95%", tone: "#C97A40" },
];

function SectionTitle({ children }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export default function LandingScreen() {
  return (
    <Screen>
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <View style={styles.logoWrap}>
            <Image source={require("../assets/quadravise-logo.png")} style={styles.logoImage} resizeMode="contain" />
          </View>
          <View style={styles.brandCopy}>
            <Text style={styles.brandName}>QuadraILearn</Text>
            <Text style={styles.brandTagline}>Compete. Improve. Rank higher.</Text>
          </View>
        </View>
      </View>

      <View style={styles.heroBlock}>
        <View style={styles.heroBadge}>
          <Ionicons name="flash-outline" size={14} color={ui.color.primaryBlue} />
          <Text style={styles.heroBadgeText}>Live practice environment</Text>
        </View>

        <Text style={styles.heroTitle}>Test Your Rank in 60 Seconds</Text>
        <Text style={styles.heroCopy}>See your score, rank, and improve instantly.</Text>
        <Text style={styles.heroTrustCopy}>No signup required</Text>

        <View style={styles.heroActions}>
          <Link href="/demo" asChild>
            <Pressable style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Start Free Test</Text>
            </Pressable>
          </Link>
          <Link href="/(auth)/login" asChild>
            <Pressable style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Login</Text>
            </Pressable>
          </Link>
        </View>

        <Text style={styles.heroSocialProof}>12k+ students attempted today • Top 10% scored 85%+</Text>
      </View>

      <View style={styles.sectionBlock}>
        <SectionTitle>Top Performers</SectionTitle>
        <View style={styles.listCard}>
          {leaderboardPreview.map((entry, index) => (
            <View key={entry.rank} style={[styles.leaderboardRow, index > 0 ? styles.rowDivider : null]}>
              <View style={[styles.rankCircle, { backgroundColor: `${entry.tone}20` }]}>
                <Text style={[styles.rankCircleText, { color: entry.tone }]}>#{entry.rank}</Text>
              </View>
              <View style={styles.leaderboardCopy}>
                <Text style={styles.leaderboardName}>{entry.name}</Text>
              </View>
              <Text style={styles.leaderboardScore}>{entry.score}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.helperText}>You&apos;re unranked — take a test to get your rank</Text>
      </View>

      <View style={styles.sectionBlock}>
        <SectionTitle>Daily Practice 🔥</SectionTitle>
        <View style={styles.practiceCard}>
          <Text style={styles.practiceCopy}>Solve 5 questions daily and build your streak.</Text>
          <Text style={styles.streakHook}>Don&apos;t break your streak 🔥</Text>
        <Link href="/demo" asChild>
          <Pressable style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Start Today</Text>
          </Pressable>
        </Link>
        </View>
      </View>

      <View style={styles.finalCard}>
        <Text style={styles.finalTitle}>See Your Rank Now</Text>
        <Link href="/demo" asChild>
          <Pressable style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Start Free Test</Text>
          </Pressable>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    gap: 12,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logoWrap: {
    width: 48,
    height: 48,
    borderRadius: ui.radius.lg,
    backgroundColor: ui.color.surface,
    borderWidth: 1,
    borderColor: "#E7EDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  logoImage: {
    width: 30,
    height: 30,
  },
  brandCopy: {
    flex: 1,
    gap: 2,
  },
  brandName: {
    color: ui.color.primaryBlue,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  brandTagline: {
    color: ui.color.textPrimary,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "500",
  },
  heroBlock: {
    paddingTop: 6,
    gap: 16,
  },
  heroBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: ui.radius.pill,
    backgroundColor: ui.color.surfaceSoft,
  },
  heroBadgeText: {
    color: ui.color.primaryBlue,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "500",
    textTransform: "uppercase",
  },
  heroTitle: {
    color: ui.color.textPrimary,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "700",
    maxWidth: 280,
  },
  heroCopy: {
    color: ui.color.textSecondary,
    fontSize: 16,
    lineHeight: 24,
  },
  heroTrustCopy: {
    color: ui.color.primaryBlue,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "500",
    marginTop: -4,
  },
  heroActions: {
    flexDirection: "row",
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: ui.radius.pill,
    backgroundColor: ui.color.primaryOrange,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: ui.color.surface,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600",
  },
  secondaryButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: ui.radius.pill,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: ui.color.primaryBlue,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600",
  },
  heroSocialProof: {
    color: ui.color.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "500",
  },
  sectionBlock: {
    gap: 12,
    marginTop: 10,
  },
  sectionTitle: {
    color: ui.color.textPrimary,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "600",
  },
  listCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: ui.radius.lg,
    borderWidth: 1,
    borderColor: "#E9EEF5",
    paddingHorizontal: 16,
  },
  leaderboardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: ui.color.divider,
  },
  rankCircle: {
    minWidth: 42,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: ui.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  rankCircleText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
  },
  leaderboardCopy: {
    flex: 1,
  },
  leaderboardName: {
    color: ui.color.textPrimary,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600",
  },
  leaderboardScore: {
    color: ui.color.textPrimary,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "600",
  },
  helperText: {
    color: ui.color.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  practiceCard: {
    backgroundColor: "#FFFBF7",
    borderRadius: ui.radius.lg,
    borderWidth: 1,
    borderColor: "#FCE4C8",
    padding: 16,
    gap: 14,
  },
  practiceCopy: {
    color: ui.color.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
  streakHook: {
    color: ui.color.primaryOrange,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "600",
    marginTop: -4,
  },
  finalCard: {
    backgroundColor: "#FCFDFE",
    borderRadius: ui.radius.lg,
    borderWidth: 1,
    borderColor: "#EEF2F7",
    padding: 16,
    gap: 12,
    marginTop: 10,
  },
  finalTitle: {
    color: ui.color.textPrimary,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "600",
  },
});
