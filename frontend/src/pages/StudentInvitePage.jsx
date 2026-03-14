import { useState } from "react";

import FormMessage from "../components/FormMessage.jsx";
import { apiRequest } from "../lib/api.js";
import { useAuth } from "../state/AuthContext.jsx";

function StudentInvitePage() {
  const { token } = useAuth();
  const [inviteToken, setInviteToken] = useState("");
  const [state, setState] = useState({ loading: false, error: "", success: "" });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setState({ loading: true, error: "", success: "" });
    try {
      const data = await apiRequest("/api/guardian/accept-invite", {
        method: "POST",
        token,
        body: { invite_token: inviteToken },
      });
      setState({ loading: false, error: "", success: `Connected to guardian ${data.guardian_name}.` });
      setInviteToken("");
    } catch (error) {
      setState({ loading: false, error: error.message, success: "" });
    }
  };

  return (
    <section className="panel form-card">
      <h1 className="dashboard-title">Accept guardian invite</h1>
      <p className="dashboard-subtitle">Paste the invite token shared by your guardian to activate the link.</p>
      <form className="form-grid" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="invite-token">Invite token</label>
          <input id="invite-token" value={inviteToken} onChange={(e) => setInviteToken(e.target.value)} required />
        </div>
        <FormMessage>{state.error}</FormMessage>
        <FormMessage type="success">{state.success}</FormMessage>
        <button className="button button-primary" type="submit" disabled={state.loading}>
          {state.loading ? "Accepting..." : "Accept invite"}
        </button>
      </form>
    </section>
  );
}

export default StudentInvitePage;
