import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { transform } from "esbuild";
import * as verification from "../src/lib/credentialVerification.js";
import * as blockchain from "../src/lib/blockchainEvidence.js";
import * as approvalHelpers from "../src/lib/credentialApproval.js";
import * as tamper from "../src/lib/tamperLab.js";
import * as disclosure from "../src/lib/publicDisclosure.js";

// Execute real JSX event handlers and derived rendering. This is a component-contract
// harness, not browser/layout coverage; only hooks, DOM-facing dependencies and API I/O are substituted.
async function pageHarness(name, api, initialQuery = "") {
  const slots = [], effects = [];
  let cursor = 0, effectCursor = 0, queued = [], query = initialQuery, tree;
  const changed = (a, b) => !a || !b || a.length !== b.length || a.some((value, i) => !Object.is(value, b[i]));
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    Fragment: "fragment",
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === "function" ? initial() : initial;
      return [slots[i], value => { slots[i] = typeof value === "function" ? value(slots[i]) : value; }]; },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useMemo(factory, deps) { const i = cursor++; if (changed(slots[i]?.deps, deps)) slots[i] = { deps, value: factory() }; return slots[i].value; },
    useCallback(callback, deps) { return react.useMemo(() => callback, deps); },
    useEffect(callback, deps) { const i = effectCursor++; if (changed(effects[i]?.deps, deps)) queued.push(() => { effects[i]?.cleanup?.(); effects[i] = { deps, cleanup: callback() }; }); }
  };
  const directory = name === "CredentialsPage" ? "admin" : "public";
  const sourcePath = name === "AppFooter" ? "../src/components/common/AppFooter.jsx" : `../src/pages/${directory}/${name}.jsx`;
  const compiled = await transform(await readFile(new URL(sourcePath, import.meta.url), "utf8"), { loader: "jsx", format: "cjs" });
  const module = { exports: {} }, navigate = url => { query = new URL(url, "http://localhost").search; };
  vm.runInNewContext(compiled.code, {
    module, exports: module.exports, URL, URLSearchParams,
    window: { setTimeout, clearTimeout, addEventListener() {}, removeEventListener() {} },
    document: { getElementById: () => null, title: "Synthetic test" }, navigator: { userAgent: "Synthetic browser" },
    require(path) {
      if (path === "react") return react;
      if (path === "react-router-dom") return { Link: "a", useNavigate: () => navigate, useParams: () => ({}), useSearchParams: () => [new URLSearchParams(query)] };
      if (path === "lucide-react") return {};
      if (path.endsWith(".scss")) return { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) };
      if (path.endsWith("/publicCredentialApi.js") || path.endsWith("/adminCredentialApi.js")) return api;
      if (path.endsWith("/backendApi.js")) return { getApiErrorMessage: error => error.message };
      if (path.endsWith("/credentialVerification.js")) return verification;
      if (path.endsWith("/blockchainEvidence.js")) return blockchain;
      if (path.endsWith("/credentialApproval.js")) return approvalHelpers;
      if (path.endsWith("/publicDisclosure.js")) return disclosure;
      if (path.endsWith("/tamperLab.js")) return { ...tamper, createTamperLabFixture: async () => null, ...(api.benchmark ? { runRuntimeBenchmark: api.benchmark } : {}) };
      if (path.endsWith("/exportCsv.js")) return { downloadCsv: api.downloadCsv };
      if (path.endsWith("/PitchDemoTheater.jsx")) return { PitchDemoTheater: "theater" };
      if (path.endsWith("/AppFooter.jsx")) return { AppFooter: "footer" };
      if (path.endsWith("/CredentialVerificationLink.jsx")) return { getCredentialVerificationPath: id => `/verify/${encodeURIComponent(id)}` };
      if (path.endsWith("/CommonUi.jsx")) return { ContestScopeBar: "scope", EmptyState: "empty", PanelHeader: "heading", StatusBadge: "badge" };
      throw new Error(`Unmocked dependency ${path}`);
    }
  });
  return {
    render(props = {}) { cursor = 0; effectCursor = 0; tree = module.exports[name](props); return tree; },
    async flush() { const pending = queued; queued = []; pending.forEach(run => run()); for (let i = 0; i < 12; i++) await Promise.resolve(); },
    setQuery(value) { query = value; },
    unmount() { effects.forEach(effect => effect?.cleanup?.()); },
    get tree() { return tree; }
  };
}

