import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";
import { transform } from "esbuild";
import * as roster from "../src/lib/roster.js";
import * as evidence from "../src/lib/evidence.js";

// Exercise the actual JSX components and event handlers without a browser or remote API.
// Only React hook scheduling, element creation, icons/styles and API I/O are replaced.
async function componentHarness(path, exportName, dependencies = {}) {
  const state = [], effects = [], timers = new Map();
  let stateIndex = 0, effectIndex = 0, timerId = 0, pendingEffects = [], tree;
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    Fragment: Symbol("fragment"),
    useState(initial) {
      const index = stateIndex++;
      if (!(index in state)) state[index] = typeof initial === "function" ? initial() : initial;
      return [state[index], next => { state[index] = typeof next === "function" ? next(state[index]) : next; }];
    },
    useEffect(callback, deps) {
      const index = effectIndex++, previous = effects[index];
      if (!previous || deps.some((value, position) => !Object.is(value, previous.deps[position]))) {
        pendingEffects.push(() => {
          previous?.cleanup?.();
          effects[index] = { deps, cleanup: callback() };
        });
      }
    }
  };
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const compiled = await transform(source, { loader: "jsx", format: "cjs", jsx: "transform" });
  const module = { exports: {} };
  vm.runInNewContext(compiled.code, {
    module, exports: module.exports,
    window: {
      setTimeout: callback => { timers.set(++timerId, callback); return timerId; },
      clearTimeout: id => timers.delete(id)
    },
    require(name) {
      if (name === "react") return react;
      if (name === "lucide-react") return {};
      if (name.endsWith(".scss")) return {};
      if (name.endsWith("/roster.js")) return roster;
      if (name.endsWith("/evidence.js")) return evidence;
      if (name.endsWith("/TeamRosterField.jsx")) return { TeamRosterField: "TeamRosterField" };
      if (name in dependencies) return dependencies[name];
      throw new Error(`Unexpected component dependency: ${name}`);
    }
  });
  return {
    render(props) {
      stateIndex = 0; effectIndex = 0;
      tree = module.exports[exportName](props);
      return tree;
    },
    async flushEffects() {
      const queued = pendingEffects;
      pendingEffects = [];
      queued.forEach(run => run());
      for (const [id, run] of [...timers]) { timers.delete(id); await run(); }
      await Promise.resolve();
    },
    get tree() { return tree; }
  };
}

