import { clearStoredAuth, getAccessToken } from "./auth";

export const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:3001";
const DEFAULT_TIMEOUT_MS = 12000;

export function getMediaUrl(path) {
  if (!path) {
    return "";
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${API_BASE}/${String(path).replace(/^\/+/, "")}`;
}

async function readJsonSafely(response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch (_error) {
    return { error: text || "Request failed." };
  }
}

function createRequestError(message, extras = {}) {
  const error = new Error(message);
  Object.assign(error, extras);
  return error;
}

async function request(path, options = {}) {
  const { auth = true, body, headers = {}, method = "GET", timeoutMs = DEFAULT_TIMEOUT_MS } = options;
  const token = getAccessToken();
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
        ...(!isFormData && body ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw createRequestError("Request timed out. Please try again.", {
        isTimeoutError: true,
      });
    }

    throw createRequestError("Unable to reach the local backend. Check that the backend is running.", {
      isNetworkError: true,
    });
  } finally {
    globalThis.clearTimeout(timeout);
  }

  const payload = await readJsonSafely(response);
  if (!response.ok) {
    if (response.status === 401) {
      clearStoredAuth();
    }

    const message = payload?.message || payload?.error || "Request failed.";
    throw createRequestError(message, {
      status: response.status,
      payload,
    });
  }

  return payload;
}

export function signup(payload) {
  return request("/auth/signup", {
    auth: false,
    method: "POST",
    body: payload,
  });
}

export function login(payload) {
  return request("/auth/login", {
    auth: false,
    method: "POST",
    body: payload,
  });
}

export function getSystemHealth() {
  return request("/health", {
    auth: false,
    timeoutMs: 4000,
  });
}

export function getCurrentUser() {
  return request("/auth/me");
}

export function updateProfile(payload) {
  return request("/auth/me", {
    method: "PATCH",
    body: payload,
  });
}

export function getDashboardSummary() {
  return request("/interviews/dashboard/summary");
}

export function getAnalyticsSummary() {
  return request("/interviews/analytics/summary");
}

export function listInterviews() {
  return request("/interviews");
}

export function createInterview(payload) {
  return request("/interviews", {
    method: "POST",
    body: payload,
  });
}

export function getInterview(interviewId) {
  return request(`/interviews/${interviewId}`);
}

export function submitInterviewAnswer(interviewId, payload) {
  return request(`/interviews/${interviewId}/answers`, {
    method: "POST",
    body: payload,
  });
}

export function completeInterview(interviewId) {
  return request(`/interviews/${interviewId}/complete`, {
    method: "POST",
  });
}

export function getAdminOverview() {
  return request("/admin/overview");
}
