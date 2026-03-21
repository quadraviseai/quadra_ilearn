import { Share, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Image } from "react-native";

import Screen from "../../src/components/Screen";
import { buildDemoResult, getDemoQuestions, resetDemoSession, startDemoSession } from "../../src/lib/demoTest";

function getResultMood(correct, total) {
  const ratio = total > 0 ? correct / total : 0;
  if (ratio >= 0.8) {
    return {
      title: "Excellent 🔥",
    };
  }
  if (ratio >= 0.5) {
    return {
      title: "Nice Work 👍",
    };
  }
  return {
    title: "Good Start 💪",
  };
}

export default function DemoResultScreen() {
  const router = useRouter();
  const result = buildDemoResult();

  if (!result) {
    router.replace("/demo");
    return null;
  }

  const mood = getResultMood(result.correct, result.totalQuestions);
  const higherPercent = Math.max(0, 100 - result.betterThan);

  return (
    <Screen>
      <View style={styles.wrap}>
        <View style={styles.hero}>
          <View style={styles.brandRow}>
            <View style={styles.logoWrap}>
              <Image source={require("../../assets/quadravise-logo.png")} style={styles.logo} resizeMode="contain" />
            </View>
            <Text style={styles.brandText}>QuadraILearn</Text>
          </View>
          <Text style={styles.moodTitle}>{mood.title}</Text>
          <Text style={styles.scoreLabel}>Your Score</Text>
          <Text style={styles.scoreValue}>{result.correct} / {result.totalQuestions}</Text>
          <View style={styles.rankStrip}>
            <Text style={styles.rankHook}>🔥 You beat {result.betterThan}% of students</Text>
          </View>
          <Text style={styles.rankSubtext}>Only {higherPercent}% scored higher than you.</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.correctCard]}>
            <Text style={styles.statLabel}>Correct</Text>
            <Text style={styles.statValue}>{result.correct}</Text>
          </View>
          <View style={[styles.statCard, styles.wrongCard]}>
            <Text style={styles.statLabel}>Wrong</Text>
            <Text style={styles.statValue}>{result.wrong}</Text>
          </View>
          <View style={[styles.statCard, styles.timeCard]}>
            <Text style={styles.statLabel}>Time</Text>
            <Text style={styles.statValue}>{result.elapsedSeconds}s</Text>
          </View>
        </View>

        <View style={styles.improveCard}>
          <Text style={styles.improveTitle}>See where you stand and improve faster</Text>
          <Text style={styles.improveBoost}>You can improve by +15% with focused practice.</Text>
        </View>

        <View style={styles.lockCard}>
          <View style={styles.lockHeader}>
            <View style={styles.lockIconWrap}>
              <Ionicons name="lock-closed" size={16} color="#1D4E89" />
            </View>
            <View style={styles.lockCopy}>
              <Text style={styles.lockTitle}>Unlock Your Full Report</Text>
              <Text style={styles.lockSubtext}>See exactly where you stand and how to improve.</Text>
              <Text style={styles.unlockPrompt}>Your rank is ready - unlock now</Text>
            </View>
          </View>

          <View style={styles.lockList}>
            <View style={styles.lockItem}>
              <Text style={styles.lockBullet}>•</Text>
              <Text style={styles.lockLine}>Your exact rank</Text>
            </View>
            <View style={styles.lockItem}>
              <Text style={styles.lockBullet}>•</Text>
              <Text style={styles.lockLine}>Weak topics</Text>
            </View>
            <View style={styles.lockItem}>
              <Text style={styles.lockBullet}>•</Text>
              <Text style={styles.lockLine}>AI explanations</Text>
            </View>
            <View style={styles.lockItem}>
              <Text style={styles.lockBullet}>•</Text>
              <Text style={styles.lockLine}>Improvement plan</Text>
            </View>
          </View>
        </View>

        <Pressable style={styles.primaryButton} onPress={() => router.push("/demo/unlock")}>
          <Text style={styles.primaryButtonText}>Unlock My Rank & Insights</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => {
            const examName = result.examName;
            const questions = getDemoQuestions();
            resetDemoSession();
            startDemoSession(examName, {
              examId: result.examId,
              questionCount: result.totalQuestions,
              questions,
            });
            router.replace("/demo/test?index=0");
          }}
        >
          <Text style={styles.secondaryButtonText}>Improve Your Score</Text>
        </Pressable>

        <Pressable
          style={styles.textButton}
          onPress={() =>
            Share.share({
              message: `I beat ${result.betterThan}% of students on the QuadraILearn quick test. Can you beat my rank?`,
            })
          }
        >
          <Text style={styles.textButtonText}>Share Your Rank</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 18,
    paddingTop: 10,
  },
  hero: {
    gap: 6,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  logoWrap: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 24,
    height: 24,
  },
  brandText: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "700",
  },
  moodTitle: {
    color: "#1D4E89",
    fontSize: 18,
    fontWeight: "700",
  },
  scoreLabel: {
    color: "#475569",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  scoreValue: {
    color: "#0F172A",
    fontSize: 44,
    lineHeight: 48,
    fontWeight: "800",
    textAlign: "center",
    alignSelf: "center",
  },
  rankStrip: {
    alignSelf: "flex-start",
    backgroundColor: "#FFF7ED",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 4,
  },
  rankHook: {
    color: "#0F172A",
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "700",
  },
  rankSubtext: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: "row",
    gap: 14,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  correctCard: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
  },
  wrongCard: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  timeCard: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
  },
  statLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
  },
  statValue: {
    color: "#0F172A",
    fontSize: 22,
    fontWeight: "700",
  },
  improveCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 18,
    gap: 8,
  },
  improveTitle: {
    color: "#0F172A",
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "700",
  },
  improveBoost: {
    color: "#1D4E89",
    fontSize: 14,
    fontWeight: "700",
  },
  lockCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#DBEAFE",
    padding: 18,
    gap: 14,
  },
  lockHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  lockIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  lockCopy: {
    flex: 1,
    gap: 5,
  },
  lockTitle: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "700",
  },
  lockSubtext: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 22,
  },
  lockItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  lockBullet: {
    color: "#1D4E89",
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "700",
  },
  lockLine: {
    flex: 1,
    color: "#0F172A",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
  unlockPrompt: {
    color: "#1D4E89",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },
  lockList: {
    gap: 8,
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 999,
    backgroundColor: "#FF7A00",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF7A00",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
    marginTop: 8,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: "#1D4E89",
    fontSize: 15,
    fontWeight: "600",
  },
  textButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  textButtonText: {
    color: "#1D4E89",
    fontSize: 14,
    fontWeight: "600",
  },
});