function expand(tree) {
  if (Array.isArray(tree)) return tree.flatMap(expand);
  if (!tree || typeof tree !== "object") return tree;
  if (typeof tree.type === "function") return expand(tree.type(tree.props));
  return { ...tree, props: { ...tree.props, children: expand(tree.props.children) } };
}
function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== "object") return [];
  return [tree, ...nodes(tree.props.children)];
}
function text(tree) {
  if (Array.isArray(tree)) return tree.map(text).join("");
  if (tree === null || tree === undefined || typeof tree === "boolean") return "";
  return typeof tree === "object" ? text(tree.props.children) : String(tree);
}
const rendered = harness => expand(harness.tree);
const content = harness => text(rendered(harness));
function node(harness, predicate) { const found = nodes(rendered(harness)).find(predicate); assert.ok(found, "Expected actual JSX element"); return found; }
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }

const hex = digit => `0x${digit.repeat(64)}`;
function publicCredential(provider = "SUI", status = "VALID") {
  const evidence = { issuerId: hex("1"), credentialIdHash: hex("2"), schemaVersionHash: hex("3"), contentHash: hex("4"), fileManifestHash: hex("5"),
    canonicalPayloadMatches: true, contentHashMatches: true, fileManifestHashMatches: true, credentialClaimsMatch: true,
    credentialIdMatches: true, merkleProofMatches: true, merkleProof: [], batchPublicId: "synthetic-batch",
    chainId: 1001, contractAddress: `0x${"12".repeat(20)}`, transactionHash: hex("7"), blockNumber: 123 };
  evidence.leafHash = tamper.createCredentialLeafHash(evidence); evidence.merkleRoot = evidence.leafHash;
  if (provider === "SUI") {
    evidence.blockchain = { provider, network: "testnet", chainIdentifier: "4c78adac", packageId: hex("a"), registryObjectId: hex("b"),
      transactionDigest: "4pJJ6px463hFXxvEKUD5MQ16jrWZVoACjkUtppoANej6", checkpointSequenceNumber: 381273117,
      checkpointDigest: "Dj35PbjUQugejaLoV9C19ggzr4gQ1iByYD8HA9aeitxE", approvalScheme: "TREKKEY_SUI_APPROVAL_V1" };
    Object.assign(evidence, { chainId: 0, contractAddress: hex("a"), transactionHash: evidence.blockchain.transactionDigest, blockNumber: 381273117 });
  }
  return { credentialPublicId: "synthetic-id", credentialNo: "synthetic-no", issuerName: "SYNTHETIC institution", credentialType: "WORK", verificationStatus: status, evidence, publicSubjects: [] };
}

test("공개 페이지 JSX는 Sui 체크포인트·레지스트리와 Kaia 블록·탐색기를 올바르게 렌더링한다", async () => {
  for (const provider of ["SUI", "KAIA"]) {
    const item = publicCredential(provider), harness = await pageHarness("PublicCredentialVerificationPage", { verifyPublicCredential: async () => item });
    const props = { credentialPublicId: item.credentialPublicId };
    harness.render(props); await harness.flush(); harness.render(props);
    assert.match(content(harness), /제출 증빙으로 사용 가능/);
    assert.match(content(harness), provider === "SUI" ? /Sui 테스트넷.*체크포인트.*4c78adac.*레지스트리 객체/s : /Kaia Kairos 테스트넷.*블록 번호/s);
    assert.equal(node(harness, n => n.type === "a" && n.props.href?.includes(provider === "SUI" ? "suiscan.xyz" : "kaiascan.io")).props.target, "_blank");
  }
});

