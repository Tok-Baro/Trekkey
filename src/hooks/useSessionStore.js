import { useState } from "react";
import { clearSession, createSession, persistSession, readSession } from "../api/competitionApi.js";
import { clearApiSession, signIn, signOut } from "../api/backendClient.js";

export function useSessionStore() {
  const [session, setSession] = useState(() => readSession());

  // 비밀번호가 입력되면 실 백엔드 로그인, 아니면 기존 목업 세션 (관리자 목업 화면 호환)
  const login = async (form) => {
    let nextSession;
    if (form.password && form.email) {
      const user = await signIn(form.email, form.password);
      nextSession = {
        role: user.role === "PARTICIPANT" ? "participant" : "admin",
        name: user.name,
        email: user.email,
        studentId: user.studentId ?? "",
        major: user.major ?? "",
        employeeId: "",
        signedAt: new Date().toISOString(),
        apiSession: true
      };
    } else {
      nextSession = createSession(form);
    }
    setSession(nextSession);
    persistSession(nextSession);
    return nextSession;
  };

  const logout = () => {
    if (session?.apiSession) {
      signOut().catch(() => clearApiSession());
    }
    setSession(null);
    clearSession();
  };

  return {
    session,
    login,
    logout
  };
}
