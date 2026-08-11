import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  calculateAdminAwards,
  confirmAdminAwards,
  createAdminContest,
  createAdminJudge,
  createAdminReviewRound,
  deleteAdminReviewAssignment,
  deleteAdminReviewEntries,
  deleteAdminJudge,
  downloadAdminSubmissionFile,
  extendAdminReviewRoundDeadline,
  finalizeAdminTeam,
  finalizeAdminReviewRound,
  getAdminContestDetail,
  issueAdminJudgeReviewLink,
  listAdminAwards,
  listAdminContests,
  listAdminJudgeProgress,
  listAdminJudges,
  listAdminReviewEntries,
  listAdminReviewAssignments,
  listAdminReviewRecords,
  listAdminReviewRounds,
  listAdminSubmissions,
  listAdminTeams,
  openAdminReviewRound,
  prepareAdminReviewAssignments,
  prepareAdminReviewEntries,
  reassignAdminReviewAssignment,
  revokeAdminJudgeReviewLink,
  updateAdminContest,
  updateAdminReviewAssignmentDueAt,
  updateAdminReviewRound,
  updateAdminAward,
  updateAdminStageStatus,
  updateAdminTeamStatus
} from "../api/adminBackendApi.js";
import { inferAwardType, markJointRanks } from "../constants/awards.js";

const contestStatusLabels = {
  PREPARING: "준비중",
  APPLICATION_OPEN: "접수중",
  REVIEWING: "심사중",
  AWARDED: "수상확정"
};

const contestStatusValues = {
  "준비중": "PREPARING",
  "접수중": "APPLICATION_OPEN",
  "심사중": "REVIEWING",
  "수상확정": "AWARDED"
};

const participationTypeLabels = {
  TEAM: "팀전",
  INDIVIDUAL: "개인전",
  BOTH: "개인/팀"
};

const participationTypeValues = {
  "팀전": "TEAM",
  "개인전": "INDIVIDUAL",
  "개인/팀": "BOTH"
};

const DEFAULT_MAX_TEAM_MEMBERS = 5;

const teamStatusLabels = {
  PENDING: "검토중",
  APPROVED: "승인",
  REVISION_REQUESTED: "보완요청",
  REJECTED: "반려"
};

const teamStatusValues = {
  검토중: "PENDING",
  승인: "APPROVED",
  보완요청: "REVISION_REQUESTED",
  반려: "REJECTED"
};

const submissionStatusLabels = {
  DRAFT: "대기",
  SUBMITTED: "대기",
  WITHDRAWN: "철회"
};

const roundStatusLabels = {
  PREPARING: "준비중",
  OPEN: "평가중",
  FINALIZED: "완료"
};

const roundTargetValues = {
  ALL_SUBMISSIONS: "all-submissions",
  PREVIOUS_SELECTED: "previous-passed",
  MANUAL: "manual"
};

const roundDecisionValues = {
  TOP_N: "top-n",
  MIN_SCORE: "score-min",
  MANUAL: "manual"
};

const roundTargetApiValues = {
  "all-submissions": "ALL_SUBMISSIONS",
  "previous-passed": "PREVIOUS_SELECTED",
  manual: "MANUAL"
};

const roundDecisionApiValues = {
  "top-n": "TOP_N",
  "score-min": "MIN_SCORE",
  manual: "MANUAL",
  final: "MANUAL"
};

const awardStatusLabels = {
  CANDIDATE: "확정대기",
  CONFIRMED: "확정",
  HELD: "보류"
};

const emptyContest = {
  id: "",
  publicId: "",
  title: "대회를 선택해 주세요",
  department: "-",
  owner: "-",
  status: "준비중",
  type: "개인/팀",
  applicationPeriod: "-",
  submissionDue: "-",
  awards: 0,
  teams: 0,
  submissions: 0,
  judges: 0,
  progress: 0,
  evaluationRounds: []
};

