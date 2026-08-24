import sha3 from "js-sha3";

const { keccak256 } = sha3;

const textEncoder = new TextEncoder();

export const TREKKEY_LEAF_DOMAIN =
  "0x5d94c81e6ec3080e984cba1adb7df83a737c11ae46c6d9b02eb62d3ed54d58ed";
export const ANCHOR_BATCH_GAS_SAMPLE = 202_598;

export const TAMPER_SCENARIOS = [
  {
    id: "VALID",
    label: "정상",
    headline: "기관 승인 내용과 공개 기록이 일치합니다",
    description: "원문 해시와 Merkle Proof가 모두 일치하고 현재 효력이 있습니다."
  },
  {
    id: "TAMPERED",
    label: "내용 변조",
    headline: "수상 결과 한 글자가 바뀌어 검증이 실패합니다",
    description: "변경된 원문은 다른 contentHash와 leaf를 만들기 때문에 기존 Proof로 같은 Root에 도달하지 못합니다."
  },
  {
    id: "REVOKED",
    label: "발급 취소",
    headline: "내용은 진짜지만 현재 사용할 수 없습니다",
    description: "과거 발급과 무결성은 확인되지만 발급기관이 효력을 취소한 상태입니다."
  },
  {
    id: "SUPERSEDED",
    label: "정정 발급",
    headline: "더 최신인 Credential로 대체되었습니다",
    description: "기존 기록을 덮어쓰지 않고 정정 계보를 따라 최신 Credential을 확인합니다."
  }
];

const DEMO_CREDENTIALS = [
  {
    credentialPublicId: "cred-demo-participation-01",
    credentialNo: "HSCRED-DEMO-001",
    credentialType: "PARTICIPATION",
    issuedAt: "2026-08-18T06:00:00Z",
    issuer: { name: "한성대학교", publicId: "org-hansung-demo" },
    source: {
      type: "PARTICIPATION",
      publicId: "participation-demo-01",
      snapshot: { contestTitle: "2026 공학경진대회", teamName: "Trekkey" }
    },
    subjects: [
      { type: "USER", ref: "subject-demo-a", displayName: "김트레키", major: "컴퓨터공학부", roleCode: "MEMBER" }
    ]
  },
  {
    credentialPublicId: "cred-demo-work-01",
    credentialNo: "HSCRED-DEMO-002",
    credentialType: "WORK",
    issuedAt: "2026-08-18T06:01:00Z",
    issuer: { name: "한성대학교", publicId: "org-hansung-demo" },
    source: {
      type: "WORK",
      publicId: "work-demo-01",
      snapshot: { contestTitle: "2026 공학경진대회", teamName: "Trekkey", submissionTitle: "검증 가능한 대학 활동 네트워크" }
    },
    subjects: [
      { type: "TEAM", ref: "team-demo-trekkey", displayName: "Trekkey", major: "컴퓨터공학부", roleCode: "TEAM" }
    ]
  },
  {
    credentialPublicId: "cred-demo-award-01",
    credentialNo: "HSCRED-DEMO-003",
    credentialType: "AWARD",
    issuedAt: "2026-08-18T06:02:00Z",
    issuer: { name: "한성대학교", publicId: "org-hansung-demo" },
    source: {
      type: "AWARD",
      publicId: "award-demo-01",
      snapshot: { contestTitle: "2026 공학경진대회", teamName: "Trekkey", prize: "대상", awardRankNo: 1 }
    },
    subjects: [
      { type: "USER", ref: "subject-demo-a", displayName: "김트레키", major: "컴퓨터공학부", roleCode: "AWARDEE" }
    ]
  },
  {
    credentialPublicId: "cred-demo-award-02",
    credentialNo: "HSCRED-DEMO-004",
    credentialType: "AWARD",
    issuedAt: "2026-08-18T06:03:00Z",
    issuer: { name: "한성대학교", publicId: "org-hansung-demo" },
    source: {
      type: "AWARD",
      publicId: "award-demo-02",
      snapshot: { contestTitle: "2026 공학경진대회", teamName: "Proof Crew", prize: "최우수상", awardRankNo: 2 }
    },
    subjects: [
      { type: "USER", ref: "subject-demo-b", displayName: "이프루프", major: "AI응용학과", roleCode: "AWARDEE" }
    ]
  }
];

function normalizeString(value) {
  return value.normalize("NFC");
}

