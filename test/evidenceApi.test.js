import test from "node:test";
import assert from "node:assert/strict";
test("학생 증빙 제출은 JSON request와 원본 files를 multipart로 전송한다", async () => {
  process.env.VITE_API_BASE_URL = "http://localhost:8080";
  process.env.VITE_AUTH_API_BASE_URL = "http://localhost:8080";
  const { submitEvidence } = await import("../src/api/evidenceApi.js");
  const previousFetch = globalThis.fetch;
  let captured;
  globalThis.fetch = async (url, options) => {
    captured = { url, options };
    return new Response(JSON.stringify({ isSuccess: true, data: { publicId: "evidence-1" } }), {
      status: 201,
      headers: { "content-type": "application/json" }
    });
  };

  try {
    const result = await submitEvidence({
      values: {
        evidenceType: "QUALIFICATION",
        targetRecordType: "OTHER",
        title: "정보처리기사",
        issuerName: "한국산업인력공단"
      },
      files: [
        new Blob(["%PDF-1.7 first"], { type: "application/pdf" }),
        new Blob(["%PDF-1.7 second"], { type: "application/pdf" })
      ]
    });

    assert.equal(result.publicId, "evidence-1");
    assert.equal(captured.options.method, "POST");
    assert.ok(captured.options.body instanceof FormData);
    assert.equal(JSON.parse(await captured.options.body.get("request").text()).evidenceType, "QUALIFICATION");
    assert.equal(captured.options.body.getAll("files").length, 2);
    assert.equal(captured.options.body.getAll("files")[0].type, "application/pdf");
    assert.equal(captured.options.headers.has("Content-Type"), false);
  } finally {
    globalThis.fetch = previousFetch;
  }
});