test("공개 페이지는 불완전 VALID·RPC 장애·취소에 사용 가능 배지를 표시하지 않는다", async () => {
  for (const status of ["VALID", "RPC_UNAVAILABLE", "REVOKED"]) {
    const item = publicCredential("SUI", status);
    if (status === "VALID") item.evidence = null;
    const harness = await pageHarness("PublicCredentialVerificationPage", { verifyPublicCredential: async () => item });
    const props = { credentialPublicId: item.credentialPublicId };
    harness.render(props); await harness.flush(); harness.render(props);
    assert.doesNotMatch(content(harness), /제출 증빙으로 사용 가능/);
    assert.match(content(harness), status === "VALID" ? /공개 검증 증거가 불완전/ : status === "RPC_UNAVAILABLE" ? /외부 등록 기록을 확인할 수 없습니다/ : /취소한 증명서/);
  }
});

test("Tamper Lab 실제 JSX는 Sui Proof를 통과시키되 취소와 RPC 장애를 무결성 실패로 오인하지 않는다", async () => {
  for (const status of ["VALID", "REVOKED", "RPC_UNAVAILABLE"]) {
    const harness = await pageHarness("TamperLabPage", { verifyPublicCredential: async () => publicCredential("SUI", status) }, "?mode=live&credential=synthetic-id");
    harness.render(); await harness.flush(); harness.render();
    assert.match(content(harness), /Sui 테스트넷/);
    if (status === "VALID") assert.match(content(harness), /브라우저 Proof 재계산 PASS/);
    else {
      assert.doesNotMatch(content(harness), /브라우저 Proof 재계산 PASS/);
      assert.match(content(harness), status === "REVOKED" ? /무결성과 별개로 현재 효력/ : /현재 서버 체인 확인이 완료되지/);
    }
  }
});

test("Tamper Lab은 증거가 없는 응답도 상태를 보존하고 계산 불가를 표시한다", async () => {
  const item = { ...publicCredential(), evidence: null };
  const harness = await pageHarness("TamperLabPage", { verifyPublicCredential: async () => item }, "?mode=live&credential=synthetic-id");
  harness.render(); await harness.flush(); harness.render();
  assert.match(content(harness), /공개 해시·Proof가 없어/);
  assert.doesNotMatch(content(harness), /브라우저 Proof 재계산 PASS|해시 0번째/);
});

test("Tamper Lab의 늦은 이전 조회는 새 Credential 결과를 덮어쓰지 않는다", async () => {
  const old = deferred(), fresh = deferred();
  const harness = await pageHarness("TamperLabPage", { verifyPublicCredential: id => id === "old" ? old.promise : fresh.promise }, "?mode=live&credential=old");
  harness.render(); await harness.flush(); harness.setQuery("?mode=live&credential=fresh"); harness.render(); await harness.flush();
  fresh.resolve({ ...publicCredential(), credentialNo: "FRESH RESULT" }); await harness.flush(); harness.render();
  old.resolve({ ...publicCredential(), credentialNo: "STALE RESULT" }); await harness.flush(); harness.render();
  assert.match(content(harness), /FRESH RESULT/); assert.doesNotMatch(content(harness), /STALE RESULT/);
});

function batchApproval() {
  const payload = { scheme: "TREKKEY_SUI_APPROVAL_V1", signatureScheme: "secp256k1-recoverable-low-s", primaryType: "BatchApproval",
    domain: { chainIdentifier: "a1b2c3d4", packageId: hex("1"), registryId: hex("2") },
    message: { issuerId: hex("3"), batchIdHash: hex("4"), merkleRoot: hex("5"), schemaVersionHash: hex("6"), leafCount: "3", treeVersion: "1", issuerKeyVersion: "2", approvalNonce: "7", deadline: "4000000000" } };
  payload.digestHex = approvalHelpers.calculateApprovalDigest(payload);
  return { aggregateType: "BATCH", aggregateId: "batch-1", typedDataJson: JSON.stringify(payload), digestHex: payload.digestHex, approvalNonce: 7, deadline: new Date(4000000000000).toISOString() };
}