function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== "object") return [];
  return [tree, ...nodes(tree.props?.children)];
}
function text(tree) {
  if (Array.isArray(tree)) return tree.map(text).join("");
  if (tree === null || tree === undefined || typeof tree === "boolean") return "";
  return typeof tree === "object" ? text(tree.props?.children) : String(tree);
}
function element(harness, predicate) {
  const found = nodes(harness.tree).find(predicate);
  assert.ok(found, "Expected component element was rendered");
  return found;
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

async function evidenceHarness(submission) {
  let loads = 0, submitted;
  const harness = await componentHarness("../src/pages/participant/ExternalEvidencePanel.jsx", "ExternalEvidencePanel", {
    "../../api/backendApi.js": { getApiErrorMessage: error => error.message },
    "../../api/evidenceApi.js": {
      listMyEvidence: async () => ++loads === 1 ? [] : [{ publicId: "synthetic-1", title: "Saved evidence", status: "SUBMITTED" }],
      submitEvidence: async input => { submitted = input; return submission.promise; }
    }
  });
  harness.render();
  await harness.flushEffects();
  harness.render();
  element(harness, node => node.type === "input" && node.props.type === "file").props.onChange({
    target: { files: [{ name: "synthetic.png" }] }
  });
  harness.render();
  return { harness, loads: () => loads, submitted: () => submitted };
}

test("증빙 제출 성공: await 중 currentTarget이 비워져도 원래 폼을 초기화하고 목록을 다시 읽는다", async () => {
  const submission = deferred(), state = await evidenceHarness(submission);
  let resets = 0;
  const event = { preventDefault() {}, currentTarget: { reset() { resets++; } } };
  const pending = element(state.harness, node => node.type === "form").props.onSubmit(event);
  event.currentTarget = null; // React clears currentTarget immediately after dispatch, before await resumes.
  submission.resolve({ publicId: "synthetic-1" });
  await pending;
  state.harness.render();
  assert.equal(resets, 1);
  assert.equal(state.loads(), 2);
  assert.match(text(state.harness.tree), /Saved evidence/);
  assert.doesNotMatch(text(state.harness.tree), /Cannot read|증빙을 제출하지 못/);
  assert.equal(state.submitted().files[0].name, "synthetic.png");
  const emptyRetry = { preventDefault() {}, currentTarget: { reset() { resets++; } } };
  await element(state.harness, node => node.type === "form").props.onSubmit(emptyRetry);
  state.harness.render();
  assert.match(text(state.harness.tree), /1개 이상 선택/);
  assert.equal(resets, 1);
});

test("증빙 제출 실패: 입력과 파일을 보존하고 성공 초기화나 목록 재조회는 하지 않는다", async () => {
  const submission = deferred(), state = await evidenceHarness(submission);
  let resets = 0;
  const event = { preventDefault() {}, currentTarget: { reset() { resets++; } } };
  const pending = element(state.harness, node => node.type === "form").props.onSubmit(event);
  event.currentTarget = null;
  submission.reject(new Error("Synthetic server rejection"));
  await pending;
  state.harness.render();
  assert.equal(resets, 0);
  assert.equal(state.loads(), 1);
  assert.match(text(state.harness.tree), /Synthetic server rejection/);
  assert.equal(element(state.harness, node => node.type === "button" && node.props.type === "submit").props.disabled, false);
});

async function applicationHarness(contest) {
  let submitted;
  const props = {
    contest: { id: "synthetic-contest", type: "팀전", ...contest },
    session: { name: "Synthetic Leader", major: "Synthetic", email: "synthetic@example.invalid" },
    onSubmit: async value => { submitted = value; },
    onSearchParticipants: async keyword => [{ userId: Number(keyword), name: `Member ${keyword}`, major: "Synthetic" }]
  };
  const harness = await componentHarness("../src/components/forms/ContestApplicationForm.jsx", "ContestApplicationForm");
  harness.render(props);
  await harness.flushEffects();
  const render = () => harness.render(props);
  return {
    harness, props, render, submitted: () => submitted,
    async select(id) {
      const search = element(harness, node => node.type === "input" && node.props.type === "search");
      assert.equal(search.props.disabled, false);
      search.props.onChange({ target: { value: String(id) } });
      render(); await harness.flushEffects(); render();
      const button = element(harness, node => node.type === "button" && text(node).startsWith(`Member ${id}`));
      button.props.onClick();
      render();
      return button;
    }
  };
}

for (const total of [2, 3, 5, 7]) {
  test(`팀 신청 정원 ${total}명: 대표자를 포함한 제한·문구·검색 상태·전송 인원이 일치한다`, async () => {
    const state = await applicationHarness({ maxTeamMembers: total });
    assert.match(text(state.harness.tree), new RegExp(`대표자 외 최대 ${total - 1}명`));
    let staleButton;
    for (let id = 1; id < total; id++) staleButton = await state.select(id);
    assert.equal(element(state.harness, node => node.type === "input" && node.props.type === "search").props.disabled, true);
    staleButton.props.onClick(); // A queued duplicate event may not overfill the last slot.
    state.render();
    await element(state.harness, node => node.type === "form").props.onSubmit({ preventDefault() {} });
    assert.equal(state.submitted().members, total);
    assert.equal(state.submitted().roster.length, total);
    assert.deepEqual(Array.from(state.submitted().memberUserIds), Array.from({ length: total - 1 }, (_, i) => i + 1));
    element(state.harness, node => node.type === "button" && node.props["aria-label"] === "Member 1 팀원 제거").props.onClick();
    state.render();
    assert.equal(element(state.harness, node => node.type === "input" && node.props.type === "search").props.disabled, false);
  });
}

test("정원 1명인 팀전과 개인전은 대표자만 신청한다", async () => {
  for (const contest of [{ maxTeamMembers: 1 }, { type: "개인전", maxTeamMembers: 8 }, { participationType: "INDIVIDUAL", maxTeamMembers: 8 }]) {
    const state = await applicationHarness(contest);
    const search = nodes(state.harness.tree).find(node => node.type === "input" && node.props.type === "search");
    assert.ok(!search || search.props.disabled);
    await element(state.harness, node => node.type === "form").props.onSubmit({ preventDefault() {} });
    assert.equal(state.submitted().members, 1);
    assert.equal(state.submitted().memberUserIds.length, 0);
  }
});

test("정원 정보가 없는 기존 대회는 5명 기본값을 유지하고 문자열 정원도 해석한다", async () => {
  for (const [limit, expected] of [[undefined, 4], [0, 4], [-1, 4], [1.5, 4], ["invalid", 4], ["8", 7]]) {
    const state = await applicationHarness({ maxTeamMembers: limit });
    assert.match(text(state.harness.tree), new RegExp(`대표자 외 최대 ${expected}명`));
  }
});

test("신청 중 정원이 줄어 이미 선택한 인원이 초과하면 서버로 불일치 payload를 보내지 않는다", async () => {
  const state = await applicationHarness({ maxTeamMembers: 7 });
  await state.select(1); await state.select(2);
  state.props.contest.maxTeamMembers = 2;
  state.render();
  await element(state.harness, node => node.type === "form").props.onSubmit({ preventDefault() {} });
  state.render();
  assert.equal(state.submitted(), undefined);
  assert.match(text(state.harness.tree), /대표자를 포함해 최대 2명/);
});

test("검색 없이 명단을 입력하는 기존 신청서에도 같은 대회 정원을 전달한다", async () => {
  const state = await applicationHarness({ maxTeamMembers: 9 });
  state.props.onSearchParticipants = undefined;
  state.render();
  assert.equal(element(state.harness, node => node.type === "TeamRosterField").props.maxMembers, 9);
});

async function graduationHarness(run) {
  const harness = await componentHarness("../src/pages/participant/GraduationPanel.jsx", "GraduationPanel", {
    "../../api/backendApi.js": { getApiErrorMessage: error => error.message },
    "../../api/graduationApi.js": { runGraduationEvaluation: run }
  });
  harness.render();
  return harness;
}

test("졸업 부분 coverage: 기존 API가 ELIGIBLE을 반환해도 전체 충족으로 표시하지 않는다", async () => {
  for (const coverage of [undefined, { complete: false, gaps: [{ code: "UNIT_POLICIES_MISSING", message: "단위 정책 누락" }] }]) {
    const harness = await graduationHarness(async () => ({ status: "ELIGIBLE", coverage, summary: { satisfied: 3 } }));
    await element(harness, node => node.type === "button").props.onClick();
    harness.render();
    assert.match(text(harness.tree), /판단 보류/);
    assert.match(text(harness.tree), /전체 졸업 충족을 의미하지 않습니다/);
    assert.doesNotMatch(text(harness.tree), /충족 예상/);
  }
});

test("졸업 재평가 실패: 이전 성공 결과를 최신 결과처럼 남기지 않는다", async () => {
  let count = 0;
  const second = deferred();
  const harness = await graduationHarness(() => ++count === 1
    ? Promise.resolve({ status: "NOT_ELIGIBLE", summary: { unsatisfied: 1 }, requirements: [{ code: "TOTAL", title: "기존 결과", status: "UNSATISFIED" }] })
    : second.promise);
  await element(harness, node => node.type === "button").props.onClick();
  harness.render();
  assert.match(text(harness.tree), /기존 결과/);
  const pending = element(harness, node => node.type === "button").props.onClick();
  harness.render();
  assert.doesNotMatch(text(harness.tree), /기존 결과/);
  assert.equal(element(harness, node => node.type === "button").props.disabled, true);
  second.reject(new Error("Synthetic evaluation unavailable"));
  await pending;
  harness.render();
  assert.match(text(harness.tree), /Synthetic evaluation unavailable/);
  assert.doesNotMatch(text(harness.tree), /기존 결과/);
  assert.equal(element(harness, node => node.type === "button").props.disabled, false);
});

test("졸업 알려진 미충족은 부분 coverage와 함께 유지한다", async () => {
  const harness = await graduationHarness(async () => ({ status: "NOT_ELIGIBLE", coverage: { complete: false,
    gaps: [{ code: "ACADEMIC_STANDING_UNAVAILABLE", message: "학적 미확인" }] }, requirements: [
    { code: "TOTAL", title: "총학점", status: "UNSATISFIED", remainingValue: "10" }], summary: { unsatisfied: 1 } }));
  await element(harness, node => node.type === "button").props.onClick();
  harness.render();
  assert.match(text(harness.tree), /미충족/);
  assert.match(text(harness.tree), /학적 미확인/);
  assert.match(text(harness.tree), /10/);
});
