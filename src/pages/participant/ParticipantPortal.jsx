import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileArchive,
  History,
  Eye,
  Heart,
  IdCard,
  Layers3,
  LogOut,
  Menu,
  PanelsTopLeft,
  Pause,
  Pencil,
  Play,
  Search,
  Send,
  Star,
  Trophy,
  Upload,
  UserRound,
  UsersRound,
  X
} from "lucide-react";
import { AppFooter } from "../../components/common/AppFooter.jsx";
import { EmptyState, SegmentedControl, StatusBadge } from "../../components/common/CommonUi.jsx";
import { getParticipantKey } from "../../lib/auth.js";
import {
  findParticipantApplication,
  getContestReactionKey,
  getContestTitle,
  getContestWithPublicFields,
  isContestApplyOpen
} from "../../lib/contest.js";
import {
  createSubmissionFileMeta,
  formatFileSize,
  getSubmissionFileCount,
  getSubmissionFileSummary,
  SUBMISSION_FILE_ACCEPT
} from "../../lib/submissionFiles.js";
import styles from "./ParticipantPortal.module.scss";

const portalTabs = [
  { id: "discover", label: "대회 찾기", icon: Search },
  { id: "applications", label: "내 신청", icon: ClipboardList },
  { id: "submissions", label: "제출물", icon: FileArchive },
  { id: "teams", label: "팀 관리", icon: UsersRound },
  { id: "results", label: "결과", icon: Trophy },
  { id: "activity", label: "활동 이력", icon: History },
  { id: "profile", label: "마이페이지", icon: IdCard }
];
const sidebarTabs = portalTabs.filter((tab) => tab.id !== "profile");

