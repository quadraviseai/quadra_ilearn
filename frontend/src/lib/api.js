import { readStoredSession, writeStoredSession } from "./authStorage.js";

const JSON_HEADERS = {
  "Content-Type": "application/json",
};

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const fallbackDetail =
      response.status >= 500
        ? "Something went wrong on the server. Please try again."
        : "Request failed.";
    const detail =
      typeof payload === "string"
        ? contentType.includes("text/html")
          ? fallbackDetail
          : payload
        : payload.detail || payload.non_field_errors?.[0] || JSON.stringify(payload);
    throw new Error(detail || fallbackDetail);
  }

  return payload;
}

async function refreshAccessToken(session) {
  if (!session?.refresh) {
    return null;
  }

  const response = await fetch("/api/auth/refresh", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ refresh: session.refresh }),
  });
  if (!response.ok) {
    writeStoredSession(null);
    return null;
  }

  const payload = await response.json();
  const nextSession = { ...session, access: payload.access };
  writeStoredSession(nextSession);
  return nextSession.access;
}

export async function apiRequest(path, { method = "GET", token, body } = {}) {
  const storedSession = readStoredSession();
  const activeToken = storedSession?.access || token;
  const headers = { ...JSON_HEADERS };
  if (activeToken) {
    headers.Authorization = `Bearer ${activeToken}`;
  }

  let response = await fetch(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401 && (activeToken || storedSession?.refresh)) {
    const refreshedToken = await refreshAccessToken(readStoredSession() || storedSession);
    if (refreshedToken) {
      response = await fetch(path, {
        method,
        headers: {
          ...headers,
          Authorization: `Bearer ${refreshedToken}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    }
  }

  return parseResponse(response);
}
