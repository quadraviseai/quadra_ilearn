import { useCallback, useEffect, useMemo, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
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
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Screen from "../../src/components/Screen";
import { useAuth } from "../../src/context/AuthContext";
import { apiRequest } from "../../src/lib/api";
import { colors, radii, shadows, spacing } from "../../src/theme";

const brandLogo = require("../../assets/quadravise-logo.png");
const APP_SHARE_URL = process.env.EXPO_PUBLIC_SHARE_URL || "https://quadrailearn.quadravise.com";

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
  { id: "all", label: "All", icon: "apps-outline" },
  { id: "token", label: "Tokens", icon: "wallet-outline" },
  { id: "price", label: "Payments", icon: "card-outline" },
  { id: "exam", label: "Exams", icon: "document-text-outline" },
];
const AUDIT_PAGE_SIZE = 8;

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function SectionCard({ title, subtitle, children }) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionCardHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {children}
    </View>
  );
}

export default function StudentProfileScreen() {
  const { logout } = useAuth();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
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
    page: 1,
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
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const saveProfile = async () => {
    try {
      setState((current) => ({ ...current, saving: true, error: "", success: "" }));
      const body = new FormData();
      body.append("phone", form.phone || "");
      body.append("full_name", form.full_name || "");
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
      if (overlay.mode === "referral") {
        setOverlay((current) => ({ ...current, open: false }));
      }
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
        message: `Join me on QuadraILearn. Use my referral code ${form.referral_code} when you sign up.\n${APP_SHARE_URL}`,
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
  const auditPageCount = Math.max(1, Math.ceil(filteredAuditItems.length / AUDIT_PAGE_SIZE));
  const auditPage = Math.min(overlay.page || 1, auditPageCount);
  const paginatedAuditItems = useMemo(() => {
    const start = (auditPage - 1) * AUDIT_PAGE_SIZE;
    return filteredAuditItems.slice(start, start + AUDIT_PAGE_SIZE);
  }, [auditPage, filteredAuditItems]);
  const isCompact = width < 390;
  const isNarrow = width < 360;
  const shellPadding = isNarrow ? 14 : isCompact ? 16 : 18;
  const titleSize = isNarrow ? 24 : isCompact ? 28 : 32;

  return (
    <Screen loading={state.loading} refreshControl={load} topPadding={0} horizontalPadding={0}>
      <View style={[styles.pageShell, { paddingHorizontal: shellPadding, paddingTop: insets.top + 10 }]}>
        <View style={[styles.topBar, { marginHorizontal: -shellPadding }, isCompact && styles.topBarCompact]}>
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

        <Text style={[styles.pageTitle, { fontSize: titleSize, lineHeight: titleSize + 6 }]}>Profile</Text>
        <Text style={styles.pageSubtitle}>Token balance, referral, and student account details.</Text>

        <View style={[styles.summaryRow, isCompact && styles.summaryRowCompact]}>
          <Pressable style={[styles.summaryCard, isCompact && styles.summaryCardCompact, styles.summaryBlue]} onPress={() => setOverlay({ open: true, mode: "wallet", filter: "price" })}>
            <View style={styles.summaryIconCircle}>
              <Ionicons name="wallet-outline" size={20} color={colors.brandBlue} />
            </View>
            <View style={styles.summaryCopy}>
              <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>{form.token_balance}</Text>
            </View>
            <Pressable style={styles.summaryMiniButton} onPress={() => setOverlay({ open: true, mode: "wallet", filter: "price" })}>
              <Text style={styles.summaryMiniButtonText}>Add</Text>
            </Pressable>
          </Pressable>

          <Pressable style={[styles.summaryCard, isCompact && styles.summaryCardCompact, styles.summaryWarm]} onPress={shareReferral}>
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
          <View style={[styles.photoRow, isCompact && styles.photoRowCompact]}>
            <View style={styles.photoAvatar}>
              {previewImageUri ? (
                <Image source={{ uri: previewImageUri }} style={styles.photoImage} resizeMode="cover" />
              ) : (
                <Ionicons name="person-circle-outline" size={68} color={colors.brandBlue} />
              )}
            </View>
            <View style={styles.photoContent}>
              <Text style={styles.photoMeta}>PNG or JPG up to 5 MB</Text>
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
          <View style={[styles.quickActionsRow, isCompact && styles.quickActionsRowCompact]}>
            <Pressable style={[styles.quickActionCard, isCompact && styles.quickActionCardCompact]} onPress={() => setOverlay({ open: true, mode: "account", filter: "all", page: 1 })}>
              <View style={styles.quickActionIcon}>
                <Ionicons name="settings-outline" size={22} color={colors.brandBlue} />
              </View>
              <Text style={styles.quickActionText}>Account{"\n"}Settings</Text>
            </Pressable>

            <Pressable style={[styles.quickActionCard, isCompact && styles.quickActionCardCompact]} onPress={() => setOverlay({ open: true, mode: "referral", filter: "all", page: 1 })}>
              <View style={styles.quickActionIcon}>
                <Ionicons name="people-outline" size={22} color={colors.brandBlue} />
              </View>
              <Text style={styles.quickActionText}>Referral{"\n"}Program</Text>
            </Pressable>

            <Pressable style={[styles.quickActionCard, isCompact && styles.quickActionCardCompact]} onPress={() => setOverlay({ open: true, mode: "security", filter: "exam", page: 1 })}>
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
                {overlay.mode === "wallet" ? "Add tokens" : overlay.mode === "referral" ? "Referral program" : overlay.mode === "account" ? "Account settings" : overlay.mode === "security" ? "Security settings" : "Audit log"}
              </Text>
              <Text style={styles.modalSubtitle}>
                {overlay.mode === "wallet"
                  ? "Choose a pack and add tokens to your account."
                  : overlay.mode === "referral"
                    ? "Share your code or apply one referral code once."
                    : overlay.mode === "account"
                      ? "Your student profile details and account actions."
                      : overlay.mode === "security"
                        ? "Security, privacy, and session controls."
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

          {overlay.mode === "account" ? (
            <ScrollView contentContainerStyle={styles.modalContent}>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Email</Text>
                <TextInput style={[styles.input, styles.inputMuted]} editable={false} value={form.email} />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Phone</Text>
                <TextInput style={[styles.input, styles.inputMuted]} editable={false} value={form.phone || "Not added"} />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Full name</Text>
                <TextInput style={[styles.input, styles.inputMuted]} editable={false} value={form.full_name || "Not added"} />
              </View>
            </ScrollView>
          ) : null}

          {overlay.mode === "security" ? (
            <ScrollView contentContainerStyle={styles.modalContent}>
              <View style={styles.infoPanel}>
                <Text style={styles.infoPanelTitle}>Signed in as</Text>
                <Text style={styles.infoPanelValue}>{form.email}</Text>
                <Text style={styles.infoPanelText}>Use logout if you want to sign in with a different account on this device.</Text>
              </View>
              <Pressable style={styles.secondaryAction} onPress={logout}>
                <Text style={styles.secondaryActionText}>Logout from this device</Text>
              </Pressable>
            </ScrollView>
          ) : null}

          {overlay.mode === "audit" ? (
            <>
              <View style={styles.auditStickyHeader}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.auditTabs}>
                  {auditTabs.map((tab) => (
                    <Pressable
                      key={tab.id}
                      style={[styles.auditTab, overlay.filter === tab.id ? styles.auditTabActive : null]}
                      onPress={() => setOverlay((current) => ({ ...current, filter: tab.id, page: 1 }))}
                    >
                      <Ionicons
                        name={tab.icon}
                        size={14}
                        color={overlay.filter === tab.id ? colors.white : colors.ink}
                      />
                      <Text style={[styles.auditTabText, overlay.filter === tab.id ? styles.auditTabTextActive : null]}>{tab.label}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
              <ScrollView contentContainerStyle={styles.modalContent}>
                {paginatedAuditItems.map((item) => (
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
                {filteredAuditItems.length ? (
                  <View style={styles.auditPagination}>
                    <Pressable
                      style={[styles.auditPagerButton, auditPage <= 1 ? styles.disabled : null]}
                      disabled={auditPage <= 1}
                      onPress={() => setOverlay((current) => ({ ...current, page: Math.max(1, auditPage - 1) }))}
                    >
                      <Ionicons name="chevron-back" size={16} color={colors.ink} />
                      <Text style={styles.auditPagerText}>Prev</Text>
                    </Pressable>
                    <Text style={styles.auditPagerMeta}>Page {auditPage} of {auditPageCount}</Text>
                    <Pressable
                      style={[styles.auditPagerButton, auditPage >= auditPageCount ? styles.disabled : null]}
                      disabled={auditPage >= auditPageCount}
                      onPress={() => setOverlay((current) => ({ ...current, page: Math.min(auditPageCount, auditPage + 1) }))}
                    >
                      <Text style={styles.auditPagerText}>Next</Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.ink} />
                    </Pressable>
                  </View>
                ) : null}
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
    marginTop: 0,
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
  topBarCompact: {
    alignItems: "flex-start",
    flexWrap: "wrap",
    rowGap: 10,
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
  summaryRowCompact: {
    flexWrap: "wrap",
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
  summaryCardCompact: {
    minWidth: "100%",
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
    minWidth: 0,
  },
  summaryMiniButton: {
    minHeight: 30,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.brandBlue,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  summaryMiniButtonText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: "800",
  },
  summaryLabel: {
    color: colors.slate,
    fontSize: 12,
    fontWeight: "700",
  },
  summaryValue: {
    color: colors.ink,
    fontSize: 28,
    lineHeight: 32,
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
    paddingVertical: 18,
    paddingHorizontal: 0,
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
    paddingHorizontal: 20,
  },
  sectionCardHeader: {
    paddingHorizontal: 20,
    gap: 8,
  },
  photoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    backgroundColor: "#f8fbff",
  },
  photoRowCompact: {
    flexWrap: "wrap",
  },
  photoAvatar: {
    width: 78,
    height: 78,
    borderRadius: 22,
    backgroundColor: "#eef5ff",
    borderWidth: 1,
    borderColor: "#d7e6fb",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  photoImage: {
    width: "100%",
    height: "100%",
    borderRadius: 22,
  },
  photoInitial: {
    color: colors.brandBlue,
    fontSize: 64,
    fontWeight: "900",
  },
  photoContent: {
    flex: 1,
    gap: 10,
    justifyContent: "center",
  },
  photoMeta: {
    color: colors.slate,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
  primaryAction: {
    minHeight: 42,
    alignSelf: "flex-start",
    paddingHorizontal: 22,
    borderRadius: radii.pill,
    backgroundColor: colors.brandBlue,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.card,
  },
  primaryActionText: {
    color: colors.white,
    fontSize: 13,
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
  quickActionsRowCompact: {
    flexWrap: "nowrap",
  },
  quickActionCard: {
    flex: 1,
    minHeight: 68,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    backgroundColor: "#f4f7fc",
    paddingHorizontal: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  quickActionCardCompact: {
    minWidth: 0,
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
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "700",
    textAlign: "center",
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
    gap: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
    marginBottom: 0,
  },
  auditStickyHeader: {
    paddingTop: 4,
    paddingBottom: 6,
    backgroundColor: "#f7f8fc",
    zIndex: 2,
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
  infoPanel: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    backgroundColor: colors.white,
    padding: 16,
    gap: 8,
  },
  infoPanelTitle: {
    color: colors.slate,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  infoPanelValue: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
  },
  infoPanelText: {
    color: colors.slate,
    fontSize: 13,
    lineHeight: 19,
  },
  auditTabs: {
    gap: 10,
    paddingRight: spacing.md,
    paddingBottom: 2,
    paddingTop: 2,
    alignItems: "center",
  },
  auditTab: {
    minWidth: 86,
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 0,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    ...shadows.card,
  },
  auditTabActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  auditTabText: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: "800",
  },
  auditTabTextActive: {
    color: colors.white,
  },
  auditRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 14,
    ...shadows.card,
  },
  auditRowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brandBlueSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  auditRowCopy: {
    flex: 1,
    gap: 4,
  },
  auditRowTitle: {
    color: colors.ink,
    fontSize: 14,
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
    maxWidth: 104,
    paddingTop: 2,
  },
  auditPagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingTop: 6,
  },
  auditPagerButton: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 4,
  },
  auditPagerText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "800",
  },
  auditPagerMeta: {
    color: colors.slate,
    fontSize: 12,
    fontWeight: "700",
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
