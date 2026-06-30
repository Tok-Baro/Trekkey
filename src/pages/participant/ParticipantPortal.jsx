import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Layers3, LogOut, PanelsTopLeft, Search, UserRound } from "lucide-react";
import { EmptyState, SegmentedControl, StatusBadge } from "../../components/common/CommonUi.jsx";
import { getParticipantKey } from "../../lib/auth.js";
import { findParticipantApplication, getContestTitle, getContestWithPublicFields, isContestApplyOpen } from "../../lib/contest.js";
import styles from "./ParticipantPortal.module.scss";

export function ParticipantPortal({ session, contests, teams, onOpenPublicPage, onLogout }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("접수중");
  const allContests = useMemo(() => contests.map(getContestWithPublicFields), [contests]);
  const featuredContests = useMemo(() => {
    const open = allContests.filter(isContestApplyOpen);
    return (open.length ? open : allContests).slice(0, 6);
  }, [allContests]);
  const [activeSlide, setActiveSlide] = useState(0);
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

  useEffect(() => {
    if (activeSlide >= featuredContests.length) {
      setActiveSlide(0);
    }
  }, [activeSlide, featuredContests.length]);

  useEffect(() => {
    if (featuredContests.length < 2) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % featuredContests.length);
    }, 6000);

    return () => window.clearInterval(timer);
  }, [featuredContests.length]);

  const moveSlide = (direction) => {
    if (featuredContests.length < 2) {
      return;
    }

    setActiveSlide((current) => (current + direction + featuredContests.length) % featuredContests.length);
  };

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
        {featuredContests.length > 0 && (
          <section className={styles.posterCarousel} aria-label="주요 대회 포스터">
            <div className={styles.carouselViewport}>
              <div
                className={styles.carouselTrack}
                style={{ transform: `translateX(-${activeSlide * 100}%)` }}
              >
                {featuredContests.map((contest) => {
                  const deadlineLabel = getDeadlineLabel(contest.submissionDue);
                  const tags = String(contest.tags || "")
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter(Boolean)
                    .slice(0, 3);

                  return (
                    <button
                      className={styles.carouselSlide}
                      key={contest.id}
                      type="button"
                      onClick={() => onOpenPublicPage(contest.id)}
                    >
                      <div className={styles.carouselMedia}>
                        {contest.posterUrl ? (
                          <>
                            <img
                              className={styles.carouselBackdrop}
                              src={contest.posterUrl}
                              alt=""
                              aria-hidden="true"
                            />
                            <img
                              className={styles.carouselPosterImage}
                              src={contest.posterUrl}
                              alt={`${contest.title} 포스터`}
                            />
                          </>
                        ) : (
                          <div className={styles.carouselFallback}>
                            <span>{contest.department}</span>
                            <strong>{contest.title}</strong>
                            <small>{contest.applicationPeriod}</small>
                          </div>
                        )}
                      </div>
                      <div className={styles.carouselShade} />
                      <div className={styles.carouselContent}>
                        <div className={styles.carouselBadges}>
                          <StatusBadge status={contest.status} />
                          <span>{deadlineLabel}</span>
                        </div>
                        <h1>{contest.title}</h1>
                        <p>{contest.summary}</p>
                        <div className={styles.carouselMeta}>
                          <span>{contest.department}</span>
                          <span>제출 {contest.submissionDue}</span>
                          {tags.map((tag) => (
                            <span key={tag}>#{tag}</span>
                          ))}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              {featuredContests.length > 1 && (
                <>
                  <button
                    className={`${styles.carouselNav} ${styles.carouselPrev}`}
                    type="button"
                    aria-label="이전 대회"
                    onClick={() => moveSlide(-1)}
                  >
                    <ChevronLeft size={20} aria-hidden="true" />
                  </button>
                  <button
                    className={`${styles.carouselNav} ${styles.carouselNext}`}
                    type="button"
                    aria-label="다음 대회"
                    onClick={() => moveSlide(1)}
                  >
                    <ChevronRight size={20} aria-hidden="true" />
                  </button>
                  <div className={styles.carouselDots} aria-label="대회 포스터 선택">
                    {featuredContests.map((contest, index) => (
                      <button
                        className={index === activeSlide ? styles.carouselDotActive : ""}
                        key={contest.id}
                        type="button"
                        aria-label={`${index + 1}번 포스터 보기`}
                        aria-current={index === activeSlide}
                        onClick={() => setActiveSlide(index)}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </section>
        )}

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
