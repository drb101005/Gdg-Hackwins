const AUTH_STORAGE_KEY = "ace_local_auth";
const AUTH_EVENT = "ace-auth-changed";

export function getStoredAuth() {
  if (typeof window === "undefined") {
    return { token: null, user: null };
  }

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return { token: null, user: null };
    }

    const parsed = JSON.parse(raw);
    return {
      token: parsed?.token || null,
      user: parsed?.user || null,
    };
  } catch (_error) {
    return { token: null, user: null };
  }
}

export function setStoredAuth(session) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function updateStoredUser(user) {
  const current = getStoredAuth();
  setStoredAuth({ token: current.token, user });
}

export function clearStoredAuth() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function getAccessToken() {
  return getStoredAuth().token;
}

export function subscribeToAuthChanges(callback) {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener(AUTH_EVENT, callback);
  return () => window.removeEventListener(AUTH_EVENT, callback);
}
