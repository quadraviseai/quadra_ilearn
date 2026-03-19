import { useCallback, useEffect, useState } from "react";
import { Button, Card, Form, InputNumber, Space, Typography, message } from "antd";

import { apiRequest } from "../lib/api.js";
import { useAuth } from "../state/AuthContext.jsx";

function AdminTokenRulesPage() {
  const { token } = useAuth();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadTokenSettings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiRequest("/api/admin/token-settings", { token });
      form.setFieldsValue(response);
    } catch (requestError) {
      messageApi.error(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [form, messageApi, token]);

  useEffect(() => {
    loadTokenSettings();
  }, [loadTokenSettings]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await apiRequest("/api/admin/token-settings", {
        method: "PATCH",
        token,
        body: values,
      });
      messageApi.success("Token rules updated.");
    } catch (requestError) {
      if (requestError?.errorFields) {
        return;
      }
      messageApi.error(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-page">
      {contextHolder}
      <Card title="Token economy controls" className="admin-card" loading={loading}>
        <Typography.Paragraph>
          Set the welcome bonus, referral reward, weak-topic unlock cost, and timer reset cost from one admin screen.
        </Typography.Paragraph>
        <Form form={form} layout="vertical">
          <Space wrap size={16} style={{ width: "100%" }}>
            <Form.Item name="initial_login_bonus" label="Welcome bonus" rules={[{ required: true, type: "number", min: 0 }]}>
              <InputNumber min={0} style={{ width: 220 }} />
            </Form.Item>
            <Form.Item name="referral_bonus" label="Referral bonus" rules={[{ required: true, type: "number", min: 0 }]}>
              <InputNumber min={0} style={{ width: 220 }} />
            </Form.Item>
            <Form.Item name="weak_topic_unlock_cost" label="Weak-topic cost" rules={[{ required: true, type: "number", min: 0 }]}>
              <InputNumber min={0} style={{ width: 220 }} />
            </Form.Item>
            <Form.Item name="timer_reset_cost" label="Timer reset cost" rules={[{ required: true, type: "number", min: 0 }]}>
              <InputNumber min={0} style={{ width: 220 }} />
            </Form.Item>
          </Space>
          <Button type="primary" onClick={handleSave} loading={saving}>
            Save token rules
          </Button>
        </Form>
      </Card>
    </div>
  );
}

export default AdminTokenRulesPage;
