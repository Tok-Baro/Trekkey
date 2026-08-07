import { apiRequest } from "./backendApi.js";

const PUBLIC_REQUEST_CONFIG = {
  auth: false,
  retryOnUnauthorized: false
};

export function searchOrganizations(keyword) {
  return apiRequest(
    "/api/organizations",
    {},
    {
      ...PUBLIC_REQUEST_CONFIG,
      query: { keyword }
    }
  );
}

export function signUpParticipant({ organizationId, name, email, password, studentId, major }) {
  return apiRequest(
    "/api/auth/signup",
    {
      method: "POST",
      body: {
        organizationId,
        name,
        email,
        password,
        studentId,
        major
      }
    },
    PUBLIC_REQUEST_CONFIG
  );
}

export function signUpAdmin({ inviteToken, name, email, password, department, position }) {
  return apiRequest(
    "/api/auth/signup/admin",
    {
      method: "POST",
      body: {
        inviteToken,
        name,
        email,
        password,
        department,
        position
      }
    },
    PUBLIC_REQUEST_CONFIG
  );
}
