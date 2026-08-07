import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createApplication,
  downloadSubmissionFile,
  getApplicationProgress,
  getContestDetail,
  getTeamSubmission,
  listContests,
  listMyApplications,
  listMyAwards,
  listMyCredentials,
  listMyTeams,
  searchParticipants as searchParticipantsRequest,
  submitTeamSubmission,
  toggleContestLike,
  updateApplication
} from "../api/backendApi.js";

const detailRequests = new Map();
const progressRequests = new Map();

const contestStatus = {
  APPLICATION_OPEN: "접수중",
  REVIEWING: "심사중",
  AWARDED: "수상확정"
};

const participationType = {
  TEAM: "팀전",
  INDIVIDUAL: "개인전",
  BOTH: "개인/팀"
};

const teamStatus = {
  PENDING: "검토중",
  APPROVED: "승인",
  REVISION_REQUESTED: "보완요청",
  REJECTED: "반려"
};

const submissionStatus = {
  DRAFT: "작성중",
  SUBMITTED: "접수완료",
  WITHDRAWN: "철회"
};

const credentialType = {
  PARTICIPATION: "참가 이력",
  WORK: "작품 이력",
  AWARD: "수상 이력"
};

const credentialStatus = {
  READY: "발급 준비",
  BATCHED: "배치 포함",
  ANCHORED: "블록체인 기록 완료",
  REVOKED: "취소",
  SUPERSEDED: "대체"
};

function errorMessage(error, fallback) {
  const fieldError = Array.isArray(error?.data) ? error.data.find((item) => item?.message) : null;
  return fieldError?.message || error?.message || fallback;
}

function shortDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? "");
  return match ? `${match[2]}.${match[3]}` : value || "-";
}

function shortDateTime(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(value ?? "");
  return match ? `${match[2]}.${match[3]} ${match[4]}:${match[5]}` : value || null;
}

function reactionKey(session) {
  return `participant:${session?.studentId || session?.email || session?.name || "guest"}`;
}

function mapContest(contest, session) {
  const id = contest.publicId ?? contest.id;
  const likedByMe = Boolean(contest.likedByMe);
  const startsAt = shortDate(contest.applicationStartsAt);
  const endsAt = shortDate(contest.applicationEndsAt);

  return {
    ...contest,
    id,
    publicId: id,
    status: contestStatus[contest.status] ?? contest.status ?? "상태 미확인",
    type: participationType[contest.participationType] ?? contest.type ?? "개인/팀",
    posterUrl: contest.posterUrl ?? "",
    summary: contest.summary ?? "",
    tags: Array.isArray(contest.tags) ? contest.tags.join(",") : contest.tags ?? "",
    department: contest.department ?? "",
    applicationPeriod: contest.applicationStartsAt || contest.applicationEndsAt ? `${startsAt} - ${endsAt}` : "-",
    submissionDueAt: contest.submissionDueAt ?? contest.submissionDue,
    submissionDue: shortDate(contest.submissionDueAt ?? contest.submissionDue),
    awards: Number(contest.awardCount ?? contest.awards ?? 0),
    views: Number(contest.viewCount ?? contest.views ?? 0),
    likes: Number(contest.likeCount ?? contest.likes ?? 0),
    likedByMe,
    likedBy: likedByMe ? [reactionKey(session)] : []
  };
}

function mapApplication(application, team, session) {
  const contestId = application.contestPublicId;
  const teamMembers = Array.isArray(team?.members) ? team.members.map((member) => ({ ...member })) : [];
  return {
    ...application,
    id: contestId,
    contestId,
    contestPublicId: contestId,
    teamPublicId: team?.teamPublicId,
    name: application.teamName,
    leader: application.leaderName,
    members: Number(application.memberCount ?? team?.memberCount ?? 0),
    status: teamStatus[team?.status ?? application.status] ?? team?.status ?? application.status,
    applicantId: session?.studentId || session?.email || session?.name,
    applicantEmail: application.contactEmail,
    createdAt: shortDateTime(application.createdAt) ?? "-",
    updatedAt: shortDateTime(application.updatedAt),
    myRole: team?.myRole,
    teamMembers,
    revisionReason: team?.revisionReason ?? null,
    participationFinalizedAt: team?.participationFinalizedAt ?? null
  };
}

