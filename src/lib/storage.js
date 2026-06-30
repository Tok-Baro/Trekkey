const AUTH_SESSION_KEY = "trekkey-auth-session";
const APP_DATA_STORAGE_KEY = "trekkey-competition-demo-data";

export function readStoredSession() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawSession = window.localStorage.getItem(AUTH_SESSION_KEY);
    return rawSession ? JSON.parse(rawSession) : null;
  } catch {
    return null;
  }
}

export function storeSession(session) {
  if (typeof window === "undefined") {
    return;
  }

  if (!session) {
    window.localStorage.removeItem(AUTH_SESSION_KEY);
    return;
  }

  window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
}

export function readStoredAppData() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawData = window.localStorage.getItem(APP_DATA_STORAGE_KEY);
    return rawData ? JSON.parse(rawData) : null;
  } catch {
    return null;
  }
}

export function storeAppData(data) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(APP_DATA_STORAGE_KEY, JSON.stringify(data));
}
