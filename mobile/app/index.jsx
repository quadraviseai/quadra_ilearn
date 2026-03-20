import { useEffect, useState } from "react";
import { Link } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import Screen from "../src/components/Screen";
import { fetchExams } from "../src/lib/studentFlow";
import { colors, radii, spacing } from "../src/theme";

const journeySteps = [
  { title: "Sign in", copy: "Open your student account", icon: "person-outline" },
  { title: "Choose exam", copy: "Pick the admin-published exam", icon: "school-outline" },
  { title: "Start mock test", copy: "Finish with timer and see result", icon: "timer-outline" },
];

function examIcon(name) {
  const value = String(name || "").toLowerCase();
  if (value.includes("jee")) {
    return "flask-outline";
  }
  if (value.includes("neet") || value.includes("medical")) {
    return "medkit-outline";
  }
  if (value.includes("board") || value.includes("cbse") || value.includes("icse")) {
    return "school-outline";
  }
  if (value.includes("gate")) {
    return "construct-outline";
  }
  return "document-text-outline";
}

export default function LandingScreen() {
  const [examItems, setExamItems] = useState([]);
  const [examError, setExamError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadExams() {
      try {
        const response = await fetchExams();
        if (!active) {
          return;
        }
        setExamItems(Array.isArray(response) ? response.slice(0, 4) : []);
        setExamError("");
      } catch {
        if (!active) {
          return;
        }
        setExamItems([]);
        setExamError("Exams will appear here once published by admin.");
      }
    }

    loadExams();

    return () => {
      active = false;
    };
  }, []);

  return (
    <Screen>
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <View style={styles.logoWrap}>
            <Image source={require("../assets/quadravise-logo.png")} style={styles.logoImage} resizeMode="contain" />
          </View>
          <View>
            <Text style={styles.brandLabel}>Order your favorite</Text>
            <Text style={styles.brandValue}>Next Mock Test</Text>
          </View>
        </View>
        <View style={styles.topIcon}>
          <Ionicons name="notifications-outline" size={18} color={colors.accentStrong} />
        </View>
      </View>

      <View style={styles.heroBackground}>
        <Image source={require("../assets/landing-hero.png")} style={styles.heroBackdropImage} resizeMode="cover" />
        <LinearGradient
          colors={["rgba(255,249,244,0.72)", "rgba(255,244,235,0.10)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBanner}
        >
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>Start your exam journey the right way.</Text>
            <Text style={styles.heroSubtext}>Choose an exam, take the mock test, and review your weak concepts.</Text>
          </View>
          <View style={styles.heroArtwork}>
            <View style={styles.heroArtworkCircleLarge} />
            <View style={styles.heroArtworkCircleSmall} />
            <View style={styles.heroArtworkCard}>
              <Image source={require("../assets/quadravise-logo.png")} style={styles.heroArtworkLogo} resizeMode="contain" />
            </View>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.primaryCtaRow}>
        <Link href="/(auth)/login" asChild>
          <Pressable style={styles.primarySecondary}>
            <Text style={styles.primarySecondaryText}>Login</Text>
          </Pressable>
        </Link>
        <Link href="/(auth)/register" asChild>
          <Pressable style={styles.primaryMain}>
            <Ionicons name="arrow-forward" size={18} color={colors.white} />
            <Text style={styles.primaryMainText}>Register</Text>
          </Pressable>
        </Link>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Explore by exam</Text>
        <Text style={styles.sectionAction}>{examItems.length ? `${examItems.length} live` : ""}</Text>
      </View>

      {examItems.length ? (
        <View style={styles.categoryRow}>
          {examItems.map((item) => (
            <View key={item.id} style={styles.categoryItem}>
              <View style={styles.categoryIcon}>
                <Ionicons name={examIcon(item.name)} size={20} color={colors.accentStrong} />
              </View>
              <Text style={styles.categoryLabel} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={styles.categoryMeta}>{item.subject_count} subjects</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.categoryFallback}>
          <Text style={styles.categoryFallbackText}>{examError || "Loading admin-created exams..."}</Text>
        </View>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Simple flow</Text>
        <Text style={styles.sectionAction}>3 steps</Text>
      </View>

      <LinearGradient colors={["#fff6ee", "#ffffff"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.journeyList}>
        <View style={styles.journeyHeaderBand}>
          <Text style={styles.journeyHeaderTitle}>From first tap to first result</Text>
          <Text style={styles.journeyHeaderCopy}>A fast path built for students who just want to begin.</Text>
        </View>
        {journeySteps.map((item, index) => (
          <View key={item.title} style={[styles.journeyRow, index > 0 ? styles.journeyRowBorder : null]}>
            <View style={styles.journeyStepRail}>
              <View style={styles.journeyIndex}>
                <Text style={styles.journeyIndexText}>{index + 1}</Text>
              </View>
              {index < journeySteps.length - 1 ? <View style={styles.journeyConnector} /> : null}
            </View>
            <View style={styles.journeyIconWrap}>
              <Ionicons name={item.icon} size={18} color={colors.accentStrong} />
            </View>
            <View style={styles.journeyCopy}>
              <Text style={styles.journeyTitle}>{item.title}</Text>
              <Text style={styles.journeyMeta}>{item.copy}</Text>
            </View>
          </View>
        ))}
      </LinearGradient>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  logoWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.lineSoft,
  },
  logoImage: {
    width: 28,
    height: 28,
  },
  brandLabel: {
    color: colors.slate,
    fontSize: 11,
    fontWeight: "700",
  },
  brandValue: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
  },
  topIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff2e8",
  },
  heroBackground: {
    marginHorizontal: -spacing.lg,
    overflow: "hidden",
    backgroundColor: "#fff3e7",
    position: "relative",
  },
  heroBackdropImage: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  heroBanner: {
    flexDirection: "row",
    padding: spacing.lg,
    minHeight: 176,
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  heroCopy: {
    flex: 1,
    gap: 10,
    zIndex: 2,
    paddingRight: 18,
    justifyContent: "center",
  },
  heroTitle: {
    color: colors.ink,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: "900",
    maxWidth: 210,
  },
  heroSubtext: {
    color: colors.inkSoft,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    maxWidth: 205,
  },
  primaryCtaRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  primarySecondary: {
    flex: 1,
    minHeight: 48,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.lineSoft,
  },
  primarySecondaryText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800",
  },
  primaryMain: {
    flex: 1.15,
    minHeight: 48,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    backgroundColor: colors.accent,
  },
  primaryMainText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "800",
  },
  heroArtwork: {
    width: 0,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    opacity: 0,
  },
  heroArtworkCircleLarge: {
    position: "absolute",
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(255,255,255,0.12)",
    right: -2,
    top: 28,
  },
  heroArtworkCircleSmall: {
    position: "absolute",
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(255,255,255,0.18)",
    right: 26,
    top: 14,
  },
  heroArtworkCard: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  heroArtworkLogo: {
    width: 38,
    height: 38,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
  },
  sectionAction: {
    color: colors.accentStrong,
    fontSize: 12,
    fontWeight: "800",
  },
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  categoryItem: {
    flex: 1,
    alignItems: "center",
    gap: 8,
  },
  categoryIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff2e8",
    borderWidth: 1,
    borderColor: "rgba(251, 100, 4, 0.08)",
  },
  categoryLabel: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
    minHeight: 30,
  },
  categoryMeta: {
    color: colors.slate,
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },
  categoryFallback: {
    minHeight: 76,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  categoryFallbackText: {
    color: colors.slate,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  journeyList: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    overflow: "hidden",
    paddingVertical: spacing.xs,
  },
  journeyHeaderBand: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: 4,
  },
  journeyHeaderTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900",
  },
  journeyHeaderCopy: {
    color: colors.slate,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  journeyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  journeyRowBorder: {
    borderTopWidth: 1,
    borderTopColor: "rgba(16, 62, 111, 0.06)",
  },
  journeyStepRail: {
    alignItems: "center",
    width: 42,
  },
  journeyIndex: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent,
    ...{
      shadowColor: colors.accent,
      shadowOpacity: 0.18,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
    },
  },
  journeyIndexText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "900",
  },
  journeyConnector: {
    width: 2,
    flex: 1,
    minHeight: 30,
    marginTop: 6,
    borderRadius: radii.pill,
    backgroundColor: "rgba(251, 100, 4, 0.18)",
  },
  journeyIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff2e8",
    borderWidth: 1,
    borderColor: "rgba(251, 100, 4, 0.08)",
  },
  journeyCopy: {
    flex: 1,
    paddingTop: 2,
  },
  journeyTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800",
  },
  journeyMeta: {
    color: colors.slate,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
});
