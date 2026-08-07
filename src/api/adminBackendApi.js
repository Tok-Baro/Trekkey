import { apiRequest, downloadApiFile } from "./backendApi.js";

function encodePath(value) {
  return encodeURIComponent(String(value));
}

export function listAdminContests({
  status,
  keyword,
  sortKey = "CREATED_AT",
  sortDir = "DESC",
  page = 0,
  size = 1000
} = {}) {
  return apiRequest("/api/admin/contests", {}, {
    query: { status, keyword, sortKey, sortDir, page, size }
  });
}

export function getAdminContestDetail(contestPublicId) {
  return apiRequest(`/api/admin/contests/${encodePath(contestPublicId)}`);
}

export function createAdminContest(contest) {
  return apiRequest("/api/contests", {
    method: "POST",
    body: contest
  });
}

export function updateAdminContest(contestPublicId, contest) {
  return apiRequest(`/api/contests/${encodePath(contestPublicId)}`, {
    method: "PUT",
    body: contest
  });
}

export function updateAdminStageStatus(stageId, status) {
  return apiRequest(`/api/stages/${encodePath(stageId)}/status`, {
    method: "PATCH",
    body: { status }
  });
}

export function listAdminReviewRounds(contestPublicId) {
  return apiRequest(`/api/admin/contests/${encodePath(contestPublicId)}/review-rounds`);
}

export function getAdminReviewRound(contestPublicId, roundId) {
  return apiRequest(
    `/api/admin/contests/${encodePath(contestPublicId)}/review-rounds/${encodePath(roundId)}`
  );
}

export function createAdminReviewRound(contestPublicId, round) {
  return apiRequest(`/api/admin/contests/${encodePath(contestPublicId)}/review-rounds`, {
    method: "POST",
    body: round
  });
}

export function updateAdminReviewRound(contestPublicId, roundId, round) {
  return apiRequest(
    `/api/admin/contests/${encodePath(contestPublicId)}/review-rounds/${encodePath(roundId)}`,
    {
      method: "PUT",
      body: round
    }
  );
}

export function openAdminReviewRound(contestPublicId, roundId) {
  return apiRequest(
    `/api/admin/contests/${encodePath(contestPublicId)}/review-rounds/${encodePath(roundId)}/open`,
    { method: "POST" }
  );
}

export function extendAdminReviewRoundDeadline(contestPublicId, roundId, request) {
  return apiRequest(
    `/api/admin/contests/${encodePath(contestPublicId)}/review-rounds/${encodePath(roundId)}/deadline`,
    {
      method: "PATCH",
      body: request
    }
  );
}

export function prepareAdminReviewEntries(contestPublicId, roundId, request) {
  return apiRequest(
    `/api/admin/contests/${encodePath(contestPublicId)}/review-rounds/${encodePath(roundId)}/entries/prepare`,
    {
      method: "POST",
      body: request
    }
  );
}

export function listAdminReviewEntries(contestPublicId, roundId) {
  return apiRequest(
    `/api/admin/contests/${encodePath(contestPublicId)}/review-rounds/${encodePath(roundId)}/entries`
  );
}

export function listAdminReviewRecords(contestPublicId, roundId) {
  return apiRequest(
    `/api/admin/contests/${encodePath(contestPublicId)}/review-rounds/${encodePath(roundId)}/reviews`
  );
}

export function deleteAdminReviewEntries(contestPublicId, roundId) {
  return apiRequest(
    `/api/admin/contests/${encodePath(contestPublicId)}/review-rounds/${encodePath(roundId)}/entries`,
    { method: "DELETE" }
  );
}

export function finalizeAdminReviewRound(contestPublicId, roundId, request) {
  return apiRequest(
    `/api/admin/contests/${encodePath(contestPublicId)}/review-rounds/${encodePath(roundId)}/finalize`,
    {
      method: "POST",
      body: request
    }
  );
}

export function listAdminTeams(contestPublicId, { status } = {}) {
  return apiRequest(
    `/api/admin/contests/${encodePath(contestPublicId)}/teams`,
    {},
    { query: { status } }
  );
}

export function updateAdminTeamStatus(teamPublicId, status, revisionReason) {
  return apiRequest(`/api/admin/teams/${encodePath(teamPublicId)}/status`, {
    method: "PATCH",
    body: { status, revisionReason }
  });
}

