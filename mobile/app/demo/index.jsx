import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import Screen from "../../src/components/Screen";
import { startDemoSession } from "../../src/lib/demoTest";

function examIcon(name) {
  const value = String(name || "").toLowerCase();
  if (value.includes("jee")) {
    return "flask-outline";
  }
  if (value.includes("neet") || value.includes("medical")) {
    return "medkit-outline";
  }
  if (value.includes("board") || value.includes("cbse") || value.includes("icse")) {
    return "school-outline";
  }
  if (value.includes("gate")) {
    return "construct-outline";
  }
  return "document-text-outline";
}

export default function DemoStartScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const examName = typeof params.exam === "string" && params.exam ? params.exam : "Quick Demo";

  return (
    <Screen>
      <View style={styles.appHeader}>
        <Pressable style={styles.headerBack} onPress={() => router.replace("/")}>
          <Ionicons name="arrow-back" size={18} color="#1D4E89" />
        </Pressable>
        <View style={styles.headerBrand}>
          <View style={styles.headerLogoWrap}>
            <Image source={require("../../assets/quadravise-logo.png")} style={styles.headerLogo} resizeMode="contain" />
          </View>
          <Text style={styles.headerBrandText}>QuadraILearn</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.wrap}>
        <View style={styles.contentCard}>
          <View style={styles.kickerBadge}>
            <Text style={styles.kicker}>Instant result</Text>
          </View>

          <View style={styles.headerBlock}>
            <Text style={styles.title}>Quick Test (60 Seconds)</Text>
            <View style={styles.subtitleBlock}>
              <Text style={styles.subtitle}>3 questions • Instant result</Text>
              <Text style={styles.subtitle}>Real ranking</Text>
            </View>
            <View style={styles.microRow}>
              <Ionicons name="flash-outline" size={14} color="#1D4E89" />
              <Text style={styles.micro}>No signup required</Text>
            </View>
          </View>

          <View style={styles.examCard}>
            <View style={styles.examHeader}>
              <Text style={styles.examLabel}>Selected exam</Text>
              <Link href="/" style={styles.changeLink}>
                Change
              </Link>
            </View>
            <View style={styles.examNameRow}>
              <View style={styles.examIconWrap}>
                <Ionicons name={examIcon(examName)} size={16} color="#1D4E89" />
              </View>
              <Text style={styles.examName}>{examName}</Text>
            </View>
          </View>

          <Pressable
            style={styles.primaryButton}
            onPress={() => {
              startDemoSession(examName);
              router.replace("/demo/test?index=0");
            }}
          >
            <Text style={styles.primaryButtonText}>Start Test</Text>
          </Pressable>

          <Link href="/" style={styles.secondaryLink}>
            Choose another exam
          </Link>

          <View style={styles.statRow}>
            <Ionicons name="people-outline" size={14} color="#64748B" />
            <Text style={styles.statText}>12k+ students attempted today</Text>
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  appHeader: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  headerBack: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    marginLeft: 4,
  },
  headerLogoWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
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
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  headerSpacer: {
    width: 32,
  },
  wrap: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: 24,
  },
  contentCard: {
    width: "100%",
    maxWidth: 360,
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 20,
    gap: 16,
    ...(Platform.OS === "web"
      ? { boxShadow: "0px 2px 10px rgba(15, 23, 42, 0.08)" }
      : {
          shadowColor: "#0F172A",
          shadowOpacity: 0.08,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 2 },
        }),
    elevation: 2,
  },
  kickerBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  headerBlock: {
    gap: 12,
  },
  kicker: {
    color: "#1D4E89",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  title: {
    color: "#0F172A",
    fontSize: 27,
    lineHeight: 33,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  subtitleBlock: {
    gap: 2,
  },
  subtitle: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 20,
  },
  microRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  micro: {
    color: "#1D4E89",
    fontSize: 13,
    fontWeight: "500",
  },
  examCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    gap: 12,
  },
  examHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  examLabel: {
    color: "#94A3B8",
    fontSize: 12,
  },
  changeLink: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "500",
  },
  examNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  examIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  examName: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "600",
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 999,
    backgroundColor: "#FF7A00",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    ...(Platform.OS === "web"
      ? { boxShadow: "0px 8px 16px rgba(255, 122, 0, 0.18)" }
      : {
          shadowColor: "#FF7A00",
          shadowOpacity: 0.18,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
        }),
    elevation: 4,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryLink: {
    color: "#475569",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 8,
  },
  statText: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 18,
  },
});
