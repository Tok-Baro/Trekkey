export const adminRoutes = [
  { id: "dashboard", path: "/", label: "대시보드", heading: "운영 현황" },
  { id: "contests", path: "/contests", label: "대회", heading: "대회 생성 및 일정 관리" },
  { id: "teams", path: "/teams", label: "신청/팀", heading: "참가 신청과 팀 관리" },
  { id: "submissions", path: "/submissions", label: "제출물", heading: "제출물 접수" },
  { id: "judging", path: "/judging", label: "심사", heading: "심사 배정 및 점수 관리" },
  { id: "awards", path: "/awards", label: "수상 확정", heading: "수상자 확정" }
];

export const routeByPage = adminRoutes.reduce((acc, route) => {
  acc[route.id] = route;
  return acc;
}, {});

export function getPageFromPath(pathname) {
  return adminRoutes.find((route) => route.path === pathname)?.id ?? "dashboard";
}

export function getPageHeading(page) {
  return routeByPage[page]?.heading ?? routeByPage.dashboard.heading;
}

export function getAdminPath(page, contestId) {
  const path = routeByPage[page]?.path ?? routeByPage.dashboard.path;
  if (!contestId || page === "dashboard") {
    return path;
  }

  return `${path}?contest=${encodeURIComponent(contestId)}`;
}

export function getReviewPath(contestId, roundId) {
  const path = `/review/${encodeURIComponent(contestId)}`;
  return roundId ? `${path}?round=${encodeURIComponent(roundId)}` : path;
}

export function getContestDetailPath(contestId) {
  return `/contest/${encodeURIComponent(contestId)}`;
}

export function getLoginPath() {
  return "/login";
}

export function getParticipantPath() {
  return "/participant";
}
