import React, { useEffect, useState } from "react";
import { ClipboardCheck, IdCard, Layers3, LogIn, Mail, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import { getLoginFormDefaults } from "../../lib/auth.js";
import styles from "./LoginPage.module.scss";

export function LoginPage({ preferredRole = "admin", session, onLogin, onContinue }) {
  const [role, setRole] = useState(preferredRole);
  const [form, setForm] = useState(() => getLoginFormDefaults(preferredRole));

  useEffect(() => {
    setRole(preferredRole);
    setForm(getLoginFormDefaults(preferredRole));
  }, [preferredRole]);

  const selectRole = (nextRole) => {
    setRole(nextRole);
    setForm(getLoginFormDefaults(nextRole));
  };
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  return (
    <main className={styles.shell}>
      <section className={styles.panel} aria-labelledby="login-title">
        <div className={styles.brand}>
          <div className={styles.brandMark}>
            <Layers3 size={23} aria-hidden="true" />
          </div>
          <div>
            <strong>Trekkey</strong>
            <span>교내 대회관리 및 참가 신청</span>
          </div>
        </div>

        <div className={styles.copy}>
          <span>역할 기반 로그인</span>
          <h1 id="login-title">접속 목적에 맞는 화면으로 시작합니다</h1>
          <p>관리자는 대회 운영과 심사 흐름을 관리하고, 참가자는 공개된 대회를 조회한 뒤 참가 신청을 진행합니다.</p>
        </div>

        <div className={styles.roleGrid} role="tablist" aria-label="로그인 역할">
          <button
            className={`${styles.roleCard} ${role === "admin" ? styles.selected : ""}`}
            type="button"
            onClick={() => selectRole("admin")}
          >
            <ShieldCheck size={20} aria-hidden="true" />
            <strong>관리자</strong>
            <span>대회 생성, 신청 검토, 제출물·심사 관리</span>
          </button>
          <button
            className={`${styles.roleCard} ${role === "participant" ? styles.selected : ""}`}
            type="button"
            onClick={() => selectRole("participant")}
          >
            <UsersRound size={20} aria-hidden="true" />
            <strong>대회 참가자</strong>
            <span>대회 조회, 참가 신청, 신청 상태 확인</span>
          </button>
        </div>

        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault();
            onLogin({ ...form, role });
          }}
        >
          <div className={styles.fieldRow}>
            <label>
              <span>이름</span>
              <input
                autoComplete="name"
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
                required
              />
            </label>
            <label>
              <span>이메일</span>
              <input
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(event) => update("email", event.target.value)}
                required
              />
            </label>
          </div>

          {role === "admin" ? (
            <div className={styles.fieldRow}>
              <label>
                <span>관리자 번호</span>
                <input
                  autoComplete="username"
                  value={form.employeeId}
                  onChange={(event) => update("employeeId", event.target.value)}
                  required
                />
              </label>
              <label>
                <span>비밀번호</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={form.password}
                  onChange={(event) => update("password", event.target.value)}
                  required
                />
              </label>
            </div>
          ) : (
            <div className={styles.fieldRow}>
              <label>
                <span>비밀번호</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={form.password}
                  onChange={(event) => update("password", event.target.value)}
                  required
                />
              </label>
              <label>
                <span>학번</span>
                <input
                  autoComplete="username"
                  value={form.studentId}
                  onChange={(event) => update("studentId", event.target.value)}
                  required
                />
              </label>
              <label>
                <span>소속 학과</span>
                <input
                  autoComplete="organization-title"
                  value={form.major}
                  onChange={(event) => update("major", event.target.value)}
                  required
                />
              </label>
            </div>
          )}

          <div className={styles.actions}>
            {session && (
              <button className={styles.secondaryButton} type="button" onClick={onContinue}>
                <UserRound size={17} aria-hidden="true" />
                {session.name} 계정 계속
              </button>
            )}
            <button className={styles.primaryButton} type="submit">
              <LogIn size={17} aria-hidden="true" />
              {role === "admin" ? "관리자 콘솔로 로그인" : "참가자 페이지로 로그인"}
            </button>
          </div>
        </form>
      </section>

      <aside className={styles.sidePanel} aria-label="역할별 주요 기능">
        <div>
          <ClipboardCheck size={22} aria-hidden="true" />
          <strong>관리자</strong>
          <span>진행중인 대회, 신규 대회 등록, 참가 신청 검토를 한 흐름에서 처리합니다.</span>
        </div>
        <div>
          <IdCard size={22} aria-hidden="true" />
          <strong>참가자</strong>
          <span>모든 대회를 조회하고 접수중인 대회에 팀 또는 개인으로 신청할 수 있습니다.</span>
        </div>
        <div>
          <Mail size={22} aria-hidden="true" />
          <strong>시연 계정</strong>
          <span>입력값은 테스트용으로 자동 채워지며, 원하는 값으로 바꿔 로그인할 수 있습니다.</span>
        </div>
      </aside>
    </main>
  );
}
