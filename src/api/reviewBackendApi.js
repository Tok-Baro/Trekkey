import { apiRequest } from "./backendApi.js";

const publicReviewConfig = {
  auth: false,
  retryOnUnauthorized: false
};

export function verifyReviewAccess(token) {
  return apiRequest(
    "/api/review/access",
    {
      method: "POST",
      body: { token }
    },
    publicReviewConfig
  );
}

export function getReviewSheet(token) {
  return apiRequest(
    "/api/review/assignments",
    {
      method: "POST",
      body: { token }
    },
    publicReviewConfig
  );
}

export function submitAssignmentReview(assignmentId, { token, scores, comment }) {
  return apiRequest(
    `/api/review/assignments/${encodeURIComponent(assignmentId)}/review`,
    {
      method: "PUT",
      body: { token, scores, comment }
    },
    publicReviewConfig
  );
}

export function downloadReviewFile(fileId, token) {
  return apiRequest(
    `/api/review/files/${encodeURIComponent(fileId)}/download`,
    {
      method: "POST",
      body: { token }
    },
    {
      ...publicReviewConfig,
      responseType: "blob"
    }
  );
}