function fallbackContest(application, session) {
  return mapContest({
    publicId: application.contestPublicId,
    title: application.contestTitle,
    status: "상태 미확인",
    participationType: application.participationType,
    department: application.department,
    summary: "신청한 대회의 상세 정보는 공고에서 확인할 수 있습니다.",
    tags: []
  }, session);
}

function normalizeProgress(progress) {
  return {
    ...progress,
    steps: (progress.steps ?? []).map((step) => ({
      ...step,
      occurredAt: shortDateTime(step.occurredAt)
    }))
  };
}

function requestProgress(sessionId, contestId) {
  const key = `${sessionId}:${contestId}`;
  if (!progressRequests.has(key)) {
    const request = getApplicationProgress(contestId)
      .then(normalizeProgress)
      .finally(() => progressRequests.delete(key));
    progressRequests.set(key, request);
  }
  return progressRequests.get(key);
}

async function loadProgress(applications, sessionId) {
  const entries = await Promise.all(applications.map(async (application) => [
    application.contestPublicId,
    await requestProgress(sessionId, application.contestPublicId)
  ]));
  return Object.fromEntries(entries);
}

async function loadLeaderSubmissions(teams) {
  const entries = await Promise.all(teams
    .filter((team) => team.myRole === "LEADER")
    .map(async (team) => {
      try {
        return [team.teamPublicId, await getTeamSubmission(team.teamPublicId)];
      } catch (error) {
        if (error?.status === 404) {
          return null;
        }
        throw error;
      }
    }));
  return Object.fromEntries(entries.filter(Boolean));
}

function progressSubmission(team, progress) {
  const submission = progress?.steps.find((step) => step.type === "SUBMISSION");
  if (!submission || submission.status === "WAITING") {
    return null;
  }
  const review = progress.steps.find((step) => step.type === "REVIEW");
  return {
    id: `PROGRESS-SUBMISSION-${team.contestId}`,
    contestId: team.contestId,
    team: team.name,
    title: `${team.name} 제출물`,
    attachments: [],
    files: 0,
    submittedAt: submission.occurredAt ?? submission.description,
    review: review?.status === "WAITING" ? "대기" : review?.description ?? submission.description,
    hashReady: false
  };
}

function mapSubmission(submission, team, progress) {
  const review = progress?.steps.find((step) => step.type === "REVIEW");
  return {
    ...submission,
    contestId: team.contestId,
    teamId: submission.teamId,
    team: submission.teamName,
    attachments: (submission.files ?? []).map((file) => ({
      id: file.id,
      name: file.originalName,
      type: file.contentType,
      size: file.sizeBytes,
      checksum: file.sha256
    })),
    files: submission.files?.length ?? 0,
    submittedAt: shortDateTime(submission.submittedAt) ?? "-",
    review: review?.status === "WAITING"
      ? "대기"
      : review?.description ?? submissionStatus[submission.status] ?? submission.status,
    hashReady: Boolean(submission.files?.length) && submission.files.every((file) => file.sha256)
  };
}

function mapAward(award) {
  return {
    ...award,
    contestId: award.contestPublicId,
    teamId: award.teamPublicId,
    team: award.teamName,
    score: award.finalScore,
    status: award.status === "CONFIRMED" ? "확정" : award.status,
    confirmedAt: shortDateTime(award.confirmedAt)
  };
}

function mapCredential(credential) {
  return {
    ...credential,
    id: credential.credentialPublicId,
    typeLabel: credentialType[credential.credentialType] ?? credential.credentialType,
    statusLabel: credentialStatus[credential.status] ?? credential.status,
    issuedAt: shortDateTime(credential.issuedAt) ?? "-"
  };
}

function saveDownloadedFile(blob, name) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name || "submission-file";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function applicationPayload(form, session) {
  return {
    teamName: String(form.teamName ?? form.name ?? session.name).trim(),
    leaderName: String(form.leaderName ?? form.leader ?? session.name).trim(),
    major: String(form.major ?? session.major ?? "").trim(),
    memberUserIds: [...new Set((form.memberUserIds ?? []).map(Number))],
    contactEmail: String(form.contactEmail ?? form.applicantEmail ?? session.email).trim(),
    phone: String(form.phone ?? "").trim(),
    motivation: String(form.motivation ?? "").trim()
  };
}

