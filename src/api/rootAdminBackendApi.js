import { apiRequest } from "./backendApi.js";

function encodePath(value) {
  return encodeURIComponent(String(value));
}

export function createRootAdminInvitation(email) {
  return apiRequest("/api/root/invitations", {
    method: "POST",
    body: { email }
  });
}

export function listRootAdminInvitations() {
  return apiRequest("/api/root/invitations");
}

export function revokeRootAdminInvitation(invitationId) {
  return apiRequest(`/api/root/invitations/${encodePath(invitationId)}`, {
    method: "DELETE"
  });
}

export function listRootAdminApprovals() {
  return apiRequest("/api/root/admin-approvals");
}

export function decideRootAdminApproval(userId, approve) {
  return apiRequest(`/api/root/admin-approvals/${encodePath(userId)}`, {
    method: "PATCH",
    body: { approve }
  });
}
