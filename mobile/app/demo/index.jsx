import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import Screen from "../../src/components/Screen";
import { fetchExams } from "../../src/lib/studentFlow";

const examGenericImage = require("../../assets/exam-generic.png");

function getExamPresentation(examName) {
  const value = String(examName || "").toLowerCase();
  if (value.includes("jee")) {
    return { icon: "flash", tone: "#1D4ED8", surface: "#EEF4FF", tag: "Competitive" };
  }
  if (value.includes("neet") || value.includes("medical") || value.includes("bio")) {
    return { icon: "leaf", tone: "#15803D", surface: "#EFFBF2", tag: "Medical" };
  }
  if (value.includes("10")) {
    return { icon: "school", tone: "#CA8A04", surface: "#FFF9E8", tag: "Boards" };
  }
  if (value.includes("12")) {
    return { icon: "trophy", tone: "#7C3AED", surface: "#F4EEFF", tag: "Advanced" };
  }
  return { icon: "document-text", tone: "#1D4E89", surface: "#EFF6FF", tag: "Exam" };
}

export default function DemoExamSelectionScreen() {
  const router = useRouter();
  const [state, setState] = useState({ loading: true, exams: [], error: "" });

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const exams = await fetchExams();
        if (!active) {
          return;
        }
        setState({ loading: false, exams: Array.isArray(exams) ? exams : [], error: "" });
      } catch (error) {
        if (!active) {
          return;
        }
        setState({ loading: false, exams: [], error: error.message || "Unable to load exams." });
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <Screen topPadding={8} loading={state.loading}>
      <View style={styles.header}>
        <View style={styles.headerBrand}>
          <View style={styles.headerLogoWrap}>
            <Image source={require("../../assets/quadravise-logo.png")} style={styles.headerLogo} resizeMode="contain" />
          </View>
          <Text style={styles.headerBrandText}>QuadraLearn</Text>
        </View>
      </View>

      <View style={styles.copyBlock}>
        <View style={styles.titleRow}>
          <Pressable style={styles.backButton} onPress={() => router.replace("/")}>
            <Ionicons name="chevron-back" size={18} color="#475569" />
          </Pressable>
          <Text style={styles.title}>Choose Your Exam</Text>
        </View>
        <Text style={styles.subtitle}>Choose your exam to start your free test instantly.</Text>
      </View>

      {state.error ? <Text style={styles.errorText}>{state.error}</Text> : null}

      <View style={styles.list}>
        {state.exams.map((exam) => {
          const presentation = getExamPresentation(exam.name);
          return (
          <Pressable
            key={String(exam.id)}
            onPress={() => router.push({ pathname: "/demo/intro", params: { exam: exam.name, examId: String(exam.id) } })}
            style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]}
          >
            <View style={styles.thumbWrap}>
              <Image source={examGenericImage} style={styles.thumbImage} resizeMode="cover" />
              <View style={[styles.thumbIconWrap, { backgroundColor: presentation.surface }]}>
                <Ionicons name={presentation.icon} size={14} color={presentation.tone} />
              </View>
            </View>

            <View style={styles.cardMiddle}>
              <Text style={styles.cardTitle}>{exam.name}</Text>
              <Text style={styles.cardMeta}>{exam.subject_count || 0} subjects available</Text>
              <View style={styles.tagRow}>
                <View style={[styles.tagChip, { backgroundColor: presentation.surface }]}>
                  <Text style={[styles.tagText, { color: presentation.tone }]}>{presentation.tag}</Text>
                </View>
                <View style={styles.tagChipNeutral}>
                  <Text style={styles.tagTextNeutral}>Free Test</Text>
                </View>
              </View>
            </View>

            <View style={styles.cardRight}>
              <Ionicons name="arrow-forward" size={18} color="#0F172A" />
              <Text style={styles.cardCta}>Start</Text>
            </View>
          </Pressable>
        );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  headerBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  headerLogoWrap: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  headerLogo: {
    width: 20,
    height: 20,
  },
  headerBrandText: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  copyBlock: {
    gap: 10,
    marginTop: 8,
    paddingHorizontal: 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  title: {
    color: "#0F172A",
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "600",
    flexShrink: 1,
  },
  subtitle: {
    color: "#64748B",
    fontSize: 14,
    lineHeight: 20,
  },
  list: {
    marginTop: 16,
    gap: 12,
  },
  errorText: {
    marginTop: 16,
    color: "#B91C1C",
    fontSize: 13,
    lineHeight: 18,
  },
  card: {
    width: "100%",
    minHeight: 112,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardPressed: {
    backgroundColor: "#F1F5F9",
    transform: [{ scale: 0.98 }],
  },
  thumbWrap: {
    width: 84,
    height: 84,
    marginRight: 12,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#E2E8F0",
  },
  thumbImage: {
    width: "100%",
    height: "100%",
  },
  thumbIconWrap: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardMiddle: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
    gap: 6,
  },
  cardTitle: {
    color: "#0F172A",
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "600",
  },
  cardMeta: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 18,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tagChip: {
    minHeight: 24,
    borderRadius: 999,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  tagText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "600",
  },
  tagChipNeutral: {
    minHeight: 24,
    borderRadius: 999,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  tagTextNeutral: {
    color: "#475569",
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "600",
  },
  cardRight: {
    marginLeft: 12,
    minWidth: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  cardCta: {
    color: "#0F172A",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
  },
});
