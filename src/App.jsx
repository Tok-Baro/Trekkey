import React, { lazy, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Bell, Home, Layers3, LogOut, Menu, Search, ShieldCheck, UserRound, X } from "lucide-react";
import { navItems } from "./constants/navigation.js";
import { ModalRoot } from "./components/modals/ModalRoot.jsx";
import { AppFooter } from "./components/common/AppFooter.jsx";
import { IconButton } from "./components/common/CommonUi.jsx";
import { getApiErrorMessage } from "./api/backendApi.js";
import { getContestWithPublicFields } from "./lib/contest.js";
import { getCredentialVerificationPath } from "./components/credential/CredentialVerificationLink.jsx";
import { exportAwardsCsv, exportSubmissionsCsv } from "./lib/exportCsv.js";
import { useCompetitionStore } from "./hooks/useCompetitionStore.js";
import { useAdminData } from "./hooks/useAdminData.js";
import { useParticipantData } from "./hooks/useParticipantData.js";
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

const lazyNamed = (loader, name) => lazy(() => loader().then((module) => ({ default: module[name] })));
const AwardsPage = lazyNamed(() => import("./pages/admin/AwardsPage.jsx"), "AwardsPage");
const ContestsPage = lazyNamed(() => import("./pages/admin/ContestsPage.jsx"), "ContestsPage");
const CredentialsPage = lazyNamed(() => import("./pages/admin/CredentialsPage.jsx"), "CredentialsPage");
const DashboardPage = lazyNamed(() => import("./pages/admin/DashboardPage.jsx"), "DashboardPage");
const JudgingPage = lazyNamed(() => import("./pages/admin/JudgingPage.jsx"), "JudgingPage");
const SubmissionsPage = lazyNamed(() => import("./pages/admin/SubmissionsPage.jsx"), "SubmissionsPage");
const TeamsPage = lazyNamed(() => import("./pages/admin/TeamsPage.jsx"), "TeamsPage");
const EvidenceVerificationPage = lazyNamed(
  () => import("./pages/admin/EvidenceVerificationPage.jsx"),
  "EvidenceVerificationPage"
);
const RootAdminPage = lazyNamed(() => import("./pages/root/RootAdminPage.jsx"), "RootAdminPage");
const LoginPage = lazyNamed(() => import("./pages/auth/LoginPage.jsx"), "LoginPage");
const HomePage = lazyNamed(() => import("./pages/home/HomePage.jsx"), "HomePage");
const ParticipantPortal = lazyNamed(() => import("./pages/participant/ParticipantPortal.jsx"), "ParticipantPortal");
const ContestPublicDetailPage = lazyNamed(
  () => import("./pages/public/ContestPublicDetailPage.jsx"),
  "ContestPublicDetailPage"
);
const ReviewerPage = lazyNamed(() => import("./pages/review/ReviewerPage.jsx"), "ReviewerPage");
const ServerReviewerPage = lazyNamed(() => import("./pages/review/ServerReviewerPage.jsx"), "ServerReviewerPage");

