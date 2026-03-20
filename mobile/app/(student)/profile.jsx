import { useCallback, useEffect, useMemo, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { Image, Pressable, Share, StyleSheet, Text, TextInput, View } from "react-native";

import AppHeader from "../../src/components/AppHeader";
import Screen from "../../src/components/Screen";
import SectionCard from "../../src/components/SectionCard";
import { apiRequest } from "../../src/lib/api";
import { colors, radii, spacing } from "../../src/theme";

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
  profile_image_url: "",
};

export default function StudentProfileScreen() {
  const [state, setState] = useState({
    loading: true,
    saving: false,
    error: "",
    success: "",
  });
  const [form, setForm] = useState(emptyForm);
  const [selectedImage, setSelectedImage] = useState(null);

  const load = useCallback(async () => {
    try {
      const profile = await apiRequest("/api/students/profile");
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
        profile_image_url: profile.profile_image_url || "",
      });
      setSelectedImage(null);
      setState({
        loading: false,
        saving: false,
        error: "",
        success: "",
      });
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error: error.message,
      }));
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
      body.append("board", form.board || "");
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
      }));
      setSelectedImage(null);
      setState((current) => ({ ...current, saving: false, success: "Profile updated successfully." }));
    } catch (error) {
      setState((current) => ({ ...current, saving: false, error: error.message }));
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

  const previewImageUri = selectedImage?.uri || form.profile_image_url || "";
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
      <AppHeader title="Profile" subtitle="Token balance, referral, and student account details." />
      {state.error ? <Text style={styles.error}>{state.error}</Text> : null}
      {state.success ? <Text style={styles.success}>{state.success}</Text> : null}

      <View style={styles.profileTopBar}>
        <View>
          <Text style={styles.profileTopLabel}>Available tokens</Text>
          <Text style={styles.profileTopValue}>{form.token_balance}</Text>
        </View>
        <View style={styles.profileTopCode}>
          <Text style={styles.profileTopCodeLabel}>Referral</Text>
          <Text style={styles.profileTopCodeValue}>{form.referral_code || "--"}</Text>
        </View>
      </View>

      <SectionCard title="Profile photo" subtitle="Optional profile image for your student account.">
        <View style={styles.avatarPanel}>
          <View style={styles.avatarFrame}>
            {previewImageUri ? (
              <Image source={{ uri: previewImageUri }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarFallback}>{(form.full_name || form.email || "S").trim().charAt(0).toUpperCase()}</Text>
            )}
          </View>
          <View style={styles.avatarCopy}>
            <Text style={styles.avatarTitle}>{selectedImage ? "New image selected" : "Current profile image"}</Text>
            <Pressable style={styles.secondaryButtonCompact} onPress={pickProfileImage}>
              <Text style={styles.secondaryButtonText}>{previewImageUri ? "Change photo" : "Choose photo"}</Text>
            </Pressable>
          </View>
        </View>
      </SectionCard>

      <SectionCard title="Account details" subtitle="Basic student information used across the app.">
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  profileTopBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.lineSoft,
  },
  profileTopLabel: {
    color: colors.slate,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  profileTopValue: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: "900",
    marginTop: 4,
  },
  profileTopCode: {
    alignItems: "flex-end",
  },
  profileTopCodeLabel: {
    color: colors.slate,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  profileTopCodeValue: {
    color: colors.accentStrong,
    fontSize: 14,
    fontWeight: "900",
    marginTop: 4,
  },
  avatarPanel: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
  },
  avatarFrame: {
    width: 92,
    height: 92,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: colors.brandBlueSoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.lineSoft,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarFallback: {
    color: colors.brandBlue,
    fontSize: 36,
    fontWeight: "900",
  },
  avatarCopy: {
    flex: 1,
    gap: 8,
  },
  avatarTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "800",
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
    borderColor: colors.lineSoft,
    backgroundColor: colors.white,
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
  },
  primaryButtonInline: {
    flex: 1,
    minHeight: 46,
    borderRadius: radii.md,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: colors.white,
    fontWeight: "800",
  },
  secondaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonCompact: {
    minHeight: 42,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
  },
  secondaryButtonText: {
    color: colors.ink,
    fontWeight: "800",
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
