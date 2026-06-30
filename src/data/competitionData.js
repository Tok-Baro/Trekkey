export const contests = [
  {
    id: "CT-2026-014",
    title: "2026 학생 창업 아이디어톤",
    department: "창업지원단",
    owner: "김서연",
    status: "접수중",
    type: "팀전",
    applicationPeriod: "06.20 - 07.08",
    submissionDue: "07.18",
    awards: 6,
    teams: 38,
    submissions: 19,
    judges: 5,
    progress: 52
  },
  {
    id: "CT-2026-011",
    title: "AI 캡스톤 우수작 경진대회",
    department: "소프트웨어융합대학",
    owner: "박민준",
    status: "심사중",
    type: "팀전",
    applicationPeriod: "05.30 - 06.16",
    submissionDue: "06.28",
    awards: 8,
    teams: 24,
    submissions: 24,
    judges: 7,
    progress: 78
  },
  {
    id: "CT-2026-008",
    title: "지역문제 해결 서비스 디자인",
    department: "학생처",
    owner: "이하늘",
    status: "수상확정",
    type: "개인/팀",
    applicationPeriod: "04.11 - 05.02",
    submissionDue: "05.20",
    awards: 5,
    teams: 17,
    submissions: 16,
    judges: 4,
    progress: 100
  },
  {
    id: "CT-2026-017",
    title: "교내 데이터 분석 챌린지",
    department: "데이터교육센터",
    owner: "최유진",
    status: "준비중",
    type: "개인전",
    applicationPeriod: "07.05 - 07.24",
    submissionDue: "08.03",
    awards: 4,
    teams: 0,
    submissions: 0,
    judges: 3,
    progress: 18
  }
];

export const demoAccounts = {
  admin: {
    role: "admin",
    name: "공모전 관리자",
    email: "admin@trekkey.ac.kr",
    employeeId: "ADM-001"
  },
  participant: {
    role: "participant",
    name: "김하린",
    email: "harin.kim@campus.ac.kr",
    studentId: "20261234",
    major: "컴퓨터공학과"
  }
};

export const teams = [
  {
    id: "TM-1028",
    contestId: "CT-2026-014",
    name: "LinkLab",
    leader: "정도윤",
    members: 4,
    major: "컴퓨터공학과",
    status: "승인",
    submitted: false
  },
  {
    id: "TM-1031",
    contestId: "CT-2026-008",
    name: "CivicFlow",
    leader: "한지우",
    members: 3,
    major: "서비스디자인학과",
    status: "승인",
    submitted: true
  },
  {
    id: "TM-1037",
    contestId: "CT-2026-011",
    name: "NexusAI",
    leader: "장현수",
    members: 5,
    major: "인공지능학과",
    status: "보완요청",
    submitted: true
  },
  {
    id: "TM-1044",
    contestId: "CT-2026-014",
    name: "CampusZero",
    leader: "문채원",
    members: 2,
    major: "경영학부",
    status: "검토중",
    submitted: false
  },
  {
    id: "TM-1048",
    contestId: "CT-2026-017",
    name: "Graphers",
    leader: "서민재",
    members: 1,
    major: "통계학과",
    status: "검토중",
    submitted: false
  }
];

export const submissions = [
  {
    id: "SB-8812",
    contestId: "CT-2026-011",
    team: "NexusAI",
    title: "강의 질의응답 자동화 서비스",
    files: 4,
    submittedAt: "06.28 18:22",
    hashReady: true,
    review: "배정완료"
  },
  {
    id: "SB-8815",
    contestId: "CT-2026-008",
    team: "CivicFlow",
    title: "민원 흐름 시각화 플랫폼",
    files: 3,
    submittedAt: "05.20 21:04",
    hashReady: true,
    review: "수상후보"
  },
  {
    id: "SB-8820",
    contestId: "CT-2026-011",
    team: "DeepCampus",
    title: "교내 공지 요약 에이전트",
    files: 5,
    submittedAt: "06.28 23:41",
    hashReady: false,
    review: "미배정"
  },
  {
    id: "SB-8824",
    contestId: "CT-2026-014",
    team: "AlgoWave",
    title: "중고 실험장비 매칭 서비스",
    files: 2,
    submittedAt: "07.16 15:19",
    hashReady: false,
    review: "접수완료"
  },
  {
    id: "SB-8827",
    contestId: "CT-2026-014",
    team: "LinkLab",
    title: "비교과 활동 추천 플랫폼",
    files: 3,
    submittedAt: "07.17 10:04",
    hashReady: false,
    review: "접수완료"
  },
  {
    id: "SB-8830",
    contestId: "CT-2026-014",
    team: "CampusZero",
    title: "캠퍼스 폐기물 순환 서비스",
    files: 2,
    submittedAt: "07.17 16:48",
    hashReady: false,
    review: "대기"
  },
  {
    id: "SB-8835",
    contestId: "CT-2026-008",
    team: "UrbanNest",
    title: "청년 주거 민원 분석 지도",
    files: 4,
    submittedAt: "05.20 20:10",
    hashReady: true,
    review: "수상후보"
  }
];

