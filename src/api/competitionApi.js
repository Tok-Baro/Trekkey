import {
  awardCandidates,
  contests,
  judgingAssignments,
  reviewScores,
  submissions,
  teams
} from "../data/competitionData.js";
import { getParticipantKey } from "../lib/auth.js";
import {
  findParticipantApplication,
  getContestEngagement,
  getContestReactionKey,
  getDefaultContestPublicFields,
  isContestApplyOpen
} from "../lib/contest.js";
import { readStoredAppData, readStoredSession, storeAppData, storeSession } from "../lib/storage.js";
import {
  getAverage,
  getPrimaryRound,
  getReviewTotal,
  getRoundIdForRecord,
  isRecordInRound,
  normalizeEvaluationRounds
} from "../lib/review.js";
import { getSubmissionFileCount } from "../lib/submissionFiles.js";

export const DEMO_DATA_VERSION = "evaluation-rounds-2026-07-03";

const LEGACY_DEMO_CONTEST_IDS = new Set(["CT-2026-014", "CT-2026-011", "CT-2026-008", "CT-2026-017"]);

function getSeedCompetitionState() {
  return {
    contestRecords: contests,
    teamRecords: teams,
    submissionRecords: submissions,
    judgeRecords: judgingAssignments,
    reviewRecords: reviewScores,
    awardRecords: awardCandidates
  };
}

function mergeRecordsById(seedRecords, storedRecords = [], shouldKeepStored = () => true) {
  const seedIds = new Set(seedRecords.map((record) => record.id));
  const customRecords = storedRecords.filter((record) => record?.id && !seedIds.has(record.id) && shouldKeepStored(record));

  return [...seedRecords, ...customRecords];
}

function mergeReviewRecords(seedRecords, storedRecords = [], validContestIds) {
  const getKey = (record) => `${record.contestId}:${record.roundId ?? "default"}:${record.judgeName}:${record.submissionId}`;
  const seedKeys = new Set(seedRecords.map(getKey));
  const customRecords = storedRecords.filter(
    (record) => validContestIds.has(record.contestId) && !seedKeys.has(getKey(record))
  );

  return [...seedRecords, ...customRecords];
}

function mergeAwardRecords(seedRecords, storedRecords = [], validContestIds) {
  const getKey = (record) => `${record.contestId}:${record.team}:${record.prize}`;
  const seedKeys = new Set(seedRecords.map(getKey));
  const customRecords = storedRecords.filter(
    (record) => validContestIds.has(record.contestId) && !seedKeys.has(getKey(record))
  );

  return [...seedRecords, ...customRecords];
}

function createMigratedCompetitionState(storedAppData) {
  const seedState = getSeedCompetitionState();

  if (!storedAppData) {
    return seedState;
  }

  if (storedAppData.demoDataVersion === DEMO_DATA_VERSION) {
    return {
      contestRecords: storedAppData.contestRecords ?? contests,
      teamRecords: storedAppData.teamRecords ?? teams,
      submissionRecords: storedAppData.submissionRecords ?? submissions,
      judgeRecords: storedAppData.judgeRecords ?? judgingAssignments,
      reviewRecords: storedAppData.reviewRecords ?? reviewScores,
      awardRecords: storedAppData.awardRecords ?? awardCandidates
    };
  }

  const contestRecords = mergeRecordsById(
    seedState.contestRecords,
    storedAppData.contestRecords,
    (contest) => !LEGACY_DEMO_CONTEST_IDS.has(contest.id)
  );
  const validContestIds = new Set(contestRecords.map((contest) => contest.id));
  const scopedToValidContest = (record) => validContestIds.has(record.contestId);

  return {
    contestRecords,
    teamRecords: mergeRecordsById(seedState.teamRecords, storedAppData.teamRecords, scopedToValidContest),
    submissionRecords: mergeRecordsById(seedState.submissionRecords, storedAppData.submissionRecords, scopedToValidContest),
    judgeRecords: mergeRecordsById(seedState.judgeRecords, storedAppData.judgeRecords, scopedToValidContest),
    reviewRecords: mergeReviewRecords(seedState.reviewRecords, storedAppData.reviewRecords ?? [], validContestIds),
    awardRecords: mergeAwardRecords(seedState.awardRecords, storedAppData.awardRecords ?? [], validContestIds)
  };
}