export function canonicalizeJson(value) {
  if (value === null) {
    return "null";
  }
  if (typeof value === "string") {
    return JSON.stringify(normalizeString(value));
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError("Canonical JSON does not support non-finite numbers");
    }
    return JSON.stringify(value);
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalizeJson(item)).join(",")}]`;
  }
  if (typeof value === "object") {
    const entries = Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(normalizeString(key))}:${canonicalizeJson(value[key])}`);
    return `{${entries.join(",")}}`;
  }
  throw new TypeError(`Unsupported canonical JSON type: ${typeof value}`);
}

function bytesToHex(bytes) {
  return `0x${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function hexToBytes(value) {
  const hex = String(value).replace(/^0x/, "").toLowerCase();
  if (!/^[0-9a-f]*$/.test(hex) || hex.length % 2 !== 0) {
    throw new TypeError("Expected an even-length hexadecimal value");
  }
  const result = new Uint8Array(hex.length / 2);
  for (let index = 0; index < result.length; index += 1) {
    result[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return result;
}

function concatBytes(...values) {
  const length = values.reduce((sum, value) => sum + value.length, 0);
  const result = new Uint8Array(length);
  let offset = 0;
  values.forEach((value) => {
    result.set(value, offset);
    offset += value.length;
  });
  return result;
}

function keccakHex(value) {
  return `0x${keccak256(value)}`;
}

export function keccakUtf8(value) {
  return keccakHex(textEncoder.encode(normalizeString(value)));
}

export async function sha256Hex(value) {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Web Crypto SHA-256 is unavailable");
  }
  const bytes = typeof value === "string" ? textEncoder.encode(value) : value;
  return bytesToHex(new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", bytes)));
}

function requireBytes32(value) {
  const bytes = hexToBytes(value);
  if (bytes.length !== 32) {
    throw new TypeError("Trekkey Merkle leaf values must be bytes32");
  }
  return bytes;
}

export function createCredentialLeafHash({ issuerId, credentialIdHash, schemaVersionHash, contentHash, fileManifestHash }) {
  const encodedTuple = concatBytes(
    requireBytes32(TREKKEY_LEAF_DOMAIN),
    requireBytes32(issuerId),
    requireBytes32(credentialIdHash),
    requireBytes32(schemaVersionHash),
    requireBytes32(contentHash),
    requireBytes32(fileManifestHash)
  );
  const innerHash = hexToBytes(keccakHex(encodedTuple));
  return keccakHex(innerHash);
}

export function hashMerklePair(left, right) {
  const ordered = [left.toLowerCase(), right.toLowerCase()].sort();
  return keccakHex(concatBytes(hexToBytes(ordered[0]), hexToBytes(ordered[1])));
}

export function buildStandardMerkleTree(leaves) {
  if (!Array.isArray(leaves) || leaves.length === 0) {
    throw new TypeError("At least one leaf is required");
  }

  const sortedEntries = leaves
    .map((hash, originalIndex) => ({ hash: hash.toLowerCase(), originalIndex }))
    .sort((left, right) => left.hash.localeCompare(right.hash));
  const tree = new Array(2 * leaves.length - 1);
  const treeIndexByOriginalIndex = new Array(leaves.length);

  sortedEntries.forEach((entry, sortedIndex) => {
    const treeIndex = tree.length - 1 - sortedIndex;
    tree[treeIndex] = entry.hash;
    treeIndexByOriginalIndex[entry.originalIndex] = treeIndex;
  });

  for (let index = tree.length - 1 - leaves.length; index >= 0; index -= 1) {
    tree[index] = hashMerklePair(tree[index * 2 + 1], tree[index * 2 + 2]);
  }

  return {
    root: tree[0],
    tree,
    sortedLeaves: sortedEntries.map((entry) => entry.hash),
    treeIndexByOriginalIndex
  };
}

export function getMerkleProof(treeData, originalIndex) {
  let treeIndex = treeData.treeIndexByOriginalIndex[originalIndex];
  if (!Number.isInteger(treeIndex)) {
    throw new RangeError("Unknown original leaf index");
  }
  const proof = [];
  while (treeIndex > 0) {
    const siblingIndex = treeIndex % 2 === 0 ? treeIndex - 1 : treeIndex + 1;
    proof.push(treeData.tree[siblingIndex]);
    treeIndex = Math.floor((treeIndex - 1) / 2);
  }
  return proof;
}

export function processMerkleProof(leafHash, proof) {
  return proof.reduce((current, sibling) => hashMerklePair(current, sibling), leafHash.toLowerCase());
}

export function verifyOperationalCredentialEvidence(credential) {
  const evidence = credential?.evidence;
  if (!evidence) {
    throw new TypeError("Credential evidence is required");
  }

  const requiredFields = [
    "issuerId",
    "credentialIdHash",
    "schemaVersionHash",
    "contentHash",
    "fileManifestHash",
    "leafHash",
    "merkleRoot"
  ];
  const missingFields = requiredFields.filter((field) => !evidence[field]);
  if (missingFields.length > 0) {
    throw new TypeError(`Operational evidence is incomplete: ${missingFields.join(", ")}`);
  }

  const calculatedLeafHash = createCredentialLeafHash({
    issuerId: evidence.issuerId,
    credentialIdHash: evidence.credentialIdHash,
    schemaVersionHash: evidence.schemaVersionHash,
    contentHash: evidence.contentHash,
    fileManifestHash: evidence.fileManifestHash
  });
  const proof = Array.isArray(evidence.merkleProof) ? evidence.merkleProof : [];
  const calculatedRoot = processMerkleProof(calculatedLeafHash, proof);
  const leafMatches = calculatedLeafHash.toLowerCase() === evidence.leafHash.toLowerCase();
  const merkleRootMatches = calculatedRoot.toLowerCase() === evidence.merkleRoot.toLowerCase();
  const payloadChecks = [
    evidence.canonicalPayloadMatches,
    evidence.contentHashMatches,
    evidence.fileManifestHashMatches,
    evidence.credentialClaimsMatch,
    evidence.credentialIdMatches
  ];
  const payloadMatches = payloadChecks.every(Boolean);
  const chainRecorded = Boolean(
    evidence.transactionHash
    && evidence.contractAddress
    && evidence.batchPublicId
    && Number(evidence.chainId) > 0
  );

  return {
    credentialPublicId: credential.credentialPublicId,
    verificationStatus: credential.verificationStatus,
    payloadMatches,
    leafMatches,
    merkleRootMatches,
    backendProofMatches: Boolean(evidence.merkleProofMatches),
    chainRecorded,
    calculatedLeafHash,
    expectedLeafHash: evidence.leafHash,
    calculatedRoot,
    expectedRoot: evidence.merkleRoot,
    proofDepth: proof.length,
    chainId: evidence.chainId,
    contractAddress: evidence.contractAddress,
    transactionHash: evidence.transactionHash,
    blockNumber: evidence.blockNumber,
    batchPublicId: evidence.batchPublicId,
    verified: credential.verificationStatus === "VALID"
      && payloadMatches
      && leafMatches
      && merkleRootMatches
      && Boolean(evidence.merkleProofMatches)
      && chainRecorded
  };
}

function copyCredential(credential) {
  return JSON.parse(JSON.stringify(credential));
}

async function credentialCommitment(credential) {
  const canonical = canonicalizeJson(credential);
  const contentHash = await sha256Hex(canonical);
  const leafInput = {
    issuerId: keccakUtf8("issuer:trekkey:hansung-demo"),
    credentialIdHash: keccakUtf8(`credential:${credential.credentialPublicId}`),
    schemaVersionHash: keccakUtf8("credential-schema:1"),
    contentHash,
    fileManifestHash: await sha256Hex("[]")
  };
  return {
    canonical,
    contentHash,
    leafInput,
    leafHash: createCredentialLeafHash(leafInput)
  };
}

export async function createTamperLabFixture() {
  const credentials = DEMO_CREDENTIALS.map(copyCredential);
  const commitments = await Promise.all(credentials.map(credentialCommitment));
  const tree = buildStandardMerkleTree(commitments.map((commitment) => commitment.leafHash));
  const targetIndex = 2;
  return {
    generatedAt: "2026-08-18T06:10:00Z",
    credentials,
    commitments,
    batch: {
      batchPublicId: "batch-demo-engineering-2026",
      root: tree.root,
      credentialCount: credentials.length,
      treeVersion: 1,
      chainId: 1001,
      issuerApproval: "VALID_DEMO_FIXTURE"
    },
    targetIndex,
    targetCredential: credentials[targetIndex],
    targetCommitment: commitments[targetIndex],
    proof: getMerkleProof(tree, targetIndex)
  };
}

export async function evaluateTamperScenario(fixture, scenarioId, changedPrize = "최우수상") {
  const credential = copyCredential(fixture.targetCredential);
  if (scenarioId === "TAMPERED") {
    credential.source.snapshot.prize = changedPrize || "최우수상";
  }

  const candidate = await credentialCommitment(credential);
  const calculatedRoot = processMerkleProof(candidate.leafHash, fixture.proof);
  const contentMatches = candidate.contentHash === fixture.targetCommitment.contentHash;
  const merkleProofMatches = calculatedRoot === fixture.batch.root;
  const issuerApprovalMatches = true;
  const lifecycleStatus = scenarioId === "REVOKED"
    ? "REVOKED"
    : scenarioId === "SUPERSEDED"
      ? "SUPERSEDED"
      : "ACTIVE";
  const verificationStatus = !contentMatches || !merkleProofMatches
    ? "TAMPERED"
    : lifecycleStatus === "REVOKED"
      ? "REVOKED"
      : lifecycleStatus === "SUPERSEDED"
        ? "SUPERSEDED"
        : "VALID";

  return {
    scenarioId,
    verificationStatus,
    credential,
    originalPrize: fixture.targetCredential.source.snapshot.prize,
    candidatePrize: credential.source.snapshot.prize,
    canonical: candidate.canonical,
    expectedContentHash: fixture.targetCommitment.contentHash,
    calculatedContentHash: candidate.contentHash,
    expectedLeafHash: fixture.targetCommitment.leafHash,
    calculatedLeafHash: candidate.leafHash,
    expectedRoot: fixture.batch.root,
    calculatedRoot,
    contentMatches,
    merkleProofMatches,
    issuerApprovalMatches,
    lifecycleStatus,
    replacementCredentialPublicId: lifecycleStatus === "SUPERSEDED" ? "cred-demo-award-01-revision-2" : null,
    checks: [
      { id: "canonical", label: "정규화 원문 SHA-256", passed: contentMatches },
      { id: "proof", label: "Merkle Proof → Root", passed: merkleProofMatches },
      { id: "issuer", label: "기관 승인 서명", passed: issuerApprovalMatches },
      { id: "lifecycle", label: "현재 효력", passed: lifecycleStatus === "ACTIVE" }
    ]
  };
}

function now() {
  return globalThis.performance?.now?.() ?? Date.now();
}

export async function runRuntimeBenchmark(sizes = [1, 10, 100, 500]) {
  const issuerId = keccakUtf8("issuer:trekkey:hansung-demo");
  const schemaVersionHash = keccakUtf8("credential-schema:1");
  const fileManifestHash = await sha256Hex("[]");
  const results = [];

  for (const size of sizes) {
    const startedAt = now();
    const contentHashes = await Promise.all(
      Array.from({ length: size }, (_, index) => sha256Hex(canonicalizeJson({
        credentialNo: `HSCRED-BENCH-${String(index + 1).padStart(4, "0")}`,
        credentialType: index % 3 === 0 ? "AWARD" : "PARTICIPATION",
        issuer: "한성대학교",
        sourcePublicId: `benchmark-source-${index + 1}`,
        subjectRef: `benchmark-subject-${index + 1}`
      })))
    );
    const leaves = contentHashes.map((contentHash, index) => createCredentialLeafHash({
      issuerId,
      credentialIdHash: keccakUtf8(`benchmark-credential:${size}:${index}`),
      schemaVersionHash,
      contentHash,
      fileManifestHash
    }));
    const tree = buildStandardMerkleTree(leaves);
    const proof = getMerkleProof(tree, Math.floor(size / 2));
    const proofMatches = processMerkleProof(leaves[Math.floor(size / 2)], proof) === tree.root;
    const durationMs = now() - startedAt;
    results.push({
      size,
      durationMs,
      perCredentialMs: durationMs / size,
      proofDepth: proof.length,
      proofMatches,
      anchorGasSample: ANCHOR_BATCH_GAS_SAMPLE,
      gasPerCredential: ANCHOR_BATCH_GAS_SAMPLE / size,
      amortizedReductionPercent: size === 1 ? 0 : (1 - 1 / size) * 100
    });
  }

  return results;
}

export function shortenHash(value, head = 10, tail = 8) {
  if (!value || value.length <= head + tail + 1) {
    return value ?? "";
  }
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}
