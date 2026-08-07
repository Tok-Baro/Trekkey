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

export const appEnv = Object.freeze({
  apiBaseUrl: normalizeHttpUrl("VITE_API_BASE_URL", import.meta.env.VITE_API_BASE_URL)
});
