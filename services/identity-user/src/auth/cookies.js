export const ACCESS_COOKIE_NAME = "access_token";
export const REFRESH_COOKIE_NAME = "refresh_token";

export function getCookieNames(isProduction = process.env.NODE_ENV === "production") {
  return {
    access: isProduction ? `__Host-${ACCESS_COOKIE_NAME}` : ACCESS_COOKIE_NAME,
    refresh: isProduction ? `__Host-${REFRESH_COOKIE_NAME}` : REFRESH_COOKIE_NAME,
  };
}

export function parseCookies(request) {
  const header = request.headers.cookie;
  if (!header || typeof header !== "string") {
    return {};
  }

  const cookies = {};
  const segments = header.split(";");
  for (const segment of segments) {
    const trimmed = segment.trim();
    if (!trimmed) continue;
    const subParts = trimmed.split(",");
    for (const part of subParts) {
      const cleanPart = part.trim();
      if (!cleanPart) continue;
      const index = cleanPart.indexOf("=");
      if (index === -1) continue;
      const key = cleanPart.slice(0, index).trim();
      const val = cleanPart.slice(index + 1).trim();
      try {
        cookies[key] = decodeURIComponent(val);
      } catch {
        cookies[key] = val;
      }
    }
  }
  return cookies;
}

export function setAuthCookies(
  response,
  { accessToken, refreshToken, isProduction = process.env.NODE_ENV === "production" },
) {
  const names = getCookieNames(isProduction);
  const secureFlag = isProduction ? "; Secure" : "";

  const cookiesToSet = [];
  if (accessToken) {
    cookiesToSet.push(
      `${names.access}=${encodeURIComponent(accessToken)}; Path=/; Max-Age=900; HttpOnly; SameSite=Lax${secureFlag}`,
    );
  }
  if (refreshToken) {
    cookiesToSet.push(
      `${names.refresh}=${encodeURIComponent(refreshToken)}; Path=/api/v1/auth; Max-Age=604800; HttpOnly; SameSite=Lax${secureFlag}`,
    );
  }

  if (cookiesToSet.length > 0) {
    const existing = response.getHeader("Set-Cookie");
    const combined = Array.isArray(existing)
      ? [...existing, ...cookiesToSet]
      : existing
        ? [existing, ...cookiesToSet]
        : cookiesToSet;
    response.setHeader("Set-Cookie", combined);
  }
}

export function clearAuthCookies(
  response,
  { isProduction = process.env.NODE_ENV === "production" } = {},
) {
  const names = getCookieNames(isProduction);
  const secureFlag = isProduction ? "; Secure" : "";

  const clearCookies = [
    `${names.access}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secureFlag}`,
    `${names.refresh}=; Path=/api/v1/auth; Max-Age=0; HttpOnly; SameSite=Lax${secureFlag}`,
  ];

  const existing = response.getHeader("Set-Cookie");
  const combined = Array.isArray(existing)
    ? [...existing, ...clearCookies]
    : existing
      ? [existing, ...clearCookies]
      : clearCookies;
  response.setHeader("Set-Cookie", combined);
}
