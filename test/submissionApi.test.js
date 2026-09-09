import test from "node:test";
import assert from "node:assert/strict";

test("참가자 제출은 제목을 URL에 노출하지 않고 기존 파일과 함께 multipart 본문으로 보낸다", async () => {
  const previousApiUrl = process.env.VITE_API_BASE_URL;
  const previousAuthUrl = process.env.VITE_AUTH_API_BASE_URL;
  const previousFetch = globalThis.fetch;
  process.env.VITE_API_BASE_URL = "http://localhost:8080";
  process.env.VITE_AUTH_API_BASE_URL = "http://localhost:8080";
  let captured;
  try {
    const { submitTeamSubmission } = await import("../src/api/backendApi.js");
    globalThis.fetch = async (url, options) => {
      captured = { url, options };
      return new Response(JSON.stringify({ isSuccess: true, data: { id: "synthetic-submission" } }), {
        status: 200, headers: { "content-type": "application/json" }
      });
    };
    const title = "비공개 작품명 & 개인정보? #fragment";
    const result = await submitTeamSubmission("synthetic/team?one", {
      title,
      files: [
        new File(["%PDF synthetic"], "synthetic.pdf", { type: "application/pdf" }),
        new File(["Synthetic text"], "synthetic.txt", { type: "text/plain" })
      ]
    });
    const url = new URL(captured.url);
    assert.equal(url.pathname, "/api/teams/synthetic%2Fteam%3Fone/submission");
    assert.equal(url.search, "");
    assert.equal(url.hash, "");
    assert.equal(captured.url.includes(encodeURIComponent(title)), false);
    assert.equal(captured.options.method, "PUT");
    assert.ok(captured.options.body instanceof FormData);
    assert.equal(captured.options.body.get("title"), title);
    const files = captured.options.body.getAll("files");
    assert.equal(files.length, 2);
    assert.equal(files[0].name, "synthetic.pdf");
    assert.equal(await files[0].text(), "%PDF synthetic");
    assert.equal(files[1].name, "synthetic.txt");
    assert.equal(await files[1].text(), "Synthetic text");
    assert.equal(captured.options.headers.has("Content-Type"), false);
    assert.equal(result.id, "synthetic-submission");
  } finally {
    globalThis.fetch = previousFetch;
    if (previousApiUrl === undefined) delete process.env.VITE_API_BASE_URL;
    else process.env.VITE_API_BASE_URL = previousApiUrl;
    if (previousAuthUrl === undefined) delete process.env.VITE_AUTH_API_BASE_URL;
    else process.env.VITE_AUTH_API_BASE_URL = previousAuthUrl;
  }
});
