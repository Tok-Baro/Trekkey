import { apiRequest, downloadApiFile } from "./backendApi.js";

export function listMyEvidence() {
  return apiRequest("/api/me/evidence-submissions");
}

export function submitEvidence({ values, file }) {
  const body = new FormData();
  body.append("request", new Blob([JSON.stringify(values)], { type: "application/json" }));
  body.append("file", file);
  return apiRequest("/api/me/evidence-submissions", { method: "POST", body });
}

export function downloadMyEvidenceFile(publicId, fileName) {
  return downloadApiFile(`/api/me/evidence-files/${encodeURIComponent(publicId)}/download`, { fileName });
}

export function listEvidenceVerificationQueue(status) {
  return apiRequest("/api/admin/evidence-verifications", {}, { query: { status: status || undefined } });
}

export function getEvidenceVerification(casePublicId) {
  return apiRequest(`/api/admin/evidence-verifications/${encodeURIComponent(casePublicId)}`);
}

export function reviewEvidence(casePublicId, review) {
  return apiRequest(`/api/admin/evidence-verifications/${encodeURIComponent(casePublicId)}/reviews`, {
    method: "POST",
    body: review
  });
}

export function downloadAdminEvidenceFile(publicId, fileName) {
  return downloadApiFile(
    `/api/admin/evidence-verifications/files/${encodeURIComponent(publicId)}/download`,
    { fileName }
  );
}
