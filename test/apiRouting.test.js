import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { selectAuthApiBaseUrl } from "../src/lib/apiRouting.js";

test("프로덕션 인증 요청은 기본적으로 현재 프론트 origin을 사용한다", () => {
  assert.equal(
    selectAuthApiBaseUrl({
      apiBaseUrl: "https://api.example.com",
      configuredAuthBaseUrl: "",
      isProduction: true,
      browserOrigin: "https://app.example.com"
    }),
    "https://app.example.com"
  );
});

test("개발 환경 인증 요청은 API 서버로 직접 보낸다", () => {
  assert.equal(
    selectAuthApiBaseUrl({
      apiBaseUrl: "http://localhost:8080",
      isProduction: false,
      browserOrigin: "http://localhost:5173"
    }),
    "http://localhost:8080"
  );
});

test("명시한 인증 프록시는 환경과 관계없이 우선한다", () => {
  assert.equal(
    selectAuthApiBaseUrl({
      apiBaseUrl: "https://api.example.com",
      configuredAuthBaseUrl: "https://auth.example.com/",
      isProduction: true,
      browserOrigin: "https://app.example.com"
    }),
    "https://auth.example.com/"
  );
});

test("Vercel 인증 rewrite는 SPA fallback보다 먼저 적용한다", async () => {
  const config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));

  assert.equal(config.rewrites[0].source, "/api/auth/:path*");
  assert.match(config.rewrites[0].destination, /^https:\/\//);
  assert.equal(config.rewrites.at(-1).destination, "/index.html");
});
