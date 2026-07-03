import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Bell, Home, Layers3, LogOut, Menu, Search, Settings, UserRound, X } from "lucide-react";
import { navItems } from "./constants/navigation.js";
import { ModalRoot } from "./components/modals/ModalRoot.jsx";
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
  const routeContestId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return routeContestParam ?? params.get("contest");
  }, [location.search, routeContestParam]);
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

    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

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

  const notify = (message) => setToast({ id: Date.now(), message });
  const openModal = (type, payload = {}) => setModal({ type, payload });
  const closeModal = () => setModal(null);

  const handleLogin = (form) => {
    const nextSession = login(form);
    navigate(nextSession.role === "admin" ? getAdminPath("dashboard") : getParticipantPath());
    notify(nextSession.role === "admin" ? "관리자 계정으로 로그인했습니다." : "참가자 계정으로 로그인했습니다.");
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
    notify(result.message);
    closeModal();
  };

  const handleApplyContest = (form) => {
    const result = competition.applyContest(form, session);
    notify(result.message);
    return result.ok;
  };

  const handleUpdateTeamStatus = (teamId, status) => {
    const result = competition.updateTeamStatus(teamId, status);
    notify(result.message);
  };

  const handleAddSubmission = (form) => {
    const result = competition.addSubmission(form);
    notify(result.message);
    closeModal();
  };

  const handleGenerateHashes = () => {
    const result = competition.generateSubmissionHashes(selectedContestId);
    notify(result.message);
  };

  const handleAddJudge = (form) => {
    const result = competition.addJudge(form);
    notify(result.message);
    closeModal();
  };

  const handleUpdateJudge = (form) => {
    const result = competition.updateJudge(form);
    notify(result.message);
    closeModal();
  };

  const handleDeleteJudge = (judgeId) => {
    const result = competition.deleteJudge(judgeId);
    notify(result.message);
    closeModal();
  };

  const handleBatchAssignJudges = () => {
    const result = competition.batchAssignJudges(selectedContestId);
    notify(result.message);
  };

  const handleSendReminder = () => {
    const result = competition.sendReviewReminders(selectedContestId);
    notify(result.message);
  };

  const handleSubmitJudgeReview = ({ contestId, judgeName, reviewedCount, averageScore, records = [] }) => {
    const result = competition.submitJudgeReview({ contestId, judgeName, reviewedCount, averageScore, records });
    notify(result.message);
  };

  const handleCalculateResults = () => {
    const result = competition.calculateResults(selectedContestId);
    if (result.ok) {
      navigatePage(result.routePage, selectedContestId);
    }
    notify(result.message);
  };

  const handleConfirmAwards = () => {
    const result = competition.confirmAwards(selectedContestId);
    notify(result.message);
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
      notify(result.message);
      return;
    }

    if (label === "수상 명단") {
      const result = exportAwardsCsv({
        contest: selectedContest,
        awardCandidates: awardRecords.filter((candidate) => candidate.contestId === selectedContestId)
      });
      notify(result.message);
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
        {toast && <div className={styles.toast} role="status">{toast.message}</div>}
      </>
    );
  }

  if (isReviewRoute) {
    return (
      <>
        <ReviewerPage
          contestId={routeContestParam}
          contests={contestRecords}
          judgingAssignments={judgeRecords}
          submissions={submissionRecords}
          reviewScores={reviewRecords}
          onSubmitReview={handleSubmitJudgeReview}
        />
        {toast && <div className={styles.toast} role="status">{toast.message}</div>}
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
          {toast && <div className={styles.toast} role="status">{toast.message}</div>}
        </>
      );
    }

    return (
      <>
        <ParticipantPortal
          session={session}
          contests={contestRecords}
          teams={teamRecords}
          onOpenPublicPage={openContestDetailPage}
          onLogout={handleLogout}
        />
        {toast && <div className={styles.toast} role="status">{toast.message}</div>}
      </>
    );
  }

  if (session?.role !== "admin") {
    return (
      <>
        <LoginPage preferredRole="admin" session={session} onLogin={handleLogin} onContinue={handleContinueSession} />
        {toast && <div className={styles.toast} role="status">{toast.message}</div>}
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
            <label className={styles.searchBox}>
              <Search size={17} aria-hidden="true" />
              <input type="search" placeholder="대회, 팀, 제출물 검색" />
            </label>
            <div className={styles.notificationRoot} ref={notificationRef}>
              <IconButton
                label="알림"
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

function NotificationPopover({ summary, onOpenPage }) {
  return (
    <div className={styles.notificationPopover} id="notification-popover" role="dialog" aria-label="운영 알림">
      <div className={styles.notificationHeader}>
        <div>
          <strong>운영 알림</strong>
          <span>{summary.totalCount ? `${summary.totalCount}건의 확인 항목이 있습니다.` : "확인할 운영 알림이 없습니다."}</span>
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
