import { selectAuthApiBaseUrl } from "../lib/apiRouting.js";

function normalizeHttpUrl(name, value) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    throw new Error(`[env] ${name} 환경 변수가 필요합니다.`);
  }

  let url;
  try {
    url = new URL(trimmedValue);
  } catch {
    throw new Error(`[env] ${name}에 올바른 URL을 입력해 주세요.`);
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error(`[env] ${name}은 http 또는 https URL이어야 합니다.`);
  }

  return url.toString().replace(/\/+$/, "");
}

const runtimeEnv = import.meta.env ?? (typeof process === "undefined" ? {} : process.env);
const apiBaseUrl = normalizeHttpUrl("VITE_API_BASE_URL", runtimeEnv.VITE_API_BASE_URL);
const browserOrigin = typeof window === "undefined" ? "" : window.location.origin;

export const appEnv = Object.freeze({
  apiBaseUrl,
  authApiBaseUrl: normalizeHttpUrl(
    "VITE_AUTH_API_BASE_URL",
    selectAuthApiBaseUrl({
      apiBaseUrl,
      configuredAuthBaseUrl: runtimeEnv.VITE_AUTH_API_BASE_URL,
      isProduction: runtimeEnv.PROD === true || runtimeEnv.PROD === "true",
      browserOrigin
    })
  )
});