test("관리자 JSX는 Sui 승인 조회 후 digest 검증을 거쳐 secp 서명만 기존 API에 제출한다", async () => {
  const approval = batchApproval(), calls = [];
  const batch = { publicId: "batch-1", status: "SEALED", leafCount: 3, merkleRoot: hex("5"), approvalDeadline: approval.deadline };
  const harness = await pageHarness("CredentialsPage", {
    listContestCredentials: async () => [], listBlockchainBatches: async () => [batch], listBlockchainStatusEvents: async () => [],
    getBatchApproval: async () => approval, approveBatch: async (...args) => { calls.push(args); return batch; }
  });
  const props = { contests: [], selectedContestId: "synthetic-contest", selectedContest: { title: "Synthetic contest" } };
  harness.render(props); await harness.flush(); harness.render(props);
  const approvalSubmit = () => node(harness, n => n.type === "button" && text(n).trim() === "서명 승인 제출");
  assert.equal(approvalSubmit().props.disabled, true);
  await node(harness, n => n.type === "button" && text(n) === "승인 조회").props.onClick(); await harness.flush(); harness.render(props);
  assert.match(content(harness), /Sui 기관 승인.*Slush.*Ed25519/s);
  assert.equal(approvalSubmit().props.disabled, false);
  const signatureInput = () => node(harness, n => n.type === "textarea" && n.props.placeholder === "0x로 시작하는 65바이트 서명");
  signatureInput().props.onChange({ target: { value: "Slush-signature" } }); harness.render(props);
  const form = () => node(harness, n => n.type === "form" && nodes(n).some(child => child.type === "textarea" && child.props.placeholder === "0x로 시작하는 65바이트 서명"));
  form().props.onSubmit({ preventDefault() {} }); await harness.flush(); harness.render(props);
  assert.equal(calls.length, 0);
  const signature = `0x${"1".padStart(64, "0")}${"2".padStart(64, "0")}1b`;
  signatureInput().props.onChange({ target: { value: signature } }); harness.render(props);
  form().props.onSubmit({ preventDefault() {} }); await harness.flush(); harness.render(props);
  assert.equal(calls.length, 1); assert.deepEqual(Array.from(calls[0]), ["batch-1", signature]);
});

test("관리자 JSX는 잘못된 digest를 가진 승인 정보를 표시하되 제출 버튼은 잠근다", async () => {
  const approval = { ...batchApproval(), digestHex: hex("9") };
  const harness = await pageHarness("CredentialsPage", { listContestCredentials: async () => [], listBlockchainBatches: async () => [{ publicId: "batch-1", status: "SEALED", approvalDeadline: approval.deadline }],
    listBlockchainStatusEvents: async () => [], getBatchApproval: async () => approval });
  const props = { contests: [], selectedContestId: "synthetic-contest", selectedContest: { title: "Synthetic contest" } };
  harness.render(props); await harness.flush(); harness.render(props);
  await node(harness, n => n.type === "button" && text(n) === "승인 조회").props.onClick(); await harness.flush(); harness.render(props);
  assert.match(content(harness), /digest가 재계산 결과와 일치하지 않습니다/);
  assert.equal(node(harness, n => n.type === "button" && text(n).trim() === "서명 승인 제출").props.disabled, true);
});

test("Tamper Lab과 심사 시연은 API가 VALID여도 브라우저 Proof 불일치를 유효한 증명서라고 표시하지 않는다", async () => {
  for (const page of ["TamperLabPage", "JudgeDemoPage"]) {
    const item = publicCredential(); item.evidence.contentHash = hex("9");
    const harness = await pageHarness(page, { verifyPublicCredential: async () => item }, "?mode=live&credential=synthetic-id");
    harness.render(); await harness.flush(); harness.render();
    if (page === "JudgeDemoPage") {
      for (let i = 0; i < 2; i++) { node(harness, n => n.type === "button" && text(n).trim() === "다음").props.onClick(); harness.render(); }
    }
    assert.match(content(harness), /발급 내용이 원래 기록과 일치하지 않습니다/);
    assert.doesNotMatch(content(harness), /발급한 유효한 증명서입니다/);
  }
});

test("심사 시연에서 Sui와 Kaia의 실제 좌표로 링크를 만들고 취소 상태를 보존한다", async () => {
  for (const [provider, status] of [["SUI", "VALID"], ["KAIA", "VALID"], ["SUI", "REVOKED"]]) {
    const harness = await pageHarness("JudgeDemoPage", { verifyPublicCredential: async () => publicCredential(provider, status) }, "?credential=synthetic-id");
    harness.render(); await harness.flush(); harness.render();
    for (let i = 0; i < 2; i++) { node(harness, n => n.type === "button" && text(n).trim() === "다음").props.onClick(); harness.render(); }
    assert.match(content(harness), provider === "SUI" ? /Sui 테스트넷/ : /Kaia Kairos 테스트넷/);
    assert.ok(node(harness, n => n.type === "a" && n.props.href?.includes(provider === "SUI" ? "suiscan.xyz" : "kaiascan.io")));
    if (status === "REVOKED") assert.match(content(harness), /취소한 증명서.*무결성과 별개로 현재 효력/s);
    harness.setQuery(""); harness.render(); await harness.flush(); harness.render();
    assert.doesNotMatch(content(harness), /synthetic-no/);
  }
});

