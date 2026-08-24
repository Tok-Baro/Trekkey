import { apiRequest } from "./backendApi.js";

export function getGraduationProfile() {
  return apiRequest("/api/me/graduation/profile");
}

export function saveGraduationProfile(profile) {
  return apiRequest("/api/me/graduation/profile", {
    method: "PUT",
    body: profile
  });
}

export function runGraduationEvaluation(policyAsOf) {
  return apiRequest("/api/me/graduation/evaluations", {
    method: "POST",
    body: policyAsOf ? { policyAsOf } : {}
  });
}

export function getGraduationAcademicUnits() {
  return apiRequest("/api/me/graduation/academic-units");
}

export function getGraduationCourses() {
  return apiRequest("/api/me/graduation/courses");
}

export function updateGraduationCourse(publicId, patch) {
  return apiRequest(`/api/me/graduation/courses/${encodeURIComponent(publicId)}`, {
    method: "PATCH",
    body: patch
  });
}

export function importGraduationTranscript(file, apply = false) {
  const body = new FormData();
  body.append("file", file);
  return apiRequest("/api/me/graduation/transcript-imports", {
    method: "POST",
    body
  }, { query: { apply } });
}

export function importGraduationActivities(file, apply = false) {
  const body = new FormData();
  body.append("file", file);
  return apiRequest("/api/me/graduation/activity-imports", {
    method: "POST",
    body
  }, { query: { apply } });
}

export function syncHansungGraduationSources() {
  return apiRequest("/api/admin/graduation/sources/sync", { method: "POST" });
}
