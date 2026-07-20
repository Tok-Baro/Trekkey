import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Bell, Home, Layers3, LogOut, Menu, Search, Settings, UserRound, X } from "lucide-react";
import { navItems } from "./constants/navigation.js";
import { ModalRoot } from "./components/modals/ModalRoot.jsx";
import { AppFooter } from "./components/common/AppFooter.jsx";
import { IconButton } from "./components/common/CommonUi.jsx";
import {
  AwardsPage,
  ContestsPage,
  DashboardPage,
  JudgingPage,
  SubmissionsPage,
  TeamsPage
} from "./pages/admin/index.js";
import { LoginPage } from "./pages/auth/LoginPage.jsx";
import { ParticipantPortal } from "./pages/participant/ParticipantPortal.jsx";
import { ContestPublicDetailPage } from "./pages/public/ContestPublicDetailPage.jsx";
import { ReviewerPage } from "./pages/review/ReviewerPage.jsx";
import { getContestWithPublicFields } from "./lib/contest.js";
import { exportAwardsCsv, exportSubmissionsCsv } from "./lib/exportCsv.js";
import { useCompetitionStore } from "./hooks/useCompetitionStore.js";
import { useSessionStore } from "./hooks/useSessionStore.js";
import {
  getAdminPath,
  getContestDetailPath,
  getLoginPath,
  getPageFromPath,
  getPageHeading,
  getParticipantPageFromPath,
  getParticipantPath
} from "./routeConfig.js";
import styles from "./styles/App.module.scss";

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { contestId: routeContestParam } = useParams();
  const isReviewRoute = location.pathname.startsWith("/review/");
  const isContestDetailRoute = location.pathname.startsWith("/contest/");
  const isLoginRoute = location.pathname === getLoginPath();
  const isParticipantRoute = location.pathname.startsWith(getParticipantPath());
  const activePage = isReviewRoute ? "review" : isContestDetailRoute ? "contestDetail" : getPageFromPath(location.pathname);
  const activeParticipantPage = isParticipantRoute ? getParticipantPageFromPath(location.pathname) : "discover";
  const routeContestId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return routeContestParam ?? params.get("contest");
  }, [location.search, routeContestParam]);
  const routeRoundId = useMemo(() => new URLSearchParams(location.search).get("round"), [location.search]);
  const { session, login, logout } = useSessionStore();
  const competition = useCompetitionStore();
  const {
    contestRecords,
    teamRecords,
    submissionRecords,
    judgeRecords,
    reviewRecords,
    awardRecords,
    selectedContest,
    selectedContestId,
    setSelectedContestId
  } = competition;
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const notificationRef = useRef(null);

  useEffect(() => {
    if (routeContestId && contestRecords.some((contest) => contest.id === routeContestId)) {
      setSelectedContestId(routeContestId);
    }
  }, [contestRecords, routeContestId]);

  useEffect(() => {
    if (!isSidebarOpen && !modal) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        if (modal) {
          setModal(null);
        } else {
          setIsSidebarOpen(false);
        }
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSidebarOpen, modal]);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timer = window.setTimeout(() => setToast(null), toast.tone === "error" ? 6000 : 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    if (!isNotificationsOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (notificationRef.current?.contains(event.target)) {
        return;
      }
      setIsNotificationsOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isNotificationsOpen]);

  const notify = (message, tone = "info") => setToast({ id: Date.now(), message, tone });
  const notifyResult = (result) => notify(result.message, result.ok === false ? "error" : "success");
  const openModal = (type, payload = {}) => setModal({ type, payload });
  const closeModal = () => setModal(null);

  const handleLogin = (form) => {
    const nextSession = login(form);
    navigate(nextSession.role === "admin" ? getAdminPath("dashboard") : getParticipantPath());
    notify(nextSession.role === "admin" ? "관리자 계정으로 로그인했습니다." : "참가자 계정으로 로그인했습니다.", "success");
  };

  const handleContinueSession = () => {
    if (!session) {
      return;
    }

    navigate(session.role === "admin" ? getAdminPath("dashboard") : getParticipantPath());
  };

  const handleLogout = () => {
    logout();
    setModal(null);
    setIsSidebarOpen(false);
    navigate(getLoginPath());
    notify("로그아웃했습니다.");
  };

  const navigatePage = (page, contestId = selectedContestId) => {
    if (contestId) {
      setSelectedContestId(contestId);
    }
    setIsSidebarOpen(false);
    setIsNotificationsOpen(false);
    navigate(getAdminPath(page, contestId));
  };

  const openContestDetailPage = (contestId) => {
    navigate(getContestDetailPath(contestId));
  };

  const navigateParticipantPage = (page) => {
    navigate(getParticipantPath(page));
  };

  const selectContest = (contestId) => {
    setSelectedContestId(contestId);
    if (!isReviewRoute && activePage !== "dashboard") {
      navigate(getAdminPath(activePage, contestId), { replace: true });
    }
  };

  const handleSaveContest = (form) => {
    const result = competition.saveContest(form);
    if (result.routePage) {
      navigate(getAdminPath(result.routePage, result.selectedContestId));
    }
    notifyResult(result);
    closeModal();
  };

  const handleApplyContest = (form) => {
    const result = competition.applyContest(form, session);
    notifyResult(result);
    return result.ok;
  };

  const handleRecordContestView = (contestId) => {
    competition.recordContestView(contestId, session);
  };

  const handleToggleContestLike = (contestId) => {
    const result = competition.toggleContestLike(contestId, session);
    notifyResult(result);
  };

  const handleUpdateParticipantApplication = (teamId, patch) => {
    const result = competition.updateParticipantApplication(teamId, patch);
    notifyResult(result);
    return result.ok;
  };

  const handleUpsertParticipantSubmission = (contestId, teamId, form) => {
    const result = competition.upsertParticipantSubmission(contestId, teamId, form);
    notifyResult(result);
    return result.ok;
  };

  const handleUpdateTeamStatus = (teamId, status) => {
    const result = competition.updateTeamStatus(teamId, status);
    notifyResult(result);
  };

  const handleAddSubmission = (form) => {
    const result = competition.addSubmission(form);
    notifyResult(result);
    closeModal();
  };

  const handleGenerateHashes = () => {
    const result = competition.generateSubmissionHashes(selectedContestId);
    notifyResult(result);
  };

  const handleAddJudge = (form) => {
    const result = competition.addJudge(form);
    notifyResult(result);
    closeModal();
  };

  const handleUpdateJudge = (form) => {
    const result = competition.updateJudge(form);
    notifyResult(result);
    closeModal();
  };

  const handleDeleteJudge = (judgeId) => {
    const result = competition.deleteJudge(judgeId);
    notifyResult(result);
    closeModal();
  };

  const handleBatchAssignJudges = (roundId) => {
    const result = competition.batchAssignJudges(selectedContestId, roundId);
    notifyResult(result);
  };

  const handleSendReminder = (roundId) => {
    const result = competition.sendReviewReminders(selectedContestId, roundId);
    notifyResult(result);
  };

  const handleSubmitJudgeReview = ({ contestId, roundId, judgeName, reviewedCount, averageScore, records = [] }) => {
    const result = competition.submitJudgeReview({ contestId, roundId, judgeName, reviewedCount, averageScore, records });
    notifyResult(result);
  };

  const handleCalculateResults = (roundId) => {
    const result = competition.calculateResults(selectedContestId, roundId);
    if (result.ok) {
      navigatePage(result.routePage, selectedContestId);
    }
    notifyResult(result);
  };

  const handleConfirmAwards = () => {
    const result = competition.confirmAwards(selectedContestId);
    notifyResult(result);
    if (result.ok !== false) {
      closeModal();
    }
  };

  const handleExport = (label) => {
    if (label === "제출물") {
      const result = exportSubmissionsCsv({
        contest: selectedContest,
        submissions: submissionRecords.filter((submission) => submission.contestId === selectedContestId)
      });
      notifyResult(result);
      return;
    }

    if (label === "수상 명단") {
      const result = exportAwardsCsv({
        contest: selectedContest,
        awardCandidates: awardRecords.filter((candidate) => candidate.contestId === selectedContestId)
      });
      notifyResult(result);
      return;
    }

    notify(`${label} 내보내기 대상이 없습니다.`);
  };

  const notificationSummary = useMemo(() => {
    const supplementCount = teamRecords.filter((team) => team.status === "보완요청").length;
    const unassignedCount = submissionRecords.filter((submission) => ["미배정", "대기"].includes(submission.review)).length;
    const delayedReviewCount = judgeRecords.reduce(
      (sum, judge) => sum + Math.max(Number(judge.assigned || 0) - Number(judge.completed || 0), 0),
      0
    );
    const pendingAwardCount = awardRecords.filter((candidate) => candidate.status !== "확정").length;
    const items = [
      { label: "보완요청 신청", count: supplementCount, page: "teams", tone: "danger" },
      { label: "심사 배정 대기", count: unassignedCount, page: "submissions", tone: "warning" },
      { label: "미완료 심사", count: delayedReviewCount, page: "judging", tone: "warning" },
      { label: "수상 확정 대기", count: pendingAwardCount, page: "awards", tone: "success" }
    ];

    return {
      totalCount: items.reduce((sum, item) => sum + item.count, 0),
      items
    };
  }, [awardRecords, judgeRecords, submissionRecords, teamRecords]);

  if (isLoginRoute) {
    return (
      <>
        <LoginPage
          preferredRole={session?.role ?? "admin"}
          session={session}
          onLogin={handleLogin}
          onContinue={handleContinueSession}
        />
        <Toast toast={toast} onClose={() => setToast(null)} />
      </>
    );
  }

  if (isReviewRoute) {
    return (
      <>
        <ReviewerPage
          contestId={routeContestParam}
          roundId={routeRoundId}
          contests={contestRecords}
          judgingAssignments={judgeRecords}
          submissions={submissionRecords}
          reviewScores={reviewRecords}
          onSubmitReview={handleSubmitJudgeReview}
        />
        <Toast toast={toast} onClose={() => setToast(null)} />
      </>
    );
  }

  if (isContestDetailRoute) {
    const publicContest = contestRecords.find((contest) => contest.id === routeContestParam);
    return (
      <ContestPublicDetailPage
        contest={publicContest ? getContestWithPublicFields(publicContest) : null}
        session={session}
        teams={teamRecords}
        onApplyContest={handleApplyContest}
        onRecordView={handleRecordContestView}
        onToggleLike={handleToggleContestLike}
        onNotify={notify}
        onBack={() =>
          navigate(session?.role === "participant" ? getParticipantPath() : getAdminPath("contests", routeContestParam))
        }
      />
    );
  }

  if (isParticipantRoute) {
    if (session?.role !== "participant") {
      return (
        <>
          <LoginPage preferredRole="participant" session={session} onLogin={handleLogin} onContinue={handleContinueSession} />
          <Toast toast={toast} onClose={() => setToast(null)} />
        </>
      );
    }

    return (
      <>
        <ParticipantPortal
          session={session}
          contests={contestRecords}
          teams={teamRecords}
          submissions={submissionRecords}
          awardCandidates={awardRecords}
          activeView={activeParticipantPage}
          onOpenPublicPage={openContestDetailPage}
          onToggleLike={handleToggleContestLike}
          onNavigate={navigateParticipantPage}
          onUpdateApplication={handleUpdateParticipantApplication}
          onSubmitSubmission={handleUpsertParticipantSubmission}
          onLogout={handleLogout}
        />
        <Toast toast={toast} onClose={() => setToast(null)} />
      </>
    );
  }

  if (session?.role !== "admin") {
    return (
      <>
        <LoginPage preferredRole="admin" session={session} onLogin={handleLogin} onContinue={handleContinueSession} />
        <Toast toast={toast} onClose={() => setToast(null)} />
      </>
    );
  }

  const ActiveIcon = navItems.find((item) => item.id === activePage)?.icon ?? Home;

  return (
    <div className={`${styles.appRoot} ${styles.appShell}`}>
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
        id="app-sidebar"
        aria-label="주요 메뉴"
        aria-hidden={!isSidebarOpen}
        inert={!isSidebarOpen}
      >
        <div className={styles.brand}>
          <div className={styles.brandMark}>
            <Layers3 size={22} aria-hidden="true" />
          </div>
          <div>
            <strong>Trekkey</strong>
            <span>대회관리 콘솔</span>
          </div>
          <button className={styles.sidebarClose} type="button" aria-label="메뉴 닫기" onClick={() => setIsSidebarOpen(false)}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <nav className={styles.navList}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`${styles.navItem} ${activePage === item.id ? styles.navItemActive : ""}`}
                onClick={() => {
                  navigatePage(item.id);
                }}
                type="button"
              >
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.sidebarAccount}>
            <div className={styles.sidebarAccountIcon}>
              <UserRound size={17} aria-hidden="true" />
            </div>
            <div>
              <strong>{session.name}</strong>
              <span>{session.role === "admin" ? "관리자 계정" : "참가자 계정"}</span>
            </div>
          </div>
          <div className={styles.sidebarFooterActions}>
            <button
              className={styles.sidebarFooterButton}
              type="button"
              onClick={() => {
                setIsSidebarOpen(false);
                openModal("settings");
              }}
            >
              <Settings size={16} aria-hidden="true" />
              설정
            </button>
            <button className={styles.sidebarFooterButton} type="button" onClick={handleLogout}>
              <LogOut size={16} aria-hidden="true" />
              로그아웃
            </button>
          </div>
        </div>
      </aside>

      <div className={styles.mainShell}>
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <button
              className={styles.sidebarToggle}
              type="button"
              aria-label="메뉴 열기"
              aria-controls="app-sidebar"
              aria-expanded={isSidebarOpen}
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={20} aria-hidden="true" />
            </button>
            <div className={styles.pageTitle}>
              <div className={styles.pageIcon}>
                <ActiveIcon size={20} aria-hidden="true" />
              </div>
              <div>
                <h1>{getPageHeading(activePage)}</h1>
              </div>
            </div>
          </div>

          <div className={styles.topbarActions}>
            <TopbarSearch
              contests={contestRecords}
              teams={teamRecords}
              submissions={submissionRecords}
              onNavigate={navigatePage}
            />
            <div className={styles.notificationRoot} ref={notificationRef}>
              <IconButton
                label="처리 현황"
                aria-controls="notification-popover"
                aria-expanded={isNotificationsOpen}
                onClick={() => setIsNotificationsOpen((current) => !current)}
              >
                <Bell size={18} />
                {notificationSummary.totalCount > 0 && <span className={styles.notificationIndicator}>{notificationSummary.totalCount}</span>}
              </IconButton>
              {isNotificationsOpen && (
                <NotificationPopover
                  summary={notificationSummary}
                  onOpenPage={(page) => {
                    navigatePage(page);
                  }}
                />
              )}
            </div>
          </div>
        </header>

        <main className={styles.contentArea} data-page={activePage} key={activePage}>
          {activePage === "dashboard" && (
            <DashboardPage
              contests={contestRecords}
              teams={teamRecords}
              submissions={submissionRecords}
              judgingAssignments={judgeRecords}
              awardCandidates={awardRecords}
              onNavigate={navigatePage}
              openModal={openModal}
            />
          )}
          {activePage === "contests" && (
            <ContestsPage
              contests={contestRecords}
              teams={teamRecords}
              submissions={submissionRecords}
              judgingAssignments={judgeRecords}
              awardCandidates={awardRecords}
              reviewScores={reviewRecords}
              selectedContestId={selectedContestId}
              setSelectedContestId={selectContest}
              selectedContest={selectedContest}
              onNavigate={navigatePage}
              onOpenPublicPage={openContestDetailPage}
              openModal={openModal}
              onGenerateHashes={handleGenerateHashes}
              onCalculateResults={handleCalculateResults}
            />
          )}
          {activePage === "teams" && (
            <TeamsPage
              contests={contestRecords}
              teams={teamRecords}
              selectedContest={selectedContest}
              selectedContestId={selectedContestId}
              setSelectedContestId={selectContest}
              openModal={openModal}
              onUpdateTeamStatus={handleUpdateTeamStatus}
            />
          )}
          {activePage === "submissions" && (
            <SubmissionsPage
              contests={contestRecords}
              submissions={submissionRecords}
              teams={teamRecords}
              selectedContest={selectedContest}
              selectedContestId={selectedContestId}
              setSelectedContestId={selectContest}
              openModal={openModal}
              onExport={handleExport}
              onGenerateHashes={handleGenerateHashes}
              onNotify={notify}
            />
          )}
          {activePage === "judging" && (
            <JudgingPage
              contests={contestRecords}
              judgingAssignments={judgeRecords}
              submissions={submissionRecords}
              reviewScores={reviewRecords}
              selectedContest={selectedContest}
              selectedContestId={selectedContestId}
              setSelectedContestId={selectContest}
              openModal={openModal}
              onBatchAssign={handleBatchAssignJudges}
              onSendReminder={handleSendReminder}
              onCalculateResults={handleCalculateResults}
            />
          )}
          {activePage === "awards" && (
            <AwardsPage
              contests={contestRecords}
              awardCandidates={awardRecords}
              selectedContest={selectedContest}
              selectedContestId={selectedContestId}
              setSelectedContestId={selectContest}
              openModal={openModal}
              onExport={handleExport}
            />
          )}
        </main>
        <AppFooter variant="admin" />
      </div>

      <ModalRoot
        modal={modal}
        contests={contestRecords}
        teams={teamRecords}
        submissions={submissionRecords}
        judgingAssignments={judgeRecords}
        reviewScores={reviewRecords}
        awardCandidates={awardRecords}
        selectedContest={selectedContest}
        selectedContestId={selectedContestId}
        openModal={openModal}
        onClose={closeModal}
        onSaveContest={handleSaveContest}
        onAddSubmission={handleAddSubmission}
        onAddJudge={handleAddJudge}
        onUpdateJudge={handleUpdateJudge}
        onDeleteJudge={handleDeleteJudge}
        onConfirmAwards={handleConfirmAwards}
        onNotify={notify}
      />
      {toast && <div className={styles.toast} role="status">{toast.message}</div>}
    </div>
  );
}

