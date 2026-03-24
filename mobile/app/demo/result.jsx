import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import Screen from "../../src/components/Screen";
import { buildDemoResult, getDemoQuestions, resetDemoSession, startDemoSession } from "../../src/lib/demoTest";

function getAccuracy(correct, total) {
  if (!total) {
    return 0;
  }
  return Math.round((correct / total) * 100);
}

function getMessage(accuracy) {
  if (accuracy < 30) {
    return "Require attention";
  }
  if (accuracy < 40) {
    return "Good start";
  }
  if (accuracy < 50) {
    return "Good going";
  }
  if (accuracy < 60) {
    return "One more step";
  }
  if (accuracy <= 80) {
    return "Dream comes to true";
  }
  return "You are rock";
}

function getCaption(accuracy) {
  if (accuracy < 30) {
    return "Your result needs attention. Focus on basics and weak topics before the next test.";
  }
  if (accuracy < 40) {
    return "You have started the journey. Build consistency and improve topic clarity.";
  }
  if (accuracy < 50) {
    return "You are moving in the right direction. A better revision cycle can lift your score.";
  }
  if (accuracy < 60) {
    return "You are close to the next level. One more strong push can improve your rank.";
  }
  if (accuracy <= 80) {
    return "Your progress is becoming real. Keep practicing smartly to turn this into a strong result.";
  }
  return "This is an excellent result. Keep the momentum and sharpen the final few weak areas.";
}

export default function DemoResultScreen() {
  const router = useRouter();
  const result = buildDemoResult();

  if (!result) {
    router.replace("/demo");
    return null;
  }

  const accuracy = getAccuracy(result.correct, result.totalQuestions);
  const message = getMessage(accuracy);
  const caption = getCaption(accuracy);
  const progressRatio = Math.max(0, Math.min(accuracy, 100)) / 100;
  const mainArcScale = progressRatio <= 0 ? 0 : Math.max(0.08, Math.min(progressRatio / 0.72, 1));
  const accentArcScale = progressRatio <= 0.72 ? 0 : Math.max(0, Math.min((progressRatio - 0.72) / 0.28, 1));

  const handlePracticeAgain = () => {
    const examName = result.examName;
    const questions = getDemoQuestions();
    resetDemoSession();
    startDemoSession(examName, {
      examId: result.examId,
      questionCount: result.totalQuestions,
      questions,
    });
    router.replace("/demo/test?index=0");
  };

  return (
    <Screen backgroundColor="#F4F7FC">
      <View style={styles.wrap}>
        <View style={styles.card}>
          <View style={styles.sparkleOne} />
          <View style={styles.sparkleTwo} />
          <View style={styles.sparkleThree} />
          <View style={styles.sparkleFour} />

          <View style={styles.ringWrap}>
            <View style={styles.ringOuter}>
              <View style={styles.ringTrack} />
              <View style={[styles.ringProgressMain, { opacity: progressRatio > 0 ? 1 : 0, transform: [{ rotate: "-20deg" }, { scaleX: mainArcScale }] }]} />
              <View style={[styles.ringProgressAccent, { opacity: progressRatio > 0.72 ? 1 : 0, transform: [{ rotate: "-20deg" }, { scaleX: accentArcScale || 0.01 }] }]} />
              <View style={styles.ringMiddle}>
                <View style={styles.ringInner}>
                  <Text style={styles.percent}>{accuracy}%</Text>
                  <View style={styles.innerDivider} />
                  <Text style={styles.title}>{message}</Text>
                </View>
              </View>
            </View>

            <View style={styles.medalBadge}>
              <Ionicons name="ribbon" size={30} color="#F59E0B" />
            </View>
          </View>

          <Text style={styles.headingText}>{accuracy}%</Text>
          <Text style={styles.caption}>{caption}</Text>

          <Pressable style={styles.primaryButton} onPress={() => router.push("/demo/full-report")}>
            <Text style={styles.primaryButtonText}>View my weakness</Text>
          </Pressable>

          <Pressable style={styles.secondaryLink} onPress={handlePracticeAgain}>
            <Text style={styles.secondaryLinkText}>Practice again</Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E9EEF7",
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
    overflow: "hidden",
  },
  sparkleOne: {
    position: "absolute",
    top: 38,
    left: 34,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#F7C95B",
  },
  sparkleTwo: {
    position: "absolute",
    top: 64,
    left: 52,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#FFE08A",
  },
  sparkleThree: {
    position: "absolute",
    top: 58,
    right: 38,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#F8B84D",
  },
  sparkleFour: {
    position: "absolute",
    top: 90,
    right: 24,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#FDE68A",
  },
  ringWrap: {
    width: 214,
    height: 214,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  ringOuter: {
    width: 190,
    height: 190,
    borderRadius: 95,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  ringTrack: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 12,
    borderColor: "#DCEAF9",
  },
  ringProgressMain: {
    position: "absolute",
    top: 12,
    left: 12,
    width: 166,
    height: 166,
    borderRadius: 83,
    borderWidth: 12,
    borderColor: "transparent",
    borderTopColor: "#FFB347",
    borderLeftColor: "#FFB347",
  },
  ringProgressAccent: {
    position: "absolute",
    top: 12,
    left: 12,
    width: 166,
    height: 166,
    borderRadius: 83,
    borderWidth: 12,
    borderColor: "transparent",
    borderRightColor: "#FF8D34",
  },
  ringMiddle: {
    width: 152,
    height: 152,
    borderRadius: 76,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#EEF2F7",
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  ringInner: {
    width: 136,
    height: 136,
    borderRadius: 68,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  percent: {
    color: "#16356A",
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "800",
  },
  innerDivider: {
    width: 56,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#F9B54C",
    marginVertical: 8,
  },
  title: {
    color: "#1B3B71",
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "700",
  },
  medalBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FFD166",
    borderWidth: 4,
    borderColor: "#F59E0B",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#F59E0B",
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  headingText: {
    color: "#1E3A6D",
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800",
    marginTop: -2,
  },
  caption: {
    color: "#4D6281",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 258,
    marginTop: 6,
  },
  primaryButton: {
    width: "100%",
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: "#FF8D34",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    shadowColor: "#FF8D34",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  secondaryLink: {
    marginTop: 14,
  },
  secondaryLinkText: {
    color: "#97A6BB",
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "500",
  },
});
