import { apiRequest } from "./backendApi.js";

function encodePath(value) {
  return encodeURIComponent(String(value));
}

export function listContestCredentials(contestPublicId) {
  return apiRequest(`/api/admin/contests/${encodePath(contestPublicId)}/credentials`);
}

export function listTeamCredentials(teamPublicId) {
  return apiRequest(`/api/admin/teams/${encodePath(teamPublicId)}/credentials`);
}

export function listStudentCredentials(studentId) {
  return apiRequest(`/api/admin/students/${encodePath(studentId)}/credentials`);
}

export function syncIssuerKey(keyVersion, signerRef) {
  return apiRequest(`/api/admin/blockchain/issuer-keys/${encodePath(keyVersion)}/sync`, {
    method: "POST",
    body: { signerRef }
  });
}

export function sealCredentialBatch({ schemaProfileId, keyVersion }) {
  return apiRequest("/api/admin/blockchain/batches", {
    method: "POST",
    body: { schemaProfileId, keyVersion }
  });
}

export function listBlockchainBatches() {
  return apiRequest("/api/admin/blockchain/batches");
}

export function getBatchApproval(batchPublicId) {
  return apiRequest(`/api/admin/blockchain/batches/${encodePath(batchPublicId)}/approval`);
}

export function renewBatchApproval(batchPublicId) {
  return apiRequest(`/api/admin/blockchain/batches/${encodePath(batchPublicId)}/approval/renew`, {
    method: "POST"
  });
}

export function reconcileBatch(batchPublicId) {
  return apiRequest(`/api/admin/blockchain/batches/${encodePath(batchPublicId)}/reconcile`, {
    method: "POST"
  });
}

export function approveBatch(batchPublicId, signatureHex) {
  return apiRequest(`/api/admin/blockchain/batches/${encodePath(batchPublicId)}/approval`, {
    method: "POST",
    body: { signatureHex }
  });
}

export function requestCredentialStatusChange(credentialPublicId, request) {
  return apiRequest(`/api/admin/blockchain/credentials/${encodePath(credentialPublicId)}/status-events`, {
    method: "POST",
    body: request
  });
}

export function listBlockchainStatusEvents() {
  return apiRequest("/api/admin/blockchain/status-events");
}

export function getStatusEventApproval(statusEventId) {
  return apiRequest(`/api/admin/blockchain/status-events/${encodePath(statusEventId)}/approval`);
}

export function renewStatusEventApproval(statusEventId) {
  return apiRequest(`/api/admin/blockchain/status-events/${encodePath(statusEventId)}/approval/renew`, {
    method: "POST"
  });
}

export function reconcileStatusEvent(statusEventId) {
  return apiRequest(`/api/admin/blockchain/status-events/${encodePath(statusEventId)}/reconcile`, {
    method: "POST"
  });
}

export function approveStatusEvent(statusEventId, signatureHex) {
  return apiRequest(`/api/admin/blockchain/status-events/${encodePath(statusEventId)}/approval`, {
    method: "POST",
    body: { signatureHex }
  });
}
