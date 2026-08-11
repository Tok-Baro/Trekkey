import assert from "node:assert/strict";
import test from "node:test";
import {
  buildExplorerUrl,
  getVerificationPresentation,
  normalizeCredentialInput,
  verificationSummary
} from "../src/lib/credentialVerification.js";

test("QR 전체 링크와 공개 ID를 같은 검증 코드로 정규화한다", () => {
  const id = "4a1c0ec7-528b-4b89-b890-1ac927f996a4";

  assert.equal(normalizeCredentialInput(id), id);
  assert.equal(normalizeCredentialInput(`https://trekkey.vercel.app/verify/${id}?source=qr`), id);
  assert.equal(normalizeCredentialInput(`#${id}`), id);
});

test("일반 사용자용 검증 문구는 블록체인 용어 없이 상태를 설명한다", () => {
  const valid = getVerificationPresentation("VALID", "한성대학교");
  const revoked = getVerificationPresentation("REVOKED", "한성대학교");

  assert.equal(valid.headline, "한성대학교가 발급한 유효한 증명서입니다");
  assert.match(valid.description, /외부 등록 기록/);
  assert.match(revoked.description, /사용하면 안 됩니다/);
});

test("검증 요약은 기관·내용·외부 기록을 분리한다", () => {
  const checks = verificationSummary({
    canonicalPayloadMatches: true,
    contentHashMatches: true,
    fileManifestHashMatches: true,
    credentialClaimsMatch: true,
    credentialIdMatches: true,
    merkleProofMatches: true,
    issuerId: "0xissuer",
    transactionHash: "0xtx"
  });

  assert.deepEqual(checks.map((item) => item.key), ["issuer", "content", "external"]);
  assert.equal(checks.every((item) => item.passed), true);
});

test("Kaia 네트워크별 공개 원장 링크를 만든다", () => {
  assert.equal(buildExplorerUrl(1001, "0xabc"), "https://kairos.kaiascan.io/tx/0xabc");
  assert.equal(buildExplorerUrl(8217, "0xabc"), "https://kaiascan.io/tx/0xabc");
  assert.equal(buildExplorerUrl(1, "0xabc"), "");
});
