import { apiRequest } from "./backendApi.js";

function publicCredentialPath(credentialPublicId, suffix = "") {
  return `/api/public/credentials/${encodeURIComponent(credentialPublicId)}${suffix}`;
}

function safeFilePart(value) {
  return String(value ?? "credential").replace(/[^a-zA-Z0-9_-]/g, "-");
}

function downloadName(prefix, credentialPublicId, credentialNo, extension) {
  return `trekkey-${prefix}-${safeFilePart(credentialNo || credentialPublicId)}.${extension}`;
}

export function verifyPublicCredential(credentialPublicId) {
  return apiRequest(
    publicCredentialPath(credentialPublicId),
    {},
    { auth: false, retryOnUnauthorized: false }
  );
}

export async function downloadPublicCredentialPackage(credentialPublicId, { credentialNo } = {}) {
  const blob = await apiRequest(
    publicCredentialPath(credentialPublicId, "/package"),
    {},
    { auth: false, retryOnUnauthorized: false, responseType: "blob" }
  );

  return {
    blob,
    fileName: downloadName("credential", credentialPublicId, credentialNo, "zip")
  };
}

export async function downloadPublicCredentialCertificate(credentialPublicId, { credentialNo } = {}) {
  const blob = await apiRequest(
    publicCredentialPath(credentialPublicId, "/certificate"),
    {},
    { auth: false, retryOnUnauthorized: false, responseType: "blob" }
  );

  return {
    blob,
    fileName: downloadName("certificate", credentialPublicId, credentialNo, "pdf")
  };
}
