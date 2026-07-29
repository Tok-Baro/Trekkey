// 실 백엔드 API 클라이언트 — 목업(competitionApi.js)을 단계적으로 대체하는 연동 계층.
// access token은 메모리+sessionStorage에 보관하고, refresh token은 HttpOnly 쿠키로 백엔드가 관리한다.
const BASE_URL = import.meta.env.VITE_API_BASE ?? "http://localhost:8080";
const TOKEN_KEY = "trekkey-access-token";

let accessToken = sessionStorage.getItem(TOKEN_KEY);

export function hasApiSession() {
  return Boolean(accessToken);
}

export function clearApiSession() {
  accessToken = null;
  sessionStorage.removeItem(TOKEN_KEY);
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = {};
  if (body) {
    headers["Content-Type"] = "application/json";
  }
  if (auth && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok || payload?.isSuccess === false) {
    const error = new Error(payload?.message ?? `요청 실패 (${response.status})`);
    error.code = payload?.code;
    throw error;
  }
  return payload;
}

// ===== Auth =====

export async function signIn(email, password) {
  const payload = await request("/api/auth/signin", {
    method: "POST",
    auth: false,
    body: { email, password }
  });
  accessToken = payload.data.accessToken;
  sessionStorage.setItem(TOKEN_KEY, accessToken);
  window.dispatchEvent(new Event("trekkey-api-session"));
  return payload.data.userSessionRes;
}

export async function signOut() {
  try {
    await request("/api/auth/logout", { method: "POST" });
  } finally {
    clearApiSession();
  }
}

// ===== Contest (참가자) =====

export async function searchContests(status = "ALL") {
  const payload = await request(`/api/contests?status=${status}`);
  return payload.data.map(mapSearchContest);
}

export async function applyContest(contestPublicId, form) {
  //팀원 명단(리더 제외)을 학번으로 검색해 userId로 해석한다 — 백엔드 계약: memberUserIds
  const members = (form.roster ?? []).slice(1);
  const memberUserIds = [];
  for (const member of members) {
    const found = await searchParticipants(member.studentId);
    const exact = found.find((p) => p.studentId === member.studentId);
    if (!exact) {
      throw new Error(`팀원 "${member.name}" (학번 ${member.studentId})을 찾을 수 없습니다. 회원가입 여부와 학번을 확인해주세요.`);
    }
    memberUserIds.push(exact.userId);
  }
  const payload = await request(`/api/contests/${contestPublicId}/applications`, {
    method: "POST",
    body: {
      teamName: form.teamName,
      leaderName: form.leader,
      major: form.major,
      memberUserIds,
      contactEmail: form.email,
      phone: form.phone,
      motivation: form.motivation
    }
  });
  return payload.message;
}

// 팀원 검색 — 같은 학교 참가자만 (이름·학번 키워드)
export async function searchParticipants(keyword) {
  const payload = await request(`/api/participants/search?keyword=${encodeURIComponent(keyword)}`);
  return payload.data; // [{userId, name, studentId, major}]
}

export async function getMyApplications() {
  const payload = await request("/api/me/applications");
  return payload.data.map(mapApplication);
}

export async function getMyAwards() {
  const payload = await request("/api/me/awards");
  return payload.data.map(mapAward);
}

// 내 Credential 이력 — 발급 당시 subject snapshot 기준 (팀 해체와 무관하게 보존)
export async function getMyCredentials() {
  const payload = await request("/api/me/credentials");
  return payload.data.map(mapCredential);
}

export async function toggleContestLike(contestPublicId) {
  const payload = await request(`/api/contests/${contestPublicId}/like`, { method: "POST" });
  return payload.data; // 현재 좋아요 수
}

// ===== enum ↔ 한국어 매핑 (프론트 화면은 한국어 라벨 기준) =====

const CONTEST_STATUS_KO = {
  PREPARING: "준비중",
  APPLICATION_OPEN: "접수중",
  REVIEWING: "심사중",
  AWARDED: "수상확정"
};

const TEAM_STATUS_KO = {
  PENDING: "검토중",
  APPROVED: "승인",
  REVISION_REQUESTED: "보완요청",
  REJECTED: "반려"
};

const AWARD_STATUS_KO = {
  CANDIDATE: "확정대기",
  CONFIRMED: "확정",
  HELD: "보류"
};

const CREDENTIAL_STATUS_KO = {
  READY: "등록 예정",
  BATCHED: "등록 진행 중",
  ANCHORED: "블록체인 등록 완료",
  REVOKED: "폐기됨",
  SUPERSEDED: "대체 발급됨"
};

// CredentialHistoryRes → 이력 카드 shape (+ 상장 PDF·패키지·검증 링크)
function mapCredential(res) {
  return {
    id: res.credentialPublicId,
    credentialNo: res.credentialNo,
    type: res.credentialType,
    chainStatus: CREDENTIAL_STATUS_KO[res.status] ?? res.status,
    roleCode: res.roleCode,
    contestTitle: res.contestTitle,
    issuedAt: toDisplayDate(res.issuedAt),
    certificateUrl: `${BASE_URL}/api/public/credentials/${res.credentialPublicId}/certificate`,
    packageUrl: `${BASE_URL}/api/public/credentials/${res.credentialPublicId}/package`
  };
}

function toDisplayDate(isoDateTime) {
  if (!isoDateTime) {
    return "";
  }
  const date = new Date(isoDateTime);
  return `${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

// ContestSearchRes → 목업 contest 카드 shape
function mapSearchContest(res) {
  return {
    id: res.publicId,
    title: res.title,
    status: CONTEST_STATUS_KO[res.status] ?? res.status,
    posterUrl: res.posterUrl ?? "",
    summary: res.summary,
    tags: (res.tags ?? []).join(","),
    submissionDue: toDisplayDate(res.submissionDueAt),
    views: res.viewCount,
    likes: res.likeCount,
    department: "",
    teams: 0,
    submissions: 0,
    judges: 0
  };
}

// AwardRes → 목업 award shape
function mapAward(res) {
  return {
    id: res.id,
    rank: res.awardRankNo,
    contestId: res.contestPublicId,
    teamId: res.teamPublicId,
    prize: res.prize,
    team: res.teamName,
    workTitle: res.submissionTitle,
    score: Number(res.finalScore),
    status: AWARD_STATUS_KO[res.status] ?? res.status,
    certificateNo: res.certificateNo,
    confirmedAt: toDisplayDate(res.confirmedAt)
  };
}

// TeamApplicationRes → 목업 team(신청) shape — 팀 publicId가 없어 contestPublicId를 키로 쓴다
function mapApplication(res) {
  return {
    id: res.contestPublicId,
    contestId: res.contestPublicId,
    name: res.teamName,
    leader: res.leaderName,
    members: res.memberCount,
    major: res.major,
    status: TEAM_STATUS_KO[res.status] ?? res.status,
    submitted: false,
    applicantEmail: res.contactEmail,
    phone: res.phone,
    motivation: res.motivation,
    createdAt: toDisplayDate(res.createdAt)
  };
}
