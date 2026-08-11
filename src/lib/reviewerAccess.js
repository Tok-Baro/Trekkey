export const REVIEW_ACCESS_SESSION_KEY = "trekkey-review-access-token";

export function getReviewAccessTokenFromHash(hash = "") {
  const value = String(hash);
  if (!value.startsWith("#")) {
    return "";
  }
  return new URLSearchParams(value.slice(1)).get("token")?.trim() ?? "";
}

export function getReviewUrlWithoutToken(pathname = "/judge/review", search = "") {
  return `${pathname || "/judge/review"}${search || ""}`;
}
