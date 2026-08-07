import React, { useMemo, useState } from "react";
import {
  Ban,
  Check,
  Clipboard,
  Clock3,
  Link2,
  MailPlus,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  UserRoundCheck,
  X
} from "lucide-react";
import { getApiErrorMessage } from "../../api/backendApi.js";
import { EmptyState, PanelHeader } from "../../components/common/CommonUi.jsx";
import { useRootAdminData } from "../../hooks/useRootAdminData.js";
import styles from "./RootAdminPage.module.scss";

const invitationStatus = {
  ISSUED: { label: "사용 대기", tone: "issued" },
  USED: { label: "사용 완료", tone: "used" },
  EXPIRED: { label: "만료", tone: "expired" },
  REVOKED: { label: "철회", tone: "revoked" }
};

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
});

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : dateFormatter.format(date);
}

function InvitationBadge({ status }) {
  const resolved = invitationStatus[status] ?? { label: status, tone: "neutral" };
  return (
    <span className={`${styles.statusBadge} ${styles[resolved.tone] ?? ""}`}>
      {resolved.label}
    </span>
  );
}

export function RootAdminPage({ session, onNotify }) {
  const isRootAdmin = session?.serverRole === "ROOT_ADMIN";
  const {
    invitations,
    pendingAdmins,
    isLoading,
    error,
    reload,
    createInvitation,
    revokeInvitation,
    decideApproval
  } = useRootAdminData({ enabled: isRootAdmin });
  const [email, setEmail] = useState("");
  const [latestInvite, setLatestInvite] = useState(null);
  const [busyAction, setBusyAction] = useState("");
  const [feedback, setFeedback] = useState(null);

  const summary = useMemo(() => ({
    waitingInvitations: invitations.filter((invitation) => invitation.status === "ISSUED").length,
    completedInvitations: invitations.filter((invitation) => invitation.status === "USED").length,
    pendingApprovals: pendingAdmins.length
  }), [invitations, pendingAdmins]);

  const announce = (message, tone = "success") => {
    setFeedback({ message, tone });
    onNotify?.(message);
  };

  const handleCreateInvitation = async (event) => {
    event.preventDefault();
    const normalizedEmail = email.trim();
    if (!normalizedEmail || busyAction) {
      return;
    }

    setBusyAction("create");
    setFeedback(null);
    try {
      const created = await createInvitation(normalizedEmail);
      setLatestInvite(created);
      setEmail("");
      announce("관리자 초대를 발급했습니다. 초대 URL을 지금 복사해 전달해 주세요.");
    } catch (requestError) {
      announce(getApiErrorMessage(requestError, "관리자 초대를 발급하지 못했습니다."), "error");
    } finally {
      setBusyAction("");
    }
  };

  const handleCopyInviteUrl = async () => {
    if (!latestInvite?.inviteUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(latestInvite.inviteUrl);
      announce("초대 URL을 복사했습니다.");
    } catch {
      announce("자동 복사에 실패했습니다. 입력창의 URL을 직접 복사해 주세요.", "error");
    }
  };

  const handleRevokeInvitation = async (invitation) => {
    if (busyAction) {
      return;
    }

    if (!window.confirm(`${invitation.email}에 발급한 초대를 철회할까요?`)) {
      return;
    }

    const actionKey = `revoke:${invitation.id}`;
    setBusyAction(actionKey);
    setFeedback(null);
    try {
      await revokeInvitation(invitation.id);
      if (latestInvite?.id === invitation.id) {
        setLatestInvite(null);
      }
      announce("관리자 초대를 철회했습니다.");
    } catch (requestError) {
      announce(getApiErrorMessage(requestError, "관리자 초대를 철회하지 못했습니다."), "error");
    } finally {
      setBusyAction("");
    }
  };

  const handleApproval = async (admin, approve) => {
    if (busyAction) {
      return;
    }

    const decisionLabel = approve ? "승인" : "거절";
    if (!approve && !window.confirm(`${admin.name} 관리자의 가입을 거절할까요?`)) {
      return;
    }

    const actionKey = `approval:${admin.userId}`;
    setBusyAction(actionKey);
    setFeedback(null);
    try {
      await decideApproval(admin.userId, approve);
      announce(`${admin.name} 관리자의 가입을 ${decisionLabel}했습니다.`);
    } catch (requestError) {
      announce(getApiErrorMessage(requestError, `관리자 가입을 ${decisionLabel}하지 못했습니다.`), "error");
    } finally {
      setBusyAction("");
    }
  };

  if (!isRootAdmin) {
    return (
      <section className={styles.accessDenied}>
        <ShieldCheck size={28} aria-hidden="true" />
        <h2>학교 대표 관리자 전용 화면입니다</h2>
        <p>일반 관리자는 대회 운영 기능만 이용할 수 있습니다.</p>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className={styles.loadingState} aria-live="polite">
        <RefreshCw size={24} aria-hidden="true" />
        <strong>관리자 계정 정보를 불러오는 중입니다</strong>
      </section>
    );
  }

  if (error) {
    return (
      <section className={styles.accessDenied}>
        <ShieldCheck size={28} aria-hidden="true" />
        <h2>관리자 계정 정보를 불러오지 못했습니다</h2>
        <p>{getApiErrorMessage(error)}</p>
        <button className="primary-button" type="button" onClick={() => reload().catch(() => undefined)}>
          <RefreshCw size={16} aria-hidden="true" />
          다시 불러오기
        </button>
      </section>
    );
  }

  return (
    <div className={styles.layout}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.heroIcon}><ShieldCheck size={22} aria-hidden="true" /></span>
          <div>
            <span className={styles.eyebrow}>ROOT ADMIN</span>
            <h2>관리자 계정 관리</h2>
            <p>{session.name}님이 속한 조직의 관리자 초대와 가입 승인을 관리합니다.</p>
          </div>
        </div>
        <dl className={styles.summary}>
          <div>
            <dt>승인 대기</dt>
            <dd>{summary.pendingApprovals}명</dd>
          </div>
          <div>
            <dt>사용 가능한 초대</dt>
            <dd>{summary.waitingInvitations}건</dd>
          </div>
          <div>
            <dt>가입 완료</dt>
            <dd>{summary.completedInvitations}건</dd>
          </div>
        </dl>
      </section>

      {feedback && (
        <div className={`${styles.feedback} ${feedback.tone === "error" ? styles.feedbackError : ""}`} role="status">
          {feedback.tone === "error" ? <X size={16} aria-hidden="true" /> : <Check size={16} aria-hidden="true" />}
          <span>{feedback.message}</span>
          <button type="button" aria-label="알림 닫기" onClick={() => setFeedback(null)}>
            <X size={15} aria-hidden="true" />
          </button>
        </div>
      )}

      <section className={styles.invitePanel}>
        <PanelHeader title="관리자 초대 발급" />
        <p className={styles.panelDescription}>가입할 관리자 이메일로 7일 동안 유효한 초대 URL을 발급합니다.</p>
        <form className={styles.inviteForm} onSubmit={handleCreateInvitation}>
          <label>
            <span>관리자 이메일</span>
            <div className={styles.inputWithIcon}>
              <MailPlus size={17} aria-hidden="true" />
              <input
                type="email"
                placeholder="admin@campus.ac.kr"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={Boolean(busyAction)}
                required
              />
            </div>
          </label>
          <button className="primary-button" type="submit" disabled={Boolean(busyAction)}>
            <MailPlus size={16} aria-hidden="true" />
            {busyAction === "create" ? "발급 중..." : "초대 발급"}
          </button>
        </form>

        {latestInvite?.inviteUrl && (
          <div className={styles.inviteResult}>
            <div>
              <Link2 size={17} aria-hidden="true" />
              <div>
                <strong>초대 URL이 발급되었습니다</strong>
                <span>보안을 위해 이 URL은 지금 응답에서만 확인할 수 있습니다.</span>
              </div>
            </div>
            <div className={styles.copyRow}>
              <input aria-label="발급된 관리자 초대 URL" readOnly value={latestInvite.inviteUrl} onFocus={(event) => event.target.select()} />
              <button className="secondary-button" type="button" onClick={handleCopyInviteUrl}>
                <Clipboard size={16} aria-hidden="true" />
                복사
              </button>
            </div>
          </div>
        )}
      </section>

      <section className={styles.approvalPanel}>
        <PanelHeader
          title="가입 승인 대기"
          action={<span className={styles.countBadge}>{pendingAdmins.length}명</span>}
        />
        <p className={styles.panelDescription}>초대 URL로 가입한 관리자를 확인한 뒤 승인하거나 거절합니다.</p>
        <div className={styles.approvalList}>
          {pendingAdmins.map((admin) => {
            const isBusy = busyAction === `approval:${admin.userId}`;
            return (
              <article className={styles.approvalCard} key={admin.userId}>
                <div className={styles.adminIdentity}>
                  <span><UserRoundCheck size={18} aria-hidden="true" /></span>
                  <div>
                    <strong>{admin.name}</strong>
                    <small>{admin.email}</small>
                  </div>
                </div>
                <dl className={styles.adminMeta}>
                  <div><dt>부서</dt><dd>{admin.department || "-"}</dd></div>
                  <div><dt>직위</dt><dd>{admin.position || "-"}</dd></div>
                  <div><dt>신청일</dt><dd>{formatDate(admin.appliedAt)}</dd></div>
                </dl>
                <div className={styles.approvalActions}>
                  <button className={styles.rejectButton} type="button" disabled={Boolean(busyAction)} onClick={() => handleApproval(admin, false)}>
                    <X size={15} aria-hidden="true" />
                    거절
                  </button>
                  <button className="primary-button" type="button" disabled={Boolean(busyAction)} onClick={() => handleApproval(admin, true)}>
                    <UserCheck size={16} aria-hidden="true" />
                    {isBusy ? "처리 중..." : "승인"}
                  </button>
                </div>
              </article>
            );
          })}
          {pendingAdmins.length === 0 && (
            <EmptyState title="승인 대기 중인 관리자가 없습니다" description="새 가입 요청이 들어오면 이곳에서 확인할 수 있습니다." />
          )}
        </div>
      </section>

      <section className={styles.historyPanel}>
        <PanelHeader
          title="초대 발급 내역"
          action={
            <button className={styles.refreshButton} type="button" disabled={Boolean(busyAction)} onClick={() => reload().catch(() => undefined)}>
              <RefreshCw size={15} aria-hidden="true" />
              새로고침
            </button>
          }
        />
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>이메일</th>
                <th>상태</th>
                <th>발급일</th>
                <th>만료일</th>
                <th aria-label="작업" />
              </tr>
            </thead>
            <tbody>
              {invitations.map((invitation) => {
                const isBusy = busyAction === `revoke:${invitation.id}`;
                return (
                  <tr key={invitation.id}>
                    <td data-label="이메일"><strong>{invitation.email}</strong></td>
                    <td data-label="상태"><InvitationBadge status={invitation.status} /></td>
                    <td data-label="발급일">{formatDate(invitation.createdAt)}</td>
                    <td data-label="만료일">{formatDate(invitation.expiresAt)}</td>
                    <td data-label="작업">
                      {invitation.status === "ISSUED" ? (
                        <button className={styles.revokeButton} type="button" disabled={Boolean(busyAction)} onClick={() => handleRevokeInvitation(invitation)}>
                          <Ban size={15} aria-hidden="true" />
                          {isBusy ? "처리 중" : "철회"}
                        </button>
                      ) : <span className={styles.noAction}>-</span>}
                    </td>
                  </tr>
                );
              })}
              {invitations.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <EmptyState title="발급한 관리자 초대가 없습니다" description="상단에서 관리자 이메일을 입력해 첫 초대를 발급해 주세요." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className={styles.historyNote}>
          <Clock3 size={15} aria-hidden="true" />
          <span>발급된 초대는 7일 후 자동 만료되며, 사용 전에는 언제든 철회할 수 있습니다.</span>
        </div>
      </section>
    </div>
  );
}