function getErrorMessage(error, fallback) {
  const fieldError = Array.isArray(error?.data)
    ? error.data.find((item) => typeof item?.message === "string" && item.message)
    : null;
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

function applicationPeriod(contest) {
  if (!contest.applicationStartsAt && !contest.applicationEndsAt) {
    return "-";
  }
  return `${shortDate(contest.applicationStartsAt)} - ${shortDate(contest.applicationEndsAt)}`;
}

function mapContestRecord(contest, evaluationRounds = []) {
  const id = contest.publicId ?? contest.id;
  const stages = Array.isArray(contest.stages) ? contest.stages : [];
  const submissionStage = stages.find((stage) => stage.stageType === "SUBMISSION");
  return {
    ...contest,
    id,
    publicId: id,
    status: contestStatusLabels[contest.status] ?? contest.status ?? "준비중",
    type: participationTypeLabels[contest.participationType] ?? contest.type ?? "개인/팀",
    owner: contest.owner ?? "-",
    awards: Number(contest.awardCount ?? contest.awards ?? 0),
    posterUrl: contest.posterUrl ?? "",
    summary: contest.summary ?? "",
    target: contest.target ?? "",
    applicationMethod: contest.applicationMethod ?? "",
    benefits: contest.benefits ?? "",
    tags: Array.isArray(contest.tags) ? contest.tags.join(",") : contest.tags ?? "",
    detailHtml: contest.detailHtml ?? "",
    applicationPeriod: applicationPeriod(contest),
    submissionDue: shortDate(contest.submissionDueAt),
    applicationStartsAt: contest.applicationStartsAt ?? stages.find((stage) => stage.stageType === "APPLICATION")?.startsAt ?? "",
    applicationEndsAt: contest.applicationEndsAt ?? stages.find((stage) => stage.stageType === "APPLICATION")?.endsAt ?? "",
    submissionStartsAt: submissionStage?.startsAt ?? "",
    submissionEndsAt: submissionStage?.endsAt ?? contest.submissionDueAt ?? "",
    stages,
    views: Number(contest.viewCount ?? contest.views ?? 0),
    teams: Number(contest.teams ?? 0),
    submissions: Number(contest.submissions ?? 0),
    judges: Number(contest.judges ?? 0),
    progress: Number(contest.progress ?? 0),
    evaluationRounds
  };
}

function mapContestSummary(summary) {
  return mapContestRecord({
    ...summary,
    owner: summary.ownerName,
    teams: summary.teamCount,
    submissions: summary.submissionCount,
    judges: summary.judgeCount
  });
}

function mapContestDetail(detail, evaluationRounds) {
  return mapContestRecord(detail, evaluationRounds);
}

function mapRound(round, contestId) {
  return {
    ...round,
    id: String(round.id),
    serverId: round.id,
    contestId,
    order: Number(round.roundNo),
    status: roundStatusLabels[round.status] ?? round.status,
    targetType: roundTargetValues[round.targetType] ?? round.targetType,
    passRule: roundDecisionValues[round.decisionRule] ?? round.decisionRule,
    passCount: round.selectCount ?? "",
    minScore: round.minScore ?? "",
    criteria: (round.criteria ?? []).map((criterion, index) => ({
      ...criterion,
      id: criterion.code || `criterion-${criterion.id ?? index + 1}`,
      serverId: criterion.id ?? null,
      code: criterion.code || `criterion_${index + 1}`,
      label: criterion.label,
      max: Number(criterion.maxScore ?? 0),
      sortOrder: Number(criterion.sortOrder ?? index + 1)
    }))
  };
}

function toDateTime(value) {
  if (!value) {
    return null;
  }
  return String(value).length === 16 ? `${value}:00` : String(value);
}

function stageRequest(stage, overrides = {}) {
  return {
    id: stage?.id ?? null,
    name: stage?.name ?? overrides.name,
    stageType: stage?.stageType ?? overrides.stageType,
    sequenceNo: Number(stage?.sequenceNo ?? overrides.sequenceNo),
    status: stage?.status ?? "PREPARING",
    startsAt: toDateTime(overrides.startsAt ?? stage?.startsAt),
    endsAt: toDateTime(overrides.endsAt ?? stage?.endsAt),
    targetType: stage?.targetType ?? null,
    passRule: stage?.passRule ?? null,
    passCount: stage?.passCount ?? null,
    minScore: stage?.minScore ?? null,
    criteria: stage?.criteria ?? []
  };
}

function toContestRequest(form) {
  const currentStages = Array.isArray(form.stages) ? form.stages : [];
  const applicationStage = currentStages.find((stage) => stage.stageType === "APPLICATION");
  const submissionStage = currentStages.find((stage) => stage.stageType === "SUBMISSION");
  const managedStageTypes = new Set(["APPLICATION", "SUBMISSION"]);
  const stages = [
    stageRequest(applicationStage, {
      name: "참가 접수",
      stageType: "APPLICATION",
      sequenceNo: applicationStage?.sequenceNo ?? 1,
      startsAt: form.applicationStartsAt,
      endsAt: form.applicationEndsAt
    }),
    stageRequest(submissionStage, {
      name: "작품 제출",
      stageType: "SUBMISSION",
      sequenceNo: submissionStage?.sequenceNo ?? 2,
      startsAt: form.submissionStartsAt,
      endsAt: form.submissionEndsAt
    }),
    ...currentStages
      .filter((stage) => !managedStageTypes.has(stage.stageType))
      .filter((stage) => !["REVIEW", "PRESENTATION"].includes(stage.stageType))
      .map((stage) => stageRequest(stage))
  ].sort((left, right) => left.sequenceNo - right.sequenceNo);

  const participationType = participationTypeValues[form.type] ?? form.participationType ?? "TEAM";

  return {
    title: String(form.title ?? "").trim(),
    department: String(form.department ?? "").trim(),
    status: contestStatusValues[form.status] ?? form.status ?? "PREPARING",
    participationType,
    maxTeamMembers: participationType === "INDIVIDUAL"
      ? 1
      : Number(form.maxTeamMembers ?? DEFAULT_MAX_TEAM_MEMBERS),
    awardCount: Number(form.awards ?? form.awardCount ?? 0),
    posterUrl: form.posterUrl || null,
    summary: String(form.summary ?? "").trim(),
    target: String(form.target ?? "").trim(),
    applicationMethod: String(form.applicationMethod ?? "").trim(),
    benefits: String(form.benefits ?? "").trim(),
    tags: String(form.tags ?? "").trim(),
    detailHtml: String(form.detailHtml ?? "").trim(),
    stages
  };
}

function criterionCode(criterion, index) {
  const source = criterion.code || criterion.id || `criterion_${index + 1}`;
  const normalized = String(source)
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9_-]/g, "_")
    .replace(/^[_-]+/, "");
  return normalized || `criterion_${index + 1}`;
}

