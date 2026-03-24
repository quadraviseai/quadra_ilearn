import { useEffect, useMemo, useState } from "react";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchExams } from "../src/lib/studentFlow";

function getExamPresentation(examName) {
  const value = String(examName || "").toLowerCase();
  if (value.includes("jee")) {
    return {
      icon: "flash",
      tone: "#1D4ED8",
      surface: "#EEF4FF",
      description: "Full syllabus tests",
      image: require("../assets/jeefinal.png"),
      accent: "#1D4ED8",
    };
  }
  if (value.includes("neet") || value.includes("medical") || value.includes("bio")) {
    return {
      icon: "leaf",
      tone: "#15803D",
      surface: "#EFFBF2",
      description: "Biology-focused tests",
      image: require("../assets/neet.png"),
      accent: "#15803D",
    };
  }
  if (value.includes("10")) {
    return {
      icon: "school",
      tone: "#CA8A04",
      surface: "#FFF9E8",
      description: "Boards preparation",
      image: require("../assets/exam-generic.png"),
      accent: "#CA8A04",
    };
  }
  if (value.includes("12")) {
    return {
      icon: "trophy",
      tone: "#7C3AED",
      surface: "#F4EEFF",
      description: "Advanced practice",
      image: require("../assets/exam-generic.png"),
      accent: "#7C3AED",
    };
  }
  return {
    icon: "document-text",
    tone: "#1D4E89",
    surface: "#EFF6FF",
    description: "Mock test practice",
    image: require("../assets/exam-generic.png"),
    accent: "#1D4E89",
  };
}

export default function LandingScreen() {
  const [examState, setExamState] = useState({ loading: true, exams: [], error: "" });
  const [searchQuery, setSearchQuery] = useState("");

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

  const filteredExams = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    if (!normalized) {
      return examState.exams;
    }

    return examState.exams.filter((exam) => {
      const name = String(exam.name || "").toLowerCase();
      return name.includes(normalized);
    });
  }, [examState.exams, searchQuery]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topSection}>
          <View style={styles.topBar}>
            <View style={styles.brandRow}>
              <View style={styles.logoWrap}>
                <Image source={require("../assets/quadravise-logo.png")} style={styles.logoImage} resizeMode="contain" />
              </View>
              <Text style={styles.brandName}>QuadraLearn</Text>
            </View>
            <Link href="/(auth)/login" asChild>
              <Pressable style={styles.loginIconButton}>
                <Ionicons name="log-in-outline" size={20} color="#1D4E89" />
              </Pressable>
            </Link>
          </View>

          <View style={styles.searchShell}>
            <Ionicons name="search-outline" size={18} color="#64748B" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search exams like JEE, NEET, Boards"
              placeholderTextColor="#94A3B8"
              style={styles.searchInput}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose Your Exam</Text>
          <Text style={styles.sectionSubtitle}>Choose your exam and start instantly.</Text>
          {examState.error ? <Text style={styles.errorText}>{examState.error}</Text> : null}

          <View style={styles.examList}>
            {filteredExams.map((exam) => {
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
                    <View style={styles.examImageWrap}>
                      <Image source={presentation.image} style={styles.examImage} resizeMode="cover" />
                    </View>

                    <View style={styles.examCopy}>
                      <Text style={styles.examCardLabel}>{exam.name}</Text>
                      <Text style={styles.examCardDescription}>
                        {questionCount > 0 ? `${questionCount} questions tagged` : presentation.description}
                      </Text>
                      <View style={styles.examFooter}>
                        <View style={styles.examRatingRow}>
                          <Ionicons name="star" size={12} color="#F59E0B" />
                          <Ionicons name="star" size={12} color="#F59E0B" />
                          <Ionicons name="star" size={12} color="#F59E0B" />
                          <Ionicons name="star" size={12} color="#F59E0B" />
                          <Ionicons name="star-half" size={12} color="#F59E0B" />
                        </View>
                        <View style={styles.examActionRow}>
                          <Text style={styles.examStartText}>Start</Text>
                          <Ionicons name="arrow-forward" size={16} color="#7C4A2D" />
                        </View>
                      </View>
                    </View>
                  </Pressable>
                </Link>
              );
            })}
          </View>
          {!examState.loading && !examState.error && !filteredExams.length ? (
            <Text style={styles.emptyText}>{searchQuery ? "No exams matched your search." : "No free exam sets are available right now."}</Text>
          ) : null}
          {!examState.loading && !examState.error && !examState.exams.length ? (
            <Text style={styles.emptyText}>No free exam sets are available right now.</Text>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#E5EBF3" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 48, gap: 24 },
  topSection: { gap: 14 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  logoImage: { width: 30, height: 30 },
  brandName: { color: "#0F172A", fontSize: 13, fontWeight: "700", letterSpacing: 0.9, textTransform: "uppercase" },
  loginIconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  searchShell: {
    minHeight: 54,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    color: "#0F172A",
    fontSize: 14,
    paddingVertical: 0,
  },
  section: { gap: 16 },
  sectionTitle: { color: "#0F172A", fontSize: 24, lineHeight: 30, fontWeight: "600" },
  sectionSubtitle: { color: "#64748B", fontSize: 14, lineHeight: 20 },
  errorText: { color: "#B91C1C", fontSize: 13, lineHeight: 18 },
  emptyText: { color: "#64748B", fontSize: 14, lineHeight: 20, textAlign: "center" },
  examList: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
    columnGap: 10,
  },
  examCard: {
    width: "47.8%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#D7E0EA",
    padding: 10,
    ...Platform.select({
      web: {
        boxShadow: "0px 14px 30px rgba(15, 23, 42, 0.10)",
      },
      default: {
        shadowColor: "#0F172A",
        shadowOpacity: 0.12,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
        elevation: 6,
      },
    }),
  },
  examCardPressed: { backgroundColor: "#F8FAFC", transform: [{ scale: 0.985 }] },
  examImageWrap: {
    position: "relative",
    width: "100%",
    height: 146,
    backgroundColor: "#E3EAF3",
    borderRadius: 18,
    overflow: "hidden",
  },
  examImage: {
    width: "100%",
    height: "100%",
  },
  examCopy: { paddingHorizontal: 4, paddingTop: 12, paddingBottom: 6, gap: 8 },
  examCardLabel: { color: "#0F172A", fontSize: 16, lineHeight: 21, fontWeight: "800" },
  examCardDescription: { color: "#64748B", fontSize: 12, lineHeight: 18 },
  examFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 2,
    paddingTop: 4,
  },
  examRatingRow: { flexDirection: "row", alignItems: "center", gap: 1 },
  examActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minHeight: 28,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#F7EFE8",
  },
  examStartText: { color: "#7C4A2D", fontSize: 12, lineHeight: 18, fontWeight: "800" },
});
