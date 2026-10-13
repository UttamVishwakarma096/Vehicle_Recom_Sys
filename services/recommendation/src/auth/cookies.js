export const ACCESS_COOKIE_NAME = "access_token";

export function getCookieNames(isProduction = process.env.NODE_ENV === "production") {
  return {
    access: isProduction ? `__Host-${ACCESS_COOKIE_NAME}` : ACCESS_COOKIE_NAME,
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
