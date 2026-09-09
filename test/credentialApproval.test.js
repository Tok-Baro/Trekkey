import test from "node:test";
import assert from "node:assert/strict";
import { calculateApprovalDigest, inspectCredentialApproval, validateIssuerSignature } from "../src/lib/credentialApproval.js";

const hex = digit => `0x${digit.repeat(64)}`;
const domain = { chainIdentifier: "a1b2c3d4", packageId: hex("1"), registryId: hex("2") };
const batchFields = [["issuerId", "bytes32"], ["batchIdHash", "bytes32"], ["merkleRoot", "bytes32"], ["schemaVersionHash", "bytes32"], ["leafCount", "uint32"], ["treeVersion", "uint16"], ["issuerKeyVersion", "uint64"], ["approvalNonce", "uint64"], ["deadline", "uint64"]];
const statusFields = [["issuerId", "bytes32"], ["credentialIdHash", "bytes32"], ["action", "uint8"], ["replacementCredentialIdHash", "bytes32"], ["effectiveAt", "uint64"], ["issuerKeyVersion", "uint64"], ["approvalNonce", "uint64"], ["deadline", "uint64"]];
const messages = {
  BatchApproval: { issuerId: hex("3"), batchIdHash: hex("4"), merkleRoot: hex("5"), schemaVersionHash: hex("6"), leafCount: "3", treeVersion: "1", issuerKeyVersion: "2", approvalNonce: "7", deadline: "2000000000" },
  StatusApproval: { issuerId: hex("3"), credentialIdHash: hex("7"), action: "1", replacementCredentialIdHash: hex("8"), effectiveAt: "1800000000", issuerKeyVersion: "2", approvalNonce: "8", deadline: "2000000000" }
};
// Public fixed vectors from the Java/Move approval-v1 fixture. Kaia vectors cross-checked
// with ethers TypedDataEncoder using the same messages and the EIP-712 domain below.
const digests = {
  SUI: { BatchApproval: "0xcdfa224dd54a421545b2c4f4c13508d21f9523181f58ce7334506c2278602c7e", StatusApproval: "0x73720dcece4ae50505fc8b7628d662b4717c841dcc99915dd9988e1d1025dce5" },
  KAIA: { BatchApproval: "0x23be7403f2a8fb9b8c3865444c248a722dc601b2bd49f31cd761c21c87e44f7a", StatusApproval: "0x1b596ac4a06786b9375cf1847751267a6316b54b6b88eb146e879d50887d63f1" }
};
function payload(provider = "SUI", primaryType = "BatchApproval") {
  const item = { primaryType, message: { ...messages[primaryType] } };
  if (provider === "SUI") return { ...item, scheme: "TREKKEY_SUI_APPROVAL_V1", signatureScheme: "secp256k1-recoverable-low-s", domain: { ...domain }, digestHex: digests.SUI[primaryType] };
  return { ...item,
    domain: { name: "TrekkeyCredentialRegistry", version: "1", chainId: "1001", verifyingContract: `0x${"12".repeat(20)}` },
    types: {
      EIP712Domain: [["name", "string"], ["version", "string"], ["chainId", "uint256"], ["verifyingContract", "address"]].map(([name, type]) => ({ name, type })),
      [primaryType]: (primaryType === "BatchApproval" ? batchFields : statusFields).map(([name, type]) => ({ name, type }))
    }
  };
}
function approval(provider = "SUI", type = "BatchApproval") {
  return { aggregateType: type === "BatchApproval" ? "BATCH" : "STATUS_EVENT", aggregateId: "synthetic-1", typedDataJson: JSON.stringify(payload(provider, type)),
    digestHex: digests[provider][type], approvalNonce: Number(messages[type].approvalNonce), deadline: new Date(2000000000000).toISOString() };
}
const now = 1800000000000;

