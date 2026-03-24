import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image, PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, radii, shadows, spacing } from "../src/theme";
import { setOnboardingCompleted } from "../src/lib/onboarding";

const STEPS = [
  {
    id: "what",
    step: "01",
    title: "What is QuadraILearn?",
    description:
      "QuadraILearn is an exam preparation app for JEE, NEET, and board students. It brings tests, performance insights, and learning direction into one structured workflow.",
    icon: "school-outline",
    points: ["Practice through structured mock tests", "Review progress in one place", "Study with a clear next step"],
  },
  {
    id: "who",
    step: "02",
    title: "Who benefits from it?",
    description:
      "It is designed mainly for students preparing for competitive and board exams. Parents, mentors, and academic teams can also benefit from improved visibility into progress.",
    icon: "people-outline",
    points: ["Students preparing for JEE", "Students preparing for NEET", "Board exam learners and supporters"],
  },
  {
    id: "benefits",
    step: "03",
    title: "What benefits do users get?",
    description:
      "Users can identify weak areas earlier, practice more consistently, and take action based on real performance instead of guesswork.",
    icon: "bar-chart-outline",
    points: ["Better visibility into weak topics", "More focused daily practice", "Improved decision-making after every test"],
  },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const step = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;
  const isHeroStep = step.id === "what" || step.id === "who" || step.id === "benefits";
  const heroImage = step.id === "who"
    ? require("../assets/landing_02.png")
    : step.id === "benefits"
      ? require("../assets/landing_03.png")
      : require("../assets/landing_01.png");

  const finishOnboarding = async () => {
    if (submitting) {
      return;
    }

    setSubmitting(true);
    await setOnboardingCompleted(true);
    router.replace("/");
  };

  const handleNext = async () => {
    if (isLastStep) {
      await handleSkip();
      return;
    }

    setStepIndex((current) => Math.min(current + 1, STEPS.length - 1));
  };

  const handlePrevious = () => {
    setStepIndex((current) => Math.max(current - 1, 0));
  };

  const handleSkip = async () => {
    if (submitting) {
      return;
    }

    setSubmitting(true);
    await setOnboardingCompleted(true);
    router.replace("/");
  };

  const swipeResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 18 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx <= -48) {
            void handleNext();
            return;
          }

          if (gestureState.dx >= 48) {
            handlePrevious();
          }
        },
      }),
    [isLastStep, submitting, stepIndex],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      {isHeroStep ? (
        <View pointerEvents="none" style={styles.backgroundLayer}>
          <LinearGradient colors={["#f7fbff", "#eef4fb", "#f8f3eb"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.backgroundGradient} />
          <View style={styles.heroGlowPrimary} />
          <View style={styles.heroGlowAccent} />
        </View>
      ) : null}

      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.logoWrap}>
              <Image source={require("../assets/quadravise-logo.png")} style={styles.logoImage} resizeMode="contain" />
            </View>
            <View style={styles.brandCopy}>
              <Text style={styles.brandName}>QuadraILearn</Text>
              <Text style={styles.brandTag}>Student learning and assessment platform</Text>
            </View>
          </View>

          {!isLastStep ? (
            <Pressable onPress={handleSkip} style={styles.skipButton}>
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
          ) : (
            <View style={styles.skipButtonPlaceholder} />
          )}
        </View>

        {isHeroStep ? (
          <View {...swipeResponder.panHandlers} style={[styles.contentSection, styles.contentSectionFirst]}>
            <View style={styles.firstHeroCopy}>
              <Text style={styles.stepHeroLabel}>Step {step.step}</Text>
              <Text style={styles.firstHeroTitle}>{step.title}</Text>
              <Text style={styles.firstHeroDescription}>{step.description}</Text>
            </View>

            {step.id !== "benefits" ? (
              <View style={styles.heroActionRow}>
                <Pressable onPress={handleSkip} style={styles.primaryChip}>
                  <Text style={styles.primaryChipText}>Start free</Text>
                </Pressable>
              </View>
            ) : null}

            <View style={[styles.posterWrap, step.id === "benefits" ? styles.posterWrapBenefits : null]}>
              <View style={styles.posterGlow} />
              <Image source={heroImage} style={[styles.posterImage, step.id === "benefits" ? styles.posterImageBenefits : null]} resizeMode="contain" />

              <View style={[styles.floatBadge, styles.floatBadgeLeft]}>
                <Ionicons name="checkmark" size={14} color="#FF5B8A" />
              </View>
              <View style={[styles.floatBadge, styles.floatBadgeRight]}>
                <Ionicons name="radio-button-on" size={12} color="#6D59FF" />
              </View>
              <View style={[styles.floatBadge, styles.floatBadgeBottomLeft]}>
                <Ionicons name="logo-facebook" size={14} color="#385898" />
              </View>
              <View style={[styles.floatBadge, styles.floatBadgeBottomCenter]}>
                <Ionicons name="paper-plane" size={14} color="#27A6E5" />
              </View>
              <View style={[styles.floatBadge, styles.floatBadgeBottomRight]}>
                <Ionicons name="person" size={14} color="#FF9A3D" />
              </View>
              <View style={styles.ratingPill}>
                <Ionicons name="star" size={12} color="#FFB020" />
                <Ionicons name="star" size={12} color="#FFB020" />
                <Ionicons name="star" size={12} color="#FFB020" />
                <Ionicons name="star" size={12} color="#FFB020" />
                <Ionicons name="star" size={12} color="#FFB020" />
              </View>
            </View>

            {step.id === "benefits" ? (
              <>
                <View style={styles.divider} />
                <View style={styles.listBlock}>
                  {step.points.map((point) => (
                    <View key={point} style={styles.listItem}>
                      <View style={styles.bullet} />
                      <Text style={styles.listText}>{point}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}
          </View>
        ) : (
          <View {...swipeResponder.panHandlers} style={styles.contentSection}>
            <View style={styles.stepRow}>
              <Text style={styles.stepText}>Step {step.step}</Text>
              <View style={styles.iconWrap}>
                <Ionicons name={step.icon} size={22} color={colors.brandBlue} />
              </View>
            </View>

            <View style={styles.copyBlock}>
              <Text style={styles.title}>{step.title}</Text>
              <Text style={styles.description}>{step.description}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.listBlock}>
              {step.points.map((point) => (
                <View key={point} style={styles.listItem}>
                  <View style={styles.bullet} />
                  <Text style={styles.listText}>{point}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <Pressable onPress={handleNext} style={styles.floatingNextButton}>
          <Ionicons name="arrow-forward" size={22} color={colors.white} />
        </Pressable>

        <View style={styles.bottomProgressShell}>
          <View style={styles.bottomProgressTrack}>
            {STEPS.map((item, index) => (
              <View key={item.id} style={[styles.bottomProgressDot, index === stepIndex ? styles.bottomProgressDotActive : null]} />
            ))}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  heroGlowPrimary: {
    position: "absolute",
    top: -40,
    right: -10,
    width: 260,
    height: 260,
    borderRadius: radii.pill,
    backgroundColor: "rgba(20, 87, 154, 0.10)",
  },
  heroGlowAccent: {
    position: "absolute",
    left: -50,
    top: 180,
    width: 220,
    height: 220,
    borderRadius: radii.pill,
    backgroundColor: "rgba(251, 100, 4, 0.08)",
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 22,
    gap: 18,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  logoWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#E2E8F0",
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
    color: "#102A43",
    fontSize: 19,
    fontWeight: "800",
  },
  brandTag: {
    color: "#627D98",
    fontSize: 14,
    lineHeight: 20,
  },
  skipButton: {
    minHeight: 36,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  skipButtonPlaceholder: {
    width: 40,
    minHeight: 36,
  },
  skipText: {
    color: "#486581",
    fontSize: 13,
    fontWeight: "600",
  },
  contentSection: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: 8,
    gap: 28,
  },
  contentSectionFirst: {
    paddingTop: 0,
    paddingBottom: 4,
    justifyContent: "space-between",
  },
  firstHeroCopy: {
    marginTop: 8,
    gap: 10,
    maxWidth: "78%",
  },
  stepHeroLabel: {
    color: colors.brandBlue,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  firstHeroTitle: {
    color: "#1E2330",
    fontSize: 31,
    lineHeight: 36,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  firstHeroDescription: {
    color: "#7E6B75",
    fontSize: 12,
    lineHeight: 18,
  },
  heroActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 18,
  },
  primaryChip: {
    minHeight: 48,
    paddingHorizontal: 22,
    borderRadius: radii.pill,
    backgroundColor: "#FF7A00",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF7A00",
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  primaryChipText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  secondaryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  playChipIcon: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryChipText: {
    color: "#5E4A54",
    fontSize: 12,
    fontWeight: "600",
  },
  posterWrap: {
    flex: 1,
    marginTop: 14,
    position: "relative",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  posterWrapBenefits: {
    marginTop: 30,
    minHeight: 420,
  },
  posterGlow: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: "rgba(236, 163, 191, 0.38)",
    bottom: 26,
    left: 12,
  },
  posterImage: {
    width: "98%",
    height: 340,
  },
  posterImageBenefits: {
    height: 400,
  },
  floatBadge: {
    position: "absolute",
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.96)",
    alignItems: "center",
    justifyContent: "center",
    ...shadows.card,
  },
  floatBadgeLeft: {
    top: 50,
    left: 16,
  },
  floatBadgeRight: {
    top: 86,
    right: 20,
  },
  floatBadgeBottomLeft: {
    bottom: 32,
    left: 8,
  },
  floatBadgeBottomCenter: {
    bottom: 4,
    left: 86,
  },
  floatBadgeBottomRight: {
    bottom: 30,
    right: 8,
  },
  ratingPill: {
    position: "absolute",
    bottom: 56,
    right: 48,
    flexDirection: "row",
    gap: 3,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: "#33283A",
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepText: {
    color: colors.brandBlue,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(20, 87, 154, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  copyBlock: {
    gap: 14,
  },
  title: {
    color: "#102A43",
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  description: {
    color: "#52606D",
    fontSize: 16,
    lineHeight: 26,
    maxWidth: 520,
  },
  divider: {
    height: 1,
    backgroundColor: "#D9E2EC",
  },
  listBlock: {
    gap: 16,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  bullet: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: colors.accent,
    marginTop: 7,
  },
  listText: {
    flex: 1,
    color: "#334E68",
    fontSize: 15,
    lineHeight: 24,
  },
  floatingNextButton: {
    position: "absolute",
    right: 20,
    top: "54%",
    width: 58,
    height: 58,
    borderRadius: 999,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.accent,
    shadowOpacity: 0.24,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  bottomProgressShell: {
    paddingHorizontal: 2,
    paddingVertical: 6,
  },
  bottomProgressTrack: {
    flexDirection: "row",
    gap: 10,
  },
  bottomProgressDot: {
    flex: 1,
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: "rgba(148, 163, 184, 0.35)",
  },
  bottomProgressDotActive: {
    backgroundColor: colors.brandBlue,
  },
});
