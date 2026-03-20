import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import AppHeader from "../../src/components/AppHeader";
import Screen from "../../src/components/Screen";
import SectionCard from "../../src/components/SectionCard";
import { apiRequest } from "../../src/lib/api";
import { colors, radii, shadows, spacing } from "../../src/theme";

export default function AdminUsersScreen() {
  const [state, setState] = useState({
    loading: true,
    savingId: "",
    error: "",
    users: [],
  });
  const [adjustments, setAdjustments] = useState({});

  const load = useCallback(async () => {
    try {
      const users = await apiRequest("/api/admin/users");
      setState((current) => ({ ...current, loading: false, error: "", users }));
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error.message, users: [] }));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const userGroups = useMemo(
    () => ({
      admins: state.users.filter((user) => user.role === "admin"),
      students: state.users.filter((user) => user.role === "student"),
      guardians: state.users.filter((user) => user.role === "guardian"),
    }),
    [state.users],
  );

  const saveAdjustment = async (user) => {
    const raw = adjustments[user.id];
    const amount = Number(raw);
    if (!raw || Number.isNaN(amount) || amount === 0) {
      return;
    }

    try {
      setState((current) => ({ ...current, savingId: user.id, error: "" }));
      const updated = await apiRequest(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        body: {
          token_adjustment: amount,
          token_adjustment_note: "Mobile admin adjustment",
        },
      });
      setState((current) => ({
        ...current,
        savingId: "",
        users: current.users.map((item) => (item.id === updated.id ? updated : item)),
      }));
      setAdjustments((current) => ({ ...current, [user.id]: "" }));
    } catch (error) {
      setState((current) => ({ ...current, savingId: "", error: error.message }));
    }
  };

  return (
    <Screen loading={state.loading} refreshControl={load}>
      <AppHeader title="Users" subtitle="Token balances and quick admin adjustments from mobile." />
      {state.error ? <Text style={styles.error}>{state.error}</Text> : null}

      {[
        ["Admins", userGroups.admins],
        ["Students", userGroups.students],
        ["Guardians", userGroups.guardians],
      ].map(([label, users]) => (
        <SectionCard key={label} title={label} subtitle={`${users.length} account${users.length === 1 ? "" : "s"}`}>
          {users.map((user) => (
            <View key={user.id} style={styles.userCard}>
              <View style={styles.userTopRow}>
                <View style={styles.userCopy}>
                  <Text style={styles.userName}>{user.name || user.email}</Text>
                  <Text style={styles.userMeta}>{user.email}</Text>
                </View>
                <Text style={[styles.statusBadge, !user.is_active ? styles.statusBadgeMuted : null]}>
                  {user.is_active ? "Active" : "Inactive"}
                </Text>
              </View>

              <Text style={styles.userMeta}>
                Tokens: {user.token_balance} | Referrals: {user.referral_count}
              </Text>
              {user.class_name ? <Text style={styles.userMeta}>Class: {user.class_name} | Board: {user.board || "--"}</Text> : null}

              <View style={styles.adjustmentRow}>
                <TextInput
                  style={styles.adjustmentInput}
                  placeholder="Adjust tokens"
                  placeholderTextColor={colors.slateSoft}
                  keyboardType="numeric"
                  value={adjustments[user.id] ?? ""}
                  onChangeText={(value) => setAdjustments((current) => ({ ...current, [user.id]: value }))}
                />
                <Pressable
                  style={[styles.adjustmentButton, state.savingId === user.id ? styles.disabled : null]}
                  disabled={state.savingId === user.id}
                  onPress={() => saveAdjustment(user)}
                >
                  <Text style={styles.adjustmentButtonText}>{state.savingId === user.id ? "Saving..." : "Apply"}</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </SectionCard>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  userCard: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.card,
  },
  userTopRow: {
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  userCopy: {
    flex: 1,
    gap: 4,
  },
  userName: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "800",
  },
  userMeta: {
    color: colors.slate,
    fontSize: 13,
    lineHeight: 19,
  },
  statusBadge: {
    color: colors.success,
    backgroundColor: colors.successSoft,
    fontSize: 11,
    fontWeight: "900",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radii.pill,
  },
  statusBadgeMuted: {
    color: colors.slate,
    backgroundColor: colors.mist,
  },
  adjustmentRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  adjustmentInput: {
    flex: 1,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    color: colors.ink,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
  },
  adjustmentButton: {
    minWidth: 92,
    borderRadius: radii.md,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    ...shadows.glow,
  },
  adjustmentButtonText: {
    color: colors.white,
    fontWeight: "800",
  },
  disabled: {
    opacity: 0.55,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
});