function toReviewRoundRequest(round, index) {
  const decisionRule = roundDecisionApiValues[round.passRule] ?? round.decisionRule ?? "MANUAL";
  const targetType = roundTargetApiValues[round.targetType] ?? round.targetType ?? "ALL_SUBMISSIONS";
  const isManualWithoutReview = targetType === "MANUAL" && decisionRule === "MANUAL";
  return {
    roundNo: Number(round.order ?? round.roundNo ?? index + 1),
    name: String(round.name ?? "").trim(),
    startsAt: toDateTime(round.startsAt),
    endsAt: toDateTime(round.endsAt),
    targetType,
    decisionRule,
    selectCount: decisionRule === "TOP_N" ? Number(round.passCount) : null,
    minScore: decisionRule === "MIN_SCORE" ? Number(round.minScore) : null,
    criteria: isManualWithoutReview ? [] : (round.criteria ?? []).map((criterion, criterionIndex) => ({
      id: criterion.serverId ?? null,
      code: criterionCode(criterion, criterionIndex),
      label: String(criterion.label ?? "").trim(),
      maxScore: Number(criterion.max),
      sortOrder: criterionIndex + 1
    }))
  };
}

function mapTeam(team, submittedTeamIds = new Set()) {
  const teamMembers = Array.isArray(team.members)
    ? team.members.map((member) => ({ ...member }))
    : [];
  const teamPublicId = team.publicId || team.id || null;
  const contestId = team.contestPublicId ?? team.contestId;
  return {
    ...team,
    id: teamPublicId ?? `${contestId}:${team.name}:${team.leaderName}`,
    teamPublicId,
    contestId,
    leader: team.leaderName,
    members: Number(team.memberCount ?? 0),
    teamMembers,
    status: teamStatusLabels[team.status] ?? team.status,
    applicantEmail: team.contactEmail,
    finalizedAt: shortDateTime(team.participationFinalizedAt),
    createdAt: shortDateTime(team.createdAt) ?? "-",
    submitted: teamPublicId ? submittedTeamIds.has(teamPublicId) : false
  };
}

function mapSubmissionFile(file) {
  return {
    ...file,
    id: file.id,
    name: file.originalName,
    type: file.contentType,
    size: Number(file.sizeBytes ?? 0),
    uploadStatus: "server",
    hash: file.sha256
  };
}

function mapSubmission(submission, contestId) {
  const attachments = (submission.files ?? []).map(mapSubmissionFile);
  return {
    ...submission,
    id: submission.publicId ?? submission.id,
    contestId,
    teamId: submission.teamPublicId ?? submission.teamId,
    team: submission.teamName,
    files: attachments.length,
    attachments,
    submittedAt: shortDateTime(submission.submittedAt) ?? "-",
    finalizedAt: shortDateTime(submission.finalizedAt),
    hashReady: attachments.length > 0 && attachments.every((file) => Boolean(file.sha256)),
    review: submissionStatusLabels[submission.status] ?? submission.status
  };
}

function mapJudge(judge, contestId, roundId, progressByJudgeId) {
  const progress = progressByJudgeId.get(String(judge.id));
  return {
    ...judge,
    id: judge.id,
    contestId,
    roundId,
    role: judge.roleLabel,
    assigned: Number(progress?.assignedCount ?? 0),
    completed: Number(progress?.completedCount ?? 0),
    pending: Number(progress?.pendingCount ?? 0),
    overdue: Number(progress?.overdueCount ?? 0),
    avgScore: null
  };
}

function mapReviewRecord(review, contestId) {
  return {
    ...review,
    id: String(review.reviewId),
    judgeId: String(review.judgeId),
    contestId,
    roundId: String(review.reviewRoundId),
    submissionId: review.submissionPublicId,
    role: review.judgeRoleLabel,
    team: review.teamName,
    scores: Object.fromEntries(
      (review.scores ?? []).map((score) => [
        score.code || `criterion-${score.criterionId}`,
        Number(score.score ?? 0)
      ])
    ),
    totalScore: Number(review.totalScore ?? 0),
    submittedAt: shortDateTime(review.submittedAt) ?? "-"
  };
}

