import { getReviewPath } from "../routeConfig.js";
import { normalizeEvaluationRounds } from "./review.js";
import { getParticipantKey } from "./auth.js";

export function getReviewUrl(contestId, roundId) {
  if (typeof window === "undefined") {
    return "";
  }

  const url = new URL(getReviewPath(contestId, roundId), window.location.origin);
  return url.toString();
}

export function getDefaultContestPublicFields(contest = {}) {
  const title = contest.title || "신규 대회";
  return {
    posterUrl: contest.posterUrl || "",
    summary:
      contest.summary ||
      `${title} 참가자를 모집합니다. 공고 상세와 제출 기준을 확인한 뒤 기간 내 신청을 완료해 주세요.`,
    target: contest.target || "교내 재학생 및 휴학생",
    applicationMethod: contest.applicationMethod || "Trekkey 대회관리 페이지에서 팀 생성 후 제출물을 접수합니다.",
    benefits: contest.benefits || "수상팀 상장 및 비교과 활동 이력 등록",
    tags: contest.tags || "AI,공모전,비교과",
    evaluationRounds: normalizeEvaluationRounds(contest.evaluationRounds, contest.id),
    detailHtml:
      contest.detailHtml ||
      `<h2>${title}</h2><p>대회 목적, 참가 대상, 제출 형식, 심사 기준을 이곳에 입력하세요.</p><h3>공모 주제</h3><ul><li>문제 정의와 해결 아이디어</li><li>구현 또는 시연 가능한 결과물</li></ul><h3>제출 안내</h3><p>PDF 제안서와 발표 자료를 제출합니다.</p>`
  };
}

function normalizeCount(value, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0 ? Math.round(numberValue) : fallback;
}

function normalizeKeyList(value) {
  return Array.isArray(value) ? [...new Set(value.filter(Boolean).map(String))] : [];
}