export function createInitialCompetitionState() {
  const storedAppData = readStoredAppData();

  return createMigratedCompetitionState(storedAppData);
}

export function persistCompetitionState(state) {
  storeAppData({
    demoDataVersion: DEMO_DATA_VERSION,
    contestRecords: state.contestRecords,
    teamRecords: state.teamRecords,
    submissionRecords: state.submissionRecords,
    judgeRecords: state.judgeRecords,
    reviewRecords: state.reviewRecords,
    awardRecords: state.awardRecords
  });
}

export function readSession() {
  return readStoredSession();
}

export function createSession(form) {
  return {
    role: form.role,
    name: form.name.trim(),
    email: form.email.trim(),
    employeeId: form.employeeId?.trim() ?? "",
    studentId: form.studentId?.trim() ?? "",
    major: form.major?.trim() ?? "",
    signedAt: new Date().toISOString()
  };
}

export function persistSession(session) {
  storeSession(session);
}

export function clearSession() {
  storeSession(null);
}

export function saveContest(state, form) {
  if (form.id) {
    const evaluationRounds = normalizeEvaluationRounds(form.evaluationRounds, form.id);

    return {
      state: {
        ...state,
        contestRecords: state.contestRecords.map((contest) =>
          contest.id === form.id
            ? {
                ...contest,
                ...form,
                awards: Number(form.awards),
                evaluationRounds,
                ...getDefaultContestPublicFields(form)
              }
            : contest
        )
      },
      selectedContestId: form.id,
      message: "대회 설정을 저장했습니다."
    };
  }

  const nextContestId = `CT-2026-${String(state.contestRecords.length + 18).padStart(3, "0")}`;
  const evaluationRounds = normalizeEvaluationRounds(form.evaluationRounds, nextContestId);
  const nextContest = {
    ...form,
    ...getDefaultContestPublicFields(form),
    id: nextContestId,
    awards: Number(form.awards),
    evaluationRounds,
    teams: 0,
    submissions: 0,
    judges: 0,
    progress: form.status === "준비중" ? 12 : 28
  };

  return {
    state: {
      ...state,
      contestRecords: [nextContest, ...state.contestRecords]
    },
    selectedContestId: nextContest.id,
    routePage: "contests",
    message: "새 대회를 생성했습니다."
  };
}

export function applyContest(state, form, session) {
  if (!session || session.role !== "participant") {
    return { state, ok: false, message: "참가자 로그인 후 신청할 수 있습니다." };
  }

  const contest = state.contestRecords.find((item) => item.id === form.contestId);
  if (!contest || !isContestApplyOpen(contest)) {
    return { state, ok: false, message: "현재 참가 신청이 열려 있지 않은 대회입니다." };
  }

  if (findParticipantApplication(state.teamRecords, form.contestId, session)) {
    return { state, ok: false, message: "이미 해당 대회에 참가 신청했습니다." };
  }

  const nextTeam = {
    id: `TM-${String(1100 + state.teamRecords.length + 1).padStart(4, "0")}`,
    contestId: form.contestId,
    name: form.teamName.trim(),
    leader: form.leader.trim(),
    members: Number(form.members),
    major: form.major.trim(),
    status: "검토중",
    submitted: false,
    applicantId: getParticipantKey(session),
    applicantEmail: form.email.trim(),
    phone: form.phone.trim(),
    motivation: form.motivation.trim(),
    createdAt: "방금 전"
  };

  return {
    state: {
      ...state,
      teamRecords: [nextTeam, ...state.teamRecords],
      contestRecords: patchContest(state.contestRecords, form.contestId, {
        teams: (contest.teams ?? 0) + 1,
        progress: Math.max(contest.progress ?? 0, 32)
      })
    },
    ok: true,
    message: `${contest.title} 참가 신청을 접수했습니다.`
  };
}

