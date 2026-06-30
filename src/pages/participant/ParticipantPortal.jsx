import React, { useMemo, useState } from "react";
import { CheckCircle2, Clock3, Layers3, LogOut, PanelsTopLeft, Search, Sparkles, UserRound } from "lucide-react";
import { EmptyState, SegmentedControl, StatusBadge } from "../../components/common/CommonUi.jsx";
import { getParticipantKey } from "../../lib/auth.js";
import { findParticipantApplication, getContestTitle, getContestWithPublicFields, isContestApplyOpen } from "../../lib/contest.js";
import styles from "./ParticipantPortal.module.scss";

export function ParticipantPortal({ session, contests, teams, onOpenPublicPage, onLogout }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("접수중");
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
                const deadlineLabel = getDeadlineLabel(contest.submissionDue);
                const tags = String(contest.tags || "")
                  .split(",")
                  .map((tag) => tag.trim())
                  .filter(Boolean)
                  .slice(0, 3);

                return (
                  <button className={styles.contestCard} key={contest.id} type="button" onClick={() => onOpenPublicPage(contest.id)}>
                    <div className={styles.poster}>
                      {contest.posterUrl ? (
                        <img src={contest.posterUrl} alt={`${contest.title} 포스터`} />
                      ) : (
                        <div>
                          <PanelsTopLeft size={24} aria-hidden="true" />
                          <span>{contest.department}</span>
                        </div>
                      )}
                      <span className={styles.posterStatus}>
                        <StatusBadge status={contest.status} />
                      </span>
                    </div>
                    <div className={styles.cardBody}>
                      <div className={styles.cardHead}>
                        <span className={styles.deadlineBadge}>{deadlineLabel}</span>
                        <div className={styles.cardHeadRight}>
                          {tags.length > 0 && (
                            <div className={styles.cardTags}>
                              {tags.map((tag) => (
                                <span key={tag}>#{tag}</span>
                              ))}
                            </div>
                          )}
                          {application && <span className={styles.inlineOk}>내 신청 {application.status}</span>}
                        </div>
                      </div>
                      <h2>{contest.title}</h2>
                      <p>{contest.summary}</p>
                      <div className={styles.cardMeta} aria-label="대회 정보">
                        <span>{contest.department}</span>
                        <span>{contest.submissionDue}</span>
                      </div>
                    </div>
                  </button>
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