test("정량 보고서 CSV가 과거 Kaia gas 모델과 현재 브라우저 ms의 단위를 분리한다", async () => {
  let calls = 0, exported;
  const sample = { size: 1, durationMs: 2, perCredentialMs: 2, proofDepth: 0, proofMatches: true, gasPerCredential: 202598, amortizedReductionPercent: 0 };
  const harness = await pageHarness("EvidenceReportPage", { benchmark: async () => {
    if (++calls > 1) throw new Error("Synthetic benchmark failure");
    return [sample];
  }, downloadCsv: (...args) => { exported = args; } });
  harness.render(); await harness.flush(); harness.render();
  assert.match(content(harness), /기존 Hardhat 표본 · Sui 수수료 아님/);
  node(harness, n => n.type === "button" && text(n).trim() === "CSV 리포트").props.onClick();
  assert.match(JSON.stringify(exported[1]), /과거 Hardhat 표본.*현재 실측·Sui gas·실제 네트워크 수수료 아님/);
  assert.ok(exported[1].some(row => row.includes("총 계산 시간(ms)") && row.includes("Credential당 Kaia gas 모델")));
  await node(harness, n => n.type === "button" && text(n).trim() === "다시 측정").props.onClick(); await harness.flush(); harness.render();
  assert.match(content(harness), /벤치마크를 실행하지 못했습니다/);
  assert.doesNotMatch(content(harness), /모든 Proof 검증 성공/);
  assert.equal(node(harness, n => n.type === "button" && text(n).trim() === "CSV 리포트").props.disabled, true);
});

test("발표 자료는 과거 테스트 수를 현재 PASS 주장으로 고정하지 않고 현재 브라우저 측정만 표시한다", async () => {
  const harness = await pageHarness("PitchDeckPage", { benchmark: async () => [{ durationMs: 12.34, proofMatches: true }] });
  harness.render(); await harness.flush(); harness.render();
  node(harness, n => n.type === "button" && n.props["aria-label"] === "9번 슬라이드").props.onClick(); harness.render(); await harness.flush(); harness.render();
  assert.match(content(harness), /12.34 ms.*PROOF PASS/);
  assert.match(content(harness), /실행 결과는 릴리스별 보고서 기준/);
  assert.doesNotMatch(content(harness), /629-case|19 PASS|604 PASS/);
});

test("공개 증명과 공통 푸터는 PUBLIC 지정 요약을 표시하며 현재 동의 확인이나 익명화를 보장하지 않는다", async () => {
  const item = publicCredential();
  item.publicSubjects = [{ subjectRef: "synthetic-credential-alias", subjectType: "USER", displayName: "Synthetic Visible Name", roleCode: "MEMBER" }];
  const harness = await pageHarness("PublicCredentialVerificationPage", { verifyPublicCredential: async () => item });
  const props = { credentialPublicId: item.credentialPublicId };
  harness.render(props); await harness.flush(); harness.render(props);
  assert.match(content(harness), /Synthetic Visible Name/);
  assert.match(content(harness), /발급 당시 PUBLIC으로 지정된 공개 요약.*이름·학교 등이 포함.*현재 공유 동의를 별도로 확인한 결과는 아닙니다/s);
  assert.doesNotMatch(content(harness), /동의된|공개에 동의한|익명/);
  const footer = await pageHarness("AppFooter", {});
  footer.render({ variant: "public" });
  assert.match(content(footer), /증명 공개 화면:.*PUBLIC.*현재 공유 동의를 별도로 확인한 결과는 아닙니다/s);
  assert.doesNotMatch(content(footer), /동의된 최소 정보|익명/);
});