export function recordContestView(state, contestId, session) {
  const contest = state.contestRecords.find((item) => item.id === contestId);

  if (!contest) {
    return { state, ok: false };
  }

  const viewerKey = getContestReactionKey(session);
  const engagement = getContestEngagement(contest);

  if (engagement.viewedBy.includes(viewerKey)) {
    return { state, ok: true };
  }

  return {
    state: {
      ...state,
      contestRecords: patchContest(state.contestRecords, contestId, {
        views: engagement.views + 1,
        viewedBy: [...engagement.viewedBy, viewerKey]
      })
    },
    ok: true
  };
}

export function toggleContestLike(state, contestId, session) {
  if (!session || session.role !== "participant") {
    return { state, ok: false, message: "참가자 로그인 후 이용할 수 있습니다." };
  }

  const contest = state.contestRecords.find((item) => item.id === contestId);

  if (!contest) {
    return { state, ok: false, message: "대회를 찾을 수 없습니다." };
  }

  const reactionKey = getContestReactionKey(session);
  const engagement = getContestEngagement(contest);
  const currentList = engagement.likedBy;
  const isActive = currentList.includes(reactionKey);
  const nextList = isActive ? currentList.filter((key) => key !== reactionKey) : [...currentList, reactionKey];
  const nextCount = Math.max(engagement.likes + (isActive ? -1 : 1), 0);

  return {
    state: {
      ...state,
      contestRecords: patchContest(state.contestRecords, contestId, {
        likes: nextCount,
        likedBy: nextList
      })
    },
    ok: true,
    active: !isActive,
    message: isActive ? "좋아요를 취소했습니다." : "좋아요를 눌렀습니다."
  };
}

export function updateParticipantApplication(state, teamId, patch = {}) {
  const targetTeam = state.teamRecords.find((team) => team.id === teamId);

  if (!targetTeam) {
    return { state, ok: false, message: "수정할 신청 정보를 찾을 수 없습니다." };
  }

  const nextStatus = targetTeam.status === "보완요청" ? "검토중" : targetTeam.status;
  const nextPatch = {
    ...patch,
    members: patch.members == null ? targetTeam.members : Number(patch.members),
    status: nextStatus,
    updatedAt: "방금 전"
  };

  return {
    state: {
      ...state,
      teamRecords: state.teamRecords.map((team) => (team.id === teamId ? { ...team, ...nextPatch } : team))
    },
    ok: true,
    message: targetTeam.status === "보완요청" ? "신청 정보를 수정하고 검토중으로 전환했습니다." : "신청 정보를 수정했습니다."
  };
}

export function upsertParticipantSubmission(state, contestId, teamId, form) {
  const contest = state.contestRecords.find((item) => item.id === contestId);
  const team = state.teamRecords.find((item) => item.id === teamId);

  if (!contest || !team) {
    return { state, ok: false, message: "제출할 신청 정보를 찾을 수 없습니다." };
  }

  const attachments = Array.isArray(form.attachments) ? form.attachments : [];
  const existingSubmission = state.submissionRecords.find(
    (submission) => submission.contestId === contestId && submission.team === team.name
  );
  const submissionPatch = {
    contestId,
    team: team.name,
    title: form.title?.trim() || `${team.name} 제출물`,
    files: attachments.length || Number(form.files || existingSubmission?.files || 0),
    attachments,
    uploadStatus: attachments.length ? "metadata-ready" : "metadata-missing",
    uploadBatchId: attachments.length ? `UP-${Date.now()}` : existingSubmission?.uploadBatchId ?? null,
    submittedAt: "방금 전",
    hashReady: false,
    review: "접수완료"
  };

  const nextSubmissionRecords = existingSubmission
    ? state.submissionRecords.map((submission) =>
        submission.id === existingSubmission.id ? { ...submission, ...submissionPatch } : submission
      )
    : [
        {
          id: `SB-${8800 + state.submissionRecords.length + 1}`,
          ...submissionPatch
        },
        ...state.submissionRecords
      ];

  return {
    state: {
      ...state,
      submissionRecords: nextSubmissionRecords,
      teamRecords: state.teamRecords.map((item) =>
        item.id === teamId ? { ...item, submitted: true, submittedAt: "방금 전" } : item
      ),
      contestRecords: patchContest(state.contestRecords, contestId, {
        submissions: existingSubmission ? contest.submissions : (contest.submissions ?? 0) + 1,
        progress: Math.min(Math.max(contest.progress ?? 0, 42), 92)
      })
    },
    ok: true,
    message: existingSubmission ? "제출물을 다시 접수했습니다." : "제출물을 접수했습니다."
  };
}

