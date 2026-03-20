import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import AppHeader from "../../src/components/AppHeader";
import Screen from "../../src/components/Screen";
import SectionCard from "../../src/components/SectionCard";
import { apiRequest } from "../../src/lib/api";
import { colors, radii, shadows, spacing } from "../../src/theme";

function getInitials(name) {
  return String(name || "")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function StudentLeaderboardScreen() {
  const [state, setState] = useState({
    loading: true,
    error: "",
    entries: [],
    currentUser: null,
    query: "",
  });

  const load = useCallback(async () => {
    try {
      const data = await apiRequest("/api/leaderboards/weekly-health");
      setState((current) => ({
        ...current,
        loading: false,
        error: "",
        entries: data.entries || [],
        currentUser: data.current_user || null,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error: error.message,
        entries: [],
        currentUser: null,
      }));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = state.entries.filter((entry) =>
    !state.query.trim() ? true : entry.student_name.toLowerCase().includes(state.query.trim().toLowerCase()),
  );

  return (
    <Screen loading={state.loading} refreshControl={load}>
      <AppHeader title="Leaderboard" subtitle="Weekly learning-health ranking for the active student cohort." />
      {state.error ? <Text style={styles.error}>{state.error}</Text> : null}

      <SectionCard title="Your standing" subtitle="A quick summary of your current weekly position." tone="accent">
        <View style={styles.summaryRow}>
          <View style={styles.summaryTile}>
            <Text style={styles.summaryLabel}>Rank</Text>
            <Text style={styles.summaryValue}>#{state.currentUser?.rank_position ?? "--"}</Text>
          </View>
          <View style={styles.summaryTile}>
            <Text style={styles.summaryLabel}>Score</Text>
            <Text style={styles.summaryValue}>{state.currentUser?.score_value ?? "--"}</Text>
          </View>
        </View>
      </SectionCard>

      <SectionCard title="Ranking board" subtitle="Search students and compare weekly score positions.">
        <TextInput
          style={styles.search}
          placeholder="Search learner"
          value={state.query}
          onChangeText={(value) => setState((current) => ({ ...current, query: value }))}
        />
        {filtered.length ? (
          filtered.map((entry) => {
            const isCurrent = state.currentUser?.id === entry.id;
            return (
              <Pressable key={entry.id} style={[styles.row, isCurrent ? styles.rowCurrent : null]}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankBadgeText}>#{entry.rank_position}</Text>
                </View>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{getInitials(entry.student_name)}</Text>
                </View>
                <View style={styles.copy}>
                  <Text style={styles.name}>{entry.student_name}</Text>
                  <Text style={styles.meta}>
                    {entry.period_start} to {entry.period_end}
                  </Text>
                </View>
                <View style={styles.scoreBlock}>
                  <Text style={styles.score}>{entry.score_value}</Text>
                  {isCurrent ? <Text style={styles.youTag}>You</Text> : null}
                </View>
              </Pressable>
            );
          })
        ) : (
          <Text style={styles.emptyText}>No leaderboard entries matched your search.</Text>
        )}
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  summaryTile: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.card,
  },
  summaryLabel: {
    color: colors.slate,
    fontSize: 11,
    textTransform: "uppercase",
    fontWeight: "800",
  },
  summaryValue: {
    color: colors.ink,
    fontSize: 26,
    fontWeight: "900",
    marginTop: 8,
  },
  search: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    color: colors.ink,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  rowCurrent: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.md,
    paddingHorizontal: 10,
  },
  rankBadge: {
    minWidth: 42,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.brandBlueSoft,
    alignItems: "center",
  },
  rankBadgeText: {
    color: colors.brandBlue,
    fontWeight: "900",
    fontSize: 12,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.accentStrong,
    fontWeight: "900",
  },
  copy: {
    flex: 1,
  },
  name: {
    color: colors.ink,
    fontWeight: "800",
  },
  meta: {
    color: colors.slate,
    fontSize: 12,
    marginTop: 4,
  },
  scoreBlock: {
    alignItems: "flex-end",
  },
  score: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900",
  },
  youTag: {
    color: colors.accentStrong,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 4,
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
