import { useCallback, useEffect, useMemo, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import Screen from "../../src/components/Screen";
import { useAuth } from "../../src/context/AuthContext";
import { apiRequest } from "../../src/lib/api";
import { colors, radii, shadows, spacing } from "../../src/theme";

const brandLogo = require("../../assets/quadravise-logo.png");

const emptyForm = {
  email: "",
  phone: "",
  full_name: "",
  class_name: "",
  school_name: "",
  token_balance: 0,
  referral_code: "",
  referred_by_email: "",
  referral_code_input: "",
  profile_image_url: "",
  token_top_up_packs: [],
};

const auditTabs = [
  { id: "all", label: "All" },
  { id: "token", label: "Tokens" },
  { id: "price", label: "Payments" },
  { id: "exam", label: "Exams" },
];

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function SectionCard({ title, subtitle, children }) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

export default function StudentProfileScreen() {
  const { logout } = useAuth();
  const [state, setState] = useState({
    loading: true,
    saving: false,
    purchasingPackId: "",
    error: "",
    success: "",
  });
  const [form, setForm] = useState(emptyForm);
  const [selectedImage, setSelectedImage] = useState(null);
  const [audit, setAudit] = useState({
    token_transactions: [],
    price_transactions: [],
    exam_transactions: [],
  });
  const [overlay, setOverlay] = useState({
    open: false,
    mode: "",
    filter: "all",
  });

  const load = useCallback(async () => {
    try {
      const [profile, auditPayload] = await Promise.all([
        apiRequest("/api/students/profile"),
        apiRequest("/api/students/profile/audit-log"),
      ]);

      setForm({
        email: profile.email || "",
        phone: profile.phone || "",
        full_name: profile.full_name || "",
        class_name: profile.class_name || "",
        school_name: profile.school_name || "",
        token_balance: profile.token_balance || 0,
        referral_code: profile.referral_code || "",
        referred_by_email: profile.referred_by_email || "",
        referral_code_input: "",
        profile_image_url: profile.profile_image_url || "",
        token_top_up_packs: profile.token_top_up_packs || [],
      });
      setAudit({
        token_transactions: auditPayload.token_transactions || [],
        price_transactions: auditPayload.price_transactions || [],
        exam_transactions: auditPayload.exam_transactions || [],
      });
      setSelectedImage(null);
      setState({
        loading: false,
        saving: false,
        purchasingPackId: "",
        error: "",
        success: "",
      });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error.message || "Could not load profile." }));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveProfile = async () => {
    try {
      setState((current) => ({ ...current, saving: true, error: "", success: "" }));
      const body = new FormData();
      body.append("phone", form.phone || "");
      body.append("full_name", form.full_name || "");
      body.append("class_name", form.class_name || "");
      body.append("school_name", form.school_name || "");
      if (form.referral_code_input) {
        body.append("referral_code_input", form.referral_code_input);
      }
      if (selectedImage) {
        body.append("profile_image_upload", {
          uri: selectedImage.uri,
          name: selectedImage.name,
          type: selectedImage.type,
        });
      }

      const data = await apiRequest("/api/students/profile", {
        method: "PATCH",
        body,
      });

      setForm((current) => ({
        ...current,
        ...data,
        token_balance: data.token_balance ?? current.token_balance,
        referral_code: data.referral_code || current.referral_code,
        referred_by_email: data.referred_by_email || current.referred_by_email,
        referral_code_input: "",
        profile_image_url: data.profile_image_url || current.profile_image_url,
        token_top_up_packs: data.token_top_up_packs || current.token_top_up_packs,
      }));
      setSelectedImage(null);
      setState((current) => ({ ...current, saving: false, success: "Profile updated successfully." }));
    } catch (error) {
      setState((current) => ({ ...current, saving: false, error: error.message || "Could not save profile." }));
    }
  };

  const purchaseTokenPack = async (packId) => {
    try {
      setState((current) => ({ ...current, purchasingPackId: packId, error: "", success: "" }));
      const purchase = await apiRequest("/api/students/profile/token-topups", {
        method: "POST",
        body: { pack_id: packId, provider: "mobile-demo" },
      });
      await load();
      setState((current) => ({
        ...current,
        purchasingPackId: "",
        success: `${purchase.token_amount} tokens added successfully.`,
      }));
    } catch (error) {
      setState((current) => ({ ...current, purchasingPackId: "", error: error.message || "Could not add tokens." }));
    }
  };

  const pickProfileImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setState((current) => ({ ...current, error: "Photo library access is required to upload a profile image." }));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const asset = result.assets[0];
      setSelectedImage({
        uri: asset.uri,
        name: asset.fileName || `profile-${Date.now()}.jpg`,
        type: asset.mimeType || "image/jpeg",
      });
      setState((current) => ({ ...current, error: "", success: "" }));
    } catch (error) {
      setState((current) => ({ ...current, error: error.message || "Could not open image picker." }));
    }
  };

  const shareReferral = async () => {
    if (!form.referral_code) return;
    try {
      await Share.share({
        message: `Use my QuadraILearn referral code: ${form.referral_code}`,
        title: "QuadraILearn referral",
      });
    } catch (error) {
      setState((current) => ({ ...current, error: error.message || "Could not share referral code." }));
    }
  };

  const previewImageUri = selectedImage?.uri || form.profile_image_url || "";

  const auditItems = useMemo(() => {
    const tokenItems = audit.token_transactions.map((item) => ({
      id: `token-${item.id}`,
      kind: "token",
      icon: item.amount >= 0 ? "wallet-outline" : "remove-circle-outline",
      title: item.note || item.transaction_type_label,
      subtitle: `Balance after ${item.balance_after} tokens`,
      value: `${item.amount >= 0 ? "+" : ""}${item.amount} tokens`,
      date: item.created_at,
      tone: item.amount >= 0 ? "positive" : "neutral",
    }));
    const priceItems = audit.price_transactions.map((item) => ({
      id: `price-${item.id}`,
      kind: "price",
      icon: item.price_transaction_type === "token_topup" ? "card-outline" : "cash-outline",
      title: item.title,
      subtitle: item.price_transaction_type === "token_topup" ? "Token purchase" : "Exam unlock payment",
      value: `Rs ${item.amount}`,
      date: item.created_at,
      tone: "neutral",
    }));
    const examItems = audit.exam_transactions.map((item) => ({
      id: `exam-${item.id}`,
      kind: "exam",
      icon: "document-text-outline",
      title: `${item.exam_name || "Exam"} · ${item.subject_name || "Subject"}`,
      subtitle: `${String(item.status || "").toUpperCase()}${item.score_percent ? ` · Score ${item.score_percent}%` : ""}`,
      value: item.access_mode === "paid" ? "Paid attempt" : "Free attempt",
      date: item.submitted_at || item.started_at,
      tone: "neutral",
    }));
    return [...tokenItems, ...priceItems, ...examItems].sort(
      (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime(),
    );
  }, [audit]);

  const filteredAuditItems = useMemo(() => {
    if (overlay.filter === "all") return auditItems;
    return auditItems.filter((item) => item.kind === overlay.filter);
  }, [auditItems, overlay.filter]);

  return (
    <Screen loading={state.loading} refreshControl={load} topPadding={0} horizontalPadding={0}>
      <View style={styles.pageShell}>
        <View style={styles.topBar}>
          <View style={styles.brandWrap}>
            <View style={styles.logoBox}>
              <Image source={brandLogo} style={styles.logoImage} resizeMode="contain" />
            </View>
            <Text style={styles.brandText}>QuadraILearn</Text>
          </View>
          <Pressable style={styles.logoutButton} onPress={logout}>
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </View>

        <Text style={styles.pageTitle}>Profile</Text>
        <Text style={styles.pageSubtitle}>Token balance, referral, and student account details.</Text>

        <View style={styles.summaryRow}>
          <Pressable style={[styles.summaryCard, styles.summaryBlue]} onPress={() => setOverlay({ open: true, mode: "wallet", filter: "price" })}>
            <View style={styles.summaryIconCircle}>
              <Ionicons name="wallet-outline" size={20} color={colors.brandBlue} />
            </View>
            <View style={styles.summaryCopy}>
              <Text style={styles.summaryLabel}>Available Tokens</Text>
              <Text style={styles.summaryValue}>{form.token_balance}</Text>
            </View>
          </Pressable>

          <Pressable style={[styles.summaryCard, styles.summaryWarm]} onPress={() => setOverlay({ open: true, mode: "referral", filter: "all" })}>
            <View style={styles.summaryIconCircle}>
              <Ionicons name="share-social-outline" size={20} color={colors.accentStrong} />
            </View>
            <View style={styles.summaryCopy}>
              <Text style={styles.summaryLabel}>Referral Code</Text>
              <Text style={[styles.summaryValue, styles.summaryAccent]}>{form.referral_code || "--"}</Text>
            </View>
          </Pressable>
        </View>

        {state.error ? <Text style={styles.error}>{state.error}</Text> : null}
        {state.success ? <Text style={styles.success}>{state.success}</Text> : null}

        <SectionCard title="Profile photo" subtitle="Optional profile image for your student account.">
          <View style={styles.photoRow}>
            <View style={styles.photoAvatar}>
              {previewImageUri ? (
                <Image source={{ uri: previewImageUri }} style={styles.photoImage} />
              ) : (
                <Text style={styles.photoInitial}>{(form.full_name || form.email || "Q").trim().charAt(0).toUpperCase()}</Text>
              )}
            </View>
            <View style={styles.photoContent}>
              <Text style={styles.photoHeading}>Change Photo</Text>
              <Pressable style={styles.primaryAction} onPress={pickProfileImage}>
                <Text style={styles.primaryActionText}>Change Photo</Text>
              </Pressable>
            </View>
          </View>
        </SectionCard>

        <SectionCard title="Account details" subtitle="Basic student information used across the app.">
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput style={[styles.input, styles.inputMuted]} editable={false} value={form.email} />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Phone</Text>
            <TextInput style={styles.input} placeholder="Phone" value={form.phone} onChangeText={(value) => setForm((current) => ({ ...current, phone: value }))} />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Full name</Text>
            <TextInput style={styles.input} placeholder="Full name" value={form.full_name} onChangeText={(value) => setForm((current) => ({ ...current, full_name: value }))} />
          </View>
        </SectionCard>

        <SectionCard title="Quick actions">
          <View style={styles.quickActionsRow}>
            <Pressable style={styles.quickActionCard} onPress={() => setOverlay({ open: true, mode: "audit", filter: "all" })}>
              <View style={styles.quickActionIcon}>
                <Ionicons name="settings-outline" size={22} color={colors.brandBlue} />
              </View>
              <Text style={styles.quickActionText}>Account{"\n"}Settings</Text>
            </Pressable>

            <Pressable style={styles.quickActionCard} onPress={() => setOverlay({ open: true, mode: "referral", filter: "all" })}>
              <View style={styles.quickActionIcon}>
                <Ionicons name="people-outline" size={22} color={colors.brandBlue} />
              </View>
              <Text style={styles.quickActionText}>Referral{"\n"}Program</Text>
            </Pressable>

            <Pressable style={styles.quickActionCard} onPress={() => setOverlay({ open: true, mode: "audit", filter: "exam" })}>
              <View style={styles.quickActionIcon}>
                <Ionicons name="shield-checkmark-outline" size={22} color={colors.brandBlue} />
              </View>
              <Text style={styles.quickActionText}>Security{"\n"}Settings</Text>
            </Pressable>
          </View>

          <Pressable style={[styles.saveButton, state.saving ? styles.disabled : null]} disabled={state.saving} onPress={saveProfile}>
            <Text style={styles.saveButtonText}>{state.saving ? "Saving..." : "Save Changes"}</Text>
          </Pressable>
        </SectionCard>
      </View>

      <Modal visible={overlay.open} animationType="slide" onRequestClose={() => setOverlay((current) => ({ ...current, open: false }))}>
        <View style={styles.modalScreen}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>
                {overlay.mode === "wallet" ? "Add tokens" : overlay.mode === "referral" ? "Referral program" : "Audit log"}
              </Text>
              <Text style={styles.modalSubtitle}>
                {overlay.mode === "wallet"
                  ? "Choose a pack and add tokens to your account."
                  : overlay.mode === "referral"
                    ? "Share your code or apply one referral code once."
                    : "Token, payment, and exam activity from your profile."}
              </Text>
            </View>
            <Pressable style={styles.modalClose} onPress={() => setOverlay((current) => ({ ...current, open: false }))}>
              <Ionicons name="close" size={20} color={colors.ink} />
            </Pressable>
          </View>

          {overlay.mode === "wallet" ? (
            <ScrollView contentContainerStyle={styles.modalContent}>
              {form.token_top_up_packs.map((pack) => {
                const active = state.purchasingPackId === pack.id;
                return (
                  <View key={pack.id} style={styles.packCard}>
                    <Text style={styles.packTitle}>{pack.tokens} tokens</Text>
                    <Text style={styles.packPrice}>Rs {pack.amount}</Text>
                    <Pressable
                      style={[styles.primaryAction, active ? styles.disabled : null]}
                      disabled={active}
                      onPress={() => purchaseTokenPack(pack.id)}
                    >
                      <Text style={styles.primaryActionText}>{active ? "Adding..." : "Add tokens"}</Text>
                    </Pressable>
                  </View>
                );
              })}
            </ScrollView>
          ) : null}

          {overlay.mode === "referral" ? (
            <ScrollView contentContainerStyle={styles.modalContent}>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Your referral code</Text>
                <TextInput style={[styles.input, styles.inputMuted]} editable={false} value={form.referral_code || ""} />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Referred by</Text>
                <TextInput style={[styles.input, styles.inputMuted]} editable={false} value={form.referred_by_email || "Not applied"} />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Apply referral code</Text>
                <TextInput
                  style={[styles.input, form.referred_by_email ? styles.inputMuted : null]}
                  editable={!form.referred_by_email}
                  placeholder={form.referred_by_email ? "Referral already applied" : "Enter referral code"}
                  value={form.referral_code_input}
                  onChangeText={(value) => setForm((current) => ({ ...current, referral_code_input: value.toUpperCase() }))}
                />
              </View>
              <View style={styles.modalActionRow}>
                <Pressable style={styles.secondaryAction} onPress={shareReferral}>
                  <Text style={styles.secondaryActionText}>Share code</Text>
                </Pressable>
                <Pressable style={styles.primarySmallAction} onPress={saveProfile}>
                  <Text style={styles.primaryActionText}>Apply</Text>
                </Pressable>
              </View>
            </ScrollView>
          ) : null}

          {overlay.mode === "audit" ? (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.auditTabs}>
                {auditTabs.map((tab) => (
                  <Pressable
                    key={tab.id}
                    style={[styles.auditTab, overlay.filter === tab.id ? styles.auditTabActive : null]}
                    onPress={() => setOverlay((current) => ({ ...current, filter: tab.id }))}
                  >
                    <Text style={[styles.auditTabText, overlay.filter === tab.id ? styles.auditTabTextActive : null]}>{tab.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <ScrollView contentContainerStyle={styles.modalContent}>
                {filteredAuditItems.map((item) => (
                  <View key={item.id} style={styles.auditRow}>
                    <View style={styles.auditRowIcon}>
                      <Ionicons name={item.icon} size={18} color={colors.brandBlue} />
                    </View>
                    <View style={styles.auditRowCopy}>
                      <Text style={styles.auditRowTitle}>{item.title}</Text>
                      <Text style={styles.auditRowSubtitle}>{item.subtitle}</Text>
                      <Text style={styles.auditRowDate}>{formatDate(item.date)}</Text>
                    </View>
                    <Text style={[styles.auditRowValue, item.tone === "positive" ? styles.positive : null]}>{item.value}</Text>
                  </View>
                ))}
                {!filteredAuditItems.length ? <Text style={styles.emptyText}>No activity available yet.</Text> : null}
              </ScrollView>
            </>
          ) : null}
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pageShell: {
    backgroundColor: "#f7f8fc",
    borderRadius: 34,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 18,
    marginTop: -12,
    gap: 18,
    ...shadows.card,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginHorizontal: -18,
    paddingHorizontal: 0,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
  },
  brandWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  logoBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  logoImage: {
    width: 40,
    height: 40,
  },
  brandText: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "900",
  },
  logoutButton: {
    minHeight: 44,
    paddingHorizontal: 20,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-end",
  },
  logoutText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800",
  },
  pageTitle: {
    color: colors.ink,
    fontSize: 36,
    lineHeight: 40,
    fontWeight: "900",
  },
  pageSubtitle: {
    color: colors.slate,
    fontSize: 14,
    lineHeight: 20,
    marginTop: -4,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 14,
  },
  summaryCard: {
    flex: 1,
    minHeight: 116,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    paddingHorizontal: 16,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  summaryBlue: {
    backgroundColor: "#f3f8ff",
  },
  summaryWarm: {
    backgroundColor: "#fff8f1",
  },
  summaryIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryCopy: {
    flex: 1,
    gap: 4,
  },
  summaryLabel: {
    color: colors.slate,
    fontSize: 12,
    fontWeight: "700",
  },
  summaryValue: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "900",
  },
  summaryAccent: {
    color: colors.accentStrong,
    fontSize: 18,
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    padding: 20,
    gap: 16,
    ...shadows.card,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "900",
  },
  sectionSubtitle: {
    color: colors.slate,
    fontSize: 14,
    lineHeight: 20,
    marginTop: -8,
  },
  photoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
  },
  photoAvatar: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: "#e8f0ff",
    borderWidth: 1,
    borderColor: "#cfe0fb",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  photoImage: {
    width: "100%",
    height: "100%",
  },
  photoInitial: {
    color: colors.brandBlue,
    fontSize: 64,
    fontWeight: "900",
  },
  photoContent: {
    flex: 1,
    gap: 16,
  },
  photoHeading: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
  },
  primaryAction: {
    minHeight: 48,
    alignSelf: "flex-start",
    paddingHorizontal: 28,
    borderRadius: radii.pill,
    backgroundColor: colors.brandBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryActionText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "800",
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "800",
  },
  input: {
    minHeight: 54,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    backgroundColor: colors.white,
    color: colors.ink,
    paddingHorizontal: 20,
    fontSize: 15,
  },
  inputMuted: {
    backgroundColor: "#f2f5fb",
    color: colors.slate,
  },
  quickActionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    minHeight: 74,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    backgroundColor: "#f4f7fc",
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  quickActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brandBlueSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionText: {
    color: colors.ink,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
    flex: 1,
  },
  saveButton: {
    minHeight: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.brandBlue,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "900",
  },
  modalScreen: {
    flex: 1,
    backgroundColor: "#f7f8fc",
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  modalTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "900",
  },
  modalSubtitle: {
    color: colors.slate,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  modalClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  modalContent: {
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  packCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    backgroundColor: colors.white,
    padding: 16,
    gap: 8,
  },
  packTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
  },
  packPrice: {
    color: colors.accentStrong,
    fontSize: 14,
    fontWeight: "800",
  },
  modalActionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  secondaryAction: {
    flex: 1,
    minHeight: 46,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryActionText: {
    color: colors.ink,
    fontWeight: "800",
  },
  primarySmallAction: {
    flex: 1,
    minHeight: 46,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  auditTabs: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  auditTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.lineSoft,
  },
  auditTabActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  auditTabText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "800",
  },
  auditTabTextActive: {
    color: colors.white,
  },
  auditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    backgroundColor: colors.white,
    padding: spacing.sm,
  },
  auditRowIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.brandBlueSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  auditRowCopy: {
    flex: 1,
    gap: 2,
  },
  auditRowTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "800",
  },
  auditRowSubtitle: {
    color: colors.slate,
    fontSize: 12,
    lineHeight: 17,
  },
  auditRowDate: {
    color: colors.slateSoft,
    fontSize: 11,
  },
  auditRowValue: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "right",
    maxWidth: 90,
  },
  positive: {
    color: colors.success,
  },
  emptyText: {
    color: colors.slate,
    fontSize: 13,
    textAlign: "center",
    paddingVertical: spacing.lg,
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