export function updateTeamStatus(state, teamId, status) {
  return {
    state: {
      ...state,
      teamRecords: state.teamRecords.map((team) => (team.id === teamId ? { ...team, status } : team))
    },
    message: status === "승인" ? "참가 신청을 승인했습니다." : "보완요청 상태로 변경했습니다."
  };
}

export function addSubmission(state, selectedContest, form) {
  const attachments = Array.isArray(form.attachments) ? form.attachments : [];
  const nextSubmission = {
    id: `SB-${8800 + state.submissionRecords.length + 1}`,
    contestId: selectedContest.id,
    team: form.team,
    title: form.title,
    files: attachments.length || Number(form.files || 0),
    attachments,
    uploadStatus: attachments.length ? "metadata-ready" : "metadata-missing",
    uploadBatchId: attachments.length ? `UP-${Date.now()}` : null,
    submittedAt: form.submittedAt || "방금 전",
    hashReady: false,
    review: "접수완료"
  };

  return {
    state: {
      ...state,
      submissionRecords: [nextSubmission, ...state.submissionRecords],
      teamRecords: state.teamRecords.map((team) =>
        team.contestId === selectedContest.id && team.name === form.team ? { ...team, submitted: true } : team
      ),
      contestRecords: patchContest(state.contestRecords, selectedContest.id, {
        submissions: (selectedContest.submissions ?? 0) + 1,
        progress: Math.min((selectedContest.progress ?? 0) + 4, 92)
      })
    },
    message: `${getSubmissionFileCount(nextSubmission)}개 파일을 포함해 제출물을 접수했습니다.`
  };
}

export function generateSubmissionHashes(state, contestId) {
  const targetCount = state.submissionRecords.filter(
    (submission) => submission.contestId === contestId && !submission.hashReady
  ).length;

  return {
    state: {
      ...state,
      submissionRecords: state.submissionRecords.map((submission) =>
        submission.contestId === contestId ? { ...submission, hashReady: true } : submission
      )
    },
    message: targetCount ? `${targetCount}건의 제출물 해시를 생성했습니다.` : "이미 모든 제출물의 해시가 준비되어 있습니다."
  };
}

export function addJudge(state, selectedContest, form) {
  const assigned = Math.max(Number(form.assigned) || 1, 1);
  const roundId = form.roundId || getPrimaryRound(selectedContest)?.id;
  const nextJudge = {
    id: `JG-${state.judgeRecords.length + 31}`,
    contestId: selectedContest.id,
    roundId,
    name: form.name,
    role: form.role,
    assigned,
    completed: 0,
    avgScore: 0
  };

  return {
    state: {
      ...state,
      judgeRecords: [nextJudge, ...state.judgeRecords],
      contestRecords: patchContest(state.contestRecords, selectedContest.id, {
        judges: selectedContest.judges + 1
      })
    },
    message: "심사위원을 추가했습니다."
  };
}

export function updateJudge(state, form) {
  const previousJudge = state.judgeRecords.find((judge) => judge.id === form.id);

  if (!previousJudge) {
    return { state, message: "수정할 심사위원을 찾을 수 없습니다." };
  }

  const assigned = Math.max(Number(form.assigned) || 1, 1);
  const nextName = form.name.trim();
  const contest = state.contestRecords.find((item) => item.id === previousJudge.contestId);
  const previousRoundId = getRoundIdForRecord(previousJudge, contest);

  return {
    state: {
      ...state,
      judgeRecords: state.judgeRecords.map((judge) =>
        judge.id === form.id
          ? {
              ...judge,
              name: nextName,
              role: form.role,
              roundId: form.roundId || judge.roundId,
              assigned,
              completed: Math.min(judge.completed, assigned)
            }
          : judge
      ),
      reviewRecords: state.reviewRecords.map((record) =>
        record.contestId === previousJudge.contestId &&
        record.judgeName === previousJudge.name &&
        getRoundIdForRecord(record, contest) === previousRoundId
          ? { ...record, judgeName: nextName, roundId: form.roundId || previousRoundId }
          : record
      )
    },
    message: "심사위원 정보를 수정했습니다."
  };
}