function formatEngagementCount(value) {
  const count = Number(value) || 0;

  if (count >= 10000) {
    return `${(count / 10000).toFixed(count >= 100000 ? 0 : 1)}만`;
  }

  if (count >= 1000) {
    return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}천`;
  }

  return String(count);
}

export function ParticipantPortal({
  session,
  contests,
  teams,
  submissions = [],
  awardCandidates = [],
  activeView = "discover",
  onOpenPublicPage,
  onToggleLike,
  onNavigate,
  onUpdateApplication,
  onSubmitSubmission,
  onLogout
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("접수중");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isCarouselPaused, setIsCarouselPaused] = useState(false);
  const [isCarouselHovered, setIsCarouselHovered] = useState(false);
  const [selectedApplicationId, setSelectedApplicationId] = useState("");
  const [editingApplicationId, setEditingApplicationId] = useState("");
  const [submissionTargetId, setSubmissionTargetId] = useState("");
  const notificationRef = useRef(null);
  const allContests = useMemo(() => contests.map(getContestWithPublicFields), [contests]);
  const featuredContests = useMemo(() => {
    const open = allContests.filter(isContestApplyOpen);
    return (open.length ? open : allContests).slice(0, 6);
  }, [allContests]);
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
  const applicationRecords = useMemo(
    () =>
      myApplications
        .map((team) => {
          const contest = allContests.find((item) => item.id === team.contestId);
          const submission = submissions.find((item) => item.contestId === team.contestId && item.team === team.name);
          const award = awardCandidates.find((item) => item.contestId === team.contestId && item.team === team.name);

          if (!contest) {
            return null;
          }

          return {
            id: team.id,
            team,
            contest,
            submission,
            award,
            deadlineMeta: getDeadlineMeta(contest.submissionDue)
          };
        })
        .filter(Boolean),
    [allContests, awardCandidates, myApplications, submissions]
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
  const selectedRecord =
    applicationRecords.find((record) => record.id === selectedApplicationId) ?? applicationRecords[0] ?? null;
  const notifications = useMemo(() => buildParticipantNotifications(applicationRecords), [applicationRecords]);
  const activityItems = useMemo(() => buildActivityItems(applicationRecords), [applicationRecords]);
  const summary = useMemo(() => getParticipantSummary(applicationRecords), [applicationRecords]);
  const activeTab = portalTabs.find((tab) => tab.id === activeView) ?? portalTabs[0];
  const ActiveIcon = activeTab.icon;

  useEffect(() => {
    if (activeSlide >= featuredContests.length) {
      setActiveSlide(0);
    }
  }, [activeSlide, featuredContests.length]);

  useEffect(() => {
    if (featuredContests.length < 2 || isCarouselPaused || isCarouselHovered) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % featuredContests.length);
    }, 6000);

    return () => window.clearInterval(timer);
  }, [featuredContests.length, isCarouselPaused, isCarouselHovered]);

  useEffect(() => {
    if (!selectedApplicationId && applicationRecords[0]) {
      setSelectedApplicationId(applicationRecords[0].id);
    }
  }, [applicationRecords, selectedApplicationId]);

  useEffect(() => {
    if (!isSidebarOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsSidebarOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSidebarOpen]);

  useEffect(() => {
    if (!isNotificationsOpen && !isProfileOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (notificationRef.current?.contains(event.target)) {
        return;
      }
      setIsNotificationsOpen(false);
      setIsProfileOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsNotificationsOpen(false);
        setIsProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isNotificationsOpen, isProfileOpen]);

  const moveSlide = (direction) => {
    if (featuredContests.length < 2) {
      return;
    }

    setActiveSlide((current) => (current + direction + featuredContests.length) % featuredContests.length);
  };

  const handleUpdateApplication = (teamId, patch) => {
    if (onUpdateApplication?.(teamId, patch)) {
      setEditingApplicationId("");
    }
  };

  const handleSubmitFiles = (contestId, teamId, form) => {
    if (onSubmitSubmission?.(contestId, teamId, form)) {
      setSubmissionTargetId("");
    }
  };
  const switchView = (nextView) => {
    onNavigate?.(nextView);
    setEditingApplicationId("");
    setSubmissionTargetId("");
    setIsSidebarOpen(false);
    setIsNotificationsOpen(false);
    setIsProfileOpen(false);
  };

  return (
    <div className={styles.shell}>
      {isSidebarOpen && (
        <button
          className={styles.sidebarScrim}
          type="button"
          aria-label="메뉴 닫기"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <aside
        className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarOpen : ""}`}
        id="participant-sidebar"
        aria-label="참가자 메뉴"
        aria-hidden={!isSidebarOpen}
        inert={!isSidebarOpen}
      >
        <div className={styles.sidebarBrand}>
          <div className={styles.brandMark}>
            <Layers3 size={23} aria-hidden="true" />
          </div>
          <div>
            <strong>Trekkey</strong>
            <span>참가자 포털</span>
          </div>
          <button className={styles.sidebarClose} type="button" aria-label="메뉴 닫기" onClick={() => setIsSidebarOpen(false)}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <nav className={styles.sidebarNav}>
          {sidebarTabs.map((tab) => {
            const Icon = tab.icon;

            return (
              <button
                className={activeView === tab.id ? styles.sidebarNavActive : ""}
                key={tab.id}
                type="button"
                onClick={() => switchView(tab.id)}
              >
                <Icon size={17} aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.sidebarAccount}>
            <div className={styles.avatar}>
              <UserRound size={19} aria-hidden="true" />
            </div>
            <div>
              <strong>{session.name}</strong>
              <span>{session.studentId} · {session.major}</span>
            </div>
          </div>
          <button className={styles.sidebarLogout} type="button" onClick={onLogout}>
            <LogOut size={16} aria-hidden="true" />
            로그아웃
          </button>
        </div>
      </aside>

      <header className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <button
            className={styles.menuButton}
            type="button"
            aria-label="메뉴 열기"
            aria-controls="participant-sidebar"
            aria-expanded={isSidebarOpen}
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu size={20} aria-hidden="true" />
          </button>
          <div className={styles.pageTitle}>
            <div className={styles.pageIcon}>
              <ActiveIcon size={19} aria-hidden="true" />
            </div>
            <div>
              <strong>{activeTab.label}</strong>
              <span>참가자 포털</span>
            </div>
          </div>
        </div>
        <div className={styles.account}>
          <span>{session.name}</span>
          <div className={styles.headerActions} ref={notificationRef}>
            <button
              className={`${styles.headerIconButton} ${isNotificationsOpen ? styles.headerIconButtonActive : ""}`}
              type="button"
              aria-label="알림"
              aria-expanded={isNotificationsOpen}
              onClick={() => setIsNotificationsOpen((current) => !current)}
            >
              <Bell size={18} aria-hidden="true" />
              {notifications.length > 0 && <b className={styles.notificationBadge}>{notifications.length}</b>}
            </button>
            <button
              className={`${styles.headerIconButton} ${isProfileOpen ? styles.headerIconButtonActive : ""}`}
              type="button"
              aria-label="마이페이지"
              aria-expanded={isProfileOpen}
              onClick={() => {
                setIsProfileOpen((current) => !current);
                setIsNotificationsOpen(false);
              }}
            >
              <UserRound size={18} aria-hidden="true" />
            </button>
            {isNotificationsOpen && (
              <NotificationPopover notifications={notifications} onClose={() => setIsNotificationsOpen(false)} />
            )}
            {isProfileOpen && (
              <ProfilePopover
                session={session}
                summary={summary}
                records={applicationRecords}
                notifications={notifications}
                onClose={() => setIsProfileOpen(false)}
                onOpenProfilePage={() => switchView("profile")}
              />
            )}
          </div>
        </div>
      </header>

      <main className={styles.mainShell}>
        {activeView === "discover" && (
          <DiscoverView
            featuredContests={featuredContests}
            activeSlide={activeSlide}
            visibleContests={visibleContests}
            contests={allContests}
            query={query}
            statusFilter={statusFilter}
            teams={teams}
            session={session}
            myApplications={myApplications}
            summary={summary}
            onQueryChange={setQuery}
            onStatusFilterChange={setStatusFilter}
            onMoveSlide={moveSlide}
            onSetActiveSlide={setActiveSlide}
            isCarouselPaused={isCarouselPaused}
            onToggleCarouselPause={() => setIsCarouselPaused((current) => !current)}
            onCarouselHoverChange={setIsCarouselHovered}
            onOpenPublicPage={onOpenPublicPage}
            onToggleLike={onToggleLike}
          />
        )}

        {activeView === "applications" && (
          <ApplicationsView
            records={applicationRecords}
            selectedRecord={selectedRecord}
            editingApplicationId={editingApplicationId}
            onSelect={setSelectedApplicationId}
            onEdit={setEditingApplicationId}
            onCancelEdit={() => setEditingApplicationId("")}
            onUpdateApplication={handleUpdateApplication}
            onOpenPublicPage={onOpenPublicPage}
          />
        )}

        {activeView === "submissions" && (
          <SubmissionsView
            records={applicationRecords}
            submissionTargetId={submissionTargetId}
            onToggleSubmission={setSubmissionTargetId}
            onSubmitFiles={handleSubmitFiles}
          />
        )}

        {activeView === "teams" && (
          <TeamsView
            records={applicationRecords}
            editingApplicationId={editingApplicationId}
            onEdit={setEditingApplicationId}
            onCancelEdit={() => setEditingApplicationId("")}
            onUpdateApplication={handleUpdateApplication}
          />
        )}

        {activeView === "results" && <ResultsView records={applicationRecords} />}

        {activeView === "activity" && <ActivityView items={activityItems} />}

        {activeView === "profile" && (
          <ProfileView session={session} summary={summary} records={applicationRecords} notifications={notifications} />
        )}
      </main>
      <AppFooter variant="participant" />
    </div>
  );
}

function DiscoverView({
  featuredContests,
  activeSlide,
  visibleContests,
  contests,
  query,
  statusFilter,
  teams,
  session,
  myApplications,
  summary,
  onQueryChange,
  onStatusFilterChange,
  onMoveSlide,
  onSetActiveSlide,
  isCarouselPaused,
  onToggleCarouselPause,
  onCarouselHoverChange,
  onOpenPublicPage,
  onToggleLike
}) {
  return (
    <>
      {featuredContests.length > 0 && (
        <section
          className={styles.posterCarousel}
          aria-label="주요 대회 포스터"
          onMouseEnter={() => onCarouselHoverChange(true)}
          onMouseLeave={() => onCarouselHoverChange(false)}
          onFocus={() => onCarouselHoverChange(true)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              onCarouselHoverChange(false);
            }
          }}
        >
          <div className={styles.carouselViewport}>
            <div className={styles.carouselTrack} style={{ transform: `translateX(-${activeSlide * 100}%)` }}>
              {featuredContests.map((contest) => {
                const deadlineLabel = getDeadlineLabel(contest.submissionDue);
                const tags = getContestTags(contest);

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
                          <img className={styles.carouselBackdrop} src={contest.posterUrl} alt="" aria-hidden="true" />
                          <img className={styles.carouselPosterImage} src={contest.posterUrl} alt={`${contest.title} 포스터`} />
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
                      <div className={styles.carouselHeader}>
                        <div className={styles.carouselBadges}>
                          <StatusBadge status={contest.status} />
                          <span>{deadlineLabel}</span>
                        </div>
                        <h1>{contest.title}</h1>
                      </div>
                      <div className={styles.carouselDetails}>
                        <p>{contest.summary}</p>
                        <div className={styles.carouselMeta}>
                          <span>{contest.department}</span>
                          <span>제출 {contest.submissionDue}</span>
                          {tags.map((tag) => (
                            <span key={tag}>#{tag}</span>
                          ))}
                        </div>
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
                  onClick={() => onMoveSlide(-1)}
                >
                  <ChevronLeft size={20} aria-hidden="true" />
                </button>
                <button
                  className={`${styles.carouselNav} ${styles.carouselNext}`}
                  type="button"
                  aria-label="다음 대회"
                  onClick={() => onMoveSlide(1)}
                >
                  <ChevronRight size={20} aria-hidden="true" />
                </button>
                <button
                  className={styles.carouselPause}
                  type="button"
                  aria-label={isCarouselPaused ? "자동 넘김 재생" : "자동 넘김 일시정지"}
                  aria-pressed={isCarouselPaused}
                  onClick={onToggleCarouselPause}
                >
                  {isCarouselPaused ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
                </button>
                <div className={styles.carouselDots} aria-label="대회 포스터 선택">
                  {featuredContests.map((contest, index) => (
                    <button
                      className={index === activeSlide ? styles.carouselDotActive : ""}
                      key={contest.id}
                      type="button"
                      aria-label={`${index + 1}번 포스터 보기`}
                      aria-current={index === activeSlide}
                      onClick={() => onSetActiveSlide(index)}
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
                onChange={(event) => onQueryChange(event.target.value)}
              />
            </label>
            <SegmentedControl options={["접수중", "전체", "종료"]} value={statusFilter} onChange={onStatusFilterChange} />
          </div>

          <ContestGrid
            contests={visibleContests}
            teams={teams}
            session={session}
            onOpenPublicPage={onOpenPublicPage}
            onToggleLike={onToggleLike}
          />
        </section>

        <aside className={styles.side}>
          <section className={styles.profile}>
            <div className={styles.profileSummary}>
              <div className={styles.avatar}>
                <UserRound size={24} aria-hidden="true" />
              </div>
              <div>
                <strong>{session.name}</strong>
                <span>{session.studentId} · {session.major}</span>
              </div>
            </div>

            <div className={styles.profileDivider} />

            <div className={styles.applications}>
              <div className={styles.sideHead}>
                <strong>내 신청</strong>
                <span>{myApplications.length}건</span>
              </div>
              <div className={styles.applicationList}>
                {myApplications.slice(0, 4).map((application) => (
                  <article className={styles.application} key={application.id}>
                    <div>
                      <strong>{getContestTitle(application.contestId, contests)}</strong>
                      <span>{application.name} · {application.members}명</span>
                    </div>
                    <StatusBadge status={application.status} />
                  </article>
                ))}
                {myApplications.length === 0 && <EmptyState title="신청 없음" description="접수중 대회에서 신청하세요." />}
              </div>
            </div>

            <div className={styles.quickSummary}>
              <span>다음 할 일</span>
              <strong>{summary.actionRequired ? `${summary.actionRequired}건 확인 필요` : "처리할 항목 없음"}</strong>
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}

function ContestGrid({ contests, teams, session, onOpenPublicPage, onToggleLike }) {
  const reactionKey = getContestReactionKey(session);

  return (
    <div className={styles.contestGrid}>
      {contests.map((contest) => {
        const application = findParticipantApplication(teams, contest.id, session);
        const deadlineMeta = getDeadlineMeta(contest.submissionDue);
        const tags = getContestTags(contest);
        const isLiked = contest.likedBy?.includes(reactionKey);

        return (
          <article className={styles.contestCard} key={contest.id}>
            {application && (
              <span className={styles.cardMarks}>
                <span
                  className={styles.applicationMark}
                  data-tooltip={getApplicationTooltip(application.status)}
                  aria-label={getApplicationTooltip(application.status)}
                >
                  <Star size={15} fill="currentColor" aria-hidden="true" />
                </span>
              </span>
            )}
            <button className={styles.contestCardLink} type="button" onClick={() => onOpenPublicPage(contest.id)}>
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
                  <span className={`${styles.deadlineBadge} ${getDeadlineToneClass(deadlineMeta.tone)}`}>{deadlineMeta.label}</span>
                  <div className={styles.cardHeadRight}>
                    {tags.length > 0 && (
                      <div className={styles.cardTags}>
                        {tags.map((tag) => (
                          <span key={tag}>#{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <h2>{contest.title}</h2>
                <p>{contest.summary}</p>
              </div>
            </button>
            <div className={styles.cardEngagement} aria-label="대회 관심 지표">
              <span>
                <Eye size={14} aria-hidden="true" />
                {formatEngagementCount(contest.views)}
              </span>
              <button
                className={isLiked ? styles.cardEngagementActive : ""}
                type="button"
                aria-pressed={isLiked}
                onClick={() => onToggleLike?.(contest.id)}
              >
                <Heart size={14} fill={isLiked ? "currentColor" : "none"} aria-hidden="true" />
                {formatEngagementCount(contest.likes)}
              </button>
            </div>
            <div className={styles.cardMeta} aria-label="대회 정보">
              <span>{contest.department}</span>
              <span>{contest.submissionDue}</span>
            </div>
          </article>
        );
      })}
      {contests.length === 0 && <EmptyState title="표시할 대회가 없습니다" description="검색어나 상태 필터를 조정해 주세요." />}
    </div>
  );
}

function ApplicationsView({
  records,
  selectedRecord,
  editingApplicationId,
  onSelect,
  onEdit,
  onCancelEdit,
  onUpdateApplication,
  onOpenPublicPage
}) {
  return (
    <div className={styles.workspaceGrid}>
      <section className={styles.portalPanel}>
        <div className={styles.sectionHead}>
          <strong>내 신청 현황</strong>
          <span>{records.length}건</span>
        </div>
        <div className={styles.recordList}>
          {records.map((record) => (
            <button
              className={`${styles.recordRow} ${selectedRecord?.id === record.id ? styles.recordRowActive : ""}`}
              key={record.id}
              type="button"
              onClick={() => onSelect(record.id)}
            >
              <div>
                <strong>{record.contest.title}</strong>
                <span>{record.team.name} · {record.contest.department}</span>
              </div>
              <StatusBadge status={record.team.status} />
            </button>
          ))}
          {records.length === 0 && <EmptyState title="신청한 대회가 없습니다" description="대회 상세에서 참가 신청을 먼저 진행하세요." />}
        </div>
      </section>

      <section className={styles.portalPanel}>
        {selectedRecord ? (
          editingApplicationId === selectedRecord.id ? (
            <ApplicationEditForm record={selectedRecord} onSubmit={onUpdateApplication} onCancel={onCancelEdit} />
          ) : (
            <ApplicationDetail record={selectedRecord} onEdit={() => onEdit(selectedRecord.id)} onOpenPublicPage={onOpenPublicPage} />
          )
        ) : (
          <EmptyState title="신청 상세 없음" description="왼쪽 목록에서 신청 건을 선택하세요." />
        )}
      </section>
    </div>
  );
}

function ApplicationDetail({ record, onEdit, onOpenPublicPage }) {
  const steps = getApplicationSteps(record);

  return (
    <div className={styles.detailStack}>
      <div className={styles.detailHero}>
        <div>
          <span className={styles.kicker}>신청 상세</span>
          <h2>{record.contest.title}</h2>
          <p>{record.team.name} · {record.team.members}명 · {record.team.major}</p>
        </div>
        <StatusBadge status={record.team.status} />
      </div>

      <div className={styles.detailActions}>
        <button className={styles.secondaryButton} type="button" onClick={() => onOpenPublicPage(record.contest.id)}>
          공고 보기
        </button>
        <button className={styles.primaryButton} type="button" onClick={onEdit}>
          <Pencil size={17} aria-hidden="true" />
          신청 정보 수정
        </button>
      </div>

      <dl className={styles.infoGrid}>
        <div>
          <dt>대표자</dt>
          <dd>{record.team.leader}</dd>
        </div>
        <div>
          <dt>연락처</dt>
          <dd>{record.team.phone ?? "-"}</dd>
        </div>
        <div>
          <dt>이메일</dt>
          <dd>{record.team.applicantEmail ?? "-"}</dd>
        </div>
        <div>
          <dt>제출물</dt>
          <dd>{record.submission ? getSubmissionFileSummary(record.submission) : "제출 전"}</dd>
        </div>
      </dl>

      {record.team.status === "보완요청" && (
        <div className={styles.noticeBox}>
          <strong>보완 요청</strong>
          <span>팀 정보 또는 증빙 내용을 다시 확인해 주세요. 수정 후 저장하면 검토중으로 전환됩니다.</span>
        </div>
      )}

      <div className={styles.stepList}>
        {steps.map((step) => (
          <div className={`${styles.stepItem} ${step.done ? styles.stepDone : ""}`} key={step.label}>
            <span>{step.done ? <CheckCircle2 size={14} aria-hidden="true" /> : step.index}</span>
            <div>
              <strong>{step.label}</strong>
              <small>{step.description}</small>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ApplicationEditForm({ record, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    name: record.team.name,
    leader: record.team.leader,
    major: record.team.major,
    members: record.team.members,
    applicantEmail: record.team.applicantEmail ?? "",
    phone: record.team.phone ?? "",
    motivation: record.team.motivation ?? ""
  });
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  return (
    <form
      className={styles.editForm}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(record.team.id, form);
      }}
    >
      <div className={styles.sectionHead}>
        <strong>신청 정보 수정</strong>
        <span>{record.contest.title}</span>
      </div>
      <div className={styles.fieldRow}>
        <label>
          <span>{record.contest.type === "개인전" ? "참가자명" : "팀명"}</span>
          <input value={form.name} onChange={(event) => update("name", event.target.value)} required />
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
            max={record.contest.type === "개인전" ? 1 : 5}
            value={form.members}
            onChange={(event) => update("members", event.target.value)}
            readOnly={record.contest.type === "개인전"}
            required
          />
        </label>
      </div>
      <div className={styles.fieldRow}>
        <label>
          <span>이메일</span>
          <input type="email" value={form.applicantEmail} onChange={(event) => update("applicantEmail", event.target.value)} />
        </label>
        <label>
          <span>연락처</span>
          <input value={form.phone} onChange={(event) => update("phone", event.target.value)} />
        </label>
      </div>
      <label>
        <span>지원 동기</span>
        <textarea value={form.motivation} onChange={(event) => update("motivation", event.target.value)} />
      </label>
      <div className={styles.formActions}>
        <button className={styles.secondaryButton} type="button" onClick={onCancel}>
          취소
        </button>
        <button className={styles.primaryButton} type="submit">
          저장
        </button>
      </div>
    </form>
  );
}

function SubmissionsView({ records, submissionTargetId, onToggleSubmission, onSubmitFiles }) {
  return (
    <section className={styles.portalPanel}>
      <div className={styles.sectionHead}>
        <strong>제출물 제출/수정</strong>
        <span>{records.filter((record) => record.submission).length}건 제출</span>
      </div>
      <div className={styles.submissionGrid}>
        {records.map((record) => {
          const canSubmit = record.team.status === "승인" || record.team.status === "검토중";
          const isOpen = submissionTargetId === record.id;

          return (
            <article className={styles.submissionCard} key={record.id}>
              <div className={styles.submissionHead}>
                <div>
                  <strong>{record.contest.title}</strong>
                  <span>{record.team.name} · 제출 마감 {record.contest.submissionDue}</span>
                </div>
                <StatusBadge status={record.submission ? record.submission.review : "제출전"} />
              </div>
              <dl className={styles.submissionMeta}>
                <div>
                  <dt>파일</dt>
                  <dd>{record.submission ? `${getSubmissionFileCount(record.submission)}개` : "없음"}</dd>
                </div>
                <div>
                  <dt>접수</dt>
                  <dd>{record.submission?.submittedAt ?? "-"}</dd>
                </div>
                <div>
                  <dt>무결성</dt>
                  <dd>{record.submission?.hashReady ? "해시 준비" : "대기"}</dd>
                </div>
              </dl>
              {record.submission && <p className={styles.submissionSummary}>{getSubmissionFileSummary(record.submission)}</p>}
              <button
                className={record.submission ? styles.secondaryButton : styles.primaryButton}
                type="button"
                disabled={!canSubmit}
                onClick={() => onToggleSubmission(isOpen ? "" : record.id)}
              >
                <Upload size={17} aria-hidden="true" />
                {record.submission ? "재제출" : "제출하기"}
              </button>
              {isOpen && (
                <ParticipantSubmissionForm
                  record={record}
                  onCancel={() => onToggleSubmission("")}
                  onSubmit={(form) => onSubmitFiles(record.contest.id, record.team.id, form)}
                />
              )}
            </article>
          );
        })}
        {records.length === 0 && <EmptyState title="제출 가능한 신청이 없습니다" description="참가 신청 후 제출물을 관리할 수 있습니다." />}
      </div>
    </section>
  );
}

function ParticipantSubmissionForm({ record, onSubmit, onCancel }) {
  const [title, setTitle] = useState(record.submission?.title ?? `${record.team.name} 제출물`);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const fileMetas = useMemo(() => selectedFiles.map((file, index) => createSubmissionFileMeta(file, index)), [selectedFiles]);

  return (
    <form
      className={styles.uploadForm}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ title, attachments: fileMetas, uploadFiles: selectedFiles });
      }}
    >
      <label>
        <span>제출물명</span>
        <input value={title} onChange={(event) => setTitle(event.target.value)} required />
      </label>
      <label className={styles.uploadDrop}>
        <FileArchive size={20} aria-hidden="true" />
        <strong>{fileMetas.length ? `${fileMetas.length}개 파일 선택됨` : "파일 선택"}</strong>
        <span>PDF, PPTX, ZIP, 이미지, 영상 파일 등을 여러 개 선택할 수 있습니다.</span>
        <input
          type="file"
          accept={SUBMISSION_FILE_ACCEPT}
          multiple
          required={!record.submission && selectedFiles.length === 0}
          onChange={(event) => setSelectedFiles(Array.from(event.target.files ?? []))}
        />
      </label>
      {fileMetas.length > 0 && (
        <div className={styles.fileList}>
          {fileMetas.map((file) => (
            <div key={file.id}>
              <strong>{file.name}</strong>
              <span>{formatFileSize(file.size)}</span>
            </div>
          ))}
        </div>
      )}
      <div className={styles.formActions}>
        <button className={styles.secondaryButton} type="button" onClick={onCancel}>
          취소
        </button>
        <button className={styles.primaryButton} type="submit" disabled={!record.submission && fileMetas.length === 0}>
          <Send size={17} aria-hidden="true" />
          접수
        </button>
      </div>
    </form>
  );
}

function TeamsView({ records, editingApplicationId, onEdit, onCancelEdit, onUpdateApplication }) {
  return (
    <section className={styles.portalPanel}>
      <div className={styles.sectionHead}>
        <strong>팀 관리</strong>
        <span>{records.length}팀</span>
      </div>
      <div className={styles.teamGrid}>
        {records.map((record) => (
          <article className={styles.teamCard} key={record.id}>
            {editingApplicationId === record.id ? (
              <ApplicationEditForm record={record} onSubmit={onUpdateApplication} onCancel={onCancelEdit} />
            ) : (
              <>
                <div className={styles.teamHead}>
                  <div>
                    <strong>{record.team.name}</strong>
                    <span>{record.contest.title}</span>
                  </div>
                  <StatusBadge status={record.team.status} />
                </div>
                <dl className={styles.infoGrid}>
                  <div>
                    <dt>대표자</dt>
                    <dd>{record.team.leader}</dd>
                  </div>
                  <div>
                    <dt>팀원</dt>
                    <dd>{record.team.members}명</dd>
                  </div>
                  <div>
                    <dt>연락처</dt>
                    <dd>{record.team.phone ?? "-"}</dd>
                  </div>
                  <div>
                    <dt>초대 링크</dt>
                    <dd>{record.contest.type === "개인전" ? "개인전" : "준비됨"}</dd>
                  </div>
                </dl>
                <div className={styles.inviteBox}>
                  <span>{record.contest.type === "개인전" ? "개인전 대회입니다" : `초대 코드 TEAM-${record.team.id.slice(-4)}`}</span>
                  <button className={styles.secondaryButton} type="button" onClick={() => onEdit(record.id)}>
                    <Pencil size={17} aria-hidden="true" />
                    수정
                  </button>
                </div>
              </>
            )}
          </article>
        ))}
        {records.length === 0 && <EmptyState title="관리할 팀이 없습니다" description="팀전 대회 신청 후 팀 정보를 관리할 수 있습니다." />}
      </div>
    </section>
  );
}

function NotificationPopover({ notifications, onClose }) {
  return (
    <div className={styles.notificationPopover} role="dialog" aria-label="참가자 알림">
      <div className={styles.notificationPopoverHead}>
        <div>
          <strong>알림</strong>
          <span>{notifications.length ? `${notifications.length}건의 확인 항목이 있습니다.` : "확인할 알림이 없습니다."}</span>
        </div>
        <button type="button" onClick={onClose}>
          닫기
        </button>
      </div>
      <div className={styles.notificationPopoverList}>
        {notifications.slice(0, 5).map((notification) => (
          <article className={`${styles.notificationPopoverItem} ${styles[notification.tone] ?? ""}`} key={notification.id}>
            <div>
              <strong>{notification.title}</strong>
              <span>{notification.description}</span>
            </div>
            <small>{notification.meta}</small>
          </article>
        ))}
        {notifications.length === 0 && (
          <div className={styles.notificationPopoverEmpty}>
            <strong>새 알림이 없습니다</strong>
            <span>신청 승인, 보완요청, 제출 마감 알림이 이곳에 표시됩니다.</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ProfilePopover({ session, summary, records, notifications, onClose, onOpenProfilePage }) {
  const verifiedCount = records.filter((record) => record.submission || record.award).length;

  return (
    <div className={`${styles.notificationPopover} ${styles.profilePopover}`} role="dialog" aria-label="마이페이지 요약">
      <div className={styles.notificationPopoverHead}>
        <div>
          <strong>마이페이지</strong>
          <span>{session.name}님의 참가 정보</span>
        </div>
        <button type="button" onClick={onClose}>
          닫기
        </button>
      </div>
      <div className={styles.profilePopoverBody}>
        <div className={styles.profilePopoverUser}>
          <div className={styles.avatar}>
            <UserRound size={22} aria-hidden="true" />
          </div>
          <div>
            <strong>{session.name}</strong>
            <span>{session.studentId} · {session.major}</span>
          </div>
        </div>
        <dl className={styles.profilePopoverStats}>
          <div>
            <dt>신청</dt>
            <dd>{summary.applications}건</dd>
          </div>
          <div>
            <dt>알림</dt>
            <dd>{notifications.length}건</dd>
          </div>
          <div>
            <dt>검증 이력</dt>
            <dd>{verifiedCount}건</dd>
          </div>
          <div>
            <dt>수상/후보</dt>
            <dd>{summary.awards}건</dd>
          </div>
        </dl>
        <button className={styles.primaryButton} type="button" onClick={onOpenProfilePage}>
          전체 보기
        </button>
      </div>
    </div>
  );
}

function NotificationsView({ notifications }) {
  return (
    <section className={styles.portalPanel}>
      <div className={styles.sectionHead}>
        <strong>알림 센터</strong>
        <span>{notifications.length}건</span>
      </div>
      <div className={styles.notificationList}>
        {notifications.map((notification) => (
          <article className={`${styles.notificationCard} ${styles[notification.tone] ?? ""}`} key={notification.id}>
            <div>
              <strong>{notification.title}</strong>
              <span>{notification.description}</span>
            </div>
            <small>{notification.meta}</small>
          </article>
        ))}
        {notifications.length === 0 && <EmptyState title="새 알림이 없습니다" description="신청 승인, 보완요청, 제출 마감 알림이 이곳에 표시됩니다." />}
      </div>
    </section>
  );
}

function ResultsView({ records }) {
  return (
    <section className={styles.portalPanel}>
      <div className={styles.sectionHead}>
        <strong>결과 확인</strong>
        <span>{records.length}건</span>
      </div>
      <div className={styles.resultGrid}>
        {records.map((record) => (
          <article className={styles.resultCard} key={record.id}>
            <div className={styles.resultIcon}>
              <Trophy size={20} aria-hidden="true" />
            </div>
            <div>
              <strong>{record.contest.title}</strong>
              <span>{record.award ? `${record.award.prize} · ${record.award.score}점` : getResultWaitingText(record)}</span>
            </div>
            <StatusBadge status={record.award?.status ?? record.contest.status} />
            {record.award && (
              <dl className={styles.infoGrid}>
                <div>
                  <dt>상장번호</dt>
                  <dd>{record.award.certificateNo}</dd>
                </div>
                <div>
                  <dt>활동 이력</dt>
                  <dd>{record.award.status === "확정" ? "등록 예정" : "확정 대기"}</dd>
                </div>
              </dl>
            )}
          </article>
        ))}
        {records.length === 0 && <EmptyState title="확인할 결과가 없습니다" description="참가 신청 후 결과 상태를 확인할 수 있습니다." />}
      </div>
    </section>
  );
}

function ActivityView({ items }) {
  return (
    <section className={styles.portalPanel}>
      <div className={styles.sectionHead}>
        <strong>내 활동 이력</strong>
        <span>{items.length}개 기록</span>
      </div>
      <div className={styles.activityTimeline}>
        {items.map((item) => (
          <article className={styles.activityItem} key={item.id}>
            <span>
              <CalendarClock size={15} aria-hidden="true" />
            </span>
            <div>
              <strong>{item.title}</strong>
              <p>{item.description}</p>
              <small>{item.meta}</small>
            </div>
          </article>
        ))}
        {items.length === 0 && <EmptyState title="활동 이력이 없습니다" description="신청과 제출이 진행되면 이력이 자동으로 쌓입니다." />}
      </div>
    </section>
  );
}

function ProfileView({ session, summary, records, notifications }) {
  return (
    <div className={styles.profilePageGrid}>
      <section className={styles.portalPanel}>
        <div className={styles.profileHero}>
          <div className={styles.avatar}>
            <UserRound size={26} aria-hidden="true" />
          </div>
          <div>
            <span className={styles.kicker}>내 정보</span>
            <h2>{session.name}</h2>
            <p>{session.studentId} · {session.major}</p>
          </div>
        </div>
        <dl className={styles.infoGrid}>
          <div>
            <dt>이메일</dt>
            <dd>{session.email}</dd>
          </div>
          <div>
            <dt>계정 구분</dt>
            <dd>대회 참가자</dd>
          </div>
          <div>
            <dt>신청</dt>
            <dd>{summary.applications}건</dd>
          </div>
          <div>
            <dt>알림</dt>
            <dd>{notifications.length}건</dd>
          </div>
        </dl>
      </section>
      <section className={styles.portalPanel}>
        <div className={styles.sectionHead}>
          <strong>졸업요건 연계 준비</strong>
          <span>UI 목업</span>
        </div>
        <div className={styles.requirementPreview}>
          <div>
            <span>검증 가능한 비교과</span>
            <strong>{records.filter((record) => record.submission || record.award).length}건</strong>
          </div>
          <div>
            <span>수상/인증 후보</span>
            <strong>{summary.awards}건</strong>
          </div>
          <p>추후 블록체인 검증 이력과 졸업요건 매칭 기능이 연결될 영역입니다.</p>
        </div>
      </section>
    </div>
  );
}

function getParticipantSummary(records) {
  const submitted = records.filter((record) => record.submission).length;
  const supplement = records.filter((record) => record.team.status === "보완요청").length;
  const waitingSubmission = records.filter((record) => record.team.status === "승인" && !record.submission).length;

  return {
    applications: records.length,
    submitted,
    actionRequired: supplement + waitingSubmission,
    awards: records.filter((record) => record.award).length
  };
}

function buildParticipantNotifications(records) {
  return records.flatMap((record) => {
    const items = [];

    if (record.team.status === "보완요청") {
      items.push({
        id: `${record.id}-supplement`,
        tone: "warning",
        title: "신청 보완 요청",
        description: `${record.contest.title} 신청 정보를 다시 확인해 주세요.`,
        meta: record.team.updatedAt ?? record.team.createdAt ?? "확인 필요"
      });
    }

    if (record.team.status === "승인" && !record.submission) {
      items.push({
        id: `${record.id}-submission`,
        tone: "info",
        title: "제출물 접수 대기",
        description: `${record.team.name} 제출물을 마감 전까지 업로드하세요.`,
        meta: `마감 ${record.contest.submissionDue}`
      });
    }

    if (["today", "urgent"].includes(record.deadlineMeta.tone) && !record.submission) {
      items.push({
        id: `${record.id}-deadline`,
        tone: "danger",
        title: "제출 마감 임박",
        description: `${record.contest.title} 제출 마감이 가깝습니다.`,
        meta: record.deadlineMeta.label
      });
    }

    if (record.award) {
      items.push({
        id: `${record.id}-award`,
        tone: record.award.status === "확정" ? "success" : "info",
        title: record.award.status === "확정" ? "수상 확정" : "수상 후보 등록",
        description: `${record.award.prize} · ${record.award.score}점`,
        meta: record.award.certificateNo
      });
    }

    return items;
  });
}

function buildActivityItems(records) {
  return records.flatMap((record) => {
    const items = [
      {
        id: `${record.id}-apply`,
        title: `${record.contest.title} 신청`,
        description: `${record.team.name}으로 참가 신청했습니다.`,
        meta: record.team.createdAt ?? "신청 완료"
      }
    ];

    if (record.submission) {
      items.push({
        id: `${record.id}-submit`,
        title: "제출물 접수",
        description: record.submission.title,
        meta: `${record.submission.submittedAt} · 파일 ${getSubmissionFileCount(record.submission)}개`
      });
    }

    if (record.award) {
      items.push({
        id: `${record.id}-award`,
        title: record.award.prize,
        description: `${record.contest.title} 결과가 등록되었습니다.`,
        meta: `${record.award.status} · ${record.award.certificateNo}`
      });
    }

    return items;
  });
}

function getApplicationSteps(record) {
  const isReviewed = Boolean(record.submission && !["미배정", "대기", "접수완료"].includes(record.submission.review));

  return [
    { index: 1, label: "신청 접수", description: record.team.createdAt ?? "접수 완료", done: true },
    { index: 2, label: "신청 검토", description: record.team.status, done: ["승인", "보완요청"].includes(record.team.status) },
    { index: 3, label: "제출물", description: record.submission ? record.submission.submittedAt : "제출 전", done: Boolean(record.submission) },
    { index: 4, label: "심사", description: record.submission?.review ?? "대기", done: isReviewed },
    { index: 5, label: "결과", description: record.award?.prize ?? "발표 전", done: Boolean(record.award) }
  ];
}

function getResultWaitingText(record) {
  if (!record.submission) {
    return "제출 전입니다";
  }

  if (record.contest.status === "수상확정") {
    return "수상 내역이 없습니다";
  }

  return `${record.submission.review} · 결과 발표 전`;
}

function getContestTags(contest) {
  return String(contest.tags || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 3);
}

function getDeadlineLabel(submissionDue) {
  return getDeadlineMeta(submissionDue).label;
}

function getDeadlineMeta(submissionDue) {
  const diffDays = getDaysUntilDeadline(submissionDue);

  if (diffDays === null) {
    return { label: submissionDue, tone: "unknown" };
  }

  if (diffDays < 0) {
    return { label: "마감", tone: "closed" };
  }

  if (diffDays === 0) {
    return { label: "오늘 마감", tone: "today" };
  }

  if (diffDays <= 3) {
    return { label: `D-${diffDays}`, tone: "urgent" };
  }

  if (diffDays <= 10) {
    return { label: `D-${diffDays}`, tone: "soon" };
  }

  if (diffDays <= 30) {
    return { label: `D-${diffDays}`, tone: "watch" };
  }

  return { label: `D-${diffDays}`, tone: "normal" };
}

function getDeadlineToneClass(tone) {
  return (
    {
      closed: styles.deadlineClosed,
      today: styles.deadlineToday,
      urgent: styles.deadlineUrgent,
      soon: styles.deadlineSoon,
      watch: styles.deadlineWatch,
      normal: styles.deadlineNormal,
      unknown: styles.deadlineUnknown
    }[tone] ?? styles.deadlineUnknown
  );
}

function getApplicationTooltip(status) {
  if (status === "승인") {
    return "참가 신청이 승인되었습니다";
  }

  if (status === "보완요청") {
    return "신청 보완 요청이 있습니다";
  }

  if (status === "반려") {
    return "신청이 반려되었습니다";
  }

  return "신청이 접수되었습니다";
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
