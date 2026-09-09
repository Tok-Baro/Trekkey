import assert from "node:assert/strict";
import test from "node:test";
import {
  getReviewAccessTokenFromHash,
  getReviewUrlWithoutToken,
  getLegacyReviewDestination,
  assertReviewContestContext
} from "../src/lib/reviewerAccess.js";

test("평가위원 로그인 토큰은 URL fragment에서만 읽는다", () => {
  const token = "a".repeat(43);

  assert.equal(getReviewAccessTokenFromHash(`#token=${token}`), token);
  assert.equal(getReviewAccessTokenFromHash(`?token=${token}`), "");
  assert.equal(getReviewAccessTokenFromHash(""), "");
});

test("구형 심사 주소는 대회·라운드를 유지하고 query 토큰을 fragment로 옮긴다", () => {
  const destination = new URL(getLegacyReviewDestination("contest-1", {
    search: "?round=3&token=legacy%2Btoken&view=all"
  }), "https://trekkey.example");
  assert.equal(destination.pathname, "/judge/review");
  assert.equal(destination.searchParams.get("contest"), "contest-1");
  assert.equal(destination.searchParams.get("round"), "3");
  assert.equal(destination.searchParams.get("view"), "all");
  assert.equal(destination.searchParams.has("token"), false);
  assert.equal(getReviewAccessTokenFromHash(destination.hash), "legacy+token");
});

test("구형 주소의 fragment 토큰이 우선이며 중복 query 토큰은 모두 제거한다", () => {
  const destination = new URL(getLegacyReviewDestination("contest-1", {
    search: "?token=wrong&token=also-wrong", hash: "#token=correct"
  }), "https://trekkey.example");
  assert.equal(destination.searchParams.has("token"), false);
  assert.equal(getReviewAccessTokenFromHash(destination.hash), "correct");
});

test("대회와 다른 query 값은 인코딩되며 경로·외부 origin을 변경하지 않는다", () => {
  const contestId = "//evil.example/contest?token=leak#x";
  const destination = new URL(getLegacyReviewDestination(contestId, {
    search: "?round=a%26token%3Db&contest=wrong"
  }), "https://trekkey.example");
  assert.equal(destination.origin, "https://trekkey.example");
  assert.equal(destination.pathname, "/judge/review");
  assert.equal(destination.searchParams.get("contest"), contestId);
  assert.equal(destination.searchParams.get("round"), "a&token=b");
  assert.equal(destination.searchParams.has("token"), false);
  assert.equal(destination.hash, "");
});

test("주소 정리에서도 query 토큰을 남기지 않는다", () => {
  assert.equal(getReviewUrlWithoutToken("/judge/review", "?token=secret&round=3&token=other"),
    "/judge/review?round=3");
});

test("다른 대회의 저장된 심사 세션으로 전환하지 않는다", () => {
  assert.doesNotThrow(() => assertReviewContestContext("contest-1", "contest-1"));
  assert.doesNotThrow(() => assertReviewContestContext(null, "contest-1"));
  assert.throws(() => assertReviewContestContext("contest-1", "contest-2"), /대회가 일치하지/);
  assert.throws(() => assertReviewContestContext("contest-1", undefined), /대회가 일치하지/);
});

test("토큰을 읽은 뒤 주소에는 path와 query만 남긴다", () => {
  assert.equal(
    getReviewUrlWithoutToken("/judge/review", "?round=3"),
    "/judge/review?round=3"
  );
});