export function deleteJudge(state, judgeId) {
  const targetJudge = state.judgeRecords.find((judge) => judge.id === judgeId);

  if (!targetJudge) {
    return { state, message: "삭제할 심사위원을 찾을 수 없습니다." };
  }

  return {
    state: {
      ...state,
      judgeRecords: state.judgeRecords.filter((judge) => judge.id !== judgeId),
      reviewRecords: state.reviewRecords.filter(
        (record) => {
          const contest = state.contestRecords.find((item) => item.id === targetJudge.contestId);
          return !(
            record.contestId === targetJudge.contestId &&
            record.judgeName === targetJudge.name &&
            getRoundIdForRecord(record, contest) === getRoundIdForRecord(targetJudge, contest)
          );
        }
      ),
      contestRecords: patchContest(state.contestRecords, targetJudge.contestId, {
        judges: Math.max((state.contestRecords.find((contest) => contest.id === targetJudge.contestId)?.judges ?? 1) - 1, 0)
      })
    },
    message: "심사위원을 삭제했습니다."
  };
}

export function batchAssignJudges(state, contestId) {
  return {
    state: {
      ...state,
      submissionRecords: state.submissionRecords.map((submission) =>
        submission.contestId === contestId && submission.review === "미배정"
          ? { ...submission, review: "배정완료" }
          : submission
      )
    },
    message: "미배정 제출물을 심사위원에게 일괄 배정했습니다."
  };
}

export function sendReviewReminders(state, contestId, roundId) {
  const contest = state.contestRecords.find((item) => item.id === contestId);
  const targetRound = normalizeEvaluationRounds(contest?.evaluationRounds, contestId).find((round) => round.id === roundId);
  const targetJudgeIds = state.judgeRecords
    .filter(
      (judge) =>
        judge.contestId === contestId &&
        (!targetRound || isRecordInRound(judge, targetRound, contest)) &&
        Number(judge.assigned || 0) > Number(judge.completed || 0)
    )
    .map((judge) => judge.id);

  if (!targetJudgeIds.length) {
    return { state, message: "독촉할 미완료 심사위원이 없습니다." };
  }

  return {
    state: {
      ...state,
      judgeRecords: state.judgeRecords.map((judge) =>
        targetJudgeIds.includes(judge.id)
          ? {
              ...judge,
              reminderCount: Number(judge.reminderCount || 0) + 1,
              reminderSentAt: "방금 전"
            }
          : judge
      )
    },
    message: `${targetJudgeIds.length}명의 미완료 심사위원에게 독촉 알림을 기록했습니다.`
  };
}

export function submitJudgeReview(state, { contestId, roundId, judgeName, reviewedCount, averageScore, records = [] }) {
  const contest = state.contestRecords.find((item) => item.id === contestId);
  const activeRoundId = roundId || getPrimaryRound(contest)?.id;
  const reviewedSubmissionIds = records.map((record) => record.submissionId);

  return {
    state: {
      ...state,
      judgeRecords: state.judgeRecords.map((judge) =>
        judge.contestId === contestId &&
        judge.name === judgeName &&
        getRoundIdForRecord(judge, contest) === activeRoundId
          ? {
              ...judge,
              completed: Math.min(judge.assigned, Math.max(judge.completed, reviewedCount)),
              avgScore: averageScore
            }
          : judge
      ),
      reviewRecords: [
        ...state.reviewRecords.filter(
          (record) =>
            !(
              record.contestId === contestId &&
              getRoundIdForRecord(record, contest) === activeRoundId &&
              record.judgeName === judgeName &&
              records.some((nextRecord) => nextRecord.submissionId === record.submissionId)
            )
        ),
        ...records.map((record) => ({ ...record, roundId: activeRoundId }))
      ],
      submissionRecords: state.submissionRecords.map((submission) =>
        submission.contestId === contestId &&
        reviewedSubmissionIds.includes(submission.id) &&
        ["배정완료", "접수완료", "대기"].includes(submission.review)
          ? { ...submission, review: "심사완료" }
          : submission
      )
    },
    message: `${judgeName} 심사 결과를 제출했습니다.`
  };
}