test("Sui와 Kaia의 배치·상태 승인 digest가 각 공개 고정 벡터와 정확히 일치한다", () => {
  for (const provider of ["SUI", "KAIA"]) for (const type of ["BatchApproval", "StatusApproval"]) {
    assert.equal(calculateApprovalDigest(payload(provider, type)), digests[provider][type]);
    const inspected = inspectCredentialApproval(approval(provider, type), { aggregateId: "synthetic-1" }, now);
    assert.equal(inspected.supported, true); assert.equal(inspected.provider, provider);
    assert.match(inspected.instruction, provider === "SUI" ? /Slush.*Ed25519.*다릅니다/ : /EIP-712 Typed data/);
  }
});

test("승인 데이터 변조와 기관 domain 교체가 digest 재계산에서 거절된다", () => {
  for (const provider of ["SUI", "KAIA"]) {
    for (const change of [item => { item.message.merkleRoot = hex("9"); }, item => { item.message.approvalNonce = "9"; },
      item => { item.message.deadline = "2000000001"; }, item => { item.domain[provider === "SUI" ? "registryId" : "verifyingContract"] = provider === "SUI" ? hex("9") : `0x${"99".repeat(20)}`; }]) {
      const item = approval(provider), data = JSON.parse(item.typedDataJson); change(data); item.typedDataJson = JSON.stringify(data);
      assert.equal(inspectCredentialApproval(item, {}, now).supported, false);
    }
  }
});

test("대상·nonce·기한·Root가 다른 오래된 승인으로 제출할 수 없다", () => {
  const original = approval();
  for (const expected of [{ aggregateId: "other" }, { aggregateType: "STATUS_EVENT" }, { deadline: "2030-01-01T00:00:00Z" }, { merkleRoot: hex("9") }]) {
    assert.equal(inspectCredentialApproval(original, expected, now).supported, false);
  }
  for (const change of [{ approvalNonce: 8 }, { deadline: "invalid" }, { aggregateType: "UNSUPPORTED" }, { digestHex: hex("9") }, { typedDataJson: "{" }]) {
    assert.equal(inspectCredentialApproval({ ...original, ...change }, {}, now).supported, false);
  }
  assert.equal(inspectCredentialApproval(original, {}, 2000000000000).supported, false);
});

test("unknown·혼합·personal sign/Slush 형식은 기관 승인으로 해석하지 않는다", () => {
  for (const mutate of [
    p => { p.scheme = "FUTURE"; }, p => { p.signatureScheme = "Ed25519"; }, p => { p.domain.chainId = "1001"; },
    p => { p.domain.registryId = hex("0"); }, p => { p.domain.chainIdentifier = "0xa1b2c3d4"; }, p => { p.types = {}; },
    p => { p.primaryType = "PersonalMessage"; }, p => { p.message.leafCount = "4294967296"; }, p => { p.message.approvalNonce = Number.MAX_SAFE_INTEGER + 1; }
  ]) {
    const item = approval(), data = JSON.parse(item.typedDataJson); mutate(data); item.typedDataJson = JSON.stringify(data);
    assert.equal(inspectCredentialApproval(item, {}, now).supported, false);
  }
  const legacy = payload("KAIA"); legacy.types.BatchApproval[0].type = "string";
  assert.throws(() => calculateApprovalDigest(legacy));
  assert.equal(inspectCredentialApproval(null).supported, false);
});

test("65바이트라도 high-s·잘못된 복구 ID·영 scalar 서명은 거절한다", () => {
  const signature = `0x${"1".padStart(64, "0")}${"2".padStart(64, "0")}1b`;
  assert.equal(validateIssuerSignature(signature), "");
  for (const v of ["00", "01", "1c"]) assert.equal(validateIssuerSignature(`${signature.slice(0, -2)}${v}`), "");
  for (const invalid of ["not-a-signature", "0x123", `0x${"0".repeat(128)}1b`, `${signature.slice(0, -2)}02`,
    `0x${"f".repeat(64)}${"2".padStart(64, "0")}1b`, `0x${"1".padStart(64, "0")}${"f".repeat(64)}1b`]) {
    assert.notEqual(validateIssuerSignature(invalid), "");
  }
});
