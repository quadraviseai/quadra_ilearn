import { useEffect, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AppState, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import Screen from "../../src/components/Screen";
import { answerDemoQuestion, buildDemoResult, getDemoQuestions, getDemoSession, getRemainingDemoSeconds, hydrateDemoSession } from "../../src/lib/demoTest";

function formatTimer(seconds) {
  const safe = Math.max(0, seconds || 0);
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

const OPTION_KEYS = ["A", "B", "C", "D"];

export default function DemoTestScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [questions, setQuestions] = useState(() => getDemoQuestions());
  const [session, setSession] = useState(() => getDemoSession());
  const [hydrated, setHydrated] = useState(() => Boolean(getDemoSession()?.questions?.length));
  const index = Math.max(0, Math.min(Number(params.index || 0), questions.length - 1));
  const currentQuestion = questions[index];
  const [selectedOptionId, setSelectedOptionId] = useState(session?.answers?.[currentQuestion?.id] || "");
  const [remainingSeconds, setRemainingSeconds] = useState(getRemainingDemoSeconds());
  const [showAwayNotice, setShowAwayNotice] = useState(false);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    let active = true;

    const ensureSession = async () => {
      if (session?.questions?.length) {
        setHydrated(true);
        return;
      }
      const restored = await hydrateDemoSession();
      if (!active) {
        return;
      }
      setSession(restored);
      setQuestions(Array.isArray(restored?.questions) ? restored.questions : []);
      setHydrated(true);
    };

    void ensureSession();

    return () => {
      active = false;
    };
  }, [session?.questions?.length]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    if (!session || !questions.length) {
      router.replace("/demo");
      return;
    }

    const timer = setInterval(() => {
      const next = getRemainingDemoSeconds();
      setRemainingSeconds(next);
      if (next <= 0) {
        clearInterval(timer);
        buildDemoResult();
        router.replace("/demo/result");
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [hydrated, questions.length, router, session]);

  useEffect(() => {
    setSelectedOptionId(getDemoSession()?.answers?.[currentQuestion?.id] || "");
  }, [currentQuestion?.id]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const wasBackgrounded = appStateRef.current.match(/inactive|background/);
      if (wasBackgrounded && nextState === "active") {
        setRemainingSeconds(getRemainingDemoSeconds());
        setShowAwayNotice(true);
      }
      appStateRef.current = nextState;
    });

    return () => subscription.remove();
  }, []);

  if (!hydrated) {
    return <Screen loading />;
  }

  if (!session || !currentQuestion) {
    return null;
  }

  const isLastQuestion = index === questions.length - 1;
  const progressValue = ((index + 1) / questions.length) * 100;
  const timerStyle = remainingSeconds <= 10 ? styles.timerDanger : remainingSeconds <= 20 ? styles.timerWarn : null;

  return (
    <Screen scroll={false} topPadding={0} horizontalPadding={0}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.headerBrand}>
              <View style={styles.logoWrap}>
                <Image source={require("../../assets/quadravise-logo.png")} style={styles.logo} resizeMode="contain" />
              </View>
            </View>
            <View style={styles.headerMeta}>
              <Text style={styles.progressText}>Q{index + 1} of {questions.length}</Text>
              <Text style={[styles.timer, timerStyle]}>⏱ {formatTimer(remainingSeconds)}</Text>
            </View>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressValue}%` }]} />
          </View>
        </View>

        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {showAwayNotice ? (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>Timer continued while you were away</Text>
            </View>
          ) : null}

          <View style={styles.questionBlock}>
            <Text style={styles.questionLabel}>Q{index + 1}.</Text>
            <Text style={styles.questionText}>{currentQuestion.prompt}</Text>
          </View>

          <View style={styles.options}>
            {currentQuestion.options.map((option, optionIndex) => {
              const selected = option.id === selectedOptionId;
              return (
                <Pressable
                  key={option.id}
                  style={({ pressed }) => [
                    styles.optionButton,
                    selected ? styles.optionButtonActive : null,
                    pressed ? styles.optionButtonPressed : null,
                  ]}
                  onPress={() => {
                    setSelectedOptionId(option.id);
                    setShowAwayNotice(false);
                    answerDemoQuestion(currentQuestion.id, option.id);
                  }}
                >
                  <View style={[styles.optionKey, selected ? styles.optionKeyActive : null]}>
                    <Text style={[styles.optionKeyText, selected ? styles.optionKeyTextActive : null]}>
                      {OPTION_KEYS[optionIndex] || option.id.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.optionLabel, selected ? styles.optionLabelActive : null]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.helperRow}>
            <Text style={styles.helperIcon}>⚡</Text>
            <Text style={styles.helper}>Your answer is saved</Text>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              !selectedOptionId ? styles.disabled : null,
              pressed && selectedOptionId ? styles.primaryButtonPressed : null,
            ]}
            disabled={!selectedOptionId}
            onPress={() => {
              if (!selectedOptionId) {
                return;
              }
              if (isLastQuestion) {
                buildDemoResult();
                router.replace("/demo/result");
                return;
              }
              router.replace(`/demo/test?index=${index + 1}`);
            }}
          >
            <Text style={styles.primaryButtonText}>{isLastQuestion ? "Submit Test" : "Next Question"}</Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 10,
  },
  headerRow: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerBrand: {
    width: 32,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  logoWrap: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 22,
    height: 22,
  },
  headerMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  progressText: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "700",
  },
  timer: {
    color: "#1D4E89",
    fontSize: 16,
    fontWeight: "800",
  },
  timerWarn: {
    color: "#EA580C",
  },
  timerDanger: {
    color: "#DC2626",
  },
  progressTrack: {
    height: 7,
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#1D4E89",
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    gap: 14,
  },
  notice: {
    alignSelf: "flex-start",
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  noticeText: {
    color: "#C2410C",
    fontSize: 12,
    fontWeight: "600",
  },
  questionBlock: {
    gap: 6,
  },
  questionLabel: {
    color: "#1D4E89",
    fontSize: 12,
    fontWeight: "700",
  },
  questionText: {
    color: "#0F172A",
    fontSize: 15,
    lineHeight: 24,
    fontWeight: "600",
  },
  options: {
    gap: 8,
    marginTop: 0,
  },
  optionButton: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  optionButtonActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#1D4E89",
  },
  optionButtonPressed: {
    transform: [{ scale: 0.985 }],
  },
  optionKey: {
    width: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
  },
  optionKeyActive: {
    borderColor: "#1D4E89",
    backgroundColor: "#DBEAFE",
  },
  optionKeyText: {
    color: "#1D4E89",
    fontSize: 12,
    fontWeight: "800",
  },
  optionKeyTextActive: {
    color: "#1D4E89",
  },
  optionLabel: {
    flex: 1,
    color: "#0F172A",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
  optionLabelActive: {
    color: "#0F172A",
    fontWeight: "600",
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    gap: 8,
  },
  helperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
  },
  helperIcon: {
    color: "#64748B",
    fontSize: 11,
  },
  helper: {
    color: "#64748B",
    fontSize: 11,
    textAlign: "right",
  },
  primaryButton: {
    minHeight: 46,
    borderRadius: 999,
    backgroundColor: "#FF7A00",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF7A00",
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  primaryButtonPressed: {
    opacity: 0.92,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.45,
  },
});
