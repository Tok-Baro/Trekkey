import { apiRequest } from "./backendApi.js";

export function getMyPublicActivityProfile() {
  return apiRequest("/api/me/public-activity-profile");
}

export function updateMyPublicActivityProfile(enabled) {
  return apiRequest("/api/me/public-activity-profile", {
    method: "PUT",
    body: { enabled }
  });
}

export function rotateMyPublicActivityProfile() {
  return apiRequest("/api/me/public-activity-profile/rotate", { method: "POST" });
}

export function getPublicActivityProfile(publicId) {
  return apiRequest(
    `/api/public/activity-profiles/${encodeURIComponent(publicId)}`,
    {},
    { auth: false, retryOnUnauthorized: false }
  );
}