export const judgingAssignments = [
  {
    id: "JG-01",
    contestId: "CT-2026-014",
    name: "강예린",
    role: "외부 심사위원",
    assigned: 9,
    completed: 5,
    avgScore: 86.4
  },
  {
    id: "JG-02",
    contestId: "CT-2026-014",
    name: "오준석",
    role: "전임교원",
    assigned: 8,
    completed: 7,
    avgScore: 82.1
  },
  {
    id: "JG-03",
    contestId: "CT-2026-014",
    name: "신다은",
    role: "창업지원단",
    assigned: 8,
    completed: 3,
    avgScore: 89.2
  },
  {
    id: "JG-11",
    contestId: "CT-2026-011",
    name: "강예린",
    role: "외부 심사위원",
    assigned: 12,
    completed: 8,
    avgScore: 87.6
  },
  {
    id: "JG-12",
    contestId: "CT-2026-011",
    name: "오준석",
    role: "전임교원",
    assigned: 12,
    completed: 12,
    avgScore: 83.4
  },
  {
    id: "JG-13",
    contestId: "CT-2026-011",
    name: "신다은",
    role: "산학협력 멘토",
    assigned: 10,
    completed: 5,
    avgScore: 90.2
  },
  {
    id: "JG-21",
    contestId: "CT-2026-008",
    name: "윤태성",
    role: "학생처",
    assigned: 7,
    completed: 7,
    avgScore: 91.3
  },
  {
    id: "JG-22",
    contestId: "CT-2026-008",
    name: "하수민",
    role: "외부 심사위원",
    assigned: 7,
    completed: 7,
    avgScore: 88.9
  }
];

export const reviewScores = [
  {
    contestId: "CT-2026-014",
    judgeName: "강예린",
    submissionId: "SB-8824",
    scores: { creativity: 28, completion: 26, impact: 22, delivery: 13 },
    submittedAt: "07.18 10:42"
  },
  {
    contestId: "CT-2026-014",
    judgeName: "강예린",
    submissionId: "SB-8827",
    scores: { creativity: 27, completion: 25, impact: 21, delivery: 12 },
    submittedAt: "07.18 10:58"
  },
  {
    contestId: "CT-2026-014",
    judgeName: "오준석",
    submissionId: "SB-8824",
    scores: { creativity: 24, completion: 28, impact: 20, delivery: 12 },
    submittedAt: "07.18 11:21"
  },
  {
    contestId: "CT-2026-014",
    judgeName: "오준석",
    submissionId: "SB-8827",
    scores: { creativity: 23, completion: 27, impact: 20, delivery: 11 },
    submittedAt: "07.18 11:38"
  },
  {
    contestId: "CT-2026-014",
    judgeName: "신다은",
    submissionId: "SB-8824",
    scores: { creativity: 29, completion: 25, impact: 24, delivery: 14 },
    submittedAt: "07.18 12:10"
  },
  {
    contestId: "CT-2026-014",
    judgeName: "신다은",
    submissionId: "SB-8830",
    scores: { creativity: 26, completion: 24, impact: 23, delivery: 13 },
    submittedAt: "07.18 12:24"
  },
  {
    contestId: "CT-2026-011",
    judgeName: "강예린",
    submissionId: "SB-8812",
    scores: { creativity: 28, completion: 27, impact: 23, delivery: 13 },
    submittedAt: "06.29 09:34"
  },
  {
    contestId: "CT-2026-011",
    judgeName: "오준석",
    submissionId: "SB-8812",
    scores: { creativity: 25, completion: 29, impact: 22, delivery: 12 },
    submittedAt: "06.29 10:12"
  },
  {
    contestId: "CT-2026-011",
    judgeName: "신다은",
    submissionId: "SB-8820",
    scores: { creativity: 30, completion: 26, impact: 24, delivery: 14 },
    submittedAt: "06.29 11:06"
  }
];

export const awardCandidates = [
  {
    rank: 1,
    contestId: "CT-2026-008",
    prize: "대상",
    team: "CivicFlow",
    score: 94.7,
    members: 3,
    status: "확정대기",
    certificateNo: "2026-SD-001"
  },
  {
    rank: 2,
    contestId: "CT-2026-011",
    prize: "최우수상",
    team: "NexusAI",
    score: 92.1,
    members: 5,
    status: "검토중",
    certificateNo: "2026-AI-002"
  },
  {
    rank: 3,
    contestId: "CT-2026-011",
    prize: "우수상",
    team: "DeepCampus",
    score: 89.6,
    members: 4,
    status: "확정대기",
    certificateNo: "2026-AI-003"
  },
  {
    rank: 1,
    contestId: "CT-2026-014",
    prize: "대상 후보",
    team: "AlgoWave",
    score: 85.3,
    members: 2,
    status: "보류",
    certificateNo: "2026-ST-001"
  },
  {
    rank: 2,
    contestId: "CT-2026-014",
    prize: "최우수상 후보",
    team: "LinkLab",
    score: 83.7,
    members: 4,
    status: "검토중",
    certificateNo: "2026-ST-002"
  }
];

export const timeline = [
  { label: "대회 생성", value: "준비중", count: 3 },
  { label: "참가 접수", value: "접수중", count: 1 },
  { label: "제출 접수", value: "제출중", count: 2 },
  { label: "심사", value: "심사중", count: 1 },
  { label: "수상 확정", value: "완료", count: 1 }
];

export const statusTone = {
  준비중: "neutral",
  접수중: "info",
  심사중: "warning",
  수상확정: "success",
  승인: "success",
  보완요청: "danger",
  검토중: "warning",
  배정완료: "info",
  심사완료: "success",
  수상후보: "success",
  미배정: "danger",
  접수완료: "neutral",
  대기: "neutral",
  확정대기: "warning",
  확정: "success",
  보류: "danger"
};
