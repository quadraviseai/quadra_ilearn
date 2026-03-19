import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, Share, StyleSheet, Text, TextInput, View } from "react-native";

import AppHeader from "../../src/components/AppHeader";
import Screen from "../../src/components/Screen";
import SectionCard from "../../src/components/SectionCard";
import { apiRequest } from "../../src/lib/api";
import {
  fetchExams,
  fetchSubjects,
  getSelectedFlow,
  unlockRetest,
} from "../../src/lib/studentFlow";
import { colors, radii, shadows, spacing } from "../../src/theme";

const emptyForm = {
  email: "",
  phone: "",
  full_name: "",
  class_name: "",
  board: "",
  school_name: "",
  token_balance: 0,
  referral_code: "",
  referred_by_email: "",
  referral_code_input: "",
};

export default function StudentProfileScreen() {
  const [state, setState] = useState({
    loading: true,
    saving: false,
    error: "",
    success: "",
    paymentLoading: false,
    paymentMessage: "",
  });
  const [form, setForm] = useState(emptyForm);
  const [paymentState, setPaymentState] = useState({
    exam: null,
    subject: null,
    loading: true,
  });

  const load = useCallback(async () => {
    try {
      const [profile, selection] = await Promise.all([apiRequest("/api/students/profile"), getSelectedFlow()]);
      let selectedExam = null;
      let selectedSubject = null;

      if (selection.examId) {
        const exams = await fetchExams();
        selectedExam = exams.find((exam) => String(exam.id) === String(selection.examId)) || null;
        if (selectedExam) {
          const subjects = await fetchSubjects(selection.examId);
          selectedSubject = subjects.find((subject) => String(subject.id) === String(selection.subjectId)) || null;
        }
      }

      setForm({
        email: profile.email || "",
        phone: profile.phone || "",
        full_name: profile.full_name || "",
        class_name: profile.class_name || "",
        board: profile.board || "",
        school_name: profile.school_name || "",
        token_balance: profile.token_balance || 0,
        referral_code: profile.referral_code || "",
        referred_by_email: profile.referred_by_email || "",
        referral_code_input: "",
      });
      setPaymentState({ exam: selectedExam, subject: selectedSubject, loading: false });
      setState({
        loading: false,
        saving: false,
        error: "",
        success: "",
        paymentLoading: false,
        paymentMessage: "",
      });
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error: error.message,
      }));
      setPaymentState({ exam: null, subject: null, loading: false });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveProfile = async () => {
    try {
      setState((current) => ({ ...current, saving: true, error: "", success: "" }));
      const data = await apiRequest("/api/students/profile", {
        method: "PATCH",
        body: {
          phone: form.phone,
          full_name: form.full_name,
          class_name: form.class_name,
          board: form.board,
          school_name: form.school_name,
          referral_code_input: form.referral_code_input,
        },
      });
      setForm((current) => ({
        ...current,
        ...data,
        token_balance: data.token_balance ?? current.token_balance,
        referral_code: data.referral_code || current.referral_code,
        referred_by_email: data.referred_by_email || current.referred_by_email,
        referral_code_input: "",
      }));
      setState((current) => ({ ...current, saving: false, success: "Profile updated successfully." }));
    } catch (error) {
      setState((current) => ({ ...current, saving: false, error: error.message }));
    }
  };

  const shareReferral = async () => {
    if (!form.referral_code) {
      return;
    }
    try {
      await Share.share({
        message: `Use my QuadraILearn referral code: ${form.referral_code}`,
        title: "QuadraILearn referral",
      });
    } catch (error) {
      setState((current) => ({ ...current, error: error.message || "Could not share referral code." }));
    }
  };

  const handleUnlockRetest = async () => {
    if (!paymentState.exam || !paymentState.subject) {
      return;
    }
    try {
      setState((current) => ({ ...current, paymentLoading: true, paymentMessage: "", error: "" }));
      await unlockRetest(paymentState.exam.id, paymentState.subject.id);
      setState((current) => ({
        ...current,
        paymentLoading: false,
        paymentMessage: `Retest unlocked for ${paymentState.subject.name}.`,
      }));
    } catch (error) {
      setState((current) => ({ ...current, paymentLoading: false, error: error.message }));
    }
  };

  const fields = useMemo(
    () => [
      ["Email", "email", false],
      ["Phone", "phone", true],
      ["Full name", "full_name", true],
      ["Class", "class_name", true],
      ["Board", "board", true],
      ["School", "school_name", true],
    ],
    [],
  );

  return (
    <Screen loading={state.loading} refreshControl={load}>
      <AppHeader title="Profile" subtitle="Tokens, referral, account details, and payment controls in one mobile screen." />
      {state.error ? <Text style={styles.error}>{state.error}</Text> : null}
      {state.success ? <Text style={styles.success}>{state.success}</Text> : null}

      <SectionCard title="Student snapshot" subtitle="The key account values used across the app." tone="accent">
        <View style={styles.snapshotRow}>
          <View style={styles.snapshotTile}>
            <Text style={styles.snapshotLabel}>Tokens</Text>
            <Text style={styles.snapshotValue}>{form.token_balance}</Text>
          </View>
          <View style={styles.snapshotTile}>
            <Text style={styles.snapshotLabel}>Referral</Text>
            <Text style={styles.snapshotValueSmall}>{form.referral_code || "--"}</Text>
          </View>
        </View>
      </SectionCard>

      <SectionCard title="Account details" subtitle="Edit the profile values used across diagnostics and recommendations.">
        {fields.map(([label, key, editable]) => (
          <View key={key} style={styles.inputGroup}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
              style={[styles.input, !editable ? styles.inputDisabled : null]}
              placeholder={label}
              editable={editable}
              value={form[key]}
              onChangeText={(value) => setForm((current) => ({ ...current, [key]: value }))}
            />
          </View>
        ))}
        <Pressable style={[styles.primaryButton, state.saving ? styles.disabled : null]} disabled={state.saving} onPress={saveProfile}>
          <Text style={styles.primaryButtonText}>{state.saving ? "Saving..." : "Save profile"}</Text>
        </Pressable>
      </SectionCard>

      <SectionCard title="Referral" subtitle="Share your code or apply one referral code once.">
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Your referral code</Text>
          <TextInput style={[styles.input, styles.inputDisabled]} editable={false} value={form.referral_code || ""} />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Referred by</Text>
          <TextInput style={[styles.input, styles.inputDisabled]} editable={false} value={form.referred_by_email || "Not applied"} />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Apply referral code</Text>
          <TextInput
            style={[styles.input, form.referred_by_email ? styles.inputDisabled : null]}
            editable={!form.referred_by_email}
            placeholder={form.referred_by_email ? "Referral already applied" : "Enter referral code"}
            value={form.referral_code_input}
            onChangeText={(value) => setForm((current) => ({ ...current, referral_code_input: value.toUpperCase() }))}
          />
        </View>
        <View style={styles.actionRow}>
          <Pressable style={styles.secondaryButton} onPress={shareReferral}>
            <Text style={styles.secondaryButtonText}>Share code</Text>
          </Pressable>
          <Pressable style={styles.primaryButtonInline} onPress={saveProfile}>
            <Text style={styles.primaryButtonText}>Apply</Text>
          </Pressable>
        </View>
      </SectionCard>

      <SectionCard title="Payment" subtitle="Retest payments now live inside profile, not on a separate page.">
        {paymentState.loading ? (
          <Text style={styles.metaText}>Loading selected exam payment summary...</Text>
        ) : paymentState.exam && paymentState.subject ? (
          <>
            <View style={styles.paymentCard}>
              <Text style={styles.paymentLabel}>Exam</Text>
              <Text style={styles.paymentValue}>{paymentState.exam.name}</Text>
              <Text style={styles.paymentLabel}>Subject</Text>
              <Text style={styles.paymentValue}>{paymentState.subject.name}</Text>
              <Text style={styles.paymentLabel}>Amount</Text>
              <Text style={styles.paymentAmount}>Rs. {paymentState.exam.retest_price}</Text>
            </View>
            <Pressable
              style={[styles.primaryButton, state.paymentLoading ? styles.disabled : null]}
              disabled={state.paymentLoading}
              onPress={handleUnlockRetest}
            >
              <Text style={styles.primaryButtonText}>
                {state.paymentLoading ? "Processing..." : `Pay Rs. ${paymentState.exam.retest_price}`}
              </Text>
            </Pressable>
            {state.paymentMessage ? <Text style={styles.success}>{state.paymentMessage}</Text> : null}
          </>
        ) : (
          <Text style={styles.metaText}>
            Select an exam and subject in the diagnostic flow first. The matching retest payment will appear here.
          </Text>
        )}
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  snapshotRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  snapshotTile: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.card,
  },
  snapshotLabel: {
    color: colors.slate,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  snapshotValue: {
    color: colors.ink,
    fontSize: 26,
    fontWeight: "900",
    marginTop: 8,
  },
  snapshotValueSmall: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "800",
    marginTop: 10,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "800",
  },
  input: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "#ffffff",
    color: colors.ink,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
  },
  inputDisabled: {
    backgroundColor: colors.surface,
    color: colors.slate,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: radii.md,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.glow,
  },
  primaryButtonInline: {
    flex: 1,
    minHeight: 46,
    borderRadius: radii.md,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.glow,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "800",
  },
  secondaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    ...shadows.card,
  },
  secondaryButtonText: {
    color: colors.ink,
    fontWeight: "800",
  },
  paymentCard: {
    gap: 8,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.card,
  },
  paymentLabel: {
    color: colors.slate,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    marginTop: 4,
  },
  paymentValue: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800",
  },
  paymentAmount: {
    color: colors.accentStrong,
    fontSize: 24,
    fontWeight: "900",
  },
  metaText: {
    color: colors.slate,
    fontSize: 13,
    lineHeight: 20,
  },
  disabled: {
    opacity: 0.55,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
  success: {
    color: colors.success,
    fontSize: 13,
  },
});