export function useParticipantData({ session, enabled }) {
  const sessionId = String(session?.id ?? session?.email ?? "guest");
  const requestVersion = useRef(0);
  const [overview, setOverview] = useState({
    contests: [],
    applications: [],
    teams: [],
    submissions: {},
    awards: [],
    credentials: [],
    progress: {}
  });
  const [detailById, setDetailById] = useState({});
  const [detailLoadingById, setDetailLoadingById] = useState({});
  const [detailErrorById, setDetailErrorById] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [credentialError, setCredentialError] = useState(null);

  const loadOverview = useCallback(async () => {
    if (!enabled) {
      return null;
    }
    const version = ++requestVersion.current;
    setIsLoading(true);
    setError(null);
    setCredentialError(null);
    try {
      const [contests, applications, teams, awards, credentialResult] = await Promise.all([
        listContests({ status: "ALL" }),
        listMyApplications(),
        listMyTeams(),
        listMyAwards(),
        listMyCredentials()
          .then((items) => ({ items, error: null }))
          .catch((nextError) => ({
            items: [],
            error: errorMessage(nextError, "Credential 이력을 불러오지 못했습니다.")
          }))
      ]);
      const credentials = credentialResult.items;
      const [progress, submissions] = await Promise.all([
        loadProgress(applications, sessionId),
        loadLeaderSubmissions(teams)
      ]);
      const nextOverview = { contests, applications, teams, submissions, awards, credentials, progress };
      if (version === requestVersion.current) {
        setOverview(nextOverview);
        setCredentialError(credentialResult.error);
      }
      return nextOverview;
    } catch (nextError) {
      if (version === requestVersion.current) {
        setError(errorMessage(nextError, "참가자 정보를 불러오지 못했습니다."));
      }
      throw nextError;
    } finally {
      if (version === requestVersion.current) {
        setIsLoading(false);
        setHasLoaded(true);
      }
    }
  }, [enabled, sessionId]);

  useEffect(() => {
    setDetailById({});
    setDetailLoadingById({});
    setDetailErrorById({});
    setHasLoaded(false);
    if (!enabled) {
      requestVersion.current += 1;
      setOverview({
        contests: [],
        applications: [],
        teams: [],
        submissions: {},
        awards: [],
        credentials: [],
        progress: {}
      });
      setIsLoading(false);
      setHasLoaded(false);
      setError(null);
      setCredentialError(null);
      return;
    }
    loadOverview().catch(() => undefined);
    return () => {
      requestVersion.current += 1;
    };
  }, [enabled, loadOverview, sessionId]);

  const teams = useMemo(() => {
    const teamByContest = new Map(overview.teams.map((team) => [team.contestPublicId, team]));
    return overview.applications.map((application) => ({
      ...mapApplication(
        application,
        teamByContest.get(application.contestPublicId),
        session
      ),
      progress: overview.progress[application.contestPublicId] ?? null
    }));
  }, [overview.applications, overview.progress, overview.teams, session]);

  const submissions = useMemo(() => teams.map((team) => {
    const submission = overview.submissions[team.teamPublicId];
    const progress = overview.progress[team.contestId];
    return submission ? mapSubmission(submission, team, progress) : progressSubmission(team, progress);
  }).filter(Boolean), [overview.progress, overview.submissions, teams]);

  const awardCandidates = useMemo(() => overview.awards.map(mapAward), [overview.awards]);

  const credentials = useMemo(() => overview.credentials.map(mapCredential), [overview.credentials]);

  const contests = useMemo(() => {
    const applicationByContest = new Map(
      overview.applications.map((application) => [application.contestPublicId, application])
    );
    const byId = new Map(overview.contests.map((contest) => {
      const application = applicationByContest.get(contest.publicId);
      const mapped = mapContest({
        ...contest,
        participationType: contest.participationType ?? application?.participationType,
        department: contest.department ?? application?.department
      }, session);
      return [mapped.id, mapped];
    }));
    Object.values(detailById).forEach((detail) => byId.set(detail.id, { ...byId.get(detail.id), ...detail }));
    overview.applications.forEach((application) => {
      if (!byId.has(application.contestPublicId)) {
        byId.set(application.contestPublicId, fallbackContest(application, session));
      }
    });
    return [...byId.values()];
  }, [detailById, overview.applications, overview.contests, session]);

  const loadContestDetail = useCallback(async (contestId, { trackView = true } = {}) => {
    if (!enabled || !contestId) {
      return null;
    }
    const version = requestVersion.current;
    const key = `${sessionId}:${contestId}:${trackView}`;
    setDetailLoadingById((current) => ({ ...current, [contestId]: true }));
    setDetailErrorById((current) => ({ ...current, [contestId]: null }));
    if (!detailRequests.has(key)) {
      const request = getContestDetail(contestId, { trackView }).finally(() => detailRequests.delete(key));
      detailRequests.set(key, request);
    }
    try {
      const detail = mapContest(await detailRequests.get(key), session);
      if (version !== requestVersion.current) {
        return null;
      }
      setDetailById((current) => ({ ...current, [contestId]: detail }));
      return detail;
    } catch (nextError) {
      if (version === requestVersion.current) {
        setDetailErrorById((current) => ({
          ...current,
          [contestId]: errorMessage(nextError, "대회 상세를 불러오지 못했습니다.")
        }));
      }
      throw nextError;
    } finally {
      if (version === requestVersion.current) {
        setDetailLoadingById((current) => ({ ...current, [contestId]: false }));
      }
    }
  }, [enabled, session, sessionId]);

  const toggleLike = useCallback(async (contestId) => {
    const result = await toggleContestLike(contestId);
    const patch = { likeCount: result.likeCount, likedByMe: result.likedByMe };
    setOverview((current) => ({
      ...current,
      contests: current.contests.map((contest) => contest.publicId === contestId ? { ...contest, ...patch } : contest)
    }));
    setDetailById((current) => current[contestId] ? {
      ...current,
      [contestId]: mapContest({ ...current[contestId], ...patch }, session)
    } : current);
    return result;
  }, [session]);

  const applyToContest = useCallback(async (contestId, form) => {
    const result = await createApplication(contestId, applicationPayload(form, session));
    await loadOverview().catch(() => undefined);
    return result;
  }, [loadOverview, session]);

  const updateMyApplication = useCallback(async (contestId, form) => {
    const result = await updateApplication(contestId, applicationPayload(form, session));
    await loadOverview().catch(() => undefined);
    return result;
  }, [loadOverview, session]);

  const submitSubmission = useCallback(async (contestId, form) => {
    const team = overview.teams.find((item) => item.contestPublicId === contestId);
    if (team?.myRole !== "LEADER") {
      throw new Error("대표자만 제출물을 접수할 수 있습니다.");
    }

    const result = await submitTeamSubmission(team.teamPublicId, {
      title: String(form.title ?? "").trim(),
      files: form.uploadFiles ?? []
    });
    await loadOverview().catch(() => undefined);
    return result;
  }, [loadOverview, overview.teams]);

  const downloadSubmissionAttachment = useCallback(async (attachment) => {
    const download = await downloadSubmissionFile(attachment.id, { fileName: attachment.name });
    saveDownloadedFile(download.blob, download.fileName);
  }, []);

  const searchParticipants = useCallback((keyword) => {
    const value = String(keyword ?? "").trim();
    return enabled && value ? searchParticipantsRequest(value) : Promise.resolve([]);
  }, [enabled]);

  return {
    contests,
    teams,
    submissions,
    awardCandidates,
    credentials,
    progressByContest: overview.progress,
    detailById,
    detailLoadingById,
    detailErrorById,
    isLoading: isLoading || (enabled && !hasLoaded),
    error,
    credentialError,
    loadOverview,
    loadContestDetail,
    toggleLike,
    applyToContest,
    updateMyApplication,
    submitSubmission,
    downloadSubmissionAttachment,
    searchParticipants
  };
}
