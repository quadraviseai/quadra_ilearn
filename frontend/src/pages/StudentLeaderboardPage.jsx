import {
  RiseOutlined,
  StarOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
import { Alert, Avatar, Card, Empty, Input, Statistic, Table, Tag, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../lib/api.js";
import { useAuth } from "../state/AuthContext.jsx";

function StudentLeaderboardPage() {
  const { token } = useAuth();
  const [payload, setPayload] = useState({ entries: [], current_user: null });
  const [state, setState] = useState({ loading: true, error: "" });
  const [searchValue, setSearchValue] = useState("");

  useEffect(() => {
    let mounted = true;
    apiRequest("/api/leaderboards/weekly-health", { token })
      .then((data) => {
        if (mounted) {
          setPayload(data);
          setState({ loading: false, error: "" });
        }
      })
      .catch((error) => {
        if (mounted) {
          setState({ loading: false, error: error.message });
        }
      });
    return () => {
      mounted = false;
    };
  }, [token]);

  const entries = payload.entries || [];
  const currentUser = payload.current_user;
  const topEntry = entries[0] || null;

  function getInitials(name) {
    return (name || "")
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  const filteredEntries = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    if (!query) {
      return entries;
    }

    return entries.filter((entry) => entry.student_name.toLowerCase().includes(query));
  }, [entries, searchValue]);

  const columns = [
    {
      title: "Rank",
      dataIndex: "rank_position",
      key: "rank_position",
      width: 110,
      sorter: (left, right) => left.rank_position - right.rank_position,
      defaultSortOrder: "ascend",
      render: (_, entry) => (
        <div className="student-leaderboard-rank-cell">
          <Tag className="student-topic-pill">#{entry.rank_position}</Tag>
          {currentUser?.id === entry.id ? <Tag color="gold">You</Tag> : null}
        </div>
      ),
    },
    {
      title: "Learner",
      dataIndex: "student_name",
      key: "student_name",
      sorter: (left, right) => left.student_name.localeCompare(right.student_name),
      render: (_, entry) => (
        <div className="student-leaderboard-learner-cell">
          <Avatar className="student-leaderboard-avatar">{getInitials(entry.student_name)}</Avatar>
          <div className="student-leaderboard-learner-copy">
            <Typography.Text strong>{entry.student_name}</Typography.Text>
            <Typography.Text type="secondary">
              {entry.period_start} to {entry.period_end}
            </Typography.Text>
          </div>
        </div>
      ),
    },
    {
      title: "Weekly Score",
      dataIndex: "score_value",
      key: "score_value",
      width: 160,
      sorter: (left, right) => Number(left.score_value) - Number(right.score_value),
      render: (value) => <Typography.Text strong>{value}</Typography.Text>,
    },
    {
      title: "Period",
      key: "period",
      width: 220,
      sorter: (left, right) =>
        `${left.period_start}${left.period_end}`.localeCompare(`${right.period_start}${right.period_end}`),
      render: (_, entry) => (
        <Typography.Text type="secondary">
          {entry.period_start} to {entry.period_end}
        </Typography.Text>
      ),
    },
  ];

  return (
    <div className="student-dashboard-page student-dashboard-antd student-leaderboard-page">
      <Card className="student-dashboard-welcome student-antd-card student-leaderboard-hero" variant="borderless">
        <div className="student-dashboard-welcome-row">
          <div>
            <Typography.Title level={3} className="student-dashboard-title">
              Weekly leaderboard
            </Typography.Title>
            <Typography.Paragraph className="student-dashboard-subtitle">
              See how your latest learning-health score compares this week and track the benchmark to chase next.
            </Typography.Paragraph>
          </div>
          <div className="student-dashboard-welcome-meta-card">
            <div className="student-dashboard-welcome-meta">
              <span>Top score</span>
              <strong>{topEntry ? `${topEntry.score_value}` : "No entries"}</strong>
            </div>
            <div className="student-dashboard-welcome-meta">
              <span>Your position</span>
              <strong>{currentUser ? `#${currentUser.rank_position}` : "Not ranked yet"}</strong>
            </div>
          </div>
        </div>
      </Card>

      {state.error ? (
        <Alert type="error" showIcon message={state.error} />
      ) : null}

      <div className="student-dashboard-inline-summary student-leaderboard-summary">
        <Card className="student-summary-card student-summary-card-inline student-antd-card" variant="borderless">
          <div className="student-summary-card-head">
            <span className="student-summary-icon" aria-hidden="true">
              <TrophyOutlined />
            </span>
            <span className="student-summary-card-label">Current rank</span>
          </div>
          <Statistic title="" value={currentUser ? `#${currentUser.rank_position}` : "--"} />
          <Typography.Paragraph>
            Your latest position in this week&apos;s learning-health leaderboard.
          </Typography.Paragraph>
        </Card>
        <Card className="student-summary-card student-summary-card-inline student-antd-card" variant="borderless">
          <div className="student-summary-card-head">
            <span className="student-summary-icon" aria-hidden="true">
              <RiseOutlined />
            </span>
            <span className="student-summary-card-label">Your score</span>
          </div>
          <Statistic title="" value={currentUser?.score_value ?? "--"} />
          <Typography.Paragraph>
            Based on the latest weekly learning-health snapshot available for ranking.
          </Typography.Paragraph>
        </Card>
        <Card className="student-summary-card student-summary-card-inline student-antd-card" variant="borderless">
          <div className="student-summary-card-head">
            <span className="student-summary-icon" aria-hidden="true">
              <StarOutlined />
            </span>
            <span className="student-summary-card-label">Leaderboard size</span>
          </div>
          <Statistic title="" value={entries.length} />
          <Typography.Paragraph>
            Total learners currently included in this week&apos;s ranking window.
          </Typography.Paragraph>
        </Card>
      </div>

      <Card
        className="student-surface-card student-antd-card student-leaderboard-board"
        variant="borderless"
        loading={state.loading}
      >
        <div className="student-surface-head student-leaderboard-table-head">
          <div>
            <Typography.Title level={4}>Ranking board</Typography.Title>
            <Typography.Paragraph>
              Ordered by weekly learning-health score from highest to lowest.
            </Typography.Paragraph>
          </div>
          <Input.Search
            allowClear
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search learner"
            className="student-leaderboard-search"
          />
        </div>

        {entries.length === 0 && !state.loading ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No leaderboard entries yet." />
        ) : (
          <Table
            rowKey="id"
            className="student-leaderboard-table"
            columns={columns}
            dataSource={filteredEntries}
            pagination={{
              pageSize: 8,
              showSizeChanger: false,
            }}
            rowClassName={(entry) => (currentUser?.id === entry.id ? "student-leaderboard-table-row-current" : "")}
            locale={{
              emptyText: searchValue
                ? "No learners matched your search."
                : "No leaderboard entries yet.",
            }}
            scroll={{ x: 760 }}
          />
        )}
      </Card>
    </div>
  );
}

export default StudentLeaderboardPage;
