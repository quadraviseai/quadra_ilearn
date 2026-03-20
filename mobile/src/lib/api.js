import { readSession, writeSession } from "./storage";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "https://quadrailearn.quadravise.com";

function resolveUrl(path) {
  if (path.startsWith("http")) {
    return path;
  }
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const detail =
      typeof payload === "string"
        ? payload
        : payload.detail || payload.non_field_errors?.[0] || formatValidationError(payload);
    throw new Error(detail || "Request failed.");
  }

  return payload;
}

function formatValidationError(payload) {
  if (!payload || typeof payload !== "object") {
    return "Request failed.";
  }

  const fieldEntries = Object.entries(payload).filter(([key]) => key !== "detail" && key !== "non_field_errors");
  if (!fieldEntries.length) {
    return "Request failed.";
  }

  const messages = fieldEntries.map(([field, value]) => {
    const label = field.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
    const text = Array.isArray(value) ? value[0] : String(value);
    return `${label}: ${text}`;
  });

  return messages.join("\n");
}

async function refreshAccessToken(session) {
  if (!session?.refresh) {
    return null;
  }

  const response = await fetch(resolveUrl("/api/auth/refresh"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: session.refresh }),
  });

  if (!response.ok) {
    await writeSession(null);
    return null;
  }

  const payload = await response.json();
  const nextSession = { ...session, access: payload.access };
  await writeSession(nextSession);
  return nextSession.access;
}

export async function apiRequest(path, { method = "GET", token, body } = {}) {
  const storedSession = await readSession();
  const activeToken = token || storedSession?.access;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const headers = isFormData ? {} : { "Content-Type": "application/json" };
  if (activeToken) {
    headers.Authorization = `Bearer ${activeToken}`;
  }

  let response = await fetch(resolveUrl(path), {
    method,
    headers,
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  });

  if (response.status === 401 && storedSession?.refresh) {
    const refreshedToken = await refreshAccessToken(storedSession);
    if (refreshedToken) {
      response = await fetch(resolveUrl(path), {
        method,
        headers: { ...headers, Authorization: `Bearer ${refreshedToken}` },
        body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
      });
    }
  }

  if (response.status === 401) {
    await writeSession(null);
  }

  return parseResponse(response);
}
