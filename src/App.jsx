import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Bell, Home, Layers3, LogOut, Menu, Search, Settings, ShieldCheck, UserRound, X } from "lucide-react";
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
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);

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
    notify("미완료 심사위원에게 독촉 알림을 발송했습니다.");
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
    closeModal();
  };

  const handleExport = (label) => {
    notify(`${label} 내보내기를 준비했습니다.`);
  };

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
          onApplyContest={handleApplyContest}
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
          <ShieldCheck size={18} aria-hidden="true" />
          <div>
            <strong>교내 인증 영역</strong>
            <span>블록체인 연동 예정</span>
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
            <IconButton label="알림">
              <Bell size={18} />
            </IconButton>
            <IconButton label="환경설정">
              <Settings size={18} />
            </IconButton>
            <button className={styles.topbarUserButton} type="button" onClick={handleLogout}>
              <UserRound size={17} aria-hidden="true" />
              <span>{session.name}</span>
              <LogOut size={16} aria-hidden="true" />
            </button>
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

export default App;
