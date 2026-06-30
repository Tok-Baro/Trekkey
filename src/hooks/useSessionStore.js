import { useState } from "react";
import { clearSession, createSession, persistSession, readSession } from "../api/competitionApi.js";

export function useSessionStore() {
  const [session, setSession] = useState(() => readSession());

  const login = (form) => {
    const nextSession = createSession(form);
    setSession(nextSession);
    persistSession(nextSession);
    return nextSession;
  };

  const logout = () => {
    setSession(null);
    clearSession();
  };

  return {
    session,
    login,
    logout
  };
}
