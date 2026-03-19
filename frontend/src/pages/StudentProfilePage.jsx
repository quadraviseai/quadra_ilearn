import { useEffect, useRef, useState } from "react";
import { Button, Card, DatePicker, Input, Row, Col, Typography } from "antd";
import {
  BulbOutlined,
  CameraOutlined,
  IdcardOutlined,
  MailOutlined,
  PhoneOutlined,
  ShareAltOutlined,
  TrophyOutlined,
  UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import FormMessage from "../components/FormMessage.jsx";
import { apiRequest } from "../lib/api.js";
import { StudentPaymentSection } from "./StudentPaymentPage.jsx";
import { useAuth } from "../state/AuthContext.jsx";

const emptyProfile = {
  email: "",
  phone: "",
  full_name: "",
  class_name: "",
  date_of_birth: "",
  board: "",
  school_name: "",
  profile_image_url: "",
  primary_target_exam: "",
  secondary_target_exam: "",
  token_balance: 0,
  referral_code: "",
  referred_by_email: "",
  referral_code_input: "",
};

function formatSuggestionState(data) {
  const suggestions = Array.isArray(data?.ai_exam_suggestions)
    ? data.ai_exam_suggestions
    : Array.isArray(data?.suggestions)
      ? data.suggestions
      : [];
  const generatedAt = data?.ai_exam_suggestions_generated_at || data?.generated_at || null;

  if (!suggestions.length && !generatedAt) {
    return null;
  }

  return {
    suggestions,
    generatedAt,
  };
}

function StudentProfilePage() {
  const { token, logout } = useAuth();
  const [form, setForm] = useState(emptyProfile);
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profileImagePreviewUrl, setProfileImagePreviewUrl] = useState("");
  const profileImageInputRef = useRef(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [state, setState] = useState({ loading: true, saving: false, error: "", success: "" });
  const [examSuggestion, setExamSuggestion] = useState({
    loading: false,
    error: "",
    data: null,
  });
  const profileImagePreview = profileImagePreviewUrl || form.profile_image_url;
  const referralShareText = `Use my QuadraILearn referral code: ${form.referral_code}`;

  useEffect(() => {
    if (!profileImageFile) {
      setProfileImagePreviewUrl("");
      return undefined;
    }
    const objectUrl = URL.createObjectURL(profileImageFile);
    setProfileImagePreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [profileImageFile]);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      setState((current) => ({ ...current, loading: true, error: "", success: "" }));
      try {
        const data = await apiRequest("/api/students/profile", { token });
        if (!isMounted) {
          return;
        }
        setForm({
          email: data.email || "",
          phone: data.phone || "",
          full_name: data.full_name || "",
          class_name: data.class_name || "",
          date_of_birth: data.date_of_birth || "",
          board: data.board || "",
          school_name: data.school_name || "",
          profile_image_url: data.profile_image_url || "",
          primary_target_exam: data.primary_target_exam || "",
          secondary_target_exam: data.secondary_target_exam || "",
          token_balance: data.token_balance || 0,
          referral_code: data.referral_code || "",
          referred_by_email: data.referred_by_email || "",
          referral_code_input: "",
        });
        setExamSuggestion({
          loading: false,
          error: "",
          data: formatSuggestionState(data),
        });
        setState((current) => ({ ...current, loading: false }));
      } catch (error) {
        if (isMounted) {
          setState((current) => ({ ...current, loading: false, error: error.message }));
        }
      }
    }

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [token]);

  const updateField = (name, value) => {
    setFieldErrors((current) => ({ ...current, [name]: "" }));
    setForm((current) => ({ ...current, [name]: value }));
  };

  const updatePhone = (value) => {
    updateField("phone", value.replace(/\D/g, "").slice(0, 10));
  };

  const updateClassName = (value) => {
    updateField("class_name", value.replace(/[^\d]/g, "").slice(0, 2));
  };

  const updateBoard = (value) => {
    updateField("board", value.toUpperCase());
  };

  const validateProfileForm = () => {
    const nextErrors = {};

    if (form.phone && !/^\d{10}$/.test(form.phone.trim())) {
      nextErrors.phone = "Phone number must be exactly 10 digits.";
    }

    if (form.class_name && !/^\d+$/.test(form.class_name.trim())) {
      nextErrors.class_name = "Class must be a whole number without decimals.";
    } else if (form.class_name) {
      const classNumber = Number(form.class_name);
      if (classNumber < 10 || classNumber > 12) {
        nextErrors.class_name = "Class must be between 10 and 12.";
      }
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleFetchPrimaryExamSuggestion = async () => {
    if (!validateProfileForm()) {
      return;
    }

    if (!form.class_name.trim()) {
      setExamSuggestion({
        loading: false,
        error: "Add the student's class to get an AI exam suggestion.",
        data: null,
      });
      return;
    }

    setExamSuggestion({ loading: true, error: "", data: null });
    try {
      const data = await apiRequest("/api/students/profile/primary-exam-suggestion", {
        method: "POST",
        token,
        body: {
          class_name: form.class_name,
          date_of_birth: form.date_of_birth || null,
          board: form.board,
          school_name: form.school_name,
        },
      });
      setExamSuggestion({ loading: false, error: "", data: formatSuggestionState(data) });
    } catch (error) {
      setExamSuggestion({ loading: false, error: error.message, data: null });
    }
  };

  const applySuggestion = (target, examName) => {
    updateField(target, examName);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateProfileForm()) {
      return;
    }
    setState((current) => ({ ...current, saving: true, error: "", success: "" }));
    try {
      const payload = new FormData();
      payload.append("phone", form.phone);
      payload.append("full_name", form.full_name);
      payload.append("class_name", form.class_name);
      payload.append("board", form.board);
      payload.append("school_name", form.school_name);
      payload.append("primary_target_exam", form.primary_target_exam);
      payload.append("secondary_target_exam", form.secondary_target_exam);
      payload.append("referral_code_input", form.referral_code_input);
      if (form.date_of_birth) {
        payload.append("date_of_birth", form.date_of_birth);
      }
      if (profileImageFile) {
        payload.append("profile_image_upload", profileImageFile);
      }
      const data = await apiRequest("/api/students/profile", {
        method: "PATCH",
        token,
        body: payload,
      });
      setForm((current) => ({
        ...current,
        ...data,
        phone: data.phone || "",
        date_of_birth: data.date_of_birth || "",
        profile_image_url: data.profile_image_url || "",
        token_balance: data.token_balance || current.token_balance || 0,
        referral_code: data.referral_code || current.referral_code || "",
        referred_by_email: data.referred_by_email || current.referred_by_email || "",
        referral_code_input: "",
      }));
      setProfileImageFile(null);
      setState((current) => ({ ...current, saving: false, success: "Profile updated successfully." }));
    } catch (error) {
      setState((current) => ({ ...current, saving: false, error: error.message }));
    }
  };

  const handleProfileImageChange = (event) => {
    const file = event.target.files?.[0] || null;
    setProfileImageFile(file);
  };

  const openProfileImagePicker = () => {
    profileImageInputRef.current?.click();
  };

  const handleCopyReferralCode = async () => {
    if (!form.referral_code) {
      return;
    }
    try {
      await navigator.clipboard.writeText(form.referral_code);
      setState((current) => ({ ...current, success: "Referral code copied." }));
    } catch {
      setState((current) => ({ ...current, error: "Could not copy the referral code." }));
    }
  };

  const handleShareReferralCode = async () => {
    if (!form.referral_code) {
      return;
    }
    try {
      if (navigator.share) {
        await navigator.share({
          title: "QuadraILearn referral code",
          text: referralShareText,
        });
        return;
      }
      await navigator.clipboard.writeText(referralShareText);
      setState((current) => ({ ...current, success: "Referral message copied for sharing." }));
    } catch {
      setState((current) => ({ ...current, error: "Could not share the referral code." }));
    }
  };

  return (
    <section className="student-profile-page">
      <FormMessage>{state.error}</FormMessage>
      {state.success ? <div className="message message-success">{state.success}</div> : null}

      <Card className="student-dashboard-focus student-antd-card" variant="borderless">
        {state.loading ? (
          <div className="study-plan-empty">Loading profile...</div>
        ) : (
          <form className="student-profile-form" onSubmit={handleSubmit}>
            <Row gutter={[16, 16]}>
              <Col xs={24}>
                <div className="student-profile-image-panel">
                  <div className="student-profile-image-copy">
                    <div className="student-profile-section-head">
                      <span className="student-profile-section-icon"><UserOutlined /></span>
                      <div>
                        <Typography.Title level={4}>Profile image</Typography.Title>
                      </div>
                    </div>
                  </div>
                  <div className="student-profile-image-settings">
                    <label className="student-profile-label">Upload profile image</label>
                    <div className="student-profile-image-actions">
                      <Button type="primary" onClick={openProfileImagePicker}>
                        {profileImagePreview ? "Choose another image" : "Choose image"}
                      </Button>
                      <span className="student-profile-image-file-name">
                        {profileImageFile?.name || "No file selected yet"}
                      </span>
                    </div>
                  </div>
                </div>
              </Col>
              <Col xs={24}>
                <div className="student-profile-exam-panel">
                  <div className="student-profile-section-head">
                    <span className="student-profile-section-icon"><IdcardOutlined /></span>
                    <div>
                      <Typography.Title level={4}>Account details</Typography.Title>
                      <Typography.Paragraph>
                        Basic account and academic information used across diagnostics and study recommendations.
                      </Typography.Paragraph>
                    </div>
                  </div>
                  <Row gutter={[16, 16]}>
                    <Col xs={24} md={12}>
                      <label className="student-profile-label">Email</label>
                      <Input value={form.email} size="large" disabled prefix={<MailOutlined />} />
                    </Col>
                    <Col xs={24} md={12}>
                      <label className="student-profile-label">Phone</label>
                      <Input
                        value={form.phone}
                        size="large"
                        maxLength={10}
                        prefix={<PhoneOutlined />}
                        status={fieldErrors.phone ? "error" : ""}
                        onChange={(event) => updatePhone(event.target.value)}
                      />
                      {fieldErrors.phone ? <div className="message message-error">{fieldErrors.phone}</div> : null}
                    </Col>
                    <Col xs={24} md={12}>
                      <label className="student-profile-label">Full name</label>
                      <Input
                        value={form.full_name}
                        size="large"
                        prefix={<UserOutlined />}
                        onChange={(event) => updateField("full_name", event.target.value)}
                      />
                    </Col>
                    <Col xs={24} md={12}>
                      <label className="student-profile-label">Class</label>
                      <Input
                        value={form.class_name}
                        size="large"
                        prefix={<IdcardOutlined />}
                        status={fieldErrors.class_name ? "error" : ""}
                        onChange={(event) => updateClassName(event.target.value)}
                      />
                      {fieldErrors.class_name ? <div className="message message-error">{fieldErrors.class_name}</div> : null}
                    </Col>
                    <Col xs={24} md={12}>
                      <label className="student-profile-label">Date of birth</label>
                      <DatePicker
                        size="large"
                        format="MM/DD/YYYY"
                        value={form.date_of_birth ? dayjs(form.date_of_birth) : null}
                        onChange={(value) => updateField("date_of_birth", value ? value.format("YYYY-MM-DD") : "")}
                        style={{ width: "100%" }}
                      />
                    </Col>
                    <Col xs={24} md={12}>
                      <label className="student-profile-label">Board</label>
                      <Input
                        value={form.board}
                        size="large"
                        prefix={<TrophyOutlined />}
                        onChange={(event) => updateBoard(event.target.value)}
                      />
                    </Col>
                    <Col xs={24}>
                      <label className="student-profile-label">School name</label>
                      <Input
                        value={form.school_name}
                        size="large"
                        onChange={(event) => updateField("school_name", event.target.value)}
                      />
                    </Col>
                  </Row>
                </div>
              </Col>
              <Col xs={24}>
                <div className="student-profile-exam-panel student-profile-referral-banner">
                  <div className="student-profile-section-head">
                    <span className="student-profile-section-icon"><ShareAltOutlined /></span>
                    <div>
                      <Typography.Title level={4}>Referral</Typography.Title>
                      <Typography.Paragraph>
                        Share your referral code to earn token rewards, or apply a referral code once if someone invited you.
                      </Typography.Paragraph>
                    </div>
                  </div>
                  <Row gutter={[16, 16]} className="student-profile-referral-grid">
                    <Col xs={24} md={12}>
                      <div className="student-profile-referral-card">
                        <label className="student-profile-label">Your referral code</label>
                        <div className="student-profile-referral-share">
                          <div className="student-profile-referral-inline">
                            <Input value={form.referral_code} size="large" disabled />
                            <div className="student-profile-referral-actions">
                              <Button onClick={handleCopyReferralCode} disabled={!form.referral_code}>
                                Copy
                              </Button>
                              <Button type="primary" onClick={handleShareReferralCode} disabled={!form.referral_code}>
                                Share
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Col>
                    <Col xs={24} md={12}>
                      <div className="student-profile-referral-card">
                        <label className="student-profile-label">Referred by</label>
                        <Input value={form.referred_by_email || "Not applied"} size="large" disabled />
                      </div>
                    </Col>
                    <Col xs={24}>
                      <div className="student-profile-referral-card student-profile-referral-card-wide">
                        <label className="student-profile-label">Apply referral code</label>
                        <Input
                          value={form.referral_code_input}
                          size="large"
                          placeholder={form.referred_by_email ? "Referral already applied" : "Enter referral code"}
                          disabled={Boolean(form.referred_by_email)}
                          onChange={(event) => updateField("referral_code_input", event.target.value.toUpperCase())}
                        />
                      </div>
                    </Col>
                  </Row>
                </div>
              </Col>
            </Row>
            <div className="student-profile-actions">
              <Button
                className="button button-primary"
                htmlType="submit"
                loading={state.saving}
                size="large"
              >
                Save profile
              </Button>
            </div>
          </form>
        )}
      </Card>

      <Card className="student-dashboard-focus student-antd-card" variant="borderless">
        <div className="student-profile-exam-panel">
          <div className="student-profile-section-head">
            <span className="student-profile-section-icon"><BulbOutlined /></span>
            <div>
              <Typography.Title level={4}>Payment</Typography.Title>
              <Typography.Paragraph>
                Review the selected exam payment summary and unlock a retest from the profile page.
              </Typography.Paragraph>
            </div>
          </div>
          <StudentPaymentSection embedded />
        </div>
      </Card>
    </section>
  );
}

export default StudentProfilePage;