function mapAward(award, membersByTeamId) {
  const contestId = award.contestPublicId;
  const teamId = award.teamPublicId;
  return {
    ...award,
    id: award.publicId ?? award.id,
    contestId,
    teamId,
    rank: Number(award.awardRankNo),
    team: award.teamName,
    title: award.submissionTitle,
    score: award.finalScore == null ? "-" : Number(award.finalScore),
    members: Number(membersByTeamId.get(teamId) ?? 0),
    awardType: award.awardType ?? inferAwardType(award.prize),
    customPrize: (award.awardType ?? inferAwardType(award.prize)) === "CUSTOM" ? award.prize : "",
    status: awardStatusLabels[award.status] ?? award.status,
    certificateNo: award.certificateNo ?? "-",
    confirmedAt: shortDateTime(award.confirmedAt)
  };
}

function toJudgeRequest(form) {
  const userId = form.userId == null || form.userId === "" ? null : Number(form.userId);
  return {
    userId,
    name: String(form.name ?? "").trim(),
    roleLabel: String(form.roleLabel ?? form.role ?? "").trim()
  };
}

function mergeContestDetailRecord(records, detail) {
  const exists = records.some((record) => record.id === detail.id);
  return exists
    ? records.map((record) => (
        record.id === detail.id
          ? {
              ...record,
              ...detail,
              owner: detail.owner === "-" ? record.owner : detail.owner
            }
          : record
      ))
    : [detail, ...records];
}

