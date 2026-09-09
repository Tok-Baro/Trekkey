export const REVIEW_ACCESS_SESSION_KEY = "trekkey-review-access-token";

export function getReviewAccessTokenFromHash(hash = "") {
  const value = String(hash);
  if (!value.startsWith("#")) {
    return "";
  }
  return new URLSearchParams(value.slice(1)).get("token")?.trim() ?? "";
}

export function getReviewUrlWithoutToken(pathname = "/judge/review", search = "") {
  const query = new URLSearchParams(search);
  query.delete("token");
  const suffix = query.toString();
  return `${pathname || "/judge/review"}${suffix ? `?${suffix}` : ""}`;
}

// Legacy URLs may contain a token query. Move it to a fragment on replacement so
// subsequent page/API requests never forward it in query strings or referrers.
export function getLegacyReviewDestination(contestId, { search = "", hash = "" } = {}) {
  const query = new URLSearchParams(search);
  const token = getReviewAccessTokenFromHash(hash) || query.get("token")?.trim() || "";
  query.delete("token");
  query.set("contest", String(contestId ?? ""));
  const fragment = token ? `#${new URLSearchParams({ token })}` : "";
  return `/judge/review?${query}${fragment}`;
}

export function assertReviewContestContext(expectedContestId, actualContestId) {
  if (expectedContestId && expectedContestId !== actualContestId) {
    throw new Error("링크의 대회와 심사 권한의 대회가 일치하지 않습니다. 해당 대회의 최신 심사 링크를 확인해 주세요.");
  }
}
