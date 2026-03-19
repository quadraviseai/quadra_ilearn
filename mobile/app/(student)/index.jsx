import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import AppHeader from "../../src/components/AppHeader";
import Screen from "../../src/components/Screen";
import SectionCard from "../../src/components/SectionCard";
import StatTile from "../../src/components/StatTile";
import { useAuth } from "../../src/context/AuthContext";
import { apiRequest } from "../../src/lib/api";
import { fetchLatestReport, setSelectedFlow } from "../../src/lib/studentFlow";
import { colors, radii, shadows, spacing } from "../../src/theme";

function getInitials(name) {
  return String(name || "S")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function StudentHomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [state, setState] = useState({
    loading: true,
    error: "",
    dashboard: null,
    leaderboard: null,
    latestReport: null,
  });

  const load = useCallback(async () => {
    try {
      const [dashboard, leaderboard, latestReport] = await Promise.all([
        apiRequest("/api/students/dashboard-summary"),
        apiRequest("/api/leaderboards/weekly-health"),
        fetchLatestReport(),
      ]);
      setState({
        loading: false,
        error: "",
        dashboard,
        leaderboard,
        latestReport,
      });
    } catch (error) {
      setState({
        loading: false,
        error: error.message,
        dashboard: null,
        leaderboard: null,
        latestReport: null,
      });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const dashboard = state.dashboard;
  const weakConcepts = dashboard?.weak_concepts || [];
  const recentAttempts = dashboard?.recent_attempts || [];
  const streak = dashboard?.streak?.current_streak_days ?? 0;
  const topEntries = state.leaderboard?.entries?.slice(0, 3) || [];
  const currentRank = state.leaderboard?.current_user?.rank_position ?? "--";
  const latestReport = state.latestReport;

  const quickActions = useMemo(
    () => [
      { label: "Start test", icon: "flask-outline", route: "/(student)/diagnostics" },
      { label: "View report", icon: "bar-chart-outline", route: "/(student)/report" },
      { label: "Weak topics", icon: "school-outline", route: "/(student)/learn" },
      { label: "Leaderboard", icon: "trophy-outline", route: "/(student)/leaderboard" },
    ],
    [],
  );

  return (
    <Screen loading={state.loading} refreshControl={load}>
      <AppHeader
        title={dashboard?.full_name || user?.full_name || "Student workspace"}
        subtitle="A rebuilt mobile dashboard for diagnostics, reports, learning, and profile controls."
      />

      {state.error ? <Text style={styles.error}>{state.error}</Text> : null}

      <LinearGradient colors={["#103e6f", "#2f73ad", "#fb6404"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.heroIdentity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(dashboard?.full_name || user?.full_name)}</Text>
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>Student overview</Text>
            <Text style={styles.heroTitle}>{dashboard?.primary_target_exam || "Primary exam not set"}</Text>
            <Text style={styles.heroSubtitle}>
              {dashboard?.class_name ? `Class ${dashboard.class_name}` : "Class pending"}
              {dashboard?.board ? ` | ${dashboard.board}` : ""}
            </Text>
          </View>
        </View>
        <View style={styles.heroMetaRow}>
          <View style={styles.heroMetaCard}>
            <Text style={styles.heroMetaLabel}>Tokens</Text>
            <Text style={styles.heroMetaValue}>{dashboard?.token_balance ?? user?.token_balance ?? 0}</Text>
          </View>
          <View style={styles.heroMetaCard}>
            <Text style={styles.heroMetaLabel}>Streak</Text>
            <Text style={styles.heroMetaValue}>{streak}d</Text>
          </View>
          <View style={styles.heroMetaCard}>
            <Text style={styles.heroMetaLabel}>Rank</Text>
            <Text style={styles.heroMetaValue}>#{currentRank}</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.statRow}>
        <StatTile label="Coverage" value={`${dashboard?.latest_learning_health?.coverage_score ?? 0}%`} />
        <StatTile label="Health" value={`${dashboard?.latest_learning_health?.health_score ?? 0}%`} tone="gold" />
      </View>

      <SectionCard title="Quick actions" subtitle="Use the mobile app as the main operating surface for study and retests." tone="accent">
        <View style={styles.actionGrid}>
          {quickActions.map((action) => (
            <Pressable key={action.label} style={styles.actionCard} onPress={() => router.push(action.route)}>
              <View style={styles.actionIcon}>
                <Ionicons name={action.icon} size={20} color={colors.accent} />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </Pressable>
          ))}
        </View>
      </SectionCard>

      <SectionCard title="Latest report" subtitle="Jump back into the most recent diagnostic outcome and continue from there.">
        {latestReport ? (
          <View style={styles.reportCard}>
            <View>
              <Text style={styles.reportTitle}>{latestReport.exam_name}</Text>
              <Text style={styles.reportMeta}>{latestReport.subject_name}</Text>
              <Text style={styles.reportMeta}>
                Score {Math.round(Number(latestReport.score_percent || 0))}% | Weak topics {latestReport.weak_topics?.length || 0}
              </Text>
            </View>
            <View style={styles.reportActions}>
              <Pressable style={styles.secondaryButton} onPress={() => router.push("/(student)/report")}>
                <Text style={styles.secondaryButtonText}>Open report</Text>
              </Pressable>
              <Pressable
                style={styles.primaryButton}
                onPress={async () => {
                  await setSelectedFlow(latestReport.exam, latestReport.subject);
                  router.push("/(student)/learn");
                }}
              >
                <Text style={styles.primaryButtonText}>Learn now</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Text style={styles.emptyText}>No submitted report yet. Start a diagnostic to generate one.</Text>
        )}
      </SectionCard>

      <SectionCard title="Weak concepts" subtitle="The first concepts that need attention right now.">
        {weakConcepts.length ? (
          weakConcepts.slice(0, 3).map((item, index) => (
            <Pressable
              key={`${item.subject_name}-${item.concept_name}`}
              style={styles.listRow}
              onPress={async () => {
                if (latestReport) {
                  await setSelectedFlow(latestReport.exam, latestReport.subject);
                }
                router.push({
                  pathname: "/(student)/learn",
                  params: item.concept_id ? { conceptId: String(item.concept_id) } : undefined,
                });
              }}
            >
              <View style={[styles.listStripe, { backgroundColor: index === 0 ? colors.coral : colors.accent }]} />
              <View style={styles.listCopy}>
                <Text style={styles.listTitle}>{item.concept_name}</Text>
                <Text style={styles.listMeta}>{item.subject_name}</Text>
              </View>
              <Text style={styles.listValue}>{item.mastery_score}%</Text>
            </Pressable>
          ))
        ) : (
          <Text style={styles.emptyText}>No weak concepts detected yet.</Text>
        )}
      </SectionCard>

      <SectionCard title="Leaderboard preview" subtitle="Top students from the weekly learning-health board.">
        {topEntries.length ? (
          topEntries.map((entry) => (
            <Pressable key={entry.id} style={styles.listRow} onPress={() => router.push("/(student)/leaderboard")}>
              <View style={styles.rankChip}>
                <Text style={styles.rankChipText}>#{entry.rank_position}</Text>
              </View>
              <View style={styles.listCopy}>
                <Text style={styles.listTitle}>{entry.student_name}</Text>
                <Text style={styles.listMeta}>{entry.score_value} weekly score</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.slate} />
            </Pressable>
          ))
        ) : (
          <Text style={styles.emptyText}>No leaderboard entries available yet.</Text>
        )}
      </SectionCard>

      <SectionCard title="Recent attempts" subtitle="Your latest completed diagnostic activity.">
        {recentAttempts.length ? (
          recentAttempts.slice(0, 3).map((attempt) => (
            <View key={attempt.id} style={styles.listRow}>
              <View style={[styles.listStripe, { backgroundColor: colors.brandBlue }]} />
              <View style={styles.listCopy}>
                <Text style={styles.listTitle}>{attempt.subject_name}</Text>
                <Text style={styles.listMeta}>{attempt.score_percent ?? "--"}% score</Text>
              </View>
              <Text style={styles.listValue}>{attempt.total_questions ?? "--"}Q</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No attempts completed yet.</Text>
        )}
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.glow,
  },
  heroIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  avatarText: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "900",
  },
  heroCopy: {
    flex: 1,
    gap: 4,
  },
  heroEyebrow: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  heroTitle: {
    color: "#ffffff",
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "900",
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.84)",
    fontSize: 13,
  },
  heroMetaRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  heroMetaCard: {
    flex: 1,
    minHeight: 76,
    borderRadius: radii.lg,
    padding: spacing.md,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  heroMetaLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  heroMetaValue: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "900",
    marginTop: 8,
  },
  statRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  actionCard: {
    width: "47%",
    minHeight: 104,
    borderRadius: radii.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    justifyContent: "space-between",
    ...shadows.card,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentSoft,
  },
  actionLabel: {
    color: colors.ink,
    fontWeight: "800",
    fontSize: 14,
  },
  reportCard: {
    gap: spacing.md,
  },
  reportTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "900",
  },
  reportMeta: {
    color: colors.slate,
    marginTop: 4,
  },
  reportActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  primaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.glow,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  secondaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.card,
  },
  secondaryButtonText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800",
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  listStripe: {
    width: 10,
    height: 44,
    borderRadius: radii.pill,
  },
  listCopy: {
    flex: 1,
  },
  listTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800",
  },
  listMeta: {
    color: colors.slate,
    marginTop: 4,
    fontSize: 12,
  },
  listValue: {
    color: colors.accentStrong,
    fontWeight: "900",
    fontSize: 13,
  },
  rankChip: {
    minWidth: 40,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.accentSoft,
  },
  rankChipText: {
    color: colors.accentStrong,
    fontWeight: "900",
  },
  emptyText: {
    color: colors.slate,
    fontSize: 13,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
});
