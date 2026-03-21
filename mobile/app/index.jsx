import { useRef, useState } from "react";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";

const EXAMS = [
  {
    label: "JEE",
    description: "Full syllabus tests",
    icon: "flash",
    tone: "#1D4ED8",
    surface: "#EEF4FF",
    href: { pathname: "/demo/intro", params: { exam: "JEE" } },
  },
  {
    label: "NEET",
    description: "Biology-focused tests",
    icon: "leaf",
    tone: "#15803D",
    surface: "#EFFBF2",
    href: { pathname: "/demo/intro", params: { exam: "NEET" } },
  },
  {
    label: "Class 10",
    description: "Boards preparation",
    icon: "school",
    tone: "#CA8A04",
    surface: "#FFF9E8",
    href: { pathname: "/demo/intro", params: { exam: "Class 10" } },
  },
  {
    label: "Class 12",
    description: "Advanced practice",
    icon: "trophy",
    tone: "#7C3AED",
    surface: "#F4EEFF",
    href: { pathname: "/demo/intro", params: { exam: "Class 12" } },
  },
];

const VALUE_POINTS = [
  "Real exam-level questions",
  "Instant rank & analysis",
  "Weak topic detection",
  "Daily practice system",
];

export default function LandingScreen() {
  const scrollRef = useRef(null);
  const [examSectionY, setExamSectionY] = useState(0);

  const scrollToExams = () => {
    scrollRef.current?.scrollTo({
      y: Math.max(0, examSectionY - 20),
      animated: true,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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

              <Pressable style={styles.secondaryButton} onPress={scrollToExams}>
                <Text style={styles.secondaryButtonText}>View Exams</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={[styles.section, styles.sectionCard]} onLayout={(event) => setExamSectionY(event.nativeEvent.layout.y)}>
          <Text style={styles.sectionTitle}>Choose Your Exam</Text>
          <Text style={styles.sectionSubtitle}>Choose your exam and start instantly.</Text>

          <View style={styles.examList}>
            {EXAMS.map((exam) => (
              <Link key={exam.label} href={exam.href} asChild>
                <Pressable style={({ pressed }) => [styles.examCard, pressed ? styles.examCardPressed : null]}>
                  <View style={styles.examCardMain}>
                    <View style={[styles.examIconWrap, { backgroundColor: exam.surface }]}>
                      <Ionicons name={exam.icon} size={20} color={exam.tone} />
                    </View>
                    <View style={styles.examCopy}>
                      <Text style={styles.examCardLabel}>{exam.label}</Text>
                      <Text style={styles.examCardDescription}>{exam.description}</Text>
                    </View>
                    <View style={styles.examActionRow}>
                      <Text style={styles.examStartText}>Start Test</Text>
                      <Ionicons name="arrow-forward" size={18} color="#0F172A" />
                    </View>
                  </View>
                </Pressable>
              </Link>
            ))}
          </View>
        </View>

        <View style={[styles.section, styles.sectionCard]}>
          <Text style={styles.sectionTitle}>Why Students Choose QuadraLearn</Text>
          <View style={styles.valueList}>
            {VALUE_POINTS.map((point) => (
              <View key={point} style={styles.valueItem}>
                <Ionicons name="checkmark" size={16} color="#FF7A00" />
                <Text style={styles.valueText}>{point}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.ctaSection}>
          <Text style={styles.ctaEyebrow}>Take a free test now</Text>
          <Text style={styles.ctaTitle}>Get your score, rank & weak areas instantly</Text>

          <View style={styles.ctaPoints}>
            <Text style={styles.ctaPoint}>Score.</Text>
            <Text style={styles.ctaDot}>|</Text>
            <Text style={styles.ctaPoint}>Rank.</Text>
            <Text style={styles.ctaDot}>|</Text>
            <Text style={styles.ctaPoint}>Weak Areas.</Text>
          </View>

          <Link href="/demo" asChild>
            <Pressable style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Start Free Test</Text>
            </Pressable>
          </Link>
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
    gap: 12,
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
  secondaryButton: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: "#0F172A",
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
  examList: {
    flexDirection: "column",
    gap: 12,
  },
  examCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E8EDF3",
    padding: 16,
    minHeight: 0,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  examCardPressed: {
    backgroundColor: "#FAFCFE",
  },
  examCardMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  examIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  examCopy: {
    flex: 1,
    gap: 2,
  },
  examCardLabel: {
    color: "#0F172A",
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600",
  },
  examCardDescription: {
    color: "#64748B",
    fontSize: 14,
    lineHeight: 20,
  },
  examActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  examStartText: {
    color: "#0F172A",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
  valueList: {
    gap: 10,
  },
  valueItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  valueText: {
    flex: 1,
    color: "#0F172A",
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500",
  },
  ctaSection: {
    backgroundColor: "#0F172A",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 12,
    shadowColor: "#0F172A",
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  ctaEyebrow: {
    color: "#FDBA74",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  ctaTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    lineHeight: 29,
    fontWeight: "600",
  },
  ctaPoints: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  ctaPoint: {
    color: "#E2E8F0",
    fontSize: 13,
    lineHeight: 18,
  },
  ctaDot: {
    color: "#FB923C",
    fontSize: 13,
    lineHeight: 18,
  },
});