export function useAdminData({ enabled = true, loadScope = true } = {}) {
  const overviewVersion = useRef(0);
  const scopeVersion = useRef(0);
  const createdContestRetryRef = useRef(null);
  const awardCalculationRetryRoundIdsRef = useRef(new Set());
  const [contestRecords, setContestRecords] = useState([]);
  const [teamRecords, setTeamRecords] = useState([]);
  const [submissionRecords, setSubmissionRecords] = useState([]);
  const [judgeRecords, setJudgeRecords] = useState([]);
  const [reviewRecords, setReviewRecords] = useState([]);
  const [reviewRecordsError, setReviewRecordsError] = useState(null);
  const [awardRecords, setAwardRecords] = useState([]);
  const [reviewEntriesByRoundId, setReviewEntriesByRoundId] = useState({});
  const [selectedContestId, setSelectedContestId] = useState(null);
  const [isOverviewLoading, setIsOverviewLoading] = useState(false);
  const [isScopeLoading, setIsScopeLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadOverview = useCallback(async (options = {}) => {
    if (!enabled) {
      return [];
    }
    const version = ++overviewVersion.current;
    setIsOverviewLoading(true);
    setError(null);
    try {
      const page = await listAdminContests(options);
      const summaries = (page?.content ?? page ?? []).map(mapContestSummary);
      if (version === overviewVersion.current) {
        setContestRecords((current) => {
          const currentById = new Map(current.map((contest) => [contest.id, contest]));
          return summaries.map((summary) => {
            const previous = currentById.get(summary.id);
            return previous?.isDetailLoaded
              ? {
                  ...summary,
                  ...previous,
                  title: summary.title,
                  department: summary.department,
                  owner: summary.owner,
                  status: summary.status,
                  type: summary.type,
                  participationType: summary.participationType,
                  awardCount: summary.awardCount,
                  awards: summary.awards,
                  applicationPeriod: summary.applicationPeriod,
                  applicationStartsAt: summary.applicationStartsAt,
                  applicationEndsAt: summary.applicationEndsAt,
                  submissionDueAt: summary.submissionDueAt,
                  submissionDue: summary.submissionDue,
                  teams: summary.teams,
                  submissions: summary.submissions,
                  judges: summary.judges,
                  createdAt: summary.createdAt,
                  isDetailLoaded: true
                }
              : summary;
          });
        });
        setSelectedContestId((current) =>
          current && summaries.some((contest) => contest.id === current) ? current : summaries[0]?.id ?? null
        );
      }
      return summaries;
    } catch (nextError) {
      if (version === overviewVersion.current) {
        setError(getErrorMessage(nextError, "관리자 대회 목록을 불러오지 못했습니다."));
      }
      throw nextError;
    } finally {
      if (version === overviewVersion.current) {
        setIsOverviewLoading(false);
      }
    }
  }, [enabled]);

  const loadSelectedContest = useCallback(async (contestId = selectedContestId) => {
    if (!enabled || !contestId) {
      return null;
    }
    const version = ++scopeVersion.current;
    setIsScopeLoading(true);
    setError(null);
    try {
      const [detail, rounds, teamList, submissions, judges, awards] = await Promise.all([
        getAdminContestDetail(contestId),
        listAdminReviewRounds(contestId),
        listAdminTeams(contestId),
        listAdminSubmissions(contestId),
        listAdminJudges(contestId),
        listAdminAwards(contestId)
      ]);
      const mappedRounds = (rounds ?? [])
        .map((round) => mapRound(round, contestId))
        .sort((left, right) => left.order - right.order);
      const reviewResultsPromise = Promise.allSettled(
        mappedRounds.map((round) => listAdminReviewRecords(contestId, round.serverId))
      );
      const entriesByRoundId = Object.fromEntries(await Promise.all(
        mappedRounds.map(async (round) => [
          round.id,
          await listAdminReviewEntries(contestId, round.serverId)
        ])
      ));
      const progressByRound = mappedRounds.length > 0
        ? await Promise.all(mappedRounds.map(async (round) => [
            round.id,
            await listAdminJudgeProgress(contestId, { roundId: round.serverId })
          ]))
        : [[null, await listAdminJudgeProgress(contestId)]];
      const reviewResults = await reviewResultsPromise;
      const failedReviewRounds = reviewResults.flatMap((result, index) =>
        result.status === "rejected" ? [mappedRounds[index]?.name ?? `${index + 1}차 심사`] : []
      );
      const mappedReviews = reviewResults.flatMap((result) =>
        result.status === "fulfilled"
          ? (result.value ?? []).map((review) => mapReviewRecord(review, contestId))
          : []
      );
      const mappedSubmissions = (submissions ?? []).map((submission) => mapSubmission(submission, contestId));
      const submittedTeamIds = new Set(mappedSubmissions.map((submission) => submission.teamId));
      const mappedTeams = (teamList?.content ?? teamList ?? []).map((team) => mapTeam(team, submittedTeamIds));
      const membersByTeamId = new Map(mappedTeams.map((team) => [team.id, team.members]));
      const mappedJudges = progressByRound.flatMap(([roundId, progress]) => {
        const progressByJudgeId = new Map((progress ?? []).map((item) => [String(item.judgeId), item]));
        return (judges ?? []).map((judge) => mapJudge(judge, contestId, roundId, progressByJudgeId));
      });
      const mappedAwards = markJointRanks(
        (awards ?? []).map((award) => mapAward(award, membersByTeamId))
      );
      const mappedContest = {
        ...mapContestDetail(detail, mappedRounds),
        isDetailLoaded: true,
        teams: mappedTeams.length,
        submissions: mappedSubmissions.length,
        judges: (judges ?? []).length
      };

      if (version === scopeVersion.current) {
        setContestRecords((current) => mergeContestDetailRecord(current, mappedContest));
        setTeamRecords(mappedTeams);
        setSubmissionRecords(mappedSubmissions);
        setJudgeRecords(mappedJudges);
        setReviewRecords(mappedReviews);
        setReviewRecordsError(
          failedReviewRounds.length > 0
            ? `${failedReviewRounds.join(", ")} 평가 기록을 불러오지 못했습니다.`
            : null
        );
        setAwardRecords(mappedAwards);
        setReviewEntriesByRoundId(entriesByRoundId);
      }
      return {
        contest: mappedContest,
        teams: mappedTeams,
        submissions: mappedSubmissions,
        judges: mappedJudges,
        reviews: mappedReviews,
        awards: mappedAwards
      };
    } catch (nextError) {
      if (version === scopeVersion.current) {
        setError(getErrorMessage(nextError, "선택한 대회의 관리자 정보를 불러오지 못했습니다."));
      }
      throw nextError;
    } finally {
      if (version === scopeVersion.current) {
        setIsScopeLoading(false);
      }
    }
  }, [enabled, selectedContestId]);

  useEffect(() => {
    if (!enabled) {
      overviewVersion.current += 1;
      scopeVersion.current += 1;
      setContestRecords([]);
      setTeamRecords([]);
      setSubmissionRecords([]);
      setJudgeRecords([]);
      setReviewRecords([]);
      setReviewRecordsError(null);
      setAwardRecords([]);
      setReviewEntriesByRoundId({});
      setSelectedContestId(null);
      setIsOverviewLoading(false);
      setIsScopeLoading(false);
      setError(null);
      return undefined;
    }
    loadOverview().catch(() => undefined);
    return () => {
      overviewVersion.current += 1;
    };
  }, [enabled, loadOverview]);

  useEffect(() => {
    if (!enabled || !loadScope || !selectedContestId) {
      if (enabled && !loadScope) {
        scopeVersion.current += 1;
        setTeamRecords([]);
        setSubmissionRecords([]);
        setJudgeRecords([]);
        setReviewRecords([]);
        setReviewRecordsError(null);
        setAwardRecords([]);
        setReviewEntriesByRoundId({});
        setIsScopeLoading(false);
        setError(null);
      }
      return undefined;
    }
    setTeamRecords([]);
    setSubmissionRecords([]);
    setJudgeRecords([]);
    setReviewRecords([]);
    setReviewRecordsError(null);
    setAwardRecords([]);
    setReviewEntriesByRoundId({});
    loadSelectedContest(selectedContestId).catch(() => undefined);
    return () => {
      scopeVersion.current += 1;
    };
  }, [enabled, loadScope, loadSelectedContest, selectedContestId]);

  const saveContest = useCallback(async (form) => {
    const requestedId = form.publicId ?? form.id;
    const retryContestId = !requestedId && createdContestRetryRef.current?.draftKey === form._draftKey
      ? createdContestRetryRef.current.contestId
      : null;
    const isExisting = Boolean(requestedId || retryContestId);
    const contestRequest = toContestRequest(form);
    const savedContest = isExisting
      ? await updateAdminContest(requestedId ?? retryContestId, contestRequest)
      : await createAdminContest(contestRequest);
    const contestId = savedContest.publicId ?? savedContest.id;
    if (!isExisting) {
      createdContestRetryRef.current = { contestId, draftKey: form._draftKey };
    }
    const rounds = Array.isArray(form.evaluationRounds) ? form.evaluationRounds : [];
    try {
      const serverRounds = await listAdminReviewRounds(contestId);
      const serverRoundByNo = new Map((serverRounds ?? []).map((round) => [Number(round.roundNo), round]));
      for (const [index, round] of rounds.entries()) {
        const request = toReviewRoundRequest(round, index);
        const serverRound = serverRoundByNo.get(request.roundNo);
        const serverRoundId = round.serverId ?? serverRound?.id;
        if (serverRoundId) {
          if (["준비중", "PREPARING"].includes(round.status) || serverRound?.status === "PREPARING") {
            await updateAdminReviewRound(contestId, serverRoundId, request);
          }
        } else {
          await createAdminReviewRound(contestId, request);
        }
      }
    } catch (error) {
      await loadOverview().catch(() => undefined);
      setSelectedContestId(contestId);
      await loadSelectedContest(contestId).catch(() => undefined);
      throw error;
    }

    await loadOverview();
    setSelectedContestId(contestId);
    await loadSelectedContest(contestId);
    createdContestRetryRef.current = null;
    return {
      ok: true,
      contestId,
      message: isExisting ? "대회 설정을 저장했습니다." : "새 대회를 생성했습니다."
    };
  }, [loadOverview, loadSelectedContest]);

  const updateStageStatus = useCallback(async (stageId, status) => {
    const stage = await updateAdminStageStatus(stageId, status);
    await loadSelectedContest(selectedContestId);
    return { ok: true, stage, message: "대회 단계 상태를 변경했습니다." };
  }, [loadSelectedContest, selectedContestId]);

  const prepareReviewEntries = useCallback(async (round, submissionPublicIds = []) => {
    if (!selectedContestId || !round?.serverId) {
      throw new Error("심사 대회와 라운드를 선택해 주세요.");
    }
    if (round.targetType === "manual" && submissionPublicIds.length === 0) {
      throw new Error("수동 평가 대상 제출물을 한 건 이상 선택해 주세요.");
    }
    const request = round.targetType === "manual" ? { submissionPublicIds } : undefined;
    const entries = await prepareAdminReviewEntries(selectedContestId, round.serverId, request);
    await loadSelectedContest(selectedContestId);
    return { ok: true, entries, message: `${entries?.length ?? 0}건의 평가 대상을 준비했습니다.` };
  }, [loadSelectedContest, selectedContestId]);

  const resetReviewEntries = useCallback(async (round) => {
    if (!selectedContestId || !round?.serverId) {
      throw new Error("심사 대회와 라운드를 선택해 주세요.");
    }
    await deleteAdminReviewEntries(selectedContestId, round.serverId);
    await loadSelectedContest(selectedContestId);
    return { ok: true, message: "평가 대상과 미완료 배정을 초기화했습니다." };
  }, [loadSelectedContest, selectedContestId]);

  const prepareReviewAssignments = useCallback(async (round) => {
    if (!selectedContestId || !round?.serverId) {
      throw new Error("심사 대회와 라운드를 선택해 주세요.");
    }
    const judgesById = new Map(
      judgeRecords
        .filter((judge) => judge.contestId === selectedContestId && judge.roundId === round.id)
        .map((judge) => [String(judge.id), judge])
    );
    const judges = [...judgesById.values()];
    if (judges.length === 0) {
      throw new Error("먼저 심사위원을 등록해 주세요.");
    }
    if (round.targetType === "manual" && round.passRule === "manual") {
      return { ok: true, assignments: [], message: "심사 없는 관리자 선발 라운드는 배정이 필요하지 않습니다." };
    }
    const dueAt = toDateTime(round.endsAt);
    if (!dueAt || new Date(dueAt).getTime() <= Date.now()) {
      throw new Error("라운드 종료 시각을 현재 이후로 설정해 주세요.");
    }
    const assignments = await Promise.all(
      judges.map((judge) => prepareAdminReviewAssignments(
        selectedContestId,
        round.serverId,
        judge.id,
        { dueAt }
      ))
    );
    await loadSelectedContest(selectedContestId);
    return {
      ok: true,
      assignments: assignments.flat(),
      message: `${judges.length}명의 심사위원에게 평가 대상을 배정했습니다.`
    };
  }, [judgeRecords, loadSelectedContest, selectedContestId]);

  const issueReviewLink = useCallback(async (judgeId, expiresAt) => {
    if (!selectedContestId) {
      throw new Error("심사 대회를 선택해 주세요.");
    }
    const link = await issueAdminJudgeReviewLink(selectedContestId, judgeId, {
      expiresAt: toDateTime(expiresAt)
    });
    return { ok: true, link, message: "평가위원 1회용 로그인 링크를 발급했습니다." };
  }, [selectedContestId]);

  const revokeReviewLink = useCallback(async (judgeId) => {
    if (!selectedContestId) {
      throw new Error("심사 대회를 선택해 주세요.");
    }
    await revokeAdminJudgeReviewLink(selectedContestId, judgeId);
    await loadSelectedContest(selectedContestId);
    return { ok: true, message: "평가위원 1회용 로그인 링크를 폐기했습니다." };
  }, [loadSelectedContest, selectedContestId]);

  const openReviewRound = useCallback(async (round) => {
    if (!selectedContestId || !round?.serverId) {
      throw new Error("심사 대회와 라운드를 선택해 주세요.");
    }
    await openAdminReviewRound(selectedContestId, round.serverId);
    await loadSelectedContest(selectedContestId);
    return { ok: true, message: `${round.name} 라운드를 시작했습니다.` };
  }, [loadSelectedContest, selectedContestId]);

  const extendReviewRoundDeadline = useCallback(async (round, endsAt) => {
    if (!selectedContestId || !round?.serverId) {
      throw new Error("심사 대회와 라운드를 선택해 주세요.");
    }
    const updatedRound = await extendAdminReviewRoundDeadline(
      selectedContestId,
      round.serverId,
      { endsAt: toDateTime(endsAt) }
    );
    await loadSelectedContest(selectedContestId);
    return { ok: true, round: updatedRound, message: "심사 라운드 마감 시각을 연장했습니다." };
  }, [loadSelectedContest, selectedContestId]);

  const listReviewAssignments = useCallback((round, judgeId) => {
    if (!selectedContestId || !round?.serverId) {
      return Promise.reject(new Error("심사 대회와 라운드를 선택해 주세요."));
    }
    return listAdminReviewAssignments(selectedContestId, round.serverId, judgeId);
  }, [selectedContestId]);

  const cancelReviewAssignment = useCallback(async (round, judgeId, assignmentId) => {
    const assignment = await deleteAdminReviewAssignment(
      selectedContestId,
      round.serverId,
      judgeId,
      assignmentId
    );
    await loadSelectedContest(selectedContestId);
    return { ok: true, assignment, message: "심사 배정을 취소했습니다." };
  }, [loadSelectedContest, selectedContestId]);

  const reassignReviewAssignment = useCallback(async (round, judgeId, assignmentId, dueAt) => {
    const assignment = await reassignAdminReviewAssignment(
      selectedContestId,
      round.serverId,
      judgeId,
      assignmentId,
      { dueAt: toDateTime(dueAt) }
    );
    await loadSelectedContest(selectedContestId);
    return { ok: true, assignment, message: "심사 대상을 다시 배정했습니다." };
  }, [loadSelectedContest, selectedContestId]);

  const updateReviewAssignmentDueAt = useCallback(async (round, judgeId, assignmentId, dueAt) => {
    const assignment = await updateAdminReviewAssignmentDueAt(
      selectedContestId,
      round.serverId,
      judgeId,
      assignmentId,
      { dueAt: toDateTime(dueAt) }
    );
    await loadSelectedContest(selectedContestId);
    return { ok: true, assignment, message: "심사 배정 마감 시각을 변경했습니다." };
  }, [loadSelectedContest, selectedContestId]);

  const finalizeReviewRound = useCallback(async (round, manualDecisions = []) => {
    if (!selectedContestId || !round?.serverId) {
      throw new Error("심사 대회와 라운드를 선택해 주세요.");
    }
    const retryRoundId = String(round.serverId);
    if (
      round.status === "완료"
      || round.status === "FINALIZED"
      || awardCalculationRetryRoundIdsRef.current.has(retryRoundId)
    ) {
      const awards = await calculateAdminAwards(round.serverId);
      awardCalculationRetryRoundIdsRef.current.delete(retryRoundId);
      await loadSelectedContest(selectedContestId).catch(() => undefined);
      return { ok: true, awards, message: "수상 후보를 산출했습니다." };
    }
    if (round.passRule === "manual" && manualDecisions.length === 0) {
      throw new Error("관리자 확정 방식은 평가 대상별 통과 여부를 입력해야 합니다.");
    }
    const request = round.passRule === "manual" ? { manualDecisions } : undefined;
    const selectedRounds = contestRecords.find((contest) => contest.id === selectedContestId)?.evaluationRounds ?? [];
    const lastRoundOrder = Math.max(...selectedRounds.map((item) => Number(item.order)), 0);
    const isLastRound = Number(round.order) === lastRoundOrder;
    const result = await finalizeAdminReviewRound(selectedContestId, round.serverId, request);
    if (isLastRound) {
      awardCalculationRetryRoundIdsRef.current.add(retryRoundId);
      try {
        await calculateAdminAwards(round.serverId);
        awardCalculationRetryRoundIdsRef.current.delete(retryRoundId);
      } catch (error) {
        error.message = `심사 결과는 확정됐지만 수상 후보를 산출하지 못했습니다. 다시 시도해 주세요. ${error.message ?? ""}`.trim();
        throw error;
      }
    }
    await loadSelectedContest(selectedContestId).catch(() => undefined);
    return {
      ok: true,
      result,
      message: isLastRound
        ? "최종 심사를 확정하고 수상 후보를 산출했습니다."
        : `${round.name} 결과를 확정했습니다.`
    };
  }, [contestRecords, loadSelectedContest, selectedContestId]);

  const updateTeamStatus = useCallback(async (teamId, status, revisionReason) => {
    const apiStatus = teamStatusValues[status] ?? status;
    const team = await updateAdminTeamStatus(
      teamId,
      apiStatus,
      apiStatus === "REVISION_REQUESTED" ? revisionReason?.trim() : null
    );
    await loadSelectedContest(team?.contestId ?? selectedContestId);
    return {
      ok: true,
      team: mapTeam(team),
      message: apiStatus === "APPROVED" ? "참가 신청을 승인했습니다." : "신청 상태를 변경했습니다."
    };
  }, [loadSelectedContest, selectedContestId]);

  const finalizeTeam = useCallback(async (teamId) => {
    try {
      const team = await finalizeAdminTeam(teamId);
      await loadSelectedContest(selectedContestId);
      return { ok: true, team: mapTeam(team), message: "참가 명단을 확정했습니다." };
    } catch (error) {
      if (error?.status === 409 && error?.code === "TEAM_ALREADY_FINALIZED") {
        await loadSelectedContest(selectedContestId);
        return { ok: true, message: "이미 참가 명단이 확정된 팀입니다." };
      }
      throw error;
    }
  }, [loadSelectedContest, selectedContestId]);

  const addJudge = useCallback(async (form) => {
    if (!selectedContestId) {
      throw new Error("심사위원을 추가할 대회를 선택해 주세요.");
    }
    const judge = await createAdminJudge(selectedContestId, toJudgeRequest(form));
    await loadSelectedContest(selectedContestId);
    return { ok: true, judge, message: "심사위원을 추가했습니다." };
  }, [loadSelectedContest, selectedContestId]);

  const deleteJudge = useCallback(async (judgeId) => {
    if (!selectedContestId) {
      throw new Error("심사위원을 삭제할 대회를 선택해 주세요.");
    }
    await deleteAdminJudge(selectedContestId, judgeId);
    await loadSelectedContest(selectedContestId);
    return { ok: true, message: "심사위원을 삭제했습니다." };
  }, [loadSelectedContest, selectedContestId]);

  const confirmAwards = useCallback(async (contestId = selectedContestId) => {
    if (!contestId) {
      throw new Error("수상 결과를 확정할 대회를 선택해 주세요.");
    }
    const awards = await confirmAdminAwards(contestId);
    await loadSelectedContest(contestId);
    return { ok: true, awards, message: "수상 결과를 확정했습니다." };
  }, [loadSelectedContest, selectedContestId]);

  const updateAwardCandidate = useCallback(async (awardId, request) => {
    if (!awardId) {
      throw new Error("변경할 수상 후보를 선택해 주세요.");
    }
    const award = await updateAdminAward(awardId, request);
    await loadSelectedContest(award?.contestPublicId ?? selectedContestId);
    return { ok: true, award, message: "수상 후보를 변경했습니다." };
  }, [loadSelectedContest, selectedContestId]);

  const downloadSubmissionFile = useCallback((fileOrId, options = {}) => {
    const fileId = typeof fileOrId === "object" ? fileOrId.id : fileOrId;
    const fileName = options.fileName ?? (typeof fileOrId === "object" ? fileOrId.name ?? fileOrId.originalName : undefined);
    return downloadAdminSubmissionFile(fileId, { fileName });
  }, []);

  const selectedContest = useMemo(
    () => contestRecords.find((contest) => contest.id === selectedContestId) ?? contestRecords[0] ?? emptyContest,
    [contestRecords, selectedContestId]
  );

  return {
    contestRecords,
    teamRecords,
    submissionRecords,
    judgeRecords,
    reviewRecords,
    reviewRecordsError,
    awardRecords,
    reviewEntriesByRoundId,
    selectedContest,
    selectedContestId,
    setSelectedContestId,
    isLoading: isOverviewLoading || isScopeLoading,
    error,
    loadOverview,
    loadSelectedContest,
    saveContest,
    updateStageStatus,
    prepareReviewEntries,
    resetReviewEntries,
    prepareReviewAssignments,
    issueReviewLink,
    revokeReviewLink,
    openReviewRound,
    extendReviewRoundDeadline,
    listReviewAssignments,
    cancelReviewAssignment,
    reassignReviewAssignment,
    updateReviewAssignmentDueAt,
    finalizeReviewRound,
    updateTeamStatus,
    finalizeTeam,
    addJudge,
    deleteJudge,
    updateAwardCandidate,
    confirmAwards,
    downloadSubmissionFile
  };
}
