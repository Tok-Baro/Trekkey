import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { transform } from "esbuild";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as router from "react-router-dom";
import { getLoginFormDefaults } from "../src/lib/auth.js";
import * as routes from "../src/routeConfig.js";

const DEMO_URL = "https://trekkey-demo-43-200-222-11.nip.io/verify";
const styles = { __esModule: true, default: new Proxy({}, { get: (_object, key) => String(key) }) };

async function compile(path, require, globals = {}) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const compiled = await transform(source, { loader: "jsx", format: "cjs" });
  const module = { exports: {} };
  vm.runInNewContext(compiled.code, { module, exports: module.exports, require, ...globals });
  return module.exports;
}

const icons = new Proxy({}, { get: () => () => null });

function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return tree && typeof tree === "object" ? [tree, ...nodes(tree.props?.children)] : [];
}

function content(tree) {
  if (Array.isArray(tree)) return tree.map(content).join("");
  return tree == null || typeof tree === "boolean" ? "" : typeof tree === "object" ? content(tree.props?.children) : String(tree);
}

function find(tree, predicate) {
  const result = nodes(tree).find(predicate);
  assert.ok(result, "Expected actual rendered component element");
  return result;
}

async function hookHarness(path, name, { initialRole = null } = {}) {
  const state = [], refs = [], effectDeps = [], pendingEffects = [];
  const navigations = [], scrollCalls = [];
  let stateIndex = 0, refIndex = 0, effectIndex = 0, tree, queryRole = initialRole;
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    Fragment: "Fragment",
    useState(initial) {
      const index = stateIndex++;
      if (!(index in state)) state[index] = typeof initial === "function" ? initial() : initial;
      return [state[index], value => { state[index] = typeof value === "function" ? value(state[index]) : value; }];
    },
    useRef(initial) {
      const index = refIndex++;
      if (!refs[index]) refs[index] = { current: initial };
      return refs[index];
    },
    useEffect(callback, deps) {
      const index = effectIndex++;
      const previous = effectDeps[index];
      const changed = !previous || !deps || deps.some((value, position) => !Object.is(value, previous[position]));
      effectDeps[index] = deps;
      if (changed) pendingEffects.push(callback);
    }
  };
  const module = await compile(path, specifier => {
    if (specifier === "react") return react;
    if (specifier === "react-router-dom") return {
      Link: "RouterLink",
      useNavigate: () => destination => navigations.push(destination),
      useSearchParams: () => [{ get: key => key === "role" ? queryRole : null }]
    };
    if (specifier === "lucide-react") return new Proxy({}, { get: (_object, key) => key });
    if (specifier === "../../lib/auth.js") return { getLoginFormDefaults };
    if (specifier === "../../components/common/AppFooter.jsx") return { AppFooter: "AppFooter" };
    if (specifier === "../../routeConfig.js") return routes;
    if (specifier.endsWith(".scss")) return styles;
    throw new Error(`Unexpected component dependency ${specifier}`);
  }, { document: { getElementById: id => id === "contests" ? { scrollIntoView: options => scrollCalls.push(options) } : null } });
  return {
    render(props = {}) {
      stateIndex = 0; refIndex = 0; effectIndex = 0;
      tree = module[name](props);
      return tree;
    },
    flushEffects() { while (pendingEffects.length) pendingEffects.shift()(); },
    setQueryRole(value) { queryRole = value; },
    get tree() { return tree; },
    navigations,
    scrollCalls
  };
}

test("participant login entry selects the participant form without replacing existing auth callbacks", async () => {
  const module = await compile("../src/pages/auth/LoginPage.jsx", path => {
    if (path === "react") return React;
    if (path === "react-router-dom") return router;
    if (path === "lucide-react") return icons;
    if (path === "../../lib/auth.js") return { getLoginFormDefaults };
    if (path.endsWith(".scss")) return styles;
    throw new Error(`Unexpected LoginPage dependency ${path}`);
  });
  const markup = renderToStaticMarkup(React.createElement(router.MemoryRouter, {
    initialEntries: ["/login?role=participant"]
  }, React.createElement(module.LoginPage, { onLogin() {} })));

  assert.match(markup, /대회 참가자/);
  assert.match(markup, /aria-pressed="true"/);
  assert.match(markup, /type="email"[^>]*value=""/);
  assert.match(markup, /type="password"[^>]*value=""/);
  assert.match(markup, /참가자 페이지로 로그인/);
  assert.match(markup, /href="\/signup"/);
  assert.match(markup, /href="\/signup\/admin"/);
  assert.match(markup, /href="\/verify"/);
});

