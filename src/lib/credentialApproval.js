import sha3 from "js-sha3";
import { isHash32, isObjectId } from "./blockchainEvidence.js";

const SCHEME = "TREKKEY_SUI_APPROVAL_V1";
const FIELDS = {
  BatchApproval: [
    ["issuerId", "bytes32"], ["batchIdHash", "bytes32"], ["merkleRoot", "bytes32"], ["schemaVersionHash", "bytes32"],
    ["leafCount", "uint32"], ["treeVersion", "uint16"], ["issuerKeyVersion", "uint64"], ["approvalNonce", "uint64"], ["deadline", "uint64"]
  ],
  StatusApproval: [
    ["issuerId", "bytes32"], ["credentialIdHash", "bytes32"], ["action", "uint8"], ["replacementCredentialIdHash", "bytes32"],
    ["effectiveAt", "uint64"], ["issuerKeyVersion", "uint64"], ["approvalNonce", "uint64"], ["deadline", "uint64"]
  ]
};
const DOMAIN_FIELDS = [["name", "string"], ["version", "string"], ["chainId", "uint256"], ["verifyingContract", "address"]];
const encoder = new TextEncoder();
const hash = bytes => `0x${sha3.keccak256(bytes)}`;
const bytes = hex => Uint8Array.from(hex.slice(2).match(/../g), value => parseInt(value, 16));
const concat = (...parts) => Uint8Array.from(parts.flatMap(part => [...part]));
const typeHash = (name, fields) => hash(encoder.encode(`${name}(${fields.map(([field, type]) => `${type} ${field}`).join(",")})`));

function unsigned(value, bits) {
  if (typeof value === "number" && !Number.isSafeInteger(value)) throw new Error("안전하게 표현할 수 없는 승인 숫자입니다.");
  if (!/^(0|[1-9][0-9]*)$/.test(String(value))) throw new Error("승인 숫자 형식이 올바르지 않습니다.");
  const number = BigInt(value);
  if (number >= 1n << BigInt(bits)) throw new Error("승인 숫자가 허용 범위를 벗어났습니다.");
  return number;
}

function word(value, type) {
  if (type === "bytes32") {
    if (!isHash32(value)) throw new Error("승인 해시 형식이 올바르지 않습니다.");
    return bytes(value);
  }
  return bytes(`0x${unsigned(value, Number(type.slice(4))).toString(16).padStart(64, "0")}`);
}

function matchesTypes(actual, expected) {
  return Array.isArray(actual) && actual.length === expected.length
    && actual.every((field, index) => field.name === expected[index][0] && field.type === expected[index][1]);
}

/** Rebuild the exact server approval digest; this never signs or accesses a wallet. */
export function calculateApprovalDigest(payload) {
  const fields = FIELDS[payload?.primaryType];
  const domain = payload?.domain;
  if (!fields || !domain || !payload.message) throw new Error("지원하지 않는 기관 승인 형식입니다.");
  const struct = hash(concat(bytes(typeHash(payload.primaryType, fields)), ...fields.map(([field, type]) => word(payload.message[field], type))));
  let domainHash;
  if (payload.scheme === SCHEME) {
    if (payload.signatureScheme !== "secp256k1-recoverable-low-s" || payload.types
      || !/^[0-9a-fA-F]{8}$/.test(domain.chainIdentifier ?? "")
      || !isObjectId(domain.packageId) || !isObjectId(domain.registryId)
      || domain.chainId != null || domain.verifyingContract != null) throw new Error("Sui 기관 승인 도메인을 확인할 수 없습니다.");
    domainHash = hash(concat(encoder.encode(SCHEME), bytes(`0x${domain.chainIdentifier}`), bytes(domain.packageId), bytes(domain.registryId)));
  } else {
    if (payload.scheme != null || domain.name !== "TrekkeyCredentialRegistry" || domain.version !== "1"
      || !["1001", "8217"].includes(String(domain.chainId)) || !/^0x[0-9a-fA-F]{40}$/.test(domain.verifyingContract ?? "")
      || /^0x0{40}$/.test(domain.verifyingContract) || domain.chainIdentifier != null || domain.packageId != null || domain.registryId != null
      || !matchesTypes(payload.types?.EIP712Domain, DOMAIN_FIELDS) || !matchesTypes(payload.types?.[payload.primaryType], fields)) {
      throw new Error("Kaia EIP-712 승인 도메인을 확인할 수 없습니다.");
    }
    domainHash = hash(concat(bytes(typeHash("EIP712Domain", DOMAIN_FIELDS)), bytes(hash(encoder.encode(domain.name))),
      bytes(hash(encoder.encode(domain.version))), word(domain.chainId, "uint256"), bytes(`0x${domain.verifyingContract.slice(2).padStart(64, "0")}`)));
  }
  return hash(concat(Uint8Array.of(0x19, 0x01), bytes(domainHash), bytes(struct)));
}