export function finalizeAdminTeam(teamPublicId) {
  return apiRequest(`/api/admin/teams/${encodePath(teamPublicId)}/finalize`, {
    method: "POST"
  });
}

export function listAdminSubmissions(contestPublicId) {
  return apiRequest(`/api/admin/contests/${encodePath(contestPublicId)}/submissions`);
}

export function downloadAdminSubmissionFile(fileId, { fileName } = {}) {
  return downloadApiFile(
    `/api/admin/files/${encodePath(fileId)}/download`,
    { fileName }
  );
}

export function listAdminJudges(contestPublicId) {
  return apiRequest(`/api/admin/contests/${encodePath(contestPublicId)}/judges`);
}

export function createAdminJudge(contestPublicId, judge) {
  return apiRequest(`/api/admin/contests/${encodePath(contestPublicId)}/judges`, {
    method: "POST",
    body: judge
  });
}

export function deleteAdminJudge(contestPublicId, judgeId) {
  return apiRequest(
    `/api/admin/contests/${encodePath(contestPublicId)}/judges/${encodePath(judgeId)}`,
    { method: "DELETE" }
  );
}

export function issueAdminJudgeReviewLink(contestPublicId, judgeId, request) {
  return apiRequest(
    `/api/admin/contests/${encodePath(contestPublicId)}/judges/${encodePath(judgeId)}/review-link`,
    {
      method: "POST",
      body: request
    }
  );
}

export function revokeAdminJudgeReviewLink(contestPublicId, judgeId) {
  return apiRequest(
    `/api/admin/contests/${encodePath(contestPublicId)}/judges/${encodePath(judgeId)}/review-link`,
    { method: "DELETE" }
  );
}

export function listAdminJudgeProgress(contestPublicId, { roundId } = {}) {
  return apiRequest(
    `/api/admin/contests/${encodePath(contestPublicId)}/judges/progress`,
    {},
    { query: { roundId } }
  );
}

export function prepareAdminReviewAssignments(contestPublicId, roundId, judgeId, request) {
  return apiRequest(
    `/api/admin/contests/${encodePath(contestPublicId)}/review-rounds/${encodePath(roundId)}/judges/${encodePath(judgeId)}/assignments/prepare`,
    {
      method: "POST",
      body: request
    }
  );
}

export function listAdminReviewAssignments(contestPublicId, roundId, judgeId) {
  return apiRequest(
    `/api/admin/contests/${encodePath(contestPublicId)}/review-rounds/${encodePath(roundId)}/judges/${encodePath(judgeId)}/assignments`
  );
}

export function deleteAdminReviewAssignment(contestPublicId, roundId, judgeId, assignmentId) {
  return apiRequest(
    `/api/admin/contests/${encodePath(contestPublicId)}/review-rounds/${encodePath(roundId)}/judges/${encodePath(judgeId)}/assignments/${encodePath(assignmentId)}`,
    { method: "DELETE" }
  );
}

export function reassignAdminReviewAssignment(contestPublicId, roundId, judgeId, assignmentId, request) {
  return apiRequest(
    `/api/admin/contests/${encodePath(contestPublicId)}/review-rounds/${encodePath(roundId)}/judges/${encodePath(judgeId)}/assignments/${encodePath(assignmentId)}/reassign`,
    {
      method: "POST",
      body: request
    }
  );
}

export function updateAdminReviewAssignmentDueAt(contestPublicId, roundId, judgeId, assignmentId, request) {
  return apiRequest(
    `/api/admin/contests/${encodePath(contestPublicId)}/review-rounds/${encodePath(roundId)}/judges/${encodePath(judgeId)}/assignments/${encodePath(assignmentId)}/due-at`,
    {
      method: "PATCH",
      body: request
    }
  );
}

export function listAdminAwards(contestPublicId) {
  return apiRequest(`/api/admin/contests/${encodePath(contestPublicId)}/awards`);
}

export function calculateAdminAwards(roundId) {
  return apiRequest(`/api/admin/review-rounds/${encodePath(roundId)}/awards`, {
    method: "POST"
  });
}

export function confirmAdminAwards(contestPublicId) {
  return apiRequest(
    `/api/admin/contests/${encodePath(contestPublicId)}/awards/confirm`,
    { method: "POST" }
  );
}
