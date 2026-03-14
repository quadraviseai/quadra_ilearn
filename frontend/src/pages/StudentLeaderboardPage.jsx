import { useEffect, useState } from "react";

import FormMessage from "../components/FormMessage.jsx";
import { apiRequest } from "../lib/api.js";
import { useAuth } from "../state/AuthContext.jsx";

function StudentLeaderboardPage() {
  const { token } = useAuth();
  const [payload, setPayload] = useState({ entries: [], current_user: null });
  const [state, setState] = useState({ loading: true, error: "" });

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

  return (
    <section className="panel status-card">
      <h1 className="dashboard-title">Weekly leaderboard</h1>
      <p className="dashboard-subtitle">Ranked by the latest weekly learning-health score.</p>
      <FormMessage>{state.error}</FormMessage>
      {payload.current_user ? (
        <div className="message message-success" style={{ marginBottom: 16 }}>
          Your current position: #{payload.current_user.rank_position} with score {payload.current_user.score_value}
        </div>
      ) : null}
      {state.loading ? <p>Loading leaderboard...</p> : null}
      <div className="list">
        {payload.entries.map((entry) => (
          <div className="list-item" key={entry.id}>
            <div>
              <strong>#{entry.rank_position} {entry.student_name}</strong>
              <div className="tiny">{entry.period_start} to {entry.period_end}</div>
            </div>
            <div className="status-badge">{entry.score_value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default StudentLeaderboardPage;
