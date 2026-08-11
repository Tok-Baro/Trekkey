import assert from "node:assert/strict";
import test from "node:test";
import {
  getReviewAccessTokenFromHash,
  getReviewUrlWithoutToken
} from "../src/lib/reviewerAccess.js";

test("평가위원 로그인 토큰은 URL fragment에서만 읽는다", () => {
  const token = "a".repeat(43);

  assert.equal(getReviewAccessTokenFromHash(`#token=${token}`), token);
  assert.equal(getReviewAccessTokenFromHash(`?token=${token}`), "");
  assert.equal(getReviewAccessTokenFromHash(""), "");
});

test("토큰을 읽은 뒤 주소에는 path와 query만 남긴다", () => {
  assert.equal(
    getReviewUrlWithoutToken("/judge/review", "?round=3"),
    "/judge/review?round=3"
  );
});
