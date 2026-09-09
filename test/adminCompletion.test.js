import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";
import { transform } from "esbuild";
import * as submissionFiles from "../src/lib/submissionFiles.js";

// Execute the actual component/hook/API modules; replace scheduling and I/O, not event handlers.
async function harness(path, name, modules = {}) {
  const state = [], refs = [];
  let index = 0, refIndex = 0, tree;
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState(initial) {
      const slot = index++;
      if (!(slot in state)) state[slot] = typeof initial === "function" ? initial() : initial;
      return [state[slot], value => { state[slot] = typeof value === "function" ? value(state[slot]) : value; }];
    },
    useRef(initial) { return refs[refIndex++] ?? (refs[refIndex - 1] = { current: initial }); },
    useMemo: fn => fn(), useCallback: fn => fn, useEffect() {}
  };
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const compiled = await transform(source, { loader: "jsx", format: "cjs", jsx: "transform" });
  const module = { exports: {} };
  vm.runInNewContext(compiled.code, {
    module, exports: module.exports, FormData, Blob, URLSearchParams,
    require(specifier) {
      if (specifier === "react") return react;
      if (specifier in modules) return modules[specifier];
      if (specifier === "lucide-react" || specifier.startsWith("@tiptap/")
          || specifier.endsWith("/ContestPublicView.jsx") || specifier.endsWith("/contest.js")
          || specifier.endsWith("/review.js")) return {};
      if (specifier.endsWith("/submissionFiles.js")) return submissionFiles;
      if (specifier.endsWith("/awards.js")) return { inferAwardType: () => "", markJointRanks: value => value };
      throw new Error(`Unmocked dependency ${specifier}`);
    }
  });
  return {
    exports: module.exports,
    render(props) { index = 0; refIndex = 0; tree = module.exports[name](props); return tree; },
    get tree() { return tree; }
  };
}
function all(tree) {
  if (Array.isArray(tree)) return tree.flatMap(all);
  return tree && typeof tree === "object" ? [tree, ...all(tree.props?.children)] : [];
}
function find(h, predicate) {
  const element = all(h.tree).find(predicate);
  assert.ok(element, "Expected rendered element");
  return element;
}
function text(tree) {
  if (Array.isArray(tree)) return tree.map(text).join("");
  return tree == null || typeof tree === "boolean" ? "" : typeof tree === "object" ? text(tree.props?.children) : String(tree);
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const event = () => ({ preventDefault() {} });
const formPath = "../src/components/forms/CompetitionForms.jsx";
const syntheticFile = new File(["Synthetic file only"], "synthetic.pdf", { type: "application/pdf", lastModified: 0 });
const teamList = [
  { id: "team-one", name: "Same name", leader: "One", status: "승인" },
  { id: "team-two", name: "Same name", leader: "Two", status: "검토중" },
  { id: "rejected", name: "Rejected", status: "반려" },
  { id: "existing", name: "Existing", status: "승인", submitted: true }
];
function fillSubmission(h, props) {
  h.render(props);
  find(h, node => node.type === "select").props.onChange({ target: { value: "team-two" } });
  find(h, node => node.type === "input" && node.props.maxLength === 150).props.onChange({ target: { value: "  Actual work  " } });
  find(h, node => node.type === "input" && node.props.type === "file").props.onChange({ target: { files: [syntheticFile] } });
  h.render(props);
}

test("수동 접수는 동명 팀도 공개 ID로 구분하고 반려·기존 제출 팀을 제외한다", async () => {
  const h = await harness(formPath, "SubmissionForm");
  let submitted;
  const props = { teams: teamList, serverBacked: true, onSubmit: async value => { submitted = value; } };
  fillSubmission(h, props);
  const options = all(h.tree).filter(node => node.type === "option" && node.props.value).map(node => node.props.value);
  assert.deepEqual(options, ["team-one", "team-two"]);
  await find(h, node => node.type === "form").props.onSubmit(event());
  assert.equal(submitted.teamId, "team-two");
  assert.equal(submitted.team, "Same name");
  assert.equal(submitted.title, "Actual work");
  assert.equal(submitted.uploadFiles[0], syntheticFile);
  assert.equal(all(h.tree).some(node => node.type === "input" && node.props.value === "방금 전"), false);
});

test("수동 접수 대기 중 중복 이벤트를 막고 실패하면 입력·파일을 보존한다", async () => {
  const pending = deferred(), h = await harness(formPath, "SubmissionForm");
  let calls = 0;
  const props = { teams: teamList, serverBacked: true, onSubmit: () => { calls++; return pending.promise; } };
  fillSubmission(h, props);
  const submit = find(h, node => node.type === "form").props.onSubmit;
  const first = submit(event());
  await submit(event());
  h.render(props);
  assert.equal(calls, 1);
  assert.equal(find(h, node => node.type === "button" && node.props.type === "submit").props.disabled, true);
  pending.reject(new Error("이미 제출물이 있는 팀입니다"));
  await first;
  h.render(props);
  assert.match(text(h.tree), /이미 제출물이/);
  assert.equal(find(h, node => node.type === "input" && node.props.maxLength === 150).props.value, "  Actual work  ");
  assert.match(text(h.tree), /synthetic.pdf/);
  assert.equal(find(h, node => node.type === "button" && node.props.type === "submit").props.disabled, false);
});

test("접수 가능한 팀이 없거나 선택한 팀이 사라지면 요청하지 않고 취소는 저장하지 않는다", async () => {
  const h = await harness(formPath, "SubmissionForm");
  let calls = 0, closes = 0;
  const props = { teams: teamList, serverBacked: true, onSubmit: () => { calls++; }, onClose: () => { closes++; } };
  fillSubmission(h, props);
  find(h, node => node.type === "button" && text(node) === "취소").props.onClick();
  assert.equal(closes, 1);
  assert.equal(calls, 0);
  h.render({ ...props, teams: [] });
  await find(h, node => node.type === "form").props.onSubmit(event());
  assert.equal(calls, 0);
  assert.equal(find(h, node => node.type === "button" && node.props.type === "submit").props.disabled, true);
});

test("심사위원 수정은 ID·기존 custom 역할을 유지하고 비동기 중복을 방지한다", async () => {
  const pending = deferred(), h = await harness(formPath, "JudgeForm");
  let calls = 0, saved;
  const props = { judge: { id: 81, name: "Old", role: "Custom role" }, serverBacked: true,
    onSubmit: value => { calls++; saved = value; return pending.promise; } };
  h.render(props);
  assert.ok(all(h.tree).some(node => node.type === "option" && text(node) === "Custom role"));
  find(h, node => node.type === "input").props.onChange({ target: { value: "  New  " } });
  h.render(props);
  const submit = find(h, node => node.type === "form").props.onSubmit;
  const first = submit(event());
  await submit(event());
  assert.equal(calls, 1);
  assert.equal(saved.id, 81);
  assert.equal(saved.name, "New");
  assert.equal(saved.role, "Custom role");
  pending.reject(new Error("심사 배정 이력이 있어 수정할 수 없습니다"));
  await first;
  h.render(props);
  assert.match(text(h.tree), /배정 이력이 있어/);
  assert.equal(find(h, node => node.type === "input").props.value, "  New  ");
});

test("관리자 API는 제목·파일을 multipart 본문으로 보내고 judge 계정 ID는 수정하지 않는다", async () => {
  const calls = [];
  const h = await harness("../src/api/adminBackendApi.js", null, {
    "./backendApi.js": { apiRequest: async (...args) => { calls.push(args); return {}; } }
  });
  const file = new Blob(["synthetic"], { type: "application/pdf" });
  await h.exports.receiveAdminSubmission("contest/a", "team?b", { title: "Private title", files: [file] });
  assert.equal(calls[0][0], "/api/admin/contests/contest%2Fa/teams/team%3Fb/submission");
  assert.equal(calls[0][1].method, "POST");
  assert.equal(calls[0][1].body.get("title"), "Private title");
  assert.equal(await calls[0][1].body.get("files").text(), "synthetic");
  assert.equal(calls[0].length, 2); // No title/token in query config.
  await h.exports.updateAdminJudge("contest/a", 81, { name: "New", roleLabel: "Role", userId: 999 });
  assert.equal(calls[1][0], "/api/admin/contests/contest%2Fa/judges/81");
  assert.equal(calls[1][1].method, "PATCH");
  assert.deepEqual(JSON.parse(JSON.stringify(calls[1][1].body)), { name: "New", roleLabel: "Role" });
});

async function adminHook(options = {}) {
  const calls = [], api = {
    receiveAdminSubmission: async (...args) => { calls.push(["receive", ...args]); if (options.mutationError) throw options.mutationError; if (options.pending) await options.pending.promise; return { id: "submission-one" }; },
    updateAdminJudge: async (...args) => { calls.push(["update", ...args]); if (options.pending) await options.pending.promise; return { id: 81, reviewLinkStatus: "REVOKED" }; },
    getAdminContestDetail: async () => { calls.push(["reload"]); if (options.reloadError) throw options.reloadError; return { publicId: "contest-one", title: "Contest" }; },
    listAdminReviewRounds: async () => [], listAdminTeams: async () => [],
    listAdminSubmissions: async () => [{ id: "submission-one", teamId: "team-two", title: "Saved", files: [] }],
    listAdminJudges: async () => [{ id: 81, name: "Updated", roleLabel: "Role" }],
    listAdminAwards: async () => [], listAdminJudgeProgress: async () => []
  };
  const h = await harness("../src/hooks/useAdminData.js", "useAdminData", { "../api/adminBackendApi.js": api });
  let hook = h.render({ enabled: true });
  hook.setSelectedContestId("contest-one");
  hook = h.render({ enabled: true });
  return { h, calls, hook };
}

test("수동 접수·judge 수정 hook은 서버 성공 후 같은 대회를 재조회하여 화면 데이터를 교체한다", async () => {
  const { h, hook, calls } = await adminHook();
  const result = await hook.addSubmission({ teamId: "team-two", title: " New ", uploadFiles: [syntheticFile] });
  assert.equal(result.ok, true);
  assert.equal(calls[0][1], "contest-one");
  assert.equal(calls[0][2], "team-two");
  assert.equal(calls[0][3].title, "New");
  let next = h.render({ enabled: true });
  assert.equal(next.submissionRecords[0].id, "submission-one");
  const updated = await next.updateJudge({ id: 81, name: "Updated", role: "Role" });
  assert.match(updated.message, /기존 링크는 철회/);
  next = h.render({ enabled: true });
  assert.equal(next.judgeRecords[0].name, "Updated");
  assert.equal(calls.filter(call => call[0] === "reload").length, 2);
});

test("서버 저장 후 재조회 실패를 재접수 성공으로 숨기지 않고 이미 저장됐음을 알린다", async () => {
  const { hook, calls } = await adminHook({ reloadError: new Error("offline") });
  await assert.rejects(hook.addSubmission({ teamId: "team-two", title: "Work", uploadFiles: [] }), /접수는 완료.*다시 접수하지/);
  assert.equal(calls.filter(call => call[0] === "receive").length, 1);
  await assert.rejects(hook.updateJudge({ id: 81, name: "Updated", role: "Role" }), /수정은 저장.*새로고침/);
});

test("서버 mutation 오류는 재조회나 성공 응답 없이 그대로 전파한다", async () => {
  const failure = new Error("SUBMISSION_NOT_OPEN"), { hook, calls } = await adminHook({ mutationError: failure });
  await assert.rejects(hook.addSubmission({ teamId: "team-two", title: "Work", uploadFiles: [] }), error => error === failure);
  assert.equal(calls.some(call => call[0] === "reload"), false);
});

test("저장 대기 중 대회 변경·로그아웃 후에는 이전 대회 데이터를 다시 주입하지 않는다", async () => {
  for (const operation of ["addSubmission", "updateJudge"]) {
    for (const enabled of [true, false]) {
      const pending = deferred(), { h, hook, calls } = await adminHook({ pending });
      const saving = hook[operation]({ id: 81, teamId: "team-two", title: "Work", uploadFiles: [], name: "Updated", role: "Role" });
      hook.setSelectedContestId("contest-two");
      h.render({ enabled });
      pending.resolve();
      await saving;
      const current = h.render({ enabled });
      assert.equal(current.selectedContestId, "contest-two");
      assert.equal(current.submissionRecords.length, 0);
      assert.equal(current.judgeRecords.length, 0);
      assert.equal(calls.some(call => call[0] === "reload"), false);
      assert.equal(calls[0][1], "contest-one");
    }
  }
});