export function inspectCredentialApproval(approval, expected = {}, now = Date.now()) {
  const result = { supported: false, label: "승인 정보 확인 필요", payloadLabel: "기관 승인 JSON", instruction: "승인 정보를 먼저 조회하고 대상·방식·기한을 확인해 주세요." };
  if (!approval) return result;
  try {
    const payload = JSON.parse(approval.typedDataJson);
    const digest = calculateApprovalDigest(payload);
    if (!isHash32(approval.digestHex) || digest !== approval.digestHex.toLowerCase()
      || (payload.scheme === SCHEME && payload.digestHex?.toLowerCase() !== digest)) throw new Error("기관 승인 digest가 재계산 결과와 일치하지 않습니다.");
    if ((approval.aggregateType === "BATCH" ? "BatchApproval" : approval.aggregateType === "STATUS_EVENT" ? "StatusApproval" : null) !== payload.primaryType
      || (expected.aggregateType && approval.aggregateType !== expected.aggregateType)
      || (expected.aggregateId != null && String(approval.aggregateId) !== String(expected.aggregateId))) throw new Error("선택한 작업과 승인 대상이 다릅니다. 다시 조회해 주세요.");
    const deadline = unsigned(payload.message.deadline, 64);
    if (unsigned(approval.approvalNonce, 64) !== unsigned(payload.message.approvalNonce, 64)
      || !Number.isFinite(Date.parse(approval.deadline)) || BigInt(Math.floor(Date.parse(approval.deadline) / 1000)) !== deadline
      || (expected.deadline != null && (!Number.isFinite(Date.parse(expected.deadline)) || BigInt(Math.floor(Date.parse(expected.deadline) / 1000)) !== deadline))) {
      throw new Error("승인 nonce 또는 기한이 최신 작업과 일치하지 않습니다.");
    }
    if (deadline * 1000n <= BigInt(now)) throw new Error("승인 기한이 만료되었습니다. 갱신 후 다시 서명해 주세요.");
    if (expected.merkleRoot && payload.message.merkleRoot?.toLowerCase() !== expected.merkleRoot.toLowerCase()) throw new Error("선택한 배치의 Merkle Root와 승인 내용이 다릅니다.");
    const sui = payload.scheme === SCHEME;
    return {
      supported: true, provider: sui ? "SUI" : "KAIA", digest,
      label: sui ? "Sui 기관 승인 · TREKKEY_SUI_APPROVAL_V1" : "Kaia 기관 승인 · EIP-712",
      payloadLabel: sui ? "기관 승인 JSON (EIP-712 아님)" : "EIP-712 Typed data JSON",
      instruction: sui
        ? "등록된 기관의 secp256k1 키로 이 digest에 대한 recoverable low-s 서명이 필요합니다. Slush의 일반 Sui 트랜잭션·Ed25519·개인 메시지 서명과 다릅니다. 키를 이 화면에 입력하지 마세요."
        : "등록된 기관 키로 이 EIP-712 Typed data에 서명한 65바이트 서명을 입력하세요. 개인 메시지 서명이 아니며, 키를 이 화면에 입력하지 마세요.",
      domain: payload.domain
    };
  } catch (error) {
    return { ...result, instruction: error instanceof Error ? error.message : "기관 승인 정보를 확인하지 못했습니다." };
  }
}

export function validateIssuerSignature(value) {
  const signature = String(value ?? "").trim();
  if (!/^0x[0-9a-fA-F]{130}$/.test(signature)) return "기관 서명은 0x로 시작하는 65바이트 secp256k1 hex 값이어야 합니다.";
  const r = BigInt(`0x${signature.slice(2, 66)}`), s = BigInt(`0x${signature.slice(66, 130)}`);
  const v = parseInt(signature.slice(130), 16);
  if (r === 0n || r >= 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n
    || s === 0n || s > 0x7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0n || ![0, 1, 27, 28].includes(v)) {
    return "기관 서명은 유효한 r·low-s·복구 ID(0, 1, 27, 28)를 포함해야 합니다.";
  }
  return "";
}
