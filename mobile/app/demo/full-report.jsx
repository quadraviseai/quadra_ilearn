import { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import Screen from "../../src/components/Screen";
import { useAuth } from "../../src/context/AuthContext";
import { buildDemoResult, getDemoQuestions, hydrateDemoSession, resetDemoSession, startDemoSession } from "../../src/lib/demoTest";

export default function DemoFullReportScreen() {
  const router = useRouter();
  const { isAuthenticated, ready } = useAuth();
  const [result, setResult] = useState(() => buildDemoResult());
  const [hydrated, setHydrated] = useState(Boolean(result));

  useEffect(() => {
    let active = true;

    const load = async () => {
      const session = await hydrateDemoSession();
      if (!active) {
        return;
      }
      setResult(session ? buildDemoResult() : null);
      setHydrated(true);
    };

    if (!result) {
      load();
      return () => {
        active = false;
      };
    }

    setHydrated(true);
    return () => {
      active = false;
    };
  }, [result]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    if (!isAuthenticated) {
      router.replace("/demo/unlock");
      return;
    }
    if (hydrated && !result) {
      router.replace("/demo");
    }
  }, [hydrated, isAuthenticated, ready, result, router]);

  if (!ready || !hydrated || !isAuthenticated) {
    return <Screen loading />;
  }

  if (!result) {
    return null;
  }

  const accuracy = Math.round((result.correct / result.totalQuestions) * 100);
  const timeLabel = `${result.elapsedSeconds}s`;
  const targetAccuracy = Math.min(90, accuracy + 27);
  const projectedTopBand = Math.max(10, 60 - Math.round(accuracy / 2));
  const weakTopic = result.weakTopics[0];

  return (
    <Screen>
      <View style={styles.wrap}>
        <View style={styles.brandRow}>
          <View style={styles.logoWrap}>
            <Image source={require("../../assets/quadravise-logo.png")} style={styles.logo} resizeMode="contain" />
          </View>
          <Text style={styles.brandText}>QuadraILearn</Text>
        </View>

        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Full Report</Text>
          <Text style={styles.title}>Your Improvement Plan</Text>
        </View>

        <View style={styles.rankCard}>
          <Text style={styles.rankTitle}>You are {result.rankText}</Text>
          <Text style={styles.rankCopy}>Keep pushing. A stronger next attempt can move you into a much higher band.</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.scoreCard]}>
            <Text style={styles.statLabel}>Score</Text>
            <Text style={styles.statValue}>
              {result.correct} / {result.totalQuestions}
            </Text>
          </View>
          <View style={[styles.statCard, styles.accuracyCard]}>
            <Text style={styles.statLabel}>Accuracy</Text>
            <Text style={styles.statValue}>{accuracy}%</Text>
          </View>
          <View style={[styles.statCard, styles.timeCard]}>
            <Text style={styles.statLabel}>Time</Text>
            <Text style={styles.statValue}>{timeLabel}</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Performance Breakdown</Text>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Correct answers</Text>
            <Text style={styles.breakdownValue}>{result.correct}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Incorrect</Text>
            <Text style={styles.breakdownValue}>{result.wrong}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Accuracy</Text>
            <Text style={styles.breakdownValue}>{accuracy}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${accuracy}%` }]} />
          </View>
          <Text style={styles.sectionHint}>{accuracy >= 60 ? "Steady performance. Keep sharpening speed." : "Needs improvement. Focus on method clarity first."}</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Focus Areas to Improve</Text>
          <View style={styles.topicCard}>
            <Text style={styles.topicTitle}>{weakTopic.topic}</Text>
            <Text style={styles.topicMeta}>Weak understanding detected</Text>
            <Text style={styles.topicAccuracy}>Accuracy: 20%</Text>
            <Text style={styles.topicCopy}>This topic is dragging down your score under time pressure.</Text>
            <Pressable style={styles.topicButton}>
              <Text style={styles.topicButtonText}>Practice Now</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>AI Insight</Text>
          <Text style={styles.insightCopy}>
            You are making mistakes in concept application. Focus on solving step-by-step questions instead of guessing under time pressure.
          </Text>
          <Pressable style={styles.inlineAction}>
            <Text style={styles.inlineActionText}>Try 3 similar questions</Text>
          </Pressable>
        </View>

        <View style={styles.loopCard}>
          <Text style={styles.loopTitle}>Improve Your Rank</Text>
          <Text style={styles.loopCopy}>
            Improve your accuracy to {targetAccuracy}% and you can push toward the top {projectedTopBand}%.
          </Text>
          <Pressable style={styles.inlineAction}>
            <Text style={styles.inlineActionText}>Try again now</Text>
          </Pressable>
        </View>

        <Pressable style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Practice Weak Topics</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => {
            const questions = getDemoQuestions();
            resetDemoSession();
            startDemoSession(result.examName, {
              examId: result.examId,
              questionCount: result.totalQuestions,
              questions,
            });
            router.replace("/demo/test?index=0");
          }}
        >
          <Text style={styles.secondaryButtonText}>Start Next Test</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 18,
    paddingTop: 8,
    paddingBottom: 24,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 32,
  },
  logoWrap: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 28,
    height: 28,
  },
  brandText: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "700",
  },
  headerCopy: {
    gap: 3,
  },
  eyebrow: {
    color: "#1D4E89",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  title: {
    color: "#0F172A",
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
  },
  rankCard: {
    backgroundColor: "#FFFBF5",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#FCD9BD",
    padding: 18,
    gap: 8,
  },
  rankTitle: {
    color: "#9A3412",
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800",
  },
  rankCopy: {
    color: "#7C2D12",
    fontSize: 14,
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 14,
    borderWidth: 1,
    gap: 8,
  },
  scoreCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
  },
  accuracyCard: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
  },
  timeCard: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
  },
  statLabel: {
    color: "#475569",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  statValue: {
    color: "#0F172A",
    fontSize: 21,
    lineHeight: 26,
    fontWeight: "800",
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E7EDF5",
    padding: 18,
    gap: 14,
  },
  sectionTitle: {
    color: "#0F172A",
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800",
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  breakdownLabel: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
  breakdownValue: {
    color: "#0F172A",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
    overflow: "hidden",
    marginTop: 2,
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#1D4E89",
  },
  sectionHint: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 18,
  },
  topicCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    gap: 8,
  },
  topicTitle: {
    color: "#0F172A",
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "700",
  },
  topicMeta: {
    color: "#B45309",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
  topicAccuracy: {
    color: "#1D4E89",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
  },
  topicCopy: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 21,
  },
  topicButton: {
    alignSelf: "flex-start",
    minHeight: 38,
    borderRadius: 999,
    paddingHorizontal: 16,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  topicButtonText: {
    color: "#1D4E89",
    fontSize: 14,
    fontWeight: "700",
  },
  insightCopy: {
    color: "#334155",
    fontSize: 14,
    lineHeight: 22,
  },
  inlineAction: {
    alignSelf: "flex-start",
  },
  inlineActionText: {
    color: "#1D4E89",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
  },
  loopCard: {
    backgroundColor: "#EFF6FF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    padding: 18,
    gap: 10,
  },
  loopTitle: {
    color: "#0F172A",
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
  },
  loopCopy: {
    color: "#334155",
    fontSize: 14,
    lineHeight: 22,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 999,
    backgroundColor: "#FF7A00",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF7A00",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 3,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    minHeight: 52,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: "#1D4E89",
    fontSize: 16,
    fontWeight: "600",
  },
});
