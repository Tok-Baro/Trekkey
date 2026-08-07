import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  GraduationCap,
  KeyRound,
  Layers3,
  Mail,
  Search,
  ShieldCheck,
  UserPlus,
  UsersRound
} from "lucide-react";
import { getApiErrorMessage } from "../../api/backendApi.js";
import { searchOrganizations, signUpAdmin, signUpParticipant } from "../../api/signupApi.js";
import styles from "./SignupPage.module.scss";

const EMPTY_PARTICIPANT_FORM = {
  organizationId: null,
  name: "",
  email: "",
  password: "",
  passwordConfirm: "",
  studentId: "",
  major: ""
};

const EMPTY_ADMIN_FORM = {
  inviteToken: "",
  name: "",
  email: "",
  password: "",
  passwordConfirm: "",
  department: "",
  position: ""
};

function optionalValue(value) {
  return value.trim() || null;
}

export function SignupPage({ preferredRole }) {
  const location = useLocation();
  const navigate = useNavigate();
  const inviteToken = useMemo(
    () => new URLSearchParams(location.search).get("token")?.trim() ?? "",
    [location.search]
  );
  const initialRole = preferredRole ?? (location.pathname.endsWith("/admin") || inviteToken ? "admin" : "participant");
  const [role, setRole] = useState(initialRole);
  const [participantForm, setParticipantForm] = useState(EMPTY_PARTICIPANT_FORM);
  const [adminForm, setAdminForm] = useState(() => ({ ...EMPTY_ADMIN_FORM, inviteToken }));
  const [organizationKeyword, setOrganizationKeyword] = useState("");
  const [organizations, setOrganizations] = useState([]);
  const [isOrganizationFocused, setIsOrganizationFocused] = useState(false);
  const [isOrganizationLoading, setIsOrganizationLoading] = useState(false);
  const [organizationError, setOrganizationError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedRole, setCompletedRole] = useState(null);

  const form = role === "participant" ? participantForm : adminForm;
  const updateForm = (field, value) => {
    const setter = role === "participant" ? setParticipantForm : setAdminForm;
    setter((current) => ({ ...current, [field]: value }));
    setSubmitError("");
  };

  useEffect(() => {
    if (inviteToken) {
      setAdminForm((current) => ({ ...current, inviteToken }));
      setRole("admin");
    }
  }, [inviteToken]);

  useEffect(() => {
    if (role !== "participant") {
      return undefined;
    }

    const keyword = organizationKeyword.trim();
    if (keyword.length < 2 || participantForm.organizationId) {
      setOrganizations([]);
      setOrganizationError("");
      setIsOrganizationLoading(false);
      return undefined;
    }

    let isActive = true;
    const timer = window.setTimeout(async () => {
      setIsOrganizationLoading(true);
      setOrganizationError("");
      try {
        const result = await searchOrganizations(keyword);
        if (isActive) {
          setOrganizations(Array.isArray(result) ? result : []);
        }
      } catch (error) {
        if (isActive) {
          setOrganizations([]);
          setOrganizationError(getApiErrorMessage(error, "학교를 검색하지 못했습니다."));
        }
      } finally {
        if (isActive) {
          setIsOrganizationLoading(false);
        }
      }
    }, 250);

    return () => {
      isActive = false;
      window.clearTimeout(timer);
    };
  }, [organizationKeyword, participantForm.organizationId, role]);

  const selectRole = (nextRole) => {
    setRole(nextRole);
    setSubmitError("");
    setCompletedRole(null);
  };

  const selectOrganization = (organization) => {
    setParticipantForm((current) => ({ ...current, organizationId: organization.id }));
    setOrganizationKeyword(organization.name);
    setOrganizations([]);
    setOrganizationError("");
    setIsOrganizationFocused(false);
  };

  const changeOrganizationKeyword = (value) => {
    setOrganizationKeyword(value);
    setParticipantForm((current) => ({ ...current, organizationId: null }));
    setSubmitError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError("");

    if (form.password !== form.passwordConfirm) {
      setSubmitError("비밀번호 확인이 일치하지 않습니다.");
      return;
    }
    if (role === "participant" && !participantForm.organizationId) {
      setSubmitError("검색 결과에서 학교를 선택해 주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (role === "participant") {
        await signUpParticipant({
          organizationId: participantForm.organizationId,
          name: participantForm.name.trim(),
          email: participantForm.email.trim(),
          password: participantForm.password,
          studentId: optionalValue(participantForm.studentId),
          major: optionalValue(participantForm.major)
        });
      } else {
        await signUpAdmin({
          inviteToken: adminForm.inviteToken.trim(),
          name: adminForm.name.trim(),
          email: adminForm.email.trim(),
          password: adminForm.password,
          department: optionalValue(adminForm.department),
          position: optionalValue(adminForm.position)
        });
      }
      setCompletedRole(role);
    } catch (error) {
      setSubmitError(getApiErrorMessage(error, "회원가입을 완료하지 못했습니다."));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (completedRole) {
    const isAdmin = completedRole === "admin";
    return (
      <main className={styles.shell}>
        <section className={`${styles.panel} ${styles.successPanel}`} aria-labelledby="signup-complete-title">
          <div className={styles.successIcon}>
            <CheckCircle2 size={28} aria-hidden="true" />
          </div>
          <div className={styles.copy}>
            <span>회원가입 완료</span>
            <h1 id="signup-complete-title">{isAdmin ? "관리자 가입 신청을 접수했습니다" : "Trekkey 가입을 완료했습니다"}</h1>
            <p>
              {isAdmin
                ? "최고 관리자의 승인 후 관리자 계정으로 로그인할 수 있습니다. 승인 전에는 로그인이 제한됩니다."
                : "등록한 이메일과 비밀번호로 로그인한 뒤 참가할 대회를 찾아보세요."}
            </p>
          </div>
          <button className={styles.primaryButton} type="button" onClick={() => navigate("/login")}>
            로그인 화면으로 이동
          </button>
        </section>
      </main>
    );
  }

  const organizationListVisible =
    role === "participant" &&
    isOrganizationFocused &&
    !participantForm.organizationId &&
    organizationKeyword.trim().length >= 2;

  return (
    <main className={styles.shell}>
      <section className={styles.panel} aria-labelledby="signup-title">
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
          <span>새 계정 만들기</span>
          <h1 id="signup-title">사용 목적에 맞는 계정을 등록합니다</h1>
          <p>참가자는 학교를 선택해 바로 가입하고, 관리자는 받은 초대 링크로 가입 신청을 진행합니다.</p>
        </div>

        <div className={styles.roleGrid} role="tablist" aria-label="회원가입 유형">
          <button
            className={`${styles.roleCard} ${role === "participant" ? styles.selected : ""}`}
            type="button"
            role="tab"
            aria-selected={role === "participant"}
            onClick={() => selectRole("participant")}
          >
            <UsersRound size={20} aria-hidden="true" />
            <strong>대회 참가자</strong>
            <span>학교 계정으로 대회를 찾고 참가 신청</span>
          </button>
          <button
            className={`${styles.roleCard} ${role === "admin" ? styles.selected : ""}`}
            type="button"
            role="tab"
            aria-selected={role === "admin"}
            onClick={() => selectRole("admin")}
          >
            <ShieldCheck size={20} aria-hidden="true" />
            <strong>관리자</strong>
            <span>초대받은 조직의 대회 운영 계정 신청</span>
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {role === "participant" ? (
            <>
              <div
                className={styles.searchField}
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) {
                    setIsOrganizationFocused(false);
                  }
                }}
              >
                <label>
                  <span>학교</span>
                  <div className={styles.inputWithIcon}>
                    <Search size={16} aria-hidden="true" />
                    <input
                      type="search"
                      role="combobox"
                      aria-autocomplete="list"
                      aria-expanded={organizationListVisible}
                      aria-controls="organization-results"
                      autoComplete="off"
                      placeholder="학교 이름을 두 글자 이상 입력"
                      value={organizationKeyword}
                      onFocus={() => setIsOrganizationFocused(true)}
                      onChange={(event) => changeOrganizationKeyword(event.target.value)}
                      required
                    />
                  </div>
                </label>
                {participantForm.organizationId && (
                  <span className={styles.selectedOrganization}>선택된 학교입니다.</span>
                )}
                {organizationListVisible && (
                  <div className={styles.searchResults} id="organization-results" role="listbox">
                    {isOrganizationLoading && <span className={styles.searchMessage}>학교를 검색하고 있습니다.</span>}
                    {!isOrganizationLoading && organizationError && (
                      <span className={styles.searchError}>{organizationError}</span>
                    )}
                    {!isOrganizationLoading && !organizationError && organizations.length === 0 && (
                      <span className={styles.searchMessage}>검색 결과가 없습니다.</span>
                    )}
                    {!isOrganizationLoading && organizations.map((organization) => (
                      <button
                        key={organization.id}
                        type="button"
                        role="option"
                        aria-selected="false"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => selectOrganization(organization)}
                      >
                        <GraduationCap size={16} aria-hidden="true" />
                        {organization.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className={styles.fieldRow}>
                <label>
                  <span>이름</span>
                  <input
                    value={participantForm.name}
                    onChange={(event) => updateForm("name", event.target.value)}
                    autoComplete="name"
                    required
                  />
                </label>
                <label>
                  <span>이메일</span>
                  <input
                    type="email"
                    value={participantForm.email}
                    onChange={(event) => updateForm("email", event.target.value)}
                    autoComplete="email"
                    required
                  />
                </label>
              </div>
              <div className={styles.fieldRow}>
                <label>
                  <span>학번 <small>선택</small></span>
                  <input
                    value={participantForm.studentId}
                    onChange={(event) => updateForm("studentId", event.target.value)}
                    autoComplete="off"
                  />
                </label>
                <label>
                  <span>전공 <small>선택</small></span>
                  <input
                    value={participantForm.major}
                    onChange={(event) => updateForm("major", event.target.value)}
                    autoComplete="organization-title"
                  />
                </label>
              </div>
            </>
          ) : (
            <>
              <label>
                <span>관리자 초대 토큰</span>
                <div className={styles.inputWithIcon}>
                  <KeyRound size={16} aria-hidden="true" />
                  <input
                    value={adminForm.inviteToken}
                    onChange={(event) => updateForm("inviteToken", event.target.value)}
                    placeholder="초대 링크로 접속하면 자동으로 입력됩니다"
                    autoComplete="off"
                    required
                  />
                </div>
              </label>
              <p className={styles.fieldHint}>초대받은 이메일과 아래 이메일이 일치해야 가입할 수 있습니다.</p>
              <div className={styles.fieldRow}>
                <label>
                  <span>이름</span>
                  <input
                    value={adminForm.name}
                    onChange={(event) => updateForm("name", event.target.value)}
                    autoComplete="name"
                    required
                  />
                </label>
                <label>
                  <span>이메일</span>
                  <input
                    type="email"
                    value={adminForm.email}
                    onChange={(event) => updateForm("email", event.target.value)}
                    autoComplete="email"
                    required
                  />
                </label>
              </div>
              <div className={styles.fieldRow}>
                <label>
                  <span>소속 부서 <small>선택</small></span>
                  <input
                    value={adminForm.department}
                    onChange={(event) => updateForm("department", event.target.value)}
                    autoComplete="organization"
                  />
                </label>
                <label>
                  <span>직책 <small>선택</small></span>
                  <input
                    value={adminForm.position}
                    onChange={(event) => updateForm("position", event.target.value)}
                    autoComplete="organization-title"
                  />
                </label>
              </div>
            </>
          )}

          <div className={styles.fieldRow}>
            <label>
              <span>비밀번호</span>
              <input
                type="password"
                value={form.password}
                onChange={(event) => updateForm("password", event.target.value)}
                autoComplete="new-password"
                minLength={role === "admin" ? 10 : 8}
                required
              />
            </label>
            <label>
              <span>비밀번호 확인</span>
              <input
                type="password"
                value={form.passwordConfirm}
                onChange={(event) => updateForm("passwordConfirm", event.target.value)}
                autoComplete="new-password"
                minLength={role === "admin" ? 10 : 8}
                required
              />
            </label>
          </div>
          <p className={styles.fieldHint}>
            {role === "admin" ? "관리자 비밀번호는 10자 이상 입력해 주세요." : "비밀번호는 8자 이상 입력해 주세요."}
          </p>

          {submitError && <p className={styles.submitError} role="alert">{submitError}</p>}

          <div className={styles.actions}>
            <button className={styles.secondaryButton} type="button" onClick={() => navigate("/login")}>
              <ArrowLeft size={17} aria-hidden="true" />
              로그인으로 돌아가기
            </button>
            <button className={styles.primaryButton} type="submit" disabled={isSubmitting}>
              <UserPlus size={17} aria-hidden="true" />
              {isSubmitting
                ? "가입 처리 중..."
                : role === "admin"
                  ? "관리자 가입 신청"
                  : "참가자 회원가입"}
            </button>
          </div>
        </form>
      </section>

      <aside className={styles.sidePanel} aria-label="회원가입 안내">
        <div>
          <GraduationCap size={22} aria-hidden="true" />
          <strong>참가자 가입</strong>
          <span>활성화된 학교를 검색해 선택하면 가입 직후 대회 조회와 참가 신청을 시작할 수 있습니다.</span>
        </div>
        <div>
          <Mail size={22} aria-hidden="true" />
          <strong>관리자 초대</strong>
          <span>조직에서 발급한 초대 링크와 초대받은 이메일이 있어야 관리자 가입을 신청할 수 있습니다.</span>
        </div>
        <div>
          <ShieldCheck size={22} aria-hidden="true" />
          <strong>관리자 승인</strong>
          <span>관리자 계정은 가입 신청 후 최고 관리자의 승인이 완료되어야 로그인할 수 있습니다.</span>
        </div>
      </aside>
    </main>
  );
}
