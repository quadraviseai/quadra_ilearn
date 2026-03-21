import { useEffect, useState } from "react";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchExams } from "../src/lib/studentFlow";

function getExamPresentation(examName) {
  const value = String(examName || "").toLowerCase();
  if (value.includes("jee")) {
    return { icon: "flash", tone: "#1D4ED8", surface: "#EEF4FF", description: "Full syllabus tests" };
  }
  if (value.includes("neet") || value.includes("medical") || value.includes("bio")) {
    return { icon: "leaf", tone: "#15803D", surface: "#EFFBF2", description: "Biology-focused tests" };
  }
  if (value.includes("10")) {
    return { icon: "school", tone: "#CA8A04", surface: "#FFF9E8", description: "Boards preparation" };
  }
  if (value.includes("12")) {
    return { icon: "trophy", tone: "#7C3AED", surface: "#F4EEFF", description: "Advanced practice" };
  }
  return { icon: "document-text", tone: "#1D4E89", surface: "#EFF6FF", description: "Mock test practice" };
}

export default function LandingScreen() {
  const [examState, setExamState] = useState({ loading: true, exams: [], error: "" });

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const exams = await fetchExams();
        const freeExamSets = Array.isArray(exams)
          ? exams.filter((exam) => String(exam.exam_set_type || "free") === "free")
          : [];
        if (!active) {
          return;
        }
        setExamState({ loading: false, exams: freeExamSets, error: "" });
      } catch (error) {
        if (!active) {
          return;
        }
        setExamState({ loading: false, exams: [], error: error.message || "Unable to load exams." });
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <View style={styles.brandRow}>
            <View style={styles.logoWrap}>
              <Image source={require("../assets/quadravise-logo.png")} style={styles.logoImage} resizeMode="contain" />
            </View>
            <Text style={styles.brandName}>QuadraLearn</Text>
          </View>

          <View style={styles.heroShell}>
            <View style={styles.heroGlowPrimary} />
            <View style={styles.heroGlowAccent} />

            <View style={styles.heroCopyBlock}>
              <Text style={styles.kicker}>Practice smarter</Text>
              <Text style={styles.heroTitle}>Crack JEE, NEET & Boards with Real Mock Tests</Text>
              <Text style={styles.heroSubtitle}>Improve rank. Track progress.</Text>
            </View>

            <View style={styles.heroTrustRow}>
              <View style={styles.heroTrustDot} />
              <Text style={styles.heroMeta}>Trusted by 10,000+ students practicing daily</Text>
            </View>

            <View style={styles.heroActionGroup}>
              <Link href="/demo" asChild>
                <Pressable style={styles.primaryButton}>
                  <Text style={styles.primaryButtonText}>Start Free Test</Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </View>

        <View style={[styles.section, styles.sectionCard]}>
          <Text style={styles.sectionTitle}>Choose Your Exam</Text>
          <Text style={styles.sectionSubtitle}>Choose your exam and start instantly.</Text>
          {examState.error ? <Text style={styles.errorText}>{examState.error}</Text> : null}

          <View style={styles.examList}>
            {examState.exams.map((exam) => {
              const presentation = getExamPresentation(exam.name);
              const questionCount = Number(exam.question_count || 0);
              return (
              <Link
                key={String(exam.id)}
                href={{
                  pathname: "/demo/intro",
                  params: {
                    exam: exam.name,
                    examId: String(exam.id),
                    questionCount: String(questionCount),
                  },
                }}
                asChild
              >
                <Pressable style={({ pressed }) => [styles.examCard, pressed ? styles.examCardPressed : null]}>
                  <View style={styles.examCardMain}>
                    <View style={[styles.examIconWrap, { backgroundColor: presentation.surface }]}>
                      <Ionicons name={presentation.icon} size={20} color={presentation.tone} />
                    </View>
                    <View style={styles.examCopy}>
                      <View style={styles.examTopRow}>
                        <Text style={styles.examCardLabel}>{exam.name}</Text>
                        <View style={[styles.examChip, { backgroundColor: presentation.surface }]}>
                          <Text style={[styles.examChipText, { color: presentation.tone }]}>Free set</Text>
                        </View>
                      </View>
                      <Text style={styles.examCardDescription}>
                        {questionCount > 0 ? `${questionCount} questions tagged` : presentation.description}
                      </Text>
                      <View style={styles.examMetaRow}>
                        <View style={styles.examMetaChip}>
                          <Ionicons name="document-text-outline" size={12} color="#64748B" />
                          <Text style={styles.examMetaText}>{questionCount > 0 ? `${questionCount} Questions` : "Practice Set"}</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.examActionRow}>
                      <Text style={styles.examStartText}>Start Test</Text>
                      <Ionicons name="arrow-forward" size={18} color="#0F172A" />
                    </View>
                  </View>
                </Pressable>
              </Link>
            );
            })}
          </View>
          {!examState.loading && !examState.error && !examState.exams.length ? (
            <Text style={styles.emptyText}>No free exam sets are available right now.</Text>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 48,
    gap: 32,
  },
  heroSection: {
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
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  logoImage: {
    width: 30,
    height: 30,
  },
  brandName: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  heroShell: {
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 22,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  heroGlowPrimary: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: "#E9F3FF",
    top: -80,
    right: -40,
  },
  heroGlowAccent: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 999,
    backgroundColor: "#FFF0E5",
    bottom: -80,
    left: -40,
  },
  heroCopyBlock: {
    gap: 12,
  },
  kicker: {
    color: "#FF7A00",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: "#0F172A",
    fontSize: 24,
    lineHeight: 31,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  heroSubtitle: {
    color: "#1D4E89",
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500",
  },
  heroTrustRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  heroTrustDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#FF7A00",
  },
  heroMeta: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },
  heroActionGroup: {
    gap: 0,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: "#FF7A00",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF7A00",
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  section: {
    gap: 16,
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  sectionTitle: {
    color: "#0F172A",
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "600",
  },
  sectionSubtitle: {
    color: "#64748B",
    fontSize: 14,
    lineHeight: 20,
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 13,
    lineHeight: 18,
  },
  emptyText: {
    color: "#64748B",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  examList: {
    flexDirection: "column",
    gap: 12,
  },
  examCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 18,
    minHeight: 0,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  examCardPressed: {
    backgroundColor: "#FAFCFE",
    transform: [{ scale: 0.985 }],
  },
  examCardMain: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  examIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  examCopy: {
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  examTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  examCardLabel: {
    color: "#0F172A",
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600",
    flex: 1,
  },
  examChip: {
    minHeight: 24,
    borderRadius: 999,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  examChipText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
  },
  examCardDescription: {
    color: "#64748B",
    fontSize: 14,
    lineHeight: 20,
  },
  examMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 2,
  },
  examMetaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 24,
    borderRadius: 999,
    paddingHorizontal: 10,
    backgroundColor: "#F8FAFC",
  },
  examMetaText: {
    color: "#475569",
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "600",
  },
  examActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 48,
    paddingLeft: 8,
  },
  examStartText: {
    color: "#0F172A",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
});
