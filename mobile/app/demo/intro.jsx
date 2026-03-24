import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import Screen from "../../src/components/Screen";
import { fetchFreeExamSet } from "../../src/lib/studentFlow";
import { startDemoSession } from "../../src/lib/demoTest";

const heroImage = require("../../assets/exam-generic.png");

function examPresentation(name) {
  const value = String(name || "").toLowerCase();
  if (value.includes("jee")) {
    return { icon: "flash-outline", chip: "Trending", accent: "#1D4ED8", price: "Free", category: "Competitive Exam" };
  }
  if (value.includes("neet") || value.includes("medical")) {
    return { icon: "leaf-outline", chip: "Medical", accent: "#15803D", price: "Free", category: "Biology-first track" };
  }
  if (value.includes("10")) {
    return { icon: "school-outline", chip: "Boards", accent: "#CA8A04", price: "Free", category: "Foundation prep" };
  }
  if (value.includes("12")) {
    return { icon: "trophy-outline", chip: "Advanced", accent: "#7C3AED", price: "Free", category: "Senior secondary prep" };
  }
  return { icon: "document-text-outline", chip: "Exam", accent: "#0F766E", price: "Free", category: "Mock test track" };
}

export default function DemoIntroScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const examName = typeof params.exam === "string" && params.exam ? params.exam : "Quick Demo";
  const examId = typeof params.examId === "string" ? params.examId : "";
  const [examSetState, setExamSetState] = useState({ loading: true, questions: [], error: "" });
  const ui = examPresentation(examName);
  const questionCount = examSetState.questions.length || Math.max(0, Number(params.questionCount || 0));
  const durationLabel = useMemo(() => {
    const totalSeconds = Math.max(60, questionCount * 45);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (!minutes) {
      return `${seconds} seconds`;
    }
    if (!seconds) {
      return `${minutes} min`;
    }
    return `${minutes}m ${seconds}s`;
  }, [questionCount]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!examId) {
        setExamSetState({ loading: false, questions: [], error: "Exam not found." });
        return;
      }
      try {
        const payload = await fetchFreeExamSet(examId);
        if (!active) {
          return;
        }
        setExamSetState({
          loading: false,
          questions: Array.isArray(payload?.questions) ? payload.questions : [],
          error: "",
        });
      } catch (error) {
        if (!active) {
          return;
        }
        setExamSetState({ loading: false, questions: [], error: error.message || "Unable to load this free exam set." });
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [examId]);

  return (
    <Screen topPadding={0} horizontalPadding={0} loading={examSetState.loading} backgroundColor="#DDECF4">
      <View style={styles.page}>
        <View style={styles.hero}>
          <Image source={heroImage} style={styles.heroImage} resizeMode="cover" />
          <View style={styles.heroOverlay} />

          <View style={styles.heroControls}>
            <Pressable style={styles.circleButton} onPress={() => router.replace("/demo")}>
              <Ionicons name="chevron-back" size={18} color="#FF7A00" />
            </Pressable>
          </View>
        </View>

        <View style={styles.sheet}>
          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText}>{ui.chip}</Text>
            </View>
            <Text style={styles.ratingText}>★ 4.8 (free practice)</Text>
          </View>

          <Text style={styles.title}>{examName}</Text>
          <Text style={styles.subtitle}>
            Attempt a short mock, see your ranking instantly, and understand where you need to improve next.
          </Text>
          {examSetState.error ? <Text style={styles.errorText}>{examSetState.error}</Text> : null}

          <View style={styles.examInfoCard}>
            <View style={styles.examInfoRow}>
              <Text style={styles.examInfoLabel}>Selected exam</Text>
              <Pressable onPress={() => router.replace("/demo")}>
                <Text style={styles.changeLink}>Change</Text>
              </Pressable>
            </View>

            <View style={styles.examNameRow}>
              <View style={styles.examIconWrap}>
                <Ionicons name={ui.icon} size={18} color={ui.accent} />
              </View>
              <View style={styles.examTextCol}>
                <Text style={styles.examName}>{examName}</Text>
                <Text style={styles.examCategory}>
                  {questionCount > 0 ? `${questionCount} active questions tagged to this exam` : ui.category}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.detailCard}>
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={16} color="#64748B" />
              <Text style={styles.detailLabel}>Duration</Text>
              <Text style={styles.detailValue}>{durationLabel}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="list-outline" size={16} color="#64748B" />
              <Text style={styles.detailLabel}>Questions</Text>
              <Text style={styles.detailValue}>{questionCount > 0 ? `${questionCount} tagged` : "Tagged by admin"}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="analytics-outline" size={16} color="#64748B" />
              <Text style={styles.detailLabel}>Result</Text>
              <Text style={styles.detailValue}>Rank + weak areas</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="person-outline" size={16} color="#64748B" />
              <Text style={styles.detailLabel}>Access</Text>
              <Text style={styles.detailValue}>No signup required</Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomBar}>
          <View style={styles.priceWrap}>
            <Text style={styles.priceLabel}>Total Price</Text>
            <Text style={styles.priceValue}>{ui.price}</Text>
          </View>

          <Pressable
            style={[styles.buyButton, (!questionCount || examSetState.loading || examSetState.error) ? styles.buyButtonDisabled : null]}
            disabled={!questionCount || examSetState.loading || Boolean(examSetState.error)}
            onPress={() => {
              startDemoSession(examName, {
                examId,
                questionCount,
                questions: examSetState.questions,
              });
              router.replace("/demo/test?index=0");
            }}
          >
            <Text style={styles.buyButtonText}>Start Test</Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#DDECF4",
  },
  hero: {
    height: 292,
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.14)",
  },
  heroControls: {
    position: "absolute",
    top: 20,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroControlRight: {
    flexDirection: "row",
    gap: 10,
  },
  circleButton: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  sheet: {
    marginTop: -34,
    marginHorizontal: 12,
    padding: 18,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 14,
    ...(Platform.OS === "web"
      ? { boxShadow: "0px 12px 24px rgba(15, 23, 42, 0.10)" }
      : {
          shadowColor: "#0F172A",
          shadowOpacity: 0.1,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
        }),
    elevation: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  metaChip: {
    minHeight: 26,
    borderRadius: 999,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF2FF",
  },
  metaChipText: {
    color: "#1D4E89",
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "600",
  },
  ratingText: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 18,
  },
  title: {
    color: "#0F172A",
    fontSize: 21,
    lineHeight: 28,
    fontWeight: "700",
  },
  subtitle: {
    color: "#64748B",
    fontSize: 14,
    lineHeight: 21,
  },
  examInfoCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    padding: 14,
    gap: 12,
  },
  examInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  examInfoLabel: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 16,
  },
  changeLink: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
  },
  examNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  examIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#EEF4FF",
    alignItems: "center",
    justifyContent: "center",
  },
  examTextCol: {
    flex: 1,
    gap: 2,
  },
  examName: {
    color: "#0F172A",
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600",
  },
  examCategory: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 18,
  },
  detailCard: {
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    padding: 14,
    gap: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  detailLabel: {
    flex: 1,
    color: "#64748B",
    fontSize: 13,
    lineHeight: 18,
  },
  detailValue: {
    color: "#0F172A",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  bottomBar: {
    marginTop: 12,
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  priceWrap: {
    flex: 1,
    gap: 4,
  },
  priceLabel: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 16,
  },
  priceValue: {
    color: "#FF7A00",
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "700",
  },
  buyButton: {
    minWidth: 132,
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: "#FF7A00",
    alignItems: "center",
    justifyContent: "center",
  },
  buyButtonDisabled: {
    opacity: 0.45,
  },
  buyButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 13,
    lineHeight: 18,
  },
});
