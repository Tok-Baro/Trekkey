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
  getDefaultContestPublicFields,
  isContestApplyOpen
} from "../lib/contest.js";
import { readStoredAppData, readStoredSession, storeAppData, storeSession } from "../lib/storage.js";
import { getSubmissionFileCount } from "../lib/submissionFiles.js";

export function createInitialCompetitionState() {
  const storedAppData = readStoredAppData();

  return {
    contestRecords: storedAppData?.contestRecords ?? contests,
    teamRecords: storedAppData?.teamRecords ?? teams,
    submissionRecords: storedAppData?.submissionRecords ?? submissions,
    judgeRecords: storedAppData?.judgeRecords ?? judgingAssignments,
    reviewRecords: storedAppData?.reviewRecords ?? reviewScores,
    awardRecords: storedAppData?.awardRecords ?? awardCandidates
  };
}

export function persistCompetitionState(state) {
  storeAppData({
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
    return {
      state: {
        ...state,
        contestRecords: state.contestRecords.map((contest) =>
          contest.id === form.id
            ? {
                ...contest,
                ...form,
                awards: Number(form.awards),
                ...getDefaultContestPublicFields(form)
              }
            : contest
        )
      },
      selectedContestId: form.id,
      message: "대회 설정을 저장했습니다."
    };
  }

  const nextContest = {
    ...form,
    ...getDefaultContestPublicFields(form),
    id: `CT-2026-${String(state.contestRecords.length + 18).padStart(3, "0")}`,
    awards: Number(form.awards),
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
  const nextJudge = {
    id: `JG-${state.judgeRecords.length + 31}`,
    contestId: selectedContest.id,
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

  return {
    state: {
      ...state,
      judgeRecords: state.judgeRecords.map((judge) =>
        judge.id === form.id
          ? {
              ...judge,
              name: nextName,
              role: form.role,
              assigned,
              completed: Math.min(judge.completed, assigned)
            }
          : judge
      ),
      reviewRecords: state.reviewRecords.map((record) =>
        record.contestId === previousJudge.contestId && record.judgeName === previousJudge.name
          ? { ...record, judgeName: nextName }
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
        (record) => !(record.contestId === targetJudge.contestId && record.judgeName === targetJudge.name)
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

export function submitJudgeReview(state, { contestId, judgeName, reviewedCount, averageScore, records = [] }) {
  const reviewedSubmissionIds = records.map((record) => record.submissionId);

  return {
    state: {
      ...state,
      judgeRecords: state.judgeRecords.map((judge) =>
        judge.contestId === contestId && judge.name === judgeName
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
              record.judgeName === judgeName &&
              records.some((nextRecord) => nextRecord.submissionId === record.submissionId)
            )
        ),
        ...records
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

export function calculateResults(state, contestId) {
  const nextAwards = state.submissionRecords
    .filter((submission) => submission.contestId === contestId)
    .slice(0, 3)
    .map((submission, index) => ({
      rank: index + 1,
      contestId,
      prize: ["대상 후보", "최우수상 후보", "우수상 후보"][index],
      team: submission.team,
      score: Number((92.4 - index * 3.1).toFixed(1)),
      members: state.teamRecords.find((team) => team.contestId === contestId && team.name === submission.team)?.members ?? 1,
      status: "확정대기",
      certificateNo: `2026-${contestId.slice(-3)}-${String(index + 1).padStart(3, "0")}`
    }));

  if (nextAwards.length === 0) {
    return { state, ok: false, message: "결과 산출을 위한 제출물이 없습니다." };
  }

  return {
    state: {
      ...state,
      awardRecords: [...nextAwards, ...state.awardRecords.filter((candidate) => candidate.contestId !== contestId)]
    },
    ok: true,
    routePage: "awards",
    message: "심사 결과를 산출했습니다."
  };
}

export function confirmAwards(state, contestId) {
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
    message: "수상 결과를 확정했습니다."
  };
}

function patchContest(contestRecords, contestId, patch) {
  return contestRecords.map((contest) => (contest.id === contestId ? { ...contest, ...patch } : contest));
}