function saveDownloadedFile(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName || "submission-file";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const rootNavItems = [
  { id: "root", label: "관리자 계정", icon: ShieldCheck }
];

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { contestId: routeContestParam } = useParams();
  const isServerReviewRoute = location.pathname === "/judge/review";
  const isReviewRoute = location.pathname.startsWith("/review/");
  const isContestDetailRoute = location.pathname.startsWith("/contest/");
  const isHomeRoute = location.pathname === "/home";
  const isLoginRoute = location.pathname === getLoginPath();
  const isParticipantRoute = location.pathname.startsWith(getParticipantPath());
  const activePage = isReviewRoute ? "review" : isContestDetailRoute ? "contestDetail" : getPageFromPath(location.pathname);
  const activeParticipantPage = isParticipantRoute ? getParticipantPageFromPath(location.pathname) : "discover";
  const routeContestId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return routeContestParam ?? params.get("contest");
  }, [location.search, routeContestParam]);
  const routeRoundId = useMemo(() => new URLSearchParams(location.search).get("round"), [location.search]);
  const { session, isReady: isAuthReady, login, logout } = useSessionStore();
  const competition = useCompetitionStore();
  const isRootAdmin = isAuthReady && session?.serverRole === "ROOT_ADMIN" && session?.authSource === "server";
  const isServerAdmin =
    isAuthReady &&
    ["ADMIN", "ROOT_ADMIN"].includes(session?.serverRole) &&
    session?.authSource === "server";
  const isServerParticipant =
    isAuthReady &&
    session?.role === "participant" &&
    session?.authSource === "server";
  const admin = useAdminData({
    enabled: isServerAdmin && !["root", "evidence"].includes(activePage),
    loadScope: !["credentials", "evidence"].includes(activePage)
  });
  const participant = useParticipantData({
    session,
    enabled: isServerParticipant
  });
  const {
    contestRecords,
    teamRecords,
    submissionRecords,
    judgeRecords,
    reviewRecords,
    reviewRecordsError,
    awardRecords,
    selectedContest,
    selectedContestId,
    setSelectedContestId
  } = isServerAdmin ? admin : competition;
  const homeContestRecords = isServerParticipant ? participant.contests : contestRecords;
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [isLoginSubmitting, setIsLoginSubmitting] = useState(false);
  const [participantPortalVersion, setParticipantPortalVersion] = useState(0);
  const notificationRef = useRef(null);
  const participantApplicationUpdateRef = useRef(null);
  const visibleNavItems = isRootAdmin ? [...navItems, ...rootNavItems] : navItems;
  const displayedAdminPage = activePage;

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

  useEffect(() => {
    if (
      !isAuthReady ||
      session?.role !== "participant" ||
      !isContestDetailRoute ||
      !routeContestParam
    ) {
      return;
    }

    participant.loadContestDetail(routeContestParam, { trackView: true }).catch(() => undefined);
  }, [isAuthReady, isContestDetailRoute, participant.loadContestDetail, routeContestParam, session?.role]);

  useEffect(() => {
    if (
      !isAuthReady ||
      !["ADMIN", "ROOT_ADMIN"].includes(session?.serverRole) ||
      session?.authSource !== "server" ||
      !isContestDetailRoute ||
      !routeContestParam
    ) {
      return;
    }
    admin.setSelectedContestId(routeContestParam);
  }, [admin.setSelectedContestId, isAuthReady, isContestDetailRoute, routeContestParam, session?.authSource, session?.serverRole]);

  const notify = (message, tone = "info") => setToast({ id: Date.now(), message, tone });
  const notifyResult = (result) => notify(result.message, result.ok === false ? "error" : "success");
  const openModal = (type, payload = {}) => {
    if (isServerAdmin && type === "contest" && payload.contest && !payload.contest.isDetailLoaded) {
      const contestId = payload.contest.id;
      admin.loadSelectedContest(contestId)
        .then((result) => {
          admin.setSelectedContestId(contestId);
          setModal({ type, payload: { ...payload, contest: result.contest } });
        })
        .catch((error) => notify(getApiErrorMessage(error, "대회 상세 정보를 불러오지 못했습니다."), "error"));
      return;
    }
    if (isServerAdmin && type === "submission") {
      notify("관리자 수동 제출물 접수 API는 develop에 구현되어 있지 않습니다.");
      return;
    }
    if (isServerAdmin && type === "reviewLink" && !payload.judge) {
      notify("심사 링크는 심사 화면의 심사위원 카드에서 개별 발급해 주세요.");
      return;
    }
    if (isServerAdmin && type === "settings") {
      notify("현재 운영 설정 화면은 로컬 데모용이라 실제 관리자 데이터에서는 사용할 수 없습니다.");
      return;
    }
    if (isServerAdmin && type === "judge" && payload.judge) {
      notify("심사위원 수정 API는 develop에 구현되어 있지 않습니다.");
      return;
    }
    setModal({ type, payload });
  };
  const closeModal = () => setModal(null);

  const handleLogin = async (form) => {
    setIsLoginSubmitting(true);
    try {
      const nextSession = await login(form);
      navigate(
        nextSession.serverRole === "ROOT_ADMIN"
          ? getAdminPath("root")
          : nextSession.role === "admin"
            ? getAdminPath("dashboard")
            : getParticipantPath()
      );
      notify(nextSession.role === "admin" ? "관리자 계정으로 로그인했습니다." : "참가자 계정으로 로그인했습니다.", "success");
    } catch (error) {
      notify(getApiErrorMessage(error, "로그인하지 못했습니다."), "error");
    } finally {
      setIsLoginSubmitting(false);
    }
  };

  const handleContinueSession = () => {
    if (!session) {
      return;
    }

    navigate(
      session.serverRole === "ROOT_ADMIN"
        ? getAdminPath("root")
        : session.role === "admin"
          ? getAdminPath("dashboard")
          : getParticipantPath()
    );
  };

  const handleLogout = async () => {
    await logout();
    setModal(null);
    setIsSidebarOpen(false);
    navigate(getLoginPath());
    notify("로그아웃했습니다.", "success");
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

  const handleSaveContest = async (form) => {
    if (isServerAdmin) {
      try {
        const result = await admin.saveContest(form);
        notify(result.message, "success");
        closeModal();
        navigate(getAdminPath("contests", result.contestId));
        return true;
      } catch (error) {
        notify(getApiErrorMessage(error, "대회 설정을 저장하지 못했습니다."), "error");
        return false;
      }
    }
    const result = competition.saveContest(form);
    if (result.routePage) {
      navigate(getAdminPath(result.routePage, result.selectedContestId));
    }
    notifyResult(result);
    closeModal();
    return true;
  };

  const handleApplyContest = async (form) => {
    if (isServerParticipant) {
      const { contestId, ...request } = form;
      try {
        await participant.applyToContest(contestId, request);
        notify("참가 신청을 접수했습니다.", "success");
        return true;
      } catch (error) {
        notify(getApiErrorMessage(error, "참가 신청을 접수하지 못했습니다."), "error");
        return false;
      }
    }

    if (session?.role === "participant") {
      const result = competition.applyContest(form, session);
      notifyResult(result);
      return result.ok;
    }

    notify("관리자 계정에서는 참가 신청을 할 수 없습니다.", "error");
    return false;
  };

  const handleRecordContestView = (contestId) => {
    if (!isServerAdmin) {
      competition.recordContestView(contestId, session);
    }
  };

  const handleToggleContestLike = async (contestId) => {
    if (isServerParticipant) {
      try {
        const result = await participant.toggleLike(contestId);
        notify(result.likedByMe ? "관심 대회에 추가했습니다." : "관심 대회에서 제외했습니다.", "success");
      } catch (error) {
        notify(getApiErrorMessage(error, "좋아요를 변경하지 못했습니다."), "error");
      }
      return;
    }

    if (session?.role === "participant") {
      notifyResult(competition.toggleContestLike(contestId, session));
      return;
    }

    notify("좋아요는 참가자 계정에서 사용할 수 있습니다.", "error");
  };

  const handleUpdateParticipantApplication = (contestPublicId, patch) => {
    const applicationTeam = participant.teams.find(
      (team) => team.contestId === contestPublicId || team.id === contestPublicId
    );
    if (applicationTeam?.myRole !== "LEADER") {
      notify("대표자만 신청 정보를 수정할 수 있습니다.", "error");
      return false;
    }
    if (applicationTeam.participationFinalizedAt) {
      notify("참가 명단이 확정되어 신청 정보를 수정할 수 없습니다.", "error");
      return false;
    }
    if (participantApplicationUpdateRef.current) {
      return false;
    }
    const request = participant.updateMyApplication(contestPublicId, {
      teamName: patch.name,
      leaderName: patch.leader,
      major: patch.major,
      memberUserIds: patch.memberUserIds ?? [],
      contactEmail: patch.applicantEmail,
      phone: patch.phone,
      motivation: patch.motivation
    })
      .then(() => {
        notify("신청 정보를 수정했습니다.", "success");
        setParticipantPortalVersion((current) => current + 1);
      })
      .catch((error) => {
        notify(getApiErrorMessage(error, "신청 정보를 수정하지 못했습니다."), "error");
      })
      .finally(() => {
        if (participantApplicationUpdateRef.current === request) {
          participantApplicationUpdateRef.current = null;
        }
      });
    participantApplicationUpdateRef.current = request;
    return false;
  };

  const handleParticipantSubmission = async (contestId, _teamId, form) => {
    try {
      await participant.submitSubmission(contestId, form);
      notify("제출물을 접수했습니다.", "success");
      return true;
    } catch (error) {
      notify(getApiErrorMessage(error, "제출물을 접수하지 못했습니다."), "error");
      return false;
    }
  };

  const handleParticipantSubmissionDownload = async (file) => {
    try {
      await participant.downloadSubmissionAttachment(file);
      notify("파일 다운로드를 시작했습니다.", "success");
    } catch (error) {
      notify(getApiErrorMessage(error, "파일을 다운로드하지 못했습니다."), "error");
    }
  };

  const handleUpdateTeamStatus = async (teamId, status, revisionReason) => {
    try {
      const result = await admin.updateTeamStatus(teamId, status, revisionReason);
      notify(result.message, "success");
      return true;
    } catch (error) {
      notify(getApiErrorMessage(error, "신청 상태를 변경하지 못했습니다."), "error");
      return false;
    }
  };

  const handleFinalizeTeam = async (teamId) => {
    try {
      const result = await admin.finalizeTeam(teamId);
      notify(result.message, "success");
      closeModal();
      return true;
    } catch (error) {
      notify(getApiErrorMessage(error, "참가 명단을 확정하지 못했습니다."), "error");
      return false;
    }
  };

  const handleAddSubmission = () => {
    notify("관리자 수동 제출물 접수 API는 develop에 구현되어 있지 않습니다.");
  };

  const handleGenerateHashes = () => {
    notify("파일 해시는 제출 시 서버에서 생성되며 별도 생성 API는 없습니다.");
  };

  const handleAddJudge = async (form) => {
    try {
      const result = await admin.addJudge(form);
      notify(result.message, "success");
      closeModal();
    } catch (error) {
      notify(getApiErrorMessage(error, "심사위원을 추가하지 못했습니다."), "error");
    }
  };

  const handleUpdateJudge = () => {
    notify("심사위원 수정 API는 develop에 구현되어 있지 않습니다.");
  };

  const handleDeleteJudge = async (judgeId) => {
    try {
      const result = await admin.deleteJudge(judgeId);
      notify(result.message, "success");
      closeModal();
    } catch (error) {
      notify(getApiErrorMessage(error, "심사위원을 삭제하지 못했습니다."), "error");
    }
  };

  const handlePrepareReviewEntries = async (round, submissionPublicIds = []) => {
    if (round.targetType === "manual" && submissionPublicIds.length === 0) {
      openModal("prepareReviewEntries", { round });
      return false;
    }
    try {
      const result = await admin.prepareReviewEntries(round, submissionPublicIds);
      notify(result.message, "success");
      closeModal();
      return true;
    } catch (error) {
      notify(getApiErrorMessage(error, "평가 대상을 준비하지 못했습니다."), "error");
      return false;
    }
  };

  const handleResetReviewEntries = (round) => {
    openModal("resetReviewEntries", { round });
  };

  const handleConfirmResetReviewEntries = async (round) => {
    try {
      const result = await admin.resetReviewEntries(round);
      notify(result.message, "success");
      closeModal();
      return true;
    } catch (error) {
      notify(getApiErrorMessage(error, "평가 대상을 초기화하지 못했습니다."), "error");
      return false;
    }
  };

  const handleBatchAssignJudges = async (round) => {
    try {
      const result = await admin.prepareReviewAssignments(round);
      notify(result.message, "success");
    } catch (error) {
      notify(getApiErrorMessage(error, "심사 대상을 배정하지 못했습니다."), "error");
    }
  };

  const handleIssueReviewLink = (judge, round) => {
    openModal("reviewLink", { judge, round, contest: selectedContest });
  };

  const handleCreateReviewLink = async (judgeId, expiresAt) => {
    try {
      const result = await admin.issueReviewLink(judgeId, expiresAt);
      notify(result.message, "success");
      return result.link;
    } catch (error) {
      notify(getApiErrorMessage(error, "심사 링크를 발급하지 못했습니다."), "error");
      return null;
    }
  };

  const handleRevokeReviewLink = async (judgeId) => {
    try {
      const result = await admin.revokeReviewLink(judgeId);
      notify(result.message, "success");
      closeModal();
      return true;
    } catch (error) {
      notify(getApiErrorMessage(error, "심사 링크를 폐기하지 못했습니다."), "error");
      return false;
    }
  };

  const handleOpenReviewRound = (round) => {
    openModal("openReviewRound", { round });
  };

  const handleConfirmOpenReviewRound = async (round) => {
    try {
      const result = await admin.openReviewRound(round);
      notify(result.message, "success");
      closeModal();
      return true;
    } catch (error) {
      notify(getApiErrorMessage(error, "심사 라운드를 시작하지 못했습니다."), "error");
      return false;
    }
  };

  const handleExtendReviewRound = (round) => {
    openModal("extendReviewRound", { round });
  };

  const handleConfirmExtendReviewRound = async (round, endsAt) => {
    try {
      const result = await admin.extendReviewRoundDeadline(round, endsAt);
      notify(result.message, "success");
      closeModal();
      return true;
    } catch (error) {
      notify(getApiErrorMessage(error, "심사 마감 시각을 연장하지 못했습니다."), "error");
      return false;
    }
  };

  const handleUpdateStageStatus = async (stageId, status) => {
    try {
      const result = await admin.updateStageStatus(stageId, status);
      notify(result.message, "success");
      return true;
    } catch (error) {
      notify(getApiErrorMessage(error, "대회 단계 상태를 변경하지 못했습니다."), "error");
      return false;
    }
  };

  const handleListReviewAssignments = (round, judgeId) => admin.listReviewAssignments(round, judgeId);

  const handleCancelReviewAssignment = async (round, judgeId, assignmentId) => {
    try {
      const result = await admin.cancelReviewAssignment(round, judgeId, assignmentId);
      notify(result.message, "success");
      return true;
    } catch (error) {
      notify(getApiErrorMessage(error, "심사 배정을 취소하지 못했습니다."), "error");
      return false;
    }
  };

  const handleReassignReviewAssignment = async (round, judgeId, assignmentId, dueAt) => {
    try {
      const result = await admin.reassignReviewAssignment(round, judgeId, assignmentId, dueAt);
      notify(result.message, "success");
      return true;
    } catch (error) {
      notify(getApiErrorMessage(error, "심사 대상을 다시 배정하지 못했습니다."), "error");
      return false;
    }
  };

  const handleUpdateReviewAssignmentDueAt = async (round, judgeId, assignmentId, dueAt) => {
    try {
      const result = await admin.updateReviewAssignmentDueAt(round, judgeId, assignmentId, dueAt);
      notify(result.message, "success");
      return true;
    } catch (error) {
      notify(getApiErrorMessage(error, "심사 배정 마감 시각을 변경하지 못했습니다."), "error");
      return false;
    }
  };

  const handleSubmitJudgeReview = ({ contestId, roundId, judgeName, reviewedCount, averageScore, records = [] }) => {
    if (session?.authSource === "server") {
      notify("실제 심사는 심사위원별 접근 토큰 화면을 연결한 뒤 제출할 수 있습니다.");
      return false;
    }
    const result = competition.submitJudgeReview({ contestId, roundId, judgeName, reviewedCount, averageScore, records });
    notifyResult(result);
    return result.ok !== false;
  };

  const handleCalculateResults = (round) => {
    if (!isServerAdmin) {
      notify("결과 산출은 관리자 서버 계정에서 사용할 수 있습니다.");
      return;
    }
    const targetRound = round?.serverId
      ? round
      : selectedContest.evaluationRounds?.[selectedContest.evaluationRounds.length - 1];
    if (!targetRound) {
      notify("결과를 산출할 심사 라운드가 없습니다.");
      return;
    }
    openModal("finalizeReviewRound", {
      round: targetRound,
      entries: admin.reviewEntriesByRoundId[targetRound.id] ?? []
    });
  };

  const handleConfirmReviewResults = async (round, manualDecisions = []) => {
    try {
      const result = await admin.finalizeReviewRound(round, manualDecisions);
      notify(result.message, "success");
      closeModal();
      return true;
    } catch (error) {
      notify(getApiErrorMessage(error, "심사 결과를 산출하지 못했습니다."), "error");
      return false;
    }
  };

  const handleConfirmAwards = async () => {
    if (!isServerAdmin) {
      const result = competition.confirmAwards(selectedContestId);
      notifyResult(result);
      if (result.ok !== false) {
        closeModal();
      }
      return;
    }

    try {
      const result = await admin.confirmAwards(selectedContestId);
      notify(result.message, "success");
      closeModal();
    } catch (error) {
      notify(getApiErrorMessage(error, "수상 결과를 확정하지 못했습니다."), "error");
    }
  };

  const handleUpdateAwardCandidate = async (candidate, request) => {
    if (!isServerAdmin) {
      const result = competition.updateAwardCandidate(candidate, request);
      notifyResult(result);
      return result.ok !== false;
    }

    try {
      const result = await admin.updateAwardCandidate(candidate.id, request);
      notify(result.message, "success");
      return true;
    } catch (error) {
      notify(getApiErrorMessage(error, "수상 후보를 변경하지 못했습니다."), "error");
      return false;
    }
  };

  const handleAdminSubmissionDownload = async (submission) => {
    const attachments = submission?.attachments ?? [];
    if (attachments.length === 0) {
      notify("다운로드할 파일이 없습니다.", "error");
      return;
    }

    try {
      for (const file of attachments) {
        const download = await admin.downloadSubmissionFile(file);
        saveDownloadedFile(download.blob, download.fileName);
      }
      notify(attachments.length === 1 ? "파일 다운로드를 시작했습니다." : `${attachments.length}개 파일 다운로드를 시작했습니다.`, "success");
    } catch (error) {
      notify(getApiErrorMessage(error, "제출물을 다운로드하지 못했습니다."), "error");
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

  if (isHomeRoute) {
    return <HomePage contests={homeContestRecords} onOpenContest={openContestDetailPage} />;
  }

  if (isLoginRoute) {
    return (
      <>
        <LoginPage
          preferredRole={session?.role ?? "admin"}
          session={session}
          onLogin={handleLogin}
          onContinue={handleContinueSession}
          isSubmitting={isLoginSubmitting}
        />
        <Toast toast={toast} onClose={() => setToast(null)} />
      </>
    );
  }

  if (isServerReviewRoute) {
    return <ServerReviewerPage />;
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
    if (!isAuthReady) {
      return <AuthLoadingScreen />;
    }

    const sourceContest = isServerParticipant
      ? participant.detailById[routeContestParam]
      : isServerAdmin
        ? contestRecords.find((contest) => contest.id === routeContestParam)
        : competition.contestRecords.find((contest) => contest.id === routeContestParam);
    const sourceTeams = isServerParticipant ? participant.teams : teamRecords;
    const usesLocalContestData = !isServerParticipant && !isServerAdmin;
    return (
      <>
        <ContestPublicDetailPage
          contest={sourceContest ? getContestWithPublicFields(sourceContest) : null}
          session={session}
          teams={sourceTeams}
          onApplyContest={handleApplyContest}
          onRecordView={usesLocalContestData ? handleRecordContestView : undefined}
          onToggleLike={handleToggleContestLike}
          onSearchParticipants={isServerParticipant ? participant.searchParticipants : undefined}
          isLoading={isServerParticipant
            ? participant.detailLoadingById[routeContestParam] ||
              (!sourceContest && !participant.detailErrorById[routeContestParam])
            : isServerAdmin && !admin.error && (admin.isLoading || !sourceContest?.isDetailLoaded)}
          isApplicationDataLoading={isServerParticipant && participant.isLoading}
          loadError={isServerParticipant ? participant.detailErrorById[routeContestParam] : isServerAdmin ? admin.error : ""}
          onNotify={notify}
          onBack={() =>
            navigate(
              !session
                ? "/home"
                : session.role === "participant"
                  ? getParticipantPath()
                  : getAdminPath("contests", routeContestParam)
            )
          }
        />
        <Toast toast={toast} onClose={() => setToast(null)} />
      </>
    );
  }

  if (isParticipantRoute) {
    if (!isAuthReady) {
      return <AuthLoadingScreen />;
    }

    if (session?.role !== "participant") {
      return (
        <>
          <LoginPage
            preferredRole="participant"
            session={session}
            onLogin={handleLogin}
            onContinue={handleContinueSession}
            isSubmitting={isLoginSubmitting}
          />
          <Toast toast={toast} onClose={() => setToast(null)} />
        </>
      );
    }

    if (participant.isLoading && participant.contests.length === 0 && participant.teams.length === 0) {
      return <ParticipantDataScreen />;
    }

    if (participant.error && participant.contests.length === 0 && participant.teams.length === 0) {
      return (
        <ParticipantDataScreen
          error={participant.error}
          onRetry={participant.loadOverview}
          onLogout={handleLogout}
        />
      );
    }

    return (
      <>
        <ParticipantPortal
          key={`${session.id}:${participantPortalVersion}`}
          session={session}
          contests={participant.contests}
          teams={participant.teams}
          submissions={participant.submissions}
          awardCandidates={participant.awardCandidates}
          credentials={participant.credentials}
          credentialError={participant.credentialError}
          activeView={activeParticipantPage}
          onOpenPublicPage={openContestDetailPage}
          onToggleLike={handleToggleContestLike}
          onNavigate={navigateParticipantPage}
          onUpdateApplication={handleUpdateParticipantApplication}
          onSearchParticipants={participant.searchParticipants}
          onSubmitSubmission={handleParticipantSubmission}
          onDownloadSubmissionFile={handleParticipantSubmissionDownload}
          onLogout={handleLogout}
        />
        <Toast toast={toast} onClose={() => setToast(null)} />
      </>
    );
  }

  if (!isAuthReady) {
    return <AuthLoadingScreen />;
  }

  if (session?.role !== "admin" || session.authSource !== "server") {
    return (
      <>
        <LoginPage
          preferredRole="admin"
          session={session}
          onLogin={handleLogin}
          onContinue={handleContinueSession}
          isSubmitting={isLoginSubmitting}
        />
        <Toast toast={toast} onClose={() => setToast(null)} />
      </>
    );
  }

  if (!["root", "evidence"].includes(displayedAdminPage) && admin.isLoading) {
    return <AdminDataScreen />;
  }

  if (!["root", "evidence"].includes(displayedAdminPage) && admin.error) {
    return (
      <AdminDataScreen
        error={admin.error}
        onRetry={contestRecords.length > 0
          ? () => admin.loadSelectedContest(selectedContestId)
          : admin.loadOverview}
        onLogout={handleLogout}
      />
    );
  }

  const ActiveIcon = visibleNavItems.find((item) => item.id === displayedAdminPage)?.icon ?? Home;

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
            <span>{isRootAdmin ? "통합 관리자 콘솔" : "대회관리 콘솔"}</span>
          </div>
          <button className={styles.sidebarClose} type="button" aria-label="메뉴 닫기" onClick={() => setIsSidebarOpen(false)}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <nav className={styles.navList}>
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`${styles.navItem} ${displayedAdminPage === item.id ? styles.navItemActive : ""}`}
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
              <span>{isRootAdmin ? "최고 관리자 계정" : "관리자 계정"}</span>
            </div>
          </div>
          <div className={styles.sidebarFooterActions}>
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
                <h1>{getPageHeading(displayedAdminPage)}</h1>
              </div>
            </div>
          </div>

          <div className={styles.topbarActions}>
            {displayedAdminPage !== "root" && (
              <>
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
              </>
            )}
          </div>
        </header>

        <main className={styles.contentArea} data-page={displayedAdminPage} key={displayedAdminPage}>
          {displayedAdminPage === "root" && (
            <RootAdminPage session={session} onNotify={notify} />
          )}
          {displayedAdminPage === "dashboard" && (
            <DashboardPage
              contests={contestRecords}
              teams={teamRecords}
              submissions={submissionRecords}
              judgingAssignments={judgeRecords}
              awardCandidates={awardRecords}
              selectedContestId={isServerAdmin ? selectedContestId : null}
              onNavigate={navigatePage}
              openModal={openModal}
            />
          )}
          {displayedAdminPage === "contests" && (
            <ContestsPage
              contests={contestRecords}
              teams={teamRecords}
              submissions={submissionRecords}
              judgingAssignments={judgeRecords}
              awardCandidates={awardRecords}
              reviewScores={reviewRecords}
              reviewScoresError={reviewRecordsError}
              selectedContestId={selectedContestId}
              setSelectedContestId={selectContest}
              selectedContest={selectedContest}
              onNavigate={navigatePage}
              onOpenPublicPage={openContestDetailPage}
              openModal={openModal}
              onGenerateHashes={handleGenerateHashes}
              onCalculateResults={handleCalculateResults}
              serverBacked={isServerAdmin}
            />
          )}
          {displayedAdminPage === "teams" && (
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
          {displayedAdminPage === "submissions" && (
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
              onDownloadSubmission={handleAdminSubmissionDownload}
              serverBacked={isServerAdmin}
            />
          )}
          {displayedAdminPage === "judging" && (
            <JudgingPage
              contests={contestRecords}
              judgingAssignments={judgeRecords}
              submissions={submissionRecords}
              reviewScores={reviewRecords}
              reviewScoresError={reviewRecordsError}
              selectedContest={selectedContest}
              selectedContestId={selectedContestId}
              setSelectedContestId={selectContest}
              openModal={openModal}
              onPrepareEntries={handlePrepareReviewEntries}
              onResetEntries={handleResetReviewEntries}
              onOpenRound={handleOpenReviewRound}
              onBatchAssign={handleBatchAssignJudges}
              onIssueReviewLink={handleIssueReviewLink}
              onExtendDeadline={handleExtendReviewRound}
              onCalculateResults={handleCalculateResults}
            />
          )}
          {displayedAdminPage === "awards" && (
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
          {displayedAdminPage === "credentials" && (
            <CredentialsPage
              contests={contestRecords}
              selectedContest={selectedContest}
              selectedContestId={selectedContestId}
              setSelectedContestId={selectContest}
              onOpenCredential={(credentialPublicId) =>
                navigate(getCredentialVerificationPath(credentialPublicId))
              }
              onNotify={notify}
            />
          )}
          {displayedAdminPage === "evidence" && (
            <EvidenceVerificationPage onNotify={notify} />
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
        onFinalizeTeam={handleFinalizeTeam}
        onAddSubmission={handleAddSubmission}
        onAddJudge={handleAddJudge}
        onUpdateJudge={handleUpdateJudge}
        onDeleteJudge={handleDeleteJudge}
        onUpdateAward={handleUpdateAwardCandidate}
        onConfirmAwards={handleConfirmAwards}
        onDownloadSubmission={handleAdminSubmissionDownload}
        onNotify={notify}
        serverBacked={isServerAdmin}
        onPrepareReviewEntries={handlePrepareReviewEntries}
        onResetReviewEntries={handleConfirmResetReviewEntries}
        onOpenReviewRound={handleConfirmOpenReviewRound}
        onIssueReviewLink={handleCreateReviewLink}
        onRevokeReviewLink={handleRevokeReviewLink}
        onFinalizeReviewRound={handleConfirmReviewResults}
        onExtendReviewRoundDeadline={handleConfirmExtendReviewRound}
        onUpdateStageStatus={handleUpdateStageStatus}
        onListReviewAssignments={handleListReviewAssignments}
        onCancelReviewAssignment={handleCancelReviewAssignment}
        onReassignReviewAssignment={handleReassignReviewAssignment}
        onUpdateReviewAssignmentDueAt={handleUpdateReviewAssignmentDueAt}
      />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

function AuthLoadingScreen() {
  return (
    <main className="contest-public-page">
      <section className="public-empty" aria-live="polite">
        <Layers3 size={34} aria-hidden="true" />
        <h1>로그인 정보를 확인하는 중입니다</h1>
      </section>
    </main>
  );
}

function ParticipantDataScreen({ error = "", onRetry, onLogout }) {
  return (
    <main className="contest-public-page">
      <section className="public-empty" aria-live="polite">
        <Layers3 size={34} aria-hidden="true" />
        <h1>{error ? "참가자 정보를 불러오지 못했습니다" : "참가자 정보를 불러오는 중입니다"}</h1>
        {error && <p>{error}</p>}
        {error && (
          <div className="modal-actions">
            <button className="secondary-button" type="button" onClick={onLogout}>
              로그아웃
            </button>
            <button className="primary-button" type="button" onClick={() => onRetry?.().catch(() => undefined)}>
              다시 시도
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

function AdminDataScreen({ error = "", onRetry, onLogout }) {
  return (
    <main className="contest-public-page">
      <section className="public-empty" aria-live="polite">
        <Layers3 size={34} aria-hidden="true" />
        <h1>{error ? "관리자 정보를 불러오지 못했습니다" : "관리자 정보를 불러오는 중입니다"}</h1>
        {error && <p>{error}</p>}
        {error && (
          <div className="modal-actions">
            <button className="secondary-button" type="button" onClick={onLogout}>
              로그아웃
            </button>
            <button className="primary-button" type="button" onClick={() => onRetry?.().catch(() => undefined)}>
              다시 시도
            </button>
          </div>
        )}
      </section>
    </main>
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
