import test from "node:test";
import assert from "node:assert/strict";
import { normalizeBlockchainEvidence, isSuiDigest } from "../src/lib/blockchainEvidence.js";
import { buildExplorerUrl, getCredentialDisplayStatus, verificationSummary } from "../src/lib/credentialVerification.js";
import { createCredentialLeafHash, processMerkleProof, verifyOperationalCredentialEvidence } from "../src/lib/tamperLab.js";

const hex = digit => `0x${digit.repeat(64)}`;
function credential(provider = "SUI", status = "VALID") {
  const evidence = {
    issuerId: hex("1"), credentialIdHash: hex("2"), schemaVersionHash: hex("3"), contentHash: hex("4"), fileManifestHash: hex("5"),
    canonicalPayloadMatches: true, contentHashMatches: true, fileManifestHashMatches: true, credentialClaimsMatch: true,
    credentialIdMatches: true, merkleProofMatches: true, batchPublicId: "synthetic-batch", merkleProof: [hex("6")],
    chainId: 1001, contractAddress: `0x${"12".repeat(20)}`, transactionHash: hex("7"), blockNumber: 123
  };
  evidence.leafHash = createCredentialLeafHash(evidence);
  evidence.merkleRoot = processMerkleProof(evidence.leafHash, evidence.merkleProof);
  if (provider === "SUI") {
    evidence.blockchain = {
      provider: "SUI", network: "testnet", chainIdentifier: "4c78adac", packageId: hex("a"), registryObjectId: hex("b"),
      transactionDigest: "4pJJ6px463hFXxvEKUD5MQ16jrWZVoACjkUtppoANej6", checkpointSequenceNumber: 381273117,
      checkpointDigest: "Dj35PbjUQugejaLoV9C19ggzr4gQ1iByYD8HA9aeitxE", approvalScheme: "TREKKEY_SUI_APPROVAL_V1"
    };
    Object.assign(evidence, { chainId: 0, contractAddress: hex("a"), transactionHash: evidence.blockchain.transactionDigest, blockNumber: 381273117 });
  }
  return { credentialPublicId: "synthetic-credential", verificationStatus: status, evidence };
}

