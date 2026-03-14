import { useEffect, useState } from "react";
import { Card, Col, List, Row, Skeleton, Statistic, Tag, Typography } from "antd";

import { apiRequest } from "../lib/api.js";
import { useAuth } from "../state/AuthContext.jsx";

function AdminDashboardPage() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      setLoading(true);
      setError("");
      try {
        const response = await apiRequest("/api/admin/dashboard", { token });
        if (active) {
          setData(response);
        }
      } catch (requestError) {
        if (active) {
          setError(requestError.message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadDashboard();
    return () => {
      active = false;
    };
  }, [token]);

  if (loading) {
    return <Skeleton active paragraph={{ rows: 8 }} />;
  }

  if (error) {
    return <div className="message message-error">{error}</div>;
  }

  const metrics = [
    { title: "Users", value: data.users_total },
    { title: "Students", value: data.students_total },
    { title: "Guardians", value: data.guardians_total },
    { title: "Admins", value: data.admins_total },
    { title: "Subjects", value: data.subjects_total },
    { title: "Concepts", value: data.concepts_total },
    { title: "Questions", value: data.questions_total },
    { title: "Attempts", value: data.attempts_total },
  ];

  return (
    <div className="admin-page">
      <section className="admin-hero panel">
        <span className="eyebrow">Internal Admin</span>
        <Typography.Title level={2}>Platform operations at a glance</Typography.Title>
        <Typography.Paragraph>
          Review account activity, content readiness, and diagnostic usage from one place.
        </Typography.Paragraph>
      </section>

      <Row gutter={[16, 16]}>
        {metrics.map((metric) => (
          <Col xs={24} sm={12} lg={6} key={metric.title}>
            <Card className="admin-stat-card">
              <Statistic title={metric.title} value={metric.value} />
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Recent users" className="admin-card">
            <List
              dataSource={data.recent_users}
              renderItem={(user) => (
                <List.Item>
                  <div className="admin-list-row">
                    <div>
                      <strong>{user.name}</strong>
                      <div>{user.email}</div>
                    </div>
                    <Tag color={user.role === "admin" ? "orange" : user.role === "guardian" ? "blue" : "green"}>
                      {user.role}
                    </Tag>
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Recent attempts" className="admin-card">
            <List
              dataSource={data.recent_attempts}
              renderItem={(attempt) => (
                <List.Item>
                  <div className="admin-list-row">
                    <div>
                      <strong>{attempt.student_name}</strong>
                      <div>{attempt.subject_name}</div>
                    </div>
                    <Tag>{attempt.status}</Tag>
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default AdminDashboardPage;

