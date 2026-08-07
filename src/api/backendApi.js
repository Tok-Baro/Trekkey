const DEFAULT_API_BASE_URL = "http://localhost:8080";
const AUTH_EXPIRED_EVENT = "trekkey:auth-expired";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/+$/, "");

let accessToken = null;
let refreshPromise = null;
let authExpiredDispatched = false;

export class ApiError extends Error {
  constructor(message, { status = 0, code = "API_ERROR", data = null, cause } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = "ApiError";
    this.status = status;
    this.httpStatus = status;
    this.code = code;
    this.data = data;
  }
}

function setAccessToken(token) {
  accessToken = token || null;
  if (accessToken) {
    authExpiredDispatched = false;
  }
}

function dispatchAuthExpired(error) {
  setAccessToken(null);

  if (authExpiredDispatched || typeof window === "undefined") {
    return;
  }

  authExpiredDispatched = true;
  window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT, { detail: { error } }));
}

function buildUrl(path, query) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${apiBaseUrl}${normalizedPath}`);

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

async function readResponseBody(response) {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json().catch(() => null);
  }

  const text = await response.text();
  return text || null;
}

function toApiError(response, body) {
  const isEnvelope = body && typeof body === "object" && !Array.isArray(body);
  return new ApiError(
    (isEnvelope && body.message) || `요청을 처리하지 못했습니다. (${response.status})`,
    {
      status: (isEnvelope && Number(body.httpStatus)) || response.status,
      code: (isEnvelope && body.code) || `HTTP_${response.status}`,
      data: isEnvelope ? body.data ?? null : body
    }
  );
}

async function requestOnce(path, options = {}, { auth = true, query, responseType = "json" } = {}) {
  const headers = new Headers(options.headers);
  let body = options.body;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  headers.set("Accept", responseType === "blob" ? "*/*" : "application/json");

  if (auth && accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  if (body != null && !isFormData && typeof body !== "string") {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(buildUrl(path, query), {
      ...options,
      headers,
      body,
      credentials: "include"
    });
  } catch (error) {
    throw new ApiError("서버에 연결할 수 없습니다.", {
      status: 0,
      code: "NETWORK_ERROR",
      cause: error
    });
  }

  if (!response.ok) {
    const responseBody = await readResponseBody(response);
    throw toApiError(response, responseBody);
  }

  if (responseType === "blob") {
    return response.blob();
  }

  const responseBody = await readResponseBody(response);

  if (responseBody && typeof responseBody === "object" && "isSuccess" in responseBody) {
    if (responseBody.isSuccess === false) {
      throw toApiError(response, responseBody);
    }
    return responseBody.data ?? null;
  }

  return responseBody;
}

async function request(path, options = {}, config = {}) {
  const { retryOnUnauthorized = true, ...requestConfig } = config;

  try {
    return await requestOnce(path, options, requestConfig);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401 || !retryOnUnauthorized) {
      throw error;
    }

    try {
      await refreshSession();
    } catch (refreshError) {
      dispatchAuthExpired(refreshError);
      throw refreshError;
    }

    try {
      return await requestOnce(path, options, requestConfig);
    } catch (retryError) {
      if (retryError instanceof ApiError && retryError.status === 401) {
        dispatchAuthExpired(retryError);
      }
      throw retryError;
    }
  }
}

export function apiRequest(path, options = {}, config = {}) {
  return request(path, options, config);
}

export async function downloadApiFile(path, { fileName } = {}) {
  const blob = await apiRequest(path, {}, { responseType: "blob" });
  return { blob, fileName: fileName || "download" };
}

export async function signIn({ email, password }) {
  const data = await request(
    "/api/auth/signin",
    {
      method: "POST",
      body: { email, password }
    },
    { auth: false, retryOnUnauthorized: false }
  );

  setAccessToken(data?.accessToken);
  return data;
}

export function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = requestOnce(
      "/api/auth/refresh",
      { method: "POST" },
      { auth: false }
    )
      .then((data) => {
        setAccessToken(data?.accessToken);
        return data;
      })
      .catch((error) => {
        setAccessToken(null);
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

export async function signOut() {
  try {
    return await request(
      "/api/auth/logout",
      { method: "POST" },
      { auth: false, retryOnUnauthorized: false }
    );
  } finally {
    setAccessToken(null);
  }
}

export function listContests({ keyword, status = "OPEN" } = {}) {
  return request("/api/contests", {}, { query: { keyword, status } });
}

export function getContestDetail(publicId, { trackView = true } = {}) {
  return request(`/api/contests/${encodeURIComponent(publicId)}`, {}, { query: { trackView } });
}

export function toggleContestLike(publicId) {
  return request(`/api/contests/${encodeURIComponent(publicId)}/like`, { method: "POST" });
}

export function createApplication(publicId, application) {
  return request(`/api/contests/${encodeURIComponent(publicId)}/applications`, {
    method: "POST",
    body: application
  });
}

export function listMyApplications() {
  return request("/api/me/applications");
}

export function getApplicationProgress(contestPublicId) {
  return request(`/api/me/applications/${encodeURIComponent(contestPublicId)}/progress`);
}

export function updateApplication(contestPublicId, application) {
  return request(`/api/me/applications/${encodeURIComponent(contestPublicId)}`, {
    method: "PATCH",
    body: application
  });
}

export function searchParticipants(keyword) {
  return request("/api/participants/search", {}, { query: { keyword } });
}

export function listMyTeams() {
  return request("/api/me/teams");
}

export function getTeamSubmission(teamPublicId) {
  return request(`/api/teams/${encodeURIComponent(teamPublicId)}/submission`);
}

export function submitTeamSubmission(teamPublicId, { title, files }) {
  const body = new FormData();
  files.forEach((file) => body.append("files", file));

  return request(
    `/api/teams/${encodeURIComponent(teamPublicId)}/submission`,
    { method: "PUT", body },
    { query: { title } }
  );
}

export function downloadSubmissionFile(fileId, { fileName } = {}) {
  return downloadApiFile(
    `/api/files/${encodeURIComponent(fileId)}/download`,
    { fileName }
  );
}

export function listMyAwards() {
  return request("/api/me/awards");
}

export function listMyCredentials() {
  return request("/api/me/credentials");
}

export function getApiErrorMessage(error, fallback = "요청을 처리하지 못했습니다.") {
  const fieldError = Array.isArray(error?.data)
    ? error.data.find((item) => typeof item?.message === "string" && item.message)
    : null;

  return fieldError?.message || error?.message || fallback;
}