test("service entry keeps production actions primary and labels the external exhibition as synthetic data", async () => {
  const module = await compile("../src/pages/home/HomePage.jsx", path => {
    if (path === "react") return React;
    if (path === "react-router-dom") return router;
    if (path === "lucide-react") return icons;
    if (path === "../../components/common/AppFooter.jsx") return { AppFooter: () => null };
    if (path === "../../routeConfig.js") return routes;
    if (path.endsWith(".scss")) return styles;
    throw new Error(`Unexpected HomePage dependency ${path}`);
  });
  const markup = renderToStaticMarkup(React.createElement(router.MemoryRouter, null,
    React.createElement(module.HomePage, { contests: [{ id: "example", title: "예시 대회", status: "접수중" }] })));

  assert.match(markup, /관리자 로그인/);
  assert.match(markup, /참가자 로그인/);
  assert.match(markup, /로그인 전 대회 화면 보기/);
  assert.match(markup, /증명서 확인/);
  assert.match(markup, /전시 체험/);
  assert.match(markup, /합성 데이터/);
  assert.match(markup, /기능 예시 화면/);
  assert.match(markup, /기능 안내용 대회 · 실제 접수 공고 아님/);
  assert.match(markup, /학생 계정으로 로그인한 뒤 확인/);
  assert.match(markup, /서버·API/);
  assert.doesNotMatch(markup, /statNum">(?:629|12|19)</);
  assert.doesNotMatch(markup, /한성대학교 대회 운영/);
  assert.ok(markup.includes(`href="${DEMO_URL}"`));
  assert.match(markup, /target="_blank"/);
  assert.doesNotMatch(markup, /trekkey-v2-43-200-222-11/);
});

test("home click handlers preserve admin, participant, verify, contest scroll, and contest detail destinations", async () => {
  const h = await hookHarness("../src/pages/home/HomePage.jsx", "HomePage");
  const opened = [];
    h.render({
      contests: [{ id: "contest-1", title: "합성 대회", department: "테스트", summary: "예시", status: "접수중", applicationPeriod: "기간 예시" }],
      onOpenContest: id => opened.push(id)
    });
    find(h.tree, node => node.type === "button" && content(node) === "관리자 로그인").props.onClick();
    find(h.tree, node => node.type === "button" && content(node) === "참가자 로그인").props.onClick();
    find(h.tree, node => node.type === "button" && content(node).includes("증명서 확인")).props.onClick();
    find(h.tree, node => node.type === "button" && content(node) === "대회 둘러보기").props.onClick();
    assert.deepEqual(h.navigations, ["/login?role=admin", "/login?role=participant", "/verify"]);
    assert.deepEqual(JSON.parse(JSON.stringify(h.scrollCalls)), [{ behavior: "smooth", block: "start" }]);

    const railElement = find(h.tree, node => typeof node.type === "function" && node.type.name === "RailCard");
    const railTree = railElement.type(railElement.props);
    find(railTree, node => node.type === "button").props.onClick();
    assert.deepEqual(opened, ["contest-1"]);
});

test("account loading and error states hide stale contest cards and remain distinct", async () => {
  const h = await hookHarness("../src/pages/home/HomePage.jsx", "HomePage");
  const stale = [{ id: "stale", title: "노출되면 안 되는 대회", status: "접수중" }];
  h.render({ contests: stale, contestSource: "account", isLoading: true });
  assert.match(content(h.tree), /계정의 대회 목록을 불러오는 중/);
  assert.equal(nodes(h.tree).some(node => typeof node.type === "function" && node.type.name === "RailCard"), false);
  h.render({ contests: stale, contestSource: "account", error: new Error("unavailable") });
  assert.match(content(h.tree), /대회 목록을 불러오지 못했습니다/);
  assert.equal(nodes(h.tree).some(node => typeof node.type === "function" && node.type.name === "RailCard"), false);
});

test("login role controls submit one exact payload, continue session, disabled state, and react to query changes", async () => {
  const h = await hookHarness("../src/pages/auth/LoginPage.jsx", "LoginPage", { initialRole: "participant" });
  const submitted = [];
  let continued = 0;
  const props = {
    session: { name: "합성 사용자", role: "participant" },
    preferredRole: "participant",
    onLogin: payload => submitted.push(JSON.parse(JSON.stringify(payload))),
    onContinue: () => { continued++; },
    isSubmitting: true
  };
  h.render(props); h.flushEffects(); h.render(props);
  assert.equal(find(h.tree, node => node.type === "button" && content(node).includes("대회 참가자")).props["aria-pressed"], true);
  assert.equal(find(h.tree, node => node.props.type === "submit").props.disabled, true);
  find(h.tree, node => node.type === "button" && content(node).includes("계정 계속")).props.onClick();
  assert.equal(continued, 1);

  find(h.tree, node => node.type === "button" && content(node).startsWith("관리자")).props.onClick();
  h.render({ ...props, isSubmitting: false });
  const inputs = nodes(h.tree).filter(node => node.type === "input");
  inputs[0].props.onChange({ target: { value: "admin@example.test" } });
  inputs[1].props.onChange({ target: { value: "exact password" } });
  h.render({ ...props, isSubmitting: false });
  find(h.tree, node => node.type === "form").props.onSubmit({ preventDefault() {} });
  assert.deepEqual(submitted, [{
    ...JSON.parse(JSON.stringify(getLoginFormDefaults("admin"))),
    email: "admin@example.test",
    password: "exact password",
    role: "admin"
  }]);

  h.setQueryRole("admin");
  h.render({ ...props, isSubmitting: false }); h.flushEffects(); h.render({ ...props, isSubmitting: false });
  assert.equal(find(h.tree, node => node.type === "button" && content(node).startsWith("관리자")).props["aria-pressed"], true);
  h.setQueryRole("participant");
  h.render({ ...props, isSubmitting: false }); h.flushEffects(); h.render({ ...props, isSubmitting: false });
  assert.equal(find(h.tree, node => node.type === "button" && content(node).includes("대회 참가자")).props["aria-pressed"], true);
  assert.equal(find(h.tree, node => node.type === "input" && node.props.type === "email").props.value, "");
  assert.equal(find(h.tree, node => node.type === "input" && node.props.type === "password").props.value, "");
});
