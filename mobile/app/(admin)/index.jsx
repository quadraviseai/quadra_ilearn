import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import AppHeader from "../../src/components/AppHeader";
import Screen from "../../src/components/Screen";
import SectionCard from "../../src/components/SectionCard";
import { apiRequest } from "../../src/lib/api";
import { colors, radii, shadows, spacing } from "../../src/theme";

export default function AdminHomeScreen() {
  const [state, setState] = useState({
    loading: true,
    error: "",
    dashboard: null,
  });

  const load = useCallback(async () => {
    try {
      const dashboard = await apiRequest("/api/admin/dashboard");
      setState({ loading: false, error: "", dashboard });
    } catch (error) {
      setState({ loading: false, error: error.message, dashboard: null });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const dashboard = state.dashboard;
  const stats = dashboard
    ? [
        ["Users", dashboard.users_total],
        ["Students", dashboard.students_total],
        ["Guardians", dashboard.guardians_total],
        ["Admins", dashboard.admins_total],
        ["Questions", dashboard.questions_total],
        ["Attempts", dashboard.attempts_total],
      ]
    : [];

  return (
    <Screen loading={state.loading} refreshControl={load}>
      <AppHeader title="Admin" subtitle="Mobile access for the most-used admin controls." />
      {state.error ? <Text style={styles.error}>{state.error}</Text> : null}

      <SectionCard title="Platform snapshot" subtitle="The core numbers you usually need on the move." tone="accent">
        <View style={styles.statsGrid}>
          {stats.map(([label, value]) => (
            <View key={label} style={styles.statCard}>
              <Text style={styles.statLabel}>{label}</Text>
              <Text style={styles.statValue}>{value}</Text>
            </View>
          ))}
        </View>
      </SectionCard>

      <SectionCard title="Token circulation" subtitle="Global token health and recent usage.">
        <View style={styles.tokenCard}>
          <Text style={styles.tokenLabel}>Tokens in circulation</Text>
          <Text style={styles.tokenValue}>{dashboard?.tokens_in_circulation ?? 0}</Text>
          <Text style={styles.tokenMeta}>
            Verified users: {dashboard?.verified_users_total ?? 0} | Active users: {dashboard?.active_users_total ?? 0}
          </Text>
        </View>
      </SectionCard>

      <SectionCard title="Recent users" subtitle="Newest accounts across students, guardians, and admins.">
        {(dashboard?.recent_users || []).map((user) => (
          <View key={user.id} style={styles.listCard}>
            <View style={styles.rowSplit}>
              <View style={styles.copyWrap}>
                <Text style={styles.listTitle}>{user.name || user.email}</Text>
                <Text style={styles.listMeta}>{user.email}</Text>
              </View>
              <Text style={styles.roleBadge}>{String(user.role || "").toUpperCase()}</Text>
            </View>
            <Text style={styles.listMeta}>Tokens: {user.token_balance} | Referrals: {user.referral_count}</Text>
          </View>
        ))}
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  statCard: {
    width: "47%",
    minWidth: 144,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.card,
  },
  statLabel: {
    color: colors.slate,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  statValue: {
    color: colors.ink,
    fontSize: 26,
    fontWeight: "900",
    marginTop: 8,
  },
  tokenCard: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 8,
    ...shadows.card,
  },
  tokenLabel: {
    color: colors.slate,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  tokenValue: {
    color: colors.accentStrong,
    fontSize: 32,
    fontWeight: "900",
  },
  tokenMeta: {
    color: colors.slate,
    lineHeight: 20,
  },
  listCard: {
    gap: 8,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.card,
  },
  rowSplit: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  copyWrap: {
    flex: 1,
    gap: 4,
  },
  listTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "800",
  },
  listMeta: {
    color: colors.slate,
    fontSize: 13,
    lineHeight: 19,
  },
  roleBadge: {
    color: colors.brandBlue,
    fontSize: 11,
    fontWeight: "900",
    backgroundColor: colors.brandBlueSoft,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radii.pill,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
});