test("Sui chainId 0과 기존 Kaia가 같은 leaf/root 검증을 통과하고 각자의 탐색기를 사용한다", () => {
  for (const provider of ["SUI", "KAIA"]) {
    const item = credential(provider);
    const result = verifyOperationalCredentialEvidence(item);
    assert.equal(result.verified, true);
    assert.equal(result.chain.provider, provider);
    assert.equal(result.chainRecorded, true);
    assert.equal(verificationSummary(item.evidence, item.verificationStatus).every(check => check.passed), true);
    assert.equal(getCredentialDisplayStatus(item), "VALID");
    assert.match(buildExplorerUrl(item.evidence), provider === "SUI" ? /^https:\/\/suiscan.xyz\/testnet\/tx\// : /^https:\/\/kairos.kaiascan.io\/tx\/0x/);
  }
});

test("Sui provider 표시만으로 성공하지 않고 좌표 누락·혼합·잘못된 digest를 거절한다", () => {
  for (const field of ["network", "chainIdentifier", "packageId", "registryObjectId", "transactionDigest", "checkpointSequenceNumber", "checkpointDigest", "approvalScheme"]) {
    const item = credential();
    delete item.evidence.blockchain[field];
    assert.equal(verifyOperationalCredentialEvidence(item).verified, false, field);
    assert.equal(buildExplorerUrl(item.evidence), "", field);
    assert.equal(getCredentialDisplayStatus(item), "EVIDENCE_INCOMPLETE", field);
  }
  for (const change of [
    { provider: "UNKNOWN" }, { provider: "KAIA" }, { network: "https://attacker.invalid" }, { chainIdentifier: "0x4c78adac" },
    { packageId: hex("0") }, { registryObjectId: "0xab" }, { transactionDigest: hex("1") },
    { checkpointDigest: "1".repeat(44) }, { checkpointSequenceNumber: Number.MAX_SAFE_INTEGER + 1 }, { approvalScheme: "EIP712_V1" }
  ]) {
    const item = credential(); Object.assign(item.evidence.blockchain, change);
    assert.equal(verifyOperationalCredentialEvidence(item).verified, false, JSON.stringify(change));
  }
  for (const change of [{ chainId: 1001 }, { transactionHash: hex("1") }, { blockNumber: 123 }, { contractAddress: hex("c") }]) {
    const item = credential(); Object.assign(item.evidence, change);
    assert.equal(verifyOperationalCredentialEvidence(item).verified, false, JSON.stringify(change));
  }
});

test("Base58 문자 검사만 하지 않고 정확히 32바이트 Sui digest를 검사한다", () => {
  assert.equal(isSuiDigest(credential().evidence.blockchain.transactionDigest), true);
  for (const value of [null, "1".repeat(32), "z".repeat(44), "0".repeat(43), "2".repeat(30), "a".repeat(45)]) assert.equal(isSuiDigest(value), false);
});

test("서버 explorerUrl을 신뢰하거나 Sui localnet을 외부 네트워크로 연결하지 않는다", () => {
  const item = credential();
  item.evidence.blockchain.explorerUrl = "javascript:alert(1)";
  assert.match(buildExplorerUrl(item.evidence), /^https:\/\/suiscan.xyz\/testnet\/tx\//);
  item.evidence.blockchain.network = "localnet";
  assert.equal(normalizeBlockchainEvidence(item.evidence).recorded, true);
  assert.equal(buildExplorerUrl(item.evidence), "");
});

test("Sui와 Kaia 모두 content·leaf·proof·서버 boolean 변조를 감지한다", () => {
  for (const provider of ["SUI", "KAIA"]) {
    for (const change of [{ contentHash: hex("9") }, { leafHash: hex("9") }, { merkleRoot: hex("9") },
      { merkleProof: [hex("9")] }, { merkleProof: null }, { merkleProof: ["garbage"] }, { credentialClaimsMatch: "true" }, { merkleProofMatches: 1 }]) {
      const item = credential(provider); Object.assign(item.evidence, change);
      assert.equal(verifyOperationalCredentialEvidence(item).verified, false, `${provider} ${JSON.stringify(change)}`);
    }
  }
});

test("취소·대체·만료는 무결성 성공과 사용 가능 여부를 분리한다", () => {
  for (const provider of ["SUI", "KAIA"]) for (const status of ["REVOKED", "SUPERSEDED", "EXPIRED"]) {
    const item = credential(provider, status), result = verifyOperationalCredentialEvidence(item);
    assert.equal(result.merkleRootMatches, true); assert.equal(result.chainRecorded, true); assert.equal(result.verified, false);
    assert.equal(getCredentialDisplayStatus(item), status);
  }
});

test("RPC unavailable·pending·unknown·증거 없음은 기록이나 성공을 꾸며내지 않는다", () => {
  for (const status of ["RPC_UNAVAILABLE", "PENDING", "UNKNOWN", "BLOCKCHAIN_CONFIGURATION_ERROR", "ANCHOR_NOT_FOUND", "ISSUER_INVALID", "TAMPERED"]) {
    const item = credential("SUI", status), result = verifyOperationalCredentialEvidence(item);
    assert.equal(result.chainRecorded, false); assert.equal(result.verified, false);
    assert.equal(verificationSummary(item.evidence, status).find(check => check.key === "external").passed, false);
  }
  for (const evidence of [null, undefined, {}, { blockchain: { provider: "SUI", network: "testnet" } }]) {
    const result = verifyOperationalCredentialEvidence({ verificationStatus: "VALID", evidence });
    assert.equal(result.evidenceAvailable, false); assert.equal(result.verified, false);
    assert.equal(getCredentialDisplayStatus({ verificationStatus: "VALID", evidence }), "EVIDENCE_INCOMPLETE");
  }
});

test("명시 Kaia 메타데이터와 옛 Kaia 응답을 모두 지원하되 Sui 필드 혼입은 거절한다", () => {
  const item = credential("KAIA");
  item.evidence.blockchain = { provider: "KAIA", network: "kairos", approvalScheme: "EIP712_V1" };
  assert.equal(verifyOperationalCredentialEvidence(item).verified, true);
  item.evidence.blockchain.registryObjectId = hex("a");
  assert.equal(verifyOperationalCredentialEvidence(item).verified, false);
  delete item.evidence.blockchain;
  item.evidence.chainId = 8217;
  assert.equal(verifyOperationalCredentialEvidence(item).verified, true);
  assert.match(buildExplorerUrl(item.evidence), /^https:\/\/kaiascan.io\/tx\//);
  item.evidence.chainId = 1;
  assert.equal(verifyOperationalCredentialEvidence(item).verified, false);
});