function Toast({ toast, onClose }) {
  if (!toast) {
    return null;
  }

  const toneClass = toast.tone === "error" ? styles.toastError : toast.tone === "success" ? styles.toastSuccess : "";

  return (
    <div className={`${styles.toast} ${toneClass}`} role={toast.tone === "error" ? "alert" : "status"}>
      <span>{toast.message}</span>
      <button className={styles.toastClose} type="button" aria-label="알림 닫기" onClick={onClose}>
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  );
}

function TopbarSearch({ contests, teams, submissions, onNavigate }) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef(null);
  const trimmedQuery = query.trim().toLowerCase();

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (rootRef.current?.contains(event.target)) {
        return;
      }
      setIsOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const results = useMemo(() => {
    if (!trimmedQuery) {
      return [];
    }

    const contestTitle = (contestId) => contests.find((contest) => contest.id === contestId)?.title ?? "";
    const matched = [];

    contests
      .filter((contest) => `${contest.title} ${contest.department}`.toLowerCase().includes(trimmedQuery))
      .slice(0, 4)
      .forEach((contest) =>
        matched.push({
          key: `contest-${contest.id}`,
          type: "대회",
          title: contest.title,
          meta: `${contest.department} · ${contest.status}`,
          page: "contests",
          contestId: contest.id
        })
      );
    teams
      .filter((team) => `${team.name} ${team.leader ?? ""}`.toLowerCase().includes(trimmedQuery))
      .slice(0, 4)
      .forEach((team) =>
        matched.push({
          key: `team-${team.id}`,
          type: "팀",
          title: team.name,
          meta: `${contestTitle(team.contestId)} · ${team.status}`,
          page: "teams",
          contestId: team.contestId
        })
      );
    submissions
      .filter((submission) => `${submission.title} ${submission.team}`.toLowerCase().includes(trimmedQuery))
      .slice(0, 4)
      .forEach((submission) =>
        matched.push({
          key: `submission-${submission.id}`,
          type: "제출물",
          title: submission.title,
          meta: `${submission.team} · ${contestTitle(submission.contestId)}`,
          page: "submissions",
          contestId: submission.contestId
        })
      );

    return matched.slice(0, 9);
  }, [contests, teams, submissions, trimmedQuery]);

  const selectResult = (result) => {
    setIsOpen(false);
    setQuery("");
    onNavigate(result.page, result.contestId);
  };

  return (
    <div className={styles.searchRoot} ref={rootRef}>
      <label className={styles.searchBox}>
        <Search size={17} aria-hidden="true" />
        <input
          type="search"
          placeholder="대회, 팀, 제출물 검색"
          role="combobox"
          aria-expanded={isOpen && Boolean(trimmedQuery)}
          aria-controls="topbar-search-results"
          aria-label="대회, 팀, 제출물 검색"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && results[0]) {
              event.preventDefault();
              selectResult(results[0]);
            }
            if (event.key === "ArrowDown") {
              event.preventDefault();
              rootRef.current?.querySelector(`.${styles.searchResult}`)?.focus();
            }
          }}
        />
      </label>
      {isOpen && Boolean(trimmedQuery) && (
        <div className={styles.searchPopover} id="topbar-search-results" role="listbox" aria-label="검색 결과">
          {results.map((result) => (
            <button
              className={styles.searchResult}
              key={result.key}
              type="button"
              role="option"
              aria-selected="false"
              onClick={() => selectResult(result)}
            >
              <span className={styles.searchResultType}>{result.type}</span>
              <span className={styles.searchResultCopy}>
                <strong>{result.title}</strong>
                <small>{result.meta}</small>
              </span>
            </button>
          ))}
          {results.length === 0 && <p className={styles.searchEmpty}>"{query.trim()}"에 대한 결과가 없습니다.</p>}
        </div>
      )}
    </div>
  );
}

function NotificationPopover({ summary, onOpenPage }) {
  return (
    <div className={styles.notificationPopover} id="notification-popover" role="dialog" aria-label="처리 현황">
      <div className={styles.notificationHeader}>
        <div>
          <strong>처리 현황</strong>
          <span>{summary.totalCount ? `${summary.totalCount}건의 확인 항목이 있습니다.` : "확인할 항목이 없습니다."}</span>
        </div>
        <span className={styles.notificationTotal}>{summary.totalCount ? `${summary.totalCount}건` : "정상"}</span>
      </div>
      <div className={styles.notificationList}>
        {summary.items.map((item) => (
          <button
            className={`${styles.notificationItem} ${item.count === 0 ? styles.notificationItemMuted : ""}`}
            key={item.label}
            type="button"
            onClick={() => onOpenPage(item.page)}
          >
            <span className={`${styles.notificationDot} ${styles[item.tone]}`} aria-hidden="true" />
            <span>
              <strong>{item.label}</strong>
              <small>{item.count > 0 ? "확인이 필요합니다" : "처리할 항목 없음"}</small>
            </span>
            <b>{item.count}건</b>
          </button>
        ))}
      </div>
    </div>
  );
}

export default App;
