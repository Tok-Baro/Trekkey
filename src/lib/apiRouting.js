export function selectAuthApiBaseUrl({
  apiBaseUrl,
  configuredAuthBaseUrl,
  isProduction,
  browserOrigin
}) {
  const configured = configuredAuthBaseUrl?.trim();
  if (configured) {
    return configured;
  }

  if (isProduction && browserOrigin) {
    return browserOrigin;
  }

  return apiBaseUrl;
}