function getMetricSeed(contest = {}) {
  const source = String(contest.id || contest.title || "");
  return [...source].reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function getDefaultEngagementCount(contest = {}, type) {
  const teams = normalizeCount(contest.teams);
  const submissions = normalizeCount(contest.submissions);
  const hasSeedActivity = contest.id?.startsWith("CT-HS-") || teams > 0 || submissions > 0;

  if (!hasSeedActivity) {
    return 0;
  }

  const seed = getMetricSeed(contest);
  const metricMap = {
    views: teams * 8 + submissions * 13 + (seed % 73),
    likes: Math.round(teams * 0.85 + submissions * 0.45 + (seed % 11))
  };

  return Math.max(metricMap[type] ?? 0, 0);
}

export function getContestEngagement(contest = {}) {
  return {
    views: normalizeCount(contest.views ?? contest.viewCount, getDefaultEngagementCount(contest, "views")),
    likes: normalizeCount(contest.likes ?? contest.likeCount, getDefaultEngagementCount(contest, "likes")),
    viewedBy: normalizeKeyList(contest.viewedBy),
    likedBy: normalizeKeyList(contest.likedBy)
  };
}

export function getContestReactionKey(session) {
  const role = session?.role || "guest";
  return `${role}:${getParticipantKey(session)}`;
}

function getTestContestPosterDataUrl() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="960" height="1280" viewBox="0 0 960 1280">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#2454ff"/>
          <stop offset="55%" stop-color="#6d4dff"/>
          <stop offset="100%" stop-color="#111827"/>
        </linearGradient>
        <radialGradient id="glow" cx="28%" cy="18%" r="70%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.46"/>
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="960" height="1280" rx="0" fill="url(#bg)"/>
      <circle cx="210" cy="180" r="310" fill="url(#glow)"/>
      <path d="M110 920 C260 770 410 1030 570 850 C690 715 775 765 860 670" fill="none" stroke="#9ddcff" stroke-width="18" stroke-linecap="round" opacity="0.8"/>
      <path d="M122 976 C312 846 420 1120 635 930 C730 846 790 890 852 815" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round" opacity="0.68"/>
      <rect x="88" y="78" width="248" height="52" rx="26" fill="#ffffff" opacity="0.16"/>
      <text x="112" y="113" fill="#ffffff" font-size="25" font-family="Arial, sans-serif" font-weight="700">CHAI CONTEST</text>
      <text x="88" y="285" fill="#ffffff" font-size="78" font-family="Arial, sans-serif" font-weight="800">2026</text>
      <text x="88" y="375" fill="#ffffff" font-size="74" font-family="Arial, sans-serif" font-weight="800">AI 광고</text>
      <text x="88" y="463" fill="#ffffff" font-size="74" font-family="Arial, sans-serif" font-weight="800">공모전</text>
      <text x="92" y="540" fill="#dbeafe" font-size="28" font-family="Arial, sans-serif" font-weight="600">대학생 아이디어 · 캠페인 · 크리에이티브</text>
      <rect x="88" y="632" width="360" height="68" rx="34" fill="#ffffff"/>
      <text x="128" y="676" fill="#2140d8" font-size="28" font-family="Arial, sans-serif" font-weight="800">접수 07.01 - 08.15</text>
      <text x="88" y="1118" fill="#ffffff" font-size="27" font-family="Arial, sans-serif" font-weight="700">CHAI 광고산학협력센터</text>
      <text x="88" y="1162" fill="#c7d2fe" font-size="22" font-family="Arial, sans-serif">AI를 활용한 브랜드 문제 해결 공모전</text>
    </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function getTestContestFormDefaults() {
  return {
    title: "2026 CHAI 대학생 AI 광고 공모전",
    department: "CHAI 광고산학협력센터",
    owner: "공모전 운영팀",
    status: "접수중",
    type: "개인/팀",
    maxTeamMembers: 5,
    applicationPeriod: "07.01 - 08.15",
    submissionDue: "08.15",
    awards: 6,
    posterUrl: getTestContestPosterDataUrl(),
    summary: "AI를 활용해 브랜드 문제를 해결하는 대학생 광고 아이디어 공모전입니다.",
    target: "전국 대학생 및 대학원생, 개인 또는 팀",
    applicationMethod: "공개 상세 페이지에서 공고를 확인한 뒤 참가 신청과 작품 파일을 제출합니다.",
    benefits: "총상금, 상장, 포트폴리오 인증 및 비교과 활동 이력 등록",
    tags: "AI,광고,마케팅,공모전",
    evaluationRounds: normalizeEvaluationRounds(
      [
        {
          id: "preview-round-1",
          order: 1,
          name: "1차 서류평가",
          status: "준비중",
          targetType: "all-submissions",
          passRule: "top-n",
          passCount: 12,
          criteria: [
            { id: "creativity", label: "아이디어", max: 35 },
            { id: "strategy", label: "전략성", max: 30 },
            { id: "feasibility", label: "실현가능성", max: 20 },
            { id: "clarity", label: "문서 완성도", max: 15 }
          ]
        },
        {
          id: "preview-round-2",
          order: 2,
          name: "최종 발표평가",
          status: "준비중",
          targetType: "previous-passed",
          passRule: "final",
          criteria: [
            { id: "presentation", label: "발표력", max: 30 },
            { id: "creative-output", label: "크리에이티브", max: 35 },
            { id: "qa", label: "질의응답", max: 20 },
            { id: "impact", label: "확장성", max: 15 }
          ]
        }
      ],
      "preview"
    ),
    detailHtml:
      "<h2>공모전 소개</h2><p>생성형 AI와 데이터 기반 크리에이티브를 활용해 실제 브랜드 과제를 해결하는 광고 공모전입니다.</p><h3>공모 주제</h3><ul><li>AI 기반 캠페인 아이디어</li><li>브랜드 문제 해결을 위한 광고 전략</li><li>영상, 이미지, 카피를 포함한 통합 제안</li></ul><h3>제출물</h3><ul><li>기획서 PDF</li><li>대표 이미지 또는 영상 링크</li><li>AI 활용 과정 설명</li></ul>"
  };
}

export function getContestWithPublicFields(contest) {
  return {
    ...contest,
    ...getDefaultContestPublicFields(contest),
    ...getContestEngagement(contest),
    evaluationRounds: normalizeEvaluationRounds(contest.evaluationRounds, contest.id)
  };
}

export function isContestApplyOpen(contest) {
  return contest.status === "접수중";
}

export function findParticipantApplication(teams, contestId, session) {
  const participantKey = getParticipantKey(session);
  return teams.find(
    (team) =>
      team.contestId === contestId &&
      (team.applicantId === participantKey || team.applicantEmail === session?.email || team.leader === session?.name)
  );
}

export function getContestTitle(contestId, contests) {
  return contests.find((contest) => contest.id === contestId)?.title ?? "대회 미지정";
}
