import { useEffect, useState } from "react";
import { clearSession, persistSession, readSession } from "../api/competitionApi.js";
import { refreshSession, signIn, signOut } from "../api/backendApi.js";

function toFrontendSession(userSession) {
  const serverRole = userSession.role;
  return {
    ...userSession,
    role: serverRole === "PARTICIPANT" ? "participant" : "admin",
    serverRole,
    studentId: userSession.studentId ?? "",
    major: userSession.major ?? "",
    authSource: "server",
    signedAt: new Date().toISOString()
  };
}

function shouldRestoreServerSession(storedSession) {
  return storedSession?.authSource === "server" || storedSession?.role === "participant";
}

function isAllowedRole(selectedRole, serverRole) {
  if (selectedRole === "participant") {
    return serverRole === "PARTICIPANT";
  }

  return serverRole === "ADMIN" || serverRole === "ROOT_ADMIN";
}

export function useSessionStore() {
  const [session, setSession] = useState(null);
  const [isReady, setIsReady] = useState(() => !shouldRestoreServerSession(readSession()));

  useEffect(() => {
    const storedSession = readSession();
    if (!shouldRestoreServerSession(storedSession)) {
      if (storedSession) {
        clearSession();
      }
      setIsReady(true);
      return undefined;
    }

    let isActive = true;
    refreshSession()
      .then(({ userSessionRes }) => {
        if (!isActive) {
          return;
        }
        const nextSession = toFrontendSession(userSessionRes);
        setSession(nextSession);
        persistSession(nextSession);
      })
      .catch(() => {
        if (isActive) {
          setSession(null);
          clearSession();
        }
      })
      .finally(() => {
        if (isActive) {
          setIsReady(true);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    const handleAuthExpired = () => {
      setSession((current) => {
        if (current?.authSource !== "server") {
          return current;
        }

        clearSession();
        return null;
      });
      setIsReady(true);
    };

    window.addEventListener("trekkey:auth-expired", handleAuthExpired);
    return () => window.removeEventListener("trekkey:auth-expired", handleAuthExpired);
  }, []);

  const login = async (form) => {
    const { userSessionRes } = await signIn({
      email: form.email.trim(),
      password: form.password
    });
    if (!isAllowedRole(form.role, userSessionRes.role)) {
      await signOut().catch(() => undefined);
      throw new Error(
        form.role === "participant"
          ? "참가자 계정으로 로그인해 주세요."
          : "관리자 계정으로 로그인해 주세요."
      );
    }

    const nextSession = toFrontendSession(userSessionRes);
    setSession(nextSession);
    persistSession(nextSession);
    setIsReady(true);
    return nextSession;
  };

  const logout = async () => {
    try {
      if (session?.authSource === "server") {
        await signOut();
      }
    } catch {
      // 서버 세션 정리에 실패해도 로컬 로그아웃은 완료한다.
    } finally {
      setSession(null);
      clearSession();
      setIsReady(true);
    }
  };

  return {
    session,
    isReady,
    login,
    logout
  };
}
