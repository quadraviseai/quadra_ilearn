import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import AppHeader from "../../src/components/AppHeader";
import Screen from "../../src/components/Screen";
import SectionCard from "../../src/components/SectionCard";
import { apiRequest } from "../../src/lib/api";
import { colors, spacing } from "../../src/theme";

export default function StudentLeaderboardScreen() {
  const [state, setState] = useState({ loading: true, data: [], error: "" });

  const loadLeaderboard = useCallback(async () => {
    try {
      const data = await apiRequest("/api/leaderboards/weekly-health");
      setState({ loading: false, data: data.entries || data, error: "" });
    } catch (error) {
      setState({ loading: false, data: [], error: error.message });
    }
  }, []);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  return (
    <Screen loading={state.loading} refreshControl={loadLeaderboard}>
      <AppHeader title="Weekly leaderboard" subtitle="Current rankings from the live backend." />
      {state.error ? <Text style={styles.error}>{state.error}</Text> : null}

      <SectionCard title="Health rankings" subtitle="Current leaderboard from the live backend.">
        {state.data.length ? state.data.map((entry) => (
          <View key={entry.id} style={styles.row}>
            <Text style={styles.rank}>#{entry.rank_position}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{entry.student_name}</Text>
              <Text style={styles.meta}>{entry.period_start} to {entry.period_end}</Text>
            </View>
            <Text style={styles.score}>{entry.score_value}</Text>
          </View>
        )) : <Text style={styles.meta}>No leaderboard data yet.</Text>}
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  rank: {
    width: 48,
    color: colors.coral,
    fontWeight: "800",
    fontSize: 18,
  },
  name: {
    color: colors.ink,
    fontWeight: "700",
  },
  meta: {
    color: colors.slate,
    marginTop: 4,
  },
  score: {
    color: colors.accentStrong,
    fontWeight: "800",
  },
  error: {
    color: colors.danger,
  },
});
