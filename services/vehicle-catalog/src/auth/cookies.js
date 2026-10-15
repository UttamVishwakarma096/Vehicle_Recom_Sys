export const ACCESS_COOKIE_NAME = "access_token";
export const COOKIE_NAME_ACCESS = "accessToken";

export function getCookieNames(isProduction = process.env.NODE_ENV === "production") {
  return {
    access: isProduction ? `__Host-${ACCESS_COOKIE_NAME}` : ACCESS_COOKIE_NAME,
  };
}

export function parseCookies(request) {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader || typeof cookieHeader !== "string") {
    return {};
  }

  const cookies = {};
  const pairs = cookieHeader.split(";");

  for (const rawPair of pairs) {
    const pair = rawPair.trim();
    if (!pair) continue;
    const eqIdx = pair.indexOf("=");
    if (eqIdx === -1) continue;

    const key = pair.slice(0, eqIdx).trim();
    const val = pair.slice(eqIdx + 1).trim();

    try {
      cookies[key] = decodeURIComponent(val);
    } catch {
      cookies[key] = val;
    }
  }

  return cookies;
}