export function calculateResults(state, contestId, roundId) {
  const contest = state.contestRecords.find((item) => item.id === contestId);
  const rounds = normalizeEvaluationRounds(contest?.evaluationRounds, contestId);
  const targetRound = rounds.find((round) => round.id === roundId) ?? rounds.at(-1);
  const contestSubmissions = state.submissionRecords.filter((submission) => submission.contestId === contestId);
  const scoredSubmissions = contestSubmissions
    .map((submission) => {
      const records = state.reviewRecords.filter(
        (record) =>
          record.contestId === contestId &&
          record.submissionId === submission.id &&
          (!targetRound || isRecordInRound(record, targetRound, contest))
      );
      const totals = records.map(getReviewTotal);

      return {
        submission,
        reviewCount: records.length,
        average: getAverage(totals),
        highest: totals.length ? Math.max(...totals) : 0
      };
    })
    .filter((item) => item.reviewCount > 0)
    .sort((a, b) => b.average - a.average || b.reviewCount - a.reviewCount || b.highest - a.highest);

  if (!contestSubmissions.length) {
    return { state, ok: false, message: "결과 산출을 위한 제출물이 없습니다." };
  }

  if (!scoredSubmissions.length) {
    return { state, ok: false, message: "결과 산출을 위한 심사 점수가 없습니다." };
  }

  const awardLimit = Math.min(Number(contest?.awards || 3), scoredSubmissions.length);
  const prizeLabels = ["대상 후보", "최우수상 후보", "우수상 후보", "장려상 후보", "입선 후보"];
  const nextAwards = scoredSubmissions.slice(0, awardLimit).map(({ submission, average }, index) => ({
      rank: index + 1,
      contestId,
      roundId: targetRound?.id,
      prize: prizeLabels[index] ?? `${index + 1}위 후보`,
      team: submission.team,
      score: Number(average.toFixed(1)),
      members: state.teamRecords.find((team) => team.contestId === contestId && team.name === submission.team)?.members ?? 1,
      status: "확정대기",
      certificateNo: `2026-${contestId.slice(-3)}-${String(index + 1).padStart(3, "0")}`
    }));
  const awardTeams = new Set(nextAwards.map((award) => award.team));

  return {
    state: {
      ...state,
      submissionRecords: state.submissionRecords.map((submission) =>
        submission.contestId === contestId
          ? {
              ...submission,
              review: awardTeams.has(submission.team)
                ? "수상후보"
                : submission.review === "수상후보"
                  ? "심사완료"
                  : submission.review
            }
          : submission
      ),
      awardRecords: [...nextAwards, ...state.awardRecords.filter((candidate) => candidate.contestId !== contestId)]
    },
    ok: true,
    routePage: "awards",
    message: `${nextAwards.length}건의 수상 후보를 심사 평균 기준으로 산출했습니다.`
  };
}

export function confirmAwards(state, contestId) {
  const targetCount = state.awardRecords.filter((candidate) => candidate.contestId === contestId).length;

  if (!targetCount) {
    return { state, ok: false, message: "확정할 수상 후보가 없습니다." };
  }

  return {
    state: {
      ...state,
      awardRecords: state.awardRecords.map((candidate) =>
        candidate.contestId === contestId ? { ...candidate, status: "확정" } : candidate
      ),
      contestRecords: patchContest(state.contestRecords, contestId, {
        status: "수상확정",
        progress: 100
      })
    },
    ok: true,
    message: "수상 결과를 확정했습니다."
  };
}

function patchContest(contestRecords, contestId, patch) {
  return contestRecords.map((contest) => (contest.id === contestId ? { ...contest, ...patch } : contest));
}
