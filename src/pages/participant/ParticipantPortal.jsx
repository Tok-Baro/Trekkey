import React, { useMemo, useState } from "react";
import { CheckCircle2, Clock3, Layers3, LogOut, PanelsTopLeft, Plus, Search, Send, Sparkles, UserRound } from "lucide-react";
import { EmptyState, SegmentedControl, StatusBadge } from "../../components/common/CommonUi.jsx";
import { ModalFrame } from "../../components/modals/ModalFrame.jsx";
import { getParticipantKey } from "../../lib/auth.js";
import { findParticipantApplication, getContestTitle, getContestWithPublicFields, isContestApplyOpen } from "../../lib/contest.js";
import styles from "./ParticipantPortal.module.scss";

export function ParticipantPortal({ session, contests, teams, onApplyContest, onOpenPublicPage, onLogout }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("접수중");
  const [applyingContest, setApplyingContest] = useState(null);
  const allContests = useMemo(() => contests.map(getContestWithPublicFields), [contests]);
  const myApplications = useMemo(
    () =>
      teams.filter(
        (team) =>
          team.applicantId === getParticipantKey(session) ||
          team.applicantEmail === session.email ||
          team.leader === session.name
      ),
    [session, teams]
  );
  const visibleContests = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return allContests.filter((contest) => {
      const matchesStatus =
        statusFilter === "전체" ||
        contest.status === statusFilter ||
        (statusFilter === "종료" && ["심사중", "수상확정"].includes(contest.status));
      const searchable = `${contest.title} ${contest.department} ${contest.tags ?? ""}`.toLowerCase();
      return matchesStatus && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [allContests, query, statusFilter]);
  const openCount = allContests.filter(isContestApplyOpen).length;
  const approvedCount = myApplications.filter((application) => application.status === "승인").length;
  const openContests = useMemo(() => allContests.filter(isContestApplyOpen), [allContests]);
  const urgentContest = useMemo(
    () =>
      [...openContests]
        .map((contest) => ({ contest, daysLeft: getDaysUntilDeadline(contest.submissionDue) }))
        .filter((item) => item.daysLeft !== null && item.daysLeft >= 0)
        .sort((a, b) => a.daysLeft - b.daysLeft)[0],
    [openContests]
  );
  const recommendedContest = useMemo(
    () => openContests.find((contest) => !findParticipantApplication(teams, contest.id, session)) ?? openContests[0],
    [openContests, session, teams]
  );
  const latestApplication = myApplications[0];

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <div className={styles.brandMark}>
            <Layers3 size={23} aria-hidden="true" />
          </div>
          <div>
            <strong>Trekkey</strong>
            <span>참가자 포털</span>
          </div>
        </div>
        <div className={styles.account}>
          <span>{session.name}</span>
          <button className={styles.secondaryButton} type="button" onClick={onLogout}>
            <LogOut size={17} aria-hidden="true" />
            로그아웃
          </button>
        </div>
      </header>

      <main className={styles.mainShell}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <h1>참가 가능한 대회</h1>
            <div className={styles.heroPills} aria-label="참가 현황 요약">
              <span>접수중 {openCount}개</span>
              <span>내 신청 {myApplications.length}건</span>
              <span>승인 {approvedCount}건</span>
            </div>
          </div>
          <div className={styles.heroInsights} aria-label="참가자 요약">
            <HeroInsight
              icon={Clock3}
              label="마감 임박"
              title={urgentContest ? urgentContest.contest.title : "접수 일정 없음"}
              meta={urgentContest ? `${getDeadlineLabel(urgentContest.contest.submissionDue)} · 제출 ${urgentContest.contest.submissionDue}` : "열린 대회가 생기면 표시됩니다"}
            />
            <HeroInsight
              icon={CheckCircle2}
              label="내 신청"
              title={latestApplication ? getContestTitle(latestApplication.contestId, contests) : "아직 신청 전"}
              meta={latestApplication ? `${latestApplication.status} · ${latestApplication.name}` : "관심 있는 대회를 신청해 보세요"}
            />
            <HeroInsight
              icon={Sparkles}
              label="추천 공고"
              title={recommendedContest ? recommendedContest.title : "공개 예정"}
              meta={recommendedContest ? recommendedContest.department : "새 공고가 올라오면 표시됩니다"}
            />
          </div>
        </section>

        <div className={styles.layout}>
          <section className={styles.contestPanel}>
            <div className={styles.sectionHead}>
              <strong>대회 목록</strong>
              <span>{visibleContests.length}개</span>
            </div>
            <div className={styles.toolbar}>
              <label className={styles.searchBox}>
                <Search size={17} aria-hidden="true" />
                <input
                  type="search"
                  placeholder="대회명 검색"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <SegmentedControl
                options={["접수중", "전체", "종료"]}
                value={statusFilter}
                onChange={setStatusFilter}
              />
            </div>

            <div className={styles.contestGrid}>
              {visibleContests.map((contest) => {
                const application = findParticipantApplication(teams, contest.id, session);
                const canApply = isContestApplyOpen(contest) && !application;
                const deadlineLabel = getDeadlineLabel(contest.submissionDue);
                const applyLabel = application ? "완료" : isContestApplyOpen(contest) ? "신청" : "불가";

                return (
                  <article className={styles.contestCard} key={contest.id}>
                    <div className={styles.poster}>
                      {contest.posterUrl ? (
                        <img src={contest.posterUrl} alt={`${contest.title} 포스터`} />
                      ) : (
                        <div>
                          <PanelsTopLeft size={24} aria-hidden="true" />
                          <span>{contest.department}</span>
                        </div>
                      )}
                    </div>
                    <div className={styles.cardBody}>
                      <div className={styles.cardHead}>
                        <StatusBadge status={contest.status} />
                        <span className={styles.deadlineBadge}>{deadlineLabel}</span>
                      </div>
                      <h2>{contest.title}</h2>
                      {application && <span className={styles.inlineOk}>내 신청 {application.status}</span>}
                      <dl className={styles.cardMeta}>
                        <div>
                          <dt>주관</dt>
                          <dd>{contest.department}</dd>
                        </div>
                        <div>
                          <dt>제출</dt>
                          <dd>{contest.submissionDue}</dd>
                        </div>
                        <div>
                          <dt>방식</dt>
                          <dd>{contest.type}</dd>
                        </div>
                      </dl>
                      <div className={styles.cardActions}>
                        <button className={styles.secondaryButton} type="button" onClick={() => onOpenPublicPage(contest.id)}>
                          <PanelsTopLeft size={17} aria-hidden="true" />
                          공고
                        </button>
                        <button
                          className={styles.primaryButton}
                          type="button"
                          disabled={!canApply}
                          onClick={() => setApplyingContest(contest)}
                        >
                          <Plus size={17} aria-hidden="true" />
                          {applyLabel}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
              {visibleContests.length === 0 && (
                <EmptyState title="표시할 대회가 없습니다" description="검색어나 상태 필터를 조정해 주세요." />
              )}
            </div>
          </section>

          <aside className={styles.side}>
            <section className={styles.profile}>
              <div className={styles.avatar}>
                <UserRound size={24} aria-hidden="true" />
              </div>
              <div>
                <strong>{session.name}</strong>
                <span>{session.studentId} · {session.major}</span>
              </div>
            </section>

            <section className={styles.applications}>
              <div className={styles.sideHead}>
                <strong>내 신청</strong>
                <span>{myApplications.length}건</span>
              </div>
              <div className={styles.applicationList}>
                {myApplications.map((application) => (
                  <article className={styles.application} key={application.id}>
                    <div>
                      <strong>{getContestTitle(application.contestId, contests)}</strong>
                      <span>{application.name} · {application.members}명</span>
                    </div>
                    <StatusBadge status={application.status} />
                  </article>
                ))}
                {myApplications.length === 0 && (
                  <EmptyState title="신청 없음" description="접수중 대회에서 신청하세요." />
                )}
              </div>
            </section>
          </aside>
        </div>
      </main>

      {applyingContest && (
        <ModalFrame
          title="참가 신청"
          description={applyingContest.title}
          onClose={() => setApplyingContest(null)}
          size="wide"
        >
          <ContestApplicationForm
            contest={applyingContest}
            session={session}
            onClose={() => setApplyingContest(null)}
            onSubmit={(form) => {
              if (onApplyContest(form)) {
                setApplyingContest(null);
              }
            }}
          />
        </ModalFrame>
      )}
    </div>
  );
}

function HeroInsight({ icon: Icon, label, title, meta }) {
  return (
    <article className={styles.heroInsight}>
      <div className={styles.heroInsightIcon}>
        <Icon size={16} aria-hidden="true" />
      </div>
      <div>
        <span>{label}</span>
        <strong>{title}</strong>
        <small>{meta}</small>
      </div>
    </article>
  );
}

function getDeadlineLabel(submissionDue) {
  const diffDays = getDaysUntilDeadline(submissionDue);

  if (diffDays === null) {
    return submissionDue;
  }

  if (diffDays < 0) {
    return "마감";
  }

  if (diffDays === 0) {
    return "오늘 마감";
  }

  return `D-${diffDays}`;
}

function getDaysUntilDeadline(submissionDue) {
  const match = /^(\d{1,2})\.(\d{1,2})$/.exec(submissionDue ?? "");

  if (!match) {
    return null;
  }

  const [, month, day] = match;
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const deadline = new Date(today.getFullYear(), Number(month) - 1, Number(day));
  return Math.ceil((deadline.getTime() - startOfToday.getTime()) / 86400000);
}

function ContestApplicationForm({ contest, session, onSubmit, onClose }) {
  const maxMembers = contest.type === "개인전" ? 1 : 5;
  const [form, setForm] = useState({
    contestId: contest.id,
    teamName: contest.type === "개인전" ? session.name : `${session.name} 팀`,
    leader: session.name,
    major: session.major,
    members: contest.type === "개인전" ? 1 : 3,
    email: session.email,
    phone: "010-1234-5678",
    motivation: "대회 주제에 맞는 아이디어를 구체적인 결과물로 발전시키고 싶습니다."
  });
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  return (
    <form
      className={styles.formStack}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(form);
      }}
    >
      <div className={styles.fieldRow}>
        <label>
          <span>{contest.type === "개인전" ? "참가자명" : "팀명"}</span>
          <input value={form.teamName} onChange={(event) => update("teamName", event.target.value)} required />
        </label>
        <label>
          <span>대표자</span>
          <input value={form.leader} onChange={(event) => update("leader", event.target.value)} required />
        </label>
      </div>
      <div className={styles.fieldRow}>
        <label>
          <span>소속</span>
          <input value={form.major} onChange={(event) => update("major", event.target.value)} required />
        </label>
        <label>
          <span>참가 인원</span>
          <input
            type="number"
            min="1"
            max={maxMembers}
            value={form.members}
            onChange={(event) => update("members", event.target.value)}
            readOnly={contest.type === "개인전"}
            required
          />
        </label>
      </div>
      <div className={styles.fieldRow}>
        <label>
          <span>이메일</span>
          <input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} required />
        </label>
        <label>
          <span>연락처</span>
          <input value={form.phone} onChange={(event) => update("phone", event.target.value)} required />
        </label>
      </div>
      <label>
        <span>지원 동기</span>
        <textarea value={form.motivation} onChange={(event) => update("motivation", event.target.value)} required />
      </label>
      <div className={styles.modalActions}>
        <button className={styles.secondaryButton} type="button" onClick={onClose}>
          취소
        </button>
        <button className={styles.primaryButton} type="submit">
          <Send size={17} aria-hidden="true" />
          신청 제출
        </button>
      </div>
    </form>
  );
}
